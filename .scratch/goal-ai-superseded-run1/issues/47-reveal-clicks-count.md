# 47: Passing the Age Gate and opening a Link Shortcut each count as one Click through Reveal, and unknown Link Ids count nothing

Spec: docs/spec/phase-04-stats.md
Covers: user stories 3, 4, 5
Seams: as ticket 46, with Visitors as fresh browser contexts with `x-country` set, and navigation to other hosts stubbed. Playwright `request` sends a `/r` call and a Reveal call with an unknown Link Id. Each Visitor action waits for its Reveal or `/r` response before Stats is read.
Blocked by: 46: A Click through `/r` counts… (the Click call, the Clicks card and the Links table); 20: A Click on v2 ends at the same Destination as on v1… (Reveal at v1's path, and the Link Shortcut's Reveal on load); 21: Reveal answers only its own origin… (the refusals and the limit, which hand out nothing)
Status: ready-for-agent

**What to build:** A Creator's OnlyFans Link, usually an Adult Link, reaches its Destination through Reveal rather than `/r`. Those Clicks now count too.

- Reveal looks the same from outside. It records one Click for the Link each time it returns a Destination. It records nothing when it answers 404, refuses the origin, or is rate-limited.
- For any one Click, exactly one of `/r` and Reveal hands out the Destination, so no Click is counted twice.
- A closed Age Gate hands out nothing and counts nothing.
- The seed gives the Stats Profile its Adult Link. The Link has Tracking on, no Geo Rule and no default Tracking Code. Tracking on is what lets ticket 51's test fail.
- The Stats page needs no change. The Adult Link gets its row in the Links table.

- [ ] Spec test 2, unfiltered part. Between the two reads, three Visitors act:
  - `SI` clicks the Adult Link and passes the Age Gate;
  - `SI` clicks the Direct Mode Link;
  - `DE` clicks the Adult Link and passes the Age Gate.

  Stats → 7D then shows Page Views +3 and Clicks +3. The Adult Link's row shows +2 Clicks, and the Direct Mode Link's row +1. Every CTR shown equals Clicks ÷ Page Views as displayed.
- [ ] Spec test 3. Between the two reads:
  - a Visitor opens the Stats Profile with `?link={its Direct Mode Link's Id}` and lands on the stub;
  - `GET /r/{an unknown Id}` answers 404;
  - a Reveal for an unknown Link Id answers 404.

  Clicks rise by exactly 1, all of it on the Direct Mode Link's row.
- [ ] The page requested nothing from the `events` collection.
- [ ] Playwright: extends `tests/e2e/04-stats.spec.ts` (test 2's unfiltered part, and test 3). `./check.sh` passes.
