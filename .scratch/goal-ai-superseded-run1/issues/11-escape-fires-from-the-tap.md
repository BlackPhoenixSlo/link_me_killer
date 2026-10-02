# 11: An Escape Mode tap fires the Escape from the Visitor's own tap, carrying the Tracking Code and a Link Shortcut

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 10, 16, 17, 21, 22, 23, 24, 25, 32
Seams: the Profile page under Playwright against the dev server, with iOS Instagram, iOS Safari and desktop User-Agents. Observed through the navigation recorder, the Reveal stub's requests, the address bar and a Tracking Code placed in storage before load.
Blocked by: 08: A Link Shortcut opens its Link with the Tracking Code it arrived with…; 10: Each Link can carry its own Mode…
Status: ready-for-agent

**What to build:** In an In-App Browser, tapping an Escape Mode Link sends the Visitor to this same Profile in the System Browser, straight from the tap. The page makes no request before the Escape, so the app still treats it as the Visitor's own action.

- **Escape target.** This Profile's address on the host that served it, always https. It carries:
  - the Tracking Code the page would pass to Reveal: this visit's path code, otherwise the stored one;
  - a Link Shortcut to the tapped Link.

  In the System Browser, ticket 08's Link Shortcut then opens the Link, credited to that code.
- **Escape link.**
  - On iOS the Escape uses the `x-safari-` link that v1 already uses.
  - Every other In-App Browser goes to the escape target itself. Ticket 13 gives Android its own link.
- **Address bar.** The same tap replaces the address with the escape target's path and query. The app's own "Open in browser" menu item then carries the Link Shortcut, and also a code that came only from storage.
- **Fallback overlay.** The Escape Overlay shows straight after the tap. An overlay opened by a tap always has Close, which hides the overlay and puts back the address the page had before the tap. Ticket 12 adds the overlay's other ways out.
- **Adult Escape Mode Links.** The Age Gate shows first, and "Continue (18+)" is the tap that escapes.
- **No Reveal in an In-App Browser.** An Escape Mode Link's Destination is fetched only in the System Browser, where the Visitor ends up.
- **Outside an In-App Browser**, Escape Mode behaves as Direct Mode.

ASSUMPTION: until ticket 13, an Android In-App Browser escapes to the plain escape target, the spec's "anything else" row, rather than to Chrome (rung 5). Overturned if Android's Chrome link must ship in this ticket, in which case ticket 13 merges into this one.

- [ ] iOS Instagram UA, from `/fixture/TC`, tapping the Escape Mode Link:
  - records `x-safari-https://{host}/fixture/TC?link={id}`, where `{host}` is the host that served the page;
  - changes the address bar to `/fixture/TC?link={id}`;
  - shows the overlay with Close, and Close hides it and puts the address back to `/fixture/TC`.
- [ ] iOS Instagram UA, from `/fixture` with a code already in storage: the tap puts that code into both the recorded target and the address bar.
- [ ] iOS Instagram UA, the Adult Escape Mode Link:
  - the Age Gate shows first;
  - "Continue (18+)" records the `x-safari` Escape;
  - no Reveal request is made at any point.
- [ ] iOS Instagram UA: the address bar keeps `/fixture/TC` until a Link is tapped.
- [ ] iOS Safari UA: no overlay shows, and the Escape Mode Link navigates plainly.
- [ ] Desktop UA: the Escape Mode Link navigates plainly.
- [ ] Earlier behaviours still pass: Direct Mode taps, the overlay on open, and Link Shortcuts in a System Browser.
- [ ] Playwright: extends `tests/e2e/01-link-modes-and-escape.spec.ts`. `./check.sh` passes.
