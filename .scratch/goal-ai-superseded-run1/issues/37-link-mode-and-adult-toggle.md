# 37: A Link's Mode and 18+ toggle, set in the Editor, act on the public Profile as an imported Link's do

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 32, 33, 47
Seams: Creator journeys in Playwright's browser at a phone-sized viewport. The Visitor side in a fresh browser context with no Editor session, reading the Profile's page payload and Reveal's real answer, with the navigation intercepted as in `00-smoke.spec.ts`.
Blocked by: 36: In the Editor a Creator adds, edits, reorders and deletes their Links… (the Link form in the Editor); 28: Phase 1's spec passes against v2 on the seeded Fixture Profile (each Mode and the Age Gate already act on v2's public page); 20: A Click on v2 ends at the same Destination as on v1… (Reveal on v2)
Status: ready-for-agent

**What to build:** The Link form gains two controls. The Editor only writes their values; the public page already acts on them.

- **Mode.** The choices are "Profile default (currently …)", Direct, Escape and Deeplink. A new Link starts on "Profile default", which stores no Mode, so the Link follows whatever the Profile's default Mode is. The others store `direct`, `escape_ig` and `deeplink` (ADR 0003).
- **18+.** The link.me Template's "Age Gate" row moves into the Link form as a toggle. It is independent of the Mode, so an Adult Link can be in any Mode.

- [ ] A new Link's form starts on "Profile default", naming the Profile's current default Mode.
- [ ] Spec behaviour 2, the Adult part. The Creator saves a Link with Adult on and Escape Mode. Then, in a fresh browser context on the public Profile:
  - the Link's entry in the page payload carries `escape_ig` and Adult;
  - the Destination appears nowhere in the page's HTML or its network responses before the tap;
  - tapping the Link shows the Age Gate;
  - "Continue (18+)" calls Reveal, whose real answer begins with the Destination entered.
- [ ] Saving the Link as Direct, as Deeplink and back on "Profile default" shows in the page payload at the next load as `direct`, `deeplink` and no Mode.
- [ ] Turning Adult off removes the Age Gate at the next load and leaves the Mode as it was.
- [ ] Playwright: extends `tests/e2e/03-auth-and-editor.spec.ts`. `./check.sh` passes.
