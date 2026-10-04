# 15: The v1 Import writes the Fixture Profile into PocketBase on a running test stack

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 22, 29, 37, 44, 53
Seams: the v1 Import CLI through `docker compose run`, as the Operator runs it, observed through its output and exit code; PocketBase's REST API on its loopback port, as the superuser, to inspect what was written. `./check.sh` still runs on the Dev-Server Stand-in
Blocked by: 13: The Operator's network commands fetch the stack's packages and images, 14: The v1 Import repairs or refuses every v1 file before it writes anything
Status: claimed 20261004T191309Z 2026-10-04T21:33:22Z

**What to build:** The test stack comes up healthy from one Compose command with the committed test env. PocketBase starts with its superuser upserted from the environment. Its versioned migrations create:
- the profiles collection;
- the links collection;
- the users collection, with sign-up closed.

They follow the spec's Schema:
- every rule is superuser-only;
- a Username is unique and lower-case;
- each Link Id is 12 random lower-case letters or digits, separate from the record id;
- file fields take WebP only, up to 5 MB;
- a Destination must be an absolute http(s) URL or a root-relative path.

The app starts behind Caddy. It serves its Visitor routes from 16.

The v1 Import gains its write half. After 14's validation, it writes as the superuser:
- each Profile, with its Mode;
- each Link, with its private v1 key, its Destination, Geo Rule and default Tracking Code, and a fresh Link Id;
- every image, copied byte for byte.

A run ends with exit 0 and a summary count of Profiles, Links, images and warnings. A PocketBase error while writing gives exit 2. The write phase prints only fixed reasons after `write failed:`, never a PocketBase error body (it can hold a Destination). The import runs inside the app image through `docker compose run`, with its site mounted read-only for that run only. The Fixture site is mounted the way the seed will mount it: the fixtures folder, with the Page Copy's stock icons as its images, read-only.

ASSUMPTION: the stack and the import's write half are split from serving Visitors (16) so each ticket fits one fresh context window. This one is checked through the Operator's two doors while `./check.sh` stays on the stand-in (rung 3: Phase 0 kept the loop green at every ticket boundary; rung 5). Overturned if the build run prefers one ticket. 15 and 16 then merge, with the same end state.

ASSUMPTION: Links are only created here. Matching on re-runs, and leaving v2-only fields alone, come in 19 (rung 5). Each test stack starts empty, so the seed never re-runs before 19. Overturned if the seed must run twice on one stack before 19.

- [ ] Brought up by hand with the test env, the stack reports healthy. As the superuser, PocketBase's API shows the three collections with the fields and rules the spec's Schema gives, and an anonymous list of profiles is refused.
- [ ] The import, run through `docker compose run` against the Fixture site, exits 0. It prints the three `dropped:` lines and a summary count.
- [ ] As the superuser, PocketBase's API shows:
  - the Fixture Profile with its file's Mode;
  - four Links in file order, each with a 12-character Link Id unlike its v1 id;
  - the Adult Link's Destination and Geo Rule from the Test Secrets and the file;
  - each non-Adult Link's own url as its Destination;
  - every image with the stock icon's bytes.

  Destinations are compared only as booleans.
- [ ] PocketBase refuses a Destination such as `javascript:…` or `//host` written through its API.
- [ ] Nothing the import prints contains a Test Secrets value. After the run, the app container mounts no site.
- [ ] The stack is then taken down with its data, and `./check.sh` still passes on the stand-in.
- [ ] No build here fetches from the network. If the app's manifest or lockfile must change, the ticket parks on 13's install and build lines.
