# 20: A PocketBase admin edit shows on the next page load while PocketBase's API stays closed

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 14, 29, 30, 31, 33, 34
Seams: PocketBase's REST API on its loopback port, called as the admin UI calls it, to arrange state and to make anonymous calls; the running stack's public HTTP surface at baseURL through `./check.sh`, to see each edit
Blocked by: 16: The Fixture Profile is served by v2's stack and every Phase 0 and Phase 1 spec passes on it
Status: done

**What to build:** An edit the Operator makes in PocketBase's admin UI shows on the next page load, with no build and no restart:
- a Profile created with a Link shows on its page;
- renaming the Profile, retitling a Link, reordering Links, adding a Link and deleting one each show on the next load;
- deleting the Profile sends its page to the landing page;
- setting the Profile's Mode and a Link's Mode to each of Direct, Escape and Deeplink Mode shows as the effective Mode in the Profile JSON, and a Deeplink Mode Link's `url` is empty.

PocketBase gains the events collection through a versioned migration. It has D5's fields, ready for Phase 4: Profile, Link (empty for a Page View), kind (Page View or Click), country, In-App Browser and created time. Nothing writes to it in this Phase.

Every collection's rules stay superuser-only, so every anonymous call to PocketBase is refused: listing and viewing profiles, links and events, and creating a users record (sign-up stays closed until Phase 3). No response body to any of those holds a Destination. PocketBase's own auth is the only auth in v2, and the app has no login or ownership code.

The live-edit spec drives the edits through PocketBase's API rather than its admin UI, and cleans up its throwaway Profile.

- [ ] The live-edit spec passes under `./check.sh`.
- [ ] The events collection exists with the fields above, was created only by a migration, and holds no record after a full run.
- [ ] Every anonymous call listed above is refused, and no response body holds a Destination.
