# Phase 02 — VPS foundation in Docker

**Objective.** One Docker Compose stack in this repo (Caddy, a Node app and PocketBase) serves every v1 Profile, imported and repaired from the v1 Snapshot with a fresh Link Id on every Link, through the Phase 0/1 page copy. It shows a PocketBase admin edit on the next page load, stores every uploaded image as WebP, and gives out a Destination only one Click at a time, through a hardened Reveal and `/r`.

## Problem Statement

The Operator runs ofl.ink as v1. Profiles are files in a public GitHub repo, written by the n8n Form and served by Netlify. Each edit costs about five commits and a build. A single shared secrets file means concurrent edits overwrite each other. Images are converted to WebP by hand. There is no database, no login and no server code that runs on a Click.

v1's data is also broken in places:

- One Profile file is invalid JSON, so its page falls back to the landing page.
- One display name is a literal n8n expression.
- Link Ids repeat inside Profiles and keep growing repeated Username prefixes.
- The secrets file holds keys that no Link uses.
- Some images are missing.
- Reveal answers any caller with no rate limit, and its ids can be guessed from the Username.

Section 8 of the plan forbids fixing any of this on the v1 side. Until v2 has its own server holding clean data, none of the later work can start: Editor, Stats, Custom Domains and Cutover all wait on it.

## Solution

v2 runs as one Compose stack built in this repo. It goes on the Hostinger VPS, next to the n8n that is already there, and has three services:

- **Caddy** terminates TLS and proxies to the app.
- **The app**, a Node service, serves the Phase 0/1 page copy, Profile JSON, the `/r/{Link Id}` redirect, Reveal and the image upload.
- **PocketBase** holds Profiles, Links, Destinations, images and the (still empty) Events, and provides the admin UI.

The v1 Import reads the v1 Snapshot read-only and repairs v1's known defects on the way in. It mints a fresh random Link Id for every Link and gives every imported Profile Escape Mode as its default Mode. It can be re-run against a refreshed snapshot until Cutover, and v1 wins each time.

Visitors get the page copy, which fetches Profile JSON from the app. That JSON never contains a Destination. An edit in the PocketBase admin UI shows on the next page load. Any image sent to the upload endpoint is turned upright, resized and stored as WebP.

v1 keeps serving ofl.ink, untouched, until Cutover (Phase 5). The existing Playwright suite now runs against this stack.

## User Stories

**Visitor**

1. As a Visitor, I want every v1 Profile served by v2 to show the same display name, bio, verified badge, avatar and Link cards (titles, lock icons, icons, backgrounds, order) as v1, so that nothing changes for me at Cutover.
2. As a Visitor, I want tapping a non-Adult Link to take me to the same Destination as on v1, through `/r/{Link Id}`, so that the Destination is never in the page.
3. As a Visitor, I want an Adult Link to show the Age Gate and, after "Continue (18+)", open the same Destination with the same Tracking Code suffix that v1's Reveal gives.
4. As a Visitor arriving at `/{username}/{code}`, I want my Tracking Code applied the way v1 applies it, so that the Creator's OnlyFans credits the right source.
5. As a Visitor from a country (or US state) that a Link's Geo Rule covers, I want that rule's Tracking Code appended, as v1 does.
6. As a Visitor opening a Link Shortcut that carries a v2 Link Id, I want that Link revealed when the page loads.
7. As a Visitor opening a Username that does not exist, I want to land on the landing page, as on v1.
8. As a Visitor following a bio link typed with capitals (`/Jaka`, `/JakaJaka`, `/weiWEi`), I want to see that Profile as v1 shows it.
9. As a Visitor opening `/weiwei`, I want to see that Profile, where v1 sends me to the landing page because its file is invalid JSON.
10. As a Visitor on jaka7q's Profile, I want a readable display name instead of an n8n expression.
11. As a Visitor, I want Profile images cached for good, as v1's images are, so that repeat visits load fast.
12. As a Visitor in an In-App Browser, I want every imported Profile to behave in Escape Mode, so that I still get the Escape Overlay that v1 shows me.
13. As a Visitor, I want the landing page, styles and page script served from the page copy unchanged.

**Creator**

14. As a Creator, I want no public response from v2 to contain my Destinations, whether it is Profile JSON, page HTML or PocketBase's API, so that crawling my Profile harvests nothing.
15. As a Creator, I want my Geo Rules and record internals kept out of the public Profile JSON. The one record internal it carries is the Profile's record id, which Phase 4 adds as its per-Profile Tracking Code key.
16. As a Creator, I want every Link to have a random Link Id unrelated to my Username, and v1's leaked ids to reveal nothing on v2.
17. As a Creator, I want to send a photo straight from my phone (JPG, PNG, HEIC, GIF or WebP) and have it stored as WebP, so that I never convert images myself (v1's optimize.py step).
18. As a Creator, I want an uploaded photo turned upright from its camera orientation and shrunk to 512 px (avatar, icon) or 1080 px (background), so that it displays correctly and loads fast.
19. As a Creator, I want location and camera metadata stripped from uploaded photos.
20. As a Creator, I want the upload endpoint to change only the records PocketBase says I may change.
21. As a Creator whose v1 non-Adult Links point at OnlyFans, I want them to stay non-Adult and keep their own url as their Destination, as the plan's §9 D1 answer says, and to reach it through `/r`.

**Operator: the stack**

22. As the Operator, I want one `docker compose up` to start Caddy, the app and PocketBase on the VPS.
23. As the Operator, I want Caddy to obtain and renew the v2 host's TLS certificate and redirect HTTP to HTTPS without manual steps.
24. As the Operator, I want the n8n already on the VPS left out of v2's Compose file and untouched.
25. As the Operator, I want v1 left untouched until Cutover: the old repo, Netlify, the n8n Form, and the v1 Snapshot in this workspace.
26. As the Operator, I want the PocketBase admin UI reachable only through an SSH tunnel.
27. As the Operator, I want the superuser credentials and the v2 host name kept in an untracked `.env` file.
28. As the Operator, I want PocketBase data and Caddy certificates to survive restarts and rebuilds, and the stack to come back by itself after a reboot.
29. As the Operator, I want the users, profiles, links and events collections defined as versioned migrations in this repo.
30. As the Operator, I want PocketBase's own auth to be the only auth in v2, with no login or ownership code in the app (D2: never hand-roll auth).
31. As the Operator, I want PocketBase's API closed to everyone but superusers until Phase 3 opens it.
32. As the Operator, I want PocketBase file fields to accept only WebP, so that every stored image is WebP however it arrives.
33. As the Operator, I want an edit to a Profile or Link in the PocketBase admin UI to show on the next page load, with no build and no restart.
34. As the Operator, I want an events collection carrying D5's fields ready for Phase 4, with nothing written to it yet.
35. As the Operator, I want Reveal to answer only the page's own origin and to rate-limit each client, with `/r` under the same limit, so that bulk harvesting is slowed (D8).
36. As the Operator, I want the Visitor's country and US state taken from the edge's request headers, so that Geo Rules work on v2.
37. As the Operator, I want the app and the v1 Import never to log or print a Destination.
38. As the Operator, I want `/netlify/functions/secrets.json` to answer 404 on v2, so that the old leak path is dead once ofl.ink points at v2.
39. As the Operator, I want a parity check I can point at the VPS, so that I can show every Profile matches v1 before Cutover.

**Operator: the v1 Import**

40. As the Operator, I want one command that copies every v1 Profile, Link, Destination and image from the v1 Snapshot into PocketBase.
41. As the Operator, I want weiwei's invalid JSON (a trailing comma) repaired on the way in rather than refused.
42. As the Operator, I want jaka7q's n8n-expression display name replaced by a readable one.
43. As the Operator, I want Links that share a Link Id inside one Profile imported as separate Links, each with its own Link Id, so that every card v1 shows survives.
44. As the Operator, I want every Link to get a fresh random Link Id, so that prefix-repeated and Username-derived v1 ids disappear from v2 (ADR 0004).
45. As the Operator, I want case-twin Profile files (Jaka/jaka, JakaJaka/jakajaka, weiWEi/weiwei) imported once with a warning, and twins whose bytes differ refused.
46. As the Operator, I want the 10 secrets entries that no Link uses dropped and reported by key, never by value.
47. As the Operator, I want an image that a Profile file names but the snapshot lacks to be imported as no image, with a warning.
48. As the Operator, I want a non-Adult Link that also has a secrets entry to keep its own url as its Destination, with a warning that the entry was dropped.
49. As the Operator, I want an Adult Link with no secrets entry imported without a Destination and named in a warning, so that I can fill it in through the admin UI.
50. As the Operator, I want every imported Profile to get Escape Mode as its default Mode, with its Links inheriting it.
51. As the Operator, I want to re-run the import against a refreshed v1 Snapshot until Cutover, with these guarantees:
    - no duplicates are created;
    - every Link keeps its v2 Link Id;
    - v1's fields win;
    - fields only v2 has (Mode, owner) are left alone;
    - every v1-imported record that v1 no longer has is named, not deleted.
52. As the Operator, I want the import to refuse a file it cannot repair, name it, and write nothing at all.
53. As the Operator, I want the import to run inside the app image with the v1 Snapshot mounted read-only for that one run, so that secrets.json is never mounted into the running app.

**Developer**

54. As a developer, I want `./check.sh` to start the stack with docker compose, seed it with the v1 Import, run every spec and tear the stack down, all at the same baseURL as before. The seed takes the v1 Snapshot plus Phase 0's Fixture Profile and test-only secrets file.
55. As a developer, I want the Phase 0 and Phase 1 specs to pass against v2 unchanged. They read Link Ids from the served Profile rather than pinning them.
56. As a developer, I want the test stack in its own Compose project with throwaway data, and never to land on a server it did not start.
57. As a developer, I want test failures never to print a Destination, because failing output is pasted into tickets (plan §7).
58. As a developer, I want committed image fixtures for every D4 format, so that the upload spec runs offline.
59. As a developer, I want a check that no v1 Destination sits in any file this repo tracks or would add.

## Implementation Decisions

- **Owns.**
  - **Stack.** The Compose file and the Caddy config at the repo root, the environment contract, and `.env` added to `.gitignore`. The services are `caddy`, `app` and `pocketbase`; n8n is not one of them.
  - **PocketBase image and schema.** A `pocketbase/` directory holding an image built from the official PocketBase 0.40.4 release archive, which the build COPYs from the git-ignored `vendor/` (plan §11, 2026-10-04), plus versioned JS migrations for the collections below.
  - **App.** The `app/` directory: a Node service on Hono, with its own package manifest and lockfile. Its modules:
    - **PocketBase gateway**: the app's only door to PocketBase.
    - **Public Profile**: turns records into the Profile JSON.
    - **Destination resolver**: a port of v1's reveal.js and geo_utils.js.
    - **Visitor location**: reads country and region from request headers.
    - **Click guard**: the rate limit, plus the same-origin check for Reveal.
    - **Image pipeline**: sharp.
    - **Public page**: serves the page copy.
    - **Routes**: the HTTP contract below.
    - **v1 Import**: a CLI shipped in the same image.
  - **e2e stack.**
    - The Playwright webServer moves to a stack wrapper.
    - A committed `tests/e2e.env`.
    - Image fixtures and small v1-shaped fixture trees for the import spec.
    - The five specs under Testing Decisions.
    - Changes to `playwright.config.ts`.
    - `tests/dev-server.mjs` is removed: plan §7 replaces it with docker compose from Phase 2 on, and YAGNI.

  ASSUMPTION: the Compose file and Caddyfile sit at the repo root, with `app/` and `pocketbase/` beside them. Rung 2 for `app/`: plan §9 names `pnpm --dir app add …`. Rung 3 for the rest: plan §7 runs `docker compose up` from the root, where Playwright runs. Overturned if v2's stack should live in a sub-directory or its own repository.

  ASSUMPTION: Hono, not Express. Rung 2: plan §9's own install line is `pnpm --dir app add hono @hono/node-server sharp`. Rung 5 agrees: Hono parses multipart bodies and serves static files with those two packages, where Express needs express plus multer. Overturned if Hono's Node adapter cannot stream PocketBase files or serve the page copy.

- **Interfaces.**
  - **PocketBase gateway:**
    - `getProfile(username)` returns the Profile and its Links in `order`, or none. The Username is matched lower-cased.
    - `getLink(linkId)` returns the Link or none.
    - `fetchFile(collection, recordId, filename)` returns a stream.
    - `viewRecord(collection, recordId, callerToken)` and `replaceFile(collection, recordId, field, webp, callerToken)` return PocketBase's own status.
    - Reads run as a superuser whose credentials come from the environment, re-authenticating on a 401. Upload writes always carry the caller's token, never the superuser's.
  - **Public Profile:** `toPublicProfile(profile, links, origin)` returns the Profile JSON under Contracts.
  - **Destination resolver:** `resolveDestination(link, trackingCode?, location)` returns a URL or none. Reveal and `/r` both use it.
  - **Visitor location:** `visitorLocation(headers)` returns `{ country, region }`.
  - **Click guard:** `allow(clientIp)` and `sameOrigin(request)`, each returning a boolean.
  - **Image pipeline:** `toWebp(bytes, maxSide)` returns WebP bytes or an "unsupported image" error.
  - **v1 Import:** `import-v1 --site <dir> [--site <dir>]…`, on the app image's PATH and run through `docker compose run`.
    - Each `<dir>` is laid out like the v1 Snapshot: Profile files in `api/profiles/*.json`, Destinations in `netlify/functions/secrets.json`, and image paths (`/images/…`) resolved against `<dir>`.
    - A Profile looks up Destinations only in its own site's secrets file. A Username found in two sites refuses the run.
  - **Public page:** serves the page copy directory, `app/public/`, which the build copies into the app image.

  ASSUMPTION: `--site` takes v1-shaped directories. The seed passes Phase 0's `tests/fixtures/` as the Fixture site, as Phase 0 lays it out (`api/profiles/fixture.json`, `netlify/functions/secrets.json`). It bind-mounts `app/public/images/` read-only as that site's `images/`, because the Fixture Profile's image paths name the stock icons Phase 0 puts there (Phase 0 spec, Implementation Decisions: Page Copy and the Fixture Profile sample). Rung 5: one input shape for production and the seed, and no rule is needed for a Link Id that appears in two secrets files. Overturned by a change to Phase 0's fixture layout; only the seed's mounts change.

- **Schema.** PocketBase collections, created and changed only through versioned migrations. In Phase 2 every API rule of every collection is superuser-only.

  ```
  users     PocketBase's built-in auth collection; all rules superuser-only (sign-up closed)
  profiles  username             text, required, unique, ^[a-z0-9_]+$
            displayName          text
            bio                  text
            verified             bool
            avatar               file, max 1, image/webp only, ≤ 5 MB
            mode                 select direct | escape_ig | deeplink, optional    (default Mode; empty reads as escape_ig)
            owner                relation -> users, optional
            v1Key                text, optional                                    (v1 file name; empty for v2-born Profiles)
  links     profile              relation -> profiles, required, cascade delete
            linkId               text, required, unique, autogenerated [a-z0-9]{12}
            title                text, required
            order                number
            isAdult              bool
            mode                 select direct | escape_ig | deeplink, optional    (empty = the Profile's default Mode)
            destination          text, optional, pattern ^(https?://[^\s\\/]|/[^\s\\/])[^\s\\]*$   (absolute http(s) URL or root-relative path)
            tracking             bool
            defaultTrackingCode  text, optional                                    (v1 default_tracknumber, verbatim)
            geo                  json, optional                                    (Geo Rule, v1 shape)
            icon                 file, max 1, image/webp only, ≤ 5 MB
            backgroundImage      file, max 1, image/webp only, ≤ 5 MB
            v1Key                text, optional                                    ("<v1 Link Id>#<n>", n = occurrence within the file)
  events    profile              relation -> profiles, required, cascade delete
            link                 relation -> links, optional                       (empty for a Page View)
            kind                 select page_view | click
            country              text
            inAppBrowser         text
            created              autodate
  ```

  ASSUMPTION: every rule is superuser-only in Phase 2, `users` sign-up included, even though §9 answers D9 with public sign-up. Rung 4: a closed rule is cheaper to undo than a leak, and ADR 0002 makes rules the security boundary. Phase 3 opens sign-up and owner rules. Overturned if PocketBase's API must be reachable before Phase 3.

  ASSUMPTION: the events collection is created here with D5's fields (Profile, Link, country, In-App Browser, time, plus Page View or Click), and nothing writes to it in Phase 2. Rung 2 on both counts: plan Phase 2 lists the events collection, and plan Phase 4 says "events written by /r/:linkId and a page-view ping". Phase 4 may extend the collection with an additive migration. Overturned if Phase 4 expects `/r` or Reveal to write Events already.

  ASSUMPTION: Link Ids live in their own `linkId` field: 12 random `[a-z0-9]` characters, separate from the PocketBase record id. Rung 5 for the length, since D8 asks for "random 10+ chars". Rung 4 for the separate field: a leaked Link Id can be replaced without recreating the record its Events point at. Overturned if Phase 3 or Phase 4 wants the record id itself as the Link Id.

  ASSUMPTION: Usernames match `^[a-z0-9_]+$`. Rung 1 for today's data: all 27 file names in `linkme_clone3/api/profiles/` match. Phase 3 owns the rules for new Usernames. Overturned by Phase 3's Username rules.

  ASSUMPTION: `profiles.owner` exists from now on but stays empty on import. Rung 5: the plan lists users alongside profiles, and imported Profiles have no Creator yet. Overturned if Phase 3 ties Creators to Profiles another way.

  ASSUMPTION: file fields accept only image/webp, so the admin UI refuses a dropped-in JPG instead of converting it. Rung 4: this keeps "every stored image is WebP" true without a second converter inside PocketBase. The 5 MB cap clears the largest v1 image, about 2.8 MB (`ls -lS linkme_clone3/images`). Overturned if the Operator must upload raw photos through the admin UI before the Editor exists (Phase 3).

  ASSUMPTION: `links.destination` enforces `^(https?://[^\s\\/]|/[^\s\\/])[^\s\\]*$` in the schema, not only in the import. Reveal hands that value to the page, which navigates to it, so a `javascript:`, `//host`, `/\host` or `/<TAB>/host` value typed into the admin UI (or, from Phase 3, the Editor) would run on, or leave from, v2's own origin: browsers read `\` as `/` and drop tab and newline, so the pattern refuses a backslash or whitespace anywhere and needs a host or path character right after `http(s)://` or the leading `/`. PocketBase patterns are Go RE2, so there is no lookahead. Rung 4: a rule is cheaper to relax than an injected script is to recall. Overturned if a Destination must use another scheme, or a literal space or backslash; D3's Deeplink hands over an https link, so none does yet.

- **Contracts.**

  HTTP. Every request reaches the app through Caddy. The app answers the paths that v1's page script calls, so the page copy needs no path changes.

  | Request | Answer |
  |---|---|
  | `GET /api/profiles/{username}.json` | 200 with the Profile JSON, or 404 `{"error":"Profile not found"}`. The Username is matched lower-cased. `Cache-Control: public, max-age=0, must-revalidate` (v1's netlify.toml rule) |
  | `GET /.netlify/functions/reveal?id&user&trackingId` | 200 `{"realUrl": …}`; 404 `{"error":"Link not found"}`; 403 cross-origin; 429 over the limit. Never an `Access-Control-Allow-Origin` header. Every answer `Cache-Control: no-store` |
  | `GET /r/{linkId}` | 302 with `Location:` the Destination; 404; or 429. Every answer `Cache-Control: no-store` |
  | `GET /api/files/{profiles\|links}/{recordId}/{filename}` | The file, only while it is that record's current avatar, icon or backgroundImage, else 404. `Cache-Control: public, max-age=31536000, immutable` |
  | `POST /api/upload/{collection}/{recordId}/{field}`, with `Authorization: <PocketBase token>` and multipart `file` | 200 `{"url": "/api/files/…"}`; 401 with no token; PocketBase's own 403 or 404 passed through; 404 for a target not listed below; 413 over 20 MB; 415 for anything that is not a decodable image |
  | `GET /netlify/*` | 404 with landing.html as the body |
  | Any other `GET` | The file at that path in the page copy, else index.html with 200 (v1's `/* → /index.html` rule) |

  Upload targets: `profiles/avatar` (512 px), `links/icon` (512 px), `links/backgroundImage` (1080 px).

  Profile JSON keeps v1's Profile-file shape, minus everything that belongs only on the server:

  ```
  { "profile": { "id"?, "username", "displayName", "bio", "avatarUrl", "verified", "mode" },
    "links":   [ { "id", "title", "isAdult", "tracking", "default_tracknumber"?, "mode",
                   "icon", "backgroundImage", "url" } ] }                 // links in `order`
  profile.id  the Profile's record id; added by Phase 4, not by this Phase, as its per-Profile Tracking Code key (Phase 4 spec, Owns)
  id          the Link Id
  url         "{origin}/r/{id}" for a non-Adult Link in Direct or Escape Mode;
              "" for an Adult Link (Age Gate, then Reveal) and for any Link in Deeplink Mode (Reveal, then Deeplink)
  mode        effective Mode: profile.mode = the Profile's, else escape_ig; links[].mode = the Link's, else profile.mode
  image keys  "/api/files/…" or ""
  never sent  destination, geo, owner, v1Key
  ```

  Reveal and `/r` share the Destination resolver, which keeps v1's rules (linkme_clone3/netlify/functions/reveal.js:13–38, geo_utils.js:48–77):

  - A `trackingId` made of digits appends `/c{digits}`, after dropping one trailing slash.
  - `trackingId=geo` picks a Tracking Code from the Link's Geo Rule:
    - a string entry for the country is the code;
    - an object entry for the country gives its region entry, else its `default`;
    - with no entry for the country, the rule's own `default` is used;
    - if none of these exists, nothing is appended.
  - Any other `trackingId` appends nothing.
  - `user` is accepted and ignored, because a v2 Link Id is unique across all Profiles.
  - Reveal answers for any Link that has a Destination, Adult or not, so that Link Shortcuts and Deeplink Mode work for non-Adult Links too. `/r` appends no Tracking Code: v1's non-Adult tap carries none (script.js:200).

  Visitor location:
  - country is `x-country`, else `cf-ipcountry`, else `US`;
  - region is `x-nf-subdivision-code`, else `x-region`, else `cf-region-code`, else empty.

  Compose environment:
  - `SITE_ADDRESS`: Caddy's site. The v2 host on the VPS, `:80` in tests.
  - `HTTP_PORT` / `HTTPS_PORT`: default 80 / 443.
  - `PB_PORT`: default 8090, bound to 127.0.0.1 only.
  - `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD`: required.
  - `REVEAL_LIMIT_PER_MINUTE`: default 60.

  On the VPS these live in an untracked `.env`. Tests use the committed `tests/e2e.env`, which holds test-only values, `REVEAL_LIMIT_PER_MINUTE=600`, `HTTP_PORT=4173` (today's baseURL, playwright.config.ts:3), a PB_PORT that does not clash with other local stacks, and a `COMPOSE_PROJECT_NAME` of its own.

  v1 Import output:
  - **Success.** Exit 0. One line per repair or skip (`repaired:`, `skipped:`, `dropped:`, `missing image:`, `no destination:`, `stale in v2:`), each naming a file, Username, card position or secrets key, never a Destination. Then a summary count of Profiles, Links, images and warnings.
  - **Refusal.** Exit 1 with one `invalid v1 file: <path>: <reason>` line per problem. Nothing is written: every file is read and validated before PocketBase is contacted.
  - **Failure while writing.** A PocketBase error during the write phase gives exit 2. The writes are upserts, so running the import again completes it.

  ASSUMPTION: the app answers v1's own paths, `/api/profiles/{username}.json` and `/.netlify/functions/reveal`, so the page copy reads from the app without a path change ("Public page = existing index.html/script.js reading from the app", plan Phase 2). Rung 5. Overturned if Phase 0/1's page copy calls other paths; the app then answers those instead.

  ASSUMPTION: a non-Adult Link's `url` is the absolute `{origin}/r/{id}`. Rung 2 for leaving the Destination out (D8: "no real URL in any public file"). The absolute form is needed because v1's Escape code strips the scheme from the URL it is handed (script.js:29, :33). Overturned if Phase 1's page builds its own redirect URLs from the Link Id.

  ASSUMPTION: a Link in Deeplink Mode gets an empty `url` even when it is not Adult. Phase 1's page reveals every Deeplink Mode Link whatever its `url` holds (Phase 1 spec, the Deeplink Mode ASSUMPTION), so the value is never followed, and leaving it empty keeps an ofl.ink address that no app owns out of a hand-off that D3 means for the Destination's own app. Rung 5: one rule in the projection. There is no fallback to `/r/{id}`: that would make Deeplink behave like Direct, against D3. Overturned if Phase 1's page stops revealing Deeplink Links; the page then changes, not the projection. The hand-off itself is judged by Phase 1's real-device matrix.

  ASSUMPTION: Reveal and `/r` answer `Cache-Control: no-store`, so that no browser or edge cache (Cloudflare, Further Notes) replays a Destination outside the rate limit, or swallows a Click that Phase 4 must count. Rung 4: one header, cheaper to drop than a cached Destination is to recall. Overturned if Phase 5 puts a cache in front that needs these answers cacheable.

  ASSUMPTION: `/netlify/*` answers 404 with landing.html as its body, not the catch-all's 200. Rung 2: the plan's Phase 0 DONE line ("ofl.ink/netlify/functions/secrets.json returns 404") can only come true on v2 once ofl.ink points here. Rung 5 for the body. Overturned if a Username `netlify` must exist; Phase 3 reserves it.

  ASSUMPTION: the Geo Rule stays out of the Profile JSON. Rung 1 for v1: script.js never reads `geo`, and Reveal looks it up on the server. Overturned if Phase 1's page reads `geo`.

  ASSUMPTION: Mode travels as `profile.mode` and `links[].mode`, always the effective value, using D3's stored names. Rung 2 for the field and its values (plan Phase 1: "mode field in profile JSON"; D3). Sending effective values rather than raw ones is rung 5, so the page never needs the fallback rule. Overturned by the names Phase 1's page reads.

  ASSUMPTION: Visitor location tries v1's header names first, then Cloudflare's, and falls back to US as v1 does. Rung 3: geo_utils.js:48–49. A Visitor can fake their own country, which changes only the Tracking Code on their own Click. Overturned if that matters before Phase 5, which owns stripping these headers at the edge. On a host where no country header arrives, every Visitor takes this US fallback: today on Phase 2's v2 host, and after Cutover on every DNS-only Custom Domain, because production takes its country from Cloudflare, which plan §11 chose on 2026-10-04 and whose US fallback there it accepts (Phase 5 spec, DNS records). In all 7 v1 Links that carry a Geo Rule, the US entry's `default` equals the rule's own `default` (observed, plan review), so such a Visitor gets the rule's catch-all code and loses only their own country's or US state's code.

  ASSUMPTION: `/r` serves any Link that has a Destination, Adult or not, under the same rate limit as Reveal. Rung 5: the Age Gate is client-side, Reveal already gives out Adult Destinations, and ADR 0004 treats both as obfuscation. Overturned if Adult Destinations may leave only through Reveal.

- **What "identically" means (the DONE line).**
  - **The baseline is the v1 Snapshot** (`linkme_clone3/`), read when the tests run. No Profile count is written down: the plan says "27-29" in §1 and "27" in Phase 2, and 27 files are observed today.
  - **What stays the same:** every Profile page's display name, bio, verified badge, avatar and cards, in v1's order, with nothing added; and the Destination every Click ends at, for the same Tracking Code and Visitor location.
  - **What differs on purpose:**
    - A non-Adult tap goes through `/r/{id}`.
    - The Profile JSON carries no Destination and no Geo Rule, and `url` is empty for Adult and Deeplink Links.
    - Image URLs move to `/api/files/…`, with the same bytes.
    - Link Ids are new, so every v1 Link Id and every v1 Link Shortcut answers 404 (ADR 0004).
    - The repairs below show: `/weiwei` and `/weiWEi` show a Profile, and jaka7q shows its Username as its display name.
    - A Link Shortcut to a non-Adult Link opens that Link's url, where v1's Shortcut always called Reveal and so opened its secrets entry or nothing (script.js:83–112).
    - Usernames match case-insensitively, so `/JAKA` shows jaka on v2 but lands on the landing page in v1.

  ASSUMPTION: the v1 Snapshot stands in for "Netlify" in the plan's DONE line ("identically to Netlify"). Floor 2 keeps tests off live production, and ADR 0002 makes the snapshot the import's only source. The Operator refreshes it before the last run. Overturned if the Operator wants a live comparison against ofl.ink, which would be a manual run outside this suite.

- **v1 Import — repairs.** The data was observed in `linkme_clone3/` on 2026-10-02 with read-only scripts that printed counts and ids, never secrets.json values.
  - **The Username is the Profile file's name, lower-cased.** The page takes the Username from the URL path (script.js:46–47, :67), and three files carry a different `username` value inside. Rung 1.
  - **Invalid JSON (weiwei).** A file that fails to parse is retried once with only the trailing commas before `}` or `]` removed. If that parses, it is imported with `repaired: <file>: trailing comma`. If it still fails, the file is refused.
    - Observed: weiwei.json fails at line 8, column 3, on a trailing comma, and parses once that comma is removed. Rung 1 for the method; rung 2 for repairing it (plan §2 lists it; §8 moves the repair here).
    - Its contents are a copy of juliafilippo's page (display name "Julia Filippo", 2 Links).

    ASSUMPTION: `/weiwei` serves the repaired file's contents, although v1 sends that path to the landing page. Rung 2: plan §2 lists weiwei among the Profiles to fix, and §8 moves that repair into the import. Overturned if the Operator would rather drop weiwei.
  - **n8n expression as display name (jaka7q).** A display name containing `$(` or `{{` is replaced by the Username, with a `repaired:` warning. Observed: 1 file.

    ASSUMPTION: the Username is the replacement. Rung 3: jaka6q, the Profile whose Links jaka7q copies (its ids are `jaka7q` + `jaka6qname1`), uses its Username as its display name. Overturned by a display name the Operator supplies.
  - **Duplicate Link Ids in a Profile.** Every entry in `links` becomes its own Link with its own fresh Link Id, in file order. Rung 2: the DONE line's "identically", since v1 renders every entry (script.js:144–205).
    - Observed in juliafilippo_, jaka6q and jaka7q, one duplicated id each.
    - jaka6q's two entries match in title, url and background.

    ASSUMPTION: exact-duplicate cards are both kept. Rung 2: the DONE line's "identically", since v1 shows both. Overturned if the Operator wants them merged.
  - **Prefix-repeated and Username-derived ids.** v2 never uses a v1 id as a Link Id. The v1 id serves only as the secrets lookup key and inside the private `v1Key`. Rung 2: ADR 0004, plan §8.
    - Observed: `juliafilippo_juliafilippo_juliafilippo_*` on 3 Links, `jaka7qjaka6qname1` on 2.
    - The ids `1` and `2` are shared between juliafilippo and the repaired weiwei; they resolve per site, as v1 does.
  - **Case twins.** v1's git tree holds three capitalised Profile files whose blobs equal their lower-case twins: Jaka/jaka, JakaJaka/jakajaka, weiWEi/weiwei. Two images are twinned the same way, JakaJaka.webp and weiWEi_alt1.webp. All of these are observed with `git -C linkme_clone3 ls-tree -r HEAD`.
    - This Mac's case-insensitive checkout shows only the 27 lower-case Profile files, while a Linux checkout shows all 30.
    - A file whose lower-cased name matches another file with equal bytes is skipped with `skipped: <file>: case twin of <file>`. A twin whose bytes differ refuses the run.

    ASSUMPTION: skip the twins and match Usernames lower-cased, rather than refuse the run or drop the capitalised addresses. Rung 4: no bio address that v1 serves is lost, and nothing is guessed, because the bytes are equal. Overturned if the Operator wants the capitalised addresses gone.
  - **Orphan secrets entries.** A secrets key that no Link in its site uses is dropped and named by key with `dropped: secrets entry <key> has no Link`. Rung 1:
    - 10 such keys are observed (one has an empty value).
    - Collapsing repeated prefixes maps each orphan either to a Link that already has its own secrets entry or to no Link, so none is a lost Destination.
    - v1 reached them only through Link Shortcuts, which fresh ids end anyway.
  - **Missing images.** A Profile file that names an image path missing from its site imports with that field empty and `missing image: <file>: <field>`. Observed: 6, all avatars (bnjmklk, ja123, jaka, jaka5, jaka6q, jaka7q).

    ASSUMPTION: an empty field rather than a placeholder image. Rung 5: v1 already shows no avatar there, since its image request fails and the alt text is empty (index.html:38). Overturned if the Operator wants a default avatar.
  - **Non-Adult Links with a secrets entry.** The Destination is the Link's own `url`, which is what a v1 tap opens (script.js:200). The entry is dropped with a warning. Rung 2: §9 D1, "v1's non-Adult Links keep their public url".
    - Observed: 3 Links in the parseable files (juliafilippo's `2`, and juliafilippo_'s duplicated id twice), plus weiwei's `2` once it is repaired.
    - None of the 4 entries equals its Link's url (compared, not printed).
  - **Non-Adult Links with an OnlyFans url.** These stay non-Adult, as §9 says ("LEFT AS THEY ARE"); their Destination is their `url`, reached through `/r`. Observed: 6. Rung 2.
  - **Adult Links with no secrets entry.** They import without a Destination, with `no destination: <username> card <n>`, and Reveal answers 404, as v1's does today. Observed: 8, and 7 of them carry a `url` in their v1 file that v1 never uses for an Adult Link.

    ASSUMPTION: these stay dead, and the file's `url` is not promoted to a Destination. Rung 2: the DONE line's "identically", since all 8 fail in v1. Overturned if the Operator wants those 7 repaired from their file's url; that is a one-rule change in the import.
  - **Relative urls.** A relative non-Adult `url` is stored root-relative (`landing.html` becomes `/landing.html`), which is how the v1 page resolved it. Observed: 2, both in juliafilippo_. Rung 1.
  - **Image bytes.** WebP images are copied byte for byte; all 48 referenced files are WebP today (checked for the `RIFF…WEBP` header). Any other format is sent through the Image pipeline at its target size.

    ASSUMPTION: convert rather than refuse a non-WebP v1 image. Rung 5: the pipeline is already in the same image. Overturned if non-WebP inputs should stop the import.
  - **Modes.** A new Profile gets `mode = escape_ig`, and its Links get an empty `mode`, so they inherit it. Rung 2: §8, "v1 Profiles import with the default Mode (escape_ig)". A Profile file that carries a valid `mode` (the Fixture Profile) uses it, on the Profile and on each Link that has one.
  - **Refused outright:** a file still invalid after the trailing-comma repair; a file without a `profile` object or a `links` array; a file name that does not lower-case to a valid Username; case twins whose bytes differ; one Username in two sites; a Destination that is neither an absolute http(s) URL nor a root-relative path, on a Link that would use it.

    ASSUMPTION: repair what is listed above and refuse anything else. Rung 4: never import guessed data. Overturned if the Operator wants partial imports that skip bad files.

- **v1 Import — re-runs (until Cutover, v1 wins; ADR 0002).**
  - **Matching.** Profiles are upserted by Username. Links are upserted within their Profile by `v1Key` (`<v1 id>#<occurrence>`), so a Link keeps its v2 Link Id across runs, duplicated v1 ids included.
  - **v1 wins on v1's fields:** display name, bio, verified, avatar, title, order, Adult flag, tracking, default Tracking Code, Geo Rule, Destination, icon and background. Image files are replaced on every run.
  - **v2-only fields survive:** `mode`, `owner` and `linkId` are set when a record is created and never touched by a later run.
  - **New and vanished Links.** A v1 Link new since the last run gets a fresh Link Id. A v1-imported record (one with a `v1Key`) that this run's input no longer contains is named in a `stale in v2:` warning and kept, still public, until the Operator deletes it. Records born in v2 have no `v1Key` and are never named.
  - **Reconciliation is a required step.** A served stale record is a card v1 no longer shows, so the parity check against the VPS fails while one is left. That failure is the gate working, not a defect. Before the VPS parity run, and again after Phase 5's final import, the Operator deletes through the admin UI every record that a `stale in v2:` line names (Acceptance).

  ASSUMPTION: re-runs match on a private `v1Key`, keep Mode and owner, and warn about stale records instead of deleting them, which makes the Operator's deletion of stale records a required step before parity is signed off. Rung 4: a deletion cannot be undone without backups, and a Mode chosen in v2 has no v1 counterpart for v1 to overrule. ADR 0002's "v1 winning" still holds at sign-off, because the parity gate cannot pass until v1's deletions are mirrored. Overturned if the Operator wants re-runs to delete stale records themselves (a `--prune` flag), or to reset Mode to escape_ig.

- **v1 Import — how it runs.**
  - It runs inside the app image with `docker compose run --rm`, with the v1 Snapshot mounted read-only for that run only (`-v "$PWD/linkme_clone3:/v1:ro"`). The VPS needs no Node of its own, and the running app never mounts secrets.json.
  - The import writes as the superuser.
  - The app and the import never log a Destination. Rung 2: plan §7 pastes failing output into tickets, and D8.

- **Public page.** The app serves the page copy that Phase 0 creates at `app/public/` (index.html, script.js, style.css, landing.html and the stock icons under `images/`). The build copies it into the app image.
  - The app's own routes are matched first, and index.html is the catch-all.
  - Nothing of the page is copied from `linkme_clone3/` by this Phase.
  - The app's build context is `app/` alone, so the v1 Snapshot cannot be baked into the image. The page copy is baked in, because it sits inside `app/`.

  ASSUMPTION: the page copy lives in `app/public/`, where Phase 0 puts it (Phase 0 spec, Implementation Decisions: Page Copy). Rung 5: the app serves its own directory with no extra mount. Overturned by a change to Phase 0's layout; only the Dockerfile's copy line follows it.

  ASSUMPTION: the page copy is baked into the app image, not bind-mounted. Rung 5: one self-contained image for the VPS. `./check.sh` runs `up --build`, so Phase 1's page edits reach the test stack on every run. The build context `app/` holds no v1 file, so nothing of `linkme_clone3/` can reach the image. Overturned if page edits must reach the VPS without a rebuild.

- **No cache.** Every Profile request reads PocketBase, which is what puts an admin edit on the next load. Images can be cached as immutable because PocketBase gives every stored file a new name.

- **Reveal hardening (D8).**
  - Reveal sends no CORS header.
  - Reveal answers 403 when `Origin` names another origin than the one the request came to, or when `Sec-Fetch-Site` is `cross-site` or `same-site`. A request carrying neither header passes.
  - Reveal and `/r` share an in-memory, fixed-window limit per client IP (`REVEAL_LIMIT_PER_MINUTE`). The client IP is the last entry of `X-Forwarded-For`, the one Caddy writes, never the first, which a client can set. A 429 body carries no Destination.
  - The app publishes no port, so only Caddy reaches it.
  - Only v2 Link Ids resolve; every v1 id answers 404.

  ASSUMPTION: "own origin" means same-origin, checked with `Origin` and `Sec-Fetch-Site`. Rung 2 via ADR 0004, which the invocation binds. Overturned if Profiles on other domains must call Reveal across origins.

  ASSUMPTION: the limit is 60 per client IP per minute in production and 600 in the test env, held in one app container's memory. Rung 5 for keeping it in memory. Rung 6 for the number: D8 gives none, and a Visitor makes only a handful of Reveals per visit. Overturned if mobile-carrier NAT produces false 429s; then the number goes up.

- **Upload (D4).**
  - The app first checks the caller's token by viewing the target record through PocketBase, before decoding anything.
  - It then converts the image and replaces the file with the caller's token. The app never decides ownership (ADR 0002).
  - The pipeline turns the image upright from its EXIF orientation and shrinks it so that its longest side is at most the target, never enlarging it. It encodes WebP at quality 80, keeps transparency and drops all metadata.
  - An animated GIF keeps its first frame. An image over sharp's default pixel limit gets 415.
  - Replacing a file leaves PocketBase to delete the old one.

  ASSUMPTION: "avatar 512px, background 1080px" means the longest side, keeping the aspect ratio, with icons at the avatar size and a 20 MB input cap. Rung 5: one rule for every target, and D4 defers animation until video is added. Overturned if the Operator meant square-cropped avatars or a fixed width.

  ASSUMPTION (evidence blocked): sharp's prebuilt binaries decode JPG, PNG, GIF and WebP but not HEVC-coded HEIC. This is recalled, not observed, because installing sharp is a network fetch. If the HEIC case fails with sharp alone, the pipeline decodes HEIC with heic-convert (pure JS) first, and that new dependency is parked as a human command. Overturned if the HEIC fixture passes with sharp alone.

- **Caddy (D6).** There is one site, `SITE_ADDRESS`, reverse-proxied to the app. On the VPS, Caddy obtains and renews the certificate and redirects HTTP to HTTPS by itself. Certificates live in a named volume. PocketBase is not routed through Caddy.

  ASSUMPTION: on-demand TLS for Custom Domains moves to Phase 5. Plan Phase 2 lists it on the caddy line (goal_ai.txt:137). Phase 2's DONE line does not (goal_ai.txt:145–146), and Phase 5 holds the feature it serves ("Custom domain per profile via Caddy on-demand TLS", goal_ai.txt:163). It needs D6's per-Profile domain field and an `ask` check that has no domain list to consult before Phase 5. Without that check it would either issue a certificate for any domain or refuse every one. The plan's own lines split here, so rung 2 does not settle it. Rung 4 does: adding an on-demand block later is additive, while certificates issued for any domain cannot be recalled. The user's standing YAGNI instruction agrees. Overturned if the Operator wants on-demand TLS live before Phase 5.

- **PocketBase.**
  - Built from the official release archive (PocketBase publishes no official image), pinned at 0.40.4, on `alpine:3`. The archive is COPYd from `vendor/` and never fetched: no `curl` or `wget` in a `RUN` step and no `ADD <url>` (Offline build, below; plan §11, 2026-10-04).
  - The superuser comes from the environment and is upserted on every start.
  - Migrations are copied into the image.
  - Data lives in a named volume mounted at `/pb/pb_data`, the `--dir` the image starts PocketBase with. The Acceptance predicate checks that path.
  - It is published on 127.0.0.1 only, and the admin UI is reached through an SSH tunnel.

  The pin is 0.40.4, set by the Operator (plan §11, 2026-10-04; rung 2). It meets the floor of 0.23, which brought JS migrations, autodate fields and the superuser command. The earlier evidence-blocked ASSUMPTIONs on the pin and on BuildKit re-checking an `ADD <url>` source are dropped as moot: nothing in the build downloads.

  ASSUMPTION: the admin UI is reachable only through an SSH tunnel. Rung 4: nothing new goes on the public internet. Overturned if the Operator wants a public admin host, which would be one more Caddy site.

  ASSUMPTION: the app reads PocketBase as a superuser. Rung 5: no service account and no extra rules are needed. Overturned if a least-privilege account is wanted before Phase 3 exposes PocketBase.

- **Offline build (plan §11, 2026-10-04; rung 2, binding).**
  - `docker compose build` makes no network request. If it would, the ticket that hit it parks with the build output and the command, rather than fetch.
  - The PocketBase Dockerfile COPYs the pinned zip from `vendor/` (git-ignored): `pocketbase_0.40.4_linux_arm64.zip` on this Mac, `pocketbase_0.40.4_linux_amd64.zip` on the VPS. It never curls.
  - The app Dockerfile COPYs `app/`, `node_modules` included, and runs no `pnpm install`. `app/node_modules` holds sharp's linuxmusl-arm64 and linuxmusl-x64 binaries (pnpm `supportedArchitectures` in `app/package.json`; observed: `ls app/node_modules/.pnpm | grep sharp-linuxmusl`), so one tree serves this Mac and the VPS.
  - The Operator installed hono 4.13.13, @hono/node-server 2.1.3 and sharp 0.35.5, and pulled `alpine:3`; `caddy:2-alpine` and `node:22-alpine` were already local.
  - The copy to the VPS carries `vendor/` and `app/node_modules`: its rsync excludes only the root `/node_modules` (observed locally: an anchored `--exclude /node_modules` keeps `app/node_modules` and `vendor/`). On the VPS the build's only network use is pulling those three base images if they are absent there, inside the Operator's `up -d --build` line.

  ASSUMPTION: the PocketBase Dockerfile picks its zip by Docker's `TARGETARCH` (`arm64` here, `amd64` on the VPS), and its build context reaches `vendor/` without being the repo root, so `linkme_clone3/` is never sent to the builder. Rung 5: one Dockerfile for both machines; rung 4: the v1 Snapshot stays out of every build context, as the app's does. Overturned if the VPS builds for another architecture, or if Compose cannot give the PocketBase build `vendor/` without the repo root.

- **n8n.** v2's Compose file does not define, start or reach n8n (ADR 0001). It keeps running as it does today (D1).

- **Restarts and readiness.**
  - All three services restart `unless-stopped`.
  - PocketBase has a healthcheck on `/api/health`, and the app depends on it being healthy.
  - `docker compose up --wait` therefore returns with the stack ready for the import.
  - A recreated stack keeps its data. `02-v1-import` recreates `pocketbase` and `app` and checks that records and files created before are still served.

- **Base images.** `caddy:2-alpine` and `node:22-alpine`, both already on this Mac (`docker images`, 2026-10-02), and `alpine:3` under PocketBase, which needs a pull.

  ASSUMPTION: Node 22 LTS on Alpine for the app. Rung 5: it is already local, and sharp ships prebuilt musl binaries for it. Overturned if sharp misbehaves on Alpine; then use `node:22-slim`.

- **Test loop (plan §7).**
  - **Startup.** The Playwright webServer runs the stack wrapper, which:
    1. runs `docker compose --env-file tests/e2e.env up --build --wait`;
    2. runs the v1 Import with the v1 Snapshot as the first site, when `linkme_clone3/` exists, and the Fixture site (`tests/fixtures/`) last;
    3. follows the logs;
    4. on SIGTERM (Playwright's `gracefulShutdown`), runs `docker compose … down -v`.
  - **Readiness.** Playwright waits on the Fixture Profile's JSON URL, which exists only after the seed's last write.
  - **baseURL** stays `http://localhost:4173`.
  - **Fresh clone.** With no `linkme_clone3/`, the seed imports the Fixture site alone. `02-profile-parity`'s v1 cases and `02-v1-import`'s v1-Snapshot cases then skip with the reason `v1 Snapshot absent`. Phase 0 keeps `./check.sh` passing on a fresh clone, and asks any later Phase that needs the Snapshot in the loop to guard it this way (Phase 0 spec, the stand-in ASSUMPTION). Acceptance's `test -f linkme_clone3/…` line keeps those skips out of this Phase's own verdict.
  - **`reuseExistingServer: false`.** Today a server is reused whenever `CI` is unset (playwright.config.ts:13).
  - **VPS runs.** When `PLAYWRIGHT_BASE_URL` is set, it replaces baseURL and the webServer is skipped.
  - **Spec order.** The import spec and the Reveal-guard spec run in a last project, after every other spec: the first re-imports records that other specs read, and the second uses up the rate-limit window.
  - **Reveal pacing.** Against the VPS's production limit, the parity spec sends its Reveal and `/r` calls through one paced helper, at most 50 a minute, in one worker. v1 has 25 Adult Links, so four Tracking Code cases alone make 100 Reveals.

  ASSUMPTION: the local seed holds the real v1 Destinations, in a throwaway PocketBase volume that `down -v` removes. Rung 2: plan §7 seeds through the import with "same specs", and the DONE line compares against v1. Floor 2 holds because nothing leaves the machine. Overturned if real Destinations must never sit in a local test database; the parity spec would then lose its Reveal oracle.

  ASSUMPTION: a test stack never reuses a running server. Rung 4: a stray stack holding other data would turn green into a lie. Overturned if start-up time makes the suite unusable; then reuse would be guarded by a project-name check.

## Testing Decisions

**The seam.** There is one: the running v2 stack's public HTTP surface at baseURL, driven by Playwright through `./check.sh`. That is the seam that exists today (playwright.config.ts, check.sh); Phase 2 only changes what answers it.

- Pages show what a Visitor sees.
- Playwright's `request` fixture covers Profile JSON, redirects (not followed), Reveal and multipart uploads.
- Specs also use the two Operator doors the stack already has, because a browser cannot reach them:
  - PocketBase's REST API on its loopback port, to arrange and inspect state, as the admin UI does;
  - the v1 Import CLI, through `docker compose run`, as the Operator runs it.
- No test imports an app module.

ASSUMPTION: edits are driven through PocketBase's REST API rather than by clicking through its admin UI. Rung 5: the admin UI is a third-party screen calling that same API, and scripting it would test PocketBase, not v2. Overturned if an admin-UI-only behaviour must be proven.

**Rules every spec follows:**

- **The oracle for "identical" is the v1 Snapshot itself.** Tests read its Profile files and load v1's own reveal.js handler in the test process, the way tests/dev-server.mjs does today (tests/dev-server.mjs:29–37). No test re-implements Tracking Codes or Geo Rules.
- **Destinations stay out of failures.** Assertions compare Destinations as booleans, and failure messages name a Username and card position, never a Destination.
- **Phase 0 and Phase 1 specs run against v2 unchanged.**
  - Phase 0 rewrites `tests/e2e/00-smoke.spec.ts` onto the Fixture Profile. It finds the Adult Link by title, reads its id from the served `/api/profiles/fixture.json`, and leaves the status of the secrets paths unasserted, so v2's 404 with landing.html passes it (Phase 0 spec, Testing Decisions, smoke items 4 and 5). The v1 id that today's file pins (00-smoke.spec.ts:5, :48) is gone before this Phase lands.
  - Its other assertions hold on v2. The Fixture Profile imports with its own `mode` values and Escape Mode as its default, so the Instagram overlay still shows. Its Adult Link has a Test Secrets entry, so Reveal answers 200.
  - Phase 1's spec reads Link Ids, Modes and the Username from the served Fixture Profile (Phase 1 spec, Testing Decisions).

  ASSUMPTION: this Phase edits no Phase 0 or Phase 1 spec. Rung 1: Phase 0's smoke reads served ids and leaves the secrets status open. Overturned if a Phase 0 or Phase 1 spec reads an id from the fixture file; that spec then reads it from the served Profile.

**Specs this Phase adds:**

- **`tests/e2e/02-profile-parity.spec.ts`**
  - **Scope.** Every v1 Profile file that parses as it is. weiwei is left to the import spec.
  - **Page.** The page's title, display name, bio, verified badge and avatar match the file. jaka7q's display name is its Username, the one named repair. The avatar shows only when v1's image file exists, with the same bytes. The cards are exactly the file's Links, by position: titles, lock icons, icon and background bytes, and no others.
  - **Profile JSON.**
    - It carries no Destination, `geo` or `v1Key`.
    - Every `id` matches `^[a-z0-9]{12}$`, equals no v1 Link Id or secrets key, and does not contain its Username.
    - `url` is `{baseURL}/r/{id}` for non-Adult Links and empty for Adult Links.
    - Both `mode` fields read `escape_ig`.
  - **`/r`.** For every non-Adult Link, `/r` answers 302 with `Location` equal to that card's v1 url, made root-relative if it was relative.
  - **Reveal.** For every Adult Link, v2's Reveal gives the same answer as v1's handler for the same card. The cases are: no code, digits, `geo` and junk; for Links with a Geo Rule, several `x-country`/`x-region` pairs; and the Adult Links without a secrets entry, where both answer 404. Every case that sends a location header has `Geo Rule` in its test title, so that a run against the VPS, where Caddy drops v1's location headers, can leave exactly those cases out with `--grep-invert 'Geo Rule'` (Phase 5 spec, Acceptance, step 6).
  - **Journeys.** The final navigation to a Destination's host is caught with `page.route` and answered locally, never followed.
    - A non-Adult card goes through `/r/{id}` to the v1 url.
    - `/{username}/{digits}`, then the Age Gate, sends Reveal `trackingId={digits}` and lands where v1 sends that code.
    - `/{username}?link={v2 Adult id}` reveals on load.
  - **Old ids.** Every v1 Link Id and every secrets key gets 404 from both Reveal and `/r`.
  - **Leaks.** No Destination appears in any Profile JSON, in any page's HTML, in `/netlify/functions/secrets.json` (which answers 404) or in `/secrets.json` (the catch-all).
  - **Paths.** An unknown Username lands on `/landing.html`, and `/Jaka`, `/JakaJaka` and `/weiWEi` serve the same JSON as their lower-case twins.
  - **Fixture Profile journeys.** These run with or without the v1 Snapshot, on `/fixture` with a desktop User-Agent. Each Destination host is answered by `page.route`, and every id is read from the served Profile JSON.
    - The Direct Link's tap goes through `/r/{id}` and ends at its Test Secrets Destination.
    - The Deeplink Link's tap sends Reveal with its id and never requests `/r`, and the page then requests its Test Secrets Destination. This is import, projection, Reveal and hand-off on the stack, not only an empty `url` in JSON.
    - `/fixture?link={Direct Link's id}` ends at that Link's Test Secrets Destination, the non-Adult Link Shortcut change listed under "What differs on purpose".
- **`tests/e2e/02-v1-import.spec.ts`** (last project, local only).
  - **Repairs, checked through HTTP on the seeded stack:**
    - `/weiwei` and `/weiWEi` show the repaired file's display name and cards.
    - jaka7q's display name is `jaka7q`.
    - juliafilippo_, jaka6q and jaka7q show every card, each with a distinct Link Id.
    - The four non-Adult Links with a secrets entry reach their file's url through `/r`.
    - The six Profiles whose avatar file is missing serve an empty `avatarUrl`.
  - **Case twins and a stable re-run.** `git -C linkme_clone3 archive HEAD` is piped into a `docker compose run` of the import, which recreates all 30 Profile files on Linux. Expected:
    - exit 0;
    - exactly three `skipped: … case twin` lines (Jaka, JakaJaka, weiWEi);
    - Profile and Link counts unchanged;
    - every served Link Id unchanged.
  - **Refusal.** The tree is `tests/v1-broken/`, plus a case twin with different bytes written inside the container. The tree holds:
    - one valid Profile, `importcheck_ok`;
    - one file that is still invalid after the trailing-comma repair;
    - one Profile without a `links` array.

    ASSUMPTION: the tree sits at `tests/v1-broken/`, not `tests/fixtures/v1-broken/`. Rung 1: Phase 0's Acceptance pins the exact file list of `tests/fixtures/` (phase-00-new-repo-ground.md:149), so a tree inside it fails that check. The same reason places the re-run trees below at `tests/v1-rerun-a/` and `tests/v1-rerun-b/`. Overturned if that check is narrowed to leave these folders out; the trees then move back under `tests/fixtures/`.

    The run exits 1 with one `invalid v1 file:` line per bad file. Afterwards `/importcheck_ok` lands on the landing page and the PocketBase counts are what they were.
  - **Re-run with changes.**
    1. Import `tests/v1-rerun-a/`.
    2. Set its Profile's Mode to `direct` through the API.
    3. Import `tests/v1-rerun-b/`, which retitles one Link, drops one and adds one.

    Expected: the retitled Link shows its new title and keeps its Link Id; the added Link has a fresh id; the dropped Link is named `stale in v2` and is still served; and the Profile's Mode is still `direct`.
  - **No Destination printed.** No run's output contains any Destination of its input.
  - **Survives recreation.** After the re-run case, `docker compose … up -d --force-recreate --wait pocketbase app` recreates both containers. The re-run Profile still serves with its Mode `direct`, and the Fixture Profile's avatar file still serves with the same bytes.
- **`tests/e2e/02-live-edit.spec.ts`**
  - A throwaway Profile and Link created through PocketBase's API show on the page.
  - Each of these shows on the next load with no restart: renaming the Profile, retitling a Link, reordering, adding a Link and deleting one. Deleting the Profile sends the page to `/landing.html`.
  - Setting the Profile's Mode and a Link's Mode to each of `direct`, `escape_ig` and `deeplink` shows as the effective Mode in the Profile JSON. A Deeplink Link's `url` is empty.
  - Anonymous calls to PocketBase on its loopback port are all refused: list and view profiles, links and events, and create a users record. No response body holds a Destination.
- **`tests/e2e/02-image-upload.spec.ts`**
  - **Formats.** Committed JPG, PNG, GIF, WebP and HEIC fixtures each come back as WebP, judged by the `RIFF…WEBP` bytes, both from the returned URL and from the Profile JSON.
  - **Sizes,** read from the browser's `naturalWidth` and `naturalHeight`:
    - a 3000×2000 background comes back at 1080×720;
    - a 2000×2000 avatar at 512×512;
    - a small image is not enlarged;
    - a JPEG tagged with EXIF orientation 6 comes back with its sides swapped.
  - **Metadata.** A JPEG carrying EXIF GPS and camera tags comes back with no `EXIF` or `XMP ` chunk.
  - **Refusals, each leaving the record unchanged:**
    - no token gets 401;
    - a malformed token, and the token of a plain `users` record created through the superuser API, are refused (401, or PocketBase's own 403 or 404);
    - a text file gets 415;
    - a PNG put straight into a file field through PocketBase is refused by PocketBase.
  - **Fixtures** are small files made offline: this Mac's `sips` writes HEIC, JPEG, PNG and GIF (`sips --formats`), and Chromium's canvas writes WebP.
- **`tests/e2e/02-reveal-guard.spec.ts`** (last project)
  - Reveal with a foreign `Origin`, or with `Sec-Fetch-Site: cross-site`, gets 403 and no Destination.
  - No Reveal response carries `Access-Control-Allow-Origin`.
  - Repeated Reveal and `/r` calls reach 429 within `REVEAL_LIMIT_PER_MINUTE + 1` requests, with the limit read from `tests/e2e.env`, and no 429 body holds a Destination.

**Prior art:**
- `tests/e2e/00-smoke.spec.ts`: page assertions, intercepting Reveal, a fake In-App Browser user agent.
- `tests/dev-server.mjs`: loading v1's reveal.js in process. It is deleted here, and the parity spec carries that technique over.

## Acceptance

```sh
set -e  # any failing check fails the block; the final ./check.sh cannot mask it (house precedent: Phase 1's Acceptance)
# done by the Operator 2026-10-04 (plan §11): pnpm --dir app add hono @hono/node-server sharp; docker pull alpine:3   # caddy:2-alpine and node:22-alpine were already local
git check-ignore -q vendor/                          # the offline build's inputs (plan §11)
test -f vendor/pocketbase_0.40.4_linux_arm64.zip
test -f vendor/pocketbase_0.40.4_linux_amd64.zip
test -e app/node_modules/sharp
for i in alpine:3 caddy:2-alpine node:22-alpine; do docker image inspect "$i" > /dev/null || exit 1; done   # base images local, so the build pulls nothing
docker compose --env-file tests/e2e.env build        # no network request (plan §11): COPYs vendor/'s zip and app/ with node_modules; if it would fetch, the ticket parks
# manual (once, network, only if the HEIC case of 02-image-upload fails with sharp alone): pnpm --dir app add heic-convert
test -f linkme_clone3/netlify/functions/secrets.json
git check-ignore -q linkme_clone3/   # one check per line: set -e ignores a failure on the left of &&
git check-ignore -q .env
docker compose --env-file tests/e2e.env config --quiet
test "$(docker compose --env-file tests/e2e.env config --services | sort | paste -sd' ' -)" = "app caddy pocketbase"
docker compose --env-file tests/e2e.env config --format json | node -e '
  const s = JSON.parse(require("fs").readFileSync(0, "utf8")).services;
  const vols = n => s[n].volumes || [];
  const ok = !(s.app.ports || []).length
    && /\/app$/.test(s.app.build.context)
    && !vols("app").some(v => /linkme_clone3/.test(v.source || ""))
    && vols("app").every(v => v.type !== "bind" || v.read_only)
    && (s.pocketbase.ports || []).length > 0
    && s.pocketbase.ports.every(p => p.host_ip === "127.0.0.1")
    && vols("pocketbase").some(v => v.type === "volume" && v.target === "/pb/pb_data")
    && vols("caddy").some(v => v.type === "volume" && v.target === "/data")
    && ["app", "caddy", "pocketbase"].every(n => s[n].restart === "unless-stopped")
    && !!s.pocketbase.healthcheck;
  process.exit(ok ? 0 : 1)'
test ! -e tests/dev-server.mjs
grep -q 'reuseExistingServer: false' playwright.config.ts
for s in 02-profile-parity 02-v1-import 02-live-edit 02-image-upload 02-reveal-guard; do test -f "tests/e2e/$s.spec.ts" || exit 1; done
# no v1 Destination in any file git tracks or would add (prints file names only, never a Destination)
node -e '
  const fs = require("fs"), cp = require("child_process"), dir = "linkme_clone3/api/profiles";
  // parse unchanged; only a file that fails gets the import's trailing-comma repair
  const parse = t => { try { return JSON.parse(t); } catch { return JSON.parse(t.replace(/,(\s*[}\]])/g, "$1")); } };
  const urls = new Set(Object.values(parse(fs.readFileSync("linkme_clone3/netlify/functions/secrets.json", "utf8"))));
  for (const f of fs.readdirSync(dir))
    for (const l of parse(fs.readFileSync(dir + "/" + f, "utf8")).links) urls.add(l.url || "");
  const needles = [...urls].filter(u => /^https?:\/\/\S/.test(u));   // every absolute Destination, no length exemption
  const files = cp.execSync("git ls-files -z --cached --others --exclude-standard").toString().split("\0").filter(Boolean);
  const hits = files.filter(f => { try { const t = fs.readFileSync(f, "utf8"); return needles.some(n => t.includes(n)); } catch { return false; } });
  if (hits.length) { console.error("v1 Destination found in: " + hits.join(" ")); process.exit(1); }'
# manual: copy this repo and the v1 Snapshot (secrets.json included) to the VPS over SSH, keeping vendor/ and app/node_modules, e.g. rsync -a --exclude /node_modules --exclude .scratch ./ root@srv1395798.hstgr.cloud:/opt/oflinkv2/
# manual: on the VPS, write /opt/oflinkv2/.env with SITE_ADDRESS=<v2 host>, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD, and HTTP_PORT / HTTPS_PORT set to free ports (Traefik keeps 80 and 443, plan §11); point <v2 host>'s DNS A record at the VPS.
# manual: on the VPS: cd /opt/oflinkv2 && docker compose up -d --build --wait
# manual: on the VPS, Traefik (n8n-traefik-1) keeps 80/443 (plan §11, 2026-10-04): in its file-editable dynamic config add a TCP router HostSNI(`*`) with TLS passthrough to Caddy's HTTPS port, below n8n's own HostSNI rule and sending the PROXY protocol header, and an HTTP router on 80 for every host that is not n8n's, to Caddy's HTTP port (Further Notes, Ports 80 and 443); then check that n8n still answers at its own host.
# manual: on the VPS: docker compose run --rm -v "$PWD/linkme_clone3:/v1:ro" app import-v1 --site /v1     # exit 0; a git clone of v1 prints three case-twin lines, an rsync from this Mac none
# manual: delete through the admin UI every record a `stale in v2:` line names (none on the first run); the parity run below fails while one is served.
# manual: from the Mac: curl -sI http://<v2 host>/ | grep -i '^location: https://'     # Caddy redirects HTTP to HTTPS
# manual: from the Mac: PLAYWRIGHT_BASE_URL=https://<v2 host> npx playwright test tests/e2e/02-profile-parity.spec.ts     # paced; takes a few minutes
# manual: ssh -L 8090:127.0.0.1:8090 root@srv1395798.hstgr.cloud; edit a display name at http://localhost:8090/_/; reload https://<v2 host>/<username>; the new name shows.
./check.sh    # runs tests/e2e/02-profile-parity, 02-v1-import, 02-live-edit, 02-image-upload, 02-reveal-guard with every earlier spec
# DONE gate: a green block above proves the local stack only. The plan's DONE line names the VPS URL (goal_ai.txt:145–146), so the Phase is done
# only when the Operator has run every `# manual:` VPS line and its output (exit codes, the redirect line, the parity summary, the admin edit) is recorded with the Phase's ticket.
```

## Depends on

- **Phase 0** provides:
  - The page copy at `app/public/`, which the app image carries as the public page.
  - The Fixture Profile (`tests/fixtures/api/profiles/fixture.json`, Username `fixture`, four Links: Adult, Direct, Escape and Deeplink) and the Test Secrets (`tests/fixtures/netlify/functions/secrets.json`), which the seed imports as the Fixture site.
  - Specs that run against whatever serves baseURL.

  ASSUMPTION: the page copy at `app/public/` calls v1's paths (`/api/profiles/{username}.json`, `/.netlify/functions/reveal?id&user&trackingId`), as Phase 0 says it still does (Phase 0 spec, Interfaces: Page Copy). Rung 5: it is a copy of v1's page. Overturned by Phase 0's or Phase 1's actual paths; the routes follow them.

  ASSUMPTION: the Fixture site is v1-shaped. Phase 0 lays `tests/fixtures/` out like the v1 Snapshot, its Username `fixture` differs from every v1 Username, its image paths name the stock icons under `/images/`, and every Test Secrets value is on `example.com`, with a non-Adult Link's value equal to its `url` (Phase 0 spec, Contracts). The import therefore drops three Test Secrets entries with a `dropped:` warning, one per non-Adult Link, and the Deeplink Link's Destination is its `url`. Rung 1, read from Phase 0's spec. Overturned by a change to Phase 0's fixture; only the seed's mounts change.

  ASSUMPTION: Phase 0's specs read Link Ids from the served Profile, never from the fixture file (Phase 0 spec, Contracts and smoke item 4). ADR 0004 makes every v2 Link Id fresh, so a pinned id cannot pass on v2. Overturned if a Phase 0 spec pins one; that spec then reads the served id.

- **The Operator** runs the VPS step. What holds ports 80 and 443 is answered (plan §11, 2026-10-04): Traefik keeps them and fronts v2's Caddy, and the Operator adds Traefik's routers as part of that step (Further Notes, Ports 80 and 443; ADR 0001, addendum). The local stack and `./check.sh` do not wait on it. Every `# manual:` VPS line in Acceptance, and so the Phase's DONE gate, does.

- **Phase 1** provides the Mode field in the page: the page copy acts on `profile.mode` and `links[].mode`, and passes its specs against v2 on the Fixture Profile.

  ASSUMPTION: Phase 1's page reads the effective `mode` values sent here, and takes a Link with an empty `url` through Reveal, which is how Deeplink Mode gets its real Destination. Rung 5. Overturned by Phase 1's actual page; the Profile JSON then adapts (see the Deeplink ASSUMPTION under Contracts).

## Out of Scope

- **Writing Events** from `/r`, Reveal and a Page View ping, daily aggregation, and the Stats page. Plan Phase 4.
- **Replacing the page's global localStorage Tracking Code.** D5, plan Phase 4.
- **Creator sign-up (public, per §9 D9), login, email verification and reset, Onboarding, the Editor and owner collection rules.** Plan Phase 3.
- **A public route to PocketBase's API, reserving the Usernames the app's routes use (`api`, `r`, `netlify`, …), and making the n8n Form admin-only.** Plan Phase 3. No v1 Username collides with these routes today (observed: `ls linkme_clone3/api/profiles`).
- **The per-Profile Custom Domain field, Caddy on-demand TLS with its `ask` check, routing a host to a Profile, and Spare Domains.** Plan Phase 5 and D6, by YAGNI (see the Caddy ASSUMPTION).
- **Pointing ofl.ink's DNS at the VPS, v1 on Netlify as a live fallback, and freezing n8n Form edits before the final import.** Plan Phase 5 (Cutover). v1 is never switched off (plan section 10).
- **Mode and Escape behaviour inside the page, and the real-device In-App Browser matrix.** Plan Phase 1 and its manual RUN.md item.
- **Any change to v1:** the old GitHub repo, Netlify, the live n8n workflow, and `linkme_clone3/`. Plan §8.
- **ffmpeg, video and animated images.** D4: "ffmpeg only if video is added later".
- **Proxies (D7), a Geo Rule UI, Umami, content rules and abuse reporting.** Bonus, after Phase 5 (§5, §9 D9).
- **A response cache or realtime push to open pages.** "Live instantly" means the next load, and reading PocketBase on every request already gives that.
- **PocketBase backups.** The plan does not ask for them, and while Phase 2 holds only imported data the v1 Import rebuilds it. That stops being true once Phase 3 lets Creators store data v1 never had, so backups start with Phase 3's VPS deploy (Phase 3 spec, Further Notes, Backups).
- **A geo-IP database in the app.** Edge headers are enough for this Phase, and production takes its country from Cloudflare's (plan §11, 2026-10-04; Further Notes), so none is planned.
- **A least-privilege PocketBase account for the app.** The superuser is enough while every rule is closed.
- **More than one app container, or a shared rate-limit store.** One container serves the stack.
- **Re-encoding imported WebP images.** They are copied byte for byte so that the pages look identical.
- **Mirroring v1 deletions on re-runs, and any way to rotate a Link Id.** Warnings are enough until Cutover; nothing asks for rotation yet.

## Further Notes

- **Ports 80 and 443 on the VPS: answered 2026-10-04 (plan §11, rung 2).** The Operator looked: Traefik (container `n8n-traefik-1`) holds 80 and 443 and fronts n8n on 127.0.0.1:5678. The VPS also runs fastt-*, whynot-panel-*, leak*-app on 6767/8081, browserless on 3000 and a cloudflared tunnel.

  DECISION: Traefik keeps 80/443, and v2's Caddy runs behind it.
  - Traefik gets a TCP router with ``HostSNI(`*`)`` and TLS passthrough to Caddy on 443. n8n's own HostSNI rule stays higher priority.
  - Traefik gets an HTTP router on 80 for every host that is not n8n's, to Caddy.
  - Caddy keeps TLS, its automatic certificates and Phase 5's on-demand certificates. n8n stays outside v2's Compose file, so story 24 stays satisfied.

  ASSUMPTION: flagged; overturned if Traefik's config is not file-editable on the VPS or SNI passthrough breaks n8n.

  The routers are the Operator's, added in Traefik's dynamic config as part of the VPS step (Acceptance, the Traefik `# manual:` line). Nothing in this repo holds Traefik's config, and the earlier branches (Caddy fronts both; the existing proxy terminates TLS for v2) are dropped.

  ASSUMPTION: Traefik reaches Caddy on host ports that Caddy publishes, with `HTTP_PORT` and `HTTPS_PORT` in the VPS `.env` set to free ports because Traefik holds 80 and 443, not by Caddy joining Traefik's Docker network. Rung 4: v2's Compose file stays apart from n8n's (story 24). Overturned if Traefik's container cannot reach those ports; Caddy then joins Traefik's network through a VPS-only Compose override.

  ASSUMPTION (evidence blocked): TLS passthrough hides the Visitor's address from Caddy, which would see every connection as coming from Traefik. Every Visitor would then share one Reveal limit (Reveal hardening), and after Phase 5 Cloudflare's country headers would be stripped as coming from outside Cloudflare's ranges. So Traefik's TCP service sends the PROXY protocol header, and Caddy's HTTPS listener accepts it from Traefik only, as a VPS deploy setting (the local loop has no Traefik). This is recalled, not observed: the live VPS is out of bounds and the products' documentation is a network read. Overturned if two separate clients reach their own 429s without it, or if Traefik cannot send PROXY protocol; the human then chooses how the client address reaches Caddy.

  ASSUMPTION: the VPS takes SSH as `root@srv1395798.hstgr.cloud`, inferred from n8n's host `n8n.srv1395798.hstgr.cloud` (plan §1) and Hostinger's default root login. Overturned by the Operator's actual SSH login.
- **Network steps for the human: done 2026-10-04 (plan §11).** The Operator ran `pnpm --dir app add hono @hono/node-server sharp` (`app/package.json` lists hono 4.13.13, @hono/node-server 2.1.3 and sharp 0.35.5, with `app/pnpm-lock.yaml`) and pulled `alpine:3` and `axllent/mailpit`; `caddy:2-alpine` and `node:22-alpine` were already local. `vendor/` holds the PocketBase 0.40.4 zips for arm64 and amd64. From here every `docker compose build`, `./check.sh`'s included, makes no network request (Offline build). Only the conditional `pnpm --dir app add heic-convert` is left, parked until the HEIC case of 02-image-upload fails with sharp alone. On the VPS the build pulls only absent base images, inside the Operator's `up -d --build` line.
- **The v2 host name.** It is the Operator's choice, set as `SITE_ADDRESS` in the VPS `.env`, and its DNS A record is a manual step.

  ASSUMPTION: a host name separate from ofl.ink until Cutover, such as a subdomain the Operator controls, so that ofl.ink keeps pointing at v1. Rung 2: D1, "Netlify … keep running … until … parity". Overturned if the Operator tests on the VPS's own host name instead.
- **Refreshing the v1 Snapshot before a re-run.** The Operator replaces `linkme_clone3/` with a fresh copy of v1, for example `git -C linkme_clone3 pull --ff-only`. That is a network read of the old repo, which writes nothing there. ADR 0002 already flags that replacing the snapshot is not editing it.
- **Where the Visitor's country comes from before Cutover.** The Visitor location module reads Cloudflare's headers after v1's. Production takes its country from Cloudflare (decided below), so v2 sees real countries only once its host is proxied by Cloudflare with visitor-location headers on, and Caddy trusts Cloudflare's ranges so that `X-Forwarded-For` carries the Visitor's IP. That is account and DNS work, so it is manual. Until then every Visitor without the headers counts as US, which is v1's own fallback. Parity is proven here with injected headers. A real country source is a prerequisite of Cutover, not of this Phase.

  DECIDED 2026-10-04 (plan §11, rung 2): Cloudflare. `dig +short NS ofl.ink` gave `dns1/dns2.registrar-servers.com` (Namecheap) and no DS record, so no DNSSEC. The nameservers move from Namecheap to Cloudflare when Phase 5's zone move asks, and the Operator makes that move. Geo Rules on DNS-only Custom Domains fall back to US, which plan §11 accepts. This Phase's Visitor location function is unchanged by the answer, and no geo-IP database is built.
- **Who can upload in Phase 2.** Only a superuser token gets past PocketBase's rules, so the Operator and the tests are the only uploaders until Phase 3 gives Creators a token and owner rules.

## Review

Reviewer: **codex** (`codex exec --sandbox read-only`, `model_reasoning_effort="high"`), 2026-10-02. B = the blind call (plan, CONTEXT, ADRs and harness only), D = the draft call, (a)–(d) = the coordinator's cross-spec flags, X = this agent's own cross-check against the sibling specs. The review workspace left `linkme_clone3/` out by design.

- B1 **accept**. B1: whether v2 can take ingress beside n8n needs a live inventory of the VPS (ADR 0001). It was already NEEDS-HUMAN in Further Notes, and it is now also a Depends on entry that gates every VPS line (see D4b). Answered 2026-10-04 by plan §11 (see D4b).
- B2 **reject**. B2 offered a public-safe mirror collection as the alternative to a Node projection. This was already decided: every PocketBase rule is superuser-only and the app projects the Profile JSON (Schema, Contracts). A mirror adds sync work and gains nothing while nothing public reads PocketBase.
- B3 **partial**. B3: where domain support stops in Phase 2. The deferral stays and its rung is corrected (see D5).
- B4 **reject**. B4: the absent Snapshot means fidelity cannot be proven. That absence belongs to the review workspace only. The repo holds `linkme_clone3/`, the repairs cite observations of it, and the parity spec reads it at test time.
- B5 **reject**. B5: keeping the final import current. This is settled. The Snapshot is refreshed before the last run (Further Notes; ADR 0002), and freezing Form edits belongs to Phase 5 (Out of Scope).
- B6 **reject**. B6: what "identically" excludes. The DONE-line block defines what stays the same and what differs on purpose.
- B7 **reject**. B7: a complete import policy. It is specified under the v1 Import headings: repairs, refusals, precedence, missing images, re-runs and exit codes 0/1/2.
- B8 **partial**. B8: re-run identity and edit precedence. `v1Key` matching and the survival of v2-only fields were already specified. Deletions were the gap, and they are now a required Operator step (see D2).
- B9 **reject**. B9: who owns imported Profiles. `owner` stays empty on import and every rule is superuser-only. How Creators claim Profiles is Phase 3's work (Out of Scope).
- B10 **partial**. B10: the exception for a Destination given out one Click at a time. Its scope was already set: story 14 names Profile JSON, page HTML and PocketBase's API, and 429 bodies carry no Destination. Caching was still open, so Reveal and `/r` now answer `Cache-Control: no-store` (Contracts).
- B11 **partial**. B11: request contracts for Reveal and `/r`. Most were already there: 403/404/429, a missing `Origin` passes, and only digit codes are appended. Two were loose and are rewritten. The client IP is now the last `X-Forwarded-For` entry. `links.destination` now enforces `^(https?://|/[^/])` in the schema, so a `javascript:` value cannot reach the page through Reveal.
- B12 **reject**. B12: upload semantics and proof of HEIC. Upload (D4) already specifies the PocketBase-checked token, longest-side sizing, the 20 MB cap and pixel limit, the first GIF frame, transparency, metadata stripping and PocketBase's file replacement. 02-image-upload proves HEIC with a committed fixture, and heic-convert is parked as the fallback.
- B13 **partial**. B13: operational durability. Persistence now has a recreation test and a checked data path (see D6). Backups stay out of scope, with the reason narrowed to Phase 2's import-only data. Resource budgets beside n8n are rejected: nothing observed points to pressure, and the live VPS is out of bounds.
- B14 **reject**. B14: what "live instantly" means. It is defined as the next load (No cache; Out of Scope).
- B15 **reject**. B15: the seam is a browser through Caddy, with ids from seeded v2 data. That was already the seam, and specs already read Link Ids from served data (Testing Decisions).
- B16 **reject**. B16: Creator A against Creator B authorization tests. These need owner rules, which arrive in Phase 3. Phase 2 tests that anonymous PocketBase calls are refused (02-live-edit).
- B17 **reject**. B17: assert the real click resolution and decode the stored uploads. Parity compares v2's actual Reveal answer and `/r` `Location` with v1's own handler, not with a replaced body. Uploads are judged by their `RIFF…WEBP` bytes and natural size.
- B18 **reject**. B18: the suite might reach a stale server on 4173. `reuseExistingServer: false` rules that out (Test loop), and Acceptance checks for it with grep.
- B19 **reject**. B19: Phase 2 must not promise that a domain avoids flagging. It promises nothing of the kind: `sed '/^## Review/,$d' docs/spec/phase-02-vps-foundation.md | grep -ci flagg` prints 0.
- B20 **accept**. B20: §7's fixture list does not guarantee a Deeplink Link. Phase 0's Fixture has one, and Phase 2 now drives it through the stack (see D3).
- D1 **accept**. D1: the page copy location contradicts Phase 0, and the build-context argument fails with it. The page copy is now `app/public/`, baked into the image. The build context still keeps the v1 Snapshot out. Public page, Interfaces and Depends on are rewritten.
- D2 **accept**. D2: kept stale records fail parity and ADR 0002's "v1 winning". Reconciliation is now a required Operator step, with an Acceptance line before the VPS parity run, and the failing parity run is named as the gate. Warn-not-delete stays (rung 4), and a `--prune` flag is named as what would overturn it.
- D3 **accept**. D3: the `/r` fallback for Deeplink contradicts D3, and no seam test covered it. The fallback is removed. 02-profile-parity gains Fixture Profile journeys: Direct through `/r`, Deeplink through Reveal to its Destination, and a non-Adult Link Shortcut.
- D4a **accept**. D4a: Acceptance can pass while the VPS is unverified. A DONE gate line now says a green block proves only the local stack. The Phase is done when the Operator's VPS results are recorded with its ticket (goal_ai.txt:145–146).
- D4b **resolved by plan §11** (2026-10-04; was needs-human). D4b: neither branch for occupied ports 80/443 satisfied the whole spec, and codex asked for a resolved deployment contract before any VPS step. The Operator's look found Traefik (`n8n-traefik-1`) on 80/443, fronting n8n. Plan §11 decides a third way: Traefik keeps the ports and fronts v2's Caddy, with a TCP router ``HostSNI(`*`)`` and TLS passthrough to Caddy on 443 (n8n's own HostSNI rule stays higher priority) and an HTTP router on 80 for every host that is not n8n's. Caddy keeps TLS and on-demand certificates, and story 24 stays satisfied. Plan §11's ASSUMPTION is carried in Further Notes, Ports 80 and 443: overturned if Traefik's config is not file-editable on the VPS or SNI passthrough breaks n8n. The VPS lines, the routers included, stay `# manual:` for the Operator.
- D5 **partial**. D5: on-demand TLS was dropped from the plan's Phase 2 caddy line. The deferral is kept, because without a domain list the `ask` check either issues for any domain or refuses every one. The rung was wrong, though. The plan's lines split (goal_ai.txt:137 against :145–146 and :163), so rung 2 does not settle it; it now rests on rung 4 plus YAGNI, flagged and open for the Operator to overturn.
- D6 **accept**. D6: the persistence check passes an ephemeral database. The PocketBase volume is now pinned to `/pb/pb_data` and the Acceptance predicate checks that path. 02-v1-import recreates `pocketbase` and `app` and checks that records, a Mode and an avatar file survive.
- D7 **accept**. D7: the Acceptance block does not fail fast. `set -e` is added, following Phase 1's Acceptance. The one `a && b` check is split onto two lines, because `set -e` ignores a failure on the left of `&&`.
- D8 **accept**. D8: the Destination scan can alter or skip needles. It now parses each file unchanged, repairs only a file that fails to parse (as the import does), and drops the 12-character exemption.
- (a) **accept**. (a): `public/` against Phase 0's `app/public/`. The same fix as D1.
- (b) **accept**. (b): the smoke spec still pins a v1 id. Phase 0's current spec reads ids from the served `/api/profiles/fixture.json` and leaves the secrets paths' status unasserted (Phase 0 spec, smoke items 4–5). This Phase therefore owns no smoke edit, and the Owns list, story 55 and Testing Decisions are rewritten. The draft call agreed.
- (c) **accept**. (c): the Fixture Profile has four Links, one of them Deeplink. The Fixture site is now described as Phase 0 ships it. A non-Adult Test Secrets value equals its `url`, so the import logs three `dropped:` lines. The seed mounts `app/public/images/` as the site's `images/`, because the fixture's images are the stock icons. The Deeplink Link is driven end to end (D3).
- (d) **partial**. (d): are the ports and the first build honestly human-only? Yes as written: the ports are NEEDS-HUMAN, and the first four `# manual:` lines are the network steps. One claim is tightened: `./check.sh` rebuilds offline only if PocketBase is fetched in a `RUN` layer. That is now required, with an evidence-blocked ASSUMPTION about BuildKit re-checking an `ADD <url>` source. Superseded 2026-10-04 (plan §11): the ports are answered, the network steps are done, and PocketBase is COPYd from `vendor/`, so no layer fetches (Offline build).
- X1 **accept**. X1: Phase 0 keeps `./check.sh` green on a fresh clone and asks any later Phase that needs the Snapshot in the loop to guard it (Phase 0 spec, stand-in ASSUMPTION). With no `linkme_clone3/`, the seed and the v1 cases now skip with `v1 Snapshot absent`. Acceptance's `test -f` line keeps that skip out of this Phase's verdict.

### Six hats

Six-hats review of specs 00–05 taken as one set (HEAD 16d5a11), reconciled in the plan review, 2026-10-02. Ids: W white, R red, K black, Y yellow, G green, U blue, C the coordinator's points, X found by the reconciler. Bullets about the whole set are reconciled only in `docs/spec/plan-review.md`, Six hats. Cross-spec line citations in the entries above date from their own review and may have drifted; the main text now cites sections.

- C3 **accept**. The Profile JSON contract now lists `profile.id`, marked as added by Phase 4 for its per-Profile Tracking Code key (Phase 4 keeps ownership). Story 15 now names the record id as the one record internal the JSON carries.
- C5 **accept**. Phase 5's VPS parity run relied on Geo Rule cases being titled so. The parity spec now promises `Geo Rule` in the title of every case that sends a location header (Testing Decisions, `02-profile-parity`, Reveal).
- K1 **accept**, fix folded into the parked country-source question (decided 2026-10-04 by plan §11: Cloudflare, with the US fallback on DNS-only Custom Domains accepted). The Visitor location ASSUMPTION now states that every Visitor on a host with no country header takes v1's US fallback, which under the Cloudflare position means every DNS-only Custom Domain. Observed for this reconcile (counts only, no Destination read): 7 of v1's 38 Links carry a Geo Rule, and in all 7 the US entry's `default` equals the rule's own `default`, so such a Visitor gets the catch-all code and loses only their own country's or state's code. Only a real country on those hosts fixes it, which is the geo-IP position; this Phase's function serves either answer.
- K2 **accept**. Out of Scope sent backups to "the Phase that first stores v2-only data" but no Phase took them. It now names Phase 3's VPS deploy (rung 4: a lost sign-up cannot be rebuilt by the v1 Import).
- G1 **needs-human, resolved by plan §11** (2026-10-04: Cloudflare; Further Notes, Where the Visitor's country comes from, now reads DECIDED). The Further Notes ASSUMPTION "edge headers rather than a geo-IP database" is now PARKED, and the Out of Scope geo-IP line points there. Both positions and the evidence that settles them are in plan-review.md, Needs the human. No Phase 2 ticket waits for the answer.
- C6 **accept**. Ports 80/443 stay needs-human, unchanged (Further Notes). Answered 2026-10-04 by plan §11: Traefik fronts Caddy (D4b).

Counts: accept 5, partial 0, reject 0, needs-human 1, resolved 2026-10-04 by plan §11 (the country source, shared with Phases 4 and 5: Cloudflare). None is open.

### Plan §11

2026-10-04. Plan section 11 (the user's answers, rung 2). Ports: Traefik keeps 80/443 and fronts v2's Caddy by SNI passthrough on 443 and an HTTP router on 80; Caddy keeps TLS. Country source: Cloudflare. Network gate: done, with an offline build from `vendor/` and `app/node_modules`. Propagated here: Owns (the PocketBase image), the Visitor location ASSUMPTION, PocketBase (pinned at 0.40.4, COPYd, the pin and BuildKit ASSUMPTIONs dropped), a new Offline build entry, Acceptance (the network lines marked done, offline checks added, the ports line replaced by the Traefik routers line, the VPS `.env` ports and the rsync anchor), Depends on, Out of Scope (geo-IP), Further Notes (Ports 80 and 443 rewritten as decided, Network steps done, the country source DECIDED), and B1, D4b, (d), K1, G1 and C6 above.
