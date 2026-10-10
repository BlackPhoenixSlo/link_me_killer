# link_me_killer

A self-hostable **link-in-bio service for creators** who send Instagram and TikTok traffic to their pages. Each creator
signs up, claims a username and gets a public profile at `yourdomain/{username}` with an ordered list of links. A link's
real destination is never written into any public file: the page asks the server for it only on the tap, behind a
per-visitor rate limit. Taps can be steered out of the Instagram, TikTok, Facebook and Threads in-app browsers into the
phone's real browser, per link or per profile. It comes with a self-service editor, visit and click stats, and creators'
own custom domains with automatic HTTPS.

**Deploy in one line**, as root on a fresh Docker VPS, with your domain filled in ([details](#deploy-on-a-vps)):

```sh
HTTPS_PORT=443 HTTP_PORT=80 DOMAIN=links.example.com bash -c 'curl -fsSLo /tmp/install.sh https://raw.githubusercontent.com/BlackPhoenixSlo/link_me_killer/master/deploy/install.sh && bash /tmp/install.sh'
```

## Deploy on a VPS

You need a Docker VPS (Hostinger's Ubuntu 24.04 + Docker template works as is), a DNS `A` record for
your hostname pointing at it, and ports 80 and 443 open. Run the line above as root. It clones the repo into `/opt/oflink`,
writes `/opt/oflink/.env` with a fresh PocketBase admin password, starts the stack and waits until
`https://DOMAIN/internal/healthz` answers. Then:

- Sign up at `https://DOMAIN/edit/signup`. You are signed in at once, no email confirmation required.
- The PocketBase admin login is in `/opt/oflink/.env` (`grep PB_SUPERUSER /opt/oflink/.env`). The admin UI listens on the
  box's `127.0.0.1:8090` only: `ssh -L 8090:127.0.0.1:8090 root@<vps-ip>`, then open `http://127.0.0.1:8090/_/`.
- Email is optional. To send verification and password-reset emails, set SMTP under Settings -> Mail settings in the
  PocketBase admin.
- **Update** by re-running the same line: it pulls, keeps `.env` and your data, and rebuilds.

**No domain yet?** Use the hostname your provider gave the VPS, which already points at it: `DOMAIN=$(hostname -f)`.

**Ports 80/443 taken** (by nginx or another app)? Name two free ports, e.g. `HTTPS_PORT=8443 HTTP_PORT=8081`. Let's
Encrypt only reaches ports 80 and 443, so the site is then served over plain HTTP at `http://DOMAIN:8081`: good for a trial,
not for real traffic (no HTTPS, no custom domains). `ss -Hltn` lists the ports in use.

**Traefik detected.** When a Traefik container already owns 80/443, the same line finds it and routes your domain through
it: with Docker labels (`compose.traefik.yaml`) when its Docker provider is on, else with a file in its file provider
directory. Traefik terminates TLS with its own certificate resolver; our Caddy serves plain HTTP behind it. If detection
cannot tell, name the parts in front of the line: `TRAEFIK_ENTRYPOINT=websecure TRAEFIK_RESOLVER=letsencrypt
TRAEFIK_NETWORK=traefik`. One consequence: creators' self-service custom domains get their certificates from our Caddy on
demand, so behind Traefik a custom domain is served only once you add a Traefik route for it. On a box where our Caddy owns
80/443, they work with no extra step.

Other inputs: `PB_SUPERUSER_EMAIL` (default `admin@DOMAIN`), `REF` (branch or tag, default `master`), `SKIP_DNS_CHECK=1`.
Run `bash deploy/install.test.sh` to check the installer itself.

### By hand

```sh
git clone https://github.com/BlackPhoenixSlo/link_me_killer.git /opt/oflink && cd /opt/oflink
cp .env.example .env && chmod 600 .env
```

Fill in `.env` (every variable is explained inline in [`.env.example`](.env.example)):

| Variable | Value |
|---|---|
| `SITE_ADDRESS` | `https://` (Caddy on 80/443, certificates on demand), or `:80` for plain HTTP behind a proxy |
| `PRIMARY_HOSTS` | `links.example.com`: your hostname(s), comma-separated |
| `PB_SUPERUSER_EMAIL` | the PocketBase admin's email |
| `PB_SUPERUSER_PASSWORD` | output of `openssl rand -hex 24` |
| `PB_APP_URL` | `https://links.example.com`, the link in PocketBase's emails |
| `ORIGIN_IPV4` / `ORIGIN_IPV6` | the VPS's public addresses, which custom domains' DNS records must name |

The build is offline and needs two inputs git does not carry: the PocketBase 0.40.4 zip for your architecture in `vendor/`
(from [its release](https://github.com/pocketbase/pocketbase/releases/tag/v0.40.4)) and the app's dependencies,
`docker run --rm -v "$PWD/app:/app" -w /app -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 node:22-alpine sh -c 'corepack pnpm install --frozen-lockfile --prod'`.
Then `docker compose up -d --build`.

### Data and backups

Everything lives in Docker volumes of the `oflink` project: `oflink_pb_data` (PocketBase: accounts, profiles, links, stats,
uploads), `oflink_caddy_data` and `oflink_caddy_config` (certificates). Back up by copying the PocketBase volume while it is
stopped:

```sh
cd /opt/oflink && docker compose stop app pocketbase
docker run --rm -v oflink_pb_data:/data -v /root:/backup alpine tar czf /backup/pb_data-$(date +%F).tgz -C /data .
docker compose start pocketbase app
```

PocketBase's admin also has scheduled backups under Settings -> Backups.

## Develop locally

The stack is `compose.yaml`: Caddy, the app (`app/`, Node + Hono, the editor at `/edit`) and PocketBase (`pocketbase/`, with
its migrations). [`RUN.md`](RUN.md) is the operator runbook (real-device escape matrix, custom domains, cutover).
`./check.sh` runs the Playwright suite against a throwaway stack (`tests/stack.sh`, `tests/e2e.env`). Read
[`CONTEXT.md`](CONTEXT.md) for the domain model and [`docs/`](docs/) for the specs and decisions.
