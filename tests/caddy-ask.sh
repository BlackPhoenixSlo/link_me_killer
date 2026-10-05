#!/usr/bin/env bash
# Ticket 41, outside the Playwright loop (as tests/proxy-protocol.sh): Caddy asks the app before every certificate.
# Offline, the local caddy:2-alpine image adapts the Caddyfile twice. With production-like settings (SITE_ADDRESS=https://
# and the PROXY protocol flag on, as compose.yaml hands them to Caddy) it is one :443 catch-all with on-demand TLS whose ask is
# the app's TLS Ask over the Compose network; with the test stack's settings (tests/e2e.env) it is the plain-HTTP :80 listener
# with no TLS policy, so the local loop obtains no certificate. Both carry the same routes, which pass the original Host on.
# Caddy's stderr from both is kept and printed on a failure, and any warning or error from the test stack's adaptation fails,
# so a Caddy release that objects to `tls { on_demand }` on a plain-HTTP address shows here.
# Then, on the test stack brought up once through tests/side-stack.sh under its own Compose project and host ports, so it
# never meets `./check.sh`'s oflinkv2-e2e stack, the ask read from the running Caddy's own config (as RUN.md's Cutover step 1 reads
# it on the VPS) is called from inside Caddy's container with BusyBox wget: 200 for localhost, 404 for unknown.invalid. The
# stack is taken down with its volumes on every exit path. Run it only while no oflinkv2 stack is up: tests/caddy-ask.sh
# It prints status codes and Caddy's config only, neither of which holds a Destination.
# ASSUMPTION: production-like means SITE_ADDRESS=https:// with the PROXY protocol flag on a placeholder range (rung 2: the
# runbook's step 1 sets these on the VPS; the range value is .env.example's example). Overturned if the VPS .env sets
# another SITE_ADDRESS; this check then adapts with that value.
set -u
cd "$(dirname "$0")/.."

ASK=http://app:3000/internal/tls-ask
errors="$(mktemp -d)"
trap 'rm -rf "$errors"' EXIT   # until tests/side-stack.sh installs its own exit trap
adapt() {
  docker run --rm -e SITE_ADDRESS="$1" -e PROXY_PROTOCOL_FROM="$2" -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine \
    caddy adapt --config /etc/caddy/Caddyfile 2> "$errors/$3"
}
said() { echo "caddy adapt's stderr, $1:"; sed 's/^/  /' "$errors/$1"; }
docker image inspect caddy:2-alpine > /dev/null 2>&1 || { echo "caddy:2-alpine is not on this machine: nothing is pulled here"; exit 1; }
production="$(adapt https:// 'on 172.18.0.0/16' production)" || { echo "the production configuration does not adapt"; said production; exit 1; }
local_loop="$(adapt :80 off local)" || { echo "the test stack's configuration does not adapt"; said local; exit 1; }
echo "offline, on the local caddy:2-alpine image:"
if grep -qiE 'warn|error' "$errors/local"; then echo "  FAIL the test stack's adaptation warns or errs"; said local; exit 1; fi
echo "  ok   the test stack's adaptation prints no warning or error"
node -e '
  const [production, local, ask] = process.argv.slice(1);
  const p = JSON.parse(production).apps, l = JSON.parse(local).apps;
  const checks = [
    ["production: one server, listening on :443 only", Object.keys(p.http.servers).length === 1 && JSON.stringify(p.http.servers.srv0.listen) === "[\":443\"]"],
    ["production: one TLS policy, on demand, for every hostname", JSON.stringify(p.tls?.automation?.policies) === "[{\"on_demand\":true}]"],
    [`production: the on-demand ask is ${ask}`, JSON.stringify(p.tls?.automation?.on_demand?.permission) === JSON.stringify({ endpoint: ask, module: "http" })],
    ["local: one server, listening on :80 only, with no TLS connection policy", Object.keys(l.http.servers).length === 1
      && JSON.stringify(l.http.servers.srv0.listen) === "[\":80\"]" && l.http.servers.srv0.tls_connection_policies === undefined],
    ["local: no TLS automation policy, so no certificate is obtained", l.tls?.automation?.policies === undefined],
    ["both: the same routes, one catch-all reverse_proxy to app:3000 with no header rewrite (the original Host passes on)",
      JSON.stringify(p.http.servers.srv0.routes) === JSON.stringify(l.http.servers.srv0.routes)
      && JSON.stringify(l.http.servers.srv0.routes) === JSON.stringify([{ handle: [{ handler: "reverse_proxy", upstreams: [{ dial: "app:3000" }] }] }])],
  ];
  for (const [what, ok] of checks) console.log(`  ${ok ? "ok  " : "FAIL"} ${what}`);
  process.exit(checks.every(([, ok]) => ok) ? 0 : 1)' "$production" "$local_loop" "$ASK" || {
  echo "production: $production"; said production; echo "local: $local_loop"; said local; exit 1; }
rm -rf "$errors"

export COMPOSE_PROJECT_NAME=oflinkv2-ask HTTP_PORT=4184 HTTPS_PORT=4454 PB_PORT=18092 MAILPIT_PORT=18027
. tests/side-stack.sh

echo "on the running test stack ($COMPOSE_PROJECT_NAME):"
fail=0
check() { if [ "$2" = "$3" ]; then echo "  ok   $1: $2"; else echo "  FAIL $1: $2 (want $3)"; fail=1; fi; }
endpoint="$(compose exec -T caddy caddy adapt --config /etc/caddy/Caddyfile 2> /dev/null | grep -o '"endpoint":"[^"]*"' | cut -d'"' -f4)"
check "the ask in the running Caddy's config" "$endpoint" "$ASK"
# BusyBox wget, as on the VPS: its exit status is the yes or no, and -S prints the status line it was given.
for want in localhost=200 unknown.invalid=404; do
  domain="${want%=*}"
  answer="$(compose exec -T caddy wget -S -q -O /dev/null "$endpoint?domain=$domain" 2>&1)"; code=$?
  got="$(printf '%s\n' "$answer" | sed -n 's/^ *HTTP\/1\.[01] \([0-9]\{3\}\).*/\1/p' | head -n 1)"
  check "the ask for $domain, from inside Caddy's container" "$got $([ "$code" -eq 0 ] && echo yes || echo no)" \
    "${want#*=} $([ "${want#*=}" = 200 ] && echo yes || echo no)"
done
check "a plain-HTTP request with a stranger's Host on the local listener" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: anything.invalid' "$url")" 200
# The storage volume's root, which always exists: a failed find is a failure, never a count of 0.
if certificates="$(compose exec -T caddy find /data -name '*.crt')"; then
  check "certificates in Caddy's storage (/data)" "$(printf '%s' "$certificates" | grep -c .)" 0
else
  check "find in Caddy's storage (/data)" "failed" "succeeded"
fi
[ "$fail" = 0 ] || exit 1
echo "PASS: Caddy's on-demand ask is the app's TLS Ask, which says yes to localhost and no to unknown.invalid; the local loop holds no certificate"
