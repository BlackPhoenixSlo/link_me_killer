# 64: Domains and backups runbook: the Operator's handoff for the first Spare Domain, PocketBase backups, the first Custom Domain and the day ofl.ink is Flagged

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 19, 24, 27, 30, 32
Seams: a registrar purchase, Cloudflare, the VPS's PocketBase admin UI through the SSH tunnel, a Creator's own DNS, and real phones in Instagram. Agents can reach none of these. They are the spec's `# manual:` lines for Spare Domains, backups, the first Custom Domain and the day ofl.ink is Flagged.
Blocked by: 61: Every Spare Domain listed in PocketBase serves every Profile… (Spare Domains listed and served); 58: On a Custom Domain every tap behaves as on ofl.ink… (with its own blockers, a Custom Domain's Profile and taps); 60: Caddy asks the app before it issues any certificate… (on-demand certificates); 30: The VPS's ports 80 and 443 reach v2's Caddy the way the Operator chose (real certificates on 443); 31: Phase 2 VPS runbook: the Operator's handoff for the VPS, its DNS and the admin tunnel (the VPS and the admin tunnel); and, from 63: Cutover runbook: the Operator's handoff for moving ofl.ink to v2…, its deploy (step 1) before steps 1 and 3 here, its zone move (step 3, the Cloudflare account whose settings the Spare Domain copies) before step 1 here, and its switch (step 8) before step 4 here
Status: parked — needs-human: buying a Spare Domain is a payment. Every step needs the registrar, Cloudflare, the VPS's PocketBase admin UI, a Creator's own DNS or a real phone, all barred to agents. Step 4 also rests on B24b (docs/spec/plan-review.md, `## Needs the human`): whether a Spare Domain recovers traffic once ofl.ink is Flagged, which only a real Flag settles.

**What to build:** Nothing, for an agent. The Operator readies the domains that outlast a Flag, and makes v2's data safe before it becomes the only copy of Editor edits. Steps 1 and 2 must be done before ticket 63's switch. Steps 3 and 4 come after it.

- [ ] Before anything leaves the machine, the spec's whole Acceptance block passes from the repo root, apart from its `# manual:` lines. That includes `./check.sh`.
- [ ] **1. A warmed Spare Domain**, before ticket 63's freeze.
  - Buy at least one Spare Domain. This is a payment.
  - Add it to Cloudflare with ofl.ink's SSL/TLS settings and an A record to `$VPS_IPV4`, Proxied. Set its nameservers at the registrar.
  - List it among the Spare Domains in the PocketBase admin UI.
  - Warm it: `curl -s -o /dev/null -w '%{http_code}\n' "https://$SPARE/$USERNAME"` answers 200. The first call issues the certificate.
  - Open `https://$SPARE/$USERNAME` inside Instagram on a phone. The Profile opens with no Meta warning.
- [ ] **2. Backups**, before ticket 63's switch.
  - In the PocketBase admin UI, through the SSH tunnel, go to Settings → Backups and schedule them daily, keeping 7.
  - Create one backup by hand and download it to the Mac.
  - Restore it into a throwaway local PocketBase. Its Profiles must open.

  ASSUMPTION (evidence blocked, carried from the spec's Backups decision): the PocketBase release Phase 2 pins has built-in scheduled backups. Overturned if it has none; a nightly cron job on the VPS then stops PocketBase, copies its volume into a dated directory, and starts it again.
- [ ] **3. The first Custom Domain**, any time after ticket 63's deploy.
  - The Creator sets A `$DOMAIN` to `$VPS_IPV4`, DNS-only. They add AAAA only if the VPS has IPv6.
  - The Operator sets that Profile's Custom Domain in the PocketBase admin UI.
  - Check: `dig +short A "$DOMAIN"` shows `$VPS_IPV4`, then `curl -s -o /dev/null -w '%{http_code}\n' "https://$DOMAIN/"` answers 200.
  - Open `https://$DOMAIN/` inside Instagram on iOS and on Android, and tap a Link of each Mode the Profile uses. An Escape lands on `$DOMAIN`, not on ofl.ink.
  - Its Events record country `XX`, because Cloudflare does not proxy it.
- [ ] **4. The day ofl.ink is Flagged.**
  - The Operator and the Creators replace ofl.ink with a warmed Spare Domain in every bio link. Nothing in v2 changes.
  - Links already posted outside bios (stories, DMs, old posts) keep ofl.ink and are not recovered.
  - Settle B24b: open `https://$SPARE/$USERNAME` inside Instagram on a phone and confirm there is no Meta warning. Then watch the Profile's Page Views on the Stats page over the following days.
  - A warning there means rotation fails. The Operator then picks another mitigation, such as a second server address, or Custom Domains first.
- [ ] Playwright: adds no spec. `./check.sh` passes on the Mac before step 1.
