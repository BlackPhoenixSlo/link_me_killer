#!/usr/bin/env bash
# One-line deploy for link_me_killer on a fresh VPS (tested shape: Hostinger Ubuntu/Debian, run as root).
#
#   bash <(curl -fsSL https://raw.githubusercontent.com/BlackPhoenixSlo/link_me_killer/main/deploy.sh)
#
# It installs Docker if missing, clones the repo to /opt/link_me_killer, writes .env, and brings the
# stack up. First run prompts for the domain and admin login; pass them as env vars to skip prompts:
#
#   DOMAIN=links.example.com PB_SUPERUSER_EMAIL=you@example.com \
#     bash <(curl -fsSL https://raw.githubusercontent.com/BlackPhoenixSlo/link_me_killer/main/deploy.sh)
#
# Re-running updates to the latest commit and restarts. .env is written once and left alone after that.
set -euo pipefail

REPO="${REPO:-https://github.com/BlackPhoenixSlo/link_me_killer.git}"
APP_DIR="${APP_DIR:-/opt/link_me_killer}"
BRANCH="${BRANCH:-main}"

SUDO=""
[ "$(id -u)" -ne 0 ] && SUDO="sudo"

say() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }

ask() { # ask VAR "prompt" ["default"] — keeps an already-set value, else reads from the terminal
  local __var="$1" __prompt="$2" __def="${3:-}" __ans=""
  [ -n "${!__var:-}" ] && return 0
  if [ -r /dev/tty ]; then
    if [ -n "$__def" ]; then read -r -p "$__prompt [$__def]: " __ans </dev/tty || true
    else read -r -p "$__prompt: " __ans </dev/tty || true; fi
  fi
  printf -v "$__var" '%s' "${__ans:-$__def}"
}

# 1. Dependencies: git, Docker, the Compose plugin.
if ! command -v git >/dev/null 2>&1; then
  say "Installing git"; $SUDO apt-get update -y && $SUDO apt-get install -y git
fi
if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker"; curl -fsSL https://get.docker.com | $SUDO sh
fi
$SUDO systemctl enable --now docker >/dev/null 2>&1 || true
if ! docker compose version >/dev/null 2>&1; then
  say "Installing the Docker Compose plugin"
  $SUDO apt-get update -y && $SUDO apt-get install -y docker-compose-plugin
fi

# 2. Clone, or update an existing checkout to the latest commit.
if [ -d "$APP_DIR/.git" ]; then
  say "Updating $APP_DIR"
  $SUDO git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  $SUDO git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  say "Cloning into $APP_DIR"
  $SUDO mkdir -p "$APP_DIR"
  $SUDO git clone --depth 1 -b "$BRANCH" "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

# 3. .env — written once, on the first run.
if [ ! -f .env ]; then
  say "Configuring .env"
  ask DOMAIN "Domain this will serve (e.g. links.example.com)"
  ask PB_SUPERUSER_EMAIL "PocketBase admin email"
  ask PB_SUPERUSER_PASSWORD "PocketBase admin password (blank = auto-generate)"
  : "${DOMAIN:?A domain is required}"
  : "${PB_SUPERUSER_EMAIL:?An admin email is required}"
  if [ -z "${PB_SUPERUSER_PASSWORD:-}" ]; then
    PB_SUPERUSER_PASSWORD="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
    GENERATED_PW=1
  fi

  $SUDO cp .env.example .env
  set_env() { # key value — replace the key's line if present, else append
    if $SUDO grep -q "^$1=" .env; then $SUDO sed -i "s|^$1=.*|$1=$2|" .env
    else printf '%s=%s\n' "$1" "$2" | $SUDO tee -a .env >/dev/null; fi
  }
  set_env SITE_ADDRESS "https://$DOMAIN"
  set_env PRIMARY_HOSTS "$DOMAIN"
  set_env PB_SUPERUSER_EMAIL "$PB_SUPERUSER_EMAIL"
  set_env PB_SUPERUSER_PASSWORD "$PB_SUPERUSER_PASSWORD"
  $SUDO chmod 600 .env
fi

# 4. Build and start.
say "Building and starting the stack"
$SUDO docker compose up --build -d

DOMAIN_SHOWN="$($SUDO sed -n 's/^SITE_ADDRESS=https:\/\///p' .env | head -1)"
say "Done. link_me_killer is starting in $APP_DIR."
echo "   Site:  $($SUDO sed -n 's/^SITE_ADDRESS=//p' .env | head -1)"
echo "   Admin: tunnel the loopback port, then open http://127.0.0.1:8090/_/"
echo "          ssh -L 8090:127.0.0.1:8090 root@<this-vps>"
[ "${GENERATED_PW:-0}" = "1" ] && echo "   Generated admin password: $PB_SUPERUSER_PASSWORD"
echo
echo "Point the domain's DNS A record at this VPS's public IP so Caddy can issue HTTPS for ${DOMAIN_SHOWN:-it}."
