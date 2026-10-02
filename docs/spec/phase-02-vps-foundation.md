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
23. As the Operator, I want to re-run the v1 Import without creating duplicates, so that v1 edits made through the n8n Form before Cutover reach v2.
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
40. As a developer, I want the Phase 0 and Phase 1 specs to pass unchanged against v2.
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
    - Image fixtures and a broken v1 fixture tree.
    - Four specs.

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
  - v1 Import: `import-v1 --site <v1 published dir> --secrets <v1 secrets file>`, run as `npm run import-v1` in the app image.

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

  ASSUMPTION: new Link Ids are 12 random [a-z0-9] characters, and Usernames match ^[a-z0-9_]+$. Rung 5: ADR 0004 asks for at least 10 random characters, and every v1 Profile file name matches the pattern (observed). Overturned by Phase 3's Username rules.

- **Contracts.**

  HTTP. Every request goes through Caddy to the app. The app answers the paths v1's page script already calls, so that script runs unchanged.

  | Request | Answer |
  |---|---|
  | `GET /api/profiles/{username}.json` | 200 with the Profile JSON below, or 404 `{"error":"Profile not found"}`. `Cache-Control: public, max-age=0, must-revalidate` |
  | `GET /.netlify/functions/reveal?id&user&trackingId` | 200 `{"realUrl": …}`, 404 `{"error":"Link not found"}`, 403 cross-origin, 429 over the limit. Never an `Access-Control-Allow-Origin` header |
  | `GET /r/{linkId}` | 302 with `Location:` the Destination, 404, or 429 |
  | `GET /api/files/{profiles\|links}/{recordId}/{filename}` | The file, only when it is the current avatar, icon or backgroundImage of that record, else 404. `Cache-Control: public, max-age=31536000, immutable` |
  | `POST /api/upload/{collection}/{recordId}/{field}`, with `Authorization: <PocketBase token>` and multipart `file` | 200 `{"url": "/api/files/…"}`; 401 without a token; PocketBase's own 403 or 404 passed through; 404 for an unknown target; 413 over 20 MB; 415 for anything that is not a decodable image |
  | Any other `GET` | The file at that path in v1's published directory, else index.html with 200 |

  Upload targets: `profiles/avatar` (512 px), `links/backgroundImage` (1080 px), `links/icon` (512 px).

  Profile JSON keeps v1's Profile-file shape, minus everything server-only:

  ```
  { "profile": { "username", "displayName", "bio", "avatarUrl", "verified", "mode"? },
    "links":   [ { "id", "title", "isAdult", "tracking", "default_tracknumber"?, "mode"?,
                   "icon", "backgroundImage", "url" } ] }            // links in `order`
  url         "{origin}/r/{id}" for a non-Adult Link; "" for an Adult Link (it goes through Age Gate and Reveal)
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
  - It reads `<site>/api/profiles/*.json`, the secrets file, and every image path a Profile file names, resolved against `<site>`.
  - On success it exits 0 and prints a summary of Profiles, Links, images and warnings.
  - On failure it exits non-zero, prints one `invalid v1 file: <path>: <reason>` line per problem, and writes nothing. It validates everything before it contacts PocketBase.

  ASSUMPTION: the app answers v1's own paths (`/api/profiles/{username}.json` and `/.netlify/functions/reveal`), so the shared script needs no edit for v2. Rung 5, which also follows ADR 0001: Phase 0–1 code is carried into v2, not forked. Overturned if Phase 1's script calls other paths; the app then answers those instead.

  ASSUMPTION: a non-Adult Link's `url` is the absolute `{origin}/r/{id}`. Rung 2 for leaving out the Destination (D8: "no real URL in any public file"). Rung 4 for the absolute form, because v1's escape code strips the scheme from the URL it is given and so needs a full URL. Overturned if Phase 1's script builds its own redirect URLs from the Link Id.

  ASSUMPTION: the Geo Rule is left out of the Profile JSON. Rung 5: script.js never reads it, and Reveal looks it up on the server. Overturned if Phase 1's script reads `geo`.

  ASSUMPTION: Mode travels as `profile.mode` and `links[].mode`, with D3's stored values. Rung 6: Phase 1 owns the field, and these names mirror D3's wording. Overturned by the names Phase 1 actually uses; the import and the Profile JSON then copy those.

  ASSUMPTION: Visitor location tries v1's header names first, then Cloudflare's, then falls back to US as v1 does. Rung 3: v1 takes location from its edge's headers, and the specs inject `x-country`. A Visitor can fake their own country, which changes only the Tracking Code on their own Click. Overturned if that matters; Caddy then strips v1's header names from public requests.

  ASSUMPTION: `/r` serves any Link that has a Destination, Adult or not, behind the same rate limit as Reveal. Rung 5: the Age Gate is client-side, Reveal already hands out Adult Destinations, and ADR 0004 treats both as obfuscation. Overturned if Adult Destinations may leave only through Reveal.

- **Public page.** The app serves v1's published directory read-only from a bind mount: index.html, script.js, style.css, landing.html, images and the rest. The app's own routes are matched first, and index.html is the catch-all, which is v1's `/* → /index.html` rule. Phase 1's Mode and escape code reach v2 by being in that directory; v2 holds no copy of them.

  ASSUMPTION: a bind mount rather than a copy baked into the app image. Rung 5: no build step has to reach into the nested v1 repo. Overturned if the VPS should run a single self-contained image.

- **No cache.** Every Profile request reads PocketBase, which is what makes an admin edit show on the next load. Images can be cached as immutable because PocketBase gives every upload a new file name.

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
  - The pipeline turns the image upright from its EXIF orientation and shrinks it until its longest side is at most the target size, never enlarging it. It encodes WebP at quality 80 and drops all metadata.

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

  ASSUMPTION: three non-Adult Link Ids also appear in secrets.json. Their Destination is the Link's `url`, which v1 uses on every click, not the secrets entry, which v1 used only for a Link Shortcut. Rung 1 that the click path uses `url`; rung 6 in choosing between the two. Overturned if those secrets entries are the intended Destinations.

  ASSUMPTION: the import upserts by Username and Link Id, v1 wins, and nothing is deleted. Rung 4: D1 keeps v1 live and edited through the n8n Form until Cutover, so the import will be re-run before Cutover. Overturned if edits made on the v2 side must survive a re-import.

  ASSUMPTION: imported images are copied unchanged, not re-encoded to D4's sizes. Rung 5, together with the DONE line's "identically". Overturned if v1 images should be shrunk on import.

- **Caddy (D6).** One site, `SITE_ADDRESS`, reverse-proxied to the app. On the VPS, Caddy obtains and renews its certificate and redirects HTTP to HTTPS by itself. Certificates persist in a volume. PocketBase is not routed through Caddy.

  ASSUMPTION: on-demand TLS, the Custom Domain field and its `ask` check belong to Phase 5. Rung 2: plan Phase 5 reads "Custom domain per profile via Caddy on-demand TLS", D6 calls it "a DB field + on-demand TLS", and Phase 2's DONE names no domain. Also, on-demand TLS without a Custom Domain list to check against would issue certificates for any domain pointed at the VPS. Overturned if Phase 5's spec expects Phase 2 to ship the on-demand block.

- **PocketBase.**
  - Built from a pinned release, at least 0.23, because that release brought the JS migration API, autodate fields and the superuser command used here.
  - The superuser comes from the environment and is re-applied on every start.
  - Data lives in a named volume.
  - It is published on 127.0.0.1 only, and the Operator opens the admin UI through an SSH tunnel.

  ASSUMPTION: built from the official release archive, not from a community image. Rung 5: PocketBase publishes no official image, so this adds no third-party image to trust. Overturned if the Operator prefers a maintained community image.

  ASSUMPTION (evidence blocked): the pin is the newest release the implementer knows to exist, at least 0.23; the actual newest release can't be looked up offline. Overturned by the human bumping the pin.

  ASSUMPTION: the admin UI is reachable only through an SSH tunnel. Rung 4: nothing new goes on the public internet. Overturned if the Operator wants a public admin host name, which would be one more Caddy site.

- **n8n.** v2's Compose file does not define it, start it or reach it. It keeps running as it does today (D1).

- **Base images.** `caddy:2-alpine` for Caddy, `node:22-alpine` for the app, and `alpine:3` under the PocketBase binary.

  ASSUMPTION: Node 22 LTS on Alpine. Rung 5: the smallest official Node image that sharp ships prebuilt binaries for. Overturned if sharp misbehaves on Alpine; then use `node:22-slim`.

- **Test loop (plan section 7).**
  - The Playwright webServer runs a wrapper. It starts the stack (`docker compose up --build --wait`, with the test env file and its own Compose project), runs the v1 Import against the local v1 tree, and follows the logs. On SIGTERM (Playwright's `gracefulShutdown`) it runs `docker compose down -v`.
  - baseURL stays http://localhost:4173.
  - Playwright waits on the Fixture Profile's JSON URL, which answers only once the seed has run.
  - When `PLAYWRIGHT_BASE_URL` is set, it replaces baseURL and skips the webServer, so the parity spec can be pointed at the VPS.
  - The Reveal guard spec runs in a last project, after every other spec, because it uses up the shared rate-limit window.
  - tests/dev-server.mjs is removed.

  ASSUMPTION: the seed is the v1 Import of the local v1 tree, real Destinations included, loaded into a throwaway local PocketBase. Rung 2: the plan says "same specs, same baseURL" and names the Fixture Profile as a juliafilippo_ copy. Rung 5: one import path serves both seeding and production. Overturned if Phase 0 or 1 keeps the Fixture Profile outside linkme_clone3; the seed then imports that tree too.

  ASSUMPTION: after Phase 0, v1's layout is `linkme_clone3/public/` (published, with `api/profiles/` and `images/`) plus `linkme_clone3/netlify/functions/secrets.json`. Rung 2: Phase 0 says "Move site into public/ … keep functions outside it". Overturned by Phase 0's actual layout; only `V1_SITE_DIR` and the import's two arguments change.

  ASSUMPTION: tests/dev-server.mjs is deleted once nothing calls it. Rung 2: the user's YAGNI instruction and the plan's switch to docker compose. Overturned if a v1-side server is wanted again; git can restore it.

## Testing Decisions

There is one seam: the stack's public HTTP surface at baseURL, driven by Playwright. Pages show what a Visitor sees. The `request` fixture covers Profile JSON, redirects (not followed), Reveal and multipart uploads. Tests arrange state through PocketBase's REST API on its loopback port, the same API the admin UI drives; that is set-up, not a second seam. A good test here opens a page or calls an endpoint and checks the answer, never the app's modules.

- **The oracle for "identical" is v1 itself.** The tests load the v1 Profile files and v1's own Reveal function in the test process, the way tests/dev-server.mjs loaded it. No test re-implements Tracking Codes or Geo Rules.
- **Destinations stay out of failures.** A failing assertion names the Link Id and never prints a Destination, because failing output is pasted into tickets (plan section 7).
- **The v1 Import is covered both ways.** Its happy path runs as the seed before every run. Its refusal path is one Acceptance command against a broken fixture tree, since its CLI is its interface.
- **Phase 0–1 specs run unchanged against v2**, tests/e2e/00-smoke.spec.ts included.

Specs this Phase adds:

- `tests/e2e/02-profile-parity.spec.ts`
  - For every v1 Profile file, the page's title, display name, bio, verified badge and avatar match the file, and so do its Link cards: titles, order, lock icon, background and icon.
  - The Profile JSON contains no Destination and no Geo Rule.
  - Every non-Adult Link's `url` is `{baseURL}/r/{id}`, and `/r` answers 302 to the Link's v1 Destination.
  - For every Adult Link, Reveal answers what v1's Reveal answers. This covers each kind of Tracking Code (none, digits, `geo`, junk) and, for Links with a Geo Rule, several `x-country`/`x-region` pairs.
  - An unknown Username lands on /landing.html.
  - Unknown Link Ids get 404 from both Reveal and `/r`.
  - The spec's request count stays under one minute's production rate limit, so it can run against the VPS.
- `tests/e2e/02-live-edit.spec.ts`
  - A throwaway Profile and Link created through PocketBase's API show on the page.
  - Each of these shows on the next load, with no restart: renaming the Profile, retitling a Link, reordering, adding a Link and deleting one.
  - Deleting the Profile sends the page to /landing.html.
- `tests/e2e/02-image-upload.spec.ts`
  - Committed JPG, PNG, GIF, WebP and HEIC fixtures each come back as `image/webp`, both from the URL the upload returns and in the Profile JSON.
  - Sizes are read from the browser's `naturalWidth` and `naturalHeight`: a 3000×2000 background comes back at 1080×720, a 2000×2000 avatar at 512×512, and a small image is not enlarged.
  - A JPEG tagged with EXIF orientation 6 comes back with width and height swapped.
  - Without a token the upload gets 401 and the record is unchanged.
  - A text file gets 415.
  - PocketBase itself refuses a PNG put straight into a file field.
- `tests/e2e/02-reveal-guard.spec.ts`
  - Reveal with a foreign `Origin`, or with `Sec-Fetch-Site: cross-site`, gets 403, with no Destination in the body.
  - No Reveal response carries `Access-Control-Allow-Origin`.
  - Repeated Reveal and `/r` calls reach 429 within `REVEAL_LIMIT_PER_MINUTE + 1` requests, and the 429 body holds no Destination.

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
! docker compose --env-file tests/e2e.env run --rm --no-deps -v "$PWD/tests/fixtures/v1-broken:/v1:ro" app npm run --silent import-v1 -- --site /v1/public --secrets /v1/secrets.json > "${TMPDIR:-/tmp}/import-v1-broken.log" 2>&1
grep -q 'invalid v1 file: .*broken\.json' "${TMPDIR:-/tmp}/import-v1-broken.log"
for s in 02-profile-parity 02-live-edit 02-image-upload 02-reveal-guard; do test -f "tests/e2e/$s.spec.ts" || exit 1; done
# manual: on the VPS, settle the 80/443 question in Further Notes first.
# manual: copy the repo and the v1 tree (secrets.json included) to the VPS; write .env there with SITE_ADDRESS=<v2 host>, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD; point <v2 host>'s DNS A record at the VPS.
# manual: on the VPS: docker compose up -d --build --wait
# manual: on the VPS: docker compose run --rm -v "$PWD/linkme_clone3:/v1:ro" app npm run --silent import-v1 -- --site /v1/public --secrets /v1/netlify/functions/secrets.json
# manual: from the Mac: PLAYWRIGHT_BASE_URL=https://<v2 host> npx playwright test tests/e2e/02-profile-parity.spec.ts
# manual: ssh -L 8090:127.0.0.1:8090 <vps>; edit a display name at http://localhost:8090/_/; reload https://<v2 host>/<username>; the new name shows.
./check.sh
```

## Depends on

- **Phase 0.** Provides:
  - v1's published directory `public/`, with the functions and secrets.json outside it. The app serves that directory, and the import reads secrets.json from outside it.
  - Random, unique Link Ids.
  - Every Profile file parsing, with the corrupted ones fixed. The import refuses bad data rather than repairing it.
- **Phase 1.** Provides:
  - The Mode fields in v1's Profile files.
  - The page script and index.html carrying the Mode and Escape behaviour, which v2 serves as they are.
  - The Fixture Profile with a Direct Mode Link, an Escape Mode Link and an Adult Link, which the seed imports.

## Out of Scope

- **Writing Events from `/r`, Reveal and a Page View ping, daily aggregation, and the Stats page.** Plan Phase 4.
- **Creator login, register, verify and reset; Onboarding; the Editor; owner collection rules; a public route to PocketBase's API; reserving the Usernames the app's routes use (`r`, `api`, `.netlify`, v1's file names); and D9.** Plan Phase 3. No v1 Username collides with those routes today (observed).
- **The Custom Domain field, Caddy on-demand TLS with its `ask` check, routing a host to a Profile, and Spare Domains.** Plan Phase 5. See the ASSUMPTION under Caddy.
- **Pointing ofl.ink's DNS at the VPS, keeping Netlify as cold backup, and turning v1 off.** Plan Phase 5 (Cutover).
- **The n8n Form writing into PocketBase.** v1 stays the source of truth until Cutover, and re-running the v1 Import carries its edits over. Plan Phase 3 makes n8n admin-only.
- **Replacing the page script's global localStorage Tracking Code.** That is the page script's job (Phase 1, D5). Phase 2 serves the script unchanged.
- **The real-device In-App Browser matrix.** Phase 1 and the manual RUN.md item.
- **ffmpeg, video and animated images.** D4: "ffmpeg only if video is added later".
- **Proxies (D7), a Geo Rule UI and Umami.** Bonus, after Phase 5.
- **A response cache or realtime push to open pages.** "Live instantly" means the next load, which reading PocketBase on every request already gives.
- **PocketBase backups.** Not in the plan. Until Cutover v1 is the source of truth, and the v1 Import rebuilds v2.
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
- **PARKED (needs the live VPS, floor 2): what holds ports 80 and 443 on the VPS today.**
  - Check with `ssh <vps> 'docker ps --format "{{.Names}}\t{{.Ports}}"; sudo ss -ltnp "( sport = :80 or sport = :443 )"'`.
  - If nothing holds them, v2's Caddy takes them and n8n is untouched.
  - If a proxy in front of n8n holds them, the recommended move is for v2's Caddy to take 80/443 and add n8n's host name as a second site proxied to the n8n container. n8n's container and data stay unchanged; only its front door moves. Stop the old proxy without deleting it, so restarting it rolls the change back.

  ASSUMPTION (evidence blocked): the VPS's n8n set-up may ship its own proxy on 80/443. D6's "(or Traefik)" hints at that, but nobody has looked. Overturned by the `ss` output above.
- **Where the Visitor's country comes from before Cutover.** The Visitor location module reads Cloudflare's headers. v2 sees real countries once the v2 host (and ofl.ink at Cutover) is proxied by Cloudflare with "Add visitor location headers" on. Caddy must also trust Cloudflare's address ranges (`trusted_proxies`) so that `X-Forwarded-For` carries the Visitor's IP for the rate limit. That is account and DNS work, so it is manual. Until then, every Visitor without the headers counts as US, which is v1's own fallback.

  ASSUMPTION: Cloudflare headers rather than a geo-IP database in the app. Rung 3: v1 takes location from its edge's headers, and D5 names both options. Overturned if the Operator won't proxy through Cloudflare, or if Custom Domains (Phase 5) need geo Tracking Codes without it. A geo-IP lookup then goes behind the same Visitor location function.
- **Who can upload in Phase 2.** The upload endpoint has no Creator caller until Phase 3. In Phase 2 only a superuser token gets past PocketBase's rules, so the Operator and the tests are the only uploaders.
