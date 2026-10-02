# Phase 04 — Stats

**Objective.** A signed-in Creator's Stats page shows their own Profile's Page Views, Clicks and CTR (click-through rate) per Link, per UTC day and per country, counted from Profile loads, `/r/:linkId` redirects and Reveals, and every Tracking Code stays with the Profile it arrived on.

## Problem Statement

A Creator sends Instagram and TikTok traffic to their Profile and cannot tell what that traffic does. v1 counts nothing (plan section 1: "NOT present: ... click/visit counting"). The Creator cannot see how many Visitors opened the Profile, which Links they followed, on which days, or from which countries. The only numbers they get come from OnlyFans, through the `/c{code}` Tracking Code, and those count subscribers, not Clicks.

The attribution is also unreliable. v1 keeps one global Tracking Code in the Visitor's browser: it writes `localStorage` key `linkme_tracking_id` (linkme_clone3/script.js:55) and reads it back on every Profile, both for a Link Shortcut (script.js:91) and when the Age Gate's Continue is pressed (script.js:236). Suppose a Visitor arrives on one Creator's Profile with a code and later opens another Creator's Profile. The first code goes along, and OnlyFans credits the second Creator's subscriber to a source that belongs to the first (D5: "contaminates attribution across profiles"). ofl.ink keeps its origin at Cutover, so Visitors' browsers will still hold v1's global code when v2 starts serving them.

## Solution

v2 records an Event:

- each time a Visitor loads a Profile (a Page View);
- each time a Visitor follows a Link (a Click), whether the Destination comes from the `/r/:linkId` redirect or from Reveal.

An Event holds only these things: Page View or Click, the Profile, the Link, the Visitor's country, the In-App Browser it came from, and the time.

The creator-only area gets a Stats page next to the Editor, styled after the link.me Template's analytics page (link.me/analytics.html). It has:

- a Today / 7D / 30D range;
- Page Views, Clicks and CTR totals;
- a per-day panel;
- a per-Link table and a per-country table;
- a Link filter and a country filter that narrow every panel, so that "Clicks on this Link, per day, from this country" can be read directly.

A Creator sees only their own Profile's Stats.

A Tracking Code now stays with the Profile it arrived on and can no longer leak into another Creator's Destination. The `/c{code}` suffix on OnlyFans Destinations keeps working as before.

Under the amendment (plan section 8), v2's public page script has been v2's own copy since Phase 0. This Phase edits that copy in place. v1's script.js is not forked or copied, and run 1's "v2 serves its own page script" prefactor no longer exists. v1 gets neither the Page View ping nor the per-Profile Tracking Code key (ADR 0005).

## User Stories

1. As a Creator, I want every load of my Profile counted as one Page View, so that I know how many Visitors saw it.
2. As a Creator, I want every Click that goes through `/r/:linkId` counted, so that I know which of my non-Adult Links Visitors follow (in v2 they all go through `/r/{id}`, plan section 9).
3. As a Creator, I want a Click on an Adult Link counted when Continue on the Age Gate triggers its Reveal, so that my OnlyFans Link, usually the one that matters most, is not missing from Stats.
4. As a Creator, I want a Link Shortcut (`?link=`) that triggers a Reveal on page load counted as a Click, so that Clicks from Links I share directly are not lost.
5. As a Creator, I want an unknown Link Id, and a Reveal that is refused, rate-limited or fails, to record nothing, so that broken or guessed URLs do not inflate my Clicks.
6. As a Creator, I want each Page View and Click to carry the Visitor's country, so that I can see where my audience is.
7. As a Creator, I want traffic whose country is unknown shown as "Unknown", not guessed as US the way v1's Geo Rule code does (geo_utils.js:48), so that my country numbers are honest.
8. As the Operator, I want each Event to record the In-App Browser it came from (Instagram, Facebook, Threads, TikTok or none), so that I can judge in PocketBase's admin UI how much traffic arrives in-app and whether Escapes work.
9. As the Operator, I want Events stored in PocketBase beside Profiles and Links (D5), so that Stats need no extra service.
10. As a Visitor, I want recording an Event never to break my Click and never to hold it up for more than a moment, so that a failing Event store never costs the Creator a subscriber.
11. As a Visitor, I want no IP address, raw User-Agent string, referrer or Visitor identifier stored, so that being counted does not mean being followed.
12. As a Creator, I want my Events summed per day, Link and country before they reach my Stats page (the plan's "daily aggregation"), so that the page loads a small summary rather than every raw Event.
13. As a Creator, I want a Stats entry in my signed-in area, next to the Editor, so that I find my numbers where I edit my Links.
14. As a Creator, I want Page Views, Clicks and CTR totals for Today, the last 7 days and the last 30 days, so that I can judge a period at a glance.
15. As a Creator, I want Page Views and Clicks per day, so that I can see which days my posts drove traffic.
16. As a Creator, I want Clicks and CTR per Link, so that I know which Links work.
17. As a Creator, I want Page Views, Clicks and CTR per country, so that I know which countries convert.
18. As a Creator, I want to narrow every panel to one Link and/or one country, so that I can read Clicks per Link per day per country (the plan's Phase 4 DONE).
19. As a Creator, I want the newest Events included as soon as I open or reload Stats, so that I can check a fresh post right away.
20. As a Creator, I want a deleted Link's past Clicks to stay in my totals under "Deleted link", so that tidying my Profile does not rewrite my history.
21. As a Creator, I want an empty range to say plainly that nothing was recorded yet, so that a new Profile does not look broken.
22. As a Creator, I want the Stats page mobile-first and in the look of the link.me Template's analytics page, like the Editor, so that I can check it on my phone.
23. As a Creator, I want only my own Profile's Stats visible to me, so that no other account holder can read my numbers. Anyone may sign up (plan section 9, D9).
24. As a Creator, I want nobody who is signed out able to read any Event or Stats row through PocketBase's API, so that my traffic stays private.
25. As a Creator, I want a Tracking Code that arrived in my Profile URL to stay with my Profile, so that a Visitor who later opens another Creator's Profile does not carry my code into that Creator's Destination.
26. As a Creator, I want v2 to ignore the code that v1's global key left in Visitors' browsers, so that those leftovers credit no one after Cutover.
27. As a Creator, I want the `/c{code}` suffix on my OnlyFans Destination to keep working (D5), so that OnlyFans keeps crediting subscribers to my sources.
28. As a Creator, I want the Tracking Code to survive an Escape exactly as Phase 1 left it (plan section 4), so that moving to the System Browser does not lose my attribution.
29. As the Operator, I want the Page View ping rate-limited, so that nobody can flood Events and fill the server's disk.
30. As the Operator, I want a Profile's Events deleted along with the Profile, so that they never block the deletion.
31. As the Operator, I want the exact commands for the production country source written down, so that I can switch on real country numbers at Cutover and undo it with one command.
32. As the Operator, I want local tests to set the Visitor's country through a request header, so that country Stats are tested without any account, download or network.
33. As the Operator, I want a real-device step in RUN.md, so that I can confirm that a phone inside Instagram is recorded as Instagram.
34. As the Operator, I want a screenshot of the Stats page saved where I can glance at it (plan section 7), so that I can judge the look without running anything.

## Implementation Decisions

- **Owns.**
  - New:
    - **Event Recorder**, in the app container.
    - **Page View Ping route**, in the app.
    - **One additive PocketBase migration.** It gives Phase 2's `events` collection its fields, rules, Profile cascade and index, and adds the new `dailyStats` view collection.
    - **Stats page**, plus a "Stats" entry in the navigation of the creator-only area.
  - Modified:
    - `/r/:linkId` and Reveal (Phase 2), which now record a Click.
    - The public page script, v2's own copy since Phase 0. It now sends the ping and keeps Tracking Codes per Profile.
    - Phase 3's same-origin PocketBase proxy, whose allow-list gains `dailyStats`.
    - Phase 2's seed, which gains two Creators with one Profile each.
  - New spec: `tests/e2e/04-stats.spec.ts`.

- **No page-script fork.** Run 1 had to copy v1's script.js into the app at this Phase, because until then v2 served v1's own files. Under the amendment, v2's page has been its own copy since Phase 0, and Phase 1's Mode and Escape changes are already in that copy. This Phase edits the copy and adds no new file to serve. Nothing in `linkme_clone3/` changes (ADR 0005).

- **Interfaces.**
  - **Event Recorder** exposes two calls: *record Page View* (request, Profile) and *record Click* (request, Profile, Link). Each call:
    - works out the Visitor's country and In-App Browser from the request (see Contracts);
    - writes one Event through the app's privileged PocketBase access;
    - never throws: a failed or late write is logged and swallowed (see Write path).
  - **`/r/:linkId`** looks the same from outside: it redirects to the Destination. Once the Link resolves, it records a Click before redirecting. An unknown Link Id still gets 404 and records nothing.
  - **Reveal** looks the same from outside. It records a Click each time it returns a Destination. It records nothing when it answers 404, refuses the origin or rate-limits.
  - For any one Click, exactly one of the two endpoints hands out the Destination, so no Click is counted twice.

    ASSUMPTION: a Reveal counts as a Click (CONTEXT.md, "Click"), although the plan names only `/r/:linkId` and the ping as writers. Without this, every Adult Link Click would be missing from Stats. Work the plan needs, flagged. Overturned if Stats should count redirects only.
  - **Page View Ping route**: `POST /v/{username}` (contract below).
  - **Public page script** (v2's copy):
    - sends the ping once per page load, after the Profile has rendered, and never for an unknown Username;
    - stores the Tracking Code under a per-Profile key (see Contracts);
    - keeps Phase 1's rule that the Tracking Code stays in the URL during an Escape, untouched.
  - **Stats page**:
    - lives in Phase 3's creator-only area and reaches PocketBase the way the Editor does, through the allow-listed same-origin proxy;
    - adds a "Stats" navigation entry next to the Editor.

- **Schema.**

  ```
  events          Phase 2's collection; list/view/create/update/delete rules: none (superusers only)
    kind          select   page_view | click
    profile       relation profiles, single, required, cascade delete
    link          relation links, single, optional, no cascade   empty on Page Views; PocketBase clears it when the Link is deleted
    country       text     two uppercase letters; "XX" = unknown
    inAppBrowser  text     instagram | facebook | threads | tiktok, or empty
    created       autodate on create (UTC)
    index         (profile, created)

  dailyStats      view collection; list and view rule: profile.owner = @request.auth.id
    one row per (profile, link, country, day); row id unique per row
    day     = UTC calendar date of created, "YYYY-MM-DD"
    views   = count of kind = page_view        clicks = count of kind = click
    link    stays a relation; empty on rows holding Page Views, or Clicks on deleted Links
  ```

  - Only the app writes Events. Visitors have no create rule.
  - The fields above are the whole record. No IP address, User-Agent string, referrer or Visitor identifier is stored.
  - The migration never renames, retypes or drops anything Phase 2 defined.

  ASSUMPTION: the plan has Phase 2 create the `events` collection (section 5) but lists no fields for it. So this Phase's migration adds each field above that is missing, under the name and type shown, and keeps any field Phase 2 already defined. Rung 4: additive. Overturned if Phase 2's `events` already has these fields under other names; the Event Recorder and `dailyStats` then use those names.

  ASSUMPTION: D5's "logs user" means the Creator, reached through the Event's Profile and that Profile's owner. It does not mean a Visitor identifier, which story 11 rules out. Rung 5. Overturned if the plan author meant a per-Visitor id. That would make de-duplication possible and would also need a privacy decision.

  ASSUMPTION: the Profile's owner relation is called `owner`. D2 states the rule as `user = @request.auth.id` but names no field, so the rule above uses whatever name Phase 2 or Phase 3 gives that relation (rung 3). Overturned by the actual field name.

  ASSUMPTION: Events are deleted with their Profile. PocketBase refuses to delete a record that a required relation points to, and a deleted Profile's Stats have no reader. A deleted Link's Clicks are kept (rung 4: keep data). Overturned if the Operator wants a deleted Profile's Events kept.

  ASSUMPTION: the "daily aggregation" is the `dailyStats` view, which SQLite computes on every read, not a scheduled job writing a rollup table. Rung 4: the view holds no state and can be dropped without loss. Rung 5: no job to run. Because nothing aggregated is stored, there is nothing to rerun or backfill and no late arrivals to handle. Overturned if a 30D `dailyStats` read for the busiest Profile takes over one second on the VPS (rung 6 for the number). A nightly job would then fill a table of the same shape, and the Stats page would not change.

  ASSUMPTION: days are UTC calendar days, labelled "UTC" on the page (rung 5). Overturned if Creators need their local day, which means a per-Creator time zone.

- **Contracts.**
  - **Page View Ping.** `POST /v/{username}`, no body, sent with `fetch` and `keepalive`.
    - Answers 204 when the Event is recorded.
    - Answers 404 for an unknown Username.
    - Answers 429, as Reveal does, when over the limit.
    - The route takes only POST. A GET of `/v/...` still reaches the Profile route as before, so no Username needs to be reserved.

    ASSUMPTION: the path mirrors the plan's `/r/` shape, and v1's page already uses `fetch` (script.js:105, :250), whose response a test can wait for (rung 3). `keepalive` lets the ping finish when a Visitor leaves at once. Overturned if Phase 2 gives the app's endpoints a common prefix; the ping then moves under it.

    ASSUMPTION: the ping uses Reveal's limiter code and its per-minute threshold (a Phase 2 setting), with its own fixed-window counter keyed by client address and Username. The client address is found the same way Reveal's limiter finds it. A shared counter would let Page Views use up a Visitor's Reveals, and would let other specs' Profile loads rate-limit this Phase's Profiles. Rung 3 for the code, rung 5 for the key. Overturned if one address floods pings across many Profiles; the key then drops the Username.
  - **Visitor country.**
    - Read from the `CF-IPCountry` request header only, uppercased.
    - Anything that is not two letters A–Z, or a missing header, records `XX`. This covers Cloudflare's own `XX` and `T1` (Tor).
    - It never falls back to US: v1's US default (geo_utils.js:48) belongs to Geo Rules only.
    - Local tests inject the header through Playwright's `extraHTTPHeaders`.

    ASSUMPTION: D5's two country sources both need the human, and this Phase chooses the Cloudflare header over VPS geo-IP. Rung 3: v1 also takes the country from its edge's request header (geo_utils.js:48). Rung 5: a header needs no account, licensed download, dependency or lookup code. Overturned if the Operator will not proxy ofl.ink through Cloudflare; MaxMind then becomes a parked follow-up (account, download, new dependency).

    ASSUMPTION: v1's Geo Rule reads `x-country`. If Reveal's Geo Rule (Phase 2) keeps reading it, a Click's recorded country and the Tracking Code its Geo Rule picked can disagree. This Phase does not change Reveal's lookup (rung 4: leave the other Phase's code alone). Overturned if Phase 2 has a Visitor location lookup that reads a Cloudflare header. The Event Recorder then calls that lookup and maps its US fallback to `XX`.
  - **In-App Browser.** Classified from the request's User-Agent with plan section 4's patterns; the first match wins:
    - `Threads` → threads
    - `Instagram` → instagram
    - `FBAN|FBAV` → facebook
    - `musical_ly|Bytedance|TikTok` → tiktok
    - anything else → empty

    A load after an Escape comes from the System Browser and records empty. The Operator compares the two kinds of load to judge whether Escapes work.

    ASSUMPTION: Threads is checked before Instagram in case Threads' User-Agent also says Instagram (rung 6 for the order). Overturned by real-device User-Agents.
  - **Tracking Code storage.**
    - One `localStorage` entry per Username, keyed `linkme_tracking_id:{username}`. A code that arrived on Profile A is never sent with a Reveal on Profile B.
    - v1's global key is ignored, not migrated.
    - Only the key changes. As in v1, a code is sent only for a Link with Tracking on, the Profile's stored code wins over the Link's default code, and a stored code does not expire (script.js:90-101, :235-247).
    - Reveal's resolver (Phase 2) still turns the code into `/c{code}`, as v1's reveal.js:9-37 does.

    ASSUMPTION: v1's global key is ignored rather than adopted, because at Cutover it may hold another Creator's code (rung 4: nothing stored is rewritten). Overturned if the Operator wants leftover codes honoured on the Profile they came from. That cannot be known, because v1 never stored which Profile a code came from.
  - **`dailyStats` read.**
    - The Stats page lists the chosen range's `dailyStats` rows, 500 to a page, and requests the next page until it has every row.
    - It sends no Profile filter, so the list rule alone decides which rows a Creator sees.
    - Link names come from the Creator's own Links, read the way the Editor reads them.

    ASSUMPTION (evidence blocked): 500 is within the pinned PocketBase release's page-size cap (no network to check the release). Overturned by that cap; the paging loop keeps totals right at any page size.

- **Write path.** The Event write is awaited for at most 300 ms. Past that, the redirect or Reveal answers anyway, and the write's outcome is only logged. Errors are logged and swallowed.

  ASSUMPTION: a bounded wait, neither fire-and-forget nor an unbounded await. A local PocketBase insert takes milliseconds, so tests see exact counts, and a stalled write delays a Click by at most 300 ms (rung 6 for the number). Overturned if redirect latency measurably grows.

- **What counts.**
  - Every Profile load is one Page View. That includes the second load when a Visitor follows the Escape Overlay's "open in browser" instruction.
  - Every Destination handed out by `/r` or Reveal is one Click, whatever the Link's Mode. Double taps count, and a Mode that fetches the Destination twice counts twice.
  - A closed Age Gate, an unknown Link Id, and a refused or rate-limited Reveal hand out nothing and count nothing.
  - The Creator's own visits count.

  ASSUMPTION: no de-duplication, because without a Visitor identifier, which D5 does not log, none is possible (rung 5). Overturned if Escape Mode Profiles show a visibly deflated CTR; escaped loads would then be marked in the URL and skipped.

- **Stats page.** Each part follows a section of the link.me Template's analytics page:
  - **Range tabs.** Today, 7D (the default) and 30D, in UTC days, with the date span shown, as in the template's Overview tabs. The browser computes the range from its own clock.
  - **Filters.** Link (all Links, each Link, "Deleted link") and Country (all, or each country seen in the range). Both apply to every panel.
  - **Cards.** Page Views, Clicks and CTR, in place of the template's Profile Views, Link Clicks and Engagement Rate.
  - **Daily panel.** Page Views and Clicks for each day in the range, as bars with numbers, in place of the template's Traffic Overview.
  - **Links table.** Link, Clicks and CTR, most-clicked first, in place of the template's Top Web Links.
  - **Countries table.** Country, Page Views, Clicks and CTR, most Page Views first, in place of Geographic Analytics → Countries. Countries show as two-letter codes, as in the template, and `XX` shows as "Unknown".
  - **CTR.** Clicks ÷ Page Views for the same range and filters, as a percentage with one decimal, or "—" when there are no Page Views. Page Views belong to the Profile, not to a Link. So under a Link filter, Page Views stay Profile-wide and CTR is that Link's Clicks over them.
  - **Empty range.** A range with no rows reads "No Page Views or Clicks in this range yet."
  - **Freshness.** Numbers are as of page load. There is no auto-refresh.
  - **Accessibility.** Every number sits under an accessible label (card names, table column headers), so a spec can read it by role.

  ASSUMPTION: no chart library. The bars are plain elements sized by value (rung 5, and a new dependency would need a network fetch). Overturned if the human wants real charts, which is a parked install.

  ASSUMPTION: the layout is mobile-first like the Editor (rung 3; plan section 6, "simplistic layout UI"). Overturned by a separate brief for Stats.

- **Seed.** Phase 2's seed gains two Creators. Each has a known test password in the test stack's environment and one Profile.
  - The **Stats Creator**'s **Stats Profile** has a Direct Mode Link and an Adult Link. The Adult Link has Tracking on, no Geo Rule and no default Tracking Code.
  - The **Other Creator**'s **Other Profile** has the same two Links.
  - Every Destination is on a `.test` host (reserved by RFC 6761), which the spec stubs.
  - Only this Phase's spec visits these two Profiles, so other specs running in parallel cannot disturb their counts.

  ASSUMPTION: two seeded Creators are an additive change that two-sided ownership needs (rung 4). The Adult Links have Tracking on so that the Tracking Code test can fail (script.js:235 sends a code only when `link.tracking` is set). Overturned if Phase 2 or Phase 3 already seeds Creators with Profiles; this Phase then reuses them.

## Testing Decisions

- **Seam: one.** The existing Playwright loop, `./check.sh` → `npx playwright test`, runs against Phase 2's compose stack at `baseURL`. Nothing below it is mocked, and no unit-test seam is added.
  - The spec is `tests/e2e/04-stats.spec.ts`. It runs serially, in the order below.
  - Every Visitor is a fresh browser context. The country is set through `extraHTTPHeaders` (`CF-IPCountry`), and a fake User-Agent is used where needed (plan section 7).
  - Creator calls and signed-out calls to PocketBase's records API go through the same origin, as the Stats page's do. Operator steps use PocketBase's own API on its loopback port, with the superuser credentials from the test stack's environment.

  ASSUMPTION: the Operator steps reach PocketBase on a loopback port, and the rule checks run against PocketBase itself, because its rules are the security boundary (ADR 0002). Rung 3. Overturned if Phase 2's test stack exposes PocketBase elsewhere; the spec then uses that address.

  ASSUMPTION: the test stack's Reveal threshold allows this file's traffic: about 15 pings and 10 Clicks per minute on one Profile from one address (rung 5). Overturned if the threshold is lower; the ping then gets a threshold setting of its own.
- **Counting by delta.** Outside CI, Playwright reuses an already-running server (playwright.config.ts:13), and the tests in this file share Profiles. So each test reads Stats before and after acting and asserts the difference.
  - Between its two reads, a test also makes traffic that its assertion must leave out, so an ignored filter changes the number.
  - A run that straddles 00:00 UTC can fail a daily-row assertion; rerun it.
- **Destinations are stubbed.** Navigation to any host other than `baseURL` is fulfilled with a stub through `page.route`, so no test leaves the machine. Before a Visitor acts, the spec waits for the ping's 204, or for the redirect or Reveal response.
- **No raw Events in the page.** Every test that opens Stats asserts that the page requested nothing from the `events` collection (story 12).
- **Tests.**
  1. **Page View and Click reach Stats.** A Visitor with country `SI` loads the Stats Profile and clicks its Direct Mode Link. Signed in as the Stats Creator, Stats → 7D shows +1 in each of:
     - the Page Views card and the Clicks card;
     - today's daily row;
     - that Link's row;
     - the `SI` country row.

     The CTR text equals Clicks ÷ Page Views as displayed. The page is then reloaded with every `dailyStats` request's `perPage` rewritten to 1 through `page.route`, and the cards and both tables must read the same. The test saves `.scratch/goal_ai/shots/04-stats.png`. (Stories 1, 2, 6, 13–17, 19, 34.)
  2. **Adult Link, filters and filtered CTR.** Between the two reads:
     - an `SI` Visitor clicks the Adult Link and passes the Age Gate;
     - an `SI` Visitor clicks the Direct Mode Link;
     - a `DE` Visitor clicks the Adult Link and passes the Age Gate.

     Stats → 7D then shows:
     - no filter: Page Views +3, Clicks +3;
     - Link = Adult Link: Clicks +2, Page Views still +3;
     - Link = Adult Link and Country = `SI`: Page Views +2, and Clicks +1 on the card and in today's daily row.

     Every CTR shown equals Clicks ÷ Page Views as displayed. (Stories 3, 18.)
  3. **The Link Shortcut counts; unknown Ids do not.** Between the two reads:
     - a Visitor opens the Stats Profile with `?link={its Direct Mode Link's Id}` and lands on the stub;
     - `GET /r/{unknown Id}` answers 404;
     - a Reveal for an unknown Link Id answers 404.

     Clicks rise by exactly 1, all of it on the Direct Mode Link's row. (Stories 4, 5.)
  4. **Unknown country.** One Visitor sends no country header and another sends `CF-IPCountry: T1`; both load the Stats Profile. The Countries table's "Unknown" row shows +2 Page Views, and no `US` or `T1` row gains any. (Story 7.)
  5. **Ranges and the empty range.** The Stats Creator reads the Today, 7D and 30D tabs. Each shows its UTC date span: 1, 7 and 30 days ending today. The Creator then reopens Stats with the browser clock moved one day ahead through `page.clock`, leaving the server's clock untouched.
     - Today reads "No Page Views or Clicks in this range yet."
     - 7D and 30D each list the real today's date, with the Page Views and Clicks the Today tab showed before the move.

     (Stories 14, 21.)

     ASSUMPTION (evidence blocked): a Creator session issued at real time stays valid in a browser whose clock is one day ahead, because PocketBase's default token lifetime is longer than a day (no network to check the pinned release). Overturned by a shorter lifetime; the test then signs in again after moving the clock.
  6. **In-App Browser recorded, nothing else stored.** A Visitor loads the Stats Profile once with each of five User-Agents: Instagram, Facebook (`FBAN`), Threads, TikTok and desktop Chrome. For each load, the newest Event for that Profile, read with the Operator's credentials, has `inAppBrowser` instagram, facebook, threads, tiktok or empty, respectively. Read the same way, the `events` collection's fields are exactly `id`, `kind`, `profile`, `link`, `country`, `inAppBrowser` and `created`. (Stories 8, 9, 11.)
  7. **Owner only.** Each Creator first records a Page View on their own Profile. Then, through PocketBase's records API:
     - with the Stats Creator's token, every listed `dailyStats` row belongs to the Stats Profile, and viewing a known Other Profile row by its id answers 404. The same holds the other way round.
     - with either Creator's token, and signed out, listing or viewing `events` returns no record, and creating an Event is refused.
     - signed out, listing `dailyStats` returns no items.

     In the UI, the Other Creator's Stats page names none of the Stats Profile's Links. (Stories 23, 24.)
  8. **A Tracking Code stays with its Profile.** The Visitor's context starts with v1's global `linkme_tracking_id` = 999 already in `localStorage`. The Visitor:
     - opens `/{Other Profile's Username}/123` and follows its Adult Link; the Destination ends in `/c123`;
     - then opens the Stats Profile and follows its Adult Link. That Reveal request carries no Tracking Code, and its Destination has neither `/c123` nor `/c999`.

     (Stories 25, 26, 27.)
  9. **A deleted Link keeps its Clicks.** The Operator creates a Link with a stub Destination on the Stats Profile. A Visitor opens `/r/{its Id}`, then the Operator deletes the Link. The Links table's "Deleted link" row shows +1 Click, and the Clicks card shows the same total as just before the delete. (Story 20.)
  10. **A deleted Profile takes its Events.** The Operator creates a throwaway Profile. A Visitor loads it and its ping answers 204. The Operator then deletes the Profile. The delete succeeds, and no Event for that Profile remains. (Story 30.)
  11. **A failed Event write does not block a Click.** The Operator adds a temporary required field to `events`, so that every Event write fails. A Visitor clicks the Stats Profile's Direct Mode Link and reaches the stub Destination. A `finally` step removes the field. (Story 10.)

      ASSUMPTION (evidence blocked): adding a required field to a populated collection through the superuser API makes later inserts without that field fail (no network to check the pinned release). Overturned if that release refuses the change; the test then narrows the `kind` select so that the app's values fail.
  12. **The ping is rate-limited.** The Operator creates a throwaway Profile with a Username unique to this run. Pings to it reach 429 within the Reveal threshold + 1 requests, using the value from the test stack's environment. Right after that, a ping for the Stats Profile still answers 204, and `/r` for its Direct Mode Link still redirects. The throwaway Profile is then deleted. Because each run uses a fresh Username, a reused stack's exhausted window cannot leak into the next run. (Story 29.)

  A stalled write has no automated test. The seam cannot stall one PocketBase insert without a test-only fault switch, and this Phase adds none; the 300 ms bound in the Event Recorder is the guarantee. Story 28 is Phase 1's rule and Phase 1's test. This Phase changes only the storage key, and test 8 shows that a code arriving in the URL is still stored and used. Stories 31 and 33 are the manual lines in Acceptance; story 22 is the screenshot glance.
- **Prior art.** `tests/e2e/00-smoke.spec.ts` already uses each technique this spec needs:
  - a fake Instagram User-Agent through `test.use`;
  - `page.route` to stop a Destination from being followed (00-smoke.spec.ts:33-36);
  - role-based assertions.

  `playwright.config.ts:7` already writes into `.scratch/goal_ai/shots`.

## Acceptance

```sh
# Playwright's webServer starts Phase 2's compose stack with its seed (plan section 7).
test -f tests/e2e/04-stats.spec.ts
./check.sh tests/e2e/04-stats.spec.ts
test -s .scratch/goal_ai/shots/04-stats.png
# manual: glance at .scratch/goal_ai/shots/04-stats.png. It should read like link.me/analytics.html:
#         range tabs with a date span, three cards, daily bars, a Links table and a Countries table.
# manual (RUN.md, real device): in Instagram on a phone, open a Profile on v2's VPS host. In PocketBase's admin UI
#         the newest Event for that Profile shows inAppBrowser = instagram (and country XX until the step below).
# manual, at Cutover, with Phase 5's DNS switch. Production country source = Cloudflare's CF-IPCountry.
#   Needs: a Cloudflare account, an API token with Zone:Edit + DNS:Edit, ofl.ink's registrar login, the VPS address.
#   export CF_API_TOKEN=<token> CF_ACCOUNT_ID=<account id> VPS_IP=<vps address>
#   CF=https://api.cloudflare.com/client/v4; H1="Authorization: Bearer $CF_API_TOKEN"; H2='Content-Type: application/json'
#   # 1. zone (skip if ofl.ink is already a Cloudflare zone); then set result.name_servers at the registrar:
#   curl -sX POST "$CF/zones" -H "$H1" -H "$H2" --data "{\"name\":\"ofl.ink\",\"account\":{\"id\":\"$CF_ACCOUNT_ID\"},\"type\":\"full\"}"
#   export CF_ZONE_ID=<result.id>
#   # 2. record, DNS-only first, so that Caddy gets ofl.ink's certificate directly:
#   curl -sX POST "$CF/zones/$CF_ZONE_ID/dns_records" -H "$H1" -H "$H2" \
#     --data "{\"type\":\"A\",\"name\":\"ofl.ink\",\"content\":\"$VPS_IP\",\"proxied\":false,\"ttl\":1}"
#   export CF_RECORD_ID=<result.id>   # wait until https://ofl.ink answers from v2 with a valid certificate
#   # 3. settings, then proxy on:
#   curl -sX PATCH "$CF/zones/$CF_ZONE_ID/settings/ssl" -H "$H1" -H "$H2" --data '{"value":"strict"}'
#   curl -sX PATCH "$CF/zones/$CF_ZONE_ID/settings/ip_geolocation" -H "$H1" -H "$H2" --data '{"value":"on"}'
#   curl -sX PATCH "$CF/zones/$CF_ZONE_ID/dns_records/$CF_RECORD_ID" -H "$H1" -H "$H2" --data '{"proxied":true}'
#   # 4. verify: expect 204, then the newest Event for that Profile (admin UI) shows this machine's real country, not ZZ:
#   curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'CF-IPCountry: ZZ' https://ofl.ink/v/<a Username>
#   #    then open a Profile on a phone on mobile data: its Page View appears in that Creator's Stats.
#   # rollback (every Event records XX again):
#   curl -sX PATCH "$CF/zones/$CF_ZONE_ID/dns_records/$CF_RECORD_ID" -H "$H1" -H "$H2" --data '{"proxied":false}'
#   # Repeat steps 2-4 for each Spare Domain in its own zone. A Custom Domain that Cloudflare does not proxy records XX.
./check.sh
```

## Depends on

- **Phase 0.** Provides v2's own copy of the public page script (plan section 8), which this Phase edits in place.
- **Phase 1.** Provides, in that copy:
  - Mode and the Escape;
  - client-side In-App Browser detection;
  - the rule that keeps the Tracking Code in the URL during an Escape (plan section 4).

  The per-Profile Tracking Code key belongs to this Phase, by rung 2: plan section 5 lists D5 under Phase 4, and Phase 1's list does not include the key.

  ASSUMPTION: Phase 1 leaves the Tracking Code under v1's single global key. The plan does not list that change for Phase 1, but Phase 1's actual build cannot be observed yet. Overturned if Phase 1 already keys the code per Profile; this Phase then keeps only test 8.
- **Phase 2.** Provides:
  - PocketBase, the app container and the app's privileged PocketBase access;
  - the `users`, `profiles`, `links` and `events` collections (plan section 5);
  - `/r/:linkId`, which every non-Adult Link goes through (plan section 9);
  - Reveal, with its Geo Rule, `/c{code}` resolver and rate limiter, and the client address that limiter uses;
  - the compose stack and its seed with the Fixture Profile;
  - Playwright's webServer switched to `docker compose up` (plan section 7);
  - the test stack's environment, holding the superuser credentials and Reveal's threshold;
  - PocketBase reachable from tests on a loopback port.
- **Phase 3.** Provides:
  - Creator login;
  - the creator-only area and its navigation, where Stats sits next to the Editor;
  - the allow-listed same-origin PocketBase proxy, to which this Phase adds `dailyStats` (`events` stays off the list);
  - the owner relation on `profiles` that the `dailyStats` rule names.

## Out of Scope

- **The ping or the per-Profile key in v1.** v1 is untouched (plan section 8, ADR 0005). It keeps its global key until Netlify is switched off after Cutover.
- **A page-script fork or a second copy.** v2's page has been its own copy since Phase 0.
- **Real-time panel, "Live" badge, 30-second refresh.** The plan asks for numbers by day.
- **Period comparison, % change, Total Interactions, Engagement Rate, Activity Distribution, hourly pattern, cities, world map.** These are template extras outside "per-link clicks + page views, by day and country" (plan section 6).
- **Traffic Sources by referrer.** D5 does not log the referrer, and story 11 forbids it.
- **An In-App Browser breakdown on the Stats page.** D5's dashboard is views, clicks and CTR per Link per day per country. The Operator reads In-App Browser in PocketBase's admin UI.
- **Unique Visitors and de-duplication.** Both need a Visitor identifier, which D5 does not log.
- **Bot filtering.** The ping needs JavaScript, which keeps out most crawlers. Link previewers that hit `/r/` will count. Revisit if the numbers look inflated.
- **Excluding the Creator's own visits.** Not asked for.
- **Stats per Tracking Code.** D5 keeps `/c{code}` for OnlyFans attribution, and OnlyFans reports on it itself.
- **US state or region on Events.** Geo Rules use it, but D5 logs country only.
- **Custom date ranges, CSV export.** Not asked for.
- **Operator-wide Stats across Profiles.** PocketBase's admin UI already shows every Event to the Operator.
- **Event retention and pruning.** At about 27 Profiles, SQLite holds years of Events. Revisit if disk use grows.
- **A scheduled rollup job or table.** The `dailyStats` view meets "daily aggregation" (see Schema).
- **Per-Creator time zones.** Days are UTC (see Schema).
- **VPS geo-IP (MaxMind).** It needs an account, a licensed download, a new dependency and lookup code. Cloudflare needs none of these (see Visitor country).
- **Caddy lines that rewrite or strip country headers.** The app reads `CF-IPCountry` directly. A Visitor who bypasses Cloudflare can only set the country of their own Events, which fake pings could inflate anyway.
- **A Deeplink or Escape Mode counting matrix.** Clicks are counted where `/r` or Reveal hands out the Destination, whatever the Mode. Phase 1 tests each Mode's path.
- **Umami.** The plan lists it as a Bonus "if PocketBase stats are not enough".
- **A chart library.** It is a new dependency, and plain bars meet the brief.

## Further Notes

ASSUMPTION: Reveal's and the ping's rate limits must key on the Visitor's address once the records are Proxied, not on Cloudflare's. Behind the proxy every request comes from a Cloudflare address, so many Visitors would share one window and get 429s on Reveal and on the ping. This Phase changes nothing about how the client address is found: the ping reads it exactly where Reveal's limiter does, so one fix covers both (rung 5). Before the proxy is switched on, whoever holds the Caddyfile at Cutover (Phase 2's file) takes the client address from `CF-Connecting-IP`, but only for peers in Cloudflare's published ranges (`curl -s https://www.cloudflare.com/ips-v4 https://www.cloudflare.com/ips-v6`). In Caddy that is the global `servers { trusted_proxies static <ranges>; client_ip_headers CF-Connecting-IP }`. If the phone check in Acceptance step 4 fails, the rollback command undoes the proxy. Overturned if Phase 2 or Phase 5 already owns the client address behind Cloudflare; this note then only points at their step.

ASSUMPTION (evidence blocked): Cloudflare overwrites any `CF-IPCountry` a client sends, and the zone settings `ssl` = `strict` and `ip_geolocation` = `on`, plus the zone and DNS-record calls in Acceptance, match the current Cloudflare v4 API. There is no network to check the reference. Acceptance step 4's `ZZ` probe tests the first part. Overturned by the API reference or by that probe; if the probe reads `ZZ`, Caddy must drop the client's `CF-IPCountry` for peers outside Cloudflare's ranges.

ASSUMPTION (evidence blocked): it is unknown whether ofl.ink is already a Cloudflare zone, because checking its name servers is a network lookup. Acceptance step 1 is skipped if it is. Overturned by `dig NS ofl.ink` showing Cloudflare name servers.

ASSUMPTION: the record is DNS-only until Caddy holds ofl.ink's certificate, and only then Proxied with SSL "Full (strict)". That way Caddy's own certificate issuance never has to pass through Cloudflare (rung 4: each step can be undone on its own). Overturned if Phase 5 issues certificates another way, such as a Cloudflare origin certificate. Step 2's wait then falls away.

ASSUMPTION: until Cutover every production Event records `XX`, because v2 has no live traffic before then and nothing proxies it. This costs nothing (rung 5). Overturned if the Operator wants real country numbers on v2's VPS host before Cutover; that host then needs its own Proxied record.
