# 12: The v2 stack is declared and its Compose contract checks pass offline

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 22, 24, 26, 27, 28, 53, 56
Seams: the spec's Acceptance commands that resolve the Compose file with the committed test env (nothing is built or pulled); `git check-ignore`
Blocked by: 01: The test loop serves the Page Copy
Status: claimed 20261004T191309Z 2026-10-04T21:02:20Z

**What to build:** Before anything is downloaded, the repo declares the whole shape of v2. Resolving the Compose file with the committed test env shows three services, Caddy, the app and PocketBase, and nothing else. n8n is not one of them. It also shows:
- **The app** publishes no port. It is built from the app directory alone, so the v1 Snapshot can never be baked into it, and it mounts nothing from the v1 Snapshot.
- **PocketBase** is published on loopback only. It keeps its data in a named volume at the data directory the image starts it with, and it has a health check that the app waits on.
- **Caddy** keeps its certificates in a named volume. It serves one site, the site address, proxied to the app. PocketBase is not routed through it.
- **Every service** restarts unless stopped.

The environment contract is written down with the spec's defaults: the site address, the HTTP and HTTPS ports, PocketBase's loopback port, the superuser email and password (both required) and the Reveal limit. On the VPS these live in an untracked `.env`, which is now git-ignored. The committed test env holds test-only values: its own Compose project name, the baseURL's port, a PocketBase port that clashes with no other local stack, and the test Reveal limit.

The two images are described here but not built; 13 builds them. Plan §11's offline build contract is binding on both Dockerfiles (rung 2, 2026-10-04): `docker compose build` makes no network request, and if it would, the ticket parks rather than fetch.
- **The app image** is on the Node 22 Alpine base that is already local, and carries the Page Copy. It COPYs `app/`, `node_modules` included, and runs no `pnpm install` (plan §11). The app's manifest and lockfile already exist, written by the Operator's `pnpm --dir app add` on 2026-10-04 (hono 4.13.13, @hono/node-server 2.1.3, sharp 0.35.5), and this ticket does not touch them.
- **The PocketBase image** is on `alpine:3` and uses the official release pinned at 0.40.4 (plan §11). It COPYs the archive from the git-ignored `vendor/` and never curls or adds a URL: `pocketbase_0.40.4_linux_arm64.zip` on this Mac, `pocketbase_0.40.4_linux_amd64.zip` on the VPS. It picks the archive for the architecture it is built on, so it builds on both. Migrations are copied in, and the superuser is upserted from the environment on every start.

ASSUMPTION: this ticket covers declarations only, one layer. Nothing can run before 13's network commands, and the invocation keeps offline work ready-for-agent (rung 4: nothing here is irreversible). Overturned if the Operator has already run the network commands. This ticket then folds into 15. The Operator ran them on 2026-10-04, but plan §11's build order keeps 12 as its own step before 13 (rung 2), so it does not fold.

The PocketBase pin is 0.40.4, set by the Operator (plan §11, 2026-10-04; rung 2). The earlier ASSUMPTION that the implementer picks the newest release it can name offline is overturned by that pin.

- [ ] The spec's Acceptance lines that resolve the Compose file pass offline:
  - the config is valid;
  - the services are exactly app, caddy and pocketbase;
  - the JSON predicate holds: no app port, the app built from the app directory, no v1 Snapshot mount and only read-only binds on the app, PocketBase on loopback only with its data volume at the checked path, Caddy's data volume, `unless-stopped` on all three, and a PocketBase health check.
- [ ] `.env` is git-ignored, and no `.env` is created.
- [ ] The committed test env sets the port 4173, the Reveal limit 600, a PocketBase port and a Compose project name of its own. It holds no real credential.
- [ ] The app's manifest exists with no dependencies, and no lockfile is written by hand. Overtaken 2026-10-04 (plan §11): the manifest and lockfile are the Operator's, with their dependencies, and are not edited here.
- [ ] Nothing here pulls an image, builds or installs a package, and nothing reads the v1 Snapshot.
- [ ] `./check.sh` still passes on the Dev-Server Stand-in, unchanged.
