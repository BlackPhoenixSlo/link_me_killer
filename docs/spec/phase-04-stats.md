# Phase 04 — Stats

**Objective.** A signed-in Creator opens Stats and sees their own Profile's Page Views, Clicks and CTR (click-through rate) per Link, per UTC day and per country, counted from Profile loads, `/r/:linkId` redirects and Reveals.

## Problem Statement

A Creator sends Instagram and TikTok traffic to their Profile and cannot tell what it does. v1 counts nothing (plan section 1: "NOT present: ... click/visit counting"). The Creator does not know how many Visitors opened the Profile, which Links they followed, on which days, or from which countries. The only numbers they get come from OnlyFans, through the `/c{code}` Tracking Code, and those cover subscribers, not Clicks.

That attribution is also unreliable. v1 stores one global Tracking Code in the Visitor's browser (`localStorage` key `linkme_tracking_id`, linkme_clone3/script.js:55) and reads it back on every Profile (script.js:236). A Visitor who arrived on one Creator's Profile with a code and later opens another Creator's Profile carries the first code along. A subscriber on the second Profile is then credited to a source that belongs to the first.

## Solution

v2 records an Event each time a Visitor loads a Profile (a Page View) and each time a Visitor follows a Link (a Click), whether the Destination comes from the `/r/:linkId` redirect or from Reveal. Each Event stores only the Profile, the Link, the Visitor's country, the In-App Browser it came from, and the time.

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
10. As a Visitor, I want recording an Event never to break my Click, so that an Event-store failure never costs the Creator a subscriber.
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
27. As the Operator, I want the Page View ping rate-limited like Reveal, so that nobody can flood Events and fill the server's disk.
28. As the Operator, I want a Profile's Events to go with it when the Profile is deleted, so that the Events never block that deletion.
29. As the Operator, I want the exact steps for both production country sources (Cloudflare header, MaxMind database) written down, so that I can switch on real country numbers at Cutover.
30. As the Operator, I want local tests to set the Visitor's country through a request header, so that country Stats are tested without any account or download.

## Implementation Decisions

- **Owns.**
  - **Event Recorder** (new, in the app container).
  - **Page View Ping route** (new, in the app).
  - **`events` collection** (fields and rules) and **`dailyStats` view collection** (new), through one additive PocketBase migration.
  - **Stats page** (new), plus a "Stats" entry in the navigation of the creator-only area.
  - Modified:
    - the `/r/:linkId` redirect and the Reveal endpoint (Phase 2), which now record a Click;
    - the public page script (Phase 2's port of v1 script.js), which now sends the ping and stores Tracking Codes per Profile;
    - the seed (Phase 2), which gains a second Creator and Profile.
  - New spec: `tests/e2e/04-stats.spec.ts`.

- **What Phase 2 provides, what Phase 4 adds.**
  - Phase 2 provides:
    - the PocketBase and app containers, and the app's privileged (superuser) access to PocketBase;
    - the `profiles` and `links` collections, with an owner relation on `profiles`;
    - `/r/:linkId`, and Reveal with its Geo Rule lookup, `/c{code}` suffix and rate limiter;
    - the ported public page;
    - the compose stack, the seed with the Fixture Profile, and the Playwright webServer.
  - The plan lists `events` among Phase 2's collections. Phase 4 assumes it exists there at most as a placeholder. Phase 4 adds:
    - every Event field and rule;
    - every write to `events`;
    - the `dailyStats` view, the ping, and the Stats page.
  - Phase 4's migration is additive. It creates `events` if it is absent, adds any field below that is missing, and sets the rules. It never renames or drops a field that Phase 2 defined.

  ASSUMPTION: Phase 2 defines `events` at most as an empty placeholder and writes nothing to it. Overturned if Phase 2 already records Clicks from `/r/:linkId`; Phase 4 then keeps that writer and adds only what is missing (the `kind` field, Reveal Clicks, Page Views).

- **Interfaces.**
  - **Event Recorder** exposes two calls:
    - *record Page View* (request, Profile)
    - *record Click* (request, Profile, Link)

    Each call:
    - works out the Visitor's country and In-App Browser from the request;
    - writes one Event through the app's privileged PocketBase access and waits for the write;
    - never throws: a failed write is logged and swallowed.
  - **`/r/:linkId`**: looks the same from outside (a redirect to the Destination). Once the Link resolves, it records a Click before redirecting. An unknown Link Id still gets 404 and records nothing.
  - **Reveal**: looks the same from outside. It records a Click each time it returns a Destination, and nothing when it returns 404 or is rate-limited.

    Exactly one of the two endpoints hands out the Destination for any one Click, so no Click is counted twice.

    ASSUMPTION: a Reveal counts as a Click (CONTEXT.md "Click"), although the plan names only `/r/:linkId` and the ping as writers. Without it, every Adult Link Click would be missing. Overturned if Stats should count redirects only.
  - **Page View Ping route**: `POST /v/{username}`, contract below.
  - **Public page script**:
    - Sends the ping once per page load, after the Profile has rendered. It does not send one for an unknown Username.
    - Stores the Tracking Code under a per-Profile key, which replaces the global `linkme_tracking_id` (D5: "Replace the global localStorage trackId"). The old key is ignored, not migrated.
    - Phase 1's rule that keeps the Tracking Code in the URL during an Escape (plan section 4) is untouched.
  - **Stats page**:
    - Lives in Phase 3's creator-only area and reaches PocketBase the same way the Editor does.
    - Adds a "Stats" navigation entry next to the Editor.

- **Schema.**

  ```
  events          base collection; list/view/create/update/delete rules: none (superusers only)
    kind          select   view | click                              required
    profile       relation profiles, single                          required, cascade delete
    link          relation links, single                             empty on views; no cascade (cleared on Link delete)
    country       text     two uppercase letters; "XX" = unknown     required
    inAppBrowser  select   instagram | facebook | threads | tiktok   empty = none
    created       autodate on create (UTC)
    index         (profile, created)

  dailyStats      view collection; list and view rule: profile.<owner> = @request.auth.id
    one row per (profile, link, country, day)
    day     = UTC calendar date of created, "YYYY-MM-DD"
    views   = count of kind = view      clicks = count of kind = click
    link stays a relation (empty on rows that hold views); row id unique per row
  ```

  Events are written only by the app; Visitors have no create rule. The D5 field list (Profile, Link, country, In-App Browser, timestamp) is the whole record: no IP address, User-Agent string, referrer or Visitor identifier is stored.

  ASSUMPTION: `profile.<owner>` is the owner relation Phase 2 puts on `profiles`, which D2 writes as `user = @request.auth.id`. The rule uses whatever name Phase 2 gave it.

  ASSUMPTION: Events cascade with their Profile. PocketBase blocks deleting a record that a required relation points to, and a deleted Profile's Stats have no reader. A Link's deletion keeps its Clicks (rung 4: keep data). Overturned if the Operator wants a deleted Profile's Events kept.

  ASSUMPTION: the "daily aggregation" is the `dailyStats` view, computed by SQLite on every read, rather than a scheduled job writing a rollup table (rung 4: the view holds no state and can be dropped without loss; rung 5: no job). Overturned if the Stats page gets slow at real volume. A nightly job then fills a table of the same shape, and the Stats page does not change.

  ASSUMPTION: days are UTC calendar days, labelled "UTC" on the page. Overturned if Creators need their local day, which would mean a per-Creator time zone.

- **Contracts.**
  - **Page View Ping.** `POST /v/{username}`, no body, sent with `navigator.sendBeacon`.
    - Answers 204 when the Event is recorded.
    - Answers 404 for an unknown Username.
    - Goes through Reveal's rate limiter and answers the way Reveal does when over the limit.

    ASSUMPTION: the path mirrors the plan's `/r/` shape (rung 3), so `v`, like `r`, must not be claimable as a Username (Phase 3). Overturned by any common prefix Phase 2 gives the app's endpoints.

    ASSUMPTION: the ping shares Reveal's limiter (rung 3, ADR 0004). Overturned if that limiter cannot wrap a second route, in which case the ping gets a copy with the same thresholds.
  - **Visitor country.**
    - Read from one request header, the Country Header. It is the same header Reveal reads for Geo Rules, so a Click's recorded country and the Tracking Code it got always agree.
    - A value that is not two letters, or a missing header, is recorded as `XX`. This is never v1's US default (linkme_clone3/netlify/functions/geo_utils.js:51); that default belongs to Geo Rules only.
    - Local tests inject the header.

    ASSUMPTION: the Country Header's name is whatever Phase 2's Geo Rule code reads (v1 reads `x-country`), and `cf-ipcountry` if Phase 2 reads none. Overturned when the Operator picks MaxMind; an IP lookup then fills the same country value.
  - **In-App Browser.** Classified from the User-Agent with plan section 4's patterns, first match wins:
    - `Threads` → threads
    - `Instagram` → instagram
    - `FBAN|FBAV` → facebook
    - `musical_ly|Bytedance|TikTok` → tiktok
    - anything else → empty

    ASSUMPTION: the order is a choice (Threads before Instagram, in case Threads' User-Agent also says Instagram). Overturned by real-device User-Agents.
  - **Tracking Code storage.** One `localStorage` entry per Username. A code that arrived on Profile A is never sent with a Reveal on Profile B.

    ASSUMPTION: Phase 4 owns this part of D5. Overturned if Phase 1 already scoped the key per Profile; Phase 4 then keeps only the test.
  - **`dailyStats` read.** The Stats page lists every `dailyStats` row in the chosen range in one paged request, with Link titles expanded. It sends no Profile filter, so the list rule alone decides which rows a Creator sees, and the UI test proves that rule.

- **Write path.** Event writes are awaited and their errors swallowed.

  ASSUMPTION: awaited rather than fire-and-forget. A local PocketBase insert costs milliseconds. The redirect already depends on PocketBase for the Destination, so this adds no new failure mode, and tests get deterministic counts. Overturned if redirect latency measurably grows.

- **What counts.** Every Profile load is one Page View, including the second load when a Visitor follows the Escape Overlay's "open in browser" instruction. Every Destination handed out is one Click, including double taps. Visits by the Creator themselves count.

  ASSUMPTION: no de-duplication. Without a Visitor identifier, which D5 does not log, none is possible. Overturned if Escape Mode Profiles show visibly deflated CTR; escaped loads would then be marked in the URL and skipped.

- **Stats page.**
  - **Range tabs.** Today, 7D (the default) and 30D, in UTC days, with the date span shown. This follows the link.me Template's Overview tabs.
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

- **Seed.** Phase 2's seed gains:
  - a second Creator with a known test password;
  - that Creator's own Profile, with one Direct Mode Link and one Adult Link, which has no Geo Rule and no default Tracking Code.

  Only this Phase's spec visits that Profile, so its counts are not disturbed by other specs running in parallel. The Fixture Profile's Creator also has a known test password.

  ASSUMPTION: the plan seeds one Fixture Profile; the second Creator and Profile are an additive change (rung 4) that two-sided ownership and Tracking Code scoping need. Overturned if Phase 2 or 3 already seeds a second Creator, which Phase 4 then reuses.

## Testing Decisions

- **Seam: one.** The existing Playwright loop, through `./check.sh` → `npx playwright test`, against Phase 2's compose stack at `baseURL`. Nothing below it is mocked. The spec is `tests/e2e/04-stats.spec.ts` and runs serially. Every Visitor is a fresh browser context, with the Country Header set through `extraHTTPHeaders` and, where needed, a fake User-Agent. No unit-test seam is added.
- **Counting is by delta.** The database persists across runs, so each test reads the Stats page before and after acting and asserts the difference. The counting tests act only on the second seeded Profile.
- **Destinations are stubbed.** Navigation to any host other than `baseURL` is fulfilled with a stub through `page.route`, so no test leaves the machine. Before a Visitor acts, the spec waits for the ping's 204, or for the redirect or Reveal response.
- **Tests:**
  1. **Page View and Click reach Stats.** A Visitor with country `SI` loads the second Profile and clicks its Direct Mode Link. Signed in as the second Creator, Stats → 7D shows +1 in each of:
     - the Page Views card and the Clicks card;
     - today's daily row;
     - that Link's row;
     - the `SI` country row.

     The CTR text equals Clicks ÷ Page Views as displayed. The test saves a screenshot to `.scratch/goal_ai/shots/04-stats.png`.
  2. **Adult Link through the Age Gate counts.** A Visitor clicks the Adult Link, passes the Age Gate and Reveal answers. The Creator then filters Link = Adult Link and Country = `SI`, and today's daily Clicks show +1.
  3. **Unknown country.** A Visitor with no Country Header loads the second Profile. The Countries table's "Unknown" row shows +1 Page View.
  4. **In-App Browser recorded.** For each of five User-Agents (Instagram, Facebook `FBAN`, Threads, TikTok, desktop Chrome), a Visitor loads the second Profile. The newest Event for that Profile, read with the Operator's credentials through PocketBase's records API, has `inAppBrowser` instagram, facebook, threads, tiktok or empty, respectively.
  5. **Owner only.** Signed in as the Fixture Profile's Creator, the Stats page's Link filter and Links table name none of the second Profile's Links. Signed-out reads of PocketBase's records API for `events` and `dailyStats` return no items.
  6. **Tracking Code stays with its Profile.** A Visitor opens the Fixture Profile with Tracking Code 123 in the URL (`/{username}/123`).
     - On that Profile, its Adult Link's Destination ends in `/c123`.
     - The same Visitor then opens the second Profile and follows its Adult Link. That Destination carries no `/c123`.

  ASSUMPTION: the spec reaches PocketBase's records API at the URL Phase 2's stack exposes (the one the Editor uses), and reads the Operator's credentials from the seed's environment. Overturned if Phase 2 exposes neither; tests 4 and 5 then move behind an app endpoint that Phase 2 names.
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
#         the newest Event for it shows inAppBrowser = instagram and the phone's real country.
# manual: production country source, the Operator's choice, best made at Cutover (Phase 5). Either:
#   Cloudflare: add ofl.ink (and each Spare Domain) to a Cloudflare account, set its A record to the VPS
#               as "Proxied", leave Network > IP Geolocation on. Cloudflare then sends CF-IPCountry.
#               If the Country Header is not cf-ipcountry, add inside Caddy's reverse_proxy block:
#               header_up X-Country {header.CF-IPCountry}
#   MaxMind:    sign up at https://www.maxmind.com/en/geolite2/signup, create a license key, then on the VPS:
#               curl -fL -u "$MAXMIND_ACCOUNT_ID:$MAXMIND_LICENSE_KEY" -o GeoLite2-Country.tar.gz \
#                 'https://download.maxmind.com/geoip/databases/GeoLite2-Country/download?suffix=tar.gz'
#               and in the app package: pnpm add maxmind   (new dependency; the IP lookup is a parked follow-up)
./check.sh
```

## Depends on

- **Phase 2.** Provides:
  - PocketBase, the app container, and the app's privileged PocketBase access;
  - the `profiles` and `links` collections, and the `events` name;
  - `/r/:linkId`;
  - Reveal, with its Geo Rule Country Header, `/c{code}` suffix and rate limiter;
  - the ported public page script;
  - the compose stack, the seed with the Fixture Profile, and the Playwright webServer swap.

  Phases 0 and 1 arrive through Phase 2. That includes Phase 1's In-App Browser detection and its rule for keeping the Tracking Code during an Escape.
- **Phase 3.** Provides:
  - Creator login;
  - the creator-only area and its navigation, where Stats sits next to the Editor;
  - the way that area reads PocketBase;
  - a known login for the Fixture Profile's Creator;
  - `v` and `r` reserved as Usernames.

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
- **MaxMind lookup code in the app.** It needs a licensed download and a new dependency; it is parked with the exact commands in Acceptance.
- **Umami.** The plan lists it as a Bonus "if PocketBase stats are not enough".
- **A chart library.** A new dependency, and plain bars meet the brief.

## Further Notes

Every open question below is already settled by the ladder; each is restated here with the rung that settled it.

ASSUMPTION: Phase 2 defines `events` at most as a placeholder and writes nothing to it; Phase 4's migration is additive (rung 4). Overturned if Phase 2 already writes Clicks from `/r/:linkId`.
ASSUMPTION: a Reveal counts as a Click (CONTEXT.md; work the plan needs, flagged). Overturned if Stats should count redirects only.
ASSUMPTION: the daily aggregation is a PocketBase view computed on read, not a scheduled rollup (rungs 4 and 5). Overturned if the Stats page gets slow at real volume.
ASSUMPTION: days are UTC (rung 5). Overturned if Creators need their local day.
ASSUMPTION: the Country Header is whatever Phase 2's Geo Rule code reads, or `cf-ipcountry` if it reads none, and an absent or invalid value is recorded as `XX` (rung 3: v1 reads a header, geo_utils.js:51). Overturned when MaxMind is chosen.
ASSUMPTION (evidence blocked): the production country source needs the human. Cloudflare needs an account and proxied DNS; MaxMind needs an account, a download and a new dependency. Until one is set up, every production Event records `XX`, which costs nothing before Cutover because v2 has no live traffic until then. Under the Cloudflare route, a Custom Domain (Phase 5) that is not proxied by Cloudflare keeps recording `XX`. Overturned by the Operator's choice at Cutover.
ASSUMPTION: the ping lives at `POST /v/{username}`, mirroring `/r/` (rung 3), and `v` is a reserved Username. Overturned by a common API prefix from Phase 2.
ASSUMPTION: the ping shares Reveal's rate limiter (rung 3, ADR 0004). Overturned if the limiter cannot wrap a second route.
ASSUMPTION: Event writes are awaited and their errors swallowed, not fire-and-forget (rung 5). Overturned if redirect latency measurably grows.
ASSUMPTION: the owner field on `profiles` is the one Phase 2 named for D2's `user = @request.auth.id`. Overturned by Phase 2's actual name, which the rule then uses.
ASSUMPTION: Events cascade with their Profile, and a deleted Link's Clicks are kept as "Deleted link" (rung 4 for Links). Overturned if the Operator wants a deleted Profile's Events kept.
ASSUMPTION: Phase 4 owns D5's "replace the global localStorage trackId" with a per-Profile key, and the old key is ignored (rung 4). Overturned if Phase 1 already did it.
ASSUMPTION: In-App Browser patterns come from plan section 4, matched in the order Threads, Instagram, Facebook, TikTok (the order is rung 6). Overturned by real-device User-Agents.
ASSUMPTION: every load is a Page View, including the second load after an Escape through the app menu, and nothing is de-duplicated (rung 5). Overturned if Escape Mode Profiles show deflated CTR.
ASSUMPTION: the seed gains a second Creator and Profile, both Creators have known test passwords, and Phase 4's spec alone visits the second Profile (rung 4, additive). Overturned if Phase 2 or 3 already seeds them.
ASSUMPTION: tests reach PocketBase's records API at the URL Phase 2 exposes, and read the Operator's credentials from the seed's environment. Overturned if Phase 2 exposes neither.
ASSUMPTION: no chart library; bars are plain elements (rung 5). Overturned if real charts are wanted, which is a parked install.
ASSUMPTION: the Stats page is mobile-first and sits in Phase 3's creator-only area, reaching PocketBase the way the Editor does (rung 3). Overturned by Phase 3's actual area design.
