# 45: A Profile load counts as one Page View, and its Creator sees it by day and by country on the Stats page

Spec: docs/spec/phase-04-stats.md
Covers: user stories 1, 6, 7, 9, 12, 13, 15, 17, 19, 22, 30
Seams: the spec's one seam, the Playwright loop against Phase 2's compose stack. Nothing below it is mocked.
- Each Visitor is a fresh browser context, with the country set through `extraHTTPHeaders` (`x-country`) or left out. The test waits for the ping's 204 before reading Stats.
- The Stats Creator signs in in Playwright's browser at a phone-sized viewport and reads numbers by their accessible labels.
- Stats is read before and after each action, and the test asserts the difference.
- `page.route` rewrites the `dailyStats` page size for the reload check and watches for any request to the `events` collection.
Blocked by: 44: v2 serves its own copy of the public page script… (the copy that sends the ping); 18: Every PocketBase collection comes from versioned migrations… (the events collection and the Profile's owner relation); 19: Every v1 Profile opens on v2 from PocketBase… (the public page and the seed this ticket extends); 20: A Click on v2 ends at the same Destination as on v1… (the Visitor location lookup whose header order the Recorder mirrors); 32: The Editor's address and the Creator's PocketBase paths answer on the Profile origin… (the `/edit` address and the proxy's allow-list, which gains `dailyStats`); 33: A Creator who holds a Profile logs in at `/edit`… (Creator log-in, and the Editor that Stats sits next to); 34: An invited Creator signs up on one screen, claims a Username… (the 3-character Username minimum that keeps `v` unclaimable, so the ping's path reserves nothing)
Status: ready-for-agent

**What to build:** The first path through every layer. A Visitor loads the Stats Profile, and v2's page sends one Page View ping. The app records a Page View Event with the Visitor's country. The Stats Creator signs in, opens Stats from the creator-only area, and sees that Page View under 7D: in the Page Views card, in today's daily row and in the country's row.

- **The spec's one additive migration lands whole here**, because the first Event written would otherwise make its Profile undeletable.
  - A Profile's Events are deleted with it.
  - Events get a (Profile, time) index.
  - Every events rule stays superuser-only.
  - The new `dailyStats` view has one row per Profile, Link, country and UTC day, with a Page View count and a Click count. Its list and view rule admits only the Profile's owner.
  - No field Phase 2 defined is renamed, retyped or dropped.
- **Event Recorder, recording a Page View.** It takes the country from `x-country`, else `cf-ipcountry`, in the same order as Phase 2's Visitor location lookup. Where that lookup would fall back to US, it records `XX`, and it does the same for any value that is not two letters. It writes one Event through the app's privileged PocketBase access.
- **Page View Ping.** `POST /v/{username}` with no body answers 204 once the Event is recorded. It answers 404 for an unknown Username and records nothing.
- **v2's page** sends the ping with `navigator.sendBeacon` once per load, after the Profile has rendered. It sends none for an unknown Username.
- **Seed.** Phase 2's seed gains the Stats Creator. This is a verified account, because Phase 3's Link rules require one for ticket 52's API steps (observed: docs/spec/phase-03-auth-and-editor.md:126). Its test password is in the test env file. The Stats Creator owns the Stats Profile, which has one Direct Mode Link. The Fixture Profile still has no Creator.
  ASSUMPTION: the Stats Profile's Destinations are test-only `example.com` addresses, as Phase 2's test-only fixture Destinations are (rung 3: docs/spec/phase-02-vps-foundation.md:108). Overturned if a test needs a Destination elsewhere.
- **Proxy.** The allow-list gains `dailyStats`. `events` stays off it.
- **Stats page.** It lives in the creator-only area and reaches PocketBase the way the Editor does: the stored session token, and a 401 sends the Creator to log-in with a return path.
  - It shows 7D: the last seven UTC days, computed from the browser's own clock, with the date span shown and labelled UTC.
  - A Page Views card.
  - A daily panel: one plain bar and its number per day. There is no chart library.
  - A Countries table with Country and Page Views, most Page Views first. A country shows as its two-letter code, and `XX` shows as "Unknown".
  - It lists the range's `dailyStats` rows with Link titles expanded, 500 rows a page, and keeps requesting the next page until it has every row. It sends no Profile filter, so the list rule alone decides which rows it sees. It never requests anything from `events`.
  - The layout is mobile-first, in the look of the link.me Template's analytics page, like the Editor. Every number sits under an accessible label: card names and table column headers.
  ASSUMPTION: Stats sits under the Editor's `/edit` address, which Phase 3 leaves free for any screen except its two email links (docs/spec/phase-03-auth-and-editor.md:110). So it adds no top-level path and no reserved Username (rungs 3 and 5). Overturned if Phase 3's built Editor routes its screens elsewhere; Stats then follows it.
  ASSUMPTION: Phase 3 builds no navigation for the creator-only area (observed: `grep -n -i -w "nav\|navigation\|menu" docs/spec/phase-03-auth-and-editor.md` finds only a Visitor's navigation). So this ticket adds the smallest one, in the Template's look: a "Stats" entry in the Editor, and a way back to the Editor from Stats (rung 5). Overturned if Phase 3's built Editor already has a navigation; Stats then joins it.
- **Earlier specs.** Two Phase 2 checks become false as soon as any Profile load is counted:
  - ticket 18's check that the events collection holds no record;
  - ticket 20's check that it still holds none after its Reveal and `/r` calls.

  This ticket retires both. Ticket 18's check of the collection's fields stays.
  ASSUMPTION: the two checks are retired rather than rewritten, because from this ticket on this Phase's spec holds every assertion about what `events` contains (rung 5). Overturned if Phase 2's built specs hold a narrower check that still holds; that check then stays.
- **Slices.** Later tickets finish what this one starts:
  - the Recorder writes an empty In-App Browser until ticket 49;
  - it awaits its write plainly until ticket 53;
  - the seed gains the Adult Link in ticket 47 and the Other Creator in ticket 50.

  ASSUMPTION: the Phase lands in these slices, each ticket adding only what its test needs (rung 5). Nothing reaches a Visitor before the Phase's last agent ticket, because v2 has no live traffic before Cutover (the spec's Further Notes). Overturned if Phase 4's tickets are deployed one at a time; the slices then fold into this ticket.

- [ ] Spec test 1, Page View part. A Visitor with country `SI` loads the Stats Profile, and its ping answers 204. Signed in as the Stats Creator, Stats → 7D shows +1 in each of:
  - the Page Views card;
  - today's daily row;
  - the `SI` row of the Countries table.
- [ ] Stats is reloaded with every `dailyStats` request's `perPage` rewritten to 1 (`route.continue` with the changed URL). The Page Views card, the daily panel and the Countries table read as before.
- [ ] Spec test 4. A Visitor with no country header loads the Stats Profile. The Countries table's "Unknown" row shows +1 Page View.
- [ ] `POST /v/{an unknown Username}` answers 404. Loading an unknown Username's page sends no ping.
- [ ] Every test that opens Stats asserts that the page requested nothing from the `events` collection. This holds from here on.
- [ ] The Editor has a "Stats" entry that opens Stats, and Stats leads back to the Editor. Signed out, opening Stats leads to log-in.
- [ ] The counting tests act only on the Stats Profile. A run that straddles 00:00 UTC can fail a daily-row assertion; rerun it.
- [ ] Every Phase 2 and Phase 3 spec passes with the two "holds no record" checks retired.
- [ ] Playwright: extends `tests/e2e/04-stats.spec.ts` (test 1's Page View part, and test 4). `./check.sh` passes.
