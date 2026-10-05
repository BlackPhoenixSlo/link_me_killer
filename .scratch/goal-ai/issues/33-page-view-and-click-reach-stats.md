# 33: A Page View and a Click through /r reach the Creator's Stats page

Spec: docs/spec/phase-04-stats.md
Covers: user stories 1, 2, 6, 8, 9, 11, 12, 13, 15, 16, 17, 19, 22, 34
Seams: the running v2 stack at Playwright's baseURL through `./check.sh`. Visitors in fresh browser contexts, with the country set through a request header and fake User-Agents where needed; `/r/*` intercepted with `page.route`, sent on with `route.fetch({ maxRedirects: 0 })`, and fulfilled with a local stub page. The Stats Creator in the browser at 390×844, with every `dailyStats` request watched through `page.route`. Operator reads of Events at PocketBase's loopback port, as a superuser
Blocked by: 01: The test loop serves the Page Copy, 10: The escaped Link opens by itself in the System Browser credited to the same Tracking Code, 18: Every Click on a v1 Link ends at v1's Destination for the same Tracking Code and Visitor location, 20: A PocketBase admin edit shows on the next page load while PocketBase's API stays closed, 27: A Creator changes their Profile in the Editor and its default Mode reaches the page, 29: Log-in lands a Creator where they left off and a handed-over Profile opens in the Editor
Status: claimed 20261005T084628Z 2026-10-05T11:40:06Z

**What to build:** The Phase's first path through every layer. A Visitor loads a Profile and follows a Direct Mode Link. Its Creator signs in, opens Stats next to the Editor, and sees one more Page View and one more Click.

- **Seed.** Phase 2's seed gains the spec's two Creators, the Stats Creator and the Other Creator. Each has a known test password in the test stack's environment and one Profile: the Stats Profile and the Other Profile. Each Profile keeps the default Profile Mode and has a Direct Mode Link and an Adult Link with no Mode of its own. The Adult Link has Tracking on, no Geo Rule and no default Tracking Code. Every Destination is on a `.test` host. Both Creators are seeded verified, with a display name and Links, so log-in lands them in the Editor (29's landing rule). Only this Phase's spec visits these two Profiles.
- **Events and their daily sums.** One additive migration:
  - gives Phase 2's events collection the spec's fields, adding each one that is missing and keeping any field 20 already defined: kind (Page View or Click), Profile (required, deleted with its Profile), Link (optional, cleared when the Link is deleted), country, In-App Browser and created time;
  - keeps every events rule superuser-only;
  - adds the index on Profile and created time;
  - adds the `dailyStats` view: one row per Profile, Link, country and UTC day, holding Page Views and Clicks. Its list and view rule is the spec's owner-only rule, which starts with "signed in";
  - renames, retypes or drops nothing Phase 2 defined.
- **Event Recorder.** The app records a Page View or a Click, one Event per call, through its privileged PocketBase access. It stores nothing beyond the fields above: no IP address, User-Agent string, referrer or Visitor identifier.
  - Country: one function gives the request's country, uppercased. Anything that is not two letters A–Z, or no value at all, records `XX`. The recorder never falls back to US and never calls Phase 2's Visitor location lookup.
  - In-App Browser: the spec's User-Agent patterns, first match wins, with Threads checked before Instagram. Anything else records empty.
- **Page View Ping.** `POST /v/{username}` records a Page View and answers 204. An unknown Username gets 404 and records nothing. A GET under `/v/` still reaches the Profile route as before, so no Username is reserved. The public page script, v2's own copy, sends the ping once per page load, after the Profile has rendered, with `fetch` and `keepalive`. It never pings for an unknown Username.
- **`/r` counts.** Once the Link resolves, `/r` records a Click and then redirects. From outside it looks the same.
- **Stats page.** It lives in the creator-only area, so it adds no top-level path and reserves no new Username. A "Stats" entry sits next to the Editor in its navigation, and a signed-out Creator is sent to log-in as the Editor does. The page reaches PocketBase through the same-origin proxy, whose allow-list gains `dailyStats`; events stays off it. It lists the 7D range's `dailyStats` rows, 500 to a page, requesting pages until it has every row, with no Profile filter. Link names come from the Creator's own Links, read the way the Editor reads them. Mobile-first, after the link.me Template's analytics page, with no chart library:
  - the 7D range in UTC days, with its date span shown, computed from the browser's clock;
  - Page Views, Clicks and CTR cards;
  - a daily panel of Page Views and Clicks per day, as bars with numbers;
  - a Links table (Link, Clicks, CTR, most-clicked first);
  - a Countries table (two-letter country, Page Views, Clicks, CTR, most Page Views first);
  - CTR as Clicks ÷ Page Views with one decimal, "—" when there are no Page Views, shown as computed even above 100%;
  - every number under an accessible label, so a spec reads it by role. Numbers are as of page load.
- **The Phase 4 spec** is born here. It runs serially, counts by delta, and runs before 22's Reveal-guard project, so the guard's window never refuses its traffic. Every test that opens Stats asserts that the page requested nothing from events.

ASSUMPTION: local tests set the Visitor's country through the `CF-IPCountry` request header, the source the spec is written for, behind the one country function. The production country source is parked for the human (plan-review, Needs the human, item 2), and 37 owns it. Rung 4: one function and one test helper change if the answer differs. Overturned if the human picks geo-IP. 37 then puts the lookup behind the same function and a test seam in front of it, and this spec's country helper moves to that seam.

ASSUMPTION: the spec's one migration lands whole here, its rules and its Profile cascade included. 36 proves the rules and the cascade, as 30 proves the rules that 25 and 26 wrote (rung 3). Overturned if each part must land with its proof. The cascade and the rule then move to 36 as a second additive migration.

ASSUMPTION: the ping's rate limit and the Event Recorder's bounded, failure-proof write land in 36 with their tests. Until then a failed write fails the request, and pings are unlimited. Rung 3: 22 adds its guard last among the local tickets. Nothing deploys before 38. Overturned if the ping must never run unlimited on any commit. The limit then moves here.

- [ ] The spec's test 1 passes. An `SI` Visitor loads the Stats Profile, and the spec waits for the ping's 204. The Visitor follows the Direct Mode Link, whose `/r` answers 302 to its `.test` Destination. Signed in as the Stats Creator, Stats shows +1 on each of these: the Page Views and Clicks cards, today's daily row, that Link's row and the `SI` row.
- [ ] Every CTR shown equals Clicks ÷ Page Views as displayed.
- [ ] Reloaded with every `dailyStats` request's `perPage` rewritten to 1, the cards and both tables read the same.
- [ ] At 390×844 the page has no horizontal overflow, and the spec saves the Stats screenshot at that size.
- [ ] The spec's test 6 passes. Five loads carry Instagram, Facebook (`FBAN`), Threads, TikTok and desktop Chrome User-Agents, and the newest Event after each reads instagram, facebook, threads, tiktok and empty. Read as the Operator, Events have exactly the fields `id`, `kind`, `profile`, `link`, `country`, `inAppBrowser` and `created`.
- [ ] `POST /v/{unknown Username}` answers 404 and records nothing. A GET under `/v/` reaches the Profile route.
- [ ] No Stats test requests the events collection.
- [ ] `./check.sh` passes.
