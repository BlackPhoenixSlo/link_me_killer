# Sourced, never run: the shared harness of the scripts that run outside the Playwright loop on a stack of their own
# (tests/proxy-protocol.sh, tests/caddy-ask.sh). The caller exports its own COMPOSE_PROJECT_NAME and host ports (HTTP_PORT,
# HTTPS_PORT, PB_PORT, MAILPIT_PORT) and any setting it changes, then sources this from the repo root. It refuses to start while
# any oflinkv2 container is up (./check.sh's oflinkv2-e2e stack or another side stack), brings the test stack up once through
# tests/stack.sh with the Fixture site alone, waits until the Fixture Profile is served, and on every exit path takes the stack
# down with its volumes and fails if any container or volume of the project is left. It defines `compose` and `url` (the
# Fixture Profile's JSON on the caller's HTTP_PORT) for the caller's checks.
: "${COMPOSE_PROJECT_NAME:?the caller exports its own Compose project}" "${HTTP_PORT:?the caller exports its own host ports}"
export V1_SNAPSHOT=
compose() { docker compose --env-file tests/e2e.env --profile mail "$@"; }

if docker ps --format '{{.Names}}' | grep -q oflinkv2; then
  echo "an oflinkv2 stack is up (./check.sh or another script outside the loop running?): not starting $COMPOSE_PROJECT_NAME" >&2
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
