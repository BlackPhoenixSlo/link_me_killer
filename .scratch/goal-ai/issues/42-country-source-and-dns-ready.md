# 42: Visitor location trusts only the production country source and ofl.ink's DNS is ready for a one-record switch

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 2, 3, 18, 19
Seams: offline, the local Caddy image in front of a header-echo upstream (as the spec's review observed, D2a), and `./check.sh`; live, the Operator's terminal, the registrar, and the Cloudflare dashboard or ofl.ink's current DNS host. The lines of `RUN.md`'s `## Cutover` that rest on the country source
Blocked by: 41: Caddy asks the app before every certificate and the Cutover runbook is written
Status: parked — needs-human: production country source (Cloudflare header or geo-IP on the VPS)

**What to build:** Geo Rules and Stats get the Visitor's country and US state only from the production country source, never from a header the Visitor sends, and Reveal's rate limit keys on the Visitor's own address. ofl.ink's DNS is made ready, at least 48 hours ahead, for a switch and a rollback that are each one record change taking effect within minutes, while v1 keeps serving. This ticket holds every Cloudflare-specific part of the Phase. Host Resolution, the TLS Ask, the page, the Domains schema, Custom and Spare Domain serving, backups, the freeze, the final import and the hand-over do not wait for it.

**Why parked.** D5 names "VPS geo-ip or Cloudflare header" and does not choose; the ladder stops between them (plan-review, Needs the human, item 2). Ticket 37 waits on the same answer for Events. The human settles it with read-only commands, which are also the first lines of the runbook's step 2:

```sh
dig +short NS ofl.ink; dig +noall +answer DS ofl.ink
```

If the nameservers are already Cloudflare's, the move costs nothing and Cloudflare wins. If not, the Operator weighs the nameserver move, plus any DNSSEC change, against a geo-IP licence and its refresh.

**Under either answer:**
- The runbook's step 2 runs here, first: every record of the ofl.ink zone goes into `RUN.md` as the DNS host lists it (type, name, value, TTL), NETLIFY and ALIAS records included, then the live answers, any DS record and the registrar. It reads only, it is the evidence above, and it is the rollback target under the geo-IP answer and the zone move's input under Cloudflare's.
- v1's location headers (`X-Country`, `X-Region`, `X-NF-Subdivision-Code`) are removed from every request on the production catch-all, because Phase 2 reads them first and they pass through Cloudflare untouched. The local listener keeps passing them, because Phase 2's parity spec and Phase 4's Stats spec inject them locally.

**If the answer is Cloudflare's header (the spec as written):**
- The Cloudflare lines on the production catch-all only: Caddy trusts Cloudflare's published ranges, from the ranges deploy setting, parsed strictly from the right; the forwarded-for header the app sees is replaced by that one client address; and from any direct peer outside the ranges `CF-IPCountry` and `CF-Region-Code` are removed, so a Visitor reaching a DNS-only Custom Domain records the unknown country. From Cloudflare's ranges both pass through in the form Phases 2 and 4 read. The Operator fills the setting at step 1 with:

  ```sh
  { curl -s https://www.cloudflare.com/ips-v4; echo; curl -s https://www.cloudflare.com/ips-v6; } | xargs
  ```
- The zone moves to Cloudflare at least 48 hours before the switch (step 3). Every record of step 2 is re-created DNS-only, TTL 300 on the apex and `www`; NETLIFY or ALIAS records become an apex CNAME to `linkmeclone3.netlify.app`. Nothing in the Netlify site is changed.

**If the answer is geo-IP on the VPS:**
- A country database on the VPS is read behind Phase 2's Visitor location function, for every host, so Custom Domains get real countries too. Ticket 37 reuses the lookup for Events. The Cloudflare lines, the ranges setting and the trusted proxies are not added, because the direct peer is the Visitor.
- The database download, its refresh and the new dependency are network steps for the human (floor 2). Their exact commands depend on the database the human picks, and are written here before the lookup is built; that part then parks as network.
- Every record stays DNS-only at ofl.ink's current DNS host. The zone does not move and DNSSEC is untouched. The TTL on the apex and `www` drops to 300 at least 48 hours ahead.
- The lines of `RUN.md`'s `## Cutover` that rest on the country source are rewritten for the current DNS host: step 1 loses the ranges line, step 3 becomes the TTL change, step 4 points the Spare Domain DNS-only at its own DNS host, step 7's two header probes become one forged-header probe whose Event shows the Mac's real country, and steps 8, 9 and 13 change records at the current DNS host.

ASSUMPTION: this ticket gates ticket 43 under either answer and ticket 37 waits for it, so step 2 runs here and nothing in 43 blocks this ticket back (rung 4: run 1's two runbook tickets blocked each other). Overturned if ofl.ink's zone changes before the switch; 43 then records it again, which only reads.
ASSUMPTION (the spec's, evidence blocked): Cloudflare overwrites a Visitor-sent `CF-IPCountry` and `CF-Region-Code` on proxied requests. Overturned by step 7's probe through the Spare Domain; a forged value that survives Cloudflare goes back to the human.

- [ ] Step 2 is recorded in `RUN.md`: every record of the zone as the DNS host lists it, then the output of:

  ```sh
  dig +short NS ofl.ink; dig +noall +answer ofl.ink A ofl.ink AAAA www.ofl.ink CNAME www.ofl.ink A www.ofl.ink AAAA; dig +noall +answer DS ofl.ink; whois ofl.ink | grep -i registrar
  ```
- [ ] The human's answer is recorded here with the `dig` output that settled it.
- [ ] Under either answer, offline on the local Caddy image: a request with v1's three location headers reaches the upstream without them through the production catch-all, and with them through the local listener. Phase 2's parity spec and Phase 4's Stats spec still pass, and `./check.sh` passes.
- [ ] Cloudflare: offline, with the ranges set to the test network for the check, a trusted peer sending `X-Forwarded-For: 6.6.6.6, 1.2.3.4` reaches the upstream as `1.2.3.4` alone; an untrusted peer reaches it as its own address with no `CF-IPCountry` or `CF-Region-Code`; and a trusted peer's `CF-IPCountry` and `CF-Region-Code` pass unchanged.
- [ ] Cloudflare, at least 48 hours before step 8, the human runs step 3: add ofl.ink to a Cloudflare account; re-create every record from step 2 DNS-only, TTL 300 on the apex and `www`; SSL/TLS mode Full (strict); Always Use HTTPS off; Network → IP Geolocation on; Rules → Transform Rules → Managed Transforms → Add visitor location headers on; write the Cloudflare records into `RUN.md` as the rollback target. If step 2 printed a DS record, turn DNSSEC off at the registrar first and wait until `dig +short DS ofl.ink` prints nothing and that record's TTL has passed. Set the NS at the registrar to the pair Cloudflare names. Once the zone is Active, and only if a DS record existed, turn DNSSEC on in Cloudflare and add its DS record at the registrar. Then:

  ```sh
  dig +short NS ofl.ink                                                                  # Cloudflare's pair
  curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'     # v1 still serves
  ```
- [ ] geo-IP: Phase 2's Visitor location function reads the lookup for every host, proved locally through a test seam in front of it; a forged `X-Country` or `CF-IPCountry` on the production catch-all does not choose the country, the download and refresh commands are recorded, and at least 48 hours before step 8 the apex and `www` TTL is 300 at the current DNS host (`dig +noall +answer ofl.ink A` shows it).
- [ ] `RUN.md`'s `## Cutover` matches the answer, and ticket 43 can run every step as written.
