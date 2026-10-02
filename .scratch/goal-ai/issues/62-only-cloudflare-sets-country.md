# 62: Behind Cloudflare only Cloudflare decides a Visitor's country and address, and a Visitor who reaches a Custom Domain directly cannot choose them

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user story 6, in part: the country lines go live with this Phase's deploy, so the switch changes nothing in Caddy. The ticket carries the spec's Caddy country lines (Owns, Caddy configuration; Six hats W7 and W8), which ticket 55's step 3 waits on.
Seams:
- The spec's one wiring check outside Playwright, extended to read the country handling in Caddy's adapted config, because no peer in Cloudflare's ranges exists locally.
- The Playwright loop, whose plain-HTTP listener must carry none of the lines.
Blocked by: 60: Caddy asks the app before it issues any certificate… (the HTTPS catch-all these lines sit on); 20: A Click on v2 ends at the same Destination as on v1… (the Visitor location lookup, which reads `x-country`, else `cf-ipcountry`); 45: A Profile load counts as one Page View… (the Event Recorder, which reads them in the same order); 21: Reveal answers only its own origin, and Reveal and `/r` slow down a harvester (Reveal's and `/r`'s limit, keyed on the client address Caddy reports); 54: The Page View ping is rate-limited… (the ping's limit, keyed on the same address)
Status: ready-for-agent

**What to build:** From this Phase's deploy on, the HTTPS catch-all carries the country lines. On ofl.ink and the Spare Domains, the Visitor's country in Geo Rules and Stats is Cloudflare's word. On a DNS-only Custom Domain, nobody can supply it.

- Cloudflare's published ranges are trusted proxies, on the HTTPS catch-all only.
- Every request loses any `X-Country` it carries.
- A request whose direct peer is in Cloudflare's ranges then gets `X-Country` from `CF-IPCountry`.
- From any other peer, `CF-IPCountry` is removed too. A Visitor who reaches a DNS-only Custom Domain directly therefore records `XX`.
- Behind a Cloudflare peer, the client address that the limits on Reveal, `/r` and the ping key on is the Visitor's, as Cloudflare reports it, not Cloudflare's own. A Visitor's own forwarded-for header still cannot choose it (ticket 21's rule). Phase 2's spec gives this as its reason for trusting Cloudflare's ranges.
- The local loop's plain-HTTP listener carries none of these lines, so specs still send their own `x-country`.
- **No network fetch.** The agent does not fetch Cloudflare's ranges. RUN.md's deploy step gains the exact command the Operator runs, `curl -s https://www.cloudflare.com/ips-v4 https://www.cloudflare.com/ips-v6`, and says where its output goes.

ASSUMPTION: the ranges reach Caddy as a value in the VPS's untracked env file, filled at deploy from that command, the way the site address and the primary hosts reach it (rung 3). The test env file holds a documentation-only range, so the config validates locally and no local peer matches (rung 4). Overturned if the Operator wants the list committed to the Caddy config; a human then pastes the fetched list in.

ASSUMPTION (evidence blocked): two things were not observed for this run. One is how the pinned Caddy reports the client address behind trusted proxies, since there is no Cloudflare peer here. The other is which address the limiters of tickets 21 and 54 read, since neither is built. Rung 5: keep to Caddy's own client-address handling. Overturned by the adapted config and the limiters' code; if they disagree, the app reads the address Caddy settles on.

ASSUMPTION: the country lines are checked on Caddy's adapted config, inside the spec's one wiring step, rather than by behaviour. Rung 5: nothing local can act as a Cloudflare peer. Overturned if a local stand-in for a Cloudflare peer becomes cheap.

- [ ] In the wiring step, `caddy validate` passes. On the HTTPS catch-all only, Caddy's adapted config shows:
  - the trusted ranges;
  - `X-Country` removed from every request;
  - `X-Country` set from `CF-IPCountry` under a peer-address match on the ranges;
  - `CF-IPCountry` removed otherwise.

  The plain-HTTP listener carries none of them.
- [ ] On `creator.test`, a Visitor sending `x-country: SI` loads the Fixture Profile. The newest Page View Event for that Profile, read as a superuser over loopback, records `SI`.
- [ ] Phase 2's Geo Rule checks and Phase 4's spec pass unchanged.
- [ ] RUN.md's deploy step holds the range-fetch command and where its output goes.
- [ ] Playwright: extends `tests/e2e/05-domains.spec.ts` (the `x-country` check on the Custom Domain). `./check.sh` passes.
