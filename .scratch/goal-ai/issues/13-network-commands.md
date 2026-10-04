# 13: The Operator's network commands fetch the stack's packages and images

Spec: docs/spec/phase-02-vps-foundation.md
Covers: none directly. It unblocks every story that needs the running stack (spec, Implementation Decisions: Offline build; Further Notes: Network steps for the human)
Seams: `app/package.json` and its lockfile, `vendor/`, `docker image ls`, the two Dockerfiles, and a built test stack
Blocked by: 12: The v2 stack is declared and its Compose contract checks pass offline
Status: ready-for-agent

**Done by the Operator 2026-10-04 (plan §11).** The network commands have run:
- `app/package.json` lists hono 4.13.13, @hono/node-server 2.1.3 and sharp 0.35.5, with its lockfile `app/pnpm-lock.yaml` (commit 2c6b95c, which touched no root manifest or lockfile). pnpm's `supportedArchitectures` in it put sharp's linuxmusl-arm64 and linuxmusl-x64 binaries in `app/node_modules` (observed: `ls app/node_modules/.pnpm | grep sharp-linuxmusl`).
- `alpine:3` and `axllent/mailpit` are pulled; `caddy:2-alpine` and `node:22-alpine` were already local (observed: `docker image ls`, 2026-10-04).
- `vendor/` (git-ignored) holds `pocketbase_0.40.4_linux_arm64.zip` for this Mac and `pocketbase_0.40.4_linux_amd64.zip` for the VPS. PocketBase is pinned at 0.40.4.

**What to build:** On top of 12's declarations, prove the stack builds offline. Plan §11 makes this binding (rung 2):
- `docker compose --env-file tests/e2e.env build` makes no network request. If it would, this ticket parks with the build output and the command rather than fetch.
- The PocketBase Dockerfile COPYs the pinned zip for its architecture from `vendor/` (`pocketbase_0.40.4_linux_arm64.zip` here, `pocketbase_0.40.4_linux_amd64.zip` on the VPS). It never curls and never `ADD`s a URL.
- The app Dockerfile COPYs `app/`, `node_modules` included, and runs no `pnpm install`.
- The three base images come from the local image store and are never pulled.

No package is added and nothing is fetched. 12's manifest checkbox ("exists with no dependencies") is overtaken: the Operator's `pnpm --dir app add` wrote the dependencies, and nobody edits the manifest by hand.

ASSUMPTION (recalled, not observed): BuildKit fetches nothing for a `FROM` image that is already in the local image store, unless `--pull` or a `# syntax=` frontend line asks for it, so neither Dockerfile carries a `# syntax=` line. Overturned if the build output shows a registry resolve with the images local; this ticket then parks with that output.

Parked future command, run only if 21's HEIC case fails with sharp alone (21 parks on it, not this ticket):

```sh
pnpm --dir app add heic-convert
docker compose --env-file tests/e2e.env build
```

ASSUMPTION: the heic-convert line is listed here but runs only when 21 shows it is needed, so this ticket closes without it (the spec's condition; rung 5, YAGNI). Overturned if the human prefers one network session. Running it now costs only a dependency that may go unused.

- [x] The app has its own package manifest listing hono, @hono/node-server and sharp, and its own lockfile. The repo root's manifest and lockfile are unchanged.
- [x] `docker images` lists `alpine:3`, `caddy:2-alpine` and `node:22-alpine`.
- [x] `vendor/` is git-ignored and holds `pocketbase_0.40.4_linux_arm64.zip` and `pocketbase_0.40.4_linux_amd64.zip`.
- [ ] Neither Dockerfile fetches: `pocketbase/Dockerfile` and `app/Dockerfile` hold no `curl`, `wget`, `ADD <url>`, `apk add`, `pnpm install`, `npm install`, `npm ci` or `# syntax=` line.
- [ ] The test stack's build exits 0 with no network request, and an immediate second build exits 0 from cache.
- [x] No other package is added. heic-convert waits on 21.
