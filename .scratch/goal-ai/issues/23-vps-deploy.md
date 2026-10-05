# 23: v2 serves every v1 Profile identically on its public https host on the VPS

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 22, 23, 24, 25, 26, 27, 28, 33, 39
Seams: the Operator's terminal on the VPS and on the Mac, outside `./check.sh`: the spec's `# manual:` Acceptance lines, the parity spec pointed at the v2 host with `PLAYWRIGHT_BASE_URL`, and the admin UI through an SSH tunnel
Blocked by: 22: Reveal and /r answer only v2's own origin within a per-client limit
Status: parked — VPS step: the Operator runs the commands (plan §11; ports answered: Traefik fronts Caddy)

**What to build:** Nothing new in code. This ticket closes Phase 2. The plan's DONE line names the VPS URL: "linkme VPS URL serves every existing profile identically to Netlify; an edit in PocketBase admin is live instantly; any image upload comes out as webp". So 22's green local Acceptance proves the local stack only.

The ports question is answered (plan §11, 2026-10-04): Traefik keeps 80 and 443 and fronts v2's Caddy. The Operator, in this order:
1. copies this repo and the v1 Snapshot (secrets file included) to the VPS over SSH, keeping `vendor/` and `app/node_modules` (the rsync excludes only the root `/node_modules`);
2. writes the VPS `.env` (the v2 host, the superuser email and password, and `HTTP_PORT` / `HTTPS_PORT` set to free ports, since Traefik holds 80 and 443) and points the v2 host's DNS A record at the VPS;
3. starts the stack on the VPS. Its build COPYs the amd64 PocketBase zip from `vendor/` and `app/` with its `node_modules` (spec, Offline build); its only network use is pulling base images that are absent there;
4. adds Traefik's routers to Caddy (Why parked, below) and checks that n8n still answers at its own host;
5. runs the v1 Import there, with the v1 Snapshot mounted read-only for that one run. It exits 0. A git clone of v1 prints three case-twin lines, an rsync from this Mac none;
6. deletes through the admin UI every record a `stale in v2:` line names (none on the first run). The parity run fails while one is served;
7. checks from the Mac that HTTP redirects to HTTPS;
8. runs the parity spec from the Mac against the v2 host. It is paced and takes a few minutes;
9. through an SSH tunnel, edits a display name in the admin UI and sees it on the next load of that Profile on the v2 host.

The exact commands are the spec's `# manual:` Acceptance lines, also quoted in plan-review, Needs the human, "The VPS". The results are recorded in this ticket: exit codes, the redirect line, the parity summary and the admin edit. n8n is not touched, and v1 keeps serving ofl.ink until Cutover.

**Why parked.** It is the Operator's VPS step: every line runs on the live VPS, at the v2 host's DNS, or from the Mac against the public host (floor 2). The ports question is answered (plan §11, 2026-10-04; plan-review, Needs the human, item 1; spec, Further Notes, Ports 80 and 443, and review D4b): Traefik (`n8n-traefik-1`) keeps 80 and 443 and fronts v2's Caddy, and Caddy keeps TLS and its certificates. The VPS step must configure, in Traefik's file-editable dynamic config:
- a TCP router with ``HostSNI(`*`)`` and TLS passthrough to Caddy's HTTPS port, at a lower priority than n8n's own HostSNI rule, so n8n keeps answering at its host;
- an HTTP router on 80 for every host that is not n8n's, to Caddy's HTTP port, so Caddy's HTTP-to-HTTPS redirect and its certificate challenges reach it;
- the PROXY protocol header from that TCP service to Caddy, which Caddy accepts from Traefik only. Without it Caddy sees every Visitor as Traefik's address and every Visitor shares one Reveal limit. Two separate clients reaching their own 429s show it.

Which file holds Traefik's dynamic config, and how Traefik reloads it, are the Operator's to find on the server: this repo cannot see the live VPS.

**Caddy side (ticket 45).** Caddy's half of the PROXY protocol is in the repo, off by default. In step 2 the Operator adds one line to the VPS `.env`: `PROXY_PROTOCOL_FROM=<the subnet of Traefik's Docker network>`, e.g. `PROXY_PROTOCOL_FROM=172.18.0.0/16` (`.env.example` holds the command that reads it, and the ASSUMPTION about which address Caddy sees). Caddy then reads the header from that range only, ahead of TLS. The check it enables, run within one minute once Traefik sends the header (the production limit is 60 per minute; status codes only, never a Location):
- from client 1: `for i in $(seq 61); do curl -s -o /dev/null -w '%{http_code}\n' "https://<v2 host>/r/<Link Id>"; done | tail -n 1` prints 429;
- right after, from client 2 on another network (e.g. a phone hotspot): `curl -s -o /dev/null -w '%{http_code}\n' "https://<v2 host>/r/<Link Id>"` prints 302, not 429.
If client 2 also gets 429, Caddy sees Traefik from outside that range: correct the value in `.env` and `docker compose up -d caddy`.

ASSUMPTION (plan §11's, flagged there): overturned if Traefik's config is not file-editable on the VPS or SNI passthrough breaks n8n.
ASSUMPTION: Traefik reaches Caddy on the free host ports that the VPS `.env` gives `HTTP_PORT` and `HTTPS_PORT`, and its TCP service can send PROXY protocol; neither could be observed (the live VPS is out of bounds, floor 2). Rung 4: v2's Compose file stays off n8n's Docker network (story 24). Overturned if Traefik's container cannot reach those ports, in which case Caddy joins Traefik's network through a VPS-only Compose override, or if Traefik cannot send PROXY protocol, in which case the human chooses how the client address reaches Caddy.

The v2 host name, its DNS record, the SSH login and the copy to the VPS are the human's too.

The production country source stays out of this ticket. Phase 2's Visitor location reads request headers, and the parity run injects them. Production countries come from Cloudflare (plan §11, 2026-10-04), owned by Phases 4 and 5 (tickets 37 and 42); nothing here changes for it.

- [x] Traefik's two routers to Caddy, with the PROXY protocol header, are in place and recorded here, and n8n still answers at its own host. 2026-10-05: n8n-traefik-1 is Traefik v3.6.12 with the Docker provider only (no file provider), so the routers are labels on the caddy service in compose.vps.yaml (loaded through COMPOSE_FILE in the VPS .env): one TCP router HostSNI(`*`), TLS passthrough, PROXY protocol v2, to Caddy :443 on n8n_default; one HTTP router for `/.well-known/acme-challenge/` (priority 2000) to Caddy :80, because Traefik answers TLS-ALPN itself and redirects port 80. For that the Operator added `--entrypoints.web.http.redirections.entryPoint.priority=1000` to Traefik's command (/docker/n8n/docker-compose.yml, backup .bak-20261005) and recreated Traefik; n8n answered 200 before and after, n8n-n8n-1 not restarted (up 6 weeks). Caddy reaches the app as `oflink-app` (APP_UPSTREAM) because fastt-app on n8n_default also carries the alias `app`. v2 host: v2.ofl.ink (A 72.62.92.114 at Namecheap). Mac half of the limit check: 61 requests to /r/tkqs82oqoxqz gave 60×302 then 1×429. Phone half: pending. (The ports question itself is answered by plan §11: Traefik fronts Caddy.)
- [ ] Every `# manual:` VPS line of the spec's Acceptance has run, with its output recorded here:
  - the stack is up; (2026-10-05 `docker compose up -d --build --wait`: pocketbase healthy, app and caddy up; ports 8080/9443 published, 8090 on 127.0.0.1 only)
  - the import exits 0, and its lines hold no Destination; (`imported: 27 Profiles, 38 Links, 56 images, 30 warnings`, exit 0; warnings are `dropped: secrets entry … has no Link` / `unused` and one `repaired: trailing comma`, no Destination printed)
  - no `stale in v2:` record is left; (0 lines)
  - the HTTPS redirect line; (`curl -sI http://v2.ofl.ink/weiwei` → 301 https://v2.ofl.ink/weiwei, Traefik's redirect; Caddy's own :80 answers 308 on the ACME router's path)
  - the parity spec's summary, all passing; (`PLAYWRIGHT_BASE_URL=https://v2.ofl.ink … --grep-invert 'Geo Rule'`: 154 passed, 18 skipped (the Fixture-only blocks, not served on the VPS), 1 failed, which was the leak check asking for the Fixture; fixed in 51b86eb and passing alone; a clean full rerun: pending)
  - the admin edit seen on the next load.
- [x] PocketBase's admin UI answers only through the SSH tunnel. The v2 host does not route to it, and its port is not reachable from outside. (2026-10-05: `ss -ltn` shows 127.0.0.1:8090 only; from the Mac http://72.62.92.114:8090/_/ and https://v2.ofl.ink:8090/_/ both fail to connect)
- [ ] `docker compose restart` on the VPS brings the stack back with its data and certificate. A full reboot is the Operator's call, because n8n shares the VPS.
- [~] n8n's containers are the same before and after (`docker ps` ids), and v1 still serves ofl.ink, untouched. (n8n-n8n-1 c4827ee2ed2f unchanged, up 6 weeks; n8n-traefik-1 was recreated once for the redirect-priority flag, by the Operator, recorded above; `curl -sI https://ofl.ink/weiwei` → `server: Netlify`)
