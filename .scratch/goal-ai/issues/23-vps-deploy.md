# 23: v2 serves every v1 Profile identically on its public https host on the VPS

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 22, 23, 24, 25, 26, 27, 28, 33, 39
Seams: the Operator's terminal on the VPS and on the Mac, outside `./check.sh`: the spec's `# manual:` Acceptance lines, the parity spec pointed at the v2 host with `PLAYWRIGHT_BASE_URL`, and the admin UI through an SSH tunnel
Blocked by: 22: Reveal and /r answer only v2's own origin within a per-client limit
Status: parked — needs-human: who holds ports 80/443 on the VPS

**What to build:** Nothing new in code. This ticket closes Phase 2. The plan's DONE line names the VPS URL: "linkme VPS URL serves every existing profile identically to Netlify; an edit in PocketBase admin is live instantly; any image upload comes out as webp". So 22's green local Acceptance proves the local stack only.

Once the ports question is settled, the Operator, in this order:
1. copies this repo and the v1 Snapshot (secrets file included) to the VPS over SSH;
2. writes the VPS `.env` (the v2 host, the superuser email and password) and points the v2 host's DNS A record at the VPS;
3. starts the stack on the VPS. Its first build fetches images and packages there;
4. runs the v1 Import there, with the v1 Snapshot mounted read-only for that one run. It exits 0. A git clone of v1 prints three case-twin lines, an rsync from this Mac none;
5. deletes through the admin UI every record a `stale in v2:` line names (none on the first run). The parity run fails while one is served;
6. checks from the Mac that HTTP redirects to HTTPS;
7. runs the parity spec from the Mac against the v2 host. It is paced and takes a few minutes;
8. through an SSH tunnel, edits a display name in the admin UI and sees it on the next load of that Profile on the v2 host.

The exact commands are the spec's `# manual:` Acceptance lines, also quoted in plan-review, Needs the human, "The VPS". The results are recorded in this ticket: exit codes, the redirect line, the parity summary and the admin edit. n8n is not touched, and v1 keeps serving ofl.ink until Cutover.

**Why parked.** Who holds ports 80 and 443 on the VPS decides whether v2's Caddy can take them (plan-review, Needs the human, item 1; spec, Further Notes and review D4b). The human settles that with:

```sh
ssh root@srv1395798.hstgr.cloud 'docker ps --format "{{.Names}}\t{{.Image}}\t{{.Ports}}"; ss -ltnp "( sport = :80 or sport = :443 )"'
```

- **If nothing holds them,** nothing in the spec changes.
- **If a proxy in front of n8n holds them,** the Operator picks one of two:
  - Caddy fronts both, and v2 then reaches n8n, against story 24;
  - the existing proxy fronts v2, and TLS for the v2 host then lives outside this repo. Caddy must also take the client IP from that proxy's forwarded header. Otherwise every Visitor shares one Reveal limit, because the last `X-Forwarded-For` entry would be the proxy's address. Two separate clients reaching their own 429s show it.

Until the Operator decides, nothing on the VPS changes. The v2 host name, its DNS record, the SSH login and the copy to the VPS are the human's too.

The production country source stays out of this ticket. Phase 2's Visitor location reads request headers, and the parity run injects them. Whether production countries come from Cloudflare or a geo-IP database is parked (plan-review, Needs the human, item 2) and owned by Phases 4 and 5. Nothing here commits to `CF-IPCountry` in production.

- [ ] The ports question is answered and recorded here, with the Operator's choice if a proxy holds them.
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
