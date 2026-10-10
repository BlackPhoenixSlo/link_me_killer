#!/usr/bin/env bash
# Runs install.sh's Traefik detection and routing against real traefik:v3 containers (needs docker, not root):
#   bash deploy/install.traefik.test.sh
# 1. flags + docker provider on a user-defined network: detection finds entrypoint websecure, no resolver and the network;
#    the .env lines and compose.traefik.yaml put a whoami container (standing in for our caddy) behind Traefik, over TLS.
# 2. TRAEFIK_* variables + file provider only: the file route install.sh writes reaches a whoami container over TLS.
# The host-network shape (file-host) is covered by install.test.sh's stubbed docker.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
root=$(dirname "$here")
# shellcheck source=/dev/null # not followed: shellcheck would take its final exit for this script's
. "$here/install.sh" # the functions only
set +e
unset TRAEFIK_ENTRYPOINT TRAEFIK_RESOLVER TRAEFIK_NETWORK
NET=oflink_traefik_test PROJECT=oflinktraefiktest IMAGE=traefik:v3
tmp=$(mktemp -d)
fail=0

check() { # <label> <want> <got>
  if [ "$2" = "$3" ]; then echo "ok    $1"; else echo "FAIL  $1: want '$2', got '$3'"; fail=1; fi
}
compose() { docker compose --env-file "$tmp/.env" -p "$PROJECT" -f "$tmp/base.yml" -f "$root/compose.traefik.yaml" "$@"; }
# shellcheck disable=SC2329 # the EXIT trap runs it
cleanup() {
  [ -f "$tmp/.env" ] && compose down -t 1 >/dev/null 2>&1
  docker rm -f otl-flags otl-env otl-whoami >/dev/null 2>&1
  docker network rm "$NET" >/dev/null 2>&1
  rm -rf "$tmp"
}
trap cleanup EXIT
reaches() { # <host> <port>: whoami answers https://<host>:<port>/ through Traefik within 30 s
  for _ in $(seq 30); do
    curl -fsk --max-time 2 --resolve "$1:$2:127.0.0.1" "https://$1:$2/" 2>/dev/null | grep -q '^Hostname:' && return 0
    sleep 1
  done
  return 1
}

docker network create "$NET" >/dev/null || exit 1

# 1. Flags, docker provider, a user-defined network.
docker run -d --name otl-flags --network "$NET" -p 127.0.0.1:18080:18080 -p 127.0.0.1:18443:18443 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro "$IMAGE" \
  --providers.docker --providers.docker.exposedbydefault=false \
  --entrypoints.websecure.address=:18443 --entrypoints.web.address=:18080 >/dev/null
check "flags: traefik_container" "$(docker ps -q --filter name=otl-flags)" "$(traefik_container)"
traefik_detect otl-flags
check "flags: entrypoint" websecure "$T_ENTRYPOINT"
check "flags: resolver" "" "$T_RESOLVER"
check "flags: docker provider" 1 "$T_DOCKER"
check "flags: network" "$NET" "$T_NETWORK"
check "flags: host networking" "" "$T_HOSTNET"
# shellcheck disable=SC2034 # read by mode_lines
DOMAIN=test.local TRAEFIK_VIA=docker HTTPS_PORT=443 HTTP_PORT=80
ROUTER=oflink-$(printf '%s' "$DOMAIN" | tr '.' '-')
mode_lines >"$tmp/.env"
# The two services compose.traefik.yaml touches; whoami on port 80 stands in for Caddy's plain HTTP.
printf 'services:\n  caddy:\n    image: traefik/whoami\n    command: --port 80\n  app:\n    image: traefik/whoami\n    command: --port 3000\n' >"$tmp/base.yml"
compose up -d >/dev/null 2>&1 || { echo "FAIL  compose up"; compose up -d; fail=1; }
if reaches test.local 18443; then echo "ok    flags: labels route test.local to caddy over TLS"; else
  echo "FAIL  flags: https://test.local:18443 does not reach caddy"; docker logs --tail 20 otl-flags; fail=1
fi
code=$(curl -sk -o /dev/null -w '%{http_code}' --resolve other.local:18443:127.0.0.1 https://other.local:18443/)
check "flags: another host is not routed" 404 "$code"
compose down -t 1 >/dev/null 2>&1
docker rm -f otl-flags >/dev/null

# 2. TRAEFIK_* variables, file provider only: install.sh writes the route into the directory.
mkdir "$tmp/dyn"
docker run -d --name otl-env --network "$NET" -p 127.0.0.1:18444:443 -v "$tmp/dyn:/dyn" \
  -e TRAEFIK_ENTRYPOINTS_SECURE_ADDRESS=:443 -e TRAEFIK_PROVIDERS_FILE_DIRECTORY=/dyn \
  -e TRAEFIK_PROVIDERS_FILE_WATCH=true "$IMAGE" >/dev/null
docker run -d --name otl-whoami --network "$NET" traefik/whoami --port 80 >/dev/null
traefik_detect otl-env
check "env: entrypoint" secure "$T_ENTRYPOINT"
check "env: docker provider" "" "$T_DOCKER"
check "env: network" "$NET" "$T_NETWORK"
check "env: file provider directory" /dyn "$T_FILEDIR"
DOMAIN=file.local ROUTER=oflink-file-local
traefik_file_route otl-env http://otl-whoami:80
if reaches file.local 18444; then echo "ok    env: the file route reaches the container over TLS"; else
  echo "FAIL  env: https://file.local:18444 does not reach the container"; cat "$tmp/dyn/$ROUTER.yml"; docker logs --tail 20 otl-env; fail=1
fi

[ "$fail" -eq 0 ] && echo "install.traefik.test: ok" || echo "install.traefik.test: FAILED" >&2
exit "$fail"
