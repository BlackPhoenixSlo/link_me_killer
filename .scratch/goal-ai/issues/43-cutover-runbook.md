# 43: The Operator switches ofl.ink to v2 by one DNS change while v1 stays live

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 30, 35, 36, 38, 39, 42
Seams: `RUN.md`'s `## Cutover`, run by the Operator from the Mac and the VPS over SSH; PocketBase's admin UI through Phase 2's SSH tunnel; Cloudflare's dashboard, where 42 moves ofl.ink's zone (plan §11); n8n's Executions list; Netlify's Deploys screen, read only; real phones
Blocked by: 41: Caddy asks the app before every certificate and the Cutover runbook is written, 42: Visitor location trusts only the production country source and ofl.ink's DNS is ready for a one-record switch, 23: v2 serves every v1 Profile identically on its public https host on the VPS, 32: Sign-up runs on the VPS with the Operator's mail and nightly backups, 38: A phone inside Instagram is recorded as Instagram on v2's VPS host
Status: parked — VPS step: the Operator runs the commands (plan §11; ports answered: Traefik fronts Caddy)

**What to build:** Nothing new. Visitors who tap any `ofl.ink/{username}` or `ofl.ink/{username}/{code}` link already in a bio reach v2 with their Tracking Code, and v1 stays serving, unedited, on `linkmeclone3.netlify.app` indefinitely as the live fallback. Nothing in Netlify ever changes (plan section 10), so the runbook has no irreversible step. The Operator runs `RUN.md`'s `## Cutover` in order; each criterion below is one of its steps. The switch is one change to ofl.ink's apex record (and `www` if it exists), and the rollback is the same change reversed. Nothing in Caddy or the app changes on the day, the old GitHub repo is only read, and no agent touches the Netlify site, its deploys or the n8n Form. Step 3 (the zone move or TTL change) is ticket 42's; step 15 (rotation after a Flag) is ticket 44's.

**Why parked.** Every step is the Operator's: the live VPS, DNS, Cloudflare, purchases and real phones (floor 2). The two questions it once waited on are answered (plan §11, 2026-10-04):
- **Ports 80/443.** Traefik keeps them and fronts v2's Caddy, by a TCP router with ``HostSNI(`*`)`` and TLS passthrough on 443 and an HTTP router on 80, which 23's VPS step adds. TLS on 443 therefore reaches Caddy, whose on-demand TLS this Phase needs. Step 1 records it.
- **The production country source** is Cloudflare, built in ticket 42. Where steps 1, 4, 7, 8, 9 and 13 change records or probe headers, they run as 42 leaves `RUN.md`. The commands below are the Cloudflare answer, as the spec writes them.

Set once: `USERNAME` (an imported Username), `VPS` (ssh host), `V2_DIR` (v2's directory on the VPS), `V2_HOST` (Phase 2's v2 host), `VPS_IPV4`, `SPARE` (a Spare Domain), `DOMAIN` (a Creator's Custom Domain), `LINK_ID` (a Link Id of `$USERNAME`'s Profile), `LIMIT` (the VPS's Reveal limit per minute).

- [ ] **1. Ports, deploy and the ask.** Record who holds ports 80 and 443 in `RUN.md`: Traefik (`n8n-traefik-1`) with 23's two routers to v2's Caddy (plan §11). Anything else stops here until the Operator chooses again. Then deploy this Phase by Phase 2's procedure with `PRIMARY_HOSTS=ofl.ink,<V2_HOST>` (append `,www.ofl.ink` if step 2 shows it) and, under Cloudflare, `CLOUDFLARE_RANGES` filled by 42's command, in the VPS `.env`, and prove the ask Caddy uses:

  ```sh
  ssh "$VPS" "sudo ss -ltnp '( sport = :80 or sport = :443 )'"
  rsync -a --exclude /node_modules --exclude .scratch ./ "$VPS:$V2_DIR/" && ssh "$VPS" "cd $V2_DIR && docker compose up -d --build --wait"
  test "$(curl -s -o /dev/null -w '%{http_code}' "https://$V2_HOST/$USERNAME")" = 200
  E="$(ssh "$VPS" "cd $V2_DIR && docker compose exec -T caddy caddy adapt --config /etc/caddy/Caddyfile" | grep -o '"endpoint":"[^"]*"' | cut -d'"' -f4)"
  ssh "$VPS" "cd $V2_DIR && docker compose exec -T caddy wget -q -O /dev/null '$E?domain=ofl.ink'"              # says yes
  ! ssh "$VPS" "cd $V2_DIR && docker compose exec -T caddy wget -q -O /dev/null '$E?domain=unknown.invalid'"   # refuses a stranger
  ```
- [ ] **2. v1's DNS is on record.** `RUN.md` holds every record of the ofl.ink zone, the live answers, any DS record and the registrar, as ticket 42 recorded them; and under Cloudflare, the Cloudflare records written at step 3 as the rollback target.
- [ ] **4. A Spare Domain is warmed.** Buy at least one (payment, the Operator's). Point it at `$VPS_IPV4` as 42 leaves step 4 (under Cloudflare: added to Cloudflare with ofl.ink's SSL/TLS settings, A Proxied, NS set at its registrar). List it in Spare Domains in the PocketBase admin UI, then:

  ```sh
  test "$(curl -s -o /dev/null -w '%{http_code}' "https://$SPARE/$USERNAME")" = 200     # the first call issues the certificate
  ```

  Then open `https://$SPARE/$USERNAME` inside Instagram on a phone: the Profile opens with no Meta warning.
- [ ] **5. Backups are usable.** PocketBase admin UI → Settings → Backups shows auto backups on, cron `0 3 * * *`, keep 7. Create one backup now, download it to the Mac as `$B`, then:

  ```sh
  R="${TMPDIR:-/tmp}/pb-restore.db"; unzip -p "$B" data.db > "$R" && test "$(sqlite3 "$R" 'pragma integrity_check;')" = ok
  test "$(sqlite3 "$R" 'select count(*) from profiles;')" = <the Profiles count the admin UI shows> && unzip -l "$B" | grep -q ' storage/'
  ```
- [ ] **6. Freeze and the final v1 Import.** From now on nobody submits the n8n Form, with no end date, because a rollback stays possible indefinitely. Wait until n8n's Executions list shows no running execution of the Form's workflow and Netlify's Deploys page shows the newest production deploy Published. The pulled commit must match the commit that deploy names. Then:

  ```sh
  git -C linkme_clone3 pull --ff-only && echo "v1 commit: $(git -C linkme_clone3 rev-parse HEAD)" >> RUN.md
  bad=0; for f in linkme_clone3/api/profiles/*.json; do curl -sf "https://ofl.ink/api/profiles/${f##*/}" | cmp -s - "$f" || { echo "differs from live v1: ${f##*/}"; bad=1; }; done; test "$bad" = 0
  rsync -a --delete --exclude .git linkme_clone3/ "$VPS:$V2_DIR/linkme_clone3/"
  ssh "$VPS" "cd $V2_DIR && docker compose run --rm -v \"\$PWD/linkme_clone3:/v1:ro\" app import-v1 --site /v1"   # never again after step 8
  PLAYWRIGHT_BASE_URL="https://$V2_HOST" npx playwright test tests/e2e/02-profile-parity.spec.ts --grep-invert 'Geo Rule'
  ```
- [ ] **7. Readiness.** Steps 1, 4, 5 and 6 are done, and:

  ```sh
  nc -zv "$VPS_IPV4" 80 && nc -zv "$VPS_IPV4" 443
  test "$(curl -s -o /dev/null -w '%{http_code}' "https://$V2_HOST/internal/tls-ask?domain=ofl.ink")" = 200
  curl -s -o /dev/null --resolve "$V2_HOST:443:$VPS_IPV4" -H 'CF-IPCountry: DE' -H 'X-Country: DE' "https://$V2_HOST/r/$LINK_ID"   # newest Click Event for that Link (admin UI): country XX
  curl -s -o /dev/null -H 'CF-IPCountry: DE' -H 'X-Country: DE' "https://$SPARE/r/$LINK_ID"   # newest Click Event: the Mac's own country
  for i in $(seq 1 $((LIMIT + 1))); do curl -s -o /dev/null -w '%{http_code}\n' --resolve "$V2_HOST:443:$VPS_IPV4" -H "X-Forwarded-For: 198.51.100.$i" "https://$V2_HOST/r/$LINK_ID"; done | grep -q 429
  ```
- [ ] **8. Switch.** `echo "switch: $(date -u +%FT%TZ)" >> RUN.md`, then replace the ofl.ink apex record with A `ofl.ink` → `$VPS_IPV4` (Proxied under Cloudflare; AAAA to the VPS's IPv6 only if it has one); if `www` existed, CNAME `www` → `ofl.ink`. Reversible by step 13.
- [ ] **9. Verify** from the Mac (the first request issues ofl.ink's certificate; retry a Cloudflare 52x once after a few seconds):

  ```sh
  test "$(curl -s -o /dev/null -w '%{http_code} %{size_download}' 'https://ofl.ink/internal/tls-ask?domain=ofl.ink')" = "200 0"   # only v2 answers an empty 200
  test "$(curl -s -o /dev/null -w '%{http_code}' "https://ofl.ink/$USERNAME")" = 200
  S="${TMPDIR:-/tmp}/secrets-path"; curl -s -o "$S" https://ofl.ink/netlify/functions/secrets.json
  node -e 'const fs=require("fs"),b=fs.readFileSync(process.argv[1],"utf8").replace(/\\\//g,"/");process.exit(Object.values(JSON.parse(fs.readFileSync("linkme_clone3/netlify/functions/secrets.json","utf8"))).filter(Boolean).some(u=>b.includes(u))?1:0)' "$S"   # no v1 Destination at the old path; prints none
  ssh "$VPS" "cd $V2_DIR && docker compose logs caddy" | grep -i 'certificate obtained successfully' | grep -q ofl.ink
  ```

  If no certificate was obtained under Cloudflare: set the apex record DNS-only, repeat the first `curl` so Caddy issues directly, then set it Proxied again.
- [ ] **10. No re-import and no clean-up.** The v1 Import is never run again (it would overwrite Editor edits). Readiness traffic stays in Stats; the switch time from step 8 tells it apart.
- [ ] **11. Real-device matrix** on `https://ofl.ink/$USERNAME` for every Mode, inside Instagram, Facebook, Threads and TikTok and in Safari and Chrome, on iOS and Android; each cell recorded in `RUN.md`.
- [ ] **12. Tell Creators and hand over.** Link Shortcuts carrying v1 Link Ids no longer reveal and must be re-shared; bio links on `linkmeclone3.netlify.app` keep showing a frozen v1 indefinitely and never get Editor edits, so they should move to ofl.ink; n8n Form edits no longer reach ofl.ink. Invite imported Profiles' Creators to the Editor. For each v1 Creator who has signed up, set their imported Profile's owner to their account in the PocketBase admin UI, deleting first any bare Profile they claimed meanwhile. Never before step 8.
- [ ] **13. Rollback, only if** step 9 fails or a Mode that passed on v1 fails step 11: restore the records written as the rollback target (DNS-only), then `curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'` within one TTL. v2 and its domains keep running and the n8n freeze still holds. While rolled back, ofl.ink serves v1's secrets file and v1 Link Ids again, and v2 Link Ids shared since step 8 reveal nothing there. Ticked as "not needed" if neither trigger fires; a rollback stays possible later too, because v1 stays live (plan section 10).
- [ ] **14. The first Custom Domain,** whenever a Creator asks (it does not hold this ticket open; if none by the time the other steps are ticked, recorded as not yet exercised). The Creator sets A `$DOMAIN` → `$VPS_IPV4`, DNS-only (AAAA only if the VPS has IPv6). The Operator sets that Profile's Custom Domain in the PocketBase admin UI. Then `test "$(dig +short A "$DOMAIN")" = "$VPS_IPV4" && test "$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/")" = 200`, and inside Instagram on iOS and on Android a Link of each Mode the Profile uses is tapped: an Escape lands on `$DOMAIN`, not ofl.ink. Removing one later: clear the field, then `ssh "$VPS" "cd $V2_DIR && docker compose restart caddy"`.
