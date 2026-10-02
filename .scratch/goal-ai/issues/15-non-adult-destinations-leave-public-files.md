# 15: Non-Adult Destinations leave v1's public files, if the Operator rules that ADR 0004 covers them

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: no user story of its own. It carries the Review's D1 (Taps by Mode, the ASSUMPTION that non-Adult Links keep their public `url`).
Seams: v1's HTTP surface as the dev server stand-in serves it (Phase 0's crawl of every published file). The Profile page under Playwright against the dev server. The n8n Form export, checked as a static contract.
Blocked by: 05: No Adult Link carries its Destination in a public file; 08: A Link Shortcut opens its Link with the Tracking Code it arrived with…; 10: Each Link can carry its own Mode…
Status: parked — needs-human: the Operator's ruling on Phase 1 D1 (docs/spec/plan-review.md, `## Needs the human`). Does ADR 0004's "no Destination in any public file" cover v1's non-Adult Links before Cutover? If it does not, are the 6 non-Adult Links that carry an Adult Destination marked Adult, removed, or left as they are?

**What to build:** It depends on the ruling. The page script needs no change under any of them, because a Link without a `url` already goes through Reveal.

- **ADR 0004 covers every Link.** No Profile file carries any Destination, so every Link's Destination is held only on the server and reached through Reveal.
  - The n8n Form stops publishing any Link's `url`. A Link saved through the Form, Adult or not, still reveals its Destination.
  - The 27 Profile files lose every non-Adult `url`. Phase 0's regenerate tool already empties Adult `url`s and already keeps a secrets entry for every non-Adult Link, so running it again does this.
  - Every Link still leads to the same Destination.
- **Non-Adult `url`s stay public, but the 6 Links are dealt with.** The 6 non-Adult Links that Phase 0's tool lists, in jaka5, jaka6q, jaka7q and motherfucker, are marked Adult (gaining the Age Gate) or removed, as the ruling says. No published file then carries an Adult Destination.
- **Non-Adult `url`s stay public and the 6 Links stay as they are.** Nothing to build, and this ticket closes.

ASSUMPTION: the six-hats alternative (keep non-Adult `url`s public, but rule on the 6 Links) sits in this ticket, not in a separate one, because one ruling settles both (rung 5). Overturned if the Operator wants the 6 Links handled apart from the ADR 0004 question.
ASSUMPTION: whether non-Adult `url`s already in git history need purging is left to the same ruling. ADR 0004's line on git history was applied in Phase 0 to secrets.json only (rung 5). Overturned if the ruling extends the purge.

- [ ] Phase 0's crawl of every published file finds no Destination that the ruling puts out of public files. It no longer skips what the ruling removes.
- [ ] Every Link still reveals or opens its BASE Destination, through Reveal wherever its `url` is now empty. Phase 0's "every Link leads where it did" test is adjusted to match.
- [ ] Phase 1's Link Shortcut and Deeplink behaviours still pass with the affected `url`s empty.
- [ ] The n8n Form export publishes no field that the ruling removes. Node names are unchanged.
- [ ] Running Phase 0's regenerate tool again changes nothing. In git's index, each capitalised case twin still matches its lower-case twin.
- [ ] Playwright: extends `tests/e2e/00-security-cleanup.spec.ts` and `tests/e2e/01-link-modes-and-escape.spec.ts`. `./check.sh` passes.
