# 31: Phase 2 VPS runbook: the Operator's handoff for the VPS, its DNS and the admin tunnel

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 18, 19, 21, 26, 27, 32, 38
Seams: the live VPS, its DNS, Cloudflare and the PocketBase admin UI through an SSH tunnel, none of which agents can reach. They are the spec's `# manual:` lines in Acceptance and its Further Notes.
Blocked by: 06: Go-live runbook: the Operator's handoff for n8n, GitHub and the live site (the v1 tree the VPS gets is the one Phase 0's runbook leaves); 29: `./check.sh` runs only against v2 at localhost:4173…; and, from step 2 on, 30: The VPS's ports 80 and 443 reach v2's Caddy the way the Operator chose
Status: parked — needs-human: every step needs the live VPS, its DNS or Cloudflare, which agents may not touch. Step 1 also settles D11b (docs/spec/plan-review.md, `## Needs the human`), which unparks ticket 30.

**What to build:** Nothing, for an agent. Once tickets 17–29 are done, the Operator puts v2 on the VPS beside v1 and proves parity there. v1 (Netlify, GitHub and the n8n Form) keeps serving ofl.ink untouched throughout; Cutover is Phase 5. Do the steps in order.

- [ ] Before anything leaves the machine, the spec's whole Acceptance block passes from the repo root, apart from its `# manual:` lines. That includes `./check.sh`.
- [ ] **1. Ports 80 and 443.** Run `ssh <vps> 'docker ps --format "{{.Names}}\t{{.Ports}}"; sudo ss -ltnp "( sport = :80 or sport = :443 )"'`.
  - If nothing listens, v2's Caddy takes the ports.
  - If something listens, choose "Caddy fronts both" or "the existing proxy fronts v2". The second works for Phase 5 only if that proxy passes TLS through by SNI.

  Write the answer in ticket 30 and get ticket 30 done. Nothing on the VPS changes until then.
- [ ] **2. Copy and configure.**
  - Copy the repo and the v1 tree, secrets.json included, to the VPS.
  - Write the untracked `.env` there with `SITE_ADDRESS=<v2 host>`, `PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD`. Never commit it.
  - Point `<v2 host>`'s DNS A record at the VPS.
  - Under "the existing proxy fronts v2", also apply ticket 30's port values and the proxy's SNI passthrough.
- [ ] **3. Start.** On the VPS, run `docker compose up -d --build --wait`. This fetches the images, the PocketBase release and the app's dependencies there. `docker ps` shows n8n running and unchanged before and after.
- [ ] **4. Import.** On the VPS, run `docker compose run --rm -v "$PWD/linkme_clone3:/v1:ro" app npm run --silent import-v1 -- --site /v1/public --secrets /v1/netlify/functions/secrets.json`.
  - It exits 0 with no `invalid v1 file` line.
  - A git clone of the v1 repo gives three `case twin skipped` warnings (Jaka, JakaJaka, weiWEi); a tree copied from this Mac gives none.
- [ ] **5. TLS.** From the Mac, run `curl -sI http://<v2 host>/ | grep -i '^location: https://'`. Caddy redirects HTTP to HTTPS, and `https://<v2 host>/` answers with a valid certificate.
- [ ] **6. Parity.** From the Mac, run `PLAYWRIGHT_BASE_URL=https://<v2 host> npx playwright test tests/e2e/02-profile-parity.spec.ts`. It is paced, so it takes a few minutes, and it passes.
- [ ] **7. Admin edit.**
  - Run `ssh -L 8090:127.0.0.1:8090 <vps>` and edit a display name at http://localhost:8090/_/.
  - Reload `https://<v2 host>/<username>`; the new name shows.
  - Re-run step 4 to put v1's value back, since v1 wins.
  - From the Mac, PocketBase's port on the VPS's public address does not answer.
- [ ] **8. v1 untouched.** ofl.ink is still served by Netlify. No step here touched v1's repo, its Netlify site or the n8n Form.
- [ ] **Before Cutover, not for this Phase's sign-off.** Proxy the v2 host through Cloudflare with "Add visitor location headers" on. Phase 5 owns Caddy's matching lines (trusted proxies and the country header). Until then every Visitor without the headers counts as US, as on v1.
