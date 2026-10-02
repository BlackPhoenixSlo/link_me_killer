# 37: Events carry each Visitor's real country from the production country source

Spec: docs/spec/phase-04-stats.md
Covers: user stories 6, 7, 31, 32
Seams: locally, the running v2 stack at Playwright's baseURL through `./check.sh`, with the Visitor's country set the way the answer gives it: the `CF-IPCountry` header through `extraHTTPHeaders`, or a test seam in front of a geo-IP lookup. In production, after Phase 5's switch, the Operator's terminal, PocketBase's admin UI through an SSH tunnel and a phone on mobile data. The spec's Acceptance block
Blocked by: 36: Only the owner reads a Profile's Stats and recording never blocks a Click or a deletion, 42: Visitor location trusts only the production country source and ofl.ink's DNS is ready for a one-record switch
Status: parked — needs-human: production country source (Cloudflare header or geo-IP on the VPS)

**What to build:** Every Event carries the Visitor's real country in production. Unknown stays "Unknown", never US. This ticket holds everything about Phase 4 that depends on where the country comes from. Events, the ping, `dailyStats`, the Stats page, the Tracking Code key and the owner rules are built in 33–36 and do not wait for it.

**Why parked.** D5 names both sources, and the ladder stops between them (plan-review, Needs the human, item 2). Cloudflare's header needs ofl.ink's live nameservers moved. Geo-IP needs a licensed database download, its refresh and a new dependency. The human settles it with:

```sh
dig +short NS ofl.ink; dig +noall +answer DS ofl.ink
```

If the nameservers are already Cloudflare's, the move costs nothing and Cloudflare wins. If not, the Operator weighs the nameserver move, plus any DNSSEC change, against a geo-IP licence and its monthly refresh.

**If the answer is Cloudflare's header:**
- 33's country function stays as built: `CF-IPCountry` only, uppercased, with anything that is not two letters A–Z recording `XX`. That covers Cloudflare's own `XX` and `T1` (Tor). The Event Recorder never calls Phase 2's Visitor location lookup, which would let `x-country` win and turn unknown into US. Local tests keep setting the country through that header (story 32).
- The spec's test 4 gains its other three Visitors, alongside 34's Visitor with no header: `CF-IPCountry: T1`, `x-country: SI` with `CF-IPCountry: DE`, and `CF-IPCountry: US`.
- After Phase 5's switch, the spec's post-switch lines run. Phase 5's runbook proxies ofl.ink and every Spare Domain through Cloudflare with IP Geolocation on, and this Phase adds no Cloudflare step of its own:

  ```sh
  curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'CF-IPCountry: ZZ' https://ofl.ink/v/<a Username>
  ```

  It should answer 204, and the newest Event for that Profile (admin UI) should show this machine's real country, not `ZZ` or `XX`. If Events still show `XX`, the fallback is Cloudflare dashboard → ofl.ink → Network → IP Geolocation on, with a token holding Zone Settings:Edit for the API route. If the probe's Event reads `ZZ`, Cloudflare does not overwrite a client's header, the country numbers cannot be trusted, and the source goes back to the human.
- Reveal's and the ping's limits key on the Visitor's own address once ofl.ink is Proxied. Phase 5 owns that (its story 19). The ping reads the client address where Reveal's limiter does, so one fix covers both.

**If the answer is geo-IP on the VPS:**
- The same country function looks the client address up in a country database. The two-letter-or-`XX` rule stays, and nothing falls back to US.
- A test seam in front of the lookup replaces the header in the spec's country helper, so tests 1–3 keep their countries. Test 4 is rewritten against the seam: no country, an invalid value, `x-country` ignored, and a real country.
- The database download, its refresh and the new dependency are network steps for the human (floor 2). Their exact commands depend on the database the human picks. This ticket then splits: a parked network ticket holding those commands, and this one for the lookup. The spec's Out of Scope line on VPS geo-IP comes back into this Phase.

ASSUMPTION: the post-switch check waits for Phase 5's switch, which is not ticketed yet, so Blocked by names only this Phase's gate. The Phase 5 Tickets pass appends its switch ticket here as `NN: Title`, as 11 was left for Phase 2's deploy ticket (rung 3). Overturned if Phase 5's tickets land without that edit. Then this ticket must be checked by hand against Phase 5's switch before its last criterion is ticked.

ASSUMPTION (the spec's): under Cloudflare's header, every production Event records `XX` until the switch, because v2 has no live traffic before Cutover and nothing proxies it (rung 5). Overturned if the Operator wants real countries on v2's VPS host before Cutover. That host then needs its own Proxied record.

- [ ] The human's answer is recorded here with the output that settled it.
- [ ] Test 4 passes in the answer's form. Under Cloudflare's header, the Countries table shows "Unknown" +2, `DE` +1 and `US` +1, and `SI` and `T1` gain none.
- [ ] No Event records US for an unknown country, and the Event Recorder never calls Phase 2's Visitor location lookup.
- [ ] The spec's whole local Acceptance block exits 0 under `set -e`, test 4 complete.
- [ ] After Phase 5's switch, a Page View from a phone on mobile data appears in that Creator's Stats under its real country. Under Cloudflare's header, the `ZZ` probe also answers 204 and its Event shows this machine's real country.
