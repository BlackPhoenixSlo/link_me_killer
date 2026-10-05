# 42: Visitor location trusts only the production country source and ofl.ink's DNS is ready for a one-record switch

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 2, 3, 18, 19
Seams: offline, the local Caddy image in front of a header-echo upstream (as the spec's review observed, D2a), and `./check.sh`; live, the Operator's terminal, the Namecheap registrar and the Cloudflare dashboard (plan §11). The lines of `RUN.md`'s `## Cutover` that rest on the country source
Blocked by: 41: Caddy asks the app before every certificate and the Cutover runbook is written
Status: done

**What to build:** Geo Rules and Stats get the Visitor's country and US state only from the production country source, never from a header the Visitor sends, and Reveal's rate limit keys on the Visitor's own address. ofl.ink's DNS is made ready, at least 48 hours ahead, for a switch and a rollback that are each one record change taking effect within minutes, while v1 keeps serving. This ticket holds every Cloudflare-specific part of the Phase. Host Resolution, the TLS Ask, the page, the Domains schema, Custom and Spare Domain serving, backups, the freeze, the final import and the hand-over do not wait for it.

**Decided** (plan §11, 2026-10-04, rung 2): Cloudflare's header. The Operator observed `dig +short NS ofl.ink` → `dns1/dns2.registrar-servers.com` (Namecheap) and no DS record, so no DNSSEC. Geo Rules on DNS-only Custom Domains fall back to US, which plan §11 accepts. Ticket 37 builds on the same answer for Events.

Who does what. The design, the Caddy lines and their offline tests are agent work, and `./check.sh` proves them. The live steps are the Operator's `# manual:` steps, which no agent runs (floor 2): step 2's live reads, filling the ranges setting at step 1, and the zone move from Namecheap to Cloudflare at step 3.

**Step 2 and v1's headers:**
- `# manual:` the runbook's step 2 runs here, first, by the Operator: every record of the ofl.ink zone goes into `RUN.md` as the DNS host lists it (type, name, value, TTL), NETLIFY and ALIAS records included, then the live answers, any DS record and the registrar. It reads only, and it is the zone move's input.
- v1's location headers (`X-Country`, `X-Region`, `X-NF-Subdivision-Code`) are removed from every request on the production catch-all, because Phase 2 reads them first and they pass through Cloudflare untouched. The local listener keeps passing them, because Phase 2's parity spec and Phase 4's Stats spec inject them locally.

**Cloudflare (plan §11; the spec as written):**
- The Cloudflare lines on the production catch-all only: Caddy trusts Cloudflare's published ranges, from the ranges deploy setting, parsed strictly from the right; the forwarded-for header the app sees is replaced by that one client address; and from any direct peer outside the ranges `CF-IPCountry` and `CF-Region-Code` are removed, so a Visitor reaching a DNS-only Custom Domain records the unknown country. From Cloudflare's ranges both pass through in the form Phases 2 and 4 read. The Operator fills the setting at step 1 (`# manual:`) with:

  ```sh
  { curl -s https://www.cloudflare.com/ips-v4; echo; curl -s https://www.cloudflare.com/ips-v6; } | xargs
  ```
- On the VPS, behind Traefik's TLS passthrough (plan §11), the direct peer these lines match is the address Traefik's PROXY protocol header names (ticket 23; Phase 5 spec, The Cloudflare lines). The offline checks below run on the local Caddy image, which has no Traefik in front.
- `# manual:` the Operator moves the zone from Namecheap to Cloudflare at least 48 hours before the switch (step 3). Every record of step 2 is re-created DNS-only, TTL 300 on the apex and `www`; NETLIFY or ALIAS records become an apex CNAME to `linkmeclone3.netlify.app`. Nothing in the Netlify site is changed.

The geo-IP alternative (a country database on the VPS, records left at the current DNS host) is not built: plan §11 chose Cloudflare.

ASSUMPTION: this ticket gates ticket 43 and ticket 37 waits for it, so step 2 runs here and nothing in 43 blocks this ticket back (rung 4: run 1's two runbook tickets blocked each other). Overturned if ofl.ink's zone changes before the switch; 43 then records it again, which only reads.
ASSUMPTION (the spec's, evidence blocked): Cloudflare overwrites a Visitor-sent `CF-IPCountry` and `CF-Region-Code` on proxied requests. Overturned by step 7's probe through the Spare Domain; a forged value that survives Cloudflare goes back to the human.

- [ ] `# manual:` (the Operator) Step 2 is recorded in `RUN.md`: every record of the zone as the DNS host lists it, then the output of:

  ```sh
  dig +short NS ofl.ink; dig +noall +answer ofl.ink A ofl.ink AAAA www.ofl.ink CNAME www.ofl.ink A www.ofl.ink AAAA; dig +noall +answer DS ofl.ink; whois ofl.ink | grep -i registrar
  ```
- [x] The human's answer is recorded here with the `dig` output that settled it: Cloudflare (plan §11, 2026-10-04; `dig +short NS ofl.ink` → `dns1/dns2.registrar-servers.com`, no DS record).
- [x] Offline on the local Caddy image: a request with v1's three location headers reaches the upstream without them through the production catch-all, and with them through the local listener. Phase 2's parity spec and Phase 4's Stats spec still pass, and `./check.sh` passes.
- [x] Offline, with the ranges set to the test network for the check, a trusted peer sending `X-Forwarded-For: 6.6.6.6, 1.2.3.4` reaches the upstream as `1.2.3.4` alone; an untrusted peer reaches it as its own address with no `CF-IPCountry` or `CF-Region-Code`; and a trusted peer's `CF-IPCountry` and `CF-Region-Code` pass unchanged.
- [ ] `# manual:` (the Operator) at least 48 hours before step 8, step 3 moves the zone from Namecheap: add ofl.ink to a Cloudflare account; re-create every record from step 2 DNS-only, TTL 300 on the apex and `www`; SSL/TLS mode Full (strict); Always Use HTTPS off; Network → IP Geolocation on; Rules → Transform Rules → Managed Transforms → Add visitor location headers on; write the Cloudflare records into `RUN.md` as the rollback target. If step 2 printed a DS record, turn DNSSEC off at the registrar first and wait until `dig +short DS ofl.ink` prints nothing and that record's TTL has passed. Set the NS at the registrar to the pair Cloudflare names. Once the zone is Active, and only if a DS record existed, turn DNSSEC on in Cloudflare and add its DS record at the registrar. Then:

  ```sh
  dig +short NS ofl.ink                                                                  # Cloudflare's pair
  curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'     # v1 still serves
  ```
- [x] `RUN.md`'s `## Cutover` matches the Cloudflare answer, and ticket 43 can run every step as written.

## Landed

Run 20261005T084628Z. Agent part only; boxes 1 and 5 (# manual: the Operator's step 2 zone record and step 3 zone move) stay unticked. Reviewer APPROVE (round 3 of 3; round 1 blocker: adapt checks duplicated between two scripts, fixed by making tests/caddy-ask.sh the one owner of offline caddy adapt checks with the Cloudflare lines on; round 2 blocker: an untrue header sentence, fixed by the coordinator). Cold ./check.sh --reporter=line: 358 passed, 1 skipped, exit 0. Caddyfile: Cloudflare lines as env-selected snippets keyed on CLOUDFLARE_RANGES (off in tests): drop v1's X-Country/X-Region/X-NF-Subdivision-Code, trusted_proxies static <ranges> + trusted_proxies_strict, X-Forwarded-For {client_ip} alone to the app, CF-IPCountry/CF-Region-Code dropped from peers outside the ranges; ticket 45's proxy_protocol_on now shares one global servers block (Caddy refuses two). compose.yaml shapes CLOUDFLARE_RANGES like PROXY_PROTOCOL_FROM; .env.example carries the spec's curl line for the Operator. tests/cloudflare-lines.sh proves the runtime behaviour offline on the local caddy:2-alpine image with a header-echo upstream (trusted peer: XFF 6.6.6.6, 1.2.3.4 -> 1.2.3.4; untrusted: own address, no CF headers; two ranges IPv4+IPv6). ASSUMPTION: proven over plain HTTP plus adapted-JSON equality of the https:// catch-all's routes and trusted proxies (reviewer's ruling: sufficient; overturned if box 3 requires a TLS request). RUN.md country-source lines confirmed under the Cloudflare answer.
