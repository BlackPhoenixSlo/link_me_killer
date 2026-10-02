# 19: Every v1 Profile opens on v2 from PocketBase, seeded by the v1 Import, with no Destination in its page or data

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 1, 8, 10, 11, 12, 22, 42
Seams: the stack's public HTTP surface. Playwright `page` covers each Profile page, and `request` covers Profile JSON and image files. Both are compared against v1's own Profile files and images, read in the test process. The v1 Import CLI runs through `docker compose run` as the seed.
Blocked by: 17: The v2 stack starts with one `docker compose up`…; 18: Every PocketBase collection comes from versioned migrations…; 02: weiwei and jaka7q open as real Profiles (Phase 0: every Profile file parses); 04: Every Link gets its own random 12-digit Link Id that the n8n Form keeps… (Phase 0: unique Link Ids to upsert by); 07: The Fixture Profile and a Mode-less fixture open locally… (Phase 1: the fixture Profiles the seed imports); 10: Each Link can carry its own Mode… (Phase 1: the Profile and Link Mode fields the import copies)
Status: ready-for-agent

**What to build:** The first full read path. The v1 Import copies v1 into PocketBase, and v1's page script, served unchanged, draws every Profile from the app instead of a static file.

- **The v1 Import, happy path.** It runs in the app image through `docker compose run`, with the v1 tree mounted read-only for that one run. It reads:
  - the Profile files of the v1 site and of each extra profiles directory;
  - every secrets file;
  - every image a Profile file names, resolved against the site.

  It copies the data as v1 shows it:
  - The Username is the file's name.
  - A non-Adult Link's Destination is its `url`, and a relative `url` is stored root-relative.
  - An Adult Link's Destination is its secrets entry.
  - Link Ids, order, titles, the Adult and tracking flags, default Tracking Codes, Geo Rules and Modes are copied as they are.
  - Images are copied byte for byte.

  It upserts by Username and Link Id, with v1 winning, deletes nothing, and prints a summary. Refusals, warnings and re-runs are tickets 25 and 26.
- **The seed.** After the stack is up, the test wrapper imports the local v1 tree, Phase 1's fixture Profiles, and a new test-only secrets file. That file holds the Fixture Profile's Adult Link Destination, an `example.com` address. Playwright starts only once the Fixture Profile's JSON answers.
- **Profile JSON** at v1's own path, in the shape under the spec's Contracts. Usernames are matched lower-cased. Every request reads PocketBase. It is not cached.
  - It carries the effective Mode: the Link's own, else the Profile's, else Escape Mode.
  - A non-Adult Link outside Deeplink Mode gets `url` `{origin}/r/{Link Id}`.
  - An Adult Link and a Deeplink Mode Link get an empty `url`.
  - It never holds a Destination, a Geo Rule, the owner or a record id field.
- **Image files** are served only while they are a record's current avatar, icon or background, and are cached for good.

- [ ] The seed exits 0 and prints its summary of Profiles, Links, images and warnings.
- [ ] For every v1 Profile file, the page on v2 shows the file's display name, bio, verified badge and avatar. Its cards are exactly the file's Links, in order and no others, with their titles, lock icons, icons and backgrounds. Every image is the same bytes as v1's file.
- [ ] Profile JSON matches the spec's Contracts:
  - the effective Mode on the Profile and on each Link;
  - every non-Adult Link outside Deeplink Mode has `url` `{baseURL}/r/{id}`;
  - every Adult Link and every Deeplink Mode Link has an empty `url`;
  - no Destination, Geo Rule, owner or record id field;
  - `Cache-Control: public, max-age=0, must-revalidate`.
- [ ] No seeded Destination appears in any Profile JSON, in any Profile page's HTML, or in the answers for `/netlify/functions/secrets.json` (404) and `/secrets.json`.
- [ ] An unknown Username lands on /landing.html, and its Profile JSON answers 404 `{"error":"Profile not found"}`.
- [ ] `/Jaka` shows the same Profile as `/jaka`.
- [ ] Image URLs answer with `Cache-Control: public, max-age=31536000, immutable`. A file name that is not a record's current image gets 404.
- [ ] No secrets file is mounted into the running app; only the import's one-off run sees one.
- [ ] A failing assertion about a Link names its Link Id and never prints a Destination.
- [ ] A screenshot of one real Profile and of the Fixture Profile on v2 is saved under `.scratch/goal-ai/shots/` for the human to glance at.
- [ ] Playwright: extends `tests/e2e/02-profile-parity.spec.ts`. `./check.sh` passes.
