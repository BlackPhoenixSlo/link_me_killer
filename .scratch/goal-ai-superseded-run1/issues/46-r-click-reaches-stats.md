# 46: A Click through `/r` counts, and Stats shows Clicks and CTR on its cards, per day, per Link and per country

Spec: docs/spec/phase-04-stats.md
Covers: user stories 2, 14, 15, 16, 17
Seams: as ticket 45, the Playwright loop against the compose stack, with Stats read before and after. In addition, `page.route` answers every navigation to a host other than baseURL with a stub, so no Click leaves the machine. The test waits for the `/r` response before reading Stats.
Blocked by: 45: A Profile load counts as one Page View… (the Recorder, the migration, the Stats page and the seed); 20: A Click on v2 ends at the same Destination as on v1… (`/r` and its Destination resolver)
Status: ready-for-agent

**What to build:** A Visitor taps the Stats Profile's Direct Mode Link. The tap goes through `/r/{Link Id}` and reaches the Destination. That Click is now an Event, and the Creator sees it next to the Page View it came from.

- `/r` looks the same from outside. Once the Link resolves, the Event Recorder records a Click, with the Profile, the Link and the Visitor's country, before the redirect goes out. An unknown Link Id still gets 404 and records nothing.
- Every Destination that `/r` hands out is one Click, whatever the Link's Mode, and double taps count.
- The Stats page gains:
  - the Clicks card and the CTR card, beside Page Views;
  - Clicks beside Page Views for each day in the daily panel;
  - the Links table: Link, Clicks and CTR, most-clicked first;
  - Clicks and CTR columns in the Countries table.
- **CTR** is Clicks ÷ Page Views for the same range, shown as a percentage with one decimal, or "—" when there are no Page Views. Page Views belong to the Profile, not to a Link, so a Link's CTR is its Clicks over the Profile's Page Views.

- [ ] Spec test 1, whole. A Visitor with country `SI` loads the Stats Profile, clicks its Direct Mode Link and lands on the stub. Signed in as the Stats Creator, Stats → 7D shows +1 in each of:
  - the Page Views card and the Clicks card;
  - today's daily row;
  - that Link's row;
  - the `SI` country row.

  The CTR text equals Clicks ÷ Page Views as displayed.
- [ ] The `perPage`-to-1 reload reads the same cards and both tables as before.
- [ ] Test 1 saves a screenshot to `.scratch/goal_ai/shots/04-stats.png`, and `test -s` finds it.
- [ ] The page requested nothing from the `events` collection.
- [ ] Playwright: extends `tests/e2e/04-stats.spec.ts` (test 1 completed). `./check.sh` passes.
