# 48: Today, 7D and 30D tabs and the Link and country filters narrow every Stats panel, and an empty range says so

Spec: docs/spec/phase-04-stats.md
Covers: user stories 14, 18, 21
Seams: as ticket 47, the Playwright loop against the compose stack, with Stats read before and after. In addition, `page.clock` sets the Stats Creator's browser clock eight days ahead. The server's clock is untouched, so the session stays valid.
Blocked by: 47: Passing the Age Gate and opening a Link Shortcut each count as one Click through Reveal… (the Adult Link and the Reveal Clicks that test 2's traffic needs); 46: A Click through `/r` counts… (the cards, the daily panel and both tables that the filters narrow)
Status: ready-for-agent

**What to build:** The Creator can choose a period and narrow every panel to one Link, one country, or both. So "Clicks on this Link, per day, from this country" can be read directly, which is the plan's Phase 4 DONE.

- **Range tabs.** Today, 7D (the default) and 30D, in UTC days, with the date span shown. The browser computes the range from its own clock. The tabs follow the link.me Template's Overview tabs.
- **Filters.** Link offers all Links or each Link. Country offers all countries or each country seen in the range. Both filters apply to every panel: the cards, the daily panel and both tables. Ticket 52 adds a "Deleted link" option to the Link filter.
- **CTR under a Link filter.** Page Views stay Profile-wide, and CTR is that Link's Clicks over them.
- **Empty range.** A range with no rows reads "No Page Views or Clicks in this range yet."
- The numbers are as of page load. There is no auto-refresh.

- [ ] Spec test 2, filtered part. After the same three Visitors as in ticket 47, Stats → 7D shows:
  - Link = Adult Link: Clicks +2, and Page Views still +3;
  - Link = Adult Link and Country = `SI`: Page Views +2, and Clicks +1, both on the card and in today's daily row.

  Every CTR shown equals Clicks ÷ Page Views as displayed.
- [ ] Spec test 5. The Stats Creator reads the Today tab, then reopens Stats with the browser clock set eight days ahead.
  - Today and 7D read "No Page Views or Clicks in this range yet."
  - 30D lists the real today's date, with the Page Views and Clicks that the Today tab showed.
- [ ] The page requested nothing from the `events` collection.
- [ ] Playwright: extends `tests/e2e/04-stats.spec.ts` (test 2's filters, and test 5). `./check.sh` passes.
