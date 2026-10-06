#!/usr/bin/env bash
# Ticket 42, outside the Playwright loop (as tests/caddy-ask.sh and tests/proxy-protocol.sh): the Cloudflare lines.
# Offline, on the local caddy:2-alpine image alone: no Compose stack, no published port, nothing pulled or fetched. The real
# Caddyfile runs in one container with a header-echo upstream that the same Caddy serves on :3000. The container resolves
# `app` to 127.0.0.1, so the site's own `reverse_proxy app:3000` reaches the echo unchanged (the spec's review checked the
# lines the same way, ## Review D2a). Every request carries v1's three location headers, CF-IPCountry, CF-Region-Code and a
# forged `X-Forwarded-For: 6.6.6.6, 1.2.3.4`:
# - with the test stack's settings (CLOUDFLARE_RANGES empty, as tests/e2e.env), every header reaches the upstream, so Phase 2's
#   parity spec and Phase 4's Stats spec can still inject them on the local listener;
# - with the Cloudflare lines on and the ranges set to 127.0.0.1/32 plus an IPv6 range neither peer is in (two arguments, as
#   production's list is many), a request from 127.0.0.1 (a trusted peer) reaches the upstream as `1.2.3.4` alone with its CF
#   headers unchanged. A request from the container's own bridge address (untrusted, read at run time) reaches it as that
#   address with no CF headers. Neither carries v1's headers.
# The container is removed on every exit path; Caddy's log is printed on a failure.
# Run it anytime: tests/cloudflare-lines.sh   # exit 0 on success. It prints headers and Caddy's log only, no Destination.
# ASSUMPTION: the lines run over plain HTTP here, and the production `https://` catch-all is covered by tests/caddy-ask.sh,
# whose adaptation of the production settings carries the same trusted proxies and routes as this plain-HTTP run (rung 5:
# no certificate, CA or TLS client is needed; the ticket allows Caddy's internal CA or this, and the reviewer ruled it
# sufficient). Overturned if a Caddy release handles request headers differently under TLS; the check then runs the
# catch-all with Caddy's internal CA.
# ASSUMPTION: the echo is reached through `--add-host app:127.0.0.1` rather than an env-selected upstream (rung 4: the
# Caddyfile's upstream stays `app:3000`, so production behaviour does not change to make it testable). Overturned if the
# upstream ever comes from a setting; the check then sets it.
set -u
cd "$(dirname "$0")/.."

RANGES='127.0.0.1/32 2400:cb00::/32'   # the same value as tests/caddy-ask.sh's
name="oflinkv2-cloudflare-lines-$$"
trap 'docker rm -f "$name" > /dev/null 2>&1' EXIT
trap 'exit 130' INT TERM
docker image inspect caddy:2-alpine > /dev/null 2>&1 || { echo "caddy:2-alpine is not on this machine: nothing is pulled here"; exit 1; }

# One Caddy, started inside the container with the echo site appended to the real Caddyfile; it prints the peer address the
# untrusted requests come from, one `<peer>: <echo>` line per request, then Caddy's log after a marker.
inside='
  set -u
  { cat /etc/caddy/Caddyfile; printf "\n%s\n" "$ECHO_SITE"; } > /tmp/Caddyfile
  caddy run --config /tmp/Caddyfile > /tmp/caddy.log 2>&1 &
  up=no; for i in $(seq 50); do wget -q -O /dev/null http://127.0.0.1:3000/ 2> /dev/null && { up=yes; break; }; sleep 0.2; done
  ask() {
    wget -q -O - --header "X-Forwarded-For: 6.6.6.6, 1.2.3.4" --header "CF-IPCountry: US" --header "CF-Region-Code: CA" \
      --header "X-Country: DE" --header "X-Region: BY" --header "X-NF-Subdivision-Code: BE" "http://$1:80/" || printf "wget failed"
  }
  if [ "$up" = yes ]; then
    peer="$(hostname -i)"; echo "peer=$peer"
    for p in 127.0.0.1 $peer; do echo "$p: $(ask "$p")"; done
  else
    echo "caddy did not start"
  fi
  echo "--- caddy log ---"; cat /tmp/caddy.log'
echo_site=':3000 {
	respond "xff=[{header.X-Forwarded-For}] country=[{header.CF-IPCountry}] region=[{header.CF-Region-Code}] xc=[{header.X-Country}] xr=[{header.X-Region}] nf=[{header.X-NF-Subdivision-Code}]"
}'
run() {   # $1: CLOUDFLARE_RANGES as compose.yaml hands it to Caddy
  docker run --rm --name "$name" --add-host app:127.0.0.1 -e SITE_ADDRESS=:80 -e PROXY_PROTOCOL_FROM=off \
    -e CLOUDFLARE_RANGES="$1" -e ECHO_SITE="$echo_site" -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine sh -c "$inside"
}
fail=0
check() { if [ "$2" = "$3" ]; then echo "  ok   $1: $2"; else echo "  FAIL $1: $2 (want $3)"; fail=1; fi; }
line() { printf '%s\n' "$1" | sed -n "s/^$2: //p" | head -n 1; }   # the echo for one peer, empty if that line is missing
shown() { [ "$fail" = 0 ] || { echo "$1:"; printf '%s\n' "$2" | sed 's/^/  /'; }; }

echo "on the local caddy:2-alpine image, the test stack's settings (CLOUDFLARE_RANGES empty):"
off="$(run off)"
check "from 127.0.0.1, every header reaches the upstream" "$(line "$off" 127.0.0.1)" \
  "xff=[127.0.0.1] country=[US] region=[CA] xc=[DE] xr=[BY] nf=[BE]"
shown "the container's output" "$off"

echo "the Cloudflare lines on, with the ranges set to $RANGES:"
on="$(run "on $RANGES")"
peer="$(printf '%s\n' "$on" | sed -n 's/^peer=//p')"
if printf '%s' "$peer" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' && [ "${peer#127.}" = "$peer" ]; then
  echo "  ok   the untrusted peer is the container's bridge address: $peer"
else
  echo "  FAIL the container's bridge address, read with hostname -i: [$peer] (want one IPv4 address outside 127.0.0.0/8)"; fail=1
fi
check "from 127.0.0.1 (trusted), the client is the entry right of the forgery, CF headers pass, v1's are gone" \
  "$(line "$on" 127.0.0.1)" "xff=[1.2.3.4] country=[US] region=[CA] xc=[] xr=[] nf=[]"
check "from $peer (untrusted), the client is the peer itself, no CF header, no v1 header" \
  "$(line "$on" "$peer")" "xff=[$peer] country=[] region=[] xc=[] xr=[] nf=[]"
shown "the container's output" "$on"

[ "$fail" = 0 ] || exit 1
echo "PASS: v1's location headers never pass the Cloudflare lines and pass the local listener; a trusted peer's client is the entry right of a forgery and keeps its CF headers; an untrusted peer is its own client with none"
