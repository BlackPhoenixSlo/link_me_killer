# Phase 02 — VPS foundation in Docker

**Objective.** A Docker Compose stack of Caddy, a Node app and PocketBase serves every v1 Profile from PocketBase exactly as v1 does, shows a PocketBase admin edit on the next page load, and stores every uploaded image as WebP.

## Problem Statement

The Operator runs ofl.ink as v1. Its Profiles are files in a GitHub repo, written by the n8n Form, then built and served by Netlify. Every edit costs about five commits and a build, and concurrent edits overwrite each other's Destinations. Images must be converted to WebP by hand before upload, and Destinations sit in files anyone can fetch. The Operator has no server of his own to hold data, check who is editing, count Clicks or answer for other domains. Without one, none of the later work (Editor, Stats, Custom Domains) can start. While all this is built, v1 must keep serving Visitors untouched.

## Solution

v2 runs on the Hostinger VPS as one Compose stack, beside the n8n that is already there:

- **Caddy** handles TLS.
- **The app** serves Profile pages.
- **PocketBase** holds Profiles, Links, Destinations and images.

A v1 Import copies every Profile, Destination and image from v1 into PocketBase. Visitors see v1's own index.html and script.js, unchanged. The page gets its Profile data from the app instead of a static file, and that data never contains a Destination. A Destination leaves the server only one Click at a time, through the `/r` redirect or Reveal.

When the Operator edits a Profile in the PocketBase admin UI, the change is on the page at the next load. Any image the app receives (JPG, PNG, HEIC, GIF or WebP) is turned upright, resized and stored as WebP. v1 keeps serving ofl.ink until Cutover (Phase 5).

## User Stories

1. As a Visitor, I want a Profile served by v2 to look and behave as the same Profile on v1, so that nothing changes for me when the Operator switches over.
2. As a Visitor, I want tapping a non-Adult Link to take me to the same Destination as on v1, through a server redirect, so that the Destination is never in the page.
3. As a Visitor, I want an Adult Link to show the Age Gate and, after "Continue (18+)", open the same Destination with the same Tracking Code suffix as v1.
4. As a Visitor arriving at `/{username}/{code}`, I want my Tracking Code applied exactly as v1 applies it, so that the Creator's OnlyFans credits the right source.
5. As a Visitor from a country (or US state) covered by a Link's Geo Rule, I want that rule's Tracking Code appended, as v1 does.
6. As a Visitor opening a Link Shortcut (`?link={Link Id}`), I want that Link revealed when the page loads, as on v1.
7. As a Visitor in an In-App Browser, I want the same Mode, Escape and Escape Overlay behaviour as on v1, because v2 serves the same page script.
8. As a Visitor opening a Username that does not exist, I want to land on the landing page, as on v1.
9. As a Visitor, I want the landing page, styles and other static files of v1 served unchanged.
10. As a Visitor, I want Profile images cached for good, as v1's images are, so that pages load fast on repeat visits.
11. As a Creator, I want my Destinations to appear in no public response from v2, so that crawling a Profile does not harvest them.
12. As a Creator, I want my Geo Rules and record internals left out of the public Profile data.
13. As a Creator, I want every new Link to get a random Link Id unrelated to my Username, so that ids cannot be guessed.
14. As a Creator, I want to send a photo straight from my phone (JPG, PNG, HEIC, GIF or WebP) and have it stored as WebP, so that I never convert images myself.
15. As a Creator, I want an uploaded photo turned upright from its camera orientation and shrunk to 512 px (avatar, icon) or 1080 px (background), so that it displays correctly and loads fast.
16. As a Creator, I want location and camera metadata stripped from uploaded photos.
17. As a Creator, I want the upload endpoint to change only records PocketBase says I may change, so that nobody else can replace my images.
18. As the Operator, I want one `docker compose up` to start Caddy, the app and PocketBase on the VPS.
19. As the Operator, I want Caddy to obtain and renew the v2 host's TLS certificate and redirect HTTP to HTTPS without manual steps.
20. As the Operator, I want the n8n already on the VPS left out of v2's Compose file and untouched, so that the v1 editing flow keeps working.
21. As the Operator, I want v1 (Netlify, GitHub and the n8n Form) to keep serving ofl.ink unchanged until Cutover.
22. As the Operator, I want to run the v1 Import to copy all v1 Profiles, Links, Destinations and images into PocketBase.
23. As the Operator, I want to re-run the v1 Import without creating duplicates, and have it name every Profile and Link that v2 holds and v1 no longer does, so that v1 edits made through the n8n Form before Cutover reach v2 and v1 deletions are not silently missed.
24. As the Operator, I want the v1 Import to refuse a broken v1 file, name it, and write nothing, so that corrupted v1 data never lands in v2.
25. As the Operator, I want the v1 Import to warn about references already broken in v1 (missing image files, Adult Links without a Destination) and carry them over as v1 shows them.
26. As the Operator, I want to edit a Profile or Link in the PocketBase admin UI and see it on the next page load, with no build and no restart.
27. As the Operator, I want the PocketBase admin UI reachable only through an SSH tunnel, so that it is not on the public internet.
28. As the Operator, I want PocketBase file fields to accept only WebP, so that every stored image is WebP whichever way it arrives.
29. As the Operator, I want the collections users, profiles, links and events defined as versioned migrations in the repo, so that the schema is reviewed and reproducible.
30. As the Operator, I want PocketBase's own auth to be the only auth in v2, with no login or ownership code in the app.
31. As the Operator, I want PocketBase's API closed to everyone but superusers until Phase 3, so that no sign-up or record read can happen before the Editor and its rules exist.
32. As the Operator, I want the superuser credentials and the v2 host name kept in an untracked env file on the VPS.
33. As the Operator, I want Reveal to answer only the page's own origin and to rate-limit each client, so that bulk harvesting of Destinations is slowed.
34. As the Operator, I want `/r/{Link Id}` under the same rate limit as Reveal.
35. As the Operator, I want an events collection ready for Phase 4, with nothing written to it yet.
36. As the Operator, I want the Visitor's country and US state taken from the edge's request headers, so that Geo Rules work on v2 as soon as the edge supplies them.
37. As the Operator, I want PocketBase data and Caddy certificates to survive container restarts and rebuilds.
38. As the Operator, I want a parity check I can point at the VPS, so that I can prove every Profile matches v1 before Cutover.
39. As a developer, I want `./check.sh` to start the v2 stack with docker compose, seed it, run every spec and tear it down, all at the same baseURL as before.
40. As a developer, I want the Phase 0 and Phase 1 specs to pass against v2, with only the adjustments named under Testing Decisions, so that v2 keeps every promise those specs check.
41. As a developer, I want the test stack in its own Compose project with throwaway data, so that it never touches any other local stack.
42. As a developer, I want test failures never to print a Destination, since failing output is pasted into tickets.
43. As a developer, I want image fixtures for every D4 format committed, so that the upload spec runs offline.

## Implementation Decisions

- **Owns.**
  - **Stack.** The Compose file and the Caddy config at the repo root. They define the services `caddy`, `app` and `pocketbase`, their volumes and the environment contract. n8n is not part of it.
  - **PocketBase image and schema.** Lives in `pocketbase/`: an image built from a pinned PocketBase release, plus versioned JS migrations for the collections below.
  - **App.** Lives in `app/`: a Node service on Hono, made of these modules.
    - **PocketBase gateway**: the app's only door to PocketBase.
    - **Public Profile**: turns PocketBase records into v1's Profile-file JSON.
    - **Destination resolver**: Link plus Tracking Code plus Visitor location gives the Destination URL. It is a port of v1's reveal.js and geo_utils.js.
    - **Visitor location**: reads country and region from request headers.
    - **Click guard**: a per-client rate limit for Reveal and `/r`, and a same-origin check for Reveal.
    - **Image pipeline**: turns any image into WebP.
    - **Routes**: the HTTP contract below, plus static serving of v1's published directory.
    - **v1 Import**: a CLI shipped in the app image.
  - **e2e stack.**
    - The Playwright webServer moves from tests/dev-server.mjs (removed) to a wrapper. The wrapper runs the stack under docker compose, seeds it with the v1 Import and tears it down.
    - A committed test env file.
    - Image fixtures, and two small v1 fixture trees: one the import must refuse, one it must import with warnings.
    - `tests/fixtures/secrets.json`, the test-only Destinations of Phase 1's fixtures.
    - Five specs.

  ASSUMPTION: the Compose file and Caddyfile sit at the repo root, with `app/` and `pocketbase/` beside them. Rung 3: each part of this repo sits in its own top-level directory, and plan section 7 runs `docker compose up` from the root, where Playwright runs. Overturned if v2 should live in its own repository.

  ASSUMPTION: Hono over Express. Rung 5: Hono parses multipart bodies and serves static files with two small dependencies (hono, @hono/node-server); Express needs express plus multer and their transitive dependencies. Overturned if Hono's Node adapter cannot stream PocketBase files or serve the v1 directory.

- **Interfaces.**
  - PocketBase gateway:
    - `getProfile(username)` returns the Profile with its Links in `order`, or none.
    - `getLink(linkId)` returns the Link or none.
    - `fetchFile(collection, recordId, filename)` returns a stream.
    - `viewRecord(collection, recordId, callerToken)` and `replaceFile(collection, recordId, field, webp, callerToken)` return PocketBase's own status.
    - Reads run as a superuser whose credentials come from the environment, and re-authenticate when PocketBase answers 401. Upload writes carry the caller's token, never the superuser's.
  - Public Profile: `toPublicProfile(profile, links, origin)` returns the Profile JSON under Contracts.
  - Destination resolver: `resolveDestination(link, trackingCode?, location)` returns a URL or none. Reveal and `/r` both use it.
  - Visitor location: `visitorLocation(headers)` returns `{ country, region }`.
  - Click guard: `allow(clientIp)` returns a boolean, and `sameOrigin(request)` returns a boolean.
  - Image pipeline: `toWebp(bytes, maxSide)` returns WebP bytes or an "unsupported image" error.
  - v1 Import: `import-v1 --site <v1 published dir> --secrets <secrets file> [--secrets <file>]… [--profiles <dir>]…`, run as `npm run import-v1` in the app image. Profile files come from `<site>/api/profiles/` and from each `--profiles` directory; image paths always resolve against `<site>`. Destinations come from every `--secrets` file; a Link Id found in two of them refuses the import.

  ASSUMPTION: the extra `--profiles` directory exists for the seed, because Phase 1's spec puts the Fixture Profile and `fixture_v1` in `tests/fixtures/profiles/`, outside the v1 tree (phase-01-link-modes-and-escape.md, "Fixtures, the seed contract for later Phases", and its Acceptance parses `tests/fixtures/profiles/fixture.json`). Rung 5: one flag instead of copying fixtures into the v1 tree. Overturned by where Phase 1 actually leaves its fixtures; only the seed's arguments change.

  ASSUMPTION: the Fixture Profile's Adult Link gets its Destination from a test-only `tests/fixtures/secrets.json`, which holds `example.com` addresses only and which the seed passes as a second `--secrets`. No file held one before: Phase 0's Acceptance requires v1's secrets.json to hold exactly v1's Links, and Phase 1's tests stub Reveal. Phase 4's test 8 and Phase 5's behaviour 3 need a real 200 from Reveal on that Link, and the v1 oracle (Testing Decisions) is given the same files, so Phase 5 has an expected answer. Rung 5: one repeatable flag and one small file. Overturned if Phase 1's fixtures already carry their Destinations somewhere the import reads.

  ASSUMPTION: the app reads PocketBase as a superuser. Rung 5: no service account and no extra rules are needed. Overturned if a least-privilege service account is wanted before Phase 3 exposes PocketBase.

- **Schema.** PocketBase collections, created and changed only through versioned migrations. In Phase 2, every API rule of every collection is superuser-only.

  ```
  users      PocketBase's built-in auth collection; only change: create (sign-up) rule superuser-only
  profiles   username             text, required, unique, ^[a-z0-9_]+$
             displayName          text
             bio                  text
             verified             bool
             avatar               file, max 1, image/webp only
             mode                 select direct | escape_ig | deeplink, optional    (the Profile's default Mode)
             owner                relation -> users, optional
  links      profile              relation -> profiles, required, cascade delete
             linkId               text, required, unique, autogenerated [a-z0-9]{12}
             title                text, required
             order                number
             isAdult              bool
             mode                 select direct | escape_ig | deeplink, optional    (empty = the Profile's default)
             destination          text, optional                                    (absolute URL or root-relative path)
             tracking             bool
             defaultTrackingCode  text, optional                                    (v1 default_tracknumber, verbatim)
             geo                  json, optional                                    (Geo Rule, v1 shape)
             icon                 file, max 1, image/webp only
             backgroundImage      file, max 1, image/webp only
  events     profile              relation -> profiles, required
             link                 relation -> links, optional                       (empty for a Page View)
             kind                 select page_view | click
             country              text
             inAppBrowser         text
             created              autodate
  ```

  ASSUMPTION: every collection rule is superuser-only in Phase 2, users sign-up included. Rung 4: a closed rule is cheaper to undo than a leak, and ADR 0002 makes rules the security boundary. Phase 3 opens owner rules and sign-up according to D9. Overturned if PocketBase's API is published before Phase 3.

  ASSUMPTION: `profiles.owner` exists from now on but stays optional. Rung 5: the plan lists users alongside profiles, and imported Profiles have no Creator yet. Overturned if Phase 3 ties Creators to Profiles another way.

  ASSUMPTION: the events collection is created here with D5's fields, and nothing writes to it in Phase 2. Rung 2 on both counts: plan Phase 2 lists the events collection, and plan Phase 4 reads "events written by /r/:linkId and a page-view ping". Phase 4 may extend the collection with an additive migration. Overturned if Phase 4 expects `/r` or Reveal to write Events already.

  ASSUMPTION: file fields accept image/webp only, so the admin UI refuses a dropped-in JPG instead of converting it. Rung 4: this keeps "every stored image is WebP" true without a second converter inside PocketBase. Overturned if the Operator must upload raw photos in the admin UI before the Editor exists (Phase 3).

  ASSUMPTION: new Link Ids are 12 random [a-z0-9] characters, and Usernames match ^[a-z0-9_]+$. Rung 5: ADR 0004 asks for at least 10 random characters, and every v1 Profile file name on this Mac's checkout matches the pattern (observed). git's index also holds three capitalised case twins, which the import skips (v1 Import, Case twins). Overturned by Phase 3's Username rules.

- **Contracts.**

  HTTP. Every request goes through Caddy to the app. The app answers the paths v1's page script already calls, so that script runs unchanged.

  | Request | Answer |
  |---|---|
  | `GET /api/profiles/{username}.json` | 200 with the Profile JSON below, or 404 `{"error":"Profile not found"}`. The Username is matched lower-cased. `Cache-Control: public, max-age=0, must-revalidate` |
  | `GET /.netlify/functions/reveal?id&user&trackingId` | 200 `{"realUrl": …}`, 404 `{"error":"Link not found"}`, 403 cross-origin, 429 over the limit. Never an `Access-Control-Allow-Origin` header |
  | `GET /r/{linkId}` | 302 with `Location:` the Destination, 404, or 429 |
  | `GET /api/files/{profiles\|links}/{recordId}/{filename}` | The file, only when it is the current avatar, icon or backgroundImage of that record, else 404. `Cache-Control: public, max-age=31536000, immutable` |
  | `POST /api/upload/{collection}/{recordId}/{field}`, with `Authorization: <PocketBase token>` and multipart `file` | 200 `{"url": "/api/files/…"}`; 401 without a token; PocketBase's own 403 or 404 passed through; 404 for an unknown target; 413 over 20 MB; 415 for anything that is not a decodable image |
  | `GET /netlify/*` | 404 with landing.html as the body, the rule Phase 0 adds to v1's netlify.toml |
| Any other `GET` | The file at that path in v1's published directory, else index.html with 200 |

  Upload targets: `profiles/avatar` (512 px), `links/backgroundImage` (1080 px), `links/icon` (512 px).

  Profile JSON keeps v1's Profile-file shape, minus everything server-only:

  ```
  { "profile": { "username", "displayName", "bio", "avatarUrl", "verified", "mode"? },
    "links":   [ { "id", "title", "isAdult", "tracking", "default_tracknumber"?, "mode"?,
                   "icon", "backgroundImage", "url" } ] }            // links in `order`
  url         "{origin}/r/{id}" for a non-Adult Link in Direct or Escape Mode;
              "" for an Adult Link (Age Gate, then Reveal) and for a Link in Deeplink Mode (Reveal, then the Deeplink link)
  Mode        the effective Mode: the Link's, else the Profile's, else escape_ig (Phase 1's rule)
  image keys  "/api/files/…" or ""
  never sent  destination, geo, owner, PocketBase record ids
  ```

  Reveal and `/r` share the Destination resolver, which keeps v1's rules:
  - A `trackingId` made of digits appends `/c{digits}`, after one trailing slash is dropped.
  - `trackingId=geo` looks the Visitor up in the Link's Geo Rule:
    - If the rule has an entry for the country and it is a string, that string is the Tracking Code.
    - If the country entry is an object, its region entry is used, else its `default`.
    - With no country entry, the rule's `default` is used.
    - If none of these exists, nothing is appended.
  - Any other `trackingId` appends nothing.
  - `user` is accepted and ignored, because a Link Id is unique across all Profiles.

  Visitor location:
  - country = `x-country`, else `cf-ipcountry`, else `US`.
  - region = `x-nf-subdivision-code`, else `x-region`, else `cf-region-code`, else empty.

  Compose environment:
  - `SITE_ADDRESS`: Caddy's site; the v2 host on the VPS, `:80` in tests.
  - `HTTP_PORT` and `HTTPS_PORT`: default 80 and 443.
  - `PB_PORT`: default 8090, bound to 127.0.0.1 only.
  - `PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD`: required.
  - `V1_SITE_DIR`: v1's published directory, default `./linkme_clone3/public`.
  - `REVEAL_LIMIT_PER_MINUTE`: default 60.

  On the VPS these live in an untracked `.env`. Tests use a committed `tests/e2e.env`, which holds test-only values and sets `COMPOSE_PROJECT_NAME` to a test project.

  v1 Import CLI:
  - It reads `<site>/api/profiles/*.json`, every `--profiles` directory, the secrets file, and every image path a Profile file names, resolved against `<site>`.
  - On success it exits 0 and prints a summary of Profiles, Links, images and warnings. The warnings include one `stale in v2: <username>[/<Link Id>]` line for every Profile, and every Link of an imported Profile, that PocketBase holds and the v1 files no longer do.
  - On failure it exits non-zero, prints one `invalid v1 file: <path>: <reason>` line per problem, and writes nothing. It validates everything before it contacts PocketBase.

  ASSUMPTION: the app answers v1's own paths (`/api/profiles/{username}.json` and `/.netlify/functions/reveal`), so the shared script needs no edit for v2. Rung 5, which also follows ADR 0001: Phase 0–1 code is carried into v2, not forked. Overturned if Phase 1's script calls other paths; the app then answers those instead.

  ASSUMPTION: a non-Adult Link's `url` is the absolute `{origin}/r/{id}`. Rung 2 for leaving out the Destination (D8: "no real URL in any public file"). Rung 4 for the absolute form, because v1's escape code strips the scheme from the URL it is given and so needs a full URL. Overturned if Phase 1's script builds its own redirect URLs from the Link Id.

  ASSUMPTION: a Link in Deeplink Mode gets an empty `url`, Adult or not, so Phase 1's script takes it through Reveal and hands the phone the real Destination (Phase 1, Taps by Mode: a Link without a `url` goes through Reveal, and Deeplink Mode then uses the Deeplink link). With `{origin}/r/{id}` the phone would be handed an ofl.ink address that no app owns, and Deeplink would act like Direct. Rung 5: no script change, one rule in the projection. The cost is the one Phase 1 already flags for Adult Deeplink Links: navigating from the Reveal callback may lose the tap's user activation. Overturned if the real-device matrix shows that hand-off failing; Deeplink Links then go back to `/r/{id}` and act like Direct on v2.

  ASSUMPTION: `/netlify/*` answers 404 with landing.html, copying Phase 0's rule, so Phase 0's test 1 holds on v2 and the old secrets path stays dead after Cutover. Rung 3: Phase 0's rule; rung 5. Overturned if a Username `netlify` must exist; Phase 3 reserves it.

  ASSUMPTION: the Geo Rule is left out of the Profile JSON. Rung 5: script.js never reads it, and Reveal looks it up on the server. Overturned if Phase 1's script reads `geo`.

  ASSUMPTION: Mode travels as `profile.mode` and `links[].mode`, with D3's stored values. Rung 6: Phase 1 owns the field, and these names mirror D3's wording. Overturned by the names Phase 1 actually uses; the import and the Profile JSON then copy those.

  ASSUMPTION: Visitor location tries v1's header names first, then Cloudflare's, then falls back to US as v1 does. Rung 3: v1 takes location from its edge's headers, and the specs inject `x-country`. A Visitor can fake their own country, which changes only the Tracking Code on their own Click. Overturned if that matters; Caddy then strips v1's header names from public requests. From Phase 5 on it does this for the country headers on the HTTPS site (phase-05, Caddy configuration).

  ASSUMPTION: `/r` serves any Link that has a Destination, Adult or not, behind the same rate limit as Reveal. Rung 5: the Age Gate is client-side, Reveal already hands out Adult Destinations, and ADR 0004 treats both as obfuscation. Overturned if Adult Destinations may leave only through Reveal.

- **Public page.** The app serves v1's published directory read-only from a bind mount: index.html, script.js, style.css, landing.html, images and the rest. The app's own routes are matched first, and index.html is the catch-all, which is v1's `/* → /index.html` rule. Phase 1's Mode and escape code reach v2 by being in that directory; v2 holds no copy of them. That lasts until Phase 4, the first Phase whose page change v1 must not get. From then on the app serves v2's own copy of the page files Phases 4 and 5 change, ahead of this directory (phase-04, Public page copy).

  ASSUMPTION: a bind mount rather than a copy baked into the app image. Rung 5: no build step has to reach into the nested v1 repo. Overturned if the VPS should run a single self-contained image.

- **No cache.** Every Profile request reads PocketBase, which is what makes an admin edit show on the next load. Images can be cached as immutable because PocketBase gives every upload a new file name.

- **What "identically" means (the DONE line).**
  - The baseline is the v1 tree as Phase 0 and Phase 1 leave it, read when the tests run. No Profile count is written down; the plan says 27–29 in one place and 27 in another (goal_ai.txt:39, :143).
  - The same: every Profile's page (display name, bio, verified badge, avatar, and the cards in v1's order with their titles, lock icons, icons and backgrounds, and no others), and the Destination every Click ends at for the same Tracking Code and Visitor location.
  - Different on purpose: a non-Adult tap goes through `/r/{id}` instead of straight to the Destination; the Profile JSON carries no Destination or Geo Rule and an empty `url` for Adult Links and Deeplink Mode Links; image URLs move to `/api/files/…` with the same bytes.
  - Also different: a Link Shortcut to a non-Adult Link opens that Link's Destination, the same place a tap goes. v1's Shortcut always calls Reveal (linkme_clone3/script.js:80–110), and v1's Reveal reads only secrets.json, so in v1 a Shortcut did nothing for most non-Adult Links and, for the three non-Adult Links that have a secrets entry, opened that entry, which differs from the tapped `url` in all three (counted without printing values).

  ASSUMPTION: a Link has one Destination, as CONTEXT.md defines a Link ("leads to one Destination"), so the three Shortcut-only secrets entries are not kept. Rung 5. Overturned if those entries must stay reachable by Shortcut; each would then become a Link of its own.

- **Reveal hardening (D8).**
  - Reveal sends no CORS header.
  - Reveal refuses a request with 403 when its `Origin` names another origin, or when its `Sec-Fetch-Site` is `cross-site` or `same-site`. A request with neither header passes.
  - Reveal and `/r` share an in-memory, fixed-window limit per client IP (`REVEAL_LIMIT_PER_MINUTE`). The client IP is the one Caddy reports in `X-Forwarded-For`.
  - The app's port is not published, so only Caddy can reach it.

  ASSUMPTION: the limit is 60 requests per client IP per minute, held in memory in a single app container. Rung 5 for keeping it in memory; rung 6 for the number, because D8 says "rate-limited" without one and a Visitor makes only a handful of Reveals per visit. Overturned if mobile-carrier NAT produces false 429s; then raise the number.

  ASSUMPTION: the "own origin" check uses `Origin` and `Sec-Fetch-Site`, and a request carrying neither passes. Rung 4, following ADR 0004: same-origin only, as obfuscation rather than a boundary. Overturned if non-browser clients must be refused too.

- **Upload (D4).**
  - The app first checks the caller's token by viewing the target record through PocketBase, before decoding anything. A caller PocketBase would refuse never costs any image work.
  - The app then converts the image and replaces the file using the caller's token. The app never decides ownership (ADR 0002).
  - The pipeline turns the image upright from its EXIF orientation and shrinks it until its longest side is at most the target size, never enlarging it. It encodes WebP at quality 80, keeps transparency, and drops all metadata.
  - An image over sharp's default input pixel limit gets 415, like any image sharp cannot decode.
  - Replacing a file leaves PocketBase to delete the old one, so an old image URL answers 404 from then on.

  ASSUMPTION: transparency kept, sharp's default pixel limit kept, and PocketBase's own clean-up of replaced files relied on. Rung 5: these are the libraries' defaults. Overturned if transparent images should be flattened onto a colour, or if old image URLs must keep working.

  ASSUMPTION: "avatar 512px, background 1080px" means the longest side, keeping the aspect ratio and never enlarging. Icons get the avatar size, an animated GIF keeps its first frame, and inputs over 20 MB are refused. Rung 5: one rule for every target, and per D4 animation waits until video is added. Overturned if the Operator meant square-cropped avatars or a fixed width.

  ASSUMPTION (evidence blocked): sharp's prebuilt binaries decode JPG, PNG, GIF and WebP but not HEVC-coded HEIC. This is recalled, not observed, because installing sharp is a network fetch. If the HEIC fixture fails with sharp alone, the pipeline decodes HEIC with heic-convert (pure JavaScript) and hands the result to sharp. Overturned if the HEIC fixture passes with sharp alone; heic-convert is then not added.

- **v1 Import.**
  - It runs inside the app image with `docker compose run`, with the v1 tree mounted read-only for that one run. The VPS needs no Node install of its own, and secrets.json is never mounted into the running app.
  - It reads and validates every file before writing anything.
  - The Username is the Profile file's name, because the page script takes the Username from the URL path (script.js, `pathSegments[0]`), not from the file. Three v1 files carry a different `username` value, and juliafilippo.json's equals juliafilippo_'s.
  - A non-Adult Link's Destination is its `url`, which is v1's click path (`window.location.href = link.url`).
  - An Adult Link's Destination is its secrets entry, which is what v1's reveal.js uses.
  - A relative v1 `url` such as `landing.html` is stored root-relative, the way the v1 page resolved it.
  - Link Ids, order, titles, the Adult and tracking flags, default Tracking Codes, Geo Rules and Modes are copied as they are. Images are copied byte for byte.

  ASSUMPTION: invalid JSON or a duplicated Link Id stops the whole import with nothing written. A missing image file, or an Adult Link with no secrets entry, is imported the way v1 shows it (no image; Reveal answers 404), with a warning. Rung 4 (never import guessed data), together with "identically" in the plan's DONE line. Observed today: 6 missing image files and 8 Adult Links without a secret. Overturned if the Operator wants broken v1 Links repaired during import.

  - **Case twins.** git tracks three capitalised Profile files, Jaka, JakaJaka and weiWEi, whose bytes equal their lower-case files (observed: `git -C linkme_clone3 ls-tree -r origin/main -- api/profiles` gives each pair one blob id; Phase 0 keeps them identical). A case-sensitive checkout, such as a git clone on the VPS, shows all six files; this Mac shows three.
    - Before the duplicate-id check, the import skips a file whose lower-cased name matches another file with the same bytes, with a `case twin skipped: <file>` warning. It refuses one whose bytes differ.
    - The gateway's `getProfile` matches the Username lower-cased. Every route that looks a Profile up by name (the Profile JSON here, Phase 4's ping, Phase 5's Host Resolution) therefore keeps `/Jaka`, `/JakaJaka` and `/weiWEi` on their Profile at Cutover, however the tree reaches the VPS.

  ASSUMPTION: skip and lower-case, rather than refuse the import or drop the capitalised addresses. Rung 4: no bio address v1 serves is lost, and nothing is guessed, since the bytes are equal. Rung 5: one comparison in the import and one `toLowerCase` in the lookup. Overturned if the Operator wants the capitalised addresses gone; the lower-casing then goes and those paths land on the landing page.

  ASSUMPTION: three non-Adult Link Ids also appear in secrets.json. Their Destination is the Link's `url`, which v1 uses on every click, not the secrets entry, which v1 used only for a Link Shortcut. Rung 1 that the click path uses `url`; rung 6 in choosing between the two. Overturned if those secrets entries are the intended Destinations.

  ASSUMPTION: the import upserts by Username and Link Id, v1 wins, and nothing is deleted. Rung 4: D1 keeps v1 live and edited through the n8n Form until Cutover, so the import will be re-run before Cutover; Phase 5's runbook runs "the final v1 Import" after the n8n Form is frozen. Overturned if edits made on the v2 side must survive a re-import.

  ASSUMPTION: a Profile or Link deleted in v1 is not deleted from v2 by a re-run. The import names it in a `stale in v2` warning instead, and the parity spec fails on it, because it requires each Profile's cards to be exactly v1's Links. The Operator deletes it in the admin UI. Rung 4: a v2 record missing from v1 may be v2's own (a test record, or from Phase 3 on a Creator's), and a deletion cannot be undone without backups, which this Phase does not have. Overturned if the Operator wants the import to mirror v1 deletions.

  ASSUMPTION: re-running the import before Cutover fits ADR 0002, which the plan review reworded to "re-runnable until Cutover, with v1 winning", and CONTEXT.md's "one-time copy" is read the same way: v1 stays the source of truth until Cutover, the final run is the one copy that hands over, and after Cutover the import is never run again. Rung 4, with D1. Overturned if the Operator wants a single run ever; the Operator then imports into an empty PocketBase once, right before Cutover, and story 23 goes.

  ASSUMPTION: imported images are copied unchanged, not re-encoded to D4's sizes. Rung 5, together with the DONE line's "identically". Overturned if v1 images should be shrunk on import.

- **Caddy (D6).** One site, `SITE_ADDRESS`, reverse-proxied to the app. On the VPS, Caddy obtains and renews its certificate and redirects HTTP to HTTPS by itself. Certificates persist in a volume. PocketBase is not routed through Caddy.

  ASSUMPTION: on-demand TLS, the Custom Domain field and its `ask` check belong to Phase 5. The plan points both ways: Phase 2's stack lists caddy with "on-demand TLS for custom domains" (goal_ai.txt:137), while Phase 5 reads "Custom domain per profile via Caddy on-demand TLS" (goal_ai.txt:163), D6 calls it "a DB field + on-demand TLS", and Phase 2's DONE names no domain (goal_ai.txt:145–146). Phase 5's spec ships the on-demand policy, its TLS Ask endpoint and the catch-all site (phase-05-cutover-and-domains.md, "Caddy configuration"), so nothing is dropped. In Phase 2 an on-demand block would have no Custom Domain list to ask: it would either issue certificates for any domain pointed at the VPS or refuse every domain, which is dead config. Rung 2 for leaving it out, from the user's YAGNI instruction. Overturned if the Operator wants on-demand TLS live before Phase 5.

- **PocketBase.**
  - Built from a pinned release, at least 0.23, because that release brought the JS migration API, autodate fields and the superuser command used here.
  - The superuser comes from the environment and is re-applied on every start.
  - Data lives in a named volume.
  - It is published on 127.0.0.1 only, and the Operator opens the admin UI through an SSH tunnel.

  ASSUMPTION: built from the official release archive, not from a community image. Rung 5: PocketBase publishes no official image, so this adds no third-party image to trust. Overturned if the Operator prefers a maintained community image.

  ASSUMPTION (evidence blocked): the pin is the newest release the implementer knows to exist, at least 0.23; the actual newest release can't be looked up offline. Overturned by the human bumping the pin.

  ASSUMPTION: the admin UI is reachable only through an SSH tunnel. Rung 4: nothing new goes on the public internet. Overturned if the Operator wants a public admin host name, which would be one more Caddy site.

- **n8n.** v2's Compose file does not define it, start it or reach it. It keeps running as it does today (D1).

- **Restarts and readiness.** All three services restart `unless-stopped`, so a VPS reboot brings v2 back. PocketBase has a healthcheck on its `/api/health`, and the app starts only once PocketBase is healthy, so `docker compose up --wait` returns with the stack ready for the import.

  ASSUMPTION: rung 5, the smallest settings that make a reboot and `--wait` behave as the Acceptance assumes. Backups, resource limits and schema rollback stay out (Out of Scope). Overturned if the VPS restarts services some other way.

- **Base images.** `caddy:2-alpine` for Caddy, `node:22-alpine` for the app, and `alpine:3` under the PocketBase binary.

  ASSUMPTION: Node 22 LTS on Alpine. Rung 5: the smallest official Node image that sharp ships prebuilt binaries for. Overturned if sharp misbehaves on Alpine; then use `node:22-slim`.

- **Test loop (plan section 7).**
  - The Playwright webServer runs a wrapper. It starts the stack (`docker compose up --build --wait`, with the test env file and its own Compose project), runs the v1 Import against the local v1 tree, and follows the logs. On SIGTERM (Playwright's `gracefulShutdown`) it runs `docker compose down -v`.
  - baseURL stays http://localhost:4173.
  - Playwright waits on the Fixture Profile's JSON URL, which answers only once the seed has run.
  - When `PLAYWRIGHT_BASE_URL` is set, it replaces baseURL and skips the webServer, so the parity spec can be pointed at the VPS.
  - The v1 Import spec and the Reveal guard spec run in a last project, after every other spec: the guard spec uses up the shared rate-limit window, and the import spec re-imports Profiles that other specs read.
  - `reuseExistingServer` is false, so a run never lands on a stack it did not start (playwright.config.ts:13 reuses one today whenever `CI` is unset).
  - `tests/e2e.env` sets `REVEAL_LIMIT_PER_MINUTE=600`, so one local run fits inside one window; the guard spec reads the limit from that file.
  - Against the VPS the production limit holds, so the parity spec sends its own Reveal and `/r` requests through one paced helper, at most 50 a minute, in one worker, which leaves room for its page journeys. v1 has 25 Adult Links today (counted in linkme_clone3/api/profiles), so four Tracking Code cases alone make 100 Reveals.

  ASSUMPTION: a raised limit in the test env, and pacing only when pointed at the VPS. Rung 5. Overturned if VPS parity runs must finish inside a minute; the VPS limit would then be raised for the run.
  - tests/dev-server.mjs is removed.

  ASSUMPTION: the seed is the v1 Import of the local v1 tree plus Phase 1's `tests/fixtures/profiles/` (through `--profiles`) and `tests/fixtures/secrets.json` (through a second `--secrets`), real Destinations included, loaded into a throwaway local PocketBase. Rung 2: the plan says "same specs, same baseURL" and names the Fixture Profile as a juliafilippo_ copy. Rung 5: one import path serves both seeding and production. Overturned by where Phase 1 actually leaves its fixtures.

  ASSUMPTION: after Phase 0, v1's layout is `linkme_clone3/public/` (published, with `api/profiles/` and `images/`) plus `linkme_clone3/netlify/functions/secrets.json`. Rung 2: Phase 0 says "Move site into public/ … keep functions outside it". Overturned by Phase 0's actual layout; only `V1_SITE_DIR` and the import's two arguments change.

  ASSUMPTION: tests/dev-server.mjs is deleted once nothing calls it. Rung 2: the user's YAGNI instruction and the plan's switch to docker compose. Overturned if a v1-side server is wanted again; git can restore it.

## Testing Decisions

The main seam is the stack's public HTTP surface at baseURL, driven by Playwright. Pages show what a Visitor sees. The `request` fixture covers Profile JSON, redirects (not followed), Reveal and multipart uploads. Tests arrange state through PocketBase's REST API on its loopback port, the same API the admin UI drives. Two more interfaces are driven from specs because a browser cannot reach them: the v1 Import CLI, run with `docker compose run` against the test stack, and PocketBase's REST API called with no token, to prove its rules are closed. A good test here opens a page, calls an endpoint or runs the CLI and checks the answer, never the app's modules.

- **The oracle for "identical" is v1 itself.** The tests load the v1 Profile files and v1's own Reveal function in the test process, the way tests/dev-server.mjs loaded it. No test re-implements Tracking Codes or Geo Rules.
- **Destinations stay out of failures.** A failing assertion names the Link Id and never prints a Destination, because failing output is pasted into tickets (plan section 7).
- **The v1 Import is covered three ways.** Its happy path runs as the seed before every run. Its refusal, warning and re-run paths are a spec that drives the CLI against the running test stack and then reads PocketBase, so "writes nothing" is checked against real state, not inferred from an exit code.
- **Phase 0–1 specs run against v2 as those Phases leave them**, tests/e2e/00-smoke.spec.ts included. The smoke spec as committed pins `juliafilippo_juliafilippo_juliafilippo_name1` (tests/e2e/00-smoke.spec.ts:5, :48), a Link Id Phase 0 regenerates; Phase 0's spec changes it to read the id from the served Profile, which v2's Profile JSON still carries.
  - Three things make them hold on v2. `/netlify/*` answers 404 (Contracts), so Phase 0's test 1 passes. Phase 1's Reveal stub answers a non-Adult fixture Link with its own `url`, so its Deeplink tests pass when a Deeplink Mode Link goes through Reveal. Phase 0's BASE tests (3, 6, 7) skip themselves once Phase 0's go-live push has landed; before that push, test 6's "served `url` equals BASE `url`" would meet the deliberate `/r/{id}` difference.

  ASSUMPTION: this Phase's `./check.sh` runs after Phase 0's go-live push. Rung 2 for the order, since plan §5 puts Phase 0 first; the push itself is the Operator's. Overturned if Phase 2 must pass before that push; test 6 then follows a non-Adult `url` through `/r` to the BASE `url` on v2.

Specs this Phase adds:

- `tests/e2e/02-profile-parity.spec.ts`
  - For every v1 Profile file, the page's title, display name, bio, verified badge and avatar match the file, and its Link cards are exactly the file's Links, in order and no others: titles, lock icon, background and icon.
  - The Profile JSON contains no Destination and no Geo Rule.
  - Every non-Adult Link outside Deeplink Mode has `url` `{baseURL}/r/{id}`, every Deeplink Mode Link has an empty `url`, and `/r` answers 302 to the Link's v1 Destination.
  - For every Adult Link, Reveal answers what v1's Reveal answers. This covers each kind of Tracking Code (none, digits, `geo`, junk) and, for Links with a Geo Rule, several `x-country`/`x-region` pairs.
  - Journeys through the page, with the last navigation to a Destination's host caught by `page.route` and answered locally, never followed:
    - tapping a non-Adult Link card goes through `/r/{id}` to that Link's v1 Destination;
    - opening `/{username}/{digits}` and passing the Age Gate on an Adult Link with tracking on sends Reveal `trackingId={digits}` and lands where v1's Reveal sends that code;
    - opening `/{username}?link={Adult Link Id}` calls Reveal on load and lands where v1's Reveal sends it.
  - No seeded Destination appears in any Profile JSON, any Profile page's HTML, or the answers for `/netlify/functions/secrets.json` (404) and `/secrets.json` (the catch-all).
  - An unknown Username lands on /landing.html.
  - `/Jaka` shows the same Profile as `/jaka`, because Usernames are matched lower-cased.
  - Unknown Link Ids get 404 from both Reveal and `/r`.
  - Modes are not re-tested here: the Phase 1 spec runs against v2 on the Fixture Profile, which holds a Link in every Mode.
- `tests/e2e/02-live-edit.spec.ts`
  - A throwaway Profile and Link created through PocketBase's API show on the page.
  - Each of these shows on the next load, with no restart: renaming the Profile, retitling a Link, reordering, adding a Link and deleting one.
  - Deleting the Profile sends the page to /landing.html.
  - Setting the throwaway Profile's default Mode and a Link's Mode to each of `direct`, `escape_ig` and `deeplink` shows in the Profile JSON on the next load.
  - Anonymous calls to PocketBase's REST API on its loopback port (list and view links and profiles, create a users record) are all refused, and no response body holds a Destination.
- `tests/e2e/02-image-upload.spec.ts`
  - Committed JPG, PNG, GIF, WebP and HEIC fixtures each come back as WebP, judged by the bytes (a `RIFF…WEBP` header) and not only by `Content-Type`, both from the URL the upload returns and in the Profile JSON.
  - Sizes are read from the browser's `naturalWidth` and `naturalHeight`: a 3000×2000 background comes back at 1080×720, a 2000×2000 avatar at 512×512, and a small image is not enlarged.
  - A JPEG tagged with EXIF orientation 6 comes back with width and height swapped.
  - Without a token the upload gets 401, and the record is unchanged.
  - With a malformed token, and with the token of a plain `users` record the test creates through the superuser API, the upload is refused (401, or PocketBase's own 403 or 404) and the record is unchanged. The `users` token is the case that fails an app that only checks a token is present and then writes as the superuser.
  - A JPEG carrying EXIF GPS and camera tags comes back with no `EXIF` or `XMP ` chunk in the WebP file.
  - A text file gets 415.
  - PocketBase itself refuses a PNG put straight into a file field.
- `tests/e2e/02-reveal-guard.spec.ts`
  - Reveal with a foreign `Origin`, or with `Sec-Fetch-Site: cross-site`, gets 403, with no Destination in the body.
  - No Reveal response carries `Access-Control-Allow-Origin`.
  - Repeated Reveal and `/r` calls reach 429 within `REVEAL_LIMIT_PER_MINUTE + 1` requests, with the limit read from `tests/e2e.env`, and the 429 body holds no Destination.
- `tests/e2e/02-v1-import.spec.ts`, local only. It runs the CLI as the Operator does, `docker compose --env-file tests/e2e.env run --rm -v <tree>:/v1:ro app npm run --silent import-v1 -- …`, then reads PocketBase as the superuser.
  - Refusal: `tests/fixtures/v1-broken/` holds one valid Profile file (`importcheck_ok`), one invalid JSON file (`broken.json`) and one file that repeats a Link Id. The run exits non-zero and prints an `invalid v1 file:` line for each bad file. Afterwards PocketBase holds no `importcheck_ok` Profile, and its Profile and Link counts are what they were before the run.
  - Warnings: `tests/fixtures/v1-warnings/` holds a Profile naming a missing image and an Adult Link with no secrets entry. The run exits 0 and warns about both; the page shows that Profile with no image, and Reveal answers 404 for that Link.
  - Re-run: importing the seed trees again exits 0 and leaves the Profile and Link counts of the seeded Usernames unchanged. A Link the test added through the API to a seeded Profile is named in a `stale in v2` warning and still exists afterwards; the test then deletes it.

Prior art:
- tests/e2e/00-smoke.spec.ts: page assertions, Reveal interception, a fake In-App Browser user agent.
- tests/dev-server.mjs: loading v1's Reveal function in-process.

## Acceptance

```sh
# manual (once, network; Further Notes says why): docker pull caddy:2-alpine && docker pull node:22-alpine && docker pull alpine:3
# manual (once, network): pnpm --dir app add hono @hono/node-server sharp
# manual (once, network, only if the HEIC fixture fails with sharp alone): pnpm --dir app add heic-convert
# manual (once, network): docker compose --env-file tests/e2e.env build
docker compose --env-file tests/e2e.env config --quiet
test "$(docker compose --env-file tests/e2e.env config --services | sort | paste -sd' ' -)" = "app caddy pocketbase"
git check-ignore -q .env
test ! -e tests/dev-server.mjs
docker compose --env-file tests/e2e.env config --format json | node -e '
  const s = JSON.parse(require("fs").readFileSync(0, "utf8")).services;
  const ok = !(s.app.ports || []).length
    && (s.pocketbase.ports || []).length > 0
    && s.pocketbase.ports.every(p => p.host_ip === "127.0.0.1")
    && (s.pocketbase.volumes || []).some(v => v.type === "volume")
    && (s.caddy.volumes || []).some(v => v.type === "volume" && v.target === "/data")
    && ["app", "caddy", "pocketbase"].every(n => s[n].restart === "unless-stopped")
    && !!s.pocketbase.healthcheck;
  process.exit(ok ? 0 : 1)'
grep -q 'reuseExistingServer: false' playwright.config.ts
for s in 02-profile-parity 02-live-edit 02-image-upload 02-reveal-guard 02-v1-import; do test -f "tests/e2e/$s.spec.ts" || exit 1; done
# manual: on the VPS, settle the 80/443 question in Further Notes first.
# manual: copy the repo and the v1 tree (secrets.json included) to the VPS; write .env there with SITE_ADDRESS=<v2 host>, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD; point <v2 host>'s DNS A record at the VPS.
# manual: on the VPS: docker compose up -d --build --wait
# manual: on the VPS: docker compose run --rm -v "$PWD/linkme_clone3:/v1:ro" app npm run --silent import-v1 -- --site /v1/public --secrets /v1/netlify/functions/secrets.json
# manual: in that output, a git clone of the v1 repo gives three `case twin skipped` warnings (Jaka, JakaJaka, weiWEi); a tree copied from this Mac gives none.
# manual: from the Mac: curl -sI http://<v2 host>/ | grep -i '^location: https://'    # Caddy redirects HTTP to HTTPS
# manual: from the Mac: PLAYWRIGHT_BASE_URL=https://<v2 host> npx playwright test tests/e2e/02-profile-parity.spec.ts    # paced, so it takes a few minutes
# manual: ssh -L 8090:127.0.0.1:8090 <vps>; edit a display name at http://localhost:8090/_/; reload https://<v2 host>/<username>; the new name shows.
./check.sh
```

## Depends on

- **Phase 0.** Provides:
  - v1's published directory `public/`, with the functions and secrets.json outside it. The app serves that directory, and the import reads secrets.json from outside it.
  - Random, unique Link Ids.
  - Every Profile file parsing, with the corrupted ones fixed. The import refuses bad data rather than repairing it.
  - The smoke spec reading the Adult Link's id from the served Profile instead of pinning the old id (tests/e2e/00-smoke.spec.ts:5 and :48 pin it today).
- **Phase 1.** Provides:
  - The Mode fields in v1's Profile files.
  - The page script and index.html carrying the Mode and Escape behaviour, which v2 serves as they are.
  - The Fixture Profile (`fixture`: a Link in every Mode plus an Adult Link) and the Mode-less `fixture_v1`, as v1-shaped Profile files in `tests/fixtures/profiles/`, which the seed imports with `--profiles`. Today tests/ holds only the smoke spec and dev-server.mjs (`find tests -type f`), so no fixture exists before Phase 1.
  - Its fixture lookup in tests/dev-server.mjs, which this Phase removes with the file; the seed takes its place.

## Out of Scope

- **Writing Events from `/r`, Reveal and a Page View ping, daily aggregation, and the Stats page.** Plan Phase 4.
- **Creator login, register, verify and reset; Onboarding; the Editor; owner collection rules; a public route to PocketBase's API (Phase 3 owns it: an allow-listed proxy); reserving the Usernames the app's routes use (Phase 3 owns the list, `netlify` included for the 404 above); and D9.** Plan Phase 3. No v1 Username collides with those routes today (observed).
- **The Custom Domain field, Caddy on-demand TLS with its `ask` check, routing a host to a Profile, and Spare Domains.** Plan Phase 5. See the ASSUMPTION under Caddy.
- **Pointing ofl.ink's DNS at the VPS, keeping Netlify as cold backup, and turning v1 off.** Plan Phase 5 (Cutover).
- **The n8n Form writing into PocketBase.** v1 stays the source of truth until Cutover, and re-running the v1 Import carries its edits over. Plan Phase 3 makes n8n admin-only.
- **Replacing the page script's global localStorage Tracking Code.** Phase 4 does it (D5; phase-04-stats.md stores the code under a per-Profile key). Phase 2 serves the script unchanged.
- **The real-device In-App Browser matrix.** Phase 1 and the manual RUN.md item.
- **ffmpeg, video and animated images.** D4: "ffmpeg only if video is added later".
- **Proxies (D7), a Geo Rule UI and Umami.** Bonus, after Phase 5.
- **A response cache or realtime push to open pages.** "Live instantly" means the next load, which reading PocketBase on every request already gives.
- **PocketBase backups before Cutover.** Not in the plan. Until Cutover v1 is the source of truth, and the v1 Import rebuilds v2. From Cutover on, Phase 5 owns them (phase-05, Backups).
- **A geo-IP database in the app.** Only needed if Cloudflare is not put in front (Further Notes).
- **A least-privilege service account for the app.** The superuser is enough until Phase 3 exposes PocketBase.
- **More than one app container, or a shared rate-limit store.** One container serves the whole stack.
- **Re-encoding imported v1 images.** They are copied unchanged so the pages look identical.

## Further Notes

- **Network steps for the human (floor 2).** The implementing agent cannot fetch, so the human runs these once. The Acceptance assumes they were run.
  - `docker pull caddy:2-alpine && docker pull node:22-alpine && docker pull alpine:3`
  - `pnpm --dir app add hono @hono/node-server sharp`, which writes the app's lockfile.
  - `pnpm --dir app add heic-convert`, only if the HEIC fixture fails with sharp alone.
  - `docker compose --env-file tests/e2e.env build`. This downloads the pinned PocketBase release archive, and the app image's pnpm and dependencies.
  - The same build runs once on the VPS (`docker compose up -d --build --wait`).
- **NEEDS-HUMAN (needs the live VPS, floor 2): what holds ports 80 and 443 on the VPS today.**
  - Check with `ssh <vps> 'docker ps --format "{{.Names}}\t{{.Ports}}"; sudo ss -ltnp "( sport = :80 or sport = :443 )"'`.
  - If nothing holds them, v2's Caddy takes them and n8n is untouched. Nothing else in this spec changes.
  - If a proxy in front of n8n holds them, there are two ways, and the Operator picks one:
    - **Caddy fronts both.** v2's Caddy takes 80/443 and adds n8n's host name as a second site proxied to the n8n container; the old proxy is stopped, not deleted, so restarting it rolls back. For: Caddy keeps automatic TLS, and Phase 5's on-demand TLS needs Caddy on 443. Against: v2 then reaches n8n, which breaks this spec's n8n decision and story 20, and n8n's front door changes while v1 depends on it.
    - **The existing proxy fronts v2.** v2's Caddy listens on other ports behind that proxy, and n8n is untouched. For: story 20 holds as written. Against: TLS for the v2 host, and in Phase 5 for every Custom Domain, must then be solved in a proxy this repo does not own.
  - The `ss` output settles which case applies; the Operator settles which way to take. Until then nothing on the VPS changes.

  ASSUMPTION (evidence blocked): the VPS's n8n set-up may ship its own proxy on 80/443. D6's "(or Traefik)" hints at that, but nobody has looked. Overturned by the `ss` output above.
- **Where the Visitor's country comes from before Cutover.** The Visitor location module reads Cloudflare's headers. v2 sees real countries once the v2 host (and ofl.ink at Cutover) is proxied by Cloudflare with "Add visitor location headers" on. Caddy must also trust Cloudflare's address ranges (`trusted_proxies`) so that `X-Forwarded-For` carries the Visitor's IP for the rate limit. That is account and DNS work, so it is manual. Until then, every Visitor without the headers counts as US, which is v1's own fallback.
  - Phase 2's parity is proven with injected headers, which proves the resolver, not a real country source. A real source is a prerequisite of Cutover, not of this Phase: without one, Geo Rule Tracking Codes on v2 differ from v1's for every non-US Visitor.
  - Phase 4 picked Cloudflare's header as the production source (phase-04, Further Notes). Phase 5 proxies ofl.ink and the Spare Domains through Cloudflare, leaves Custom Domains DNS-only, and owns the Caddy lines: Cloudflare's ranges as `trusted_proxies`, `X-Country` set from `CF-IPCountry` only for requests from those ranges, and both headers removed from every other request (phase-05, Caddy configuration). The source sits behind the Visitor location module, so this Phase's design holds either way.

  ASSUMPTION: Cloudflare headers rather than a geo-IP database in the app. Rung 3: v1 takes location from its edge's headers, and D5 names both options. Overturned if the Operator won't proxy through Cloudflare, or if Custom Domains (Phase 5) need geo Tracking Codes without it. A geo-IP lookup then goes behind the same Visitor location function.
- **Who can upload in Phase 2.** The upload endpoint has no Creator caller until Phase 3. In Phase 2 only a superuser token gets past PocketBase's rules, so the Operator and the tests are the only uploaders.

## Review

**codex**, 2026-10-02. Two `codex exec` calls (read-only sandbox, reasoning effort high) in a docs-only workspace holding goal_ai.txt, CONTEXT.md, docs/adr/, tests/, check.sh, playwright.config.ts and package.json. The v1 source was not in it. Both calls exited 0 within the 15-minute bound, with fresh, non-empty output. Blindness: the workspace's git index lists docs/spec/, and the blind call ran `git ls-files`, so it saw the spec file names. Its command log shows it read only the plan, CONTEXT.md, the ADRs and the harness files, and no spec content.

### Blind call (without the draft)

- B1 Deployment alternatives (stay on Netlify and add hosted data and auth, or move to the VPS). **reject**: D1 is a constraint (goal_ai.txt:73–75), and the reviewer itself says to implement it.
- B2 Public data boundary (a Node projection, or separate public and private collections). **reject**: every rule stays superuser-only and public reads go through the app's projection. PocketBase rules work per record, so Phase 3's owner rules show a Link only to its owner, and one `links` collection never publishes a Destination (ADR 0002:11 holds).
- B3 Import strategy (one-time, or repeatable with a freeze). **partial**: re-runs stay, because D1 keeps v1 edited until Cutover. Stale-record warnings and the reading of ADR 0002 are now written under v1 Import. The freeze before the final run is Phase 5's ("Freezing v1 edits").
- B4 Page compatibility (an adapter, or a script change). **reject**: the spec already serves the script unchanged behind v1's own paths, as goal_ai.txt:144 asks.
- B5 Reveal and redirect split left unspecified. **reject**: Contracts already define it. A non-Adult Link goes through `/r`, an Adult Link through the Age Gate and Reveal, and both use one resolver.
- B6 Domain scope overlap (on-demand TLS appears in both Phase 2 and Phase 5). **partial**: see draft finding 1.
- B7 Precise parity baseline, deliberate differences, no hard-coded Profile count. **accept**: added a new "What 'identically' means" decision. The parity spec reads the files at test time.
- B8 Import failure policy (duplicates, conflicts, bad JSON, missing images, id mapping, retries, data that parses but is wrong). **reject**: v1 Import already decides each case. Invalid JSON or a duplicated Link Id refuses the import. A missing image or a missing secret gives a warning. `url` wins over secrets. Ids are copied and records upserted. Fixing data that parses but is wrong (jaka7q's display name) is Phase 0's job (goal_ai.txt:126).
- B9 Ownership and schema invariants. **reject**: Schema already makes `owner` optional and leaves it unset on import, and decides the Username pattern, `order` and cascade delete. One Creator owning many Profiles, and handing imported Profiles over, are Phase 3's (phase-03 story 10). The import runs as superuser, and Creators have no way to write in Phase 2.
- B10 A testable contract for where Destinations may appear. **partial**: the contract already exists (Contracts, Reveal hardening). Added a parity sweep: no seeded Destination appears in any Profile JSON, any page's HTML, or the catch-all answers for the secrets paths.
- B11 Which Tracking Code wins, whether a Shortcut skips the Age Gate, the overlay rule. **reject**: these are the rules of the page script (Phase 1) and reveal.js. The script is served unchanged, and Reveal is checked against v1's own Reveal. The overlay rule is Phase 1's ("When the Escape Overlay shows").
- B12 A bounded image contract. **partial**: added transparency, the pixel limit (415) and clean-up of replaced files under Upload. Formats tested in the real container, animation, fit, no enlarging, 20 MB, 415 and auth were already decided.
- B13 Rules for which domains are admitted and how they route. **reject**: Phase 5 (goal_ai.txt:163; Out of Scope).
- B14 A minimal operating contract. **partial**: added "Restarts and readiness" (restart policy, PocketBase healthcheck), checked in Acceptance. Backups and resource limits stay out: the plan does not ask for them, and v1 can rebuild v2 until Cutover. n8n stays out of the Compose file under D1's "n8n stays as is" (goal_ai.txt:75), and goal_ai.txt:141 lists it as "already there; stays".
- B15 Events boundary between Phases 2 and 4; sign-up stays closed. **reject**: already decided. The collection has `page_view|click` and an optional Link, so Reveal Clicks fit. Nothing writes to it, and sign-up is superuser-only.
- B16 Test seam: the public origin seeded by a deterministic synthetic import, plus PocketBase probes and restart checks. **partial**: the seed stays the real v1 tree, because parity with v1 is the DONE line. Added anonymous PocketBase probes. Persistence is checked as named volumes in Acceptance rather than by recreating containers in the middle of a parallel suite.
- B17 Import seam: account for every input record, including the known corruption types. **partial**: a spec now tests refusal (invalid JSON, duplicated Link Id), warnings (missing image, Adult Link without a secret) and re-runs against real state. Checking the full tree record by record stays the parity spec's job.
- B18 Edit path through browser, Caddy, app and PocketBase. **reject**: the live-edit spec already does this through the REST API the admin UI uses.
- B19 Probes as anonymous, Creator A and Creator B. **partial**: added the anonymous probes. Probes as Creator A and B need Creators and owner rules, which arrive in Phase 3.
- B20 Click journeys through Reveal and the redirect, Mode × Adult, real devices. **partial**: added page journeys (see draft finding 7). The Mode matrix stays with the Phase 1 spec on the Fixture Profile. Real devices are Phase 1's manual item.
- B21 Decode the output; a `.webp` name proves nothing. **accept**: WebP is now judged by the `RIFF…WEBP` bytes, and sizes by decoded dimensions.
- B22 Hosts, TLS and lifecycle (admitted and unknown domains, recreation, restore, TLS not shown locally). **partial**: added a manual HTTP→HTTPS check beside the HTTPS parity run on the VPS. Domains are Phase 5's. Backup restore is out of scope.
- B23 The harness starts dev-server.mjs, not Compose. **reject**: the spec already replaces it with the Compose wrapper.
- B24 The smoke spec stubs Reveal and pins an id derived from the Username. **accept**: Depends on now names Phase 0's smoke-spec change. The new page journeys check real Destinations and Tracking Codes.
- B25 The fixture has no Deeplink Link; a faked User-Agent is not a real device. **partial**: Phase 1's Fixture Profile already holds a Deeplink Link (phase-01, "Fixtures"). Live-edit now checks that every Mode value reaches the Profile JSON. Real devices stay manual (Phase 1).
- B26 check.sh may reuse a server that is already running. **accept**: `reuseExistingServer: false` is decided and checked in Acceptance (playwright.config.ts:13 reuses one today).
- B27 Falsifier: a one-time import while v1 stays live. **partial**: see B3 and draft finding 2.
- B28 Falsifier: a Destination in an anonymous PocketBase read or a public page or file. **accept**: both are now tested (live-edit probes, parity sweep).
- B29 Falsifier: HEIC or GIF fails in the deployed container. **reject**: the upload spec already runs against the real app image, and the HEIC fallback is flagged.
- B30 Falsifier: data lost when containers are recreated, no restore, n8n starved of resources. **partial**: the persistence config is now checked. Restore and resource targets are rejected because the plan does not ask for them.
- B31 Falsifier: the frontend loses order, images or attribution; real-device Modes fail. **reject**: the parity spec checks order, images and attribution against v1. Real devices are Phase 1's.
- B32 Hiding Destinations does not stop flagging, and rotating ids does not revoke a leaked Destination (ADR 0004:19). **reject** for this spec, because no Phase 2 decision rests on it. The ADR 0004 wording is passed to the caller.

### Draft call (with the draft)

- D1 On-demand TLS is in Phase 2's plan (goal_ai.txt:137). **partial**: the plan points both ways (:137 against :163 and the DONE line at :145–146), and Phase 5's spec ships the on-demand block, so nothing is dropped. The Caddy ASSUMPTION now cites :137 and rests the deferral on the user's YAGNI instruction, because an `ask` check in Phase 2 would have no Custom Domain list to check and so would be dead config.
- D2 A re-runnable import contradicts ADR 0002's "once" and misses v1 deletions. **partial**: the deletion gap is real and now covered: `stale in v2` warnings, and the parity spec requires exact card lists. The re-run stays, because D1 keeps v1 edited until Cutover and Phase 5's runbook runs a "final v1 Import". The reading of ADR 0002 is now a flagged ASSUMPTION, overturned by "import once into an empty PocketBase right before Cutover".
- D3 The smoke spec pins a Link Id that Phase 0 regenerates. **accept**: confirmed at tests/e2e/00-smoke.spec.ts:5 and :48. Story 40 and Testing Decisions now say "as Phase 0 and Phase 1 leave them", and Depends on names Phase 0's change (phase-00: the smoke spec reads the id from the served Profile).
- D4 The Fixture Profile and the localStorage fix are wrongly assigned to Phase 1. **partial**: localStorage accepted: Phase 4's spec owns it (phase-04, "per-Profile key"), and Out of Scope is fixed. Fixture Profile ownership rejected: Phase 1's spec creates it, and tests/ holds no fixture today (`find tests -type f` lists only dev-server.mjs and 00-smoke.spec.ts). Its location was wrong, though: it lives in `tests/fixtures/profiles/`, so the import gains `--profiles` and the seed imports that directory.
- D5 One Destination per Link cannot keep v1's Shortcut behaviour for three Links. **partial**: confirmed without printing values: 3 non-Adult Links have a secrets entry, none equal to their `url`, and v1's Shortcut always calls Reveal (linkme_clone3/script.js:80–110). The change is now a declared difference under "What 'identically' means", and a Shortcut journey is tested. Two Destinations per Link is rejected (CONTEXT.md:32: a Link leads to one Destination).
- D6 The parity spec's request count cannot stay under the rate limit. **accept**: confirmed 36 Links, 25 of them Adult, in linkme_clone3/api/profiles today, so four cases make 100 Reveals. The test env raises the limit to 600, the parity spec paces itself at 50 a minute against the VPS, and the false bullet is gone.
- D7 No journeys from the page to the server. **partial**: added three journeys to the parity spec: a tap through `/r`, a Tracking Code from the path, and a Link Shortcut. Inherited and overridden Modes are rejected here: the Phase 1 spec runs against v2 on the Fixture Profile, which holds every Mode.
- D8 The upload tests would pass an app that writes as the superuser; metadata stripping is untested. **accept**: added a malformed token and a plain `users` token, each with "record unchanged", and a check that no EXIF or XMP chunk remains.
- D9 The broken-import Acceptance cannot prove "writes nothing" (`--no-deps`, no PocketBase running). **accept**: replaced by `02-v1-import.spec.ts`. It runs the CLI against the live test stack, checks PocketBase afterwards, and also covers re-runs (story 23).
- D10 Stories 27, 31 and 37 are untested. **accept**: Acceptance now checks that PocketBase is on loopback only, the app publishes no port, PocketBase and Caddy use named volumes, and the restart policy and healthcheck exist. The live-edit spec probes anonymous PocketBase access.
- D11a Real Visitor countries depend on Cloudflare, which is not a deployment prerequisite. **partial**: now written down as a Cutover prerequisite, not a Phase 2 one, because v2 serves no real Visitors before Cutover. The note includes the conflict with Phase 5's DNS-only assumption, and the source goes behind the Visitor location module either way.
- D11b Putting v2's Caddy in front of n8n contradicts the n8n decision. **needs-human**. Position A (the draft): if a proxy already holds 80/443, v2's Caddy takes over and also fronts n8n, which keeps Caddy's automatic TLS and Phase 5's on-demand TLS. Position B (the reviewer): that makes v2 reach n8n, against story 20 and D1's "n8n stays as is"; v2 should go behind the existing proxy, or this should be settled as its own deployment decision. What settles it: the `docker ps` / `ss` output on the VPS (does anything hold 80/443?), and if something does, the Operator's choice. Further Notes now lists both ways without recommending one.

Tally: accept 10, partial 19, reject 14, needs-human 1.

### Six hats

Six thinking hats on the whole Phase set, 2026-10-02, reconciled in the plan review. Labels follow docs/spec/plan-review.md (W white, R red, K black, Y yellow, G green, U blue). "Owner" is the one Phase that holds the decision.

- **W2** (Phase 5 assumes this spec's 80/443 answer) **accept**, owner Phase 5. Its Depends on now states the condition: TLS on 443 must reach Caddy, directly or by SNI passthrough. Here the needs-human item stands as written; its "existing proxy fronts v2" option already says TLS for Custom Domains would then live in a proxy this repo does not own.
- **W3** (fixture location is settled: `tests/fixtures/profiles/` through `--profiles`) **accept**. No edit.
- **W4** (parity runs against the VPS after Phase 4 write test Clicks into real Profiles' Stats) **accept**, owner Phase 5, which clears pre-switch Events after a backup. The parity spec is unchanged.
- **W5** (reserved Usernames are assigned piecemeal, and no spec says how they are enforced) **accept**, owner Phase 3, which now holds the whole list, `netlify` included. Out of Scope names the owner.
- **W6** (Further Notes still said Phase 5 uses DNS-only records) **accept**. Rewritten under "Where the Visitor's country comes from before Cutover".
- **W8** (on a DNS-only Custom Domain a Visitor can send their own `CF-IPCountry`) **accept**, owner Phase 5, which trusts that header only from Cloudflare's ranges and strips it elsewhere. The Visitor location ASSUMPTION now points there.
- **W10** (Phases 3 and 4 assumed a reused stack) **accept**. Nothing changes here: `reuseExistingServer: false` with `down -v` is the reference that Phases 3 and 4 now cite.
- **R2 / K6 / G2** (serving v1's `public/` as v2's page stops working once v2 must differ; Phase 5's readiness step would reset Phase 4's and Phase 5's page edits) **accept**, owner Phase 4, which forks v2's own copy of the page files it changes. Public page now says the bind mount alone serves v2's page only until then.
- **K1 / G4** (Deeplink through `/r` hands the phone an ofl.ink address, and Phase 1's Android Deeplink test fails on v2) **accept**, owner here. A Link in Deeplink Mode now gets an empty `url`, so Phase 1's script reveals it and deeplinks the real Destination with no script change. Rewritten: the Profile JSON's `url` line, a new ASSUMPTION under Contracts, "What 'identically' means" and the parity bullet. Phase 1's Reveal stub note is in Phase 1.
- **K2 / G5** (Phase 0's test 1 expects 404 on the secrets path, so story 40 was false) **accept**, owner here. New Contracts row `GET /netlify/*` → 404 with landing.html, with its ASSUMPTION. Story 40 and Testing Decisions now name what makes the Phase 0–1 specs hold on v2, and a flagged ASSUMPTION covers Phase 0's test 6 before its go-live push.
- **K3 / G3** (the Fixture Profile's Adult Link has no Destination in the seed) **accept**, owner here. `--secrets` repeats, the seed adds `tests/fixtures/secrets.json` with test-only `example.com` addresses, and the v1 oracle is given the same files. New ASSUMPTION under Interfaces.
- **K4** (the public PocketBase route is unowned, the app's `/api/files` has PocketBase's own path shape, and a blanket proxy publishes the superuser login) **accept**, owner Phase 3, which proxies an allow-list. The app's `/api/files/…` stays as specified here, and PocketBase's file route is never proxied. Out of Scope names the owner.
- **K5** (nobody backs v2 up after Cutover) **accept**, owner Phase 5. Out of Scope now limits this spec's cut to "before Cutover".
- **K7 / G6** (case twins: a Linux checkout refuses the import, a copy from the Mac drops `/Jaka`, `/JakaJaka` and `/weiWEi`) **accept**, owner here. New "Case twins" item under v1 Import: a capitalised twin with equal bytes is skipped with a warning, one that differs is refused, and `getProfile` matches Usernames lower-cased. The Username ASSUMPTION now says its observation was made on a case-insensitive checkout. The parity spec checks `/Jaka`, and Acceptance names the warnings a VPS clone prints.
- **U3** (ADR 0002 said the import runs once) **accept**. ADR 0002 now says "re-runnable until Cutover, with v1 winning", and the ASSUMPTION under v1 Import cites it.
