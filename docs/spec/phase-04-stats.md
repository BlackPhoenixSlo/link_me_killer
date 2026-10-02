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
2. As a Creator, I want every Click that goes through `/r/:linkId` counted, so that I know which of my non-Adult Links Visitors follow. In v2, non-Adult Links in Direct or Escape Mode go through `/r/{id}`; Links in Deeplink Mode, Adult or not, go through Reveal (Phase 2 spec, Contracts: Profile JSON `url`), and story 3's Reveal counting covers them.
3. As a Creator, I want a Click on an Adult Link counted when Continue on the Age Gate triggers its Reveal, so that my OnlyFans Link, usually the one that matters most, is not missing from Stats.
4. As a Creator, I want a Link Shortcut (`?link=`) counted as a Click, whether it triggers a Reveal on page load or follows the Link's `/r` url, so that Clicks from Links I share directly are not lost.
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
25. As a Creator, I want a Tracking Code that arrived in my Profile URL to stay with my Profile, so that a Visitor who later opens another Creator's Profile, including one that later holds my old Username, does not carry my code into that Creator's Destination or escape target.
26. As a Creator, I want v2 to ignore the code that v1's global key left in Visitors' browsers, so that those leftovers credit no one after Cutover.
27. As a Creator, I want the `/c{code}` suffix on my OnlyFans Destination to keep working (D5), so that OnlyFans keeps crediting subscribers to my sources.
28. As a Creator, I want the Tracking Code to survive an Escape exactly as Phase 1 left it (plan section 4), so that moving to the System Browser does not lose my attribution.
29. As the Operator, I want the Page View ping rate-limited, so that nobody can flood Events and fill the server's disk.
30. As the Operator, I want a Profile's Events deleted along with the Profile, so that they never block the deletion.
31. As the Operator, I want the production country source switched on by Phase 5's Cutover runbook, which already proxies ofl.ink through Cloudflare with IP Geolocation on, and a check written here that proves Events then carry real countries, so that one runbook owns Cloudflare.
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
    - Phase 2's public Profile JSON, whose `profile` object gains the Profile's record `id`, the per-Profile Tracking Code key.
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

  dailyStats      view collection; list and view rule: @request.auth.id != "" && profile.owner = @request.auth.id
    one row per (profile, link, country, day); row id unique per row
    day     = UTC calendar date of created, "YYYY-MM-DD"
    views   = count of kind = page_view        clicks = count of kind = click
    link    stays a relation; empty on rows holding Page Views, or Clicks on deleted Links
  ```

  - Only the app writes Events. Visitors have no create rule.
  - The `dailyStats` rule starts with `@request.auth.id != ""`. Imported Profiles keep an empty owner (Phase 2 and Phase 3 specs, Schema), and for a signed-out caller a bare `profile.owner = @request.auth.id` compares empty with empty, so every ownerless Profile's rows would be public.
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

    PARKED, needs-human (plan review): which source feeds the country, Cloudflare's `CF-IPCountry` or a geo-IP lookup on the VPS. D5 names both. This spec is written for the Cloudflare header (rung 3: v1 takes the country from its edge's header, geo_utils.js:48; rung 5: no account, licensed download, dependency or lookup code). Rung 4 points the other way, because the Cloudflare header needs ofl.ink's live nameservers moved (Phase 5 spec, Moving the zone). Under geo-IP the country comes from a lookup of the client address, behind one function, and the two-letter-or-`XX` rule below stays. The Cloudflare-specific text parked with it: this bullet's first line; story 31; the post-switch `ZZ` probe in Acceptance; the Out of Scope line "The app reads `CF-IPCountry` directly"; the two Further Notes ASSUMPTIONs on the `ZZ` probe and on "once ofl.ink is Proxied"; and the local header injection of story 32 and test 4, which under geo-IP needs a test seam in front of the lookup. Both positions and the evidence that settles them are in plan-review.md, Needs the human. Every other ticket of this Phase can be built before the answer.

    - The Event Recorder reads the header itself and never calls Phase 2's Visitor location lookup. That lookup prefers `x-country`, then `cf-ipcountry`, then `US` (Phase 2 spec, Contracts), so it would let `x-country` override Cloudflare and would turn every unknown country into US.

    ASSUMPTION: Reveal's Geo Rule keeps Phase 2's lookup. This Phase does not change it (rung 4: leave the other Phase's code alone). On the local stack a request carrying both `x-country` and `CF-IPCountry` can record one country and pick a Geo Rule code for the other. In production the two agree on a known country, because Phase 5's Caddy drops v1's location headers from every request (Phase 5 spec, The Cloudflare lines). They still differ on an unknown one: the Event records `XX`, and the Geo Rule takes v1's US fallback (Phase 2 spec, Visitor location ASSUMPTION). Overturned if the parked country-source question changes Phase 2's lookup.
  - **In-App Browser.** Classified from the request's User-Agent with plan section 4's patterns; the first match wins:
    - `Threads` → threads
    - `Instagram` → instagram
    - `FBAN|FBAV` → facebook
    - `musical_ly|Bytedance|TikTok` → tiktok
    - anything else → empty

    A load after an Escape comes from the System Browser and records empty. The Operator compares the two kinds of load to judge whether Escapes work.

    ASSUMPTION: Threads is checked before Instagram in case Threads' User-Agent also says Instagram (rung 6 for the order). Overturned by real-device User-Agents.
  - **Tracking Code storage.**
    - One `localStorage` entry per Profile, keyed `linkme_tracking_id:{Profile id}`, where the Profile id is the record id that Phase 2's Profile JSON now carries as `profile.id`. A code that arrived on Profile A is never sent with a Reveal, a Link Shortcut or an escape target on Profile B, even when B later holds A's old Username.
    - v1's global key is ignored, not migrated.
    - Only the key changes. As in v1, a code is sent only for a Link with Tracking on, the Profile's stored code wins over the Link's default code, and a stored code does not expire (script.js:90-101, :235-247).
    - Reveal's resolver (Phase 2) still turns the code into `/c{code}`, as v1's reveal.js:9-37 does.

    ASSUMPTION: v1's global key is ignored rather than adopted, because at Cutover it may hold another Creator's code (rung 4: nothing stored is rewritten). Overturned if the Operator wants leftover codes honoured on the Profile they came from. That cannot be known, because v1 never stored which Profile a code came from.

    ASSUMPTION: the key is the Profile's record id, not its Username. The Operator can rename a Username, a deleted Profile's Username can be claimed again (Phase 3 spec), and Usernames match case-insensitively (Phase 2 spec), so a Username key could hand a stored code to a different Profile or lose it. The record id survives v1 Import reruns, which update records in place (Phase 2 spec), and tells a Visitor nothing useful. Rung 4: a key written into Visitors' browsers cannot be renamed later. Overturned if Phase 2's Profile JSON must not carry the record id; the key then falls back to the lowercased Username, and the reuse case is accepted.
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
  - **CTR.** Clicks ÷ Page Views for the same range and filters, as a percentage with one decimal, or "—" when there are no Page Views. It can exceed 100%, because Clicks are not de-duplicated, and is shown as computed. Page Views belong to the Profile, not to a Link. So under a Link filter, Page Views stay Profile-wide and CTR is that Link's Clicks over them.
  - **Empty range.** A range with no rows reads "No Page Views or Clicks in this range yet."
  - **Freshness.** Numbers are as of page load. There is no auto-refresh.
  - **Accessibility.** Every number sits under an accessible label (card names, table column headers), so a spec can read it by role.

  ASSUMPTION: no chart library. The bars are plain elements sized by value (rung 5, and a new dependency would need a network fetch). Overturned if the human wants real charts, which is a parked install.

  ASSUMPTION: the layout is mobile-first like the Editor (rung 3; plan section 6, "simplistic layout UI"). Overturned by a separate brief for Stats.

- **Seed.** Phase 2's seed gains two Creators. Each has a known test password in the test stack's environment and one Profile.
  - The **Stats Creator**'s **Stats Profile** keeps the default Profile Mode (escape_ig) and has a Direct Mode Link and an Adult Link with no Mode of its own. The Adult Link has Tracking on, no Geo Rule and no default Tracking Code.
  - The **Other Creator**'s **Other Profile** has the same two Links.
  - Every Destination is on a `.test` host (reserved by RFC 6761), which the spec stubs.
  - Only this Phase's spec visits these two Profiles, so other specs running in parallel cannot disturb their counts.

  ASSUMPTION: two seeded Creators are an additive change that two-sided ownership needs (rung 4). The Adult Links have Tracking on so that the Tracking Code test can fail (script.js:235 sends a code only when `link.tracking` is set). Overturned if Phase 2 or Phase 3 already seeds Creators with Profiles; this Phase then reuses them.

## Testing Decisions

- **Seam: one.** The existing Playwright loop, `./check.sh` → `npx playwright test`, runs against Phase 2's compose stack at `baseURL`. Nothing below it is mocked, and no unit-test seam is added.
  - The spec is `tests/e2e/04-stats.spec.ts`. It runs serially, in the order below.
  - Every Visitor is a fresh browser context. The country is set through `extraHTTPHeaders` (`CF-IPCountry`), and a fake User-Agent is used where needed (plan section 7).
  - Rule checks (test 7) call PocketBase's records API directly on its loopback port, with a Creator's token or none. The same-origin proxy keeps `events` off its allow-list, so a check sent through it would be refused before PocketBase's rules were reached. The Stats page itself goes through the proxy. Operator steps use the same loopback port, with the superuser credentials from the test stack's environment.

  ASSUMPTION: the Operator steps reach PocketBase on a loopback port, and the rule checks run against PocketBase itself, because its rules are the security boundary (ADR 0002). Rung 3. Overturned if Phase 2's test stack exposes PocketBase elsewhere; the spec then uses that address.

  ASSUMPTION: the test stack's Reveal threshold allows this file's traffic: about 15 pings and 10 Clicks per minute on one Profile from one address (rung 5). Overturned if the threshold is lower; the ping then gets a threshold setting of its own.
- **Counting by delta.** The tests in this file share Profiles, so each test reads Stats before and after acting and asserts the difference. (Phase 2 sets `reuseExistingServer: false`, Phase 2 spec, Test loop, so a reused server is no longer a reason.)
  - Between its two reads, a test also makes traffic that its assertion must leave out, so an ignored filter changes the number.
  - A run that straddles 00:00 UTC can fail a daily-row assertion; rerun it.
- **Destinations are stubbed.** No test leaves the machine, and no browser looks up a `.test` host.
  - `/r/*` is intercepted with `page.route`. The handler sends the real request with `route.fetch({ maxRedirects: 0 })`, asserts the 302 and its `Location`, and fulfils the navigation with a local stub page. Playwright calls a route handler only for the first URL of a redirect chain, so a route on the Destination's host alone would not catch a redirect.
  - A Destination reached through Reveal is a fresh navigation, which a `page.route` on every host other than `baseURL` fulfils with the stub.
  - Before a Visitor acts, the spec waits for the ping's 204; after it, for the `/r` or Reveal response.
- **No raw Events in the page.** Every test that opens Stats asserts that the page requested nothing from the `events` collection (story 12).
- **Tests.**
  1. **Page View and Click reach Stats.** A Visitor with country `SI` loads the Stats Profile and clicks its Direct Mode Link. Signed in as the Stats Creator, Stats → 7D shows +1 in each of:
     - the Page Views card and the Clicks card;
     - today's daily row;
     - that Link's row;
     - the `SI` country row.

     The CTR text equals Clicks ÷ Page Views as displayed. The page is then reloaded with every `dailyStats` request's `perPage` rewritten to 1 through `page.route`, and the cards and both tables must read the same. At a 390 × 844 viewport the page has no horizontal overflow (`scrollWidth` ≤ `clientWidth`), and the test saves `.scratch/goal_ai/shots/04-stats.png` at that size. (Stories 1, 2, 6, 13–17, 19, 22, 34.)
  2. **Adult Link, filters and filtered CTR.** Between the two reads:
     - an `SI` Visitor clicks the Adult Link and passes the Age Gate;
     - an `SI` Visitor clicks the Direct Mode Link;
     - a `DE` Visitor clicks the Adult Link and passes the Age Gate.

     Stats → 7D then shows:
     - no filter: Page Views +3, Clicks +3;
     - Link = Adult Link: Clicks +2, Page Views still +3;
     - Link = Adult Link and Country = `SI`: Page Views +2, and Clicks +1 on the card and in today's daily row. The Links table lists only the Adult Link (+1), and the Countries table only `SI` (Page Views +2, Clicks +1).

     Every CTR shown equals Clicks ÷ Page Views as displayed. Read with the Stats Creator's token, `dailyStats` holds exactly one row for (Direct Mode Link, `SI`, today), and its `clicks` rose by 1 across this test, so rows are grouped before they reach the page. (Stories 3, 12, 18.)
  3. **Link Shortcuts count; unknown Ids and refused Reveals do not.** Between the two reads:
     - a Visitor opens the Stats Profile with `?link={its Direct Mode Link's Id}` and lands on the stub (the `/r` path);
     - a Visitor opens the Stats Profile with `?link={its Adult Link's Id}`, passes the Age Gate if it shows, and lands on the stub (the Reveal-on-load path);
     - `GET /r/{unknown Id}` answers 404;
     - a Reveal for an unknown Link Id answers 404;
     - a Reveal for the Adult Link sent with a foreign `Origin` is refused.

     Clicks rise by exactly 2: +1 on the Direct Mode Link's row and +1 on the Adult Link's row. (Stories 4, 5.)
  4. **Country comes from `CF-IPCountry` only.** Four Visitors load the Stats Profile: one with no country header, one with `CF-IPCountry: T1`, one with `x-country: SI` and `CF-IPCountry: DE`, and one with `CF-IPCountry: US`. The Countries table shows Page Views "Unknown" +2, `DE` +1 and `US` +1, and `SI` and `T1` gain none. (Stories 6, 7.)
  5. **Ranges and the empty range.** The Stats Creator reads the Today, 7D and 30D tabs. Each shows its UTC date span: 1, 7 and 30 days ending today. Every `dailyStats` request sent for a tab names that span's first day (today, today − 6, today − 29) in its `filter`, so a page that fetches all history fails although no stored Event is old enough to show it. The Creator then reopens Stats with the browser clock moved one day ahead through `page.clock`, leaving the server's clock untouched.
     - Today reads "No Page Views or Clicks in this range yet."
     - 7D and 30D each list the real today's date, with the Page Views and Clicks the Today tab showed before the move.

     (Stories 14, 21.)

     ASSUMPTION (evidence blocked): a Creator session issued at real time stays valid in a browser whose clock is one day ahead, because PocketBase's default token lifetime is longer than a day (no network to check the pinned release). Overturned by a shorter lifetime; the test then signs in again after moving the clock.
  6. **In-App Browser recorded, nothing else stored.** A Visitor loads the Stats Profile once with each of five User-Agents: Instagram, Facebook (`FBAN`), Threads, TikTok and desktop Chrome. For each load, the newest Event for that Profile, read with the Operator's credentials, has `inAppBrowser` instagram, facebook, threads, tiktok or empty, respectively. Read the same way, the `events` collection's fields are exactly `id`, `kind`, `profile`, `link`, `country`, `inAppBrowser` and `created`. (Stories 8, 9, 11.)
  7. **Owner only.** Each Creator first records a Page View on their own Profile, and the Operator creates a throwaway Profile with no owner, which a Visitor loads once. Then, through PocketBase's records API on its loopback port:
     - with the Stats Creator's token, every listed `dailyStats` row belongs to the Stats Profile, and viewing a known Other Profile row by its id answers 404. The same holds the other way round.
     - with either Creator's token, and signed out, listing or viewing `events` returns no record, and creating, updating or deleting an Event is refused.
     - signed out, listing `dailyStats` returns no items, and viewing the ownerless Profile's row by its id (read with the Operator's credentials) answers 404.
     - signed out and with the Other Creator's token, listing `dailyStats` with `expand=link` returns no Stats Profile row, and no response body holds a `destination` key.

     The throwaway Profile is then deleted. In the UI, the Other Creator's Stats page names none of the Stats Profile's Links. (Stories 23, 24.)
  8. **A Tracking Code stays with its Profile.** The Visitor's context starts with v1's global `linkme_tracking_id` = 999 already in `localStorage`. The Visitor:
     - opens `/{Other Profile's Username}/123` and follows its Adult Link; the Destination ends in `/c123`;
     - then opens the Stats Profile and follows its Adult Link. That Reveal request carries no Tracking Code, and its Destination has neither `/c123` nor `/c999`;
     - then opens the Stats Profile with `?link={its Adult Link's Id}`. That Reveal request carries no Tracking Code either.

     A second context, with an Instagram User-Agent and the same global 999, opens `/{Other Profile's Username}/123` and then the Stats Profile. Once the Escape Overlay shows, the address bar, which is the escape target (Phase 1), carries neither `/123` nor `/999`.

     Username reuse: the Operator creates a throwaway Profile with a run-unique Username and an Adult Link with Tracking on. A third context opens `/{that Username}/777`. The Operator deletes that Profile and creates a new one under the same Username with the same kind of Link, and the third context follows the new Profile's Adult Link. That Reveal request carries no Tracking Code. The new Profile is then deleted. (Stories 25, 26, 27.)
  9. **A deleted Link keeps its Clicks.** The Operator creates a Link with a stub Destination on the Stats Profile. A Visitor opens `/r/{its Id}`, then the Operator deletes the Link. The Links table's "Deleted link" row shows +1 Click, and the Clicks card shows the same total as just before the delete. (Story 20.)
  10. **A deleted Profile takes its Events.** The Operator creates a throwaway Profile. A Visitor loads it and its ping answers 204. The Operator then deletes the Profile. The delete succeeds, and no Event for that Profile remains. (Story 30.)
  11. **A failed Event write does not block a Click.** The Operator adds a temporary required field to `events`, so that every Event write fails. A Visitor clicks the Stats Profile's Direct Mode Link, whose `/r` still answers 302 to its Destination, then follows the Adult Link through the Age Gate, whose Reveal still answers with its Destination; both reach the stub. A `finally` step removes the field. (Story 10.)

      ASSUMPTION (evidence blocked): adding a required field to a populated collection through the superuser API makes later inserts without that field fail (no network to check the pinned release). Overturned if that release refuses the change; the test then narrows the `kind` select so that the app's values fail.
  12. **The ping is rate-limited.** The Operator creates a throwaway Profile with a Username unique to this run. Pings to it reach 429 within the Reveal threshold + 1 requests, using the value from the test stack's environment. Right after that, a ping for the Stats Profile still answers 204, and `/r` for its Direct Mode Link still redirects. The throwaway Profile is then deleted. Because each run uses a fresh Username, a reused stack's exhausted window cannot leak into the next run. (Story 29.)

  A stalled write has no automated test. The seam cannot stall one PocketBase insert without a test-only fault switch, and this Phase adds none. Pausing PocketBase would stall the Link lookup that comes before the write, so the 300 ms bound in the Event Recorder is the guarantee. Story 28 is Phase 1's rule and Phase 1's test. This Phase changes only the storage key, and test 8 shows that a code arriving in the URL is still stored and used, and that neither a Link Shortcut nor an escape target picks up another Profile's code. Stories 31 and 33 are the manual lines in Acceptance; story 22's look is the screenshot glance.
- **Prior art.** `tests/e2e/00-smoke.spec.ts` already uses each technique this spec needs:
  - a fake Instagram User-Agent through `test.use`;
  - `page.route` with `route.fetch`, so the real endpoint answers before its result is replaced (00-smoke.spec.ts:35-37);
  - role-based assertions.

  `playwright.config.ts:7` already writes into `.scratch/goal_ai/shots`.

## Acceptance

```sh
set -e  # any failing check fails the block; the final ./check.sh cannot mask it (house precedent: Phases 1-3)
# Playwright's webServer starts Phase 2's compose stack with its seed (plan section 7).
test -f tests/e2e/04-stats.spec.ts
./check.sh tests/e2e/04-stats.spec.ts
test -s .scratch/goal_ai/shots/04-stats.png
# manual: glance at .scratch/goal_ai/shots/04-stats.png (phone width). It should read like link.me/analytics.html:
#         range tabs with a date span, three cards, daily bars, a Links table and a Countries table.
# manual (RUN.md, real device): in Instagram on a phone, open a Profile on v2's VPS host. In PocketBase's admin UI
#         the newest Event for that Profile shows inAppBrowser = instagram (and country XX until Cutover).
# manual, after Phase 5's switch. Phase 5's runbook proxies ofl.ink and every Spare Domain through Cloudflare with
#         IP Geolocation on; this Phase adds no Cloudflare step of its own.
#   curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'CF-IPCountry: ZZ' https://ofl.ink/v/<a Username>
#   # expect 204; the newest Event for that Profile (admin UI) shows this machine's real country, not ZZ or XX.
#   # then open a Profile on a phone on mobile data: its Page View appears in that Creator's Stats with its country.
#   # if Events still show XX: Cloudflare dashboard -> ofl.ink -> Network -> IP Geolocation on
#   #   (API: PATCH zones/<zone id>/settings/ip_geolocation {"value":"on"}, with a token holding Zone Settings:Edit).
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
  - `/r/:linkId`, which non-Adult Links in Direct or Escape Mode go through; Links in Deeplink Mode and Adult Links go through Reveal (Phase 2 spec, Contracts);
  - the public Profile JSON, whose `profile` object this Phase extends with the record `id`;
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
- **Phase 5, for production countries only, not for landing.** Under the Cloudflare position of the parked country-source question, its Cutover runbook proxies ofl.ink and every Spare Domain through Cloudflare with IP Geolocation on, drops country headers from peers outside Cloudflare's ranges, and gives the app the Visitor's own address (Phase 5 spec, stories 18 and 19). Until then every production Event records `XX`.

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
- **VPS geo-IP (MaxMind).** It needs an account, a licensed download, a new dependency and lookup code. Cloudflare needs none of these (see Visitor country). Parked with the country-source question rather than cut: if the Operator picks geo-IP, it comes back into this Phase.
- **Caddy lines that strip country headers, Cloudflare zone, record and setting changes, and the client address behind Cloudflare.** Phase 5 owns all of them (Phase 5 spec, stories 3, 18 and 19). The app reads `CF-IPCountry` directly.
- **A Deeplink or Escape Mode counting matrix.** Clicks are counted where `/r` or Reveal hands out the Destination, whatever the Mode, and tests 2, 3 and 11 cover both endpoints, Reveal-on-load included. Phase 1 tests which endpoint each Mode calls.
- **Umami.** The plan lists it as a Bonus "if PocketBase stats are not enough".
- **A chart library.** It is a new dependency, and plain bars meet the brief.

## Further Notes

ASSUMPTION: Reveal's and the ping's rate limits key on the Visitor's address once ofl.ink is Proxied, not on Cloudflare's; otherwise many Visitors share one window and get 429s. Phase 5 owns that (Phase 5 spec, story 19), and the ping reads the client address exactly where Reveal's limiter does, so its fix covers both (rung 5). Overturned if Phase 5 drops that step; the client address then needs an owner before the switch.

ASSUMPTION (evidence blocked): Cloudflare overwrites any `CF-IPCountry` a client sends through its proxy. There is no network to check its reference. The Acceptance `ZZ` probe tests it. Overturned by that probe: if it reads `ZZ`, the country numbers cannot be trusted, and the source goes back to the human, with VPS geo-IP as the parked alternative.

ASSUMPTION: until Cutover every production Event records `XX`, because v2 has no live traffic before then and nothing proxies it. This costs nothing (rung 5). Overturned if the Operator wants real country numbers on v2's VPS host before Cutover; that host then needs its own Proxied record.

## Review

Reviewer: **codex** (codex-cli 0.155.0-alpha.9, `model_reasoning_effort=high`, read-only sandbox on a workspace holding the plan, CONTEXT.md, ADRs 0001–0005 and the harness only), 2026-10-02. Two calls: a blind call without this spec, and a draft call with it. Both exited 0 within the 900 s bound with fresh, non-empty output.

Process notes. The draft call read the sibling Phase 0–3 and 5 specs from the worktree's git objects (`git show HEAD:docs/spec/<file>`, commit c52cbe2), so it was not blind to docs/spec/ as the workspace intended. Every claim it based on those specs was rechecked against the current files in docs/spec/ before being accepted. The draft call also fetched four public documentation pages (PocketBase rules and relations, Playwright `page.route`, Cloudflare zone settings) by URL; no workspace content went with them. The blind call read no spec. The forbidden-URL grep from the security constraints found nothing in either prompt or either output.

Draft call (with the spec):

- **accept** (D1) The `dailyStats` rule `profile.owner = @request.auth.id` matches every row of an ownerless Profile for a signed-out caller (empty equals empty), and imported Profiles keep an empty owner (Phase 2 spec, Schema: `owner relation -> users, optional`, and its ASSUMPTION that owner stays empty on import; Phase 3 spec, Schema: "imported Profiles have none"). The rule now starts with `@request.auth.id != ""` (Schema), and test 7 adds an ownerless Profile with a Page View, checked signed out by list and by id.
- **accept** (D2) A Username key is not per-Profile: the Operator can rename a Username (Phase 3 spec, line 34 and its squatting note), a deleted Profile's Username can be claimed again, and Usernames match case-insensitively (Phase 2 spec, "What differs on purpose"). The key is now `linkme_tracking_id:{Profile id}`, Phase 2's Profile JSON gains `profile.id` (Owns, Tracking Code storage, Depends on), and test 8 adds a Username-reuse case.
- **accept** (D3) The Acceptance block had no fail-fast, so the final `./check.sh` could mask a failed Phase 4 line (codex: `bash -c 'test -f tests/e2e/04-stats.spec.ts; printf "continued..."'` exited 0). It now opens with `set -e`, following Phases 1–3's Acceptance blocks.
- **accept** (D4) Rule checks sent through the same-origin proxy would be refused by its allow-list (`events` stays off it, Depends on → Phase 3) before PocketBase's rules were reached, so test 7 could pass with public rules. Test 7 now calls PocketBase on its loopback port with Creator tokens and none, and also checks update and delete on `events`, which Schema promises are closed.
- **partial** (D5) Accepted: "every non-Adult Link goes through `/r`" was false, since Phase 2's Profile JSON gives Deeplink Mode Links an empty `url` and sends them through Reveal (Phase 2 spec, Contracts). Story 2 and Depends on are corrected. Test 3's Direct Mode Shortcut also follows `/r` (Phase 2 spec: "A Link Shortcut to a non-Adult Link opens that Link's url"), so test 3 now adds an Adult Link Shortcut for Reveal-on-load. Rejected: a per-Mode counting matrix and an Escape counted in a fresh context. Recording sits in the two endpoints, whatever the Mode; tests 2, 3 and 11 cover both endpoints, and Phase 1 tests which endpoint each Mode calls.
- **accept** (D6) The hand-off is clean in text: Phase 1 defines the escape target as "the code the page would pass to Reveal" and defers the key to Phase 4 (Phase 1 spec, Tracking Code storage). But only the tap-to-Reveal consumer was tested. Test 8 now also checks a Link Shortcut, and an Instagram context's escape target, against another Profile's code and v1's global 999.
- **accept** (D7) "`CF-IPCountry` only" contradicted the fallback ASSUMPTION, which would switch to Phase 2's lookup. That lookup exists and reads `x-country`, then `cf-ipcountry`, then `US` (Phase 2 spec, Contracts: Visitor location). The Event Recorder now reads the header itself and never calls that lookup (Contracts → Visitor country). Test 4 adds a conflicting `x-country: SI` + `CF-IPCountry: DE` (expect DE) and a genuine `US`.
- **accept** (D8) Playwright calls a route handler only for the first URL of a redirect chain (codex cites the Playwright 1.58.2 `page.route` docs), so a route on the Destination's host would not catch `/r`'s 302 target, and the browser would look up the `.test` host. Testing Decisions now intercepts `/r/*`, fetches it with `maxRedirects: 0`, asserts the 302 and `Location`, and fulfils with a stub.
- **accept** (D9) The Cloudflare runbook duplicated Phase 5's, which already moves the zone, sets the records Proxied with "Network -> IP Geolocation on", and owns peer-matched country-header stripping and the client address (Phase 5 spec, stories 3, 18 and 19, Caddy section and runbook step 3). Following both would create a second apex record. Acceptance keeps only the post-switch `ZZ` probe and an IP Geolocation fallback. Story 31, Depends on (Phase 5, production countries only), Out of Scope and Further Notes now point at Phase 5.
- **accept** (D10) The listed token (Zone:Edit + DNS:Edit) could not PATCH zone settings, which needs Zone Settings:Edit (codex cites Cloudflare's endpoint reference). The zone-settings commands left with D9, and the one remaining fallback names Zone Settings:Edit.
- **partial** (D11) Test 5 could not tell 7D's and 30D's lower bounds from "all history". Accepted: test 5 now asserts that each tab's `dailyStats` request names its first day (today − 6, today − 29) in `filter`. Rejected: backdated Events and a clock moved past the bound. `created` is an autodate the API does not set, and moving the browser clock 7 or more days can outlive the Creator's token, which test 5's own evidence-blocked ASSUMPTION already worries about at one day.
- **accept** (D12) Filters were asserted on cards and the daily row only, so a table that ignored them would pass. Under Link + Country, test 2 now checks that the Links table and the Countries table each show only the filtered row.
- **accept** (D13) A `dailyStats` that returned one row per Event would pass the "no `events` request" check. Test 2 now asserts exactly one row for (Direct Mode Link, `SI`, today) whose `clicks` rose by 1.
- **partial** (D14) Accepted: test 3 now sends a foreign-`Origin` Reveal and expects no Click. Rejected: a rate-limited Reveal. Reveal's limiter keys on the client address alone (Phase 2 spec, Interfaces: `allow(clientIp)`), so exhausting it from 127.0.0.1 would give 429s to every parallel spec's Reveals for the window. That is the reason the ping has its own counter (Contracts → Page View Ping).
- **partial** (D15) Accepted: test 11 now also passes an Adult Link through Reveal while every write fails. Rejected: a stalled-write test. Pausing PocketBase stalls the Link lookup that comes before the write, so it cannot isolate the 300 ms bound without a fault switch, and this Phase adds none (Testing Decisions).
- **accept** (D16) The one project is Desktop Chrome (playwright.config.ts:9), so a desktop-only layout would pass. Test 1 now checks for no horizontal overflow at 390 × 844 and takes the screenshot at that size.
- **accept** (D17) ADR 0004: codex found no Destination published by Stats; `dailyStats` holds ids and counts, and Link names come through the owner's authenticated Editor read. Relation expansion was not verified, though. Test 7 now lists `dailyStats` with `expand=link`, signed out and as the Other Creator, and expects no Stats Profile row and no `destination` key.

Blind call (without the spec):

- **reject** (B1) "Reveal-as-Click needs an explicit decision." Interfaces and What counts make it, flagged as an ASSUMPTION with what would overturn it, following CONTEXT.md:111–114.
- **reject** (B2) "Route every Click through `/r`, or instrument both endpoints without double counting." The spec instruments both, and exactly one endpoint hands out any one Destination (Interfaces). D5's correction keeps that true for Deeplink Mode.
- **reject** (B3) "Browser ping or server-side page request." The plan names "a page-view ping" (goal_ai.txt:157), rung 2.
- **reject** (B4) "Read-time grouping, counters or a materialized rollup." Schema picks the read-time view, with a one-second overturn threshold and a same-shaped nightly table as the fallback.
- **reject** (B5) "Choose a failure contract for Event writes." Write path picks a 300 ms bounded wait, and D15 adds the Reveal-path test.
- **reject** (B6) "Umami is a contingency, not an alternative." No defect: Out of Scope already says so (goal_ai.txt:166).
- **reject** (B7) "Define counting for cancel, retries, previews, bots and duplicates." What counts and Out of Scope define each: a handed-out Destination is a Click, double taps count, link previewers count, and bot filtering waits for evidence.
- **partial** (B8) "Define the CTR denominator and whether CTR above 100% is valid." The denominator was already defined (Profile-wide Page Views for the same range and filters). The Stats page now also says CTR can exceed 100% without de-duplication and is shown as computed.
- **reject** (B9) "Clarify D5's `user`, server-side Profile resolution and idempotency." Schema's ASSUMPTION reads `user` as the Creator via the Profile; the server resolves the Profile from the Username or the Link; there is no idempotency key because nothing is de-duplicated.
- **partial** (B10) "Country trust and normalization." Normalization was defined (two letters A–Z, else `XX`). Trust at the origin is Phase 5's peer-matched header stripping, which Out of Scope and Depends on now name. US state stays out of scope (D5 logs country only).
- **reject** (B11) "Attribution precedence, validity and lifetime." Tracking Code storage keeps v1's precedence (stored code over the Link's default) and no expiry; Geo Rule selection is Phase 2's resolver.
- **reject** (B12) "Time zone, late Events, deletion, renames, import reruns." Days are UTC; the view stores nothing, so there are no late arrivals; deleted Links keep their Clicks; v1 Import reruns update records in place (Phase 2 spec), so Link and Profile ids stay. Renames are D2.
- **accept** (B13) "Test ownership against PocketBase's own API." Same as D4: test 7 now runs on the loopback port.
- **reject** (B14) "Retention, throughput, abuse limits, classification, empty and error states." Retention is Out of Scope with a revisit trigger, abuse is the ping limiter, classification is the In-App Browser contract, the empty state is specified, and throughput has Schema's overturn threshold. An error-state message is polish, not a defect.
- **partial** (B15) "Primary seam: a real v2 app and PocketBase, ending in the Creator's Stats; extend across every Mode." The seam is the spec's. The Mode extension is answered as in D5.
- **reject** (B16) "Deterministic calculation checks with fixed timestamps." `created` is an autodate and the spec adds no unit seam; D11 checks range bounds at the request.
- **reject** (B17) "Test header spoofing at the trusted-proxy boundary." The local stack has no Cloudflare; Phase 5 owns and tests peer matching.
- **reject** (B18) "The harness serves v1 through `tests/dev-server.mjs`" (playwright.config.ts:11). Depends on → Phase 2 lists the switch to `docker compose up` (plan section 7).
- **reject** (B19) "Screenshots are only-on-failure" (playwright.config.ts:8). Test 1 saves its own screenshot.
- **reject** (B20) Falsifiers. Each is a test or a stated choice: one endpoint per Click (Interfaces), a cancelled navigation after a Reveal counts by design (What counts), ownership (test 7), attribution (test 8), country (test 4), and cost (Schema's overturn threshold).

Counts: 14 accept, 7 partial, 16 reject, 0 needs-human.

### Six hats

Six-hats review of specs 00–05 taken as one set (HEAD 16d5a11), reconciled in the plan review, 2026-10-02. Ids: W white, R red, K black, Y yellow, G green, U blue, C the coordinator's points, X found by the reconciler. Bullets about the whole set are reconciled only in `docs/spec/plan-review.md`, Six hats. Cross-spec line citations in the entries above date from their own review and may have drifted; the main text now cites sections.

- G1 **needs-human** (with R2 and U1). The Visitor country ASSUMPTION that chose Cloudflare's header over VPS geo-IP is now PARKED. That choice moves the live domain's nameservers in Phase 5 (rung 4 against it), while geo-IP needs a licensed download by the human (floor 2) and a new dependency (rung 5 against it). Parked with it: the source line of Visitor country, story 31, the post-switch `ZZ` probe, one Out of Scope line, two Further Notes ASSUMPTIONs, and the local header injection (story 32, test 4), all listed in the PARKED block. The `XX` rule, Events, `dailyStats`, the ping and the Stats page are built either way. The Out of Scope geo-IP line is now "parked rather than cut", and Depends on qualifies Phase 5's role.
- C5 **accept**. The ASSUMPTION on Reveal's Geo Rule and the Event's country cited an overturn condition that Phase 5 now meets: production drops v1's location headers, so the two agree on a known country. It is rewritten to say so, and to keep the one remaining difference: on an unknown country the Event records `XX` and the Geo Rule takes US.
- U2 **accept** (stale note). Counting by delta cited Playwright reusing a running server, which Phase 2's `reuseExistingServer: false` ends. The reason is now that the tests share Profiles.
- C3 **accept**, no change here. Phase 4 keeps ownership of `profile.id` (Owns; Contracts, Tracking Code storage). Phase 2's contract now lists the key as added by Phase 4.

Counts: accept 3, partial 0, reject 0, needs-human 1 (the country source, shared with Phases 2 and 5).
