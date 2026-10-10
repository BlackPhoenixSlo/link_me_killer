#!/usr/bin/env bash
# One-line install (or update) on a fresh Docker VPS (e.g. Hostinger's Ubuntu 24.04 + Docker template), as root:
#   HTTPS_PORT=443 HTTP_PORT=80 DOMAIN=links.example.com bash -c 'curl -fsSLo /tmp/install.sh https://raw.githubusercontent.com/BlackPhoenixSlo/link_me_killer/master/deploy/install.sh && bash /tmp/install.sh'
# Clones into /opt/oflink, writes .env with a fresh PocketBase superuser password, fetches the two build inputs git does not
# carry (the pinned PocketBase zip into vendor/, the app's node_modules), starts the stack and waits for the domain to answer
# /internal/healthz. Re-running is an update: it pulls, keeps .env (and the data) and rebuilds.
#   DOMAIN              required, bare hostname whose A record points at this VPS
#   REPO                default https://github.com/BlackPhoenixSlo/link_me_killer.git
#   REF                 branch or tag, default master
#   HTTPS_PORT          default 443, HTTP_PORT default 80: our Caddy serves https://DOMAIN with Let's Encrypt certificates,
#                       obtained on demand, Custom Domains included. Any other pair (80/443 taken): Let's Encrypt only reaches
#                       80 and 443, so Caddy serves plain HTTP, http://DOMAIN:HTTP_PORT, a trial mode without HTTPS or Custom
#                       Domains (HTTPS_PORT is published but unused).
#   PB_SUPERUSER_EMAIL  default admin@DOMAIN, the PocketBase admin login
# Traefik in a container on 80/443: the default line finds it and routes DOMAIN through it (its Docker provider, or a file in
# its file provider directory); Traefik terminates TLS and our Caddy serves plain HTTP behind it. What it reads from Traefik's
# config can be named instead: TRAEFIK_ENTRYPOINT (the one on 443), TRAEFIK_RESOLVER (certificate resolver; empty = none),
# TRAEFIK_NETWORK (a network Traefik is on).
#   SKIP_DNS_CHECK      1 = do not check that DOMAIN resolves to this host
# Ported from open_onlyfansapi's deploy/install.sh (same detection, same .env handling).
set -euo pipefail
cd / # the caller may sit in a directory that no longer exists (an rm -rf of the previous install)

DIR=/opt/oflink
REPO=${REPO:-https://github.com/BlackPhoenixSlo/link_me_killer.git}
REF=${REF:-master}
DOMAIN=${DOMAIN:-}
ports_given=${HTTPS_PORT+1}${HTTP_PORT+1} # the caller named a port: a re-run then moves the stack to it
HTTPS_PORT=${HTTPS_PORT:-443}
HTTP_PORT=${HTTP_PORT:-80}
PB_SUPERUSER_EMAIL=${PB_SUPERUSER_EMAIL:-} # default admin@DOMAIN, set below once DOMAIN is checked
# The PocketBase release pocketbase/Dockerfile COPYs from vendor/ (git-ignored), with the sha256 of its official zips.
PB_VERSION=0.40.4
pb_sha256() { # <arch>
  case $1 in
    amd64) echo 9042ec818570e79c3628dadcd0a756c1496d9e1173918ec409d133c02f82e5fa ;;
    arm64) echo 86095bf8ed9345954f0d2bf0a5fb9b57584ae60b77ebf3b6cd23a8003a3fd418 ;;
  esac
}

die() { echo "install: $*" >&2; exit 1; }
logs_and_die() { # <message>; run from $DIR
  echo "install: $1; recent logs:" >&2
  docker compose logs --no-color --tail 40 caddy app pocketbase >&2 || true
  die "fix the cause above and re-run the same line"
}
say() { echo "==> $*"; }

# Traefik already on 80/443: its container, and what its static configuration says. Traefik reads one source
# only: a configuration file if there is one, else its flags, else its TRAEFIK_* variables.
traefik_container() { # the Traefik container on the host's 443 (published there, or host networking), else the first one
  local id first=''
  for id in $(docker ps --format '{{.ID}} {{.Image}}' | awk 'tolower($2) ~ /traefik/ { print $1 }'); do
    [ -n "$first" ] || first=$id
    if docker port "$id" 2>/dev/null | grep -qE ':443$' || [ "$(docker inspect -f '{{.HostConfig.NetworkMode}}' "$id")" = host ]; then
      echo "$id" && return 0
    fi
  done
  [ -z "$first" ] || echo "$first"
}
traefik_names_ok() { # <entrypoint> <resolver> <network>, each may be empty
  [[ $1 =~ ^[A-Za-z0-9_-]*$ && $2 =~ ^[A-Za-z0-9_-]*$ && $3 =~ ^[A-Za-z0-9_.-]*$ ]]
}
yaml_flat() { # YAML on stdin -> a.b.c=value lines; block mappings only, list items are skipped
  awk '
    function unquote(s) { gsub(/^[[:space:]]+|[[:space:]]+$/, "", s); gsub(/^["'"'"']|["'"'"']$/, "", s); return s }
    /^[[:space:]]*(#.*)?$/ || /^(---|\.\.\.)/ { next }
    {
      ind = match($0, /[^ ]/) - 1; line = substr($0, ind + 1); c = index(line, ":")
      if (line ~ /^-/ || c == 0) next
      key = substr(line, 1, c - 1); val = substr(line, c + 1)
      if (val != "" && val !~ /^[[:space:]]/) next # a:b is a scalar, not a key
      while (n > 0 && depth[n] >= ind) n--
      depth[++n] = ind; name[n] = unquote(key); path = name[1]
      for (i = 2; i <= n; i++) path = path "." name[i]
      sub(/[[:space:]]+#.*$/, "", val); print path "=" unquote(val)
    }'
}
toml_flat() { # TOML on stdin -> a.b.c=value lines; [[arrays of tables]] are skipped
  awk '
    function unquote(s) { gsub(/^[[:space:]]+|[[:space:]]+$/, "", s); gsub(/^["'"'"']|["'"'"']$/, "", s); return s }
    /^[[:space:]]*(#.*)?$/ { next }
    { sub(/^[[:space:]]+/, "") }
    /^\[\[/ { skip = 1; next }
    /^\[/ { skip = 0; prefix = $0; sub(/^\[/, "", prefix); sub(/\].*$/, "", prefix); gsub(/[[:space:]"]/, "", prefix); print prefix "="; next }
    skip { next }
    {
      e = index($0, "="); if (e == 0) next
      key = substr($0, 1, e - 1); gsub(/[[:space:]"]/, "", key); val = substr($0, e + 1); sub(/[[:space:]]+#.*$/, "", val)
      print (prefix == "" ? key : prefix "." key) "=" unquote(val)
    }'
}
traefik_static() { # <container id>: its static configuration as a.b.c=value lines
  local id=$1 args f file='' text=''
  args=$(docker inspect -f '{{range .Args}}{{println .}}{{end}}' "$id")
  f=$(printf '%s\n' "$args" | grep -i '^--configfile=' | head -1 | cut -d= -f2- || true)
  for f in $f /etc/traefik/traefik.yml /etc/traefik/traefik.yaml /etc/traefik/traefik.toml; do
    text=$(docker exec "$id" cat "$f" 2>/dev/null) && { file=$f; break; }
  done
  if [ -n "$file" ]; then
    case $file in *.toml) toml_flat ;; *) yaml_flat ;; esac <<<"$text"
  elif printf '%s\n' "$args" | grep -q '^--'; then
    printf '%s\n' "$args" | sed -n 's/^--//p'
  else
    docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$id" |
      awk '/^TRAEFIK_/ { e = index($0, "="); k = tolower(substr($0, 9, e - 9)); gsub(/_/, ".", k); print k substr($0, e) }'
  fi
}
traefik_detect() { # <container id>: sets T_ENTRYPOINT T_RESOLVER T_DOCKER T_NETWORK T_FILEDIR T_HOSTNET; TRAEFIK_* given win
  local id=$1 port
  # The entrypoint behind the host's 443: the container port published there (443 itself with host networking),
  # else the one named websecure.
  port=$(docker port "$id" 2>/dev/null | awk '$NF ~ /:443$/ { sub(/\/.*/, "", $1); print $1; exit }')
  IFS='|' read -r T_ENTRYPOINT T_RESOLVER T_DOCKER T_NETWORK T_FILEDIR < <(traefik_static "$id" | awk -v port="${port:-443}" '
    { e = index($0, "="); if (e == 0) e = length($0) + 1; k = substr($0, 1, e - 1); v = substr($0, e + 1); lk = tolower(k); split(k, p, ".") }
    lk ~ /^entrypoints\.[^.]+\.address$/ {
      a = v; sub(/\/(tcp|udp)$/, "", a)
      if (ep == "" && a ~ (":" port "$")) ep = p[2]
      if (tolower(p[2]) == "websecure") ws = p[2]
    }
    lk ~ /^certificatesresolvers\.[^.]+/ && res == "" { res = p[2] }
    (lk == "providers.docker" && tolower(v) != "false") || lk ~ /^providers\.docker\./ { dock = 1 }
    lk == "providers.docker.network" { net = v }
    lk == "providers.file.directory" { dir = v }
    END { print (ep != "" ? ep : ws) "|" res "|" dock "|" net "|" dir }')
  # Without a network in its config: the first user-defined network the container is on.
  [ -n "$T_NETWORK" ] || T_NETWORK=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' "$id" |
    grep -vxE 'bridge|host|none' | head -1 || true)
  T_HOSTNET=$([ "$(docker inspect -f '{{.HostConfig.NetworkMode}}' "$id")" = host ] && echo 1 || true)
  [ -z "${TRAEFIK_ENTRYPOINT:-}" ] || T_ENTRYPOINT=$TRAEFIK_ENTRYPOINT
  [ -z "${TRAEFIK_RESOLVER+1}" ] || T_RESOLVER=$TRAEFIK_RESOLVER
  [ -z "${TRAEFIK_NETWORK:-}" ] || T_NETWORK=$TRAEFIK_NETWORK
}
traefik_file_route() { # <container id> <backend url>: a dynamic-configuration file in Traefik's file provider directory
  local tmp
  tmp=$(mktemp)
  cat >"$tmp" <<EOF
# Written by $DIR/deploy/install.sh: Traefik terminates TLS for $DOMAIN and hands plain HTTP to oflink's Caddy.
http:
  routers:
    $ROUTER:
      rule: Host(\`$DOMAIN\`)
      entryPoints: [$T_ENTRYPOINT]
      service: $ROUTER
      tls: {${T_RESOLVER:+ certResolver: $T_RESOLVER }}
  services:
    $ROUTER:
      loadBalancer:
        servers: [{ url: "$2" }]
EOF
  chmod 644 "$tmp"
  if ! docker cp "$tmp" "$1:$T_FILEDIR/$ROUTER.yml" >/dev/null; then
    rm -f "$tmp"
    die "could not write $T_FILEDIR/$ROUTER.yml in the Traefik container (a read-only mount?)"
  fi
  rm -f "$tmp"
}
TRAEFIK='' TRAEFIK_VIA='' # Traefik's container, and docker (labels), file (a file, over its network) or file-host
# file-host: Traefik on the host network reaches Caddy's plain HTTP on 127.0.0.1:8080 (8443 is published but unused).
LOCAL_HTTP_PORT=8080 LOCAL_HTTPS_PORT=8443
# The project is named after $DIR, so Caddy's container on Traefik's network is oflink-caddy-1.
CADDY_CONTAINER=oflink-caddy-1
alt_ports() { [ "$HTTPS_PORT" != 443 ] || [ "$HTTP_PORT" != 80 ]; }
site_url() { # the URL visitors use
  if [ -n "$TRAEFIK_VIA" ] || ! alt_ports; then echo "https://$DOMAIN"
  elif [ "$HTTP_PORT" = 80 ]; then echo "http://$DOMAIN"
  else echo "http://$DOMAIN:$HTTP_PORT"; fi
}
# CLOUDFLARE_RANGES also names any trusted reverse proxy in front of Caddy, e.g. Traefik; private_ranges is Caddy's keyword
# for the private address ranges, so Caddy takes the visitor's address and https scheme from Traefik's X-Forwarded-* headers.
traefik_trust_line() { printf 'CLOUDFLARE_RANGES=private_ranges\n'; }
# Behind Traefik mode_lines writes CLOUDFLARE_RANGES, so the kept line goes; leaving Traefik resets private_ranges to empty.
trust_filter() {
  if [ -n "$TRAEFIK_VIA" ]; then sed '/^CLOUDFLARE_RANGES=/d'; else sed 's/^CLOUDFLARE_RANGES=private_ranges$/CLOUDFLARE_RANGES=/'; fi
}
# The .env lines that pick the mode; the password and everything else come from .env.example or the kept .env.
mode_lines() {
  printf 'PB_APP_URL=%s\n' "$(site_url)"
  case $TRAEFIK_VIA in
    docker | file)
      printf 'SITE_ADDRESS=:80\nCOMPOSE_FILE=compose.yaml:compose.traefik.yaml\n'
      traefik_trust_line
      printf 'TRAEFIK_%s\n' "HOST=$DOMAIN" "ROUTER=$ROUTER" "ENTRYPOINT=$T_ENTRYPOINT" "RESOLVER=$T_RESOLVER" "NETWORK=$T_NETWORK" ;;
    file-host)
      traefik_trust_line
      printf 'SITE_ADDRESS=:80\nHTTP_PORT=127.0.0.1:%s\nHTTPS_PORT=127.0.0.1:%s\n' "$LOCAL_HTTP_PORT" "$LOCAL_HTTPS_PORT" ;;
    *)
      if alt_ports; then
        printf 'SITE_ADDRESS=:80\nHTTP_PORT=%s\nHTTPS_PORT=%s\n' "$HTTP_PORT" "$HTTPS_PORT"
      else
        printf 'SITE_ADDRESS=https://\nHTTP_PORT=80\nHTTPS_PORT=443\n'
      fi ;;
  esac
}
MODE_KEYS='^(PB_APP_URL|SITE_ADDRESS|HTTP_PORT|HTTPS_PORT|COMPOSE_FILE|TRAEFIK_[A-Z]+)='
write_env() { # a fresh .env from .env.example: a new password, the domain, the box's addresses, then the mode lines
  umask 077
  # A bash loop, not sed: the password never appears on a command line.
  while IFS= read -r line || [ -n "$line" ]; do
    case $line in
      PB_SUPERUSER_EMAIL=*) line="PB_SUPERUSER_EMAIL=$PB_SUPERUSER_EMAIL" ;;
      PB_SUPERUSER_PASSWORD=*) line="PB_SUPERUSER_PASSWORD=$(openssl rand -hex 24)" ;;
      PRIMARY_HOSTS=*) line="PRIMARY_HOSTS=$DOMAIN" ;;
      ORIGIN_IPV4=*) line="ORIGIN_IPV4=$IPV4" ;;
      ORIGIN_IPV6=*) line="ORIGIN_IPV6=$IPV6" ;;
    esac
    [[ $line =~ $MODE_KEYS ]] && continue
    printf '%s\n' "$line"
  done <.env.example | trust_filter >.env.tmp
  mode_lines >>.env.tmp
  mv .env.tmp .env && chmod 600 .env
  umask 022
}
rewrite_mode() { # the mode lines of .env from mode_lines, every other line (and the password) kept
  umask 077
  { grep -vE "$MODE_KEYS" .env | trust_filter || true; mode_lines; } >.env.tmp
  mv .env.tmp .env && chmod 600 .env
  umask 022
}
pb_arch() { # Docker's TARGETARCH for this host, which picks the zip in pocketbase/Dockerfile
  case $(uname -m) in
    x86_64 | amd64) echo amd64 ;;
    aarch64 | arm64) echo arm64 ;;
    *) return 1 ;;
  esac
}
# Sourced (deploy/install.test.sh, deploy/install.traefik.test.sh): the functions only.
(return 0 2>/dev/null) && return 0

# Inputs first, so a typo is reported before anything else happens.
[ -n "$DOMAIN" ] || die "DOMAIN is required, e.g. DOMAIN=links.example.com (a bare hostname)"
[[ $DOMAIN =~ ^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$ ]] ||
  die "DOMAIN must be a bare hostname like links.example.com (no https://, path or port), got: $DOMAIN"
DOMAIN=$(printf '%s' "$DOMAIN" | tr '[:upper:]' '[:lower:]')
PB_SUPERUSER_EMAIL=${PB_SUPERUSER_EMAIL:-admin@$DOMAIN}
[[ $HTTPS_PORT =~ ^[0-9]+$ && $HTTP_PORT =~ ^[0-9]+$ ]] || die "HTTPS_PORT and HTTP_PORT must be numbers, got: $HTTPS_PORT $HTTP_PORT"
[ "$HTTPS_PORT" != "$HTTP_PORT" ] || die "HTTPS_PORT and HTTP_PORT must differ, got $HTTP_PORT for both"
[[ $PB_SUPERUSER_EMAIL =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] ||
  die "PB_SUPERUSER_EMAIL must be an email address, got: $PB_SUPERUSER_EMAIL"
traefik_names_ok "${TRAEFIK_ENTRYPOINT:-}" "${TRAEFIK_RESOLVER:-}" "${TRAEFIK_NETWORK:-}" ||
  die "TRAEFIK_ENTRYPOINT, TRAEFIK_RESOLVER and TRAEFIK_NETWORK take a name (letters, digits, - and _, and . in a network), got: ${TRAEFIK_ENTRYPOINT:-} ${TRAEFIK_RESOLVER:-} ${TRAEFIK_NETWORK:-}"

[ "$(id -u)" -eq 0 ] || die "must run as root: open a root shell first (sudo -i), then run the line again"

command -v docker >/dev/null || die "docker is not installed; pick a VPS image with Docker (e.g. Hostinger's Ubuntu 24.04 + Docker), or install it: curl -fsSL https://get.docker.com | sh"
docker compose version >/dev/null 2>&1 || die "the docker compose plugin is missing: apt-get install -y docker-compose-plugin"
# The pocketbase build uses additional_contexts and TARGETARCH, which need BuildKit through buildx.
docker buildx version >/dev/null 2>&1 ||
  die "docker buildx is missing; install Docker from docs.docker.com/engine/install (the Ubuntu 24.04 + Docker template has it)"
ARCH=$(pb_arch) || die "PocketBase is built here for amd64 or arm64 only, this host is $(uname -m)"

export DEBIAN_FRONTEND=noninteractive
apt_install() { # <command> <package>
  command -v "$1" >/dev/null && return 0
  say "installing $2"
  # The lock timeout: unattended-upgrades holds the dpkg lock for a while after first boot.
  apt-get -o DPkg::Lock::Timeout=300 update -qq &&
    apt-get -o DPkg::Lock::Timeout=300 install -y -qq "$2" >/dev/null
}
apt_install git git
apt_install openssl openssl

# The box's public addresses: what the DNS check compares, and what a Creator's Custom Domain records must name.
IPV4=$(curl -4 -fsS --max-time 10 https://ifconfig.me 2>/dev/null | grep -E '^[0-9.]+$' || true)
IPV6=$(curl -6 -fsS --max-time 10 https://ifconfig.me 2>/dev/null | grep -E '^[0-9A-Fa-f:]+$' || true)

# Let's Encrypt (Caddy's or Traefik's) fails unless DOMAIN points here. A public resolver, not the local stub:
# /etc/hosts maps the VPS hostname to 127.0.1.1, which is not what the CA sees.
if [ "${SKIP_DNS_CHECK:-}" != 1 ]; then
  apt_install dig dnsutils
  resolved=$(dig +short A "$DOMAIN" @1.1.1.1 | grep -E '^[0-9.]+$' || true)
  [ -n "$resolved" ] || die "$DOMAIN has no A record yet; add one pointing at this VPS (${IPV4:-its public IPv4}), wait a few minutes, and re-run (SKIP_DNS_CHECK=1 bypasses)"
  own="$IPV4 $IPV6 $(hostname -I 2>/dev/null || true)"
  match=
  for ip in $resolved; do
    for o in $own; do [ "$ip" = "$o" ] && match=1; done
  done
  [ -n "$match" ] || die "$DOMAIN resolves to ${resolved//$'\n'/ }, not to this host ($own); fix the A record and re-run (SKIP_DNS_CHECK=1 bypasses)"
  # Let's Encrypt may validate over IPv6, so every AAAA record must be this host too.
  for ip in $(dig +short AAAA "$DOMAIN" @1.1.1.1 | grep -E '^[0-9A-Fa-f:]+$' || true); do
    [[ " $own " == *" $ip "* ]] ||
      die "$DOMAIN has an AAAA record $ip that is not this host; fix or remove it and re-run (SKIP_DNS_CHECK=1 bypasses)"
  done
  say "$DOMAIN resolves to this host"
fi

export GIT_TERMINAL_PROMPT=0

if [ -d "$DIR/.git" ]; then
  say "updating $DIR to $REF"
  git -C "$DIR" fetch -q --tags origin
  git -C "$DIR" checkout -q "$REF"
  # A branch fast-forwards; a tag is a detached checkout with nothing to pull.
  if git -C "$DIR" symbolic-ref -q HEAD >/dev/null; then
    git -C "$DIR" pull -q --ff-only
  fi
else
  say "cloning $REPO ($REF) into $DIR"
  git clone -q --branch "$REF" "$REPO" "$DIR"
fi

cd "$DIR"
if [ -f .env ]; then
  say "kept the existing .env"
  if [ -n "$ports_given" ]; then
    # Ports named on the command line win: rewrite the mode lines, keep every other line (and the password).
    rewrite_mode
  elif ! grep -qxF "PB_APP_URL=$(site_url)" .env; then
    echo "install: warning: .env has a PB_APP_URL other than $(site_url); name HTTPS_PORT/HTTP_PORT on the command line to move it" >&2
  fi
  grep -qE "^PRIMARY_HOSTS=(.*,)?$DOMAIN(,|$)" .env ||
    echo "install: warning: $DOMAIN is not in PRIMARY_HOSTS in $DIR/.env, so the app does not serve it; add it there" >&2
else
  say "writing .env with a fresh PocketBase password"
  [ -n "$IPV4" ] || echo "install: warning: could not find this box's public IPv4; set ORIGIN_IPV4 in $DIR/.env for Custom Domains" >&2
  write_env
fi

# The build inputs git does not carry. pocketbase/Dockerfile COPYs the pinned zip from vendor/ and never fetches it.
grep -q "pocketbase_${PB_VERSION}_linux_" pocketbase/Dockerfile ||
  die "pocketbase/Dockerfile no longer builds PocketBase $PB_VERSION; update PB_VERSION and its checksums in deploy/install.sh"
zip="vendor/pocketbase_${PB_VERSION}_linux_${ARCH}.zip"
sha=$(pb_sha256 "$ARCH")
if ! { [ -f "$zip" ] && echo "$sha  $zip" | sha256sum -c --status; }; then
  say "fetching PocketBase $PB_VERSION ($ARCH)"
  mkdir -p vendor
  curl -fsSL -o "$zip.tmp" "https://github.com/pocketbase/pocketbase/releases/download/v$PB_VERSION/pocketbase_${PB_VERSION}_linux_${ARCH}.zip" ||
    die "could not download PocketBase $PB_VERSION from GitHub"
  echo "$sha  $zip.tmp" | sha256sum -c --status || { rm -f "$zip.tmp"; die "the PocketBase download does not match its checksum"; }
  mv "$zip.tmp" "$zip"
fi
# app/Dockerfile COPYs app/ with its node_modules: install them from the lockfile with the image's own Node and pnpm.
say "installing the app's dependencies"
docker run --rm -v "$DIR/app:/app" -w /app -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 -e CI=1 node:22-alpine \
  sh -c 'corepack pnpm install --frozen-lockfile --prod --silent' || die "pnpm install failed in app/"

# The published ports must be free. Check before the build, not after, and do not count our own containers on a re-run.
own_ports=$(for id in $(docker compose ps -q --status running 2>/dev/null || true); do
  docker port "$id" 2>/dev/null | sed -E 's/.*:([0-9]+)$/\1/'
done | sort -u)
port_holder() { # <port>: what listens there, empty when free or ours
  printf '%s\n' "$own_ports" | grep -qx "$1" && return 0
  ss -Hltnp "sport = :$1" 2>/dev/null | head -1
}
for port in "$HTTP_PORT" "$HTTPS_PORT"; do
  holder=$(port_holder "$port")
  [ -z "$holder" ] && continue
  # The default line on a box whose 80/443 belong to a Traefik container: the domain goes through it.
  if ! alt_ports && TRAEFIK=$(traefik_container) && [ -n "$TRAEFIK" ]; then
    break
  fi
  die "port $port is already in use on this VPS ($holder). Name two free ports instead, e.g. HTTPS_PORT=8443 HTTP_PORT=8081 (plain HTTP on 8081, no certificate); ss -Hltn lists the ports in use"
done
pb_port=$(sed -n 's/^PB_PORT=//p' .env | tail -1)
holder=$(port_holder "${pb_port:-8090}")
[ -z "$holder" ] || die "port ${pb_port:-8090} (PocketBase's admin, on 127.0.0.1) is already in use ($holder); set PB_PORT=<a free port> in $DIR/.env and re-run"

if [ -n "$TRAEFIK" ]; then
  traefik_detect "$TRAEFIK"
  ROUTER=oflink-$(printf '%s' "$DOMAIN" | tr '.' '-') # one router per domain, apart from the box's other apps
  if [ -n "$T_HOSTNET" ]; then
    [ -z "$T_FILEDIR" ] || TRAEFIK_VIA='file-host'
  elif [ -n "$T_NETWORK" ] && [ -n "$T_DOCKER" ]; then
    TRAEFIK_VIA='docker'
  elif [ -n "$T_NETWORK" ] && [ -n "$T_FILEDIR" ]; then
    TRAEFIK_VIA='file'
  fi
  if [ -z "$TRAEFIK_VIA" ] || [ -z "$T_ENTRYPOINT" ]; then
    die "Traefik (container $TRAEFIK) owns 80/443, but its config does not say how to route $DOMAIN through it. Found: entrypoint on 443 '$T_ENTRYPOINT', certificate resolver '$T_RESOLVER', docker provider ${T_DOCKER:+on}${T_DOCKER:-off}, network '$T_NETWORK', file provider directory '$T_FILEDIR', host networking ${T_HOSTNET:+yes}${T_HOSTNET:-no}. Needed: an entrypoint, and the docker provider with a user-defined network, or a file provider directory. Name what is missing in front of the line, e.g. TRAEFIK_ENTRYPOINT=websecure TRAEFIK_RESOLVER=letsencrypt TRAEFIK_NETWORK=traefik; or serve on other ports, e.g. HTTPS_PORT=8443 HTTP_PORT=8081"
  fi
  traefik_names_ok "$T_ENTRYPOINT" "$T_RESOLVER" "$T_NETWORK" ||
    die "Traefik's config has names install.sh does not handle: entrypoint '$T_ENTRYPOINT', resolver '$T_RESOLVER', network '$T_NETWORK'; name them with TRAEFIK_ENTRYPOINT, TRAEFIK_RESOLVER, TRAEFIK_NETWORK"
  [ -n "$T_RESOLVER" ] ||
    echo "install: warning: Traefik has no certificate resolver, so $DOMAIN gets its default certificate (TRAEFIK_RESOLVER=<name> names one)" >&2
  if [ "$TRAEFIK_VIA" = file-host ]; then
    for port in "$LOCAL_HTTP_PORT" "$LOCAL_HTTPS_PORT"; do
      holder=$(port_holder "$port")
      [ -z "$holder" ] || die "port $port is already in use on this VPS ($holder); Traefik on the host network reaches our Caddy on 127.0.0.1:$LOCAL_HTTP_PORT, with $LOCAL_HTTPS_PORT beside it"
    done
  fi
  rewrite_mode
  case $TRAEFIK_VIA in
    file) traefik_file_route "$TRAEFIK" "http://$CADDY_CONTAINER:80" ;;
    file-host) traefik_file_route "$TRAEFIK" "http://127.0.0.1:$LOCAL_HTTP_PORT" ;;
  esac
  say "Traefik owns 80/443: $DOMAIN goes through it (entrypoint $T_ENTRYPOINT, certificate resolver ${T_RESOLVER:-none}, $([ "$TRAEFIK_VIA" = docker ] && echo "labels on network $T_NETWORK" || echo "file $T_FILEDIR/$ROUTER.yml"))"
fi

URL=$(site_url)
say "building and starting the stack (the first build takes a few minutes)"
docker compose up -d --build || logs_and_die "docker compose up failed"

# The app first (it starts once PocketBase is healthy), then the domain through Caddy or Traefik.
say "waiting for the app"
for _ in $(seq 36); do
  docker compose exec -T app wget -q -O /dev/null http://127.0.0.1:3000/internal/healthz 2>/dev/null && break
  sleep 5
done
docker compose exec -T app wget -q -O /dev/null http://127.0.0.1:3000/internal/healthz 2>/dev/null ||
  logs_and_die "the app did not answer within 3 minutes"

say "waiting for $URL$([ "${URL#https}" = "$URL" ] || echo " (the first request gets the certificate)")"
# Asked on this box (--resolve), so a router without hairpin NAT does not matter. -k only when Traefik has no resolver.
port=$([ "${URL#https}" != "$URL" ] && echo 443 || echo "$HTTP_PORT")
insecure=; [ -z "$TRAEFIK" ] || [ -n "$T_RESOLVER" ] || insecure=1
for _ in $(seq 36); do
  # -s only: attempts before the certificate exists are not errors
  if curl -fs ${insecure:+-k} -o /dev/null --max-time 10 --resolve "$DOMAIN:$port:127.0.0.1" "$URL/internal/healthz"; then
    cat <<EOF

Done: $URL is up.$([ -z "$TRAEFIK" ] || printf '\n   Traefik on this box serves it, with its certificate (resolver %s).' "${T_RESOLVER:-none: its default certificate}")$(! alt_ports || printf '\n   Plain HTTP on port %s: Let'"'"'s Encrypt only reaches ports 80 and 443. For HTTPS, free them and re-run with HTTPS_PORT=443 HTTP_PORT=80.' "$HTTP_PORT")

1. Sign up at $URL/edit/signup. You are signed in at once, no email confirmation required.
2. PocketBase admin: the login is PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD in $DIR/.env
     grep PB_SUPERUSER $DIR/.env
   It listens on this box's 127.0.0.1:${pb_port:-8090} only. From your computer open an SSH tunnel, then http://127.0.0.1:${pb_port:-8090}/_/
     ssh -L ${pb_port:-8090}:127.0.0.1:${pb_port:-8090} root@${IPV4:-<this VPS>}
3. Email is optional. Without SMTP, accounts stay unverified and password reset emails are not sent. To turn them on,
   set Settings -> Mail settings (SMTP) in the PocketBase admin.$([ -z "$TRAEFIK" ] && ! alt_ports || printf '\n4. Self-service Custom Domains need our Caddy on 80/443 (it gets their certificates on demand). Here they are served\n   only once you add a Traefik route (or proxy route) for each domain to this box.')

Update later by re-running the same line, or: HTTPS_PORT=$HTTPS_PORT HTTP_PORT=$HTTP_PORT DOMAIN=$DOMAIN bash $DIR/deploy/install.sh
EOF
    exit 0
  fi
  sleep 5
done

if [ -n "$TRAEFIK" ]; then
  echo "install: $URL/internal/healthz did not answer within about 9 minutes; recent Traefik and Caddy logs:" >&2
  docker logs --tail 30 "$TRAEFIK" >&2 || true
  docker compose logs --no-color --tail 40 caddy >&2 || true
  die "Traefik gets the certificate from Let's Encrypt over 80/443: check the A record and Traefik's log above for $DOMAIN"
fi
logs_and_die "$URL/internal/healthz did not answer within about 9 minutes (Caddy gets the certificate from Let's Encrypt over 80/443: check the A record and that the provider's firewall opens both)"
