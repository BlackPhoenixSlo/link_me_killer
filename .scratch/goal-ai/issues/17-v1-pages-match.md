# 17: Every v1 Profile page on v2 matches the v1 Snapshot card for card

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 1, 7, 8, 9, 10, 12, 14, 15, 16, 38, 40, 41, 42, 43, 44, 47, 48, 50, 54, 57
Seams: the running v2 stack's public HTTP surface at baseURL through `./check.sh`: pages for what a Visitor sees, and the `request` fixture for Profile JSON. The v1 Snapshot's Profile files, read at test time, are the oracle
Blocked by: 16: The Fixture Profile is served by v2's stack and every Phase 0 and Phase 1 spec passes on it
Status: claimed 20261004T191309Z 2026-10-04T22:34:04Z

**What to build:** `./check.sh` now seeds the test stack with the whole v1 Snapshot first and the Fixture site last, so every v1 Profile is served by v2 in the loop. On a fresh clone with no v1 Snapshot, the seed takes the Fixture site alone and every v1 case skips with the reason `v1 Snapshot absent`.

**Pages.** Take every v1 Profile file that parses as it is. A Visitor on v2 sees what v1 shows:
- the page title, display name, bio and verified badge;
- the avatar, only where v1's image file exists, with the same bytes;
- exactly the file's Links by position: titles, lock icons, icon and background bytes, and no others.

**Profile JSON.**
- It carries no Destination, Geo Rule or private v1 key.
- Every Link Id is 12 random lower-case letters or digits. It equals no v1 Link Id or secrets key, and does not contain its Username.
- `url` is `{baseURL}/r/{id}` for a non-Adult Link and empty for an Adult Link.
- Both Mode fields read Escape Mode.
- Each card's default Tracking Code equals its file's, verbatim, and is absent where the file has none. The page uses it when the address carries no code.

**Repairs, seen over HTTP.**
- `/weiwei` and `/weiWEi` show the repaired file's display name and cards.
- jaka7q's display name is `jaka7q`.
- juliafilippo_, jaka6q and jaka7q show every card, each with a distinct Link Id.
- The six Profiles whose avatar file is missing serve an empty avatar.
- The four non-Adult Links that had a secrets entry, weiwei's among them, reach their file's url through `/r`.

**Paths and leaks.**
- An unknown Username lands on the landing page.
- `/Jaka`, `/JakaJaka` and `/weiWEi` serve the same JSON as their lower-case twins.
- No Destination appears in any Profile JSON, in any page's HTML, in `/netlify/functions/secrets.json` (404) or in `/secrets.json` (the catch-all).

Destinations are compared only as booleans, so a failure names a Username and card position, never a Destination.

Every run also saves a phone-sized screenshot of a v1 Profile page served by v2, for the human to compare with v1.

ASSUMPTION: Phase 2's screenshot is `.scratch/goal_ai/shots/02-vps-foundation.png`, showing `juliafilippo_` served by v2. Plan section 7 asks for a shot from any ticket that touches UI, and plan-review's Not yet specified notes that Phase 2 saves none. The path follows Phases 0 and 1, and that shots directory is already git-ignored (rung 3). Overturned if the Operator does not want a real Creator's page captured. The shot is then of `/fixture`.

ASSUMPTION: the import spec starts here, holding only its repair checks, and runs in the last project from the start. Its other cases arrive in 19 (rung 5: the spec puts the repair checks in that file). Overturned if the build run wants each spec file born whole. The repair checks then move to 19.

- [ ] With the v1 Snapshot present, the parity spec's page, Profile JSON, path and leak cases pass for every v1 Profile file that parses as it is. weiwei is left to the repair checks.
- [ ] The import spec's repair checks pass over HTTP: weiwei and weiWEi, jaka7q, the three Profiles with duplicate v1 ids, the six missing avatars, and the four non-Adult Links with a secrets entry.
- [ ] With no v1 Snapshot, as in a fresh local clone of this repo, `./check.sh` passes with the seed and every v1 case skipped as `v1 Snapshot absent`.
- [ ] `.scratch/goal_ai/shots/02-vps-foundation.png` exists and is not empty after every run. Manual: it looks like v1's `juliafilippo_` page.
- [ ] No assertion message or diff can print a Destination.
- [ ] The v1 Snapshot's git status is clean after the run.
