# Phase 05 — Cutover and domains

**Objective.** ofl.ink is served by v2 from the VPS, with Netlify kept as a cold backup. A Creator's Custom Domain shows their Profile. At least one Spare Domain is ready to serve every Profile once ofl.ink is Flagged.

## Problem Statement

Visitors still reach v1 on Netlify. v2 runs on the VPS, but nobody gets there until ofl.ink's DNS moves, and the Operator has no written, reversible way to move it. Every Profile also lives under the one domain ofl.ink. When Meta Flags ofl.ink, every Creator's bio link breaks at once, and there is nowhere to send them. Plan section 4 calls this the riskiest assumption in the project. Creators who own a domain cannot use it: v1 has no Custom Domains (plan section 1), and the link.me Template has no screen for them (`link.me/**/*.html` mentions "domain" only inside a Meta pixel URL).

## Solution

The Operator follows a Cutover runbook in `RUN.md`. It records the current DNS, lowers the TTL, checks that v2 is ready, changes the ofl.ink records to point at the VPS, checks the result, and says how to roll back. That is the whole Cutover: Caddy and the app need no change on the day. Netlify stays untouched for a month and is then turned off.

Caddy gets a certificate for a hostname the first time someone visits it, and only after asking the app whether the hostname is ofl.ink's own, a Spare Domain or a Custom Domain. Giving a Creator a domain then takes two steps: the Creator points an A record at the VPS, and the Operator types the domain into the Creator's Profile in PocketBase. No deploy is needed. A Spare Domain works the same way: buy it, point it at the VPS, list it in PocketBase, and open it once so its certificate is issued.

The domain types behave as follows:

- **Custom Domain.** It stands in for `ofl.ink/{username}`.
- **Spare Domain.** It serves every Profile at the same paths as ofl.ink.
- **All of them.** A Profile page never loads anything from another of ofl.ink's domains, so a Flagged ofl.ink does not drag the other domains down with it.

## User Stories

Cutover

1. As the Operator, I want a Cutover runbook in `RUN.md` with exact commands in order, so that I can switch ofl.ink to v2 in one sitting without guessing.
2. As the Operator, I want to record every current DNS answer for ofl.ink before changing anything, so that a rollback restores exactly what v1 had.
3. As the Operator, I want to lower the TTL of the ofl.ink records a day ahead, so that the switch and any rollback take effect within minutes.
4. As the Operator, I want a readiness gate before the switch, so that I switch only once v2 shows every v1 Profile identically. The gate is three checks: Phase 2's parity check passes against the VPS, the TLS Ask endpoint on the VPS says yes to ofl.ink, and ports 80 and 443 are open.
5. As the Operator, I want no n8n Form submissions between the final v1 Import and the switch, so that no v1 edit is lost on the way to v2.
6. As the Operator, I want the Cutover to be a DNS change only, with nothing in Caddy or the app changing on the day, so that rolling back is the same DNS change in reverse.
7. As a Visitor, I want every ofl.ink URL already in a bio to keep working after the Cutover, so that tapping a Creator's bio link still opens their Profile. That covers `ofl.ink/{username}`, `ofl.ink/{username}/{code}` and Link Shortcuts.
8. As the Operator, I want post-switch checks, so that I know ofl.ink is now served by v2 and the v1 secrets path stays dead. The checks are: the A record shows the VPS, HTTPS answers 200 with `Server: Caddy`, the certificate was issued, and `secrets.json` does not answer 200.
9. As the Operator, I want to re-run the real-device test matrix from plan section 4 on ofl.ink after the switch, so that every Mode still works inside each In-App Browser.
10. As the Operator, I want a rollback procedure that restores the recorded DNS answers, so that Visitors get v1 back within one TTL if v2 misbehaves.
11. As the Operator, I want v1 on Netlify left serving for 30 days after the Cutover, so that the rollback has somewhere to go.
12. As the Operator, I want a dated step that turns Netlify off after those 30 days without losing the ofl.ink DNS zone, so that v1 stops costing attention and DNS stays intact.

Custom Domains

13. As a Creator, I want my own domain to show my Profile at its root, so that my bio carries my brand instead of ofl.ink.
14. As a Creator, I want `mydomain.com/{code}` to carry a Tracking Code exactly as `ofl.ink/{username}/{code}` does, so that OnlyFans attribution still works on my domain.
15. As a Creator, I want `mydomain.com/?link={Link Id}` to work as a Link Shortcut, so that I can share a single Link on my own domain.
16. As a Visitor on a Custom Domain, I want the Age Gate, Reveal, redirect, Escape and Escape Overlay to behave exactly as on ofl.ink, so that the domain changes nothing but the address.
17. As a Visitor on a Custom Domain or Spare Domain, I want the page to load nothing from ofl.ink or any other domain of ofl.ink's, so that it keeps working when ofl.ink is Flagged.
18. As the Operator, I want to give a Profile its Custom Domain by filling one field in the PocketBase admin UI, with no deploy and no Caddy edit, so that adding a domain takes a minute.
19. As the Operator, I want HTTPS for a Custom Domain issued automatically on its first visit, so that I never handle certificates by hand.
20. As the Operator, I want Caddy to obtain certificates only for hostnames the app knows, so that a stranger pointing a domain at the VPS cannot make Caddy issue certificates and use up the CA's rate limits.
21. As the Operator, I want each domain to belong to at most one Profile, so that two Profiles can never claim the same Custom Domain.
22. As the Operator, I want a Custom Domain that is mistakenly set to ofl.ink or a Spare Domain to be ignored rather than take that domain over, so that a typo cannot replace every Profile with one.
23. As the Operator, I want to be the only one who can set a Custom Domain, so that no Creator can claim a domain they do not own.
24. As a Creator, I want the runbook to tell me the one DNS record to create (A record to the VPS's address), so that I can point my domain myself.
25. As a Visitor on a Custom Domain, I want Reveal to answer the page's own origin there, so that Adult Links open on that domain as well. ADR 0004 reads "own origin" as same-origin rather than an ofl.ink allow-list.
26. As the Operator, I want a Reveal call from another origin refused on a Custom Domain too, so that its Destinations get the same obfuscation as on ofl.ink.

Spare Domains

27. As the Operator, I want to buy at least one Spare Domain before the Cutover is complete, so that one is ready when ofl.ink is Flagged.
28. As the Operator, I want to list Spare Domains in PocketBase, so that a new Spare Domain starts serving without a deploy.
29. As a Visitor, I want every Spare Domain to serve every Profile at the same paths as ofl.ink, so that rotating domains only means replacing "ofl.ink" in bio links.
30. As the Operator, I want each Spare Domain pointed, certified and checked before it is needed, so that rotating to it is instant.
31. As the Operator, I want the list of Spare Domains and Custom Domains kept out of PocketBase's public API, so that nobody can enumerate the domains that would be Flagged next.
32. As the Operator, I want a written rotation procedure for the day ofl.ink is Flagged, so that Creators move their bio links to a Spare Domain the same day.

Testing

33. As the implementing agent, I want Custom Domain and Spare Domain behaviour testable locally over plain HTTP with `.test` hostnames, so that this Phase passes `./check.sh` with no real DNS, no CA and no VPS.

## Implementation Decisions

- **Owns.**
  - **Host Resolution.** A new app module.
  - **TLS Ask endpoint.** A new app route.
  - **Public page bootstrap.** The public page now learns its Username from the app.
  - **Domains schema.** One new field on Profiles and one new collection.
  - **Caddy configuration.** The site address changes to an on-demand catch-all. The routes behind it do not change.
  - **Seed.** Phase 2's seed gains the test domains.
  - **Cutover runbook.** A Cutover section in `RUN.md`.
- **Interfaces.**
  - **Host Resolution** turns a request's Host header into a host kind and, for page requests, a Profile identity. Hostnames are lower-cased and lose any port and trailing dot before matching. Matching is exact.
    ```ts
    type HostKind = 'primary' | 'spare' | 'custom' | 'unknown';
    resolveHost(host: string): Promise<{ kind: HostKind; username?: string }>; // username only when kind = 'custom'
    resolveProfileRequest(host: string, path: string):
      Promise<{ username: string; trackingCode: string | null; profilePath: string } | null>;
    ```
    - The kind is checked in this order: `primary` (the `PRIMARY_HOSTS` setting), then `spare` (the Spare Domains collection), then `custom` (a Profile's Custom Domain). Anything else is `unknown`.
      ASSUMPTION: collisions are settled by this precedence rather than by validating on save (rung 5: no hook or cross-collection check needed). A Custom Domain equal to ofl.ink or to a Spare Domain is simply never reached. Overturned if the Operator wants such a typo rejected when it is saved.
    - On a `custom` host, `/` means that Profile and `/{code}` means that Profile with that Tracking Code; `profilePath` is `/`. Deeper paths get whatever response Phase 2 gives an unknown Username.
      ASSUMPTION: a Custom Domain stands in for exactly `ofl.ink/{username}` and never serves another Profile (rung 5: the smallest grammar that covers stories 13–15). Overturned if Creators need `/{username}` paths on their own domain.
    - On every other host the grammar stays `/{username}[/{code}]` and `profilePath` is `/{username}`. That includes `unknown` hosts.
      ASSUMPTION: unknown hosts are not turned away by the app (rung 4: no new gate that could take Phase 2's pre-Cutover VPS hostname dark). Caddy refusing them a certificate is what keeps them off HTTPS. Overturned if plain-HTTP serving on stray hostnames turns out to matter.
    - Host Resolution queries PocketBase on every request that is not for a primary host. There is no cache.
      ASSUMPTION: rung 5, and it matches Phase 2's "an edit in PocketBase admin is live instantly". Overturned if load makes a short cache necessary.
  - **TLS Ask endpoint** `GET /internal/tls-ask?domain=<hostname>`:
    - 200 with an empty body when `resolveHost` gives `primary`, `spare` or `custom`
    - 404 for `unknown`
    - 400 when `domain` is missing or not a hostname
    - 503 when PocketBase cannot be reached, which also means "no"

    The route matches before the Profile catch-all and is reachable on every host. That exposes only whether a hostname is served by ofl.ink, which public DNS already shows.
    ASSUMPTION: the path `/internal/tls-ask` is chosen to stay clear of `/api` (PocketBase) and `/r` (rung 6). Phase 3's reserved-Username list should include `internal`. Overturned by a route-naming convention set in Phase 2.
  - **Public page bootstrap.** The app embeds the result of `resolveProfileRequest` in each Profile page it serves (`username`, `trackingCode`, `profilePath`). The public page script reads it there instead of parsing `location.pathname`. Today `script.js:46-50` takes the Username from the first path segment and falls back to `juliafilippo_` on `/`, which would show the wrong Profile on a Custom Domain's root. Any URL the page builds for itself is rebuilt from `location.origin` + `profilePath`: address-bar cleanup, Escape targets and anything carrying a Tracking Code. Nothing the page loads or builds names ofl.ink. v1 already calls the profile JSON and Reveal through host-relative URLs (`script.js:67`, `:85`, `:233`), so origin-agnostic calls are house practice.
    ASSUMPTION: embedding the identity in the served page beats an extra lookup call (rung 5: no extra round trip). Overturned if Phase 2 already renders Profile data on the server, in which case Host Resolution feeds that render.
- **Schema.**
  ```
  profiles.customDomain   text, optional, max 253, hidden from the public API,
                          pattern ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$
                          unique index WHERE customDomain != ''
  spareDomains            base collection; list/view/create/update/delete rules all null (superusers only)
    domain                text, required, max 253, same pattern, unique index
  ```
  The pattern contains no look-ahead because PocketBase's patterns are Go regular expressions. Punycode (`xn--…`) domains pass.
  - **Who can set a Custom Domain.** Phase 3's update rule on Profiles gains a clause that refuses any Creator request setting `customDomain`. Only the Operator sets it, as a superuser in the PocketBase admin UI. There is no Editor field for it.
    ASSUMPTION: Operator-only is easier to loosen later than to take back (rung 4). Overturned if D9 resolves to public sign-up with self-serve Custom Domains.
  - **Keeping the domains private.** `customDomain` is hidden and `spareDomains` is superuser-only, which is PocketBase's default for null rules.
    ASSUMPTION: chosen as the more closed option (rung 4). The app already needs privileged PocketBase access to read Destinations (ADR 0002, ADR 0004), so it can still read both. Overturned if the Editor must show a Creator their own Custom Domain.
  - ASSUMPTION: the names `customDomain`, `spareDomains` and `PRIMARY_HOSTS` follow the camelCase of the plan's `isAdult` (rung 3). Overturned by Phase 2's naming.
- **Contracts.**
  - **Caddy to the app.** Observed with the local `caddy:2-alpine` image (v2.11.4) on an isolated Docker network on 2026-10-02 (rung 1):
    - Before issuing a certificate during a TLS handshake, Caddy calls `GET <ask URL>?domain=<SNI hostname>`.
    - On 200 it issues the certificate. On 404 it fails the handshake.
    - A config whose only HTTPS site is an on-demand catch-all starts without contacting any CA, so the same Caddyfile is safe to run in the local loop.
  - **Caddy configuration.**
    - A global on-demand TLS policy points at the TLS Ask endpoint over the compose network.
    - One `https://` catch-all site uses on-demand TLS and carries the same routes as Phase 2's public site.
    - The local loop's plain-HTTP listener on the baseURL port accepts any Host header.
    - Caddy's reverse proxy passes the original Host header to the app. The Playwright spec checks this.
  - **`PRIMARY_HOSTS`.** A comma-separated app setting:
    - production: `ofl.ink`, plus `www.ofl.ink` if it exists, plus Phase 2's pre-Cutover VPS hostname if that hostname is served through the catch-all
    - local: `localhost`
  - **ofl.ink's certificate.** ofl.ink itself gets its certificate on demand, so the Cutover changes nothing in Caddy.
    ASSUMPTION: chosen because a fixed site block for ofl.ink would fail ACME validation until DNS moves and could leave Caddy in retry backoff at the moment of the switch (rung 4: the Cutover stays a pure DNS change). Overturned if a few seconds of certificate issuance for the first Visitor after the switch is unacceptable. In that case a fixed block is added right after DNS moves.
  - **Seed.** Phase 2's seed additionally sets the Fixture Profile's `customDomain` to `creator.test` and adds a Spare Domain `spare.test`. `unknown.test` stays unseeded. `.test` is a reserved top-level domain, so none of these names can resolve on the public internet.
- **What does not change per host.** Reveal and the `/r/:linkId` redirect behave the same on every host and are not limited to the host's own Profile.
  ASSUMPTION: rung 5. Overturned if a Custom Domain must refuse other Profiles' Link Ids.
  A Profile also stays reachable at `ofl.ink/{username}` after it gets a Custom Domain, with no redirect.
  ASSUMPTION: rung 5. Overturned if Creators want ofl.ink to send Visitors on to their Custom Domain.
- **Spare Domains are always live.** Every listed Spare Domain serves every Profile at all times. Rotating means people replace ofl.ink in bio links, and nothing in v2 changes. There is no "active domain" flag.
  ASSUMPTION: rung 5. Overturned if v2 must redirect from, or display, a currently active domain.
- **DNS records.** Custom Domains, Spare Domains and ofl.ink get A (and AAAA) records pointing at the VPS's address, never a CNAME through a CDN proxy. ADR 0001 says domains "point at this VPS's address".
  ASSUMPTION: the records are DNS-only, with no CDN proxy (rung 3, from ADR 0001). Overturned if Phase 4 takes Visitor country from a Cloudflare header, which would put ofl.ink behind Cloudflare.
- **Cutover runbook.** A `## Cutover` section in `RUN.md` at the repo root holds the `# manual:` steps of the Acceptance block below, in that order, with blanks for the recorded DNS answers and the dates. The plan names `RUN.md` as the home of manual items (plan section 7).
  ASSUMPTION: `RUN.md` sits at the repo root beside `check.sh` (rung 3). Overturned if Phase 1 or 2 already placed it elsewhere.
- **Freezing v1 edits.** The n8n Form is not changed (D1). The Operator stops submitting it from the final v1 Import until the switch. After the Cutover, edits made through it reach only the Netlify cold backup.
  ASSUMPTION: rung 5, with D1. Overturned if v1 Import is made re-runnable right before the switch.
- **Turning Netlify off.** 30 days after the Cutover, "off" means removing ofl.ink from the Netlify site's domains and stopping builds. Deleting the site is the Operator's separate and irreversible decision. Until then `linkmeclone3.netlify.app` (the address shown in the n8n Form's texts) keeps serving the frozen v1.
  ASSUMPTION: rung 4. Overturned if the Operator wants the site deleted outright.

## Testing Decisions

- **One seam.** The Playwright spec `tests/e2e/05-domains.spec.ts` runs against the local stack on the existing baseURL (`http://localhost:4173`), through the same `./check.sh` loop.
  - At file level it launches Chromium with `--host-resolver-rules=MAP *.test 127.0.0.1`. The browser then sends real `creator.test:4173` / `spare.test:4173` Host headers over plain HTTP. Checked on 2026-10-02 against `tests/dev-server.mjs`: Chromium loaded `http://creator.test:4199/juliafilippo_`.
  - Playwright's `request` fixture does **not** use that mapping (`getaddrinfo ENOTFOUND`, observed). So Host-routing checks go through `page` only, and TLS Ask checks go through `request` against the baseURL with `?domain=`.
  - `playwright.config.ts` is unchanged.
- **Behaviour the spec asserts:**
  1. **TLS Ask.** It answers 200 for `creator.test`, `spare.test` and `localhost`, something other than 200 for `unknown.test`, and 400 when `domain` is missing.
  2. **Custom Domain root and Tracking Code.**
     - `creator.test/` shows the Fixture Profile's display name and Link cards.
     - `creator.test/{code}` shows the same Profile.
  3. **Same Destination from every host.** The comparison is between `creator.test/{code}` and `localhost/{username}/{code}`, and it asserts behaviour rather than parameter names:
     - The Adult Link's Reveal request goes to the page's own host, answers 200, and carries the same query as the one sent from the localhost page.
     - The Direct Mode Link ends at the same Destination from both pages.
     - Navigation to the Destination is intercepted, as in `00-smoke`.
  4. **Spare Domain.** `spare.test/{username}` shows the Fixture Profile.
  5. **No cross-domain loads.** On `creator.test` and `spare.test`, no request goes to another of ofl.ink's hosts (`localhost:4173`, the other `.test` host). Third-party hosts are left alone: v1's `index.html:9` and `:42` load `cdnjs.cloudflare.com` and `upload.wikimedia.org`.
  6. **Cross-origin Reveal refused.** A `fetch` from a page on `creator.test` to Reveal on `spare.test:4173` cannot be read by the page (ADR 0004 same-origin).
- **One wiring check outside Playwright, in the Acceptance block.** It reads the ask URL from Caddy's own adapted config and calls it from inside the Caddy container. That catches a wrong ask URL, which nothing else short of production would show. It is the only non-Playwright check.
- **Not tested locally.** Real certificate issuance, live DNS and real devices. They are `# manual:` steps.
- **Prior art.** `tests/e2e/00-smoke.spec.ts`. It intercepts Reveal with `page.route` and fulfils navigation to a harmless page, overrides the User-Agent with `test.use`, and targets the `#displayName` and `.link-card` selectors.

## Acceptance

```sh
# --- automated, local, plain HTTP ---
# Phase 2's stack plus its seed (plan section 7): Fixture Profile with customDomain creator.test, Spare Domain spare.test.
docker compose up -d --wait

# The exact ask URL Caddy is configured with says yes to known hosts and no to unknown ones, called from inside Caddy.
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
ASK=$(docker compose exec -T caddy caddy adapt --config /etc/caddy/Caddyfile \
  | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).apps.tls.automation.on_demand.permission.endpoint')
docker compose exec -T caddy wget -q -O /dev/null "$ASK?domain=creator.test"
docker compose exec -T caddy wget -q -O /dev/null "$ASK?domain=spare.test"
if docker compose exec -T caddy wget -q -O /dev/null "$ASK?domain=unknown.test"; then echo "ask allowed an unknown host" >&2; exit 1; fi

npx playwright test tests/e2e/05-domains.spec.ts
grep -q '^## Cutover' RUN.md

# --- needs the human (floor 2: live DNS, the real VPS, Netlify, purchases) ---
# manual: deploy this Phase to the VPS by Phase 2's deploy procedure, with PRIMARY_HOSTS=ofl.ink in the VPS compose env (add www.ofl.ink if the next step shows it exists).
# manual: record v1's DNS answers in RUN.md for rollback:
#   dig +short NS ofl.ink; dig +short A ofl.ink; dig +short AAAA ofl.ink; dig +short CNAME www.ofl.ink; dig +short A www.ofl.ink
# manual: at the DNS host the NS answer names (*.nsone.net = Netlify DNS), set the TTL of the ofl.ink and www records to 300, at least 24 h before the switch.
# manual: readiness on the VPS: Phase 2's parity check passes against the VPS URL; then, in the v2 directory on the VPS, run the ASK= line above and:
#   docker compose exec -T caddy wget -q -O /dev/null "$ASK?domain=ofl.ink"
# manual: from the Mac: nc -zv "$VPS_IPV4" 80 && nc -zv "$VPS_IPV4" 443
# manual: buy at least one Spare Domain (payment); A record -> $VPS_IPV4; add it to spareDomains in the PocketBase admin UI; warm and check it:
#   curl -sI "https://$SPARE/$USERNAME" | head -1    # expect 200; the first call issues the certificate
# manual: stop submitting the n8n Form; run the final v1 Import (Phase 2); re-run the parity check.
# manual: switch: at the DNS host, replace the ofl.ink apex record(s) (Netlify NETLIFY/ALIAS/A) with A ofl.ink -> $VPS_IPV4
#   (AAAA -> $VPS_IPV6 only if the VPS has IPv6, else delete AAAA); point www.ofl.ink at ofl.ink if it existed.
# manual: verify (first curl issues the ofl.ink certificate):
#   dig +short A ofl.ink @1.1.1.1                                              # expect $VPS_IPV4
#   curl -sI "https://ofl.ink/$USERNAME" | grep -i '^server: caddy'
#   test "$(curl -s -o /dev/null -w '%{http_code}' https://ofl.ink/netlify/functions/secrets.json)" != 200
#   docker compose logs caddy | grep -i 'certificate obtained successfully' | grep -q ofl.ink   # on the VPS
# manual: real-device matrix (plan section 4) on https://ofl.ink/$USERNAME for every Mode, inside Instagram, Facebook, Threads and TikTok on iOS and Android.
# manual: rollback if any verify step fails: restore the recorded records at the DNS host; v1 on Netlify answers again within one TTL.
# manual: first Custom Domain: the Creator sets A $DOMAIN -> $VPS_IPV4; the Operator sets that Profile's customDomain in the PocketBase admin UI; then:
#   dig +short A "$DOMAIN"; curl -sI "https://$DOMAIN/" | head -1             # expect $VPS_IPV4, then 200
# manual: when ofl.ink is Flagged: the Operator and Creators replace ofl.ink with a warmed Spare Domain in every bio link; nothing in v2 changes.
# manual: Cutover + 30 days: if NS is Netlify DNS, keep the zone (or move NS to the registrar first); in Netlify remove ofl.ink under
#   Domain management and stop builds; deleting the site (netlify sites:delete) is a separate Operator decision.

./check.sh
```

## Depends on

- **Phase 2.** Provides:
  - the Docker Compose stack, with Caddy owning ports 80/443 on the VPS beside n8n, the Node app serving Profile pages, Reveal and `/r/:linkId`, and PocketBase with the `profiles` collection
  - the Caddyfile at the image default `/etc/caddy/Caddyfile`
  - the local `docker compose up` loop on `http://localhost:4173` with the seed and Fixture Profile
  - the v1 Import
  - the parity check that gates the Cutover ("linkme VPS URL serves every existing Profile identically")

  ASSUMPTION: the Caddyfile path and the baseURL port carry over from the image default and plan section 7. Overturned by Phase 2's compose file, whose values the Acceptance then uses.
- **Phase 0.** v1 with `secrets.json` no longer served. The cold backup and any rollback target must be that fixed v1.
- **Phase 1.** The Mode and Escape code in the public page, which the bootstrap change and the post-switch real-device matrix both cover.
- **Phase 3.** The Profiles update rule that this Phase extends with the Operator-only `customDomain` clause, and the reserved-Username list that should include `internal`.
- **Phase 4.** Order only: the plan builds Phase 5 last. Its choice of where Visitor country comes from decides whether ofl.ink's records stay DNS-only (see the DNS records decision).

## Out of Scope

- **Proxies (D7).** The plan marks them as a bonus after Phase 5. If D7 means rotating domains, the Spare Domains here already cover it with no extra code.
- **Editor field for Custom Domains.** The Operator sets the field in the PocketBase admin UI. D9 is still open, and a self-serve field would need ownership checks.
- **DNS ownership verification (TXT challenge) before a domain is accepted.** Only the Operator can set a domain, which makes the check redundant.
- **Automatic detection that ofl.ink is Flagged, and automatic rotation.** The plan treats rotation as a human act, and Meta offers no signal to watch.
- **An "active domain" setting, or Editor share URLs that follow it.** Nothing in the plan displays or redirects by domain.
- **Buying domains through a registrar API.** That is a payment, so human-only under floor 2. One purchase does not justify automation.
- **Pairing `www` and apex for Custom Domains automatically.** Exact hostnames only; a Creator who wants both asks again.
  ASSUMPTION: rung 5. Overturned if most Creators turn out to need both.
- **More than one Custom Domain per Profile.** Not asked for.
- **A 404 gate for unknown hosts.** Caddy's ask refusal already keeps them off HTTPS (see Host Resolution).
- **Limiting Reveal and `/r` to the host's own Profile.** No threat is served by it.
- **Removing the "Powered by ofl.ink" footer text on Custom and Spare Domains.** It is text pointing at a host-relative `landing.html` (`index.html:55`), not a link to ofl.ink.
  ASSUMPTION: rung 5. Overturned if Meta is seen flagging pages on the text alone.
- **End-to-end TLS in `./check.sh` using Caddy's internal CA.** It works (it was observed in the probe above), but it would add a 443 listener and certificate trust to the local loop. The caller's guidance is plain HTTP, with certificate issuance left manual.
- **Changing the n8n Form's texts or flow.** D1: n8n stays as it is.
- **Deleting the Netlify site, the GitHub repo or v1 data.** Irreversible, and left to the Operator.
- **Bonus items** (geo-rules UI, ffmpeg, Umami). The plan places them after Phase 5.

## Further Notes

- ASSUMPTION (evidence blocked): which provider hosts ofl.ink's DNS, and whether `www.ofl.ink` exists, are both unknown, because reading live DNS is barred by floor 2. The runbook's `dig` step settles both before anything is changed. Overturned by that step's output.
- ASSUMPTION: a 300-second TTL set at least 24 hours before the switch bounds both the switch and a rollback to about five minutes (rung 4). Overturned if the DNS host enforces a higher minimum TTL.
- ASSUMPTION: one Spare Domain is enough to call Spare Domains "ready" (rung 5: smallest that meets "spare domains ready"). Overturned if the Operator wants several held at once.
- Evidence placed for this Phase:
  - **v1 Netlify config.** `linkme_clone3/netlify.toml` holds no domain configuration, only a catch-all rewrite to `index.html`.
  - **n8n export.** `n8n_oflink_Feb18.json` has no domain handling. Its form texts name `https://ofl.ink/{ID}` and `https://linkmeclone3.netlify.app/{ID}`.
  - **v1 code.** No v1 code hard-codes ofl.ink apart from the footer text.
