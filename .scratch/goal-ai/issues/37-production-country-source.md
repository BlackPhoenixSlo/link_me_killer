# 37: Events carry each Visitor's real country from the production country source

Spec: docs/spec/phase-04-stats.md
Covers: user stories 6, 7, 31, 32
Seams: locally, the running v2 stack at Playwright's baseURL through `./check.sh`, with the Visitor's country set through the `CF-IPCountry` header in `extraHTTPHeaders` (plan §11: Cloudflare). In production, after Phase 5's switch, the Operator's terminal, PocketBase's admin UI through an SSH tunnel and a phone on mobile data. The spec's Acceptance block
Blocked by: 36: Only the owner reads a Profile's Stats and recording never blocks a Click or a deletion, 42: Visitor location trusts only the production country source and ofl.ink's DNS is ready for a one-record switch
Status: ready-for-agent

**What to build:** Every Event carries the Visitor's real country in production. Unknown stays "Unknown", never US. This ticket holds everything about Phase 4 that depends on where the country comes from. Events, the ping, `dailyStats`, the Stats page, the Tracking Code key and the owner rules are built in 33–36 and do not wait for it.

**Decided** (plan §11, 2026-10-04, rung 2): Cloudflare's header. The Operator observed `dig +short NS ofl.ink` → `dns1/dns2.registrar-servers.com` (Namecheap) and no DS record, so no DNSSEC. The nameservers move from Namecheap to Cloudflare in ticket 42, as a `# manual:` step the Operator runs; no agent touches the registrar, Cloudflare or live DNS. Geo Rules on DNS-only Custom Domains fall back to US, which plan §11 accepts. Everything below up to the post-switch check is agent work on the local stack.

**Cloudflare's header (plan §11):**
- 33's country function stays as built: `CF-IPCountry` only, uppercased, with anything that is not two letters A–Z recording `XX`. That covers Cloudflare's own `XX` and `T1` (Tor). The Event Recorder never calls Phase 2's Visitor location lookup, which would let `x-country` win and turn unknown into US. Local tests keep setting the country through that header (story 32).
- The spec's test 4 gains its other three Visitors, alongside 34's Visitor with no header: `CF-IPCountry: T1`, `x-country: SI` with `CF-IPCountry: DE`, and `CF-IPCountry: US`.
- After Phase 5's switch, the spec's post-switch lines run, as the Operator's `# manual:` check. Phase 5's runbook proxies ofl.ink and every Spare Domain through Cloudflare with IP Geolocation on, and this Phase adds no Cloudflare step of its own:

  ```sh
  curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'CF-IPCountry: ZZ' https://ofl.ink/v/<a Username>
  ```

  It should answer 204, and the newest Event for that Profile (admin UI) should show this machine's real country, not `ZZ` or `XX`. If Events still show `XX`, the fallback is Cloudflare dashboard → ofl.ink → Network → IP Geolocation on, with a token holding Zone Settings:Edit for the API route. If the probe's Event reads `ZZ`, Cloudflare does not overwrite a client's header, the country numbers cannot be trusted, and the source goes back to the human.
- Reveal's and the ping's limits key on the Visitor's own address once ofl.ink is Proxied. Phase 5 owns that (its story 19). The ping reads the client address where Reveal's limiter does, so one fix covers both.

The geo-IP alternative (a country database on the VPS behind a test seam) is not built: plan §11 chose Cloudflare.

ASSUMPTION: the post-switch check waits for Phase 5's switch, which is not ticketed yet, so Blocked by names only this Phase's gate. The Phase 5 Tickets pass appends its switch ticket here as `NN: Title`, as 11 was left for Phase 2's deploy ticket (rung 3). Overturned if Phase 5's tickets land without that edit. Then this ticket must be checked by hand against Phase 5's switch before its last criterion is ticked.

ASSUMPTION (the spec's): every production Event records `XX` until the switch, because v2 has no live traffic before Cutover and nothing proxies it (rung 5). Overturned if the Operator wants real countries on v2's VPS host before Cutover. That host then needs its own Proxied record.

- [x] The human's answer is recorded here with the output that settled it: Cloudflare (plan §11, 2026-10-04; `dig +short NS ofl.ink` → `dns1/dns2.registrar-servers.com`, no DS record).
- [ ] Test 4 passes with its four Visitors. The Countries table shows "Unknown" +2, `DE` +1 and `US` +1, and `SI` and `T1` gain none.
- [ ] No Event records US for an unknown country, and the Event Recorder never calls Phase 2's Visitor location lookup.
- [ ] The spec's whole local Acceptance block exits 0 under `set -e`, test 4 complete.
- [ ] `# manual:` (the Operator) After Phase 5's switch, a Page View from a phone on mobile data appears in that Creator's Stats under its real country. The `ZZ` probe also answers 204 and its Event shows this machine's real country.
