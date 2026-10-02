# 08: A Link Shortcut opens its Link with the Tracking Code it arrived with, and In-App Browsers keep the code in the address bar

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 22, 25, 26, 27, 28, 39
Seams: the Profile page under Playwright against the dev server, with desktop and Instagram User-Agents. Observed through the navigation recorder, the Reveal stub's requests and the address bar.
Blocked by: 07: The Fixture Profile and a Mode-less fixture open locally…
Status: ready-for-agent

**What to build:** A Visitor who arrives at `/{username}/{code}?link={Link Id}` gets that Link opened and credited to that Tracking Code. Today the page cleans the code out of the address before it reads the Link Shortcut, so the Shortcut is lost. This is also the address a System Browser lands on after an Escape (ticket 11).

- The page reads the Link Shortcut before it touches the address bar.
- The Shortcut's Link is resolved the way a tap resolves it:
  - a non-Adult Link opens its own `url`;
  - an Adult Link, or a Link without a `url`, goes through Reveal with the code. There is no Age Gate, which is v1's existing Link Shortcut behaviour.
- A Link Id that is not on this Profile is ignored, and the page loads as a plain visit. v1 sends it to Reveal instead.
- In a System Browser the address bar is still cleaned to `/{username}`.
- Inside an In-App Browser the address bar now keeps `/{username}/{code}` and its query. The app's own "Open in browser" menu item then carries the code into the System Browser, which starts with empty storage.

Modes do not exist on the page yet. Outside an In-App Browser every Mode navigates plainly, except Deeplink Mode on Android (ticket 14), so what this ticket does in a System Browser is already the final behaviour. Inside an In-App Browser, ticket 12 changes what a Link Shortcut to an Escape Mode Link does, and ticket 11 adds the Link Shortcut to the address bar on an Escape Mode tap.

ASSUMPTION: keeping the Tracking Code in the address bar inside In-App Browsers ships with the Link Shortcut fix, because both change when the page cleans its address (rung 5). Overturned if it should ship with the overlay on open in ticket 09.

- [ ] Desktop UA: `/fixture/TC` is cleaned to `/fixture`.
- [ ] Desktop UA: `/fixture/TC?link={Adult Link Id}` calls Reveal with that id and `trackingId=TC`, then navigates to the Destination Reveal returned.
- [ ] Desktop UA: `/fixture/TC?link={Escape Mode Link Id}` navigates to that Link's `url` and makes no Reveal request.
- [ ] Desktop UA: `/fixture?link={an id not on the Profile}` loads the Profile with no Reveal request and no navigation.
- [ ] Instagram UA: after the page loads, the address bar still shows `/fixture/TC`.
- [ ] The smoke spec and ticket 07's checks still pass.
- [ ] Playwright: extends `tests/e2e/01-link-modes-and-escape.spec.ts`. `./check.sh` passes.
