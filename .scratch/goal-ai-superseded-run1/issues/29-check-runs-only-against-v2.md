# 29: `./check.sh` runs only against v2 at localhost:4173, the dev server stand-in is gone, and the parity spec can be pointed at the VPS

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 38, 39, 41
Seams: the test loop itself: the Playwright config, the Compose wrapper and the test env file. The parity spec runs at `PLAYWRIGHT_BASE_URL` against a stack started by hand.
Blocked by: 21: Reveal answers only its own origin…; 22: An edit made through PocketBase shows on the next page load; 24: Every phone photo format arrives upright…; 26: The v1 Import warns about what v1 already shows broken…; 27: Phase 0's specs pass against v2; 28: Phase 1's spec passes against v2 on the seeded Fixture Profile
Status: ready-for-agent

**What to build:** The contract step. The test loop has one webServer: the Compose wrapper, at the old baseURL http://localhost:4173. It starts the stack, seeds it with the v1 Import, waits on the Fixture Profile's JSON, follows the logs and runs `down -v` on SIGTERM. Every spec runs in one project, and the v1 Import and Reveal guard specs run in a last one.

The dev server stand-in, its fixture lookup, the second port and the second project are removed.

When `PLAYWRIGHT_BASE_URL` is set, it replaces baseURL and no webServer starts. The parity spec then sends its Reveal and `/r` calls through one paced helper, at most 50 a minute in one worker, so a run against the VPS stays under the production limit.

- [ ] The dev server stand-in is gone, and nothing refers to it.
- [ ] The config holds:
  - baseURL is http://localhost:4173;
  - the test env file puts v2 there;
  - there is one webServer;
  - `reuseExistingServer: false`.
- [ ] One `./check.sh` from a clean state does the whole loop:
  - starts the stack in its own Compose project;
  - seeds it;
  - runs every spec of Phases 0, 1 and 2;
  - tears the stack down.

  Afterwards no container, volume or network of the test project remains, and no other local Compose project was touched.
- [ ] The v1 Import and Reveal guard specs run after every other spec.
- [ ] Pointing the parity spec elsewhere works. Start the stack by hand with the test env file, seed it, then run `PLAYWRIGHT_BASE_URL=http://localhost:4173 npx playwright test tests/e2e/02-profile-parity.spec.ts`:
  - no webServer starts;
  - the parity spec passes;
  - its Reveal and `/r` calls never exceed 50 in any minute.
- [ ] The spec's whole Acceptance block passes from the repo root, apart from its `# manual:` lines.
- [ ] Playwright: extends `tests/e2e/02-profile-parity.spec.ts` with the paced helper. `./check.sh` passes.
