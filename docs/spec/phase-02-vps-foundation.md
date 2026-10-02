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
15. As a Creator, I want my Geo Rules and record internals kept out of the public Profile JSON.
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
55. As a developer, I want the Phase 0 and Phase 1 specs to pass against v2 unchanged, reading Link Ids from the served Profile rather than pinning them.
56. As a developer, I want the test stack in its own Compose project with throwaway data, and never to land on a server it did not start.
57. As a developer, I want test failures never to print a Destination, because failing output is pasted into tickets (plan §7).
58. As a developer, I want committed image fixtures for every D4 format, so that the upload spec runs offline.
59. As a developer, I want a check that no v1 Destination sits in any file this repo tracks or would add.

## Implementation Decisions

- **Owns.**
  - **Stack.** The Compose file and the Caddy config at the repo root, the environment contract, and `.env` added to `.gitignore`. The services are `caddy`, `app` and `pocketbase`; n8n is not one of them.
  - **PocketBase image and schema.** A `pocketbase/` directory holding an image built from a pinned official PocketBase release, plus versioned JS migrations for the collections below.
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
    - The one-line change to `tests/e2e/00-smoke.spec.ts` described under Testing Decisions.

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
  - **Public page:** serves the page copy directory, mounted read-only into the app.

  ASSUMPTION: `--site` takes v1-shaped directories, and the seed builds one for the Fixture Profile with read-only bind mounts: Phase 0's Fixture Profile file, Phase 0's test-only secrets file, and the v1 Snapshot's `images/` unless Phase 0 ships its own images. Rung 5: one input shape for production and the seed, and no rule is needed for a Link Id that appears in two secrets files. Overturned by the shape Phase 0 actually gives its fixtures; only the seed's mounts change.

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
            destination          text, optional                                    (absolute http(s) URL or root-relative path)
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

- **Contracts.**

  HTTP. Every request reaches the app through Caddy. The app answers the paths that v1's page script calls, so the page copy needs no path changes.

  | Request | Answer |
  |---|---|
  | `GET /api/profiles/{username}.json` | 200 with the Profile JSON, or 404 `{"error":"Profile not found"}`. The Username is matched lower-cased. `Cache-Control: public, max-age=0, must-revalidate` (v1's netlify.toml rule) |
  | `GET /.netlify/functions/reveal?id&user&trackingId` | 200 `{"realUrl": …}`; 404 `{"error":"Link not found"}`; 403 cross-origin; 429 over the limit. Never an `Access-Control-Allow-Origin` header |
  | `GET /r/{linkId}` | 302 with `Location:` the Destination; 404; or 429 |
  | `GET /api/files/{profiles\|links}/{recordId}/{filename}` | The file, only while it is that record's current avatar, icon or backgroundImage, else 404. `Cache-Control: public, max-age=31536000, immutable` |
  | `POST /api/upload/{collection}/{recordId}/{field}`, with `Authorization: <PocketBase token>` and multipart `file` | 200 `{"url": "/api/files/…"}`; 401 with no token; PocketBase's own 403 or 404 passed through; 404 for a target not listed below; 413 over 20 MB; 415 for anything that is not a decodable image |
  | `GET /netlify/*` | 404 with landing.html as the body |
  | Any other `GET` | The file at that path in the page copy, else index.html with 200 (v1's `/* → /index.html` rule) |

  Upload targets: `profiles/avatar` (512 px), `links/icon` (512 px), `links/backgroundImage` (1080 px).

  Profile JSON keeps v1's Profile-file shape, minus everything that belongs only on the server:

  ```
  { "profile": { "username", "displayName", "bio", "avatarUrl", "verified", "mode" },
    "links":   [ { "id", "title", "isAdult", "tracking", "default_tracknumber"?, "mode",
                   "icon", "backgroundImage", "url" } ] }                 // links in `order`
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

  ASSUMPTION: a Link in Deeplink Mode gets an empty `url` even when it is not Adult, so the page reveals it and hands the phone the real Destination. With `{origin}/r/{id}` the phone would get an ofl.ink address that no app owns, and Deeplink would behave like Direct. Rung 5: one rule in the projection. Overturned if Phase 1's page does not take a Link with an empty `url` through Reveal, or if the real-device matrix shows the hand-off failing. Deeplink Links then go back to `/r/{id}`.

  ASSUMPTION: `/netlify/*` answers 404 with landing.html as its body, not the catch-all's 200. Rung 2: the plan's Phase 0 DONE line ("ofl.ink/netlify/functions/secrets.json returns 404") can only come true on v2 once ofl.ink points here. Rung 5 for the body. Overturned if a Username `netlify` must exist; Phase 3 reserves it.

  ASSUMPTION: the Geo Rule stays out of the Profile JSON. Rung 1 for v1: script.js never reads `geo`, and Reveal looks it up on the server. Overturned if Phase 1's page reads `geo`.

  ASSUMPTION: Mode travels as `profile.mode` and `links[].mode`, always the effective value, using D3's stored names. Rung 2 for the field and its values (plan Phase 1: "mode field in profile JSON"; D3). Sending effective values rather than raw ones is rung 5, so the page never needs the fallback rule. Overturned by the names Phase 1's page reads.

  ASSUMPTION: Visitor location tries v1's header names first, then Cloudflare's, and falls back to US as v1 does. Rung 3: geo_utils.js:48–49. A Visitor can fake their own country, which changes only the Tracking Code on their own Click. Overturned if that matters before Phase 5, which owns stripping these headers at the edge.

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
  - **New and vanished Links.** A v1 Link new since the last run gets a fresh Link Id. A v1-imported record (one with a `v1Key`) that this run's input no longer contains is named in a `stale in v2:` warning and kept. Records born in v2 have no `v1Key` and are never named.

  ASSUMPTION: re-runs match on a private `v1Key`, keep Mode and owner, and warn about stale records instead of deleting them. Rung 4: a deletion cannot be undone without backups, and a Mode chosen in v2 has no v1 counterpart for v1 to overrule. Overturned if the Operator wants re-runs to mirror v1 deletions, or to reset Mode to escape_ig.

- **v1 Import — how it runs.**
  - It runs inside the app image with `docker compose run --rm`, with the v1 Snapshot mounted read-only for that run only (`-v "$PWD/linkme_clone3:/v1:ro"`). The VPS needs no Node of its own, and the running app never mounts secrets.json.
  - The import writes as the superuser.
  - The app and the import never log a Destination. Rung 2: plan §7 pastes failing output into tickets, and D8.

- **Public page.** The app serves the page copy that Phase 0 creates (index.html, script.js, style.css, landing.html and whatever else the page needs) from a read-only bind mount.
  - The app's own routes are matched first, and index.html is the catch-all.
  - Nothing of the page is copied from `linkme_clone3/` by this Phase.
  - The app's build context is `app/` alone, so neither the page copy nor the v1 Snapshot can be baked into the image.

  ASSUMPTION: the page copy lives in `public/` at the repo root. Rung 2 by analogy: the plan names `public/` as the published folder (§2, §5 Phase 0). Overturned by where Phase 0 actually puts it; only the Compose mount line changes.

  ASSUMPTION: a bind mount, not a copy baked into the image. Rung 4: a build context of `app/` alone cannot leak `linkme_clone3/` into an image. Overturned if the VPS should run a single self-contained image.

- **No cache.** Every Profile request reads PocketBase, which is what puts an admin edit on the next load. Images can be cached as immutable because PocketBase gives every stored file a new name.

- **Reveal hardening (D8).**
  - Reveal sends no CORS header.
  - Reveal answers 403 when `Origin` names another origin than the one the request came to, or when `Sec-Fetch-Site` is `cross-site` or `same-site`. A request carrying neither header passes.
  - Reveal and `/r` share an in-memory, fixed-window limit per client IP (`REVEAL_LIMIT_PER_MINUTE`). The client IP is the one Caddy reports in `X-Forwarded-For`, and a 429 body carries no Destination.
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

  ASSUMPTION: on-demand TLS for Custom Domains moves to Phase 5. Plan Phase 2 lists it on the caddy line, but it needs D6's per-Profile domain field and an `ask` check that has no domain list to consult before Phase 5 ("Custom domain per profile via Caddy on-demand TLS"). Without that check it would either issue a certificate for any domain or refuse every one. Rung 2: the user's standing YAGNI instruction. Overturned if the Operator wants on-demand TLS live before Phase 5.

- **PocketBase.**
  - Built from the official release archive (PocketBase publishes no official image), at least 0.23, on `alpine:3`.
  - The superuser comes from the environment and is upserted on every start.
  - Migrations are copied into the image.
  - Data lives in a named volume.
  - It is published on 127.0.0.1 only, and the admin UI is reached through an SSH tunnel.

  ASSUMPTION (evidence blocked): the version pin is the newest release the human finds, at least 0.23, which brought JS migrations, autodate fields and the superuser command. The newest release cannot be looked up offline. Overturned by the human setting the pin.

  ASSUMPTION: the admin UI is reachable only through an SSH tunnel. Rung 4: nothing new goes on the public internet. Overturned if the Operator wants a public admin host, which would be one more Caddy site.

  ASSUMPTION: the app reads PocketBase as a superuser. Rung 5: no service account and no extra rules are needed. Overturned if a least-privilege account is wanted before Phase 3 exposes PocketBase.

- **n8n.** v2's Compose file does not define, start or reach n8n (ADR 0001). It keeps running as it does today (D1).

- **Restarts and readiness.**
  - All three services restart `unless-stopped`.
  - PocketBase has a healthcheck on `/api/health`, and the app depends on it being healthy.
  - `docker compose up --wait` therefore returns with the stack ready for the import.

- **Base images.** `caddy:2-alpine` and `node:22-alpine`, both already on this Mac (`docker images`, 2026-10-02), and `alpine:3` under PocketBase, which needs a pull.

  ASSUMPTION: Node 22 LTS on Alpine for the app. Rung 5: it is already local, and sharp ships prebuilt musl binaries for it. Overturned if sharp misbehaves on Alpine; then use `node:22-slim`.

- **Test loop (plan §7).**
  - **Startup.** The Playwright webServer runs the stack wrapper, which:
    1. runs `docker compose --env-file tests/e2e.env up --build --wait`;
    2. runs the v1 Import with the v1 Snapshot as the first site and the Fixture Profile's site last;
    3. follows the logs;
    4. on SIGTERM (Playwright's `gracefulShutdown`), runs `docker compose … down -v`.
  - **Readiness.** Playwright waits on the Fixture Profile's JSON URL, which exists only after the seed's last write.
  - **baseURL** stays `http://localhost:4173`.
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
  - `tests/e2e/00-smoke.spec.ts` pins the v1 id `juliafilippo_juliafilippo_juliafilippo_name1` (lines 5 and 48), which v2 no longer serves. If it still does so when this Phase lands, this Phase changes it to find the Adult Link by its title in the served Profile JSON.
  - Its other assertions hold on v2: juliafilippo_ imports in Escape Mode, so the Instagram overlay still shows, and its Adult Link has a secrets entry, so Reveal answers 200.

  ASSUMPTION: this Phase owns that one edit if Phase 0 has not already made it. Rung 1: the pinned id cannot survive fresh Link Ids. Overturned if Phase 0 rewrites the smoke spec.

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
  - **Reveal.** For every Adult Link, v2's Reveal gives the same answer as v1's handler for the same card. The cases are: no code, digits, `geo` and junk; for Links with a Geo Rule, several `x-country`/`x-region` pairs; and the Adult Links without a secrets entry, where both answer 404.
  - **Journeys.** The final navigation to a Destination's host is caught with `page.route` and answered locally, never followed.
    - A non-Adult card goes through `/r/{id}` to the v1 url.
    - `/{username}/{digits}`, then the Age Gate, sends Reveal `trackingId={digits}` and lands where v1 sends that code.
    - `/{username}?link={v2 Adult id}` reveals on load.
  - **Old ids.** Every v1 Link Id and every secrets key gets 404 from both Reveal and `/r`.
  - **Leaks.** No Destination appears in any Profile JSON, in any page's HTML, in `/netlify/functions/secrets.json` (which answers 404) or in `/secrets.json` (the catch-all).
  - **Paths.** An unknown Username lands on `/landing.html`, and `/Jaka`, `/JakaJaka` and `/weiWEi` serve the same JSON as their lower-case twins.
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
  - **Refusal.** The tree is `tests/fixtures/v1-broken/`, plus a case twin with different bytes written inside the container. The tree holds:
    - one valid Profile, `importcheck_ok`;
    - one file that is still invalid after the trailing-comma repair;
    - one Profile without a `links` array.

    The run exits 1 with one `invalid v1 file:` line per bad file. Afterwards `/importcheck_ok` lands on the landing page and the PocketBase counts are what they were.
  - **Re-run with changes.**
    1. Import `tests/fixtures/v1-rerun-a/`.
    2. Set its Profile's Mode to `direct` through the API.
    3. Import `tests/fixtures/v1-rerun-b/`, which retitles one Link, drops one and adds one.

    Expected: the retitled Link shows its new title and keeps its Link Id; the added Link has a fresh id; the dropped Link is named `stale in v2` and is still served; and the Profile's Mode is still `direct`.
  - **No Destination printed.** No run's output contains any Destination of its input.
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
# manual (once, network; plan §9 — the Operator runs these when asked): pnpm --dir app add hono @hono/node-server sharp
# manual (once, network): docker pull alpine:3        # caddy:2-alpine and node:22-alpine are already local (docker images, 2026-10-02)
# manual (once, network): docker compose --env-file tests/e2e.env build        # downloads the pinned PocketBase release and the app's packages
# manual (once, network, only if the HEIC case of 02-image-upload fails with sharp alone): pnpm --dir app add heic-convert
test -f linkme_clone3/netlify/functions/secrets.json
git check-ignore -q linkme_clone3/ && git check-ignore -q .env
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
    && vols("pocketbase").some(v => v.type === "volume")
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
  const urls = new Set(Object.values(JSON.parse(fs.readFileSync("linkme_clone3/netlify/functions/secrets.json", "utf8"))));
  for (const f of fs.readdirSync(dir))
    for (const l of JSON.parse(fs.readFileSync(dir + "/" + f, "utf8").replace(/,(\s*[}\]])/g, "$1")).links)
      if (/^https?:\/\//.test(l.url || "")) urls.add(l.url);
  const needles = [...urls].filter(u => u.length > 12);
  const files = cp.execSync("git ls-files -z --cached --others --exclude-standard").toString().split("\0").filter(Boolean);
  const hits = files.filter(f => { try { const t = fs.readFileSync(f, "utf8"); return needles.some(n => t.includes(n)); } catch { return false; } });
  if (hits.length) { console.error("v1 Destination found in: " + hits.join(" ")); process.exit(1); }'
# manual: settle the ports 80/443 question in Further Notes first (needs the live VPS).
# manual: copy this repo and the v1 Snapshot (secrets.json included) to the VPS over SSH, e.g. rsync -a --exclude node_modules --exclude .scratch ./ root@srv1395798.hstgr.cloud:/opt/oflinkv2/
# manual: on the VPS, write /opt/oflinkv2/.env with SITE_ADDRESS=<v2 host>, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD; point <v2 host>'s DNS A record at the VPS.
# manual: on the VPS: cd /opt/oflinkv2 && docker compose up -d --build --wait
# manual: on the VPS: docker compose run --rm -v "$PWD/linkme_clone3:/v1:ro" app import-v1 --site /v1     # exit 0; a git clone of v1 prints three case-twin lines, an rsync from this Mac none
# manual: from the Mac: curl -sI http://<v2 host>/ | grep -i '^location: https://'     # Caddy redirects HTTP to HTTPS
# manual: from the Mac: PLAYWRIGHT_BASE_URL=https://<v2 host> npx playwright test tests/e2e/02-profile-parity.spec.ts     # paced; takes a few minutes
# manual: ssh -L 8090:127.0.0.1:8090 root@srv1395798.hstgr.cloud; edit a display name at http://localhost:8090/_/; reload https://<v2 host>/<username>; the new name shows.
./check.sh    # runs tests/e2e/02-profile-parity, 02-v1-import, 02-live-edit, 02-image-upload, 02-reveal-guard with every earlier spec
```

## Depends on

- **Phase 0** provides:
  - The page copy in this repo, which the app serves as the public page.
  - The Fixture Profile and the test-only secrets file, which the seed imports as a second site.
  - Specs that run against whatever serves baseURL.

  ASSUMPTION: the page copy is a directory holding index.html, script.js, style.css and landing.html, at `public/`, and it calls v1's paths (`/api/profiles/{username}.json`, `/.netlify/functions/reveal?id&user&trackingId`). Rung 5: it is a copy of v1's page. Overturned by Phase 0's actual layout or paths: the mount line, or the routes, follow it.

  ASSUMPTION: the Fixture Profile is a v1-shaped Profile file (plan §7: "juliafilippo_ copy"). Its Username differs from every v1 Username, its image paths sit under `/images/`, and its test-only secrets file has secrets.json's shape with `example.com` Destinations. Rung 2 for the shape. The rest is rung 5, so the seed can mount it as a v1-shaped site. Overturned by Phase 0's actual fixture; only the seed's mounts change.

  ASSUMPTION: Phase 0's specs do not pin Link Ids; they read them from the served Profile. ADR 0004 makes every v2 Link Id fresh, so a pinned id cannot pass on v2. Overturned if a Phase 0 spec pins one; that spec then changes as the smoke spec does here.

- **Phase 1** provides the Mode field in the page: the page copy acts on `profile.mode` and `links[].mode`, and passes its specs against v2 on the Fixture Profile.

  ASSUMPTION: Phase 1's page reads the effective `mode` values sent here, and takes a Link with an empty `url` through Reveal, which is how Deeplink Mode gets its real Destination. Rung 5. Overturned by Phase 1's actual page; the Profile JSON then adapts (see the Deeplink ASSUMPTION under Contracts).

## Out of Scope

- **Writing Events** from `/r`, Reveal and a Page View ping, daily aggregation, and the Stats page. Plan Phase 4.
- **Replacing the page's global localStorage Tracking Code.** D5, plan Phase 4.
- **Creator sign-up (public, per §9 D9), login, email verification and reset, Onboarding, the Editor and owner collection rules.** Plan Phase 3.
- **A public route to PocketBase's API, reserving the Usernames the app's routes use (`api`, `r`, `netlify`, …), and making the n8n Form admin-only.** Plan Phase 3. No v1 Username collides with these routes today (observed: `ls linkme_clone3/api/profiles`).
- **The per-Profile Custom Domain field, Caddy on-demand TLS with its `ask` check, routing a host to a Profile, and Spare Domains.** Plan Phase 5 and D6, by YAGNI (see the Caddy ASSUMPTION).
- **Pointing ofl.ink's DNS at the VPS, Netlify as a cold backup, switching v1 off, and freezing n8n Form edits before the final import.** Plan Phase 5 (Cutover).
- **Mode and Escape behaviour inside the page, and the real-device In-App Browser matrix.** Plan Phase 1 and its manual RUN.md item.
- **Any change to v1:** the old GitHub repo, Netlify, the live n8n workflow, and `linkme_clone3/`. Plan §8.
- **ffmpeg, video and animated images.** D4: "ffmpeg only if video is added later".
- **Proxies (D7), a Geo Rule UI, Umami, content rules and abuse reporting.** Bonus, after Phase 5 (§5, §9 D9).
- **A response cache or realtime push to open pages.** "Live instantly" means the next load, and reading PocketBase on every request already gives that.
- **PocketBase backups before Cutover.** The plan does not ask for them; until Cutover the v1 Import rebuilds v2 from v1.
- **A geo-IP database in the app.** Edge headers are enough until Phase 5 picks the production source (Further Notes).
- **A least-privilege PocketBase account for the app.** The superuser is enough while every rule is closed.
- **More than one app container, or a shared rate-limit store.** One container serves the stack.
- **Re-encoding imported WebP images.** They are copied byte for byte so that the pages look identical.
- **Mirroring v1 deletions on re-runs, and any way to rotate a Link Id.** Warnings are enough until Cutover; nothing asks for rotation yet.

## Further Notes

- **NEEDS-HUMAN (needs the live VPS, floor 2): what holds ports 80 and 443 on the VPS today.** ADR 0001 leaves this to the Operator. The local stack does not depend on it; only the `# manual:` VPS lines in Acceptance wait for it. Check with:

  ```sh
  ssh root@srv1395798.hstgr.cloud 'docker ps --format "{{.Names}}\t{{.Image}}\t{{.Ports}}"; ss -ltnp "( sport = :80 or sport = :443 )"'
  ```

  ASSUMPTION: the VPS takes SSH as `root@srv1395798.hstgr.cloud`, inferred from n8n's host `n8n.srv1395798.hstgr.cloud` (plan §1) and Hostinger's default root login. Overturned by the Operator's actual SSH login.

  ASSUMPTION (evidence blocked): n8n's install on this VPS may run its own proxy (Traefik is common there, and D6 mentions "(or Traefik)"), but nobody has looked. Overturned by the output above.

  The choice depends on that output:
  - **If nothing holds 80/443,** v2's Caddy takes them and nothing in this spec changes.
  - **If a proxy in front of n8n holds them,** the Operator picks one of two ways:
    - **Caddy fronts both.** v2's Caddy takes 80/443 and adds n8n's host as a second site. The old proxy is stopped, not deleted, so starting it again rolls back. This keeps automatic TLS and Phase 5's on-demand TLS, but v2 then reaches n8n, against story 24.
    - **The existing proxy fronts v2.** v2's Caddy listens on other ports behind that proxy and n8n is untouched. TLS for the v2 host, and later for Custom Domains, then lives in a proxy this repo does not own.

  Until the Operator decides, nothing on the VPS changes.
- **Network steps for the human (floor 2; plan §9 says the Operator runs them when asked).** These are the first four `# manual:` lines of Acceptance:
  - the `pnpm --dir app add` line, which writes `app/`'s manifest and lockfile;
  - the `alpine:3` pull;
  - the first `docker compose build`, which downloads the pinned PocketBase release and the app's packages;
  - the conditional `heic-convert` add.

  After them, `./check.sh` rebuilds from cache with no network. The same first build runs once on the VPS.
- **The v2 host name.** It is the Operator's choice, set as `SITE_ADDRESS` in the VPS `.env`, and its DNS A record is a manual step.

  ASSUMPTION: a host name separate from ofl.ink until Cutover, such as a subdomain the Operator controls, so that ofl.ink keeps pointing at v1. Rung 2: D1, "Netlify … keep running … until … parity". Overturned if the Operator tests on the VPS's own host name instead.
- **Refreshing the v1 Snapshot before a re-run.** The Operator replaces `linkme_clone3/` with a fresh copy of v1, for example `git -C linkme_clone3 pull --ff-only`. That is a network read of the old repo, which writes nothing there. ADR 0002 already flags that replacing the snapshot is not editing it.
- **Where the Visitor's country comes from before Cutover.** The Visitor location module reads Cloudflare's headers after v1's. v2 sees real countries only once its host is proxied by Cloudflare with visitor-location headers on, and Caddy trusts Cloudflare's ranges so that `X-Forwarded-For` carries the Visitor's IP. That is account and DNS work, so it is manual. Until then every Visitor without the headers counts as US, which is v1's own fallback. Parity is proven here with injected headers. A real country source is a prerequisite of Cutover, not of this Phase.

  ASSUMPTION: edge headers rather than a geo-IP database. Rung 3: v1 takes location from its edge's headers (geo_utils.js:48–49), and D5 names "VPS geo-ip or Cloudflare header". Overturned if the Operator will not proxy through Cloudflare; a geo-IP lookup then goes behind the same Visitor location function.
- **Who can upload in Phase 2.** Only a superuser token gets past PocketBase's rules, so the Operator and the tests are the only uploaders until Phase 3 gives Creators a token and owner rules.
