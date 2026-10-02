# 10: Each Link can carry its own Mode, and Direct Mode Links open in place

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 1, 3, 5, 7, 8, 9, 10, 15, 33, 36, 37, 38
Seams: the Profile page under Playwright against the dev server, with iOS Instagram, Instagram, FBAN, TikTok and desktop User-Agents. Observed through the navigation recorder, the Reveal stub and Profile variants. The n8n Form export is checked as a static contract by the spec's `jq` checks.
Blocked by: 09: The Profile's default Mode decides whether the Escape Overlay shows on open…
Status: ready-for-agent

**What to build:** The Operator can give any Link a Mode of its own, and a Direct Mode Link opens right where the Visitor is.

**In the n8n Form:**
- The per-link step offers the same three-way radio. It opens on the Link's own Mode, or on the Profile's if the Link has none.
- A Link left on the Profile's Mode is saved without a Mode of its own, so it keeps following the default when that changes later. Picking the Profile's Mode returns an overridden Link to inheritance.
- A Link's Mode survives the step that strips the Destination from Adult Links, so the published Profile file carries it.

**On the page:**
- A Link's own Mode overrides the Profile's default. A Mode the page does not recognise counts as missing.
- A Direct Mode Link opens its Destination in place, in any browser.
- An Adult Direct Mode Link still shows the Age Gate, then reveals and opens in place. v1's habit of escaping every Adult Link in Instagram stops for Direct Mode.
- A Deeplink Mode Link opens its Destination plainly for now. Ticket 14 adds Android's hand-off.
- On an Escape-default Profile that also holds a Direct or Deeplink Link, the overlay on open gains a Close button, so those Links stay reachable. The overlay on open stays uncloseable only when every Link would escape anyway, as on v1.

**The real-device matrix begins.** RUN.md is created if it is absent. It gets the matrix's columns (device, OS version, app version, one pass/fail per cell) and the Direct Mode rows: iOS and Android × Instagram, Facebook, Threads and TikTok In-App Browsers, plus Safari and Chrome. The Operator runs them in ticket 16.

ASSUMPTION: until ticket 14, a Deeplink Mode Link navigates as a Direct Mode Link does. That is already its final behaviour on iOS and computers (spec, Deeplink link), so only Android changes later (rung 5). Overturned if Deeplink Mode must not ship in a half-built state, in which case ticket 14 merges into this one.
ASSUMPTION: each Mode ticket writes its own RUN.md rows (Direct here, Escape in 12, Android Escape in 13, Deeplink in 14), so each row lands with the behaviour it checks (rung 5). Overturned if RUN.md should be written once, by the last agent ticket.

- [ ] n8n Form export:
  - the per-link step has exactly one radio, offering `direct`, `escape_ig` and `deeplink`;
  - the radio's default value reads the Link's existing Mode, otherwise the Profile's;
  - the link JSON builder writes a Link's Mode only when it differs from the Mode picked at the profile step of the same submission;
  - the public-link field set passes Mode through.

  The spec's Acceptance `jq` checks for the per-link step's radio and default, the link JSON builder and the public-link field set pass. Together with ticket 09, all eight n8n checks pass. Node names are unchanged.
- [ ] iOS Instagram UA: the inheriting Link navigates plainly to its Destination, and no `x-safari` navigation is recorded.
- [ ] Variant where the inheriting Link has an unrecognised Mode: it navigates plainly, with no `x-safari` navigation.
- [ ] Variants with an Escape default, and with an unrecognised default:
  - the overlay shows on open with Close, because the Deeplink Link does not escape;
  - after Close, the Deeplink Link navigates plainly.
- [ ] Variant where the Adult Link is in Direct Mode: it shows the Age Gate, and "Continue (18+)" reveals and navigates plainly, with no `x-safari` navigation.
- [ ] Instagram, FBAN and TikTok UAs: the overlay on open of `fixture_v1` still has no Close.
- [ ] Desktop UA:
  - the inheriting Link, the Escape Mode Link and the Deeplink Link each navigate plainly;
  - the Adult Link shows the Age Gate, then reveals and navigates.
- [ ] RUN.md holds the matrix columns and the Direct Mode rows, every cell still unmarked.
- [ ] Playwright: extends `tests/e2e/01-link-modes-and-escape.spec.ts`. `./check.sh` passes.
