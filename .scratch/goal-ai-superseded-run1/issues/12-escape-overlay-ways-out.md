# 12: The Escape Overlay offers every way out: "Open in browser", "Try another way" and "Copy link"

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 18, 20, 24, 27, 35, 36
Seams: the Profile page under Playwright against the dev server, with iOS Instagram and iOS Facebook (FBAN) User-Agents. Observed through the navigation recorder, the Reveal stub's requests, the overlay links' `href`, a granted clipboard and a screenshot.
Blocked by: 11: An Escape Mode tap fires the Escape from the Visitor's own tap…
Status: ready-for-agent

**What to build:** When an Escape is blocked, the Visitor can always get out by hand.

- **Controls.** Every Escape Overlay offers the same controls, whether it shows on open, after an Escape Mode tap, or for a Link Shortcut:
  - the app-menu instruction;
  - a link "Open in browser" that carries the platform's Escape link;
  - the escape target, shown as text;
  - a "Copy link" button that copies the https escape target.
- **"Try another way".** On iOS Instagram only, a second link uses Instagram's own open-in-browser link. Other apps don't get it, because it would switch their Visitors into the Instagram app.
- **The target.** It carries a Link Shortcut only when a Link tap or a Link Shortcut caused the overlay. On open, it is the Profile with its Tracking Code.
- **A Link Shortcut to an Escape Mode Link, inside an In-App Browser.**
  - The Escape Overlay shows, aimed at the current URL, with Close.
  - No Reveal happens, and no Escape fires until the Visitor taps.

A screenshot of the iOS Instagram Escape Overlay is saved to the effort's shots folder, so the Operator can see the result without running anything.

RUN.md gains the Escape Mode rows for iOS and Android × Instagram, Facebook, Threads and TikTok. In each, the Visitor should land in the System Browser on `/{username}/{code}?link=…`, the Link opens there, and the final OnlyFans address ends in `/c{code}`. When the Escape does not land, the overlay's menu instruction (whose address now carries the Link Shortcut) and "Copy link" still get the Visitor out.

- [ ] iOS Instagram UA, after tapping the Escape Mode Link from `/fixture/TC`:
  - "Open in browser" carries the recorded `x-safari` target;
  - "Try another way" carries `instagram://extbrowser/?url=` plus the encoded escape target;
  - the escape target shows as text;
  - "Copy link" puts the https escape target on the clipboard.
- [ ] iOS Instagram UA: `/fixture/TC?link={Escape Mode Link Id}` shows the overlay aimed at that URL, with Close. No Reveal request is made, and no `x-safari` navigation is recorded.
- [ ] iOS Instagram UA, the overlay on open of `fixture_v1/TC`:
  - "Open in browser" is aimed at `/fixture_v1/TC`, with no Link Shortcut;
  - there is no Close.
- [ ] iOS UA in Facebook's In-App Browser: the overlay has no "Try another way".
- [ ] Every control is reachable by the role and name in the spec's Interfaces list. The heading "Open in System Browser" is kept, so the smoke spec stays valid.
- [ ] The screenshot exists, is not empty, and sits at the path the spec's Acceptance checks.
- [ ] RUN.md holds the Escape Mode rows, every cell still unmarked.
- [ ] Playwright: extends `tests/e2e/01-link-modes-and-escape.spec.ts`. `./check.sh` passes.
