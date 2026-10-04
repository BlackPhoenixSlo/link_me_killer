# 06: The Escape Overlay opens with the page only on an Escape-default Profile in every In-App Browser

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 25, 27, 30, 36, 43
Seams: the public page in Chromium under Playwright, served by the Dev-Server Stand-in, with fake User-Agents per `test.describe`: iOS Instagram; Instagram, FBAN and TikTok (parametrised); iOS Safari; Android Chrome. Observed through the navigation recorder (the destination of every navigation), the network fence's Reveal watch and Profile variants
Blocked by: 05: Each Link travels by its own Mode in a System Browser
Status: claimed 20261004T191309Z 2026-10-04T19:58:33Z

**What to build:** The page recognises an In-App Browser by the plan's pattern, used verbatim and case-insensitive: `Instagram|FBAN|FBAV|Threads|musical_ly|Bytedance|TikTok`. It tells iOS from Android as v1 does. Detection lives in the script alone, so the Instagram-only check in the page head goes.

When the page opens, the Escape Overlay shows only if the visit is in an In-App Browser and the Profile's default Mode resolves to Escape Mode. A missing or unrecognised default counts as Escape Mode. The overlay blocks scrolling.
- If the Profile holds any Link that does not resolve to Escape Mode, the overlay has "Close". Close hides it and releases the scroll lock, and the Visitor can then use the Profile's other Links in place.
- If every Link escapes, the overlay has no "Close", as v1's has none. That covers every untouched v1 Profile.

The overlay's copy becomes app-neutral: "this app" where v1 says "Instagram", and no brand icon. It keeps the heading "Open in System Browser", the overlay's element id and the app-menu instruction (tap the ··· menu, then "Open in external browser" / "Open in system browser").

Inside an In-App Browser, Direct and Deeplink Mode Links now work in place, and nothing `x-safari-` is fired for them:
- A Direct Mode Link navigates plainly. An Adult Direct Link passes the Age Gate, reveals, then navigates plainly.
- A Deeplink Mode Link reveals, then navigates plainly to the answer.

In an In-App Browser, the address keeps `/fixture/{code}` and its query, so the app's own "Open in browser" menu item carries the Tracking Code. In a System Browser it is still cleaned to `/fixture`.

Until 07 and 08, an Escape Mode tap inside an In-App Browser still travels as Phase 0's Page Copy sends it.

ASSUMPTION: in this ticket the overlay shown on open keeps v1's controls and gains only "Close". Its other ways out ("Open in browser", "Try another way", the address shown as text, "Copy link") and the address rewrite arrive with 07, which builds the escape target they all share (rung 5). Overturned if the build run wants the overlay in its final form from its first ticket on. Then 06 and 07 merge.

- [ ] With Instagram, FBAN and TikTok User-Agents (parametrised), a variant with every `mode` stripped shows the overlay on open at `/fixture/{code}`, with no "Close".
- [ ] With iOS Safari and Android Chrome User-Agents, no overlay shows, and a tap on the Escape Link navigates plainly.
- [ ] iOS Instagram, Direct default (variant): no overlay shows on open, and `/fixture/{code}` keeps that address until a Link is tapped. A tap on the Direct Link navigates plainly, and nothing `x-safari-` is recorded.
- [ ] iOS Instagram, a default of `escape_ig`, or an unrecognised default, on a Profile that still holds the Direct and Deeplink Links: the overlay shows on open, with "Close". After "Close", a tap on the Direct Link navigates plainly.
- [ ] iOS Instagram, every Link set to Escape Mode with an `escape_ig` default: the overlay shows on open, with no "Close".
- [ ] iOS Instagram, a default of `deeplink`: no overlay shows on open.
- [ ] iOS Instagram, Direct default: a Link given an unrecognised Mode navigates plainly, and nothing `x-safari-` is recorded.
- [ ] iOS Instagram: a Link with its `mode` removed follows the Profile's default. Under `direct` it navigates plainly with nothing `x-safari-` recorded. Under `deeplink` it makes a Reveal request.
- [ ] iOS Instagram: a tap on the Deeplink Link makes a Reveal request, then navigates plainly to the answer.
- [ ] iOS Instagram: the Adult Link set to Direct shows the Age Gate. "Continue (18+)" reveals and navigates plainly, and nothing `x-safari-` is recorded.
- [ ] The smoke spec passes, and its Instagram case still finds the overlay by its heading. If that case's Profile is no longer Escape-default, only that case changes, to serve an Escape-default variant (spec, Further Notes).
- [ ] 05's checks still pass. The v1 Snapshot's own git status stays clean.
- [ ] Any dev server already on port 4173 is stopped first. Then `./check.sh` passes.
- [ ] No dependency, build step or module is added. The page stays one plain script that reads only the Profile JSON and Reveal.
