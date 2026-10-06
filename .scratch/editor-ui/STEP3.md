# Step 3: Phase 06, several Profiles per account + self-service Custom Domains

Read fully first: .scratch/editor-ui/CONSTRAINTS.md (hard rules 1-11 still bind), docs/spec/phase-06-sites-and-domains.md (THE DESIGN;
build exactly it, nothing more), docs/spec/phase-03-auth-and-editor.md and phase-05-cutover-and-domains.md (binding for rules and hosts),
.scratch/editor-ui/test-inventory.md (selectors tests use), docs/spec/editor-redesign.md §11 (Editor conventions).

Two agents work at once in this repo: PROFILES (tickets 1-3) and DOMAINS (tickets 4-7). Plus a third, unrelated Claude session has
UNCOMMITTED Deeplink work in: app/editor/app.js, app/editor/screens/profile.js, app/public/script.js, app/src/public-profile.js,
tests/e2e/01,02-profile-parity,02-v1-import,03,05,06 specs, tests/e2e/helpers.ts, pocketbase/pb_migrations/1791140010_deeplink_open.js.
NEVER run git stash / checkout / reset / restore / clean. Never revert a hunk you did not write. Never Write (overwrite) a shared file
whole: use the Edit tool with small hunks, re-reading the file right before each edit.

File ownership (edit only yours; for another file write the exact hunk in your report):
- PROFILES owns: pocketbase/pb_migrations/1791140011_several_profiles.js (new), app/editor/screens/auth.js, app/editor/screens/links.js,
  app/editor/stats.js, app/editor/editor.css, tests/e2e/07-sites.spec.ts (new), tests/e2e/03-auth-and-editor.spec.ts, tests/e2e/04-stats.spec.ts,
  tests/e2e/06-editor-ui.spec.ts, tests/stats-seed.js, tests/e2e/helpers.ts (append-only), RUN.md (the step-12 hand-over lines),
  and in app/editor/app.js ONLY: onboarded(), onboard(), route() lines for /edit/new, the switcher, and localStorage `oflink.profile`.
- DOMAINS owns: pocketbase/pb_migrations/1791140012_custom_domains.js (new), app/src/host-resolver.js, app/src/gateway.js, app/server.js,
  app/src/domain-check.js (new), app/editor/screens/domain.js (new), tests/fake-dns.mjs (new), tests/compose.mail.yaml (may add a service),
  tests/e2e.env, compose.yaml (env lines only), .env.example, tests/e2e/05-domains.spec.ts EXCEPT the hand-over (step 12) test,
  tests/e2e/02-v1-import.spec.ts (customDomain lines only), tests/e2e/07-domains.spec.ts (new), tests/e2e/domains-helpers.ts, RUN.md
  (new `## Custom Domains` section), and in app/editor/app.js ONLY: the import of screens/domain.js, the route() line for /edit/domain,
  and address() (the Bio Link shows `https://{domain}/` once live). No new CSS: use existing `e-` components; if you must, report the hunk.
- PROFILES owns the step-12 hand-over test in 05 (it changes because of the (owner, slot) index: the hand-over sets owner AND a free slot,
  and the bare Profile no longer has to be deleted first).

Contract between the two (both honour it):
- onboarded() returns `{ profile, links }` as today; `profile` is the CURRENT Profile (PROFILES). DOMAINS's screen takes that profile.
- `/edit/domain`: `import { drawDomain } from './screens/domain.js'`; route: `if (path === '/edit/domain') { const done = await onboarded();
  if (done) show('/edit/domain', () => drawDomain(done.profile)); return; }`. DOMAINS adds both lines.
- The Editor Home's "Domain" entry: PROFILES adds, in the home screen, a link named "Domain" to /edit/domain (role link, name "Domain").
- Stats filter: `profile='{current id}'` (PROFILES).
- Spec file names: 07-sites.spec.ts (PROFILES), 07-domains.spec.ts (DOMAINS). The spec's "07-sites-and-domains.spec.ts" means these two.

Test runs (the stack is single-tenant: ports 4173/18090/18025, Compose project oflinkv2-e2e):
- Before any `./check.sh ...` or Playwright run: take the lock with
    until mkdir .scratch/editor-ui/stack.lock 2>/dev/null; do sleep 20; done
  then confirm `docker ps --format '{{.Names}}' | grep -i oflink` prints nothing (if it does, wait and retry; the other session may be
  running). Run ONLY your own spec files plus the ones you changed, e.g. `./check.sh tests/e2e/07-sites.spec.ts tests/e2e/03-auth-and-editor.spec.ts --reporter=line`.
  Release with `rmdir .scratch/editor-ui/stack.lock` in every case (use a trap). Never hold the lock while editing code.
  Never run the whole suite; the coordinator runs the cold suite at the end.
- Failures caused by the other session's uncommitted Deeplink work (02-parity popOutTiming, 03 'Deeplink' options, 06 'Deeplink on tap')
  are not yours: list them, do not fix them.

Migrations: PocketBase 0.40.4 JS migrations, same style as 1791140004/1791140005/1791140008 (read them). The test stack builds the
pocketbase image from pocketbase/ with pb_migrations copied in, so a migration file is live on the next stack start.

Finish: CONSTRAINTS rule 2 grep over your changed paths, then the rule-11 report (under 60 lines) with: files, verification commands and
real output lines, the exact hunks you need in files you do not own, and your 3 sharpest assumptions.
