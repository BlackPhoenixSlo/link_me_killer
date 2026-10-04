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

ASSUMPTION (plan §11's, flagged there): overturned if Traefik's config is not file-editable on the VPS or SNI passthrough breaks n8n.
ASSUMPTION: Traefik reaches Caddy on the free host ports that the VPS `.env` gives `HTTP_PORT` and `HTTPS_PORT`, and its TCP service can send PROXY protocol; neither could be observed (the live VPS is out of bounds, floor 2). Rung 4: v2's Compose file stays off n8n's Docker network (story 24). Overturned if Traefik's container cannot reach those ports, in which case Caddy joins Traefik's network through a VPS-only Compose override, or if Traefik cannot send PROXY protocol, in which case the human chooses how the client address reaches Caddy.

The v2 host name, its DNS record, the SSH login and the copy to the VPS are the human's too.

The production country source stays out of this ticket. Phase 2's Visitor location reads request headers, and the parity run injects them. Production countries come from Cloudflare (plan §11, 2026-10-04), owned by Phases 4 and 5 (tickets 37 and 42); nothing here changes for it.

- [ ] Traefik's two routers to Caddy, with the PROXY protocol header, are in place and recorded here, and n8n still answers at its own host. (The ports question itself is answered by plan §11: Traefik fronts Caddy.)
- [ ] Every `# manual:` VPS line of the spec's Acceptance has run, with its output recorded here:
  - the stack is up;
  - the import exits 0, and its lines hold no Destination;
  - no `stale in v2:` record is left;
  - the HTTPS redirect line;
  - the parity spec's summary, all passing;
  - the admin edit seen on the next load.
- [ ] PocketBase's admin UI answers only through the SSH tunnel. The v2 host does not route to it, and its port is not reachable from outside.
- [ ] `docker compose restart` on the VPS brings the stack back with its data and certificate. A full reboot is the Operator's call, because n8n shares the VPS.
- [ ] n8n's containers are the same before and after (`docker ps` ids), and v1 still serves ofl.ink, untouched.
