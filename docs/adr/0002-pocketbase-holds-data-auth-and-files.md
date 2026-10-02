# PocketBase holds v2's data, logins and files; collection rules enforce ownership

v2 needs four things: a store for Profiles, Links, Destinations and Events; Creator login with email verification and password reset; storage for avatars and background images; and an admin screen for the Operator. One PocketBase container (SQLite, auth, file storage, admin UI, REST and realtime) covers all four. It replaces both GitHub-as-database and secrets.json, so an edit is live as soon as it is saved, with no commit and no build in between. Auth is never hand-rolled. A Creator may touch only their own Profile and Links, and PocketBase collection rules enforce this against the signed-in Creator (`@request.auth.id`); the Node app does not.

## Considered Options

- **Hand-written auth and ownership checks in the Node app.** Rejected outright by D2 ("never hand-roll auth").

## Consequences

- Collection rules are the security boundary. A public read rule on a record that holds a Destination would publish it through PocketBase's own REST API (see ADR 0004).
- PocketBase becomes the system of record. The v1 Import reads v1's Profile files and secrets.json, and is re-runnable until Cutover, with v1 winning.
