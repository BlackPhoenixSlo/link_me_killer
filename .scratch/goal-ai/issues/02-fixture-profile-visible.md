# 02: A Visitor sees the Fixture Profile at /fixture in a hermetic loop

Spec: docs/spec/phase-00-new-repo-ground.md
Covers: user stories 8, 9, 10, 11, 14, 15, 18, 19, 20, 21, 22, 23, 25
Seams: the Dev-Server Stand-in's HTTP surface at baseURL, driven by Playwright's `page` (smoke tests 1–3 and the Age Gate step of test 4); the fixture's shape through the spec's Acceptance fixture check
Blocked by: 01: The test loop serves the Page Copy
Status: done

**What to build:** A test-only Fixture Profile with the Username `fixture` lives in the fixtures. It uses the v1 Snapshot's Profile file format and directory layout. Its shape follows `juliafilippo_`: display name "Fixture Profile", avatar, verified badge, bio, a default Mode (Escape Mode), and ordered Links that each carry an icon, an Adult flag, a tracking flag and a Geo Rule field (null for non-Adult Links); only the Adult Link carries a background image, as the spec's Contracts example shows. The Mode values are plan D3's.

It has four Links, in this order:
- "Adult Link": the Adult Link, in Escape Mode, with tracking on and a Geo Rule. Its public url is empty.
- "Direct Link": in Direct Mode.
- "Escape Link": in Escape Mode.
- "Deeplink Link": in Deeplink Mode.

Each non-Adult Link has a public url on `example.com`. Every Link Id is random, fixed in the file, at least 10 letters and digits long, and does not contain the Username. All images are stock icons. No photo is used.

The stand-in now answers Profile requests from the fixtures, not from the v1 Snapshot. The smoke spec is rewritten onto `/fixture`:
- A Visitor sees the display name and the four Link cards.
- Inside Instagram (fake User-Agent), the Escape Overlay shows. In an ordinary browser, it does not.
- Tapping the Adult Link brings up the Age Gate.

The first test leaves a phone-sized screenshot for the Operator. From this ticket on, the browser aborts every request to a host other than the stand-in's. As a result, Font Awesome glyphs and the verified badge are missing from the screenshot. The spec names no v1 Profile and no v1 Link Id. It finds Link cards by their visible title.

ASSUMPTION: the old test that tapped `juliafilippo_`'s Adult Link moves to the fixture but stops at the Age Gate until 04 brings the Reveal Stand-in. In this ticket the stand-in's Reveal is still v1's, which knows no fixture Link Id, so no test presses "Continue (18+)". (Rung 5: no throwaway Reveal mock.) Overturned if the Age Gate-then-Reveal path must stay covered between tickets. Then this ticket also fulfils the Reveal inside the test until 04.

ASSUMPTION: the guard that aborts off-machine requests lands with the first fixture-based test, not with the Reveal in 04, so no fixture test ever runs unguarded (rung 5). Overturned if test-time CDN requests are acceptable, which is the spec's own overturn condition for blocking. Then only `example.com` needs blocking, and only from 04.

- [ ] `/fixture` shows "Fixture Profile" and four Link cards titled "Adult Link", "Direct Link", "Escape Link" and "Deeplink Link".
- [ ] With an Instagram User-Agent, the Escape Overlay ("Open in System Browser") is visible on `/fixture`. With the default desktop User-Agent, it is hidden.
- [ ] Tapping "Adult Link" shows the Age Gate ("Mature Content Disclaimer").
- [ ] Throughout the smoke spec, every request to a host other than the stand-in's is aborted.
- [ ] Every run writes a full-page 390×844 screenshot of `/fixture` to `.scratch/goal_ai/shots/00-smoke.png`, and the file is not empty. Manual check: it looks like v1's `juliafilippo_` page with stock icons, minus Font Awesome glyphs and the verified badge.
- [ ] The spec's Acceptance fixture check passes in every assertion that does not read the Test Secrets (03 adds those). That covers: the Username, the default Mode, the non-Adult Links' Modes, a single Adult Link with tracking and a Geo Rule, every Mode being a D3 value, and every Link Id's form.
- [ ] The smoke spec asserts only on Fixture Profile data. The spec's leak scan reports nothing, so no v1 Link Id is left in the tests.
- [ ] Any dev server already on port 4173 is stopped first. Then `./check.sh` passes.
- [ ] No dependency is added. The Playwright config, `check.sh` and `package.json` are unchanged.
