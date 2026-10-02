# 63: Cutover runbook: the Operator's handoff for moving ofl.ink to v2, checking it, rolling back and turning Netlify off

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
Seams: live DNS, the registrar, Cloudflare, the VPS, the n8n Form, Netlify and real phones. Agents can reach none of these. They are the spec's `# manual:` lines in Acceptance, which tickets 57, 60, 61 and 62 write into RUN.md's Cutover section.
Blocked by: 61: Every Spare Domain listed in PocketBase serves every Profile… and 62: Behind Cloudflare only Cloudflare decides a Visitor's country and address… (with their own blockers, these cover tickets 56 to 60); 30: The VPS's ports 80 and 443 reach v2's Caddy the way the Operator chose (on-demand TLS needs 443 to reach Caddy, directly or by SNI passthrough); 31: Phase 2 VPS runbook: the Operator's handoff for the VPS, its DNS and the admin tunnel (v2 on the VPS, its deploy procedure, the parity run against it, and the admin tunnel); 06: Go-live runbook: the Operator's handoff for n8n, GitHub and the live site (the fixed v1, which no longer serves secrets.json, and which stays as the cold backup and rollback target); 16: Phase 1 real-device runbook: the Operator's handoff for the n8n import, the deploy preview and real phones (the v1 results that the rollback trigger compares against); and, before step 5 and step 7 respectively,
Note: the readiness gate (a warmed Spare Domain and a proven backup) is steps 1–2 of ticket 64, which in turn waits on this ticket's deploy and zone move; the two runbooks interleave, so the edge is recorded here as prose, not as Blocked by, to keep the graph acyclic. ASSUMPTION: rung 5, smallest change that breaks the 63↔64 cycle; overturned if the Operator wants a single merged Cutover+domains runbook.
Status: parked — needs-human: every step needs live DNS, the registrar, the Cloudflare account, the VPS, the n8n Form, Netlify or real phones, all of which are barred to agents. It also waits on ticket 30, which is parked on D11b (docs/spec/plan-review.md, `## Needs the human`).

**What to build:** Nothing, for an agent. The Operator moves ofl.ink from v1 to v2 in one sitting, following RUN.md's Cutover section. Do the steps in order.

This ticket provides two things other tickets wait on:
- **the final v1 Import (step 6).** Ticket 43's step 5, which hands imported Profiles to their Creators, waits on it.
- **the Cloudflare set-up (steps 1, 3 and 8).** Ticket 55's step 3 (real countries in Stats) and ticket 31's last step (proxying through Cloudflare before Cutover) wait on it.

- [ ] Before anything leaves the machine, the spec's whole Acceptance block passes from the repo root, apart from its `# manual:` lines. That includes `./check.sh`.
- [ ] **1. Deploy.** Put Phase 5 on the VPS by Phase 2's deploy procedure.
  - The VPS's `.env` gets `PRIMARY_HOSTS=ofl.ink,<v2 host>`, plus `www.ofl.ink` if step 2 shows it exists.
  - It also gets Cloudflare's ranges, from ticket 62's command in RUN.md.
- [ ] **2. Record v1's DNS in RUN.md.**
  - First copy every record of the ofl.ink zone as the current DNS host lists it: type, name, value and TTL, NETLIFY and ALIAS records included.
  - Then record the live answers: `dig +short NS ofl.ink; dig +noall +answer ofl.ink A ofl.ink AAAA www.ofl.ink CNAME www.ofl.ink A www.ofl.ink AAAA`.

  This settles the spec's evidence-blocked question: who hosts ofl.ink's DNS, which registrar holds it, and whether `www.ofl.ink` exists.
- [ ] **3. Move the zone to Cloudflare, at least 48 hours before the switch, while v1 still serves.**
  - Re-create every recorded record DNS-only, with TTL 300 on the apex and www records. NETLIFY and ALIAS records become an apex CNAME to `linkmeclone3.netlify.app`.
  - Set SSL/TLS to Full (strict). Leave Always Use HTTPS off. Turn IP Geolocation on.
  - Write the Cloudflare records into RUN.md as the rollback target.
  - At the registrar, set the nameservers to Cloudflare's pair.
  - Check: `dig +short NS ofl.ink` shows Cloudflare's pair, and `curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'` passes.
- [ ] **4. Readiness gate.**
  - Bring the v1 tree on the Mac and on the VPS to the commit live v1 serves. This moves v1's data and static files only; v2's page script is its own copy.
  - From the Mac, `PLAYWRIGHT_BASE_URL=https://<v2 host> npx playwright test tests/e2e/02-profile-parity.spec.ts` passes.
  - On the VPS, the ask address from Caddy's adapted config says yes to `ofl.ink` and to the v2 host, from inside the Caddy container.
  - From the Mac, `nc -zv "$VPS_IPV4" 80 && nc -zv "$VPS_IPV4" 443` succeeds.
- [ ] **5. A warmed Spare Domain.** Ticket 64's step 1 is done before going on.
- [ ] **6. Freeze v1 edits, then run the final v1 Import.**
  - Stop submitting the n8n Form.
  - Invite the Creators of imported Profiles to the Editor only after the switch, and ask anyone already invited to hold their edits.
  - Copy the current v1 tree to the VPS and run the final v1 Import with Phase 2's command (ticket 31's step 4).
  - Re-run the parity spec from step 4.
- [ ] **7. Backups.** Ticket 64's step 2 is done before the switch.
- [ ] **8. Switch.**
  - Write the time (UTC) into RUN.md.
  - In Cloudflare, replace the ofl.ink apex record with A to `$VPS_IPV4`, Proxied. Add AAAA to `$VPS_IPV6`, Proxied, only if the VPS has IPv6.
  - If www existed, point it at ofl.ink, Proxied.
- [ ] **9. Verify from the Mac.** The first request issues ofl.ink's certificate. The spec's commands check four things:
  - the TLS Ask on ofl.ink answers 200 with an empty body, which only v2 does;
  - a Profile's JSON answers 200;
  - the old secrets path answers 200 or 404, and its body is not JSON;
  - Caddy's log on the VPS shows a certificate obtained for ofl.ink.

  If no certificate was obtained, set the apex record DNS-only, repeat the first check so that Caddy issues directly, then set it back to Proxied.
  ASSUMPTION (evidence blocked, carried from the spec's DNS records decision): HTTP-01 through Cloudflare's proxy, and on-demand issuance on Cloudflare's first handshake with the origin, were not observed. This step settles it.
- [ ] **10. Clear readiness traffic.** Take one backup by hand. Then, in the PocketBase admin UI, delete every Event created before the switch time recorded in RUN.md.
- [ ] **11. Real-device matrix** on `https://ofl.ink/$USERNAME`, recorded in RUN.md's matrix:
  - every Mode;
  - inside Instagram, Facebook, Threads and TikTok, and in Safari and Chrome;
  - on iOS and Android.
- [ ] **12. Roll back** if a step 9 check fails, or if a Mode that passed on v1 (ticket 16) fails step 11.
  - In Cloudflare, restore the records written at step 3, DNS-only. v1 on Netlify answers again within one TTL.
  - Only ofl.ink moves back. v2 keeps running, and Custom Domains and Spare Domains stay on it.
  - Profiles created only in v2, v2-side edits and Stats are hidden on ofl.ink, not lost.
  - Later in the 30 days, rolling back is the Operator's call.
- [ ] **13. Hand-over can start.** Once the switch holds, ticket 43's step 5 and ticket 55's step 3 can go ahead.
- [ ] **14. Turn Netlify off, Cutover + 30 days.**
  - Deploy the redirect from an empty directory: `D=$(mktemp -d); printf '/* https://ofl.ink/:splat 301!\n' > "$D/_redirects"; (cd "$D" && netlify deploy --prod --dir . --site "$NETLIFY_SITE_ID")`.
  - Remove ofl.ink under Domain management, and stop builds.
  - Check: `test "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "https://linkmeclone3.netlify.app/$USERNAME")" = "301 https://ofl.ink/$USERNAME"`.
  - To undo, republish an earlier deploy. Deleting the site is a separate Operator decision.
- [ ] Playwright: adds no spec. `tests/e2e/02-profile-parity.spec.ts` passes against the v2 host at steps 4 and 6. `./check.sh` passes on the Mac before step 1.
