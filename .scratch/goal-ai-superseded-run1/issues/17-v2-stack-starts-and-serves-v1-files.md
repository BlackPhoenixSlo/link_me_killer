# 17: The v2 stack starts with one `docker compose up` and serves v1's published files, beside the dev server stand-in

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 9, 18, 19, 20, 21, 27, 32, 37, 41
Seams: the Compose config's static checks (the spec's Acceptance block). The stack's public HTTP surface at its own local port (Playwright `request`), in a second Playwright project beside the dev server stand-in.
Blocked by: 03: Only the site folder is published: `/netlify/` answers 404 and every Visitor address still works (Phase 0: v1's published directory, which the app serves, and the `/netlify/*` rule it copies)
Status: parked — needs-human: network fetch: `docker pull caddy:2-alpine && docker pull node:22-alpine && docker pull alpine:3`; `pnpm --dir app add hono @hono/node-server sharp`; `docker compose --env-file tests/e2e.env build`; and `pnpm --dir app add heic-convert && docker compose --env-file tests/e2e.env build app` only if the HEIC probe below fails.

**What to build:** The walking skeleton of v2, and the one network gate of Phase 2. Afterwards `./check.sh` starts Caddy, the app and PocketBase under Docker Compose in a throwaway test project, runs v2's first checks against it and tears it down. Every Phase 0 and Phase 1 spec keeps running on the dev server stand-in. No Profile data reaches v2 yet.

- **The stack.** Caddy, the app and PocketBase, and nothing else; n8n stays out of it.
  - Caddy serves one site, named by the environment, and reverse-proxies it to the app. Given a host name it obtains its own certificate and redirects HTTP to HTTPS; that is proved only on the VPS (ticket 31).
  - The app publishes no port.
  - PocketBase is built from a pinned official release, at least 0.23, on a small Alpine base. Its superuser comes from the environment and is re-applied on every start. It has a healthcheck on its health endpoint, keeps its data in a named volume, and is published on loopback only.
  - Caddy's certificates sit in a named volume.
  - All three restart unless stopped, and the app starts only once PocketBase is healthy.
- **The environment contract** the spec lists, with an untracked env file for the VPS. A committed test env file holds test-only values and its own Compose project name. Until ticket 29 it also puts v2 on a local port beside the dev server stand-in's.
- **The public page.** The app serves v1's published directory read-only. Any GET gets the file at that path, else index.html with 200. `/netlify/*` answers 404 with landing.html as the body.
- **The test loop** gains a second webServer: a wrapper that starts the stack with `up --build --wait` in its own Compose project and follows its logs, then runs `down -v` on SIGTERM. A second Playwright project runs v2's specs against it. No webServer is ever reused from an earlier run.
- **Offline rebuilds.** Rebuilding after a change to app source or migrations needs no network, because the PocketBase download and the app's dependency install come from the build cache. Every later ticket of this Phase depends on this.

ASSUMPTION: Phase 2's tickets add or extend the five spec files the spec names, rather than one spec file per ticket. Rung 3: Phase 0's and Phase 1's tickets each extend one spec per Phase (ticket 07's ASSUMPTION), and the spec's Acceptance checks for exactly those five files. Overturned if plan section 7's "one spec per ticket" must be read literally.

ASSUMPTION: until ticket 29, v2 runs on its own local port and in its own Playwright project beside the dev server stand-in. The Phase 0 and Phase 1 specs move across in batches (tickets 27 and 28), and ticket 29 removes the stand-in. Rung 4: additive, and every spec keeps a working server until its batch moves. Overturned if the expand-and-migrate split is dropped; tickets 27–29 then become one ticket that switches every spec at once.

ASSUMPTION: the HEIC probe below decides here whether heic-convert is added, so this ticket holds every network fetch of the Phase and ticket 24 stays offline. Rung 5. Overturned if ticket 24's committed HEIC fixture fails although the probe passed; ticket 24 then parks with `pnpm --dir app add heic-convert`.

ASSUMPTION (evidence blocked): the probe image that macOS's `sips` writes is HEVC-coded, like a phone's photo. `sips --formats` lists HEIC as writable (observed); the codec is recalled, because writing a probe file is outside what this run may write. Overturned if `file /tmp/heic-probe.heic` or a decoder reports another codec; the probe then uses a HEIC photo taken on an iPhone.

ASSUMPTION: a rebuild after a source-only change needs no network, so tickets 18–29 never need a fetch. Rung 4: otherwise every later ticket parks on the human. Overturned if Docker re-resolves a base image or the PocketBase download on every build here; the human then reruns the build command after each ticket that rebuilds.

**Order of work.** An agent may write everything above offline, stopping before the first command. The human then runs, from the repo root:

```sh
docker pull caddy:2-alpine && docker pull node:22-alpine && docker pull alpine:3
pnpm --dir app add hono @hono/node-server sharp
docker compose --env-file tests/e2e.env build
# HEIC probe: does sharp alone decode a phone-style HEIC photo inside the app image?
sips -s format heic -Z 256 "/System/Library/Desktop Pictures/iMac Blue.heic" --out /tmp/heic-probe.heic
docker compose --env-file tests/e2e.env run --rm --no-deps -v /tmp/heic-probe.heic:/probe.heic:ro app \
  node -e "require('sharp')('/probe.heic').webp().toBuffer().then(() => console.log('sharp decodes HEIC'), e => { console.error(e.message); process.exit(1) })"
# only if the probe exited non-zero:
pnpm --dir app add heic-convert && docker compose --env-file tests/e2e.env build app
./check.sh
```

- [ ] The spec's static Acceptance checks pass:
  - the Compose config is valid, and its services are exactly app, caddy and pocketbase;
  - git ignores `.env`;
  - the app publishes no port;
  - PocketBase is published on 127.0.0.1 only, with a named volume and a healthcheck;
  - Caddy's `/data` is a named volume;
  - every service restarts unless stopped.
- [ ] `up --build --wait` with the test env file returns with all three services running and PocketBase healthy. `down -v` leaves no container, volume or network of the test project behind.
- [ ] v2 serves v1's published files unchanged:
  - v1's landing page, style sheet, page script and one image come back byte for byte as they are in v1's published directory;
  - an unknown path gets index.html with 200;
  - `/netlify/functions/secrets.json` gets 404 with landing.html as its body;
  - `/secrets.json` gets index.html.
- [ ] v1's tree is mounted read-only, and a run changes nothing in it.
- [ ] Playwright never reuses a running server: `reuseExistingServer: false` for every webServer.
- [ ] After a change to an app source file only, the stack rebuilds and `./check.sh` passes with the network off.
- [ ] The HEIC probe's result, and whether heic-convert was added, is written in this ticket for ticket 24.
- [ ] Every Phase 0 and Phase 1 spec still runs on the dev server stand-in and passes.
- [ ] Playwright: adds `tests/e2e/02-profile-parity.spec.ts`, holding the static-file checks above, in the v2 project. `./check.sh` passes.
