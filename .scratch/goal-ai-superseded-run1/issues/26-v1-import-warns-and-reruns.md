# 26: The v1 Import warns about what v1 already shows broken, and a re-run adds no duplicates and names what v1 dropped

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 23, 25
Seams: the v1 Import CLI, run through `docker compose run` against the running test stack. PocketBase's REST API is used as the superuser to arrange records and read state. The stack's public HTTP surface (Playwright `page` and `request`) shows what a Visitor gets. The spec runs in the last Playwright project.
Blocked by: 25: The v1 Import refuses a broken v1 tree…; 20: A Click on v2 ends at the same Destination as on v1… (Reveal's 404 for an Adult Link without a Destination)
Status: ready-for-agent

**What to build:** The import carries v1's broken references over the way v1 shows them, and warns about each one:

- a missing image file is imported as no image;
- an Adult Link with no secrets entry is imported with no Destination, so Reveal answers 404 for it.

The import can be re-run until Cutover, so that edits made through the n8n Form reach v2:

- It upserts by Username and Link Id, and v1 wins.
- It deletes nothing. Instead it names, in one `stale in v2: <username>[/<Link Id>]` line each, every Profile, and every Link of an imported Profile, that PocketBase holds and the v1 files no longer do.

- [ ] A warnings fixture tree holds a Profile that names a missing image and an Adult Link with no secrets entry. Importing it:
  - exits 0 and warns about both;
  - the page shows that Profile with no image in that place;
  - Reveal answers 404 for that Link.
- [ ] Importing the seed trees again exits 0, and leaves the Profile and Link counts of the seeded Usernames unchanged.
- [ ] A seeded Link's title, changed through the API, is back to v1's after the re-run.
- [ ] A Link that the test added through the API to a seeded Profile is named in a `stale in v2` warning and still exists afterwards. The test then deletes it.
- [ ] A Profile that PocketBase holds and no imported tree has is named in a `stale in v2: <username>` warning and still exists afterwards.
- [ ] No warning line prints a Destination.
- [ ] Playwright: extends `tests/e2e/02-v1-import.spec.ts`. `./check.sh` passes.
