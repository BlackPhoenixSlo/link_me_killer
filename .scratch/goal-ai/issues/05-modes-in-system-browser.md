# 05: Each Link travels by its own Mode in a System Browser

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 1, 3, 6, 7, 11, 14, 25, 30, 36, 38, 39, 41, 42
Seams: the public page in Chromium under Playwright, served by the Dev-Server Stand-in, with the desktop Chrome User-Agent; observed through the network fence (Reveal watched with `waitForResponse`, Destinations landing on the fence's empty page) and Profile variants
Blocked by: 04: Age Gate then Reveal on fixture data with no v1 Snapshot in the loop
Status: claimed 20261004T191309Z 2026-10-04T19:47:35Z

**What to build:** The page now reads a default Mode for the Profile and a Mode for each Link from the Profile JSON it already fetches. Each Link's effective Mode is its own Mode if the page recognises it. Otherwise the Link takes the Profile's default if that is recognised, and otherwise Escape Mode. In a System Browser, every Link then travels by its effective Mode:
- A Direct or Escape Mode Link with a non-empty url goes to that url as given, with no Tracking Code, as v1's non-Adult Links do. If its url is absent or empty, it gets its Destination from Reveal at the moment of the Click and goes there.
- A Deeplink Mode Link always gets its Destination from Reveal, even when it carries a url. On a computer it then navigates plainly to Reveal's answer.
- The Adult Link shows the Age Gate, whatever its Mode. "Continue (18+)" reveals, and the page goes to the answer.
- No Escape Overlay shows, whatever the Profile's default Mode.
- `/fixture/{code}` is still cleaned to `/fixture`.

Every new Reveal caller calls Reveal as Phase 0's Page Copy does: Link Id, Username, and a Tracking Code when the Link has tracking on. A failed Reveal is handled as the Page Copy handles it.

This ticket starts the Phase's Playwright spec and the observers every later ticket uses:
- **Fixture read.** The spec reads Link Ids, Modes and the Username from the Fixture Profile the stand-in serves. It fails fast if no Link resolves to one of the three Modes, or if no Link is Adult.
- **Network fence.** localhost passes through. Every other host gets an empty page, so Destinations "land" where the test can assert them and nothing leaves the machine.
- **Profile variants.** The served Profile JSON is changed in flight, with no extra fixture file: a default Mode, a Link's Mode, `url`, `isAdult` or `tracking`, or every Mode stripped.

In-App Browser detection, the Escape Overlay and Escapes are left as the Page Copy has them; they come in 06 onward.

ASSUMPTION: Mode resolution, the Destination rule and the spec's shared observers land first as one System Browser tracer bullet. Every later ticket's tests stand on them, and a System Browser needs no Escape (rung 5). Overturned if the build run wants the spec's observers as a separate prefactoring ticket.

- [ ] The spec takes every Link Id, Mode and the Username from the Fixture Profile the stand-in serves, never from a literal. It fails fast, with a message naming what is missing, if no Link resolves to one of the three Modes or no Link is Adult.
- [ ] Variants with each default Mode (`direct`, `escape_ig`, `deeplink`) show no Escape Overlay.
- [ ] A tap on the Direct Link, or on the Escape Link, lands on its url and makes no Reveal request. With that Link's url absent, and again with it empty (variants), the tap makes a Reveal request and lands on exactly what Reveal answered.
- [ ] A tap on the Deeplink Link makes a Reveal request even though the Link carries a url. It then lands on exactly what Reveal answered.
- [ ] A tap on the Adult Link shows the Age Gate. "Continue (18+)" makes a Reveal request, and the page lands on the answer.
- [ ] `/fixture/{code}` is cleaned to `/fixture`.
- [ ] No request in the spec leaves the machine. The fence answers every host other than localhost.
- [ ] The smoke spec passes unchanged. The v1 Snapshot's own git status stays clean.
- [ ] Any dev server already on port 4173 is stopped first. Then `./check.sh` passes.
- [ ] No dependency, build step or module is added. The page stays one plain script that reads only the Profile JSON and Reveal.
