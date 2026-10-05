#!/usr/bin/env bash
# Ticket 45, outside the Playwright loop: with Caddy's PROXY protocol flag on (PROXY_PROTOCOL_FROM, compose.yaml), two
# Visitors behind one proxy stay two clients of the Reveal and /r limit, and nothing else Caddy hears is trusted.
# It brings the test stack up once through tests/stack.sh, under its own Compose project and host ports so it never meets
# `./check.sh`'s oflinkv2-e2e stack, with REVEAL_LIMIT_PER_MINUTE=1 and the Fixture site alone, and takes it down with its
# volumes on every exit path. Run it only while ./check.sh is not running: tests/proxy-protocol.sh   # exit 0 on success
# It prints status codes only: a /r answer's Location holds a Destination.
# ASSUMPTION: the allowed proxy is 127.0.0.1/32, with the probe sharing Caddy's network namespace, rather than a container
# address on the Compose network (rung 5: a fixed value the stack can start with, where a container's address is known only
# after the network exists; it also leaves the probe that runs on the Compose network, and the host's gateway address,
# outside the allowed range). Overturned if the check must come from a separate container; the stack then needs a fixed
# subnet.
set -u
cd "$(dirname "$0")/.."

export COMPOSE_PROJECT_NAME=oflinkv2-pp HTTP_PORT=4183 HTTPS_PORT=4453 PB_PORT=18091 MAILPIT_PORT=18026
export REVEAL_LIMIT_PER_MINUTE=1 PROXY_PROTOCOL_FROM=127.0.0.1/32 V1_SNAPSHOT=
compose() { docker compose --env-file tests/e2e.env --profile mail "$@"; }

if [ -n "$(docker ps -q --filter label=com.docker.compose.project=oflinkv2-e2e)" ]; then
  echo "the oflinkv2-e2e stack is up (./check.sh running?): not starting a second stack" >&2
  exit 1
fi

log="$(mktemp)"
finish() {
  status=$?
  trap - EXIT
  if [ -n "${stack:-}" ] && kill -0 "$stack" 2>/dev/null; then kill -TERM "$stack"; wait "$stack"; fi
  compose down -v --remove-orphans > /dev/null 2>&1
  [ "$status" -ne 0 ] && tail -n 30 "$log"
  rm -f "$log"
  left="$(docker ps -aq --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME")$(docker volume ls -q --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME")"
  if [ -n "$left" ]; then echo "left behind: $left"; status=1; else echo "torn down: no container or volume of $COMPOSE_PROJECT_NAME left"; fi
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT TERM

tests/stack.sh > "$log" 2>&1 &
stack=$!
url="http://localhost:$HTTP_PORT/api/profiles/fixture.json"
for _ in $(seq 150); do
  curl -fsS -o /dev/null "$url" 2> /dev/null && break
  kill -0 "$stack" 2> /dev/null || { echo "tests/stack.sh stopped before the Fixture Profile was served"; exit 1; }
  sleep 2
done
curl -fsS -o /dev/null "$url" || { echo "the Fixture Profile was not served within 300 s"; exit 1; }
link="$(curl -fsS "$url" | node -e '
  const { links } = JSON.parse(require("fs").readFileSync(0, "utf8"));
  console.log(links.find((l) => !l.isAdult && l.mode === "direct").id)')"
compose exec -T caddy caddy adapt --config /etc/caddy/Caddyfile 2> /dev/null | node -e '
  const wrappers = JSON.parse(require("fs").readFileSync(0, "utf8")).apps.http.servers.srv0.listener_wrappers || [];
  console.log(`caddy'"'"'s listener wrappers: ${JSON.stringify(wrappers)}`);
  process.exit(wrappers.some((w) => w.wrapper === "proxy_protocol") ? 0 : 1)' || { echo "no proxy_protocol wrapper: the flag is off"; exit 1; }

# The probe: one fresh TCP connection per step to Caddy's listener, each a GET /r/{Link Id} with the page's own Origin,
# preceded by `PROXY TCP4 <src> ...` unless the step's source is `none`. Steps are `<src>=<status wanted>`; it waits out the
# last 10 s of a minute first, so a step sequence never straddles the fixed window's boundary.
probe='
  const net = require("net");
  const [target, linkId, ...steps] = process.argv.slice(1);
  const [host, port] = target.split(":");
  const ask = (src) => new Promise((resolve, reject) => {
    const socket = net.connect(Number(port), host, () => socket.write(
      (src === "none" ? "" : `PROXY TCP4 ${src} 10.0.0.1 40000 ${port}\r\n`) +
      `GET /r/${linkId} HTTP/1.1\r\nHost: localhost\r\nOrigin: http://localhost\r\nConnection: close\r\n\r\n`));
    let head = "";
    socket.setTimeout(5000, () => socket.destroy(new Error("timeout")));
    socket.on("data", (d) => { head += d; const m = /^HTTP\/1\.[01] (\d{3})/.exec(head); if (m) { resolve(m[1]); socket.destroy(); } });
    socket.on("error", reject);
    socket.on("close", () => resolve("closed"));
  });
  (async () => {
    const left = 60000 - (Date.now() % 60000);
    if (left < 10000) await new Promise((r) => setTimeout(r, left + 500));
    let ok = true;
    for (const step of steps) {
      const [src, want] = step.split("=");
      const got = await ask(src).catch((e) => e.message);
      console.log(`  PROXY source ${src}: ${got} (want ${want})`);
      ok = ok && got === want;
    }
    process.exit(ok ? 0 : 1);
  })();'
caddy="$(compose ps -q caddy)"
app_image="$(docker inspect --format '{{.Image}}' "$(compose ps -q app)")"

echo "from the allowed address (127.0.0.1, in Caddy's network namespace): Visitor A twice, Visitor B, then no header"
docker run --rm --label "com.docker.compose.project=$COMPOSE_PROJECT_NAME" --network "container:$caddy" "$app_image" \
  node -e "$probe" 127.0.0.1:80 "$link" 198.51.100.7=302 198.51.100.7=429 198.51.100.8=302 none=302 || exit 1
echo "from a container on the Compose network (not allowed): no header, then a forged header naming a fresh source"
compose run --rm --no-deps app node -e "$probe" caddy:80 "$link" none=302 203.0.113.9=429 || exit 1
echo "PASS: two Visitors behind the allowed proxy are two clients; a header from any other address is not trusted"
