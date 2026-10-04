#!/usr/bin/env bash
# The Playwright webServer from Phase 2 on (docs/spec/phase-02-vps-foundation.md, Test loop): the test stack in its own
# Compose project (tests/e2e.env), seeded through the v1 Import with the Fixture site, taken down with its data on SIGTERM.
# Playwright's readiness URL is the Fixture Profile's JSON, which Caddy serves only once the seed has finished.
# Prints Compose's own lines and the import's lines, which never hold a Destination (app/bin/import-v1).
# ASSUMPTION: Caddy starts after the seed, not with the first `up`, because the import writes the Profile before its Links
# (app/bin/import-v1, write()), so its JSON would answer before the seed's last write (rung 1 for that order; rung 5 for
# the fix). Overturned if the import writes the Profile last; then one `up --build --wait` starts all three services.
set -u
cd "$(dirname "$0")/.."

compose() { docker compose --env-file tests/e2e.env "$@"; }
down() { compose down -v --remove-orphans; }
stop() {
  trap - TERM INT
  [ -n "${logs:-}" ] && kill "$logs" 2>/dev/null
  down
  exit 0
}
trap stop TERM INT

down # a stray test project would hold other data: start from empty, never reuse it
compose up -d --build --wait pocketbase app || { down; exit 1; }
# The Fixture site: tests/fixtures/ with the Page Copy's stock icons as its images/, as compose.yaml documents it.
compose run --rm \
  -v "$PWD/tests/fixtures/api:/site/api:ro" -v "$PWD/tests/fixtures/netlify:/site/netlify:ro" \
  -v "$PWD/app/public/images:/site/images:ro" app import-v1 --site /site || { down; exit 1; }
compose up -d --wait caddy || { down; exit 1; }

compose logs -f --no-color &
logs=$!
wait "$logs"
# The logs ended without a signal (the stack stopped by itself): take it down and report the failure.
down
exit 1
