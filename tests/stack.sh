#!/usr/bin/env bash
# The Playwright webServer from Phase 2 on (docs/spec/phase-02-vps-foundation.md, Test loop): the test stack in its own
# Compose project (tests/e2e.env), seeded through the v1 Import with the v1 Snapshot and the Fixture site, taken down with its
# data on SIGTERM.
# Playwright's readiness URL is the Fixture Profile's JSON, which Caddy serves only once the seed has finished.
# Prints Compose's own lines and the import's lines, which never hold a Destination (app/bin/import-v1).
# ASSUMPTION: Caddy starts after the seed, not with the first `up`, because the import writes the Profile before its Links
# (app/bin/import-v1, write()), so its JSON would answer before the seed's last write (rung 1 for that order; rung 5 for
# the fix). Overturned if the import writes the Profile last; then one `up --build --wait` starts all three services.
set -u
cd "$(dirname "$0")/.."

# The test stack is compose.yaml plus the local mail catcher (tests/compose.mail.yaml), whose profile is turned on here only.
compose() { docker compose --env-file tests/e2e.env --profile mail "$@"; }
down() { compose down -v --remove-orphans; }
stop() {
  trap - TERM INT
  [ -n "${logs:-}" ] && kill "$logs" 2>/dev/null
  down
  exit 0
}
trap stop TERM INT

down # a stray test project would hold other data: start from empty, never reuse it
compose up -d --build --wait pocketbase app mailpit || { down; exit 1; }
# The local mail (Phase 3 spec, Mail): PocketBase sends through the mail catcher, and its email links start with the public
# origin, Playwright's baseURL, as its Application URL. Test-only values from tests/e2e.env; on the VPS the Operator sets both
# by hand. A superuser's PATCH of PocketBase's settings at the loopback port, as the admin UI saves them.
node --env-file=tests/e2e.env -e '
  const { PB_PORT, HTTP_PORT, PB_SUPERUSER_EMAIL: identity, PB_SUPERUSER_PASSWORD: password } = process.env;
  const pb = (path, init) => fetch(`http://127.0.0.1:${PB_PORT}${path}`, init).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${path}: ${r.status}`))));
  const post = (body, token = "") => ({ headers: { "content-type": "application/json", Authorization: token }, body: JSON.stringify(body) });
  (async () => {
    const { token } = await pb("/api/collections/_superusers/auth-with-password", { method: "POST", ...post({ identity, password }) });
    await pb("/api/settings", { method: "PATCH", ...post({ meta: { appURL: `http://localhost:${HTTP_PORT}` }, smtp: { enabled: true, host: "mailpit", port: 1025 } }, token) });
    console.log("local mail: PocketBase sends through mailpit; Application URL set");
  })().catch((e) => { console.error(e.message); process.exit(1); });
' || { down; exit 1; }
# The seed: the whole v1 Snapshot first, mounted read-only as the VPS line in compose.yaml mounts it, when it is there, and
# the Fixture site last (tests/fixtures/ with the Page Copy's stock icons as its images/, as compose.yaml documents it), so
# the Fixture Profile is the last write. Its repaired, dropped, missing-image and no-destination lines are warnings (exit 0).
# V1_SNAPSHOT names the Snapshot (default linkme_clone3/); set empty, or naming no directory, the Fixture site is seeded
# alone, as on a fresh clone, and the specs skip their v1 cases (`V1_SNAPSHOT= ./check.sh`; the specs read the same variable).
# ASSUMPTION: one variable that the harness and the specs both honour, rather than moving linkme_clone3/ aside, proves the
# fresh-clone path (rung 4: the read-only Snapshot is never moved; rung 5: one variable). Overturned if the fresh-clone run
# must be a real clone without the Snapshot.
fixture_site=(-v "$PWD/tests/fixtures/api:/site/api:ro" -v "$PWD/tests/fixtures/netlify:/site/netlify:ro"
  -v "$PWD/app/public/images:/site/images:ro")
snapshot="${V1_SNAPSHOT-linkme_clone3}"
if [ -n "$snapshot" ] && [ -d "$snapshot" ]; then
  compose run --rm -v "$(cd "$snapshot" && pwd):/v1:ro" "${fixture_site[@]}" app import-v1 --site /v1 --site /site || { down; exit 1; }
else
  compose run --rm "${fixture_site[@]}" app import-v1 --site /site || { down; exit 1; }
fi
compose up -d --wait caddy || { down; exit 1; }

compose logs -f --no-color &
logs=$!
wait "$logs"
# The logs ended without a signal (the stack stopped by itself): take it down and report the failure.
down
exit 1
