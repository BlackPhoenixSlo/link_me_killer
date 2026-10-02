# 13: The Operator's network commands fetch the stack's packages and images

Spec: docs/spec/phase-02-vps-foundation.md
Covers: none directly. It unblocks every story that needs the running stack (spec, Further Notes: Network steps for the human)
Seams: the human's terminal; afterwards the app's package manifest and lockfile, `docker images`, and a built test stack
Blocked by: 12: The v2 stack is declared and its Compose contract checks pass offline
Status: parked — network: `mkdir -p app && (cd app && pnpm init)` (only if app/package.json is absent); `pnpm --dir app add hono @hono/node-server sharp`; `docker pull alpine:3`; `docker compose --env-file tests/e2e.env build`; later, and only if 21's HEIC case fails with sharp alone: `pnpm --dir app add heic-convert` then the same build line again

**What to build:** Nothing for an agent. Floor 2 keeps every network fetch with the human, and plan section 9 says the Operator runs these when asked. From the repo root, in this order:

```sh
test -f app/package.json || (mkdir -p app && (cd app && pnpm init))   # only if absent; no network
pnpm --dir app add hono @hono/node-server sharp
docker pull alpine:3                                  # caddy:2-alpine and node:22-alpine are already local
docker compose --env-file tests/e2e.env build         # downloads the pinned PocketBase release and the app's packages
```

If the app's manifest is still absent (12 writes it), the first line creates it. Before the build, the human may raise the PocketBase version that 12 pinned to the newest release, at least 0.23.

Later, and only if 21's HEIC case fails with sharp alone, 21 parks on:

```sh
pnpm --dir app add heic-convert
docker compose --env-file tests/e2e.env build
```

After these, every rebuild that `./check.sh` triggers comes from cache with no network. If one ever wants the network, the ticket that hit it parks with the build output and the command. No agent fetches.

ASSUMPTION: the heic-convert line is listed here but runs only when 21 shows it is needed, so this ticket closes without it (the spec's condition; rung 5, YAGNI). Overturned if the human prefers one network session. Running it now costs only a dependency that may go unused.

- [ ] The app has its own package manifest listing hono, @hono/node-server and sharp, and its own lockfile. The repo root's manifest and lockfile are unchanged.
- [ ] `docker images` lists `alpine:3`, `caddy:2-alpine` and `node:22-alpine`.
- [ ] The test stack's build exits 0, and an immediate second build exits 0 from cache.
- [ ] No other package is added. heic-convert waits on 21.
