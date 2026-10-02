# 55: Phase 4 runbook: the Operator's handoff for the Stats look, a real phone and the production country source

Spec: docs/spec/phase-04-stats.md
Covers: user stories 6, 8, 22, 29
Seams: a human looking at the Stats screenshot, a real phone in Instagram, the VPS's PocketBase admin UI through the SSH tunnel, and the Cloudflare account and proxied DNS. Agents can reach none of these as the spec intends. They are the spec's `# manual:` lines in Acceptance.
Blocked by: 54: The Page View ping is rate-limited…; 53: A failed or slow Event write never breaks or stalls a Visitor's Click; 52: A deleted Link keeps its Clicks…; 51: A Tracking Code stays with the Profile it arrived on… (with their own blockers, these cover tickets 44 to 50); 31: Phase 2 VPS runbook: the Operator's handoff for the VPS, its DNS and the admin tunnel (v2 on the VPS, and the admin tunnel); and, for step 3 only, 63: Cutover runbook handoff (its Cloudflare set-up steps)
Status: parked — needs-human: the steps need a human's eye on the screenshot, a real phone, the VPS's PocketBase admin UI, or the Cloudflare account and proxied DNS. All of these are barred to agents.

**What to build:** Nothing, for an agent. Once tickets 44 to 54 are done and Phase 4 is on the VPS, the Operator checks the parts that need eyes, a phone and live systems. Do the steps in order.

- [ ] Before anything leaves the machine, the spec's whole Acceptance block passes from the repo root, apart from its `# manual:` lines. That includes `./check.sh`.
- [ ] **1. The look.** Open `.scratch/goal_ai/shots/04-stats.png`. It should read like the link.me Template's analytics page: range tabs, three cards, daily bars, a Links table and a Countries table.
- [ ] **2. A real phone.** Follow RUN.md. In Instagram on a phone, open the Fixture Profile. In the VPS's PocketBase admin UI, through the SSH tunnel, the newest Event for that Profile shows `inAppBrowser` = instagram. Its country reads `XX` until step 3 is done.
- [ ] **3. Real country numbers, at Cutover.** The production country source is Cloudflare's `CF-IPCountry` header. Phase 5 owns the set-up:
  - the zone move;
  - the Proxied records;
  - the Caddy lines that set `X-Country` from `CF-IPCountry` only for requests from Cloudflare's ranges, and remove both headers from every other request (phase-05, Caddy configuration).

  Once that is live, repeat step 2. The newest Event shows the phone's real country. A Custom Domain that Cloudflare does not proxy keeps recording `XX`.
