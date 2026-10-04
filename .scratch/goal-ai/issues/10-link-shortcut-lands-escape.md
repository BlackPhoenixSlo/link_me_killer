# 10: The escaped Link opens by itself in the System Browser credited to the same Tracking Code

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 22, 26, 31, 32, 33, 34, 40, 41, 42, 43, 45
Seams: the public page in Chromium under Playwright, served by the Dev-Server Stand-in, with the desktop Chrome and iOS Instagram User-Agents. For the hop, a fresh browser context with a desktop User-Agent (fresh storage, as in a System Browser). Observed through the navigation recorder, the network fence's Reveal watch (`waitForResponse`) and Profile variants. Closed by the spec's Acceptance block
Blocked by: 08: An Adult Escape Mode Link passes the Age Gate then escapes with no Reveal in the app, 09: On Android an Escape opens Chrome or its fallback and a Deeplink Link hands off to its app
Status: claimed 20261004T191309Z 2026-10-04T20:43:42Z

**What to build:** The Link Shortcut is read when the page loads, before the address bar is touched. So `/fixture/{code}?link={Link Id}` keeps both the Tracking Code and the Link Shortcut, and the Link then follows its effective Mode:
- **In a System Browser,** the Link gets its Destination as a tap would. That means Reveal with that code for an Adult Link, a Link with no url and a Deeplink Link, and the url as given otherwise. It then travels by its Mode, with no Age Gate, since v1's Link Shortcut has none. Escape Mode here is Direct Mode. The address is then cleaned to `/fixture`.
- **In an In-App Browser,** a Link Shortcut to an Escape Mode Link shows the Escape Overlay on open, aimed at that Link's escape target, with the address set to the target's path and query. It has "Close". Nothing is revealed and no Escape fires until the Visitor taps.
- **A Link Id that is not on this Profile** is ignored, and the page loads as a plain visit.

This completes the hop. The escape target recorded in the In-App Browser opens in a fresh System Browser and lands where the tap would have, credited to the same Tracking Code, even though storage starts empty there.

This ticket also closes the Phase's automated Acceptance. It adds the real-device matrix to RUN.md as pending manual rows, and 11 runs them:
- a throwaway Profile on v2's first public https deploy, opened as `/{username}/{code}`: Escape Mode as its default, one Direct Link, one Escape Mode Link, one Deeplink Mode Link and one Adult Escape Mode Link with tracking on, each with a harmless Destination;
- one row per cell: an iPhone and an Android phone × the Instagram, Facebook, Threads and TikTok In-App Browsers, plus Safari (iOS) and Chrome (Android), for each Mode, the overlay on open, Chrome disabled on Android, and Deeplink with and without the Destination's app;
- each row has blanks for device, OS version, app version and pass/fail, and the expected result from the spec's Acceptance;
- a note that Phase 1 is not Done until every row passes.

ASSUMPTION: the Phase's whole automated Acceptance block runs on its last offline ticket, as Phase 0's 04 closes Phase 0 (rung 3). Overturned if the build run checks each Phase's Acceptance as a separate step. The block then moves there unchanged.

ASSUMPTION: no RUN.md exists yet (observed: none at the repo root today), so this ticket creates it with a Phase 1 real-device matrix section (rung 5). Overturned if an earlier ticket creates RUN.md. The rows then go under their own heading there.

- [ ] Desktop Chrome: `/fixture/{code}?link={Adult Link Id}`, with tracking on, makes a Reveal request with that id and `{code}` as the Tracking Code, with no Age Gate. The page lands on exactly what Reveal answered.
- [ ] Desktop Chrome: `/fixture/{code}?link={Escape Link Id}` lands where a tap on that Link would.
- [ ] Desktop Chrome: `/fixture?link={an id not on the Profile}` loads the Profile, with no Reveal request and no navigation.
- [ ] iOS Instagram: `/fixture/{code}?link={Escape Link Id}` shows the overlay aimed at that address, with "Close". No Reveal request is made, and nothing `x-safari-` is recorded.
- [ ] The hop: a target recorded from an iOS Instagram tap, with `x-safari-` stripped, opens in a fresh browser context with a desktop User-Agent and lands where a tap on that Link would. For the Adult Link set to Escape Mode with tracking on, that Reveal carries `{code}`.
- [ ] RUN.md lists the real-device matrix rows and the throwaway Profile recipe described above. Every row is pending.
- [ ] The spec's whole Acceptance block exits 0:
  - the v1 Snapshot's own git status is clean, and a failing git fails the block;
  - the Phase's spec passes;
  - `.scratch/goal_ai/shots/01-link-modes-and-escape.png` exists and is not empty;
  - `./check.sh` passes, smoke spec included (any dev server already on port 4173 stopped first).
- [ ] Nothing in the v1 Snapshot, the old repo, Netlify or the n8n Form is touched.
- [ ] No dependency, build step or module is added. The page stays one plain script that reads only the Profile JSON and Reveal.
