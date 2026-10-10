#!/usr/bin/env bash
# shellcheck disable=SC2015,SC2016,SC2329 # ok never fails; Traefik rules are literal backticks; install.sh calls the docker stub
# Checks deploy/install.sh without root: syntax, the input checks that run before anything else, then its functions
# (sourced): the .env it writes for each mode, the PocketBase pin, and Traefik detection against a stubbed `docker` that
# replays a host-network Traefik with a file provider (the shape seen on a real box). With docker present it also runs
# `docker compose config` on the .env lines of the direct and Traefik modes.
#   bash deploy/install.test.sh
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
root=$(dirname "$here")
script="$here/install.sh"
fail=0
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

ok() { echo "ok    $1"; }
bad() { echo "FAIL  $1"; fail=1; }
check() { # <label> <want> <got>
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1: want '$2', got '$3'"; fi
}
has() { # <label> <file> <extended regex>
  if grep -qE "$3" "$2"; then ok "$1"; else bad "$1: no line matching '$3' in:"; cat "$2"; fi
}
expect() { # <label> <stderr substring> <env assignments...>
  local label=$1 want=$2 out code
  shift 2
  out=$(env -i PATH="$PATH" "$@" bash "$script" 2>&1 </dev/null) && code=0 || code=$?
  if [ "$code" -ne 0 ] && [[ $out == *"$want"* ]]; then ok "$label"; else bad "$label (exit $code): $out"; fi
}

# 1. Syntax and input checks.
if bash -n "$script"; then ok "bash -n install.sh"; else bad "bash -n install.sh"; fi
expect "DOMAIN missing" "DOMAIN is required"
expect "DOMAIN with scheme" "bare hostname" DOMAIN=https://links.example.com
expect "DOMAIN with port" "bare hostname" DOMAIN=links.example.com:443
expect "DOMAIN with a path" "bare hostname" DOMAIN=links.example.com/x
expect "port not a number" "must be numbers" DOMAIN=links.example.com HTTPS_PORT=abc
expect "same port twice" "must differ" DOMAIN=links.example.com HTTPS_PORT=8080 HTTP_PORT=8080
expect "bad PB_SUPERUSER_EMAIL" "must be an email" DOMAIN=links.example.com PB_SUPERUSER_EMAIL=admin
expect "TRAEFIK_ENTRYPOINT not a name" "take a name" DOMAIN=links.example.com 'TRAEFIK_ENTRYPOINT=web secure'
expect "TRAEFIK_NETWORK not a name" "take a name" DOMAIN=links.example.com 'TRAEFIK_NETWORK=a;b'
if [ "$(id -u)" -eq 0 ]; then
  echo "skip  not root (running as root)"
else
  expect "not root" "must run as root" DOMAIN=Links.Example.com
fi

# 2. The functions, sourced.
# shellcheck source=/dev/null # not followed: shellcheck would take its final exit for this script's
. "$script"
set +e

# The PocketBase pin is the version pocketbase/Dockerfile COPYs.
if grep -q "pocketbase_${PB_VERSION}_linux_" "$root/pocketbase/Dockerfile"; then ok "PB_VERSION matches pocketbase/Dockerfile"; else
  bad "PB_VERSION $PB_VERSION is not the one in pocketbase/Dockerfile"
fi
check "pb_sha256 amd64 is 64 hex" 64 "$(pb_sha256 amd64 | grep -cE '^[0-9a-f]{64}$' | sed 's/1/64/')"
check "pb_sha256 arm64 is 64 hex" 64 "$(pb_sha256 arm64 | grep -cE '^[0-9a-f]{64}$' | sed 's/1/64/')"
if [ -f "$root/vendor/pocketbase_${PB_VERSION}_linux_amd64.zip" ] && command -v shasum >/dev/null; then
  check "pb_sha256 amd64 matches vendor/" "$(pb_sha256 amd64)" \
    "$(shasum -a 256 "$root/vendor/pocketbase_${PB_VERSION}_linux_amd64.zip" | cut -d' ' -f1)"
fi

# write_env and rewrite_mode, from the real .env.example, in a scratch directory.
# shellcheck disable=SC2034 # read by the sourced functions
DOMAIN=links.example.com PB_SUPERUSER_EMAIL=admin@links.example.com IPV4=203.0.113.7 IPV6=2001:db8::7
cp "$root/.env.example" "$tmp/.env.example"
cd "$tmp" || exit 1
# shellcheck disable=SC2034
HTTPS_PORT=443 HTTP_PORT=80 TRAEFIK_VIA=''
write_env
check ".env is mode 600" 600 "$(stat -f %Lp .env 2>/dev/null || stat -c %a .env)"
has "clean: a fresh 48-hex password" .env '^PB_SUPERUSER_PASSWORD=[0-9a-f]{48}$'
has "clean: PB_SUPERUSER_EMAIL" .env '^PB_SUPERUSER_EMAIL=admin@links\.example\.com$'
has "clean: PRIMARY_HOSTS is the domain" .env '^PRIMARY_HOSTS=links\.example\.com$'
has "clean: ORIGIN_IPV4" .env '^ORIGIN_IPV4=203\.0\.113\.7$'
has "clean: ORIGIN_IPV6" .env '^ORIGIN_IPV6=2001:db8::7$'
has "clean: PROXY_PROTOCOL_FROM empty" .env '^PROXY_PROTOCOL_FROM=$'
has "clean: CLOUDFLARE_RANGES empty" .env '^CLOUDFLARE_RANGES=$'
has "clean: SITE_ADDRESS https://" .env '^SITE_ADDRESS=https://$'
has "clean: PB_APP_URL" .env '^PB_APP_URL=https://links\.example\.com$'
check "clean: each mode key once" "" "$(grep -oE '^[A-Z_]+=' .env | sort | uniq -d)"
check "clean: no COMPOSE_FILE" "" "$(grep '^COMPOSE_FILE=' .env)"
password=$(grep '^PB_SUPERUSER_PASSWORD=' .env)

# shellcheck disable=SC2034
HTTPS_PORT=8443 HTTP_PORT=8081
rewrite_mode
has "alt ports: SITE_ADDRESS :80" .env '^SITE_ADDRESS=:80$'
has "alt ports: HTTP_PORT" .env '^HTTP_PORT=8081$'
has "alt ports: HTTPS_PORT" .env '^HTTPS_PORT=8443$'
has "alt ports: PB_APP_URL is plain HTTP on HTTP_PORT" .env '^PB_APP_URL=http://links\.example\.com:8081$'
check "alt ports: the password is kept" "$password" "$(grep '^PB_SUPERUSER_PASSWORD=' .env)"
# shellcheck disable=SC2034
HTTP_PORT=80
check "alt ports with HTTP_PORT=80: the URL has no port" http://links.example.com "$(site_url)"

# shellcheck disable=SC2034
HTTPS_PORT=443 HTTP_PORT=80 TRAEFIK_VIA=docker ROUTER=oflink-links-example-com T_ENTRYPOINT=websecure T_RESOLVER=letsencrypt T_NETWORK=traefik_net
rewrite_mode
has "traefik docker: SITE_ADDRESS :80" .env '^SITE_ADDRESS=:80$'
has "traefik docker: COMPOSE_FILE" .env '^COMPOSE_FILE=compose\.yaml:compose\.traefik\.yaml$'
has "traefik docker: TRAEFIK_HOST" .env '^TRAEFIK_HOST=links\.example\.com$'
has "traefik docker: TRAEFIK_RESOLVER" .env '^TRAEFIK_RESOLVER=letsencrypt$'
has "traefik docker: PB_APP_URL https" .env '^PB_APP_URL=https://links\.example\.com$'
check "traefik docker: no HTTP_PORT line" "" "$(grep '^HTTP_PORT=' .env)"
has "traefik docker: CLOUDFLARE_RANGES=private_ranges" .env '^CLOUDFLARE_RANGES=private_ranges$'
check "traefik docker: CLOUDFLARE_RANGES once" 1 "$(grep -c '^CLOUDFLARE_RANGES=' .env)"
cp .env "$tmp/env.traefik"

# shellcheck disable=SC2034
TRAEFIK_VIA=file-host
rewrite_mode
has "traefik file-host: HTTP_PORT on loopback 8080" .env '^HTTP_PORT=127\.0\.0\.1:8080$'
check "traefik file-host: no COMPOSE_FILE" "" "$(grep '^COMPOSE_FILE=' .env)"
check "traefik file-host: no TRAEFIK_ lines" "" "$(grep '^TRAEFIK_' .env)"
check "traefik file-host: each key once" "" "$(grep -oE '^[A-Z_]+=' .env | sort | uniq -d)"
has "traefik file-host: CLOUDFLARE_RANGES=private_ranges" .env '^CLOUDFLARE_RANGES=private_ranges$'
check "traefik file-host: the password is kept" "$password" "$(grep '^PB_SUPERUSER_PASSWORD=' .env)"
cp .env "$tmp/env.filehost"
# shellcheck disable=SC2034
TRAEFIK_VIA='' HTTPS_PORT=443 HTTP_PORT=80
rewrite_mode
has "back to clean: CLOUDFLARE_RANGES empty again" .env '^CLOUDFLARE_RANGES=$'
cp .env "$tmp/env.clean"
# shellcheck disable=SC2034
TRAEFIK_VIA="file"
write_env
has "traefik file, fresh .env: CLOUDFLARE_RANGES=private_ranges" .env '^CLOUDFLARE_RANGES=private_ranges$'
check "traefik file, fresh .env: each key once" "" "$(grep -oE '^[A-Z_]+=' .env | sort | uniq -d)"
# shellcheck disable=SC2034
TRAEFIK_VIA=''
cp "$tmp/env.clean" .env

# 3. Traefik detection and the file route, against a stubbed docker: a Traefik on the host network, configured by flags,
#    Docker provider with exposedbydefault=false, file provider /dynamic, entrypoints web :80 and websecure :443,
#    resolver letsencrypt (HTTP-01).
dyn="$tmp/dynamic" # not $tmp inside the stub: traefik_file_route has a local of that name
mkdir "$dyn"
docker() {
  case "$1" in
    port) return 0 ;; # host networking publishes nothing
    exec) return 1 ;; # no configuration file
    cp) cp "$2" "$dyn/${3##*/}" ;;
    inspect)
      case "$3" in
        *.Args*) printf '%s\n' --providers.docker=true --providers.docker.exposedbydefault=false \
          --providers.file.directory=/dynamic --providers.file.watch=true \
          --entrypoints.web.address=:80 --entrypoints.websecure.address=:443 \
          --entrypoints.web.http.redirections.entrypoint.to=websecure \
          --certificatesresolvers.letsencrypt.acme.httpchallenge=true \
          --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web ;;
        *Networks*) echo host ;;
        *NetworkMode*) echo host ;;
      esac ;;
  esac
}
unset TRAEFIK_ENTRYPOINT TRAEFIK_RESOLVER TRAEFIK_NETWORK
traefik_detect traefik-traefik-1
check "stub: entrypoint" websecure "$T_ENTRYPOINT"
check "stub: resolver" letsencrypt "$T_RESOLVER"
check "stub: docker provider" 1 "$T_DOCKER"
check "stub: file provider directory" /dynamic "$T_FILEDIR"
check "stub: host networking" 1 "$T_HOSTNET"
check "stub: no user-defined network" "" "$T_NETWORK"
TRAEFIK_RESOLVER='' TRAEFIK_ENTRYPOINT=https traefik_detect traefik-traefik-1
check "stub: TRAEFIK_RESOLVER= overrides" "" "$T_RESOLVER"
check "stub: TRAEFIK_ENTRYPOINT overrides" https "$T_ENTRYPOINT"
traefik_detect traefik-traefik-1
# shellcheck disable=SC2034
DOMAIN=links.example.com ROUTER=oflink-links-example-com
traefik_file_route traefik-traefik-1 "http://127.0.0.1:$LOCAL_HTTP_PORT"
route="$dyn/$ROUTER.yml"
has "route: the Host rule" "$route" 'rule: Host\(`links\.example\.com`\)'
has "route: entrypoint websecure" "$route" 'entryPoints: \[websecure\]'
has "route: certResolver letsencrypt" "$route" 'tls: \{ certResolver: letsencrypt \}'
has "route: to Caddy on 127.0.0.1:8080" "$route" 'url: "http://127\.0\.0\.1:8080"'
unset -f docker

# The TOML and YAML flatteners.
got=$(printf '[entryPoints.websecure]\n  address = ":443"\n[certificatesResolvers.le.acme]\n  email = "a@b.c" # x\n[[tls.certificates]]\n  certFile = "x"\n' | toml_flat | tr '\n' ' ')
check "toml_flat" 'entryPoints.websecure= entryPoints.websecure.address=:443 certificatesResolvers.le.acme= certificatesResolvers.le.acme.email=a@b.c ' "$got"
got=$(printf 'entryPoints:\n  websecure:\n    address: ":443" # tls\nproviders:\n  file:\n    directory: /dynamic\n' | yaml_flat | tr '\n' ' ')
check "yaml_flat" 'entryPoints= entryPoints.websecure= entryPoints.websecure.address=:443 providers= providers.file= providers.file.directory=/dynamic ' "$got"

# 4. docker compose config on each mode's .env, in a project directory shaped as /opt/oflink, so .env (and its COMPOSE_FILE)
#    is read as on the VPS (needs the docker CLI, starts nothing).
if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  mkdir -p "$tmp/oflink/app" "$tmp/oflink/pocketbase" "$tmp/oflink/vendor"
  cp "$root/compose.yaml" "$root/compose.traefik.yaml" "$root/Caddyfile" "$tmp/oflink/"
  cfg() { cp "$tmp/env.$1" "$tmp/oflink/.env" && (cd "$tmp/oflink" && docker compose config --format json 2>&1); }
  out=$(cfg clean) && ok "compose config: clean" || bad "compose config: clean: $out"
  [[ $out == *'"published": "443"'* ]] && ok "compose config: clean publishes 443" || bad "compose config: clean does not publish 443"
  [[ $out == *'"PB_APP_URL": "https://links.example.com"'* ]] && ok "compose config: PB_APP_URL reaches pocketbase" ||
    bad "compose config: PB_APP_URL not in the config"
  out=$(cfg filehost) && ok "compose config: file-host" || bad "compose config: file-host: $out"
  [[ $out == *'"host_ip": "127.0.0.1"'*'"published": "8080"'* ]] && ok "compose config: file-host publishes 127.0.0.1:8080" ||
    bad "compose config: file-host does not publish 127.0.0.1:8080"
  out=$(cfg traefik) && ok "compose config: traefik (COMPOSE_FILE from .env)" || bad "compose config: traefik: $out"
  caddy=$(printf '%s' "$out" | python3 -c 'import json,sys; c=json.load(sys.stdin)["services"]["caddy"]; l=c["labels"]; r="traefik.http.routers.oflink-links-example-com."; print(len(c.get("ports",[])), " ".join(sorted(c["networks"])), c["environment"]["APP_UPSTREAM"], l.get(r+"rule"), l.get(r+"entrypoints"), l.get(r+"tls.certresolver"), l.get("traefik.http.services.oflink-links-example-com.loadbalancer.server.port"))' 2>&1)
  check "compose config: traefik caddy (ports, networks, upstream, rule, entrypoint, resolver, port)" \
    '0 default traefik oflink-app:3000 Host(`links.example.com`) websecure letsencrypt 80' "$caddy"
  check "compose config: traefik hands Caddy CLOUDFLARE_RANGES=on private_ranges" "on private_ranges" \
    "$(printf '%s' "$out" | python3 -c 'import json,sys; print(json.load(sys.stdin)["services"]["caddy"]["environment"]["CLOUDFLARE_RANGES"])' 2>&1)"
  sed -i.bak 's/^TRAEFIK_RESOLVER=.*/TRAEFIK_RESOLVER=/' "$tmp/env.traefik"
  out=$(cfg traefik)
  check "compose config: traefik without a resolver: tls=true" true \
    "$(printf '%s' "$out" | python3 -c 'import json,sys; print(json.load(sys.stdin)["services"]["caddy"]["labels"].get("traefik.http.routers.oflink-links-example-com.tls"))' 2>&1)"
else
  echo "skip  docker compose config (no docker)"
fi

[ "$fail" -eq 0 ] && echo "install.test: ok" || echo "install.test: FAILED" >&2
exit "$fail"
