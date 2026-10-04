# 07: An Escape Mode tap in iOS Instagram escapes to Safari from the tap itself

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 3, 9, 15, 16, 17, 19, 20, 24, 26, 27, 28, 29, 40, 44
Seams: the public page in Chromium under Playwright, served by the Dev-Server Stand-in, with the iOS Instagram User-Agent; observed through the navigation recorder and its same-task mark, the network fence's Reveal watch, the clipboard, Profile variants and the screenshot
Blocked by: 06: The Escape Overlay opens with the page only on an Escape-default Profile in every In-App Browser
Status: claimed 20261004T191309Z 2026-10-04T20:10:48Z

**What to build:** A Visitor in Instagram's In-App Browser on an iPhone taps an Escape Mode Link. The tap itself fires the Escape, with no request before it. It sends the phone to `x-safari-` + the escape target, and the System Browser finishes the Click later.

The escape target is `https://{host}/{username}[/{code}]?link={Link Id}`:
- `{host}` is the host that served the page.
- `{code}` is this visit's path code, or else the stored one: the code the page would pass to Reveal before falling back to the Link's own default.
- It is always https.

In the same handler, the address bar becomes the target's path and query, and the Escape Overlay shows as the fallback with every way out:
- "Open in browser", whose href is the iOS escape link
- "Try another way", on iOS Instagram only: `instagram://extbrowser/?url=` + the encoded target
- the target, shown as text
- "Copy link", which copies the https target
- the app-menu instruction
- "Close", which hides the overlay and puts back the address it replaced

No Reveal happens inside the In-App Browser.

The overlay shown on open (06) gains the same ways out, aimed at the Profile's escape target without `?link=`. It also rewrites the address to that target, so a Tracking Code that came only from storage rides the app's menu route. "Close" puts the address back.

On a platform other than iOS, the escape link is the plan's "anything else" row until 09: no link fires, and "Open in browser" carries the plain https target.

ASSUMPTION: iOS comes first as the Phase's core tracer bullet. Android uses the "anything else" row until 09, which still leaves every manual way out (rung 5). Overturned if Android Escapes must work from this ticket on. Then 09's Android Escape moves here.

Every run saves a screenshot of the iOS Instagram Escape Overlay, opened by an Escape Mode tap, to `.scratch/goal_ai/shots/01-link-modes-and-escape.png`.

The iOS Instagram cases below use a Direct default (variant) unless they say otherwise.

- [ ] From `/fixture/{code}`, a tap on the Escape Link records `x-safari-https://{host}/fixture/{code}?link={Escape Link Id}`, marked as started in the tap's own task. The address becomes `/fixture/{code}?link={Escape Link Id}`.
- [ ] The overlay then shows. "Open in browser" carries that href, "Try another way" carries `instagram://extbrowser/?url=` plus the encoded target, and the target shows as text.
- [ ] No Reveal request is made.
- [ ] "Copy link" puts `https://{host}/fixture/{code}?link={Escape Link Id}` on the clipboard.
- [ ] Tapping "Open in browser", then "Try another way", records each one's href as a navigation.
- [ ] "Close" hides the overlay and puts the address back to `/fixture/{code}`.
- [ ] After an earlier visit to `/fixture/{code}` in the same browser context, a tap on the Escape Link from `/fixture` carries `{code}` in both the recorded target and the address bar.
- [ ] After an earlier visit to `/fixture/{code}` in the same browser context, opening `/fixture` with an `escape_ig` default shows the overlay on open. The address reads `/fixture/{code}`, and "Open in browser" carries `x-safari-https://{host}/fixture/{code}`. "Close" puts the address back to `/fixture`.
- [ ] `.scratch/goal_ai/shots/01-link-modes-and-escape.png` exists and is not empty after every run. Manual: the overlay's copy reads well.
- [ ] 05's and 06's checks still pass. The smoke spec passes. The v1 Snapshot's own git status stays clean.
- [ ] Any dev server already on port 4173 is stopped first. Then `./check.sh` passes.
- [ ] No dependency, build step or module is added. The page stays one plain script that reads only the Profile JSON and Reveal.
