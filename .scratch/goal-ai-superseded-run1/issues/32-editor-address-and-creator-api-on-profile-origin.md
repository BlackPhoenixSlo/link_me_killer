# 32: The Editor's address and the Creator's PocketBase paths answer on the Profile origin, and no other part of PocketBase does

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: no user story of its own. It is the groundwork every later screen calls through: the spec's Editor route and PocketBase API proxy (Owns, Interfaces, Contracts) and the last check of behaviour 10.
Seams: the running v2 stack at Playwright's baseURL, through Playwright `request`. PocketBase's REST API on its loopback port, called as the superuser, arranges a Creator account, as Phase 2's tests arrange state.
Blocked by: 18: Every PocketBase collection comes from versioned migrations… (the users, profiles and links collections whose paths are forwarded); 19: Every v1 Profile opens on v2 from PocketBase… (the Profile catch-all that the Editor's prefix goes before, and the app's own Profile JSON route, which must not change); 23: An avatar uploaded through the app is stored as WebP… (the app's upload and file routes, which must not change); 29: `./check.sh` runs only against v2 at localhost:4173… (the test loop this Phase's spec runs in)
Status: ready-for-agent

**What to build:** Prefactoring for the Phase. The Editor lives on the same origin as the Profiles and reaches PocketBase without opening CORS. The app gains two things and changes nothing else:

- Everything under `/edit` serves the Editor client, matched before the Profile catch-all. A placeholder page is enough until ticket 33 puts the log-in screen there.
- An allow-list proxy. PocketBase's REST paths for the three collections the Editor calls (users, profiles and links, record and auth paths alike) are forwarded to PocketBase with method, query, headers and body unchanged, and PocketBase's answer comes back as it is.

Every other path under `/api/` keeps Phase 2's answer: the app's own Profile JSON, file and upload routes, or 404. So the superuser login, the invite list, realtime, the admin UI and PocketBase's own file route are never reachable from the public origin. The app forwards and PocketBase decides; the app holds no login, session or ownership logic (ADR 0002).

Superuser steps use the credentials Phase 2's test env file already holds (observed: docs/spec/phase-02-vps-foundation.md:200, :204, :297), so the seed needs no new superuser.

- [ ] A Creator account that the superuser created on the loopback port logs in with its password at the public origin. With the token it gets back, it reads its own account there. A wrong password gets PocketBase's own refusal, passed through unchanged.
- [ ] A list call's filter, sort and expand reach PocketBase through the proxy.
- [ ] At the public origin, each of these answers 404:
  - the superuser login (`_superusers` auth with password);
  - the invite list's records, whether or not that collection exists yet;
  - realtime.
- [ ] The app's own Profile JSON, file and upload routes answer as before. Every Profile in the seed still opens at `/{username}`.
- [ ] `/edit` and a path below it serve the Editor client, not the Profile catch-all's answer.
- [ ] Each run uses Creator emails and Usernames unique to the run (a timestamp suffix).
- [ ] Playwright: adds `tests/e2e/03-auth-and-editor.spec.ts`. `./check.sh` passes.
