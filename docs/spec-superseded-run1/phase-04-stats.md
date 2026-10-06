# Phase 04 — Stats

**Objective.** A signed-in Creator opens Stats and sees their own Profile's Page Views, Clicks and CTR (click-through rate) per Link, per UTC day and per country, counted from Profile loads, `/r/:linkId` redirects and Reveals.

## Problem Statement

A Creator sends Instagram and TikTok traffic to their Profile and cannot tell what it does. v1 counts nothing (plan section 1: "NOT present: ... click/visit counting"). The Creator does not know how many Visitors opened the Profile, which Links they followed, on which days, or from which countries. The only numbers they get come from OnlyFans, through the `/c{code}` Tracking Code, and those cover subscribers, not Clicks.

That attribution is also unreliable. v1 stores one global Tracking Code in the Visitor's browser (`localStorage` key `linkme_tracking_id`, linkme_clone3/script.js:55) and reads it back on every Profile (script.js:236). A Visitor who arrived on one Creator's Profile with a code and later opens another Creator's Profile carries the first code along. A subscriber on the second Profile is then credited to a source that belongs to the first.

## Solution

v2 records an Event each time a Visitor loads a Profile (a Page View) and each time a Visitor follows a Link (a Click), whether the Destination comes from the `/r/:linkId` redirect or from Reveal. Each Event stores only whether it is a Page View or a Click, the Profile, the Link, the Visitor's country, the In-App Browser it came from, and the time.

The creator-only area gets a Stats page, next to the Editor and styled after the link.me Template's analytics page. It has:

- a Today / 7D / 30D range;
- Page Views, Clicks and CTR totals;
- a per-day chart;
- a per-Link table and a per-country table;
- two filters that narrow every panel to one Link and/or one country, so "Clicks on this Link, per day, from this country" can be read directly.

A Creator sees only their own Profile's Stats.

A Tracking Code now stays with the Profile it arrived on, so it can no longer leak to another Creator's Destination. The `/c{code}` suffix on OnlyFans Destinations keeps working as before.

## User Stories

1. As a Creator, I want every load of my Profile counted as one Page View, so that I know how many Visitors saw it.
2. As a Creator, I want every Click on a Link that goes through the `/r/:linkId` redirect counted, so that I know which Links Visitors follow.
3. As a Creator, I want a Click on an Adult Link counted when Continue on the Age Gate triggers its Reveal, so that my OnlyFans Link, usually the one that matters most, is not missing from Stats.
4. As a Creator, I want a Link Shortcut (`?link=`) that triggers a Reveal on page load counted as a Click, so that the Clicks from Links I share directly are not lost.
5. As a Creator, I want an unknown Link Id or a failed Reveal to record nothing, so that broken or guessed URLs do not inflate my Clicks.
6. As a Creator, I want each Page View and Click to carry the Visitor's country, so that I can see where my audience is.
7. As a Creator, I want traffic whose country cannot be determined shown as "Unknown", not guessed as US the way v1's Geo Rule code does, so that my country numbers are honest.
8. As the Operator, I want each Event to record which In-App Browser it came from (Instagram, Facebook, Threads, TikTok, or none), so that I can later judge from the PocketBase admin UI how much traffic arrives in-app and whether Escapes work.
9. As the Operator, I want Events stored in PocketBase next to Profiles and Links, so that Stats need no extra service.
10. As a Visitor, I want recording an Event never to break or stall my Click, so that an Event-store failure never costs the Creator a subscriber.
11. As a Visitor, I want no IP address, raw User-Agent string or identifier of mine stored, so that being counted does not mean being followed.
12. As a Creator, I want my Events summed per day, Link and country before they reach my Stats page, so that the page loads one small summary rather than every raw Event.
13. As a Creator, I want a Stats entry in my signed-in area, next to the Editor, so that I find my numbers where I edit my Links.
14. As a Creator, I want Page Views, Clicks and CTR totals for Today, the last 7 days or the last 30 days, so that I can judge a period at a glance.
15. As a Creator, I want Page Views and Clicks per day, so that I can see which days my posts drove traffic.
16. As a Creator, I want Clicks and CTR per Link, so that I know which Links work.
17. As a Creator, I want Page Views, Clicks and CTR per country, so that I know which countries convert.
18. As a Creator, I want to narrow every panel to one Link and/or one country, so that I can read Clicks per Link per day per country (the plan's Phase 4 DONE).
19. As a Creator, I want the newest Events included as soon as I open or reload Stats, so that I can check a fresh post right away.
20. As a Creator, I want a deleted Link's past Clicks to stay in my totals and appear as "Deleted link", so that tidying my Profile does not rewrite my history.
21. As a Creator, I want an empty range to say plainly that nothing was recorded yet, so that a new Profile does not look broken.
22. As a Creator, I want the Stats page laid out mobile-first in the look of the link.me Template, like the Editor, so that I can check it on my phone.
23. As a Creator, I want only my own Profile's Stats visible to me, so that other Creators cannot read my numbers and I cannot read theirs.
24. As a Creator, I want nobody who is signed out to be able to read any Event or Stats row through PocketBase's API, so that my traffic stays private.
25. As a Creator, I want a Tracking Code that arrived in my Profile URL to stay with my Profile, so that a Visitor who later opens another Creator's Profile does not carry my code into that Creator's Destination.
26. As a Creator, I want the `/c{code}` suffix on my OnlyFans Destination to keep working, so that OnlyFans keeps crediting subscribers to my sources.
27. As the Operator, I want the Page View ping rate-limited with Reveal's threshold, so that nobody can flood Events and fill the server's disk.
28. As the Operator, I want a Profile's Events to go with it when the Profile is deleted, so that the Events never block that deletion.
29. As the Operator, I want the exact steps for the production country source (Cloudflare's country header) written down, so that I can switch on real country numbers at Cutover.
30. As the Operator, I want local tests to set the Visitor's country through a request header, so that country Stats are tested without any account or download.

## Implementation Decisions

- **Owns.**
  - **Event Recorder** (new, in the app container).
  - **Page View Ping route** (new, in the app).
  - **One additive PocketBase migration**: the rules, the Profile cascade and the index on Phase 2's `events` collection, and the new **`dailyStats` view collection**.
  - **Stats page** (new), plus a "Stats" entry in the navigation of the creator-only area.
  - Modified:
    - the `/r/:linkId` redirect and the Reveal endpoint (Phase 2), which now record a Click;
    - the public page script, which this Phase copies into the app as v2's own (see Public page copy) and which then sends the ping and stores Tracking Codes per Profile;
    - Phase 3's PocketBase API proxy, whose allow-list gains `dailyStats`;
    - the seed (Phase 2), which gains two Creators with a Profile each.
  - New spec: `tests/e2e/04-stats.spec.ts`.

- **What Phase 2 provides, what Phase 4 adds.**
  - Phase 2 provides:
    - the PocketBase and app containers, and the app's privileged (superuser) access to PocketBase;
    - the `profiles` collection with its `owner` relation, and the `links` collection;
    - the `events` collection with D5's fields (`profile`, `link`, `kind`, `country`, `inAppBrowser`, `created`), superuser-only, with nothing writing to it (docs/spec/phase-02-vps-foundation.md:130-142);
    - `/r/:linkId`, and Reveal with its Visitor location lookup, Geo Rule, `/c{code}` resolver and rate limiter;
    - the ported public page;
    - the compose stack, the seed with the Fixture Profile, `tests/e2e.env`, and the Playwright webServer.
  - Phase 4 adds:
    - cascade delete on `events.profile`, and the `(profile, created)` index;
    - every write to `events`;
    - the `dailyStats` view, the ping, and the Stats page.
  - Phase 4's migration never renames, retypes or drops a field that Phase 2 defined. The only change to an existing field is the cascade option on `events.profile`.

  ASSUMPTION: Phase 2 ships `events` as its spec describes and writes nothing to it (rung 3: Phase 4 binds to Phase 2's names). Overturned by Phase 2's actual migration; Phase 4 then uses the names it finds and adds only what is missing.

- **Public page copy.** Phase 2 serves v1's own published directory, so until now v2's page is v1's script, with no copy (phase-02, Public page). This Phase is the first whose page change v1 must not get: v1 has no `/v` route, and Phase 5 later changes how the page learns its Username.
  - This Phase copies the page files it changes, at least script.js, from v1's tree into the app. The app serves its copies ahead of v1's directory.
  - Images, landing.html and every other file still come from v1's directory.
  - Phase 5's bootstrap edits the same copy. Phase 5's readiness step moves the v1 tree to the commit live v1 serves, so it changes only v1's data and static files, never v2's page.

  ASSUMPTION: v2's page forks here, after Phase 0's and Phase 1's changes are in the copied file, so ADR 0001's "carried into v2, not forked" still holds for them. Rung 2 for the slot: plan §5 makes this the first Phase whose page work is v2-only. Rung 4: the copy is additive and leaves live v1 untouched. Rung 5: one file. The cost: v1 keeps the global Tracking Code key until Cutover, and a later fix to v1's script must be made twice. Overturned if v1 must also get the ping and the per-Profile key before Cutover; the copy then goes, and v1 ships both.

- **Interfaces.**
  - **Event Recorder** exposes two calls:
    - *record Page View* (request, Profile)
    - *record Click* (request, Profile, Link)

    Each call:
    - works out the Visitor's country and In-App Browser from the request;
    - writes one Event through the app's privileged PocketBase access and waits for that write for at most 300 ms; past that, the caller goes on and the write's outcome is only logged;
    - never throws: a failed or late write is logged and swallowed.
  - **`/r/:linkId`**: looks the same from outside (a redirect to the Destination). Once the Link resolves, it records a Click before redirecting. An unknown Link Id still gets 404 and records nothing.
  - **Reveal**: looks the same from outside. It records a Click each time it returns a Destination, and nothing when it returns 404, refuses the origin or is rate-limited.

    Exactly one of the two endpoints hands out the Destination for any one Click, so no Click is counted twice.

    ASSUMPTION: a Reveal counts as a Click (CONTEXT.md "Click"), although the plan names only `/r/:linkId` and the ping as writers. Without it, every Adult Link Click would be missing. Overturned if Stats should count redirects only.
  - **Page View Ping route**: `POST /v/{username}`, contract below.
  - **Public page script** (v2's copy, see Public page copy):
    - Sends the ping once per page load, after the Profile has rendered. It does not send one for an unknown Username.
    - Stores the Tracking Code under a per-Profile key, which replaces the global `linkme_tracking_id` (D5: "Replace the global localStorage trackId"). The old key is ignored, not migrated.
    - Phase 1's rule that keeps the Tracking Code in the URL during an Escape (plan section 4) is untouched.
  - **Stats page**:
    - Lives in Phase 3's creator-only area and reaches PocketBase the same way the Editor does.
    - Adds a "Stats" navigation entry next to the Editor.

- **Schema.**

  ```
  events          Phase 2's base collection; list/view/create/update/delete rules: none (superusers only)
    kind          select   page_view | click                          Phase 2's values
    profile       relation profiles, single, required                 Phase 4 adds cascade delete
    link          relation links, single, optional                    empty on Page Views; no cascade, so deleting a Link clears it
    country       text     two uppercase letters; "XX" = unknown      written by the app only
    inAppBrowser  text     instagram | facebook | threads | tiktok, or empty    written by the app only
    created       autodate on create (UTC)
    index         (profile, created)                                  Phase 4

  dailyStats      view collection; list and view rule: profile.owner = @request.auth.id
    one row per (profile, link, country, day)
    day     = UTC calendar date of created, "YYYY-MM-DD"
    views   = count of kind = page_view      clicks = count of kind = click
    link stays a relation (empty on rows that hold Page Views or Clicks on deleted Links); row id unique per row
  ```

  Events are written only by the app; Visitors have no create rule. The D5 field list (Profile, Link, country, In-App Browser, timestamp) plus `kind` is the whole record: no IP address, User-Agent string, referrer or Visitor identifier is stored.

  ASSUMPTION: the owner relation is `profiles.owner`, the name Phase 2's spec gives it (phase-02-vps-foundation.md:117) for D2's `user = @request.auth.id` (rung 3). Overturned by Phase 2's actual field name, which the rule then uses.

  ASSUMPTION: Events cascade with their Profile. PocketBase blocks deleting a record that a required relation points to, and a deleted Profile's Stats have no reader. A Link's deletion keeps its Clicks (rung 4: keep data). Overturned if the Operator wants a deleted Profile's Events kept.

  ASSUMPTION: the "daily aggregation" is the `dailyStats` view, computed by SQLite on every read, rather than a scheduled job writing a rollup table (rung 4: the view holds no state and can be dropped without loss; rung 5: no job). With no stored aggregate, there is no rerun, backfill or late-arrival case. Overturned if the 30D `dailyStats` read for the busiest Profile takes longer than one second on the VPS (rung 6 for the number). A nightly job then fills a table of the same shape, and the Stats page does not change.

  ASSUMPTION: days are UTC calendar days, labelled "UTC" on the page. Overturned if Creators need their local day, which would mean a per-Creator time zone.

- **Contracts.**
  - **Page View Ping.** `POST /v/{username}`, no body, sent with `navigator.sendBeacon`.
    - Answers 204 when the Event is recorded.
    - Answers 404 for an unknown Username.
    - Answers 429, as Reveal does, when over the limit.

    ASSUMPTION: the path mirrors the plan's `/r/` shape (rung 3). `v`, like `r`, can never be a Username, because Phase 3's 3-character minimum refuses it, so this Phase reserves nothing (phase-03, Username rules). Overturned by any common prefix Phase 2 gives the app's endpoints.

    ASSUMPTION: the ping uses Reveal's limiter code and threshold (`REVEAL_LIMIT_PER_MINUTE`), with its own fixed-window counter keyed by client IP and Username. If the ping shared Reveal's counter, every Profile load in every spec would spend the Reveal and `/r` budget that Phase 2's specs are sized against (phase-02-vps-foundation.md:224, :284, :311). In production, Page Views would spend a Visitor's Reveals. With the Username in the key, other specs' Profile loads cannot rate-limit this Phase's seeded Profiles. Rung 3 for the code, rung 5 for the key. Overturned if the Operator sees one address flooding pings across many Profiles; the key then drops the Username.
  - **Visitor country.**
    - Read from the same headers, in the same order, as Phase 2's Visitor location lookup: `x-country`, else `cf-ipcountry` (phase-02-vps-foundation.md:185). So a Click's recorded country and the Tracking Code its Geo Rule gave always agree.
    - Where that lookup would fall back to US, the Event records `XX`, and so does any value that is not two letters. This is never v1's US default (linkme_clone3/netlify/functions/geo_utils.js:51); that default belongs to Geo Rules only.
    - Local tests inject `x-country`.

    ASSUMPTION: Stats mirror Phase 2's header order (rung 3). Overturned by Phase 2's actual lookup, which Phase 4 then mirrors.
  - **In-App Browser.** Classified from the User-Agent with plan section 4's patterns, first match wins:
    - `Threads` → threads
    - `Instagram` → instagram
    - `FBAN|FBAV` → facebook
    - `musical_ly|Bytedance|TikTok` → tiktok
    - anything else → empty

    A load after an Escape comes from the System Browser and records an empty In-App Browser. The Operator compares in-app Page Views with these to judge whether Escapes work.

    ASSUMPTION: the order is a choice (Threads before Instagram, in case Threads' User-Agent also says Instagram). Overturned by real-device User-Agents.
  - **Tracking Code storage.** One `localStorage` entry per Username. A code that arrived on Profile A is never sent with a Reveal on Profile B.
    - Only the key changes. As in v1, a code is sent only for a Link with Tracking on, and the Profile's stored code wins over the Link's default Tracking Code (script.js:235-243). A stored code does not expire.
    - Reveal's resolver (Phase 2) turns the code into `/c{code}` as before: digits append `/c{digits}`, `geo` goes through the Geo Rule, and anything else appends nothing.

    ASSUMPTION: Phase 4 owns this part of D5. Overturned if Phase 1 already scoped the key per Profile; Phase 4 then keeps only the test.
  - **`dailyStats` read.** The Stats page lists the chosen range's `dailyStats` rows, with Link titles expanded, 500 rows a page. It requests the next page until it has every row, because PocketBase's list endpoint returns one page (30 rows by default). It sends no Profile filter, so the list rule alone decides which rows a Creator sees.

    ASSUMPTION (evidence blocked): 500 is within the pinned PocketBase's page-size cap (no network to check the release). Overturned by the pinned release's cap; the paging loop keeps the totals right at any page size.

- **Write path.** An Event write is awaited for at most 300 ms. After that the redirect or Reveal answers anyway, and the write's outcome is only logged. Errors are swallowed.

  ASSUMPTION: a bounded wait, not fire-and-forget and not an unbounded await. A local PocketBase insert takes milliseconds, so tests still see deterministic counts, and a stalled write delays a Click by 300 ms at most (rung 6 for the number). Overturned if redirect latency measurably grows.

- **What counts.**
  - Every Profile load is one Page View. That includes the second load when a Visitor follows the Escape Overlay's "open in browser" instruction.
  - Every Destination handed out by `/r` or Reveal is one Click, whatever the Link's Mode, and double taps count. A Mode that fetches the Destination twice counts twice.
  - A closed Age Gate, an unknown Link Id, and a refused or rate-limited Reveal hand out nothing, so they count nothing.
  - Visits by the Creator themselves count.

  ASSUMPTION: no de-duplication. Without a Visitor identifier, which D5 does not log, none is possible. Overturned if Escape Mode Profiles show visibly deflated CTR; escaped loads would then be marked in the URL and skipped.

- **Stats page.**
  - **Range tabs.** Today, 7D (the default) and 30D, in UTC days, with the date span shown. The browser computes the range from its own clock. This follows the link.me Template's Overview tabs.
  - **Filters.** Link (all Links, each Link, "Deleted link") and Country (all, or each country seen in the range). Both apply to every panel.
  - **Cards.** Page Views, Clicks and CTR, in the place of the template's Profile Views / Link Clicks / Engagement Rate.
  - **Daily panel.** For each day in the range, Page Views and Clicks as bars plus numbers, in the place of the template's Traffic Overview.
  - **Links table.** Link, Clicks, CTR, most-clicked first, in the place of the template's Top Web Links.
  - **Countries table.** Country, Page Views, Clicks, CTR, most Page Views first, in the place of the template's Geographic Analytics → Countries. A country shows as its two-letter code, as the template does, and `XX` shows as "Unknown".
  - **CTR.** Clicks ÷ Page Views for the same range and filters, shown as a percentage with one decimal, or "—" when there are no Page Views. Page Views belong to the Profile, not to a Link. Under a Link filter, Page Views stay Profile-wide and CTR is that Link's Clicks over them.
  - **Empty range.** A range with no rows reads "No Page Views or Clicks in this range yet."
  - **Freshness.** Numbers are current as of page load; there is no auto-refresh.
  - **Accessibility.** Every number sits under an accessible label (card names, table column headers), so the spec reads it by role.

  ASSUMPTION: no chart library (rung 5, and a new dependency needs a network fetch): the bars are plain elements sized by value. Overturned if the human wants real charts; that is a parked dependency install.

  ASSUMPTION: the layout is mobile-first like the Editor (rung 3, plan section 6 "simplistic layout UI"). Overturned by any separate brief for Stats.

- **Seed.** Phase 2's seed gains two Creators. Each has a known test password in `tests/e2e.env` and a Profile of their own:
  - the Stats Creator's **Stats Profile**: one Direct Mode Link, plus one Adult Link with Tracking on, no Geo Rule and no default Tracking Code;
  - the Other Creator's **Other Profile**: one Direct Mode Link.

  Only this Phase's spec visits these two Profiles, so other specs running in parallel do not disturb their counts. The Fixture Profile keeps no Creator, as Phases 2 and 3 leave every imported Profile (phase-02-vps-foundation.md:140, phase-03-auth-and-editor.md:113, :149).

  ASSUMPTION: two seeded Creators are an additive change (rung 4) that two-sided ownership needs. The Adult Link has Tracking on so that the Tracking Code test can fail: script.js:235 sends a code only when `link.tracking` is set. Overturned if Phase 2 or 3 already seeds Creators with Profiles, which Phase 4 then reuses.

## Testing Decisions

- **Seam: one.** The existing Playwright loop, through `./check.sh` → `npx playwright test`, against Phase 2's compose stack at `baseURL`. Nothing below it is mocked.
  - The spec is `tests/e2e/04-stats.spec.ts` and runs serially, in the order below.
  - Every Visitor is a fresh browser context, with the country set through `extraHTTPHeaders` (`x-country`) and, where needed, a fake User-Agent.
  - Checks against PocketBase's REST API use Playwright's `request` fixture: Creator and signed-out calls at the same origin, Operator steps at PocketBase's loopback port, as Phase 3's rule checks do (phase-03, Testing Decisions).
  - No unit-test seam is added.
- **Counting is by delta.** Phase 2's wrapper starts a fresh stack for each run (`reuseExistingServer: false`, phase-02, Test loop), but the tests in this file run in order against the same Profiles. So each test reads the Stats page before and after acting and asserts the difference.
  - The counting tests act only on the Stats Profile.
  - Between its two reads, a test also makes traffic that its assertion must leave out, so an ignored filter changes the number.
  - A run that straddles 00:00 UTC can fail a daily-row assertion; rerun it.
- **Destinations are stubbed.** Navigation to any host other than `baseURL` is fulfilled with a stub through `page.route`, so no test leaves the machine. Before a Visitor acts, the spec waits for the ping's 204, or for the redirect or Reveal response.
- **No raw Events in the page.** Every test that opens Stats asserts that the page requested nothing from the `events` collection (story 12).
- **Tests:**
  1. **Page View and Click reach Stats.** A Visitor with country `SI` loads the Stats Profile and clicks its Direct Mode Link. Signed in as the Stats Creator, Stats → 7D shows +1 in each of:
     - the Page Views card and the Clicks card;
     - today's daily row;
     - that Link's row;
     - the `SI` country row.

     The CTR text equals Clicks ÷ Page Views as displayed. The page is then reloaded with every `dailyStats` request's `perPage` rewritten to 1 through `page.route` (`route.continue` with the changed URL). The cards and both tables must read the same as before. The test saves a screenshot to `.scratch/goal_ai/shots/04-stats.png`.
  2. **Adult Link, filters and filtered CTR.** Between the two reads, three Visitors act:
     - `SI` clicks the Adult Link and passes the Age Gate;
     - `SI` clicks the Direct Mode Link;
     - `DE` clicks the Adult Link and passes the Age Gate.

     Stats → 7D then shows:
     - no filter: Page Views +3, Clicks +3;
     - Link = Adult Link: Clicks +2, Page Views still +3;
     - Link = Adult Link and Country = `SI`: Page Views +2, and Clicks +1 on the card and in today's daily row.

     Every CTR shown equals Clicks ÷ Page Views as displayed.
  3. **Link Shortcut counts; unknown Ids do not.** Between the two reads:
     - a Visitor opens the Stats Profile with `?link={its Direct Mode Link's Id}` and lands on the stub;
     - `GET /r/{unknown Id}` answers 404;
     - a Reveal for an unknown Link Id answers 404.

     Clicks rise by exactly 1, all on the Direct Mode Link's row.
  4. **Unknown country.** A Visitor with no country header loads the Stats Profile. The Countries table's "Unknown" row shows +1 Page View.
  5. **Ranges and the empty range.** The Stats Creator reads the Today tab, then reopens Stats with the browser clock set eight days ahead through `page.clock`. The server's clock is untouched, so the session stays valid.
     - Today and 7D read "No Page Views or Clicks in this range yet."
     - 30D lists the real today's date with the Page Views and Clicks the Today tab showed.
  6. **In-App Browser recorded, nothing else stored.** For each of five User-Agents (Instagram, Facebook `FBAN`, Threads, TikTok, desktop Chrome), a Visitor loads the Stats Profile. The newest Event for that Profile, read with the Operator's credentials, has `inAppBrowser` instagram, facebook, threads, tiktok or empty, respectively. Read the same way, the `events` collection's fields are exactly `id`, `kind`, `profile`, `link`, `country`, `inAppBrowser` and `created`.
  7. **Owner only.** Each Creator first records a Page View on their own Profile. Then, through PocketBase's records API:
     - with the Stats Creator's token, every listed `dailyStats` row belongs to the Stats Profile, and viewing a known Other Profile row by its id answers 404. The same holds the other way round.
     - with either Creator's token, and signed out, listing or viewing `events` returns no record, and creating an Event is refused.
     - signed out, listing `dailyStats` returns no items.

     In the UI, the Other Creator's Stats page names none of the Stats Profile's Links.
  8. **Tracking Code stays with its Profile.** A Visitor opens the Fixture Profile with Tracking Code 123 in the URL (`/{username}/123`).
     - On that Profile, its Adult Link's Destination ends in `/c123`.
     - The same Visitor then opens the Stats Profile and follows its Adult Link, which has Tracking on. That Reveal request carries no Tracking Code, and the Destination carries no `/c123`.
  9. **A deleted Link keeps its Clicks.** The Stats Creator creates a Link with a stub Destination through PocketBase's API. A Visitor opens `/r/{its Id}`, then the Creator deletes the Link. The Links table's "Deleted link" row shows +1 Click, and the Clicks card shows the same total as just before the delete.
  10. **A deleted Profile takes its Events.** The Operator creates a throwaway Profile through the API. A Visitor loads it, and its ping answers 204. The Operator then deletes the Profile. The delete succeeds, and no Event for that Profile remains.
  11. **A failed Event write does not block a Click.** The Operator adds a temporary required field to `events` through the API, so every Event write fails. A Visitor clicks the Stats Profile's Direct Mode Link and reaches the stub Destination. A `finally` step restores the collection.
  12. **The ping is rate-limited.** Pings to the Other Profile reach 429 within `REVEAL_LIMIT_PER_MINUTE` + 1 requests, the value from `tests/e2e.env`. This test runs last, so the exhausted window affects no other test.

  A stalled write has no automated test. The stack offers no way to stall one PocketBase insert from the seam without a test-only fault switch, and this Phase adds none. The 300 ms bound in the Event Recorder is the guarantee.

  ASSUMPTION (evidence blocked): adding a required field to a populated collection through PocketBase's superuser API makes later inserts without it fail (no network to check the pinned release). Overturned if the pinned release refuses that change. Test 11 then narrows the `kind` select so that the app's values fail.

  ASSUMPTION: Creator and signed-out calls reach PocketBase's records API at the same origin, through Phase 3's allow-listed proxy, to which this Phase adds `dailyStats` (the Stats page reads it); `events` stays off the list. Operator steps, and test 7's rule checks on `events`, go to PocketBase's loopback port with the superuser credentials from `tests/e2e.env` (phase-02-vps-foundation.md:196), as Phase 2's tests arrange state. The rule checks stay against PocketBase itself, because its rules are the security boundary (ADR 0002). Rung 3. Overturned if Phase 3 publishes the API at another address; the spec then uses that address.
- **Prior art.** `tests/e2e/00-smoke.spec.ts`:
  - a fake Instagram User-Agent through `test.use`;
  - `page.route` to stub Reveal so no Destination is followed (00-smoke.spec.ts:33-36);
  - role-based assertions.

  `playwright.config.ts` already writes into `.scratch/goal_ai/shots`.

## Acceptance

```sh
# Playwright's webServer starts Phase 2's compose stack with its seed (plan section 7).
test -f tests/e2e/04-stats.spec.ts
./check.sh tests/e2e/04-stats.spec.ts
test -s .scratch/goal_ai/shots/04-stats.png
# manual: glance at .scratch/goal_ai/shots/04-stats.png. It should read like link.me/analytics.html:
#         range tabs, three cards, daily bars, a Links table, a Countries table.
# manual: real device (RUN.md). In Instagram on a phone, open the Fixture Profile. In the PocketBase admin UI,
#         the newest Event for it shows inAppBrowser = instagram, and, once the country source below is on,
#         the phone's real country.
# manual, at Cutover: the production country source is Cloudflare's CF-IPCountry. Phase 5 owns the set-up: the zone move,
#   the Proxied records, and the Caddy lines that set X-Country from CF-IPCountry only for requests from Cloudflare's ranges
#   and remove both headers from every other request (phase-05, Caddy configuration).
#   A Custom Domain that Cloudflare does not proxy keeps recording XX.
./check.sh
```

## Depends on

- **Phase 2.** Provides:
  - PocketBase, the app container, and the app's privileged PocketBase access;
  - the `profiles` collection with its `owner` relation, and the `links` collection;
  - the `events` collection with D5's fields, which nothing writes yet;
  - `/r/:linkId`;
  - Reveal, with its Visitor location lookup, `/c{code}` resolver and rate limiter;
  - the public page, served from v1's directory, which this Phase copies (Public page copy);
  - the compose stack, the seed with the Fixture Profile and `tests/fixtures/secrets.json` (which gives the Fixture Profile's Adult Link the Destination test 8 reveals), `tests/e2e.env` with the superuser credentials and `REVEAL_LIMIT_PER_MINUTE`, and the Playwright webServer swap.

  Phases 0 and 1 arrive through Phase 2. That includes Phase 1's In-App Browser detection and its rule for keeping the Tracking Code during an Escape.
- **Phase 3.** Provides:
  - Creator login;
  - the creator-only area and its navigation, where Stats sits next to the Editor;
  - the allow-listed same-origin PocketBase API proxy, which the Editor uses and to which this Phase adds `dailyStats`;
  - the owner rules that let a Creator create and delete their own Links (test 9);
  - the 3-character Username minimum, which keeps `v` unclaimable.

## Out of Scope

- **Real-time panel, "Live" badge, 30-second refresh.** The plan asks for numbers by day, not live ones.
- **Period comparison, % change against the previous period, Engagement Rate, Total Interactions, hourly pattern, cities, world map.** These are template extras outside "per-link clicks + page views, by day and country" (plan section 6).
- **Traffic Sources by referrer.** D5 does not log the referrer.
- **In-App Browser breakdown on the Stats page.** D5's dashboard list is views, clicks and CTR per Link per day per country. The Operator reads In-App Browser in the PocketBase admin UI.
- **Unique Visitors and de-duplication.** They need a Visitor identifier, which D5 does not log.
- **Bot filtering.** The ping needs JavaScript, which keeps most crawlers out. Link previewers that hit `/r/` will count. Revisit if the numbers look inflated.
- **Excluding the Creator's own visits.** Not asked for.
- **Stats per Tracking Code.** D5 keeps `/c{code}` for OnlyFans attribution, and OnlyFans reports that itself.
- **US state or region on Events.** Geo Rules use it, but D5 logs country only.
- **Custom date ranges, CSV export.** Not asked for.
- **Operator-wide Stats across Profiles.** The PocketBase admin UI already shows every Event to the Operator.
- **Event retention and pruning.** At about 27 Profiles, SQLite holds years of Events. Revisit if disk use grows.
- **A scheduled rollup job or table.** The `dailyStats` view meets "daily aggregation" (see ASSUMPTION).
- **Per-Creator time zones.** Days are UTC (see ASSUMPTION).
- **VPS geo-IP (MaxMind).** D5 allows it as the other country source. It needs an account, a licensed download, a new dependency and lookup code; Cloudflare needs none of them. Revisit if the Operator will not proxy through Cloudflare.
- **A Deeplink or Escape Mode counting matrix.** Clicks are counted where `/r` or Reveal hands out the Destination, whatever the Mode. Phase 1 tests each Mode's path.
- **Umami.** The plan lists it as a Bonus "if PocketBase stats are not enough".
- **A chart library.** A new dependency, and plain bars meet the brief.

## Further Notes

Every open question below is already settled by the ladder; each is restated here with the rung that settled it.

ASSUMPTION: Phase 2 ships `events` as its spec describes (D5's fields, `kind` page_view | click, nothing writing to it); Phase 4's migration adds only the Profile cascade, the index and the rules (rungs 3 and 4). Overturned by Phase 2's actual migration.
ASSUMPTION: a Reveal counts as a Click (CONTEXT.md; work the plan needs, flagged). Overturned if Stats should count redirects only.
ASSUMPTION: the daily aggregation is a PocketBase view computed on read, not a scheduled rollup (rungs 4 and 5). Overturned if the 30D read for the busiest Profile takes longer than one second on the VPS.
ASSUMPTION: days are UTC, and the Stats page computes its range from the browser's clock (rung 5). Overturned if Creators need their local day.
ASSUMPTION: Visitor country uses Phase 2's header order, `x-country` then `cf-ipcountry`, and records `XX` where Phase 2 would fall back to US (rung 3). Overturned by Phase 2's actual lookup.
ASSUMPTION: the production country source is Cloudflare's header (rung 3: Phase 2 already reads `cf-ipcountry` and plans Cloudflare, phase-02-vps-foundation.md:185, :398; rung 5: no code and no dependency). The account and DNS work needs the human at Cutover, and until then every production Event records `XX`. That costs nothing before Cutover, because v2 has no live traffic until then. A Custom Domain that Cloudflare does not proxy keeps recording `XX`. Overturned if the Operator will not use Cloudflare; MaxMind then becomes a parked follow-up.
ASSUMPTION: the ping lives at `POST /v/{username}`, mirroring `/r/` (rung 3); `v` needs no reservation, because Phase 3's 3-character minimum refuses it. Overturned by a common API prefix from Phase 2.
ASSUMPTION: the ping uses Reveal's limiter code and threshold with its own counter, keyed by client IP and Username (rungs 3 and 5). Overturned if one address floods pings across many Profiles.
ASSUMPTION: Event writes are awaited for at most 300 ms and their errors swallowed (rung 6 for the number). Overturned if redirect latency measurably grows.
ASSUMPTION: the owner field on `profiles` is `owner`, as Phase 2's spec names it for D2's `user = @request.auth.id`. Overturned by Phase 2's actual name, which the rule then uses.
ASSUMPTION: Events cascade with their Profile, and a deleted Link's Clicks are kept as "Deleted link" (rung 4 for Links). Overturned if the Operator wants a deleted Profile's Events kept.
ASSUMPTION: Phase 4 owns D5's "replace the global localStorage trackId" with a per-Profile key. The old key is ignored, and v1's precedence and no-expiry stay (rungs 3 and 4). Overturned if Phase 1 already did it.
ASSUMPTION: v2's page forks here into the app's own copy, after Phase 0's and Phase 1's changes are in it (rungs 2, 4 and 5). Overturned if v1 must get the ping and the per-Profile key before Cutover.
ASSUMPTION: In-App Browser patterns come from plan section 4, matched in the order Threads, Instagram, Facebook, TikTok (the order is rung 6). Overturned by real-device User-Agents.
ASSUMPTION: every load is a Page View, including the second load after an Escape through the app menu, and nothing is de-duplicated (rung 5). Overturned if Escape Mode Profiles show deflated CTR.
ASSUMPTION: the seed gains the Stats Creator and the Other Creator, each with a Profile and a known test password, and only Phase 4's spec visits them (rung 4, additive). Overturned if Phase 2 or 3 already seeds them.
ASSUMPTION: Creator and signed-out calls reach PocketBase's records API at the same origin through Phase 3's allow-listed proxy, which gains `dailyStats`; Operator steps and the `events` rule checks use PocketBase's loopback port with the credentials from `tests/e2e.env` (rung 3). Overturned if Phase 3 publishes it elsewhere.
ASSUMPTION (evidence blocked): the Stats page reads 500 rows a page, within the pinned PocketBase's cap. Overturned by that cap.
ASSUMPTION (evidence blocked): a temporary required field makes PocketBase refuse Event writes in test 11. Overturned by the pinned release; the test then narrows the `kind` select instead.
ASSUMPTION: no chart library; bars are plain elements (rung 5). Overturned if real charts are wanted, which is a parked install.
ASSUMPTION: the Stats page is mobile-first and sits in Phase 3's creator-only area, reaching PocketBase the way the Editor does (rung 3). Overturned by Phase 3's actual area design.

## Review

Reviewer: `codex` (exec, read-only sandbox, reasoning effort high), 2026-10-02. The blind call (B) saw the plan, CONTEXT.md, the ADRs and the test harness, but not this spec; the draft call (D) saw the spec without this section. Both exited 0 with fresh output. Line numbers in `phase-02-vps-foundation.md` and `phase-03-auth-and-editor.md` were checked in the real repo during reconciling; the reviewer could not see those files.

Blind call:

- B1 **reject**: `./check.sh` failing with "unknown command 'test'" comes from the review workspace, which has no `node_modules` (`ls $WS/node_modules`: No such file or directory). The repo root has them. It says nothing about the loop.
- B2 **reject**: the harness still serves v1 (playwright.config.ts:11, tests/dev-server.mjs:1-3). Depends on already takes Phase 2's webServer swap, which Phase 2 specifies (phase-02-vps-foundation.md:280).
- B3 **reject** (Click = redirect only, or one logical action without double counting): already decided. Reveal counts (Interfaces; CONTEXT.md "Click"), and exactly one endpoint hands out the Destination for any one Click. Tests 2 and 3 assert exact Click deltas, so a double count fails them.
- B4 **reject** (send everything through `/r`, or share the recorder): the spec already shares one Event Recorder between both endpoints. Both look the same from outside, so tap-triggered Escape and the Modes are untouched.
- B5 **partial** (rollup vs counters vs query-time, compared on measured cost): the query-time view stays (rungs 4 and 5). Cost cannot be measured before the product exists. The overturn condition now has a measurable trigger, a 30D read over one second on the VPS (Schema).
- B6 **partial** (URL-carried vs per-Profile persistence; expiry and precedence): per-Profile persistence stays, because D5 says "Replace the global localStorage trackId" (goal_ai.txt:93) and Phase 1 already keeps the code in the URL during an Escape (goal_ai.txt:115). Lifetime and precedence are now written into Tracking Code storage.
- B7 **reject**: this agrees with the spec. Umami stays a Bonus (goal_ai.txt:166-167) and is Out of Scope.
- B8 **reject** (a Clicks-only build would miss CTR and Page Views): the spec delivers Page Views, Clicks and CTR (Objective; Stats page).
- B9 **reject** (Click meaning, totals vs uniques, CTR denominator, zero views, repeats): already decided. A Click is a Destination handed out. Counts are totals, because D5 logs no Visitor identifier. CTR is Clicks ÷ Profile-wide Page Views, shown as "—" with no Page Views. Double taps count (What counts; Stats page → CTR).
- B10 **accept** (navigation lifecycle): What counts is rewritten.
  - A closed Age Gate, an unknown Link Id and a refused or rate-limited Reveal count nothing.
  - Every Destination from `/r` or Reveal is one Click, whatever the Mode.
  - An escaped reload is a Page View.
  - The Link Shortcut is now tested (test 3).
- B11 **partial** (Event identity and schema): the schema was already explicit: `kind`, Link empty on Page Views, server autodate, no de-duplication. Checking Phase 2's spec showed that its `events` already has `kind` page_view | click and `inAppBrowser` as text (phase-02-vps-foundation.md:130-135). This spec's `view` value and select type contradicted that. Schema, "What Phase 2 provides" and `dailyStats` now use Phase 2's names.
- B12 **accept** (Tracking Code resolution): Tracking Code storage is rewritten.
  - Only the key changes.
  - v1's Tracking-on gate stays, and so does its order: the stored code wins over the Link default (script.js:235-243).
  - Codes have no expiry, and the old key is ignored.
  - Phase 2's resolver builds `/c{code}` (phase-02-vps-foundation.md:174-181).
- B13 **accept** (country and In-App Browser provenance):
  - The country now comes from Phase 2's lookup order, `x-country` then `cf-ipcountry` (phase-02-vps-foundation.md:185). The spec had wrongly said "one request header".
  - An escaped load records an empty In-App Browser.
  - The Cutover step overwrites X-Country from CF-IPCountry, so a Visitor cannot set their own country.
  - US state stays Out of Scope.
- B14 **reject** (aggregation timezone, freshness, late arrivals, reruns, backfills, deletion, reassignment): a view computed on read has no runs to repeat, nothing arrives late and nothing needs backfilling. UTC days, freshness at page load and Link deletion are already decided. Phase 3 forbids moving a Link to another Profile (phase-03-auth-and-editor.md:118).
- B15 **partial** (ownership, ingestion, abuse, retention): rules, the ping's rate limit and retention were already decided. Checking the ingestion route showed that Depends on was false. Phase 3 reserves only the top-level segments of the router Phase 2 ships (phase-03-auth-and-editor.md:141), and that router has no `/v`. Phase 4 now adds `v` itself (Owns, Contracts, Depends on). Fake pings remain possible within the rate limit, as with any public counter.
- B16 **accept** (failure and operational budgets): the Write path is now a 300 ms bounded wait (see D5), and the view has a latency trigger (see B5). Expected volume stays the Out of Scope figure of about 27 Profiles.
- B17 **reject**: no change needed. Visitor → real endpoints → real PocketBase → Creator's Stats is already the spec's one seam.
- B18 **partial** (exact visible values with controlled time and geo): exact values are rejected. Playwright reuses a running stack outside CI (playwright.config.ts:13), and these tests share Profiles, so counts stay deltas. Accepted parts:
  - test 2 now makes traffic its assertion must leave out;
  - test 5 controls time in the Creator's browser with `page.clock`;
  - geo is injected through `x-country`.

  Server time cannot be controlled, so the 00:00 UTC flake is written down.
- B19 **partial** (Direct/Escape/Deeplink/Adult matrix, two Profiles, a fresh context after Escape): two Profiles in one browser, and a fresh context landing on `/{username}/123` (what an Escape opens), are test 8. The Mode matrix is rejected: a Click is counted where `/r` or Reveal hands out the Destination, whatever the Mode, and Phase 1 tests each Mode's path (Out of Scope).
- B20 **accept** (direct PocketBase boundary tests as signed-out and two Creators): merged with D2. Test 7 is rewritten.
- B21 **partial** (day boundary, rerun, late Event, retry, interrupted write): there is no aggregation job to rerun or backfill. The rejected write is now test 11, and a range boundary is test 5. A stalled write has no automated test, because the seam has no fault switch; Testing Decisions says so.
- B22 **reject** (section 7 screenshot and real devices): test 1 saves an explicit screenshot, which Acceptance checks with `test -s`. The real-device check is a manual Acceptance item. Fake User-Agents are the plan's own local method (goal_ai.txt:195-196).
- B23 **partial** (falsifier: a path reaches its Destination uncounted, or counts twice): tests 2 and 3 assert exact Click deltas for the Adult and Link Shortcut paths. Deeplink gets no separate test (see B19).
- B24 **reject** (falsifier: missing or duplicate pings; Escape reloads inflate the denominator): test 1 asserts exactly +1 Page View per load. Counting an escaped reload as a second Page View is the decided behaviour, with its overturn condition (What counts).
- B25 **partial** (falsifier: Profile B gets A's code, or a fresh Escape context loses it): test 8 covers the first. It was vacuous before, because a Link with Tracking off sends no code (script.js:235). The Stats Profile's Adult Link now has Tracking on. Keeping the code through an Escape is Phase 1's rule and is untouched here.
- B26 **accept** (falsifier: an untrusted header sets the country): the Cutover step overwrites X-Country from CF-IPCountry (see B13).
- B27 **accept** (falsifier: logging exceeds budget, freshness misses, reruns change totals): bounded wait and view-latency trigger (see B16 and B5). A view cannot change totals on a rerun.
- B28 **accept** (falsifier: Creator B or a signed-out caller reads A's data through the API): test 7 now checks direct list and by-id reads (see D2).
- B29 **reject** (v1 gives no historical baseline): none is needed. Every count is checked against controlled journeys with known expected deltas.

Draft call:

- D1 **accept** (one paged request truncates): the Stats page now reads 500 rows a page and follows the pages until it has every row (Contracts → `dailyStats` read). Test 1 reloads Stats with `perPage` forced to 1 through `page.route` and expects the same numbers.
- D2 **accept** (test 5 did not prove the ownership boundary): test 7 is rewritten. With known populated rows, it lists and views `dailyStats` and `events` by id as each Creator and signed out, and it expects an Event create to be refused. The app-endpoint fallback is dropped, because PocketBase's rules are the boundary (ADR 0002).

  Checking the repo also showed that the old test's "Fixture Profile's Creator" does not exist: imported Profiles have no owner (phase-02-vps-foundation.md:140, phase-03-auth-and-editor.md:113, :149). So the seed now gives the Stats Profile and the Other Profile one Creator each, and Depends on no longer claims that login from Phase 3.
- D3 **accept** (ignored filters and broken ranges would pass):
  - Test 2 now makes traffic its assertion must leave out, between its two reads. It expects different deltas with no filter, per Link, and per Link plus country, including Profile-wide Page Views and the filtered CTR.
  - Test 5 checks the ranges and the empty range with `page.clock`. The Stats page now computes its range from the browser's clock.
- D4 **accept** (production country source unresolved; the MaxMind path is not deliverable): one source is chosen, Cloudflare's header. Rung 3: Phase 2 already reads `cf-ipcountry` and plans Cloudflare (phase-02-vps-foundation.md:185, :398). Rung 5: it needs no code and no dependency. Its prerequisite, the human's account and DNS work at Cutover, is in Acceptance. MaxMind moves to Out of Scope, and story 29 now names one source.
- D5 **accept** (an awaited write can stall the Click): the Write path and the Event Recorder now wait at most 300 ms, and story 10 now reads "break or stall". A rejected write is test 11. A stalled write stays untested at this seam, and the spec says why.
- D6 **accept** (stories with no assertion): tests are added for:
  - the Link Shortcut and unknown Ids (test 3; stories 4 and 5);
  - the stored field set (test 6; story 11);
  - no raw Events fetched by the Stats page (every Stats test; story 12);
  - a deleted Link (test 9; story 20);
  - a deleted Profile (test 10; story 28);
  - the empty range (test 5; story 21);
  - the ping limit (test 12; story 27).

  The ping's limit now uses its own counter, keyed by client IP and Username. A shared counter would make every Profile load in every spec spend the Reveal budget that Phase 2's specs are sized against (phase-02-vps-foundation.md:224, :284, :311).

Tally: 14 accept, 9 partial, 12 reject, 0 needs-human.

### Six hats

Six thinking hats on the whole Phase set, 2026-10-02, reconciled in the plan review. Labels follow docs/spec/plan-review.md (W white, R red, K black, Y yellow, G green, U blue). "Owner" is the one Phase that holds the decision.

- **W4** (Phase 5's parity runs against the VPS come after this Phase, so they write test Clicks into real Profiles' Stats) **accept**, owner Phase 5, which clears pre-switch Events after a backup. No change here.
- **W5 / G9** (`v` is already refused by Phase 3's 3-character minimum, so reserving it is redundant) **accept**. The `v` reservation is gone from Owns, Contracts, Depends on and Further Notes.
- **W7** (this spec and Phase 5 both claimed the Caddy `header_up` and `trusted_proxies` lines) **accept**, owner Phase 5. Acceptance's Cutover note now points there.
- **W8** (on a DNS-only Custom Domain a Visitor can send their own `CF-IPCountry`, so the anti-spoofing claim held only on proxied hosts) **accept**, owner Phase 5, which trusts the header only from Cloudflare's ranges. No change here: such a Visitor's Events still record `XX`.
- **W10** (counting by delta cited a reused stack, which Phase 2 turns off) **accept**. The reason is rewritten: Phase 2 starts a fresh stack per run, but this file's tests share Profiles in order, so the deltas stay.
- **R2 / K6 / G2** (Phase 2 serves v1's own script with no copy, this spec called it "Phase 2's port", and Phase 5's readiness step would strip the ping) **accept**, owner here. New decision "Public page copy": this Phase copies the page files it changes into the app, which serves them ahead of v1's directory. Owns, Interfaces, Depends on and Further Notes follow.
- **K3** (the Fixture Profile's Adult Link has no Destination, yet test 8 needs a real Reveal) **accept**, owner Phase 2, which adds `tests/fixtures/secrets.json`. Depends on now names it.
- **K4** (the public PocketBase route is unowned) **accept**, owner Phase 3. Here the allow-list gains `dailyStats`, `events` stays off it, and Operator steps and the `events` rule checks use PocketBase's loopback port (Owns, Testing Decisions, Depends on, Further Notes).
- **G8** (move the per-Profile Tracking Code key into Phase 1) **reject**, rung 2: plan §5 assigns D5 to this Phase. Its cost, v1 keeping the global key until Cutover, is now written under Public page copy.
- **G10** (if the Operator won't take on Cloudflare, stay DNS-only and accept the US and `XX` fallback) **reject**: no change, because the Cloudflare ASSUMPTION in Further Notes already covers it. Without Cloudflare, production Events keep recording `XX`, and MaxMind becomes a parked follow-up.
