# link_me_killer

A self-hostable **link-in-bio service for creators**. Each creator gets a public profile
at `yourdomain/{username}` with an ordered list of links. Two things make it different from
a plain Linktree clone:

- **Hidden destinations.** A link's real destination is never written into any public file.
  The page asks the server to reveal it only on the tap, behind a per-visitor rate limit.
- **In-app-browser escape.** Taps can be steered out of the Instagram / TikTok / Facebook /
  Threads in-app browsers into the device's real browser, per-link or per-profile.

It also includes a self-service editor, visit stats, custom-domain support, and an optional
one-off importer for an older static "v1" site.

## Stack

| Piece | What it is |
|---|---|
| `app/` | Node (Hono) gateway + editor UI + public profile renderer |
| `pocketbase/` | PocketBase holds data, auth and uploaded files; schema is in `pocketbase/pb_migrations/` |
| `caddy` | TLS termination and reverse proxy (`Caddyfile`); automatic HTTPS in production |
| `compose.yaml` | The three services wired together |
| `compose.vps.yaml` | Extra overlay for running behind Traefik on a shared VPS |

## Quick start (local)

```bash
cp .env.example .env     # then fill in the required values (see below)
docker compose up --build
```

Minimum you must set in `.env`:

- `SITE_ADDRESS` — Caddy's site. Use `:80` for plain local HTTP, or `https://yourdomain` in production.
- `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD` — the PocketBase admin, upserted on every start.
- `PRIMARY_HOSTS` — your own hostname(s), comma-separated, served without a database lookup.

Every variable, including the production-only PROXY-protocol, Cloudflare, and custom-domain
settings, is documented inline in [`.env.example`](.env.example).

The PocketBase admin UI is published on `127.0.0.1:8090` only; reach it through an SSH tunnel
in production.

## Production

[`RUN.md`](RUN.md) is the full operator runbook: the real-device escape test matrix, the
cutover steps, Cloudflare and PROXY-protocol wiring, and custom-domain setup. Read
[`CONTEXT.md`](CONTEXT.md) first for the domain model (Creator, Operator, Visitor, Profile,
Link, Mode) and [`docs/`](docs/) for the specs and architecture decisions.

## Notes for self-hosters

- **Build changes from the original.** The PocketBase image downloads its pinned release
  (`PB_VERSION`, default 0.40.4) from GitHub at build time, and the app image installs its
  npm dependencies at build time. The original project built both fully offline from vendored
  artifacts; those vendored files are not redistributed here.
- `.env` and all real secrets are gitignored. Do not commit them.
- Tests run against a throwaway stack; see `tests/` and `playwright.config.ts`.

## License

MIT. See [`LICENSE`](LICENSE). The bundled PocketBase binary and npm dependencies carry their
own licenses.
