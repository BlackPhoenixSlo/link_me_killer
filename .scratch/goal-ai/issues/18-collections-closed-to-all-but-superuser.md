# 18: Every PocketBase collection comes from versioned migrations and answers no one but a superuser

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 13, 28, 29, 31, 35
Seams: PocketBase's REST API on its loopback port (Playwright `request`), called as the superuser to arrange records and with no token for the probes.
Blocked by: 17: The v2 stack starts with one `docker compose up`…
Status: ready-for-agent

**What to build:** PocketBase starts with the spec's four collections already in place: users, profiles, links and events. Versioned migrations in the repo create them, and nothing else does.

- Every rule of every collection is superuser-only, users sign-up included, so no record can be read or created from outside before Phase 3.
- A Link created without a Link Id gets a random one, unrelated to its Profile's Username.
- Image fields take WebP only, so every stored image is WebP whichever way it arrives.
- The events collection exists for Phase 4, and nothing writes to it.

The app does not read PocketBase yet.

- [ ] A fresh stack, straight after `down -v`, holds exactly the collections, fields and constraints of the spec's Schema, all of them from migrations. Nothing is set up by hand or in the admin UI. Read back through the superuser API, it shows:
  - the Username pattern and uniqueness;
  - a unique Link Id;
  - Links deleted with their Profile;
  - the Mode choices;
  - WebP-only image fields.
- [ ] A Link that the superuser creates without a Link Id gets 12 random characters from [a-z0-9]. The id does not contain its Profile's Username, and two such Links get different ids.
- [ ] The superuser creates a Profile and a Link that holds a Destination. Then each of these is refused, and no response body holds that Destination:
  - an anonymous list and view of profiles;
  - an anonymous list and view of links;
  - an anonymous create of a users record.
- [ ] The events collection exists with the spec's fields and holds no record.
- [ ] PocketBase itself refuses a PNG that the superuser puts straight into an image field, and accepts a WebP.
- [ ] Playwright: adds `tests/e2e/02-live-edit.spec.ts` (the anonymous probes, the Link Id and the events checks) and `tests/e2e/02-image-upload.spec.ts` (PocketBase refusing a PNG), both in the v2 project. `./check.sh` passes.
