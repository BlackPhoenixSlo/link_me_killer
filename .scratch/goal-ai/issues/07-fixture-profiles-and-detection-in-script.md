# 07: The Fixture Profile and a Mode-less fixture open locally, and In-App Browser detection lives in the page script

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 34
Seams: the Profile page in Chromium under Playwright, against the dev server, with fake User-Agents set per `test.describe`. Observed through the navigation recorder and the Reveal and `example.com` stubs.
Blocked by: 01: The dev server stand-in follows netlify.toml…; 03: Only the site folder is published…
Status: ready-for-agent

**What to build:** A prefactor for the rest of Phase 1. Nothing a Visitor sees on a real Profile changes.

- The local test loop gains two Profiles that exist only there:
  - `fixture`, the Fixture Profile. It is a copy of juliafilippo_ whose default is Direct Mode. It holds four Links: one with no Mode of its own, one in Escape Mode, one in Deeplink Mode, and an Adult Link in Escape Mode with tracking on.
  - `fixture_v1`, a v1-shaped Profile with no Mode anywhere.

  Their Link Ids are 10 or more characters and owe nothing to the Username. Their Destinations point at the dev server or at `example.com`. Phase 2's seed imports these same files, so they follow the spec's seed contract.
- The dev server answers a Profile-file request from the test fixtures when that file exists there. Every other request is served exactly as Phase 0 left it.
- The page head stops running its own Instagram check. That detection moves into the page script unchanged, so it lives in one place before ticket 09 broadens it. The script still ignores Mode, so the fixtures' Mode fields have no effect until ticket 09.
- The Phase's Playwright spec starts with the observers this ticket needs: the navigation recorder, and stubs that fulfil Reveal and every `example.com` request. For a non-Adult fixture Link, the Reveal stub answers with that Link's own `url` from the fixture file. The other observers (Profile variants, clipboard, screenshot) arrive with the tickets that first use them.

ASSUMPTION: the Phase keeps one Playwright spec, which this ticket adds and every later Phase 1 ticket extends, rather than one spec file per ticket. House precedent: Phase 0's tickets 02–05 all extend one spec, and this Phase's Acceptance runs one file (rung 3). Overturned if plan section 7's "one spec per ticket" must be read literally. Each ticket would then add its own `NN-<slug>` spec and the Acceptance would run them all.

- [ ] `/fixture` and `/fixture_v1` open as Profiles served from the test fixtures. Every real Profile is served as before. The smoke spec stays green unchanged, including its check that juliafilippo_ shows the Escape Overlay in Instagram.
- [ ] Both fixtures parse and hold exactly the Links and Modes listed above. The spec's fixture parse check passes.
- [ ] Every Link Id in both fixtures is at least 10 characters long and does not contain its Profile's Username.
- [ ] Desktop UA, Fixture Profile:
  - no Escape Overlay shows;
  - each non-Adult Link navigates plainly to its Destination, as recorded by the navigation recorder;
  - the Adult Link shows the Age Gate, then reveals through the stub and navigates.
- [ ] Instagram UA: `fixture_v1` shows the Escape Overlay on open with no way to close it, as v1 does today.
- [ ] The page head no longer runs its own In-App Browser check. The overlay still appears only for Instagram User-Agents, as it does today.
- [ ] No test request leaves the machine. The spec fulfils Reveal and every `example.com` request.
- [ ] Playwright: adds `tests/e2e/01-link-modes-and-escape.spec.ts`. `./check.sh` passes.
