# 34: Reveals and Link Shortcuts count as Clicks and Stats read per Link per day per country

Spec: docs/spec/phase-04-stats.md
Covers: user stories 3, 4, 5, 7, 12, 14, 18, 21
Seams: the running v2 stack at Playwright's baseURL through `./check.sh`. Visitors in fresh browser contexts with the country set by 33's helper: `/r/*` intercepted as in 33, Reveal answers awaited with `waitForResponse`, and every navigation to a host other than baseURL fulfilled with the stub page. The `request` fixture for unknown-Id `/r` and Reveal calls and for a foreign-`Origin` Reveal. The Stats Creator in the browser, with `dailyStats` requests watched and the browser clock moved through `page.clock`. A `dailyStats` read with the Stats Creator's token
Blocked by: 33: A Page View and a Click through /r reach the Creator's Stats page, 22: Reveal and /r answer only v2's own origin within a per-client limit
Status: ready-for-agent

**What to build:** Every Destination a Visitor is handed counts once, whichever endpoint hands it out, and the Creator narrows Stats until it reads "Clicks on this Link, per day, from this country" (the plan's Phase 4 DONE).

- **Reveal counts.** Reveal records a Click each time it returns a Destination: an Adult Link after Continue on the Age Gate, a Deeplink Mode Link, and a Link Shortcut that reveals on page load. It records nothing when it answers 404, refuses the origin or rate-limits. From outside it looks the same. For any one Click exactly one of `/r` and Reveal hands out the Destination, so nothing is counted twice.
- **Nothing for broken URLs.** An unknown Link Id on `/r` still gets 404 and records nothing.
- **Link Shortcuts** count through whichever endpoint they already reach: `/r` for a non-Adult Link, Reveal on load for an Adult one. No page change is expected.
- **Range tabs.** Today, 7D (the default) and 30D, in UTC days, each with its date span, computed from the browser's clock. Each tab's `dailyStats` request names its span's first day in its filter, so the page never fetches all history.
- **Filters.** A Link filter (all Links, or each Link) and a Country filter (all, or each country seen in the range) narrow every panel: cards, daily panel and both tables. Page Views belong to the Profile, so under a Link filter they stay Profile-wide, and CTR is that Link's Clicks over them. 36 adds the "Deleted link" choice.
- **Unknown.** `XX` shows as "Unknown" in the Countries table and the Country filter.
- **Empty range.** A range with no rows reads "No Page Views or Clicks in this range yet."

ASSUMPTION: the spec's test 4 is parked with the country source (37), but its first Visitor, with no country header, lands here. That case reads the same under either answer, since a local client has no country either way, and it is the ready half of story 7 (rung 5). 37 adds test 4's other three Visitors. Overturned if the chosen source gives the test stack's own address a country. The case then moves to 37.

ASSUMPTION (the spec's, evidence blocked): a Creator session issued at real time stays valid in a browser whose clock is one day ahead. Overturned by a shorter token lifetime. The test then signs in again after moving the clock.

- [ ] The spec's test 2 passes. Between two reads, an `SI` Visitor clicks the Adult Link and passes the Age Gate, an `SI` Visitor clicks the Direct Mode Link, and a `DE` Visitor clicks the Adult Link and passes the Age Gate. Stats → 7D then shows:
  - no filter: Page Views +3, Clicks +3;
  - Link = Adult Link: Clicks +2, Page Views still +3;
  - Link = Adult Link and Country = `SI`: Page Views +2, and Clicks +1 on the card and in today's daily row. The Links table lists only the Adult Link (+1), and the Countries table only `SI` (Page Views +2, Clicks +1).
- [ ] Every CTR shown in test 2 equals Clicks ÷ Page Views as displayed.
- [ ] Read with the Stats Creator's token, `dailyStats` holds exactly one row for (Direct Mode Link, `SI`, today), and its Clicks rose by 1 across test 2.
- [ ] The spec's test 3 passes: a Direct Mode Link Shortcut lands on the stub through `/r`, and an Adult Link Shortcut lands on the stub through Reveal after the Age Gate if it shows. `GET /r/{unknown Id}` and a Reveal for an unknown Link Id answer 404, and a foreign-`Origin` Reveal for the Adult Link is refused. Clicks rise by exactly 2, one on each Link's row.
- [ ] A Visitor with no country header loads the Stats Profile. The Countries table shows "Unknown" +1, and `US` gains nothing.
- [ ] The spec's test 5 passes. Today, 7D and 30D show 1, 7 and 30 UTC days ending today, and each tab's `dailyStats` request names today, today − 6 or today − 29 in its filter. With the browser clock moved one day ahead and the server's clock untouched:
  - Today reads "No Page Views or Clicks in this range yet.";
  - 7D and 30D each list the real today's date, with the Page Views and Clicks the Today tab showed before the move.
- [ ] No Stats test requests the events collection.
- [ ] `./check.sh` passes.
