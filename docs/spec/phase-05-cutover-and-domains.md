# Phase 05 — Cutover and domains

**Objective.** ofl.ink is served by v2 from the VPS while v1 stays untouched as a cold backup. A Creator's Custom Domain shows their Profile, and at least one warmed Spare Domain is ready to serve every Profile once ofl.ink is Flagged.

## Problem Statement

Visitors still reach v1. v2 runs on the VPS, but nobody gets there until ofl.ink's DNS moves, and the Operator has no written, reversible way to move it. The move also has to happen without touching v1: the old GitHub repo, the Netlify site and the n8n Form stay exactly as they are (plan section 8). And the v1 Snapshot that v2's data came from is a point-in-time copy, so every n8n Form edit since it was taken would be lost at the switch.

Every Profile also lives under the one domain ofl.ink. When Meta Flags ofl.ink, every Creator's bio link breaks at once and there is nowhere to send them. Plan section 4 calls hiding Destinations the riskiest assumption in the project and names Spare Domains (D6) as the real mitigation.

Creators who own a domain cannot use it: v1 has no Custom Domains (plan section 1), and the link.me Template has no screen for them either. `grep -rhoi '.\{50\}domain.\{30\}' link.me` finds only a Meta pixel parameter (`domain=link.me`) and router entries for link.me's own subdomains. v1's page cannot show a Profile at a domain's root anyway: it takes the Username from the first path segment and falls back to `juliafilippo_` on `/` (`linkme_clone3/script.js:46-50`).

## Solution

The Operator follows a Cutover runbook in `RUN.md`. Days ahead, the ofl.ink zone moves to Cloudflare, carrying v1's records unchanged. Then n8n Form edits are frozen, the v1 Snapshot is refreshed from v1's GitHub repo, which is only read, and the final v1 Import runs. v2 has to pass Phase 2's parity check. Then one change to ofl.ink's address records in Cloudflare (the apex, and `www` if it exists) points ofl.ink at the VPS. The runbook verifies the result and says how to roll back, which is the same change reversed. Nothing in Caddy or the app changes on the day, and the v1 Import is never run again. v1 on Netlify stays as the cold backup for 30 days. After that the Operator switches it off on their side: ofl.ink comes off the Netlify site, and then the site stops serving at every address, which is what ends v1's exposure (plan section 8).

Caddy obtains a certificate for a hostname the first time someone visits it. Before it does, it asks the app whether the hostname is ofl.ink's own, a Spare Domain or a Custom Domain. The app reads the request's Host header and decides which Profile the page shows. The page learns its Profile from the app, not from its own address. Giving a Creator a domain therefore takes two steps and no deploy. The Creator points an A record at the VPS, and the Operator types the domain into the Creator's Profile in the PocketBase admin UI. A Spare Domain works the same way: buy it, point it at the VPS through Cloudflare, list it in PocketBase, and open it once so its certificate is issued.

- **Custom Domain.** It stands in for `ofl.ink/{username}`: `/` is the Profile, `/{code}` carries a Tracking Code, and `?link=` works as a Link Shortcut.
- **Spare Domain.** It serves every Profile at the same paths as ofl.ink.
- **On every host.** Reveal, the `/r/{Link Id}` redirect, the Age Gate, every Mode, Escape and the Escape Overlay behave exactly as on ofl.ink. The page loads nothing from any other of ofl.ink's hosts, so a Flagged ofl.ink does not take the other domains down with it.

PocketBase has taken daily backups since Phase 3's deploy, because public sign-up made v2 the only copy of new Profiles. Before the switch, this Phase checks them and proves one complete. After the switch v2 also holds the only copy of every Editor edit.

The Cloudflare parts of this Phase, the zone move and the Cloudflare lines, are parked with the production country-source question (DNS records, PARKED). Under its other answer, the switch is one record change at ofl.ink's current DNS host.

## User Stories

Cutover

1. As the Operator, I want a Cutover runbook in `RUN.md`, with exact commands in order, so that I can switch ofl.ink to v2 in one sitting without guessing.
2. As the Operator, I want every record of the ofl.ink zone recorded before anything changes, as the DNS host defines it (type, name, value, TTL), as live answers and with any DS record the registrar holds, so that a rollback restores exactly what v1 had.
3. As the Operator, I want the ofl.ink zone moved to Cloudflare at least 48 hours ahead, carrying v1's records unchanged, DNS-only, with a 300-second TTL, so that the switch and any rollback are each one change to the apex (and `www`) records that takes effect within minutes, while v1 keeps serving.
4. As the Operator, I want the v1 Snapshot refreshed from v1's GitHub repo once the last n8n run and Netlify deploy before the freeze have finished, its commit recorded and matched to the one Netlify published, and its Profile files checked against what ofl.ink serves, so that every n8n Form edit up to the freeze reaches v2. The old repo is only read.
5. As the Operator, I want no n8n Form submissions from the freeze on, through the 30 days and any rollback, so that no v1 edit is lost on the way to v2.
6. As the Operator, I want the final v1 Import run on the VPS from the refreshed v1 Snapshot and followed by Phase 2's parity check, so that I switch only once v2 shows every v1 Profile identically. After the switch it is never run again, because v1 wins on v1's fields and would overwrite Creators' Editor edits.
7. As the Operator, I want a readiness gate before the switch, so that I switch only when v2 is ready. It covers parity, the owners of ports 80 and 443 recorded, HTTPS on Phase 2's v2 host through the TLS Ask endpoint, the ask Caddy uses saying yes to ofl.ink and no to a stranger, ports 80 and 443 reachable, forged location and address headers ignored, backups on and a Spare Domain warmed.
8. As the Operator, I want the Cutover to be a DNS change only, with nothing in Caddy or the app changing on the day, so that rolling back is the same DNS change in reverse.
9. As a Visitor, I want every `ofl.ink/{username}` and `ofl.ink/{username}/{code}` URL already in a bio to keep working after the Cutover, so that tapping a Creator's bio link still opens their Profile with its Tracking Code.
10. As the Operator, I want the runbook to warn me of three things that break or go stale at the Cutover, so that I can tell Creators what to replace.
    - Link Shortcuts carrying v1 Link Ids stop revealing (ADR 0004).
    - Bio links on `linkmeclone3.netlify.app` keep showing a frozen v1.
    - n8n Form edits stop reaching ofl.ink.
11. As the Operator, I want post-switch checks, so that I know three things: ofl.ink is now answered by v2, its certificate was issued, and v1's secrets file is no longer what ofl.ink serves at its old path.
12. As the Operator, I want to re-run the real-device matrix of plan section 4 on ofl.ink after the switch, so that every Mode still works in each In-App Browser and in Safari and Chrome, on iOS and Android.
13. As the Operator, I want a rollback that re-creates the recorded records, so that Visitors get v1 back within one TTL if v2 misbehaves.
14. As the Operator, I want to know what a rollback restores, so that I know what Visitors on ofl.ink lose meanwhile: ofl.ink alone moves back, v2, its data, Custom Domains and Spare Domains keep running, and ofl.ink serves v1's secrets file and v1's Link Ids again until I switch back.
15. As the Operator, I want v1 left serving, unedited, for 30 days after the Cutover, so that the rollback has somewhere to go.
16. As the Operator, I want a dated step after those 30 days to switch v1 off on my side, first removing ofl.ink from the Netlify site and then stopping the site serving at all, so that v1's secrets file is served nowhere (plan section 8) and the DNS zone stays intact.
17. As the Operator, I want the switch time recorded in `RUN.md`, so that readiness test traffic in imported Profiles' Stats can be told apart from real Visitors. Nothing is deleted.
18. As the Operator, I want Visitor country and US state to come only from Cloudflare and never from a header a Visitor sends, so that Geo Rules and Stats can trust it.
19. As the Operator, I want the app to see the Visitor's own address rather than Cloudflare's, so that Reveal's rate limit (ADR 0004) still applies per Visitor once ofl.ink is proxied.

Backups

20. As the Operator, I want PocketBase to take a backup every day and keep the last 7, switched on at Phase 3's deploy and checked before the switch, so that a bad edit or a corrupted database can be undone. v2 is the only copy of Profiles made by public sign-up, and after the Cutover of every Editor edit.
21. As the Operator, I want one backup checked complete and readable before the switch, so that I know the backups are usable before I depend on them.

Custom Domains

22. As a Creator, I want my own domain to show my Profile at its root, so that my bio carries my brand instead of ofl.ink.
23. As a Creator, I want `mydomain/{code}` to carry a Tracking Code exactly as `ofl.ink/{username}/{code}` does, so that OnlyFans attribution still works on my domain.
24. As a Creator, I want `mydomain/?link={Link Id}` to work as a Link Shortcut, so that I can share a single Link on my own domain.
25. As a Visitor on a Custom Domain, I want the Age Gate, Reveal, the `/r` redirect, every Mode and the Escape Overlay to behave exactly as on ofl.ink, so that the domain changes nothing but the address.
26. As a Visitor in an In-App Browser on a Custom Domain, I want an Escape to land on the same Custom Domain with my Tracking Code, not on ofl.ink, so that the Creator's domain and attribution survive the jump to the System Browser.
27. As a Visitor on a Custom Domain or Spare Domain, I want the page to load nothing from ofl.ink or any other of ofl.ink's hosts, so that it keeps working when ofl.ink is Flagged.
28. As a Creator, I want Page Views and Clicks on my Custom Domain to count in my Stats, so that my numbers cover every address my Profile has.
29. As the Operator, I want to give a Profile its Custom Domain by filling one field in the PocketBase admin UI, live on the next load with no deploy and no Caddy edit, so that adding a domain takes a minute.
30. As the Operator, I want HTTPS for a Custom Domain issued automatically on its first visit, so that I never handle certificates by hand.
31. As the Operator, I want Caddy to obtain certificates only for hostnames the app knows, so that a stranger pointing a domain at the VPS cannot make Caddy issue certificates and use up the CA's rate limits.
32. As the Operator, I want each domain to belong to at most one Profile, so that two Profiles can never claim the same Custom Domain.
33. As the Operator, I want a Custom Domain mistakenly set to ofl.ink or to a Spare Domain to be ignored rather than take that domain over, so that a typo cannot replace every Profile with one.
34. As the Operator, I want to be the only one who can set a Custom Domain, so that, with public sign-up (D9), no Creator can claim a domain they do not own.
35. As a Creator, I want the runbook to name the one DNS record I create, an A record to the VPS's address, so that I can point my domain myself.
36. As the Operator, I want removing a Custom Domain to stop its HTTPS, so that a Creator who leaves stops being served under ofl.ink's server.
37. As a Visitor on a Custom Domain, I want Reveal to answer the page's own origin there and refuse other origins, so that Adult Links open on that domain and keep the same obfuscation as on ofl.ink (ADR 0004).
38. As the Operator, I want each new Custom Domain checked once inside Instagram on iOS and Android, so that I know an Escape from it really lands on it.

Spare Domains

39. As the Operator, I want at least one Spare Domain bought before the Cutover is complete, so that one is ready when ofl.ink is Flagged.
40. As the Operator, I want to list Spare Domains in PocketBase, so that a new Spare Domain starts serving without a deploy.
41. As a Visitor, I want every Spare Domain to serve every Profile at the same paths as ofl.ink, including Tracking Codes and Link Shortcuts, so that rotating only means replacing "ofl.ink" in bio links.
42. As the Operator, I want each Spare Domain pointed, certified and checked before it is needed, including once inside Instagram on a phone, so that rotating to it is instant and I know it is not already Flagged.
43. As the Operator, I want the Spare Domain list and every Custom Domain kept out of PocketBase's public API, so that nobody can list the domains that would be Flagged next.
44. As the Operator, I want a written rotation procedure for the day ofl.ink is Flagged, so that Creators move their bio links to a Spare Domain the same day, with nothing in v2 changing.

Testing

45. As the implementing agent, I want Custom Domain and Spare Domain behaviour testable locally over plain HTTP with `.test` hostnames, so that this Phase passes `./check.sh` with no real DNS, no CA and no VPS.

## Implementation Decisions

- **Owns.**
  - **Host Resolution.** A new app module.
  - **TLS Ask endpoint.** A new app route.
  - **Profile page bootstrap.** This changes the app's Profile page response and v2's copy of the public page script. The page learns its Profile from the app.
  - **Domains schema.** One new field on Profiles and one new collection. It also adds the Operator-only clause to Phase 3's Profiles create and update rules.
  - **Caddy configuration.** The production site address becomes an on-demand catch-all and gains the Cloudflare lines. The routes behind it and the local plain-HTTP listener keep what Phase 2 gave them.
  - **Backups check.** Scheduled backups start at Phase 3's deploy (Phase 3 spec, Further Notes, Backups). This Phase checks them before the switch and proves one complete.
  - **Cutover runbook.** A `## Cutover` section in `RUN.md`.
  - **The Playwright spec** `05-domains`.
- **Interfaces.**
  - **Host Resolution** turns a request's Host header into a host kind and, for page requests, a Profile identity. Hostnames are lower-cased and lose any port and trailing dot before matching. Matching is exact.
    ```ts
    type HostKind = 'primary' | 'spare' | 'custom' | 'unknown';
    resolveHost(host: string): Promise<{ kind: HostKind; username?: string }>;   // username only for 'custom'
    resolveProfileRequest(host: string, path: string):
      Promise<{ username: string; trackingCode: string | null; profilePath: string } | null>;
    ```
    - The kind is checked in this order:
      1. `primary`, the `PRIMARY_HOSTS` setting, which needs no database
      2. `spare`, the Spare Domains collection
      3. `custom`, a Profile's Custom Domain
      4. anything else is `unknown`
      ASSUMPTION: collisions are settled by this precedence, not by validation on save (rung 5: no hook and no cross-collection check). A Custom Domain equal to ofl.ink or to a Spare Domain is simply never reached. Overturned if the Operator wants such a typo rejected when it is saved.
    - On a `custom` host:
      - `/` is that Profile, and `/{code}` is that Profile with that Tracking Code, read exactly as the second segment of `/{username}/{code}` is read.
      - `profilePath` is `/`.
      - Deeper paths get whatever answer Phase 2 gives an unknown Username.
      ASSUMPTION: a Custom Domain stands in for exactly `ofl.ink/{username}` and never serves another Profile (rung 5: the smallest grammar that covers stories 22–24). Overturned if Creators need `/{username}` paths on their own domain.
    - Every other host keeps the grammar `/{username}[/{code}]` with `profilePath` = `/{username}`. That includes `unknown` hosts.
      ASSUMPTION: unknown hosts are not turned away by the app (rung 4: no new gate that could take Phase 2's pre-Cutover v2 host dark). Caddy refusing them a certificate is what keeps them off HTTPS. Overturned if plain-HTTP serving on stray hostnames turns out to matter.
    - Every request that is not for a primary host queries PocketBase. There is no cache.
      ASSUMPTION: rung 5, and it keeps Phase 2's "an edit in PocketBase admin is live instantly" (plan section 5). Overturned if load makes a short cache necessary.
    - The app's own routes match before this grammar on every host: Reveal, `/r`, Phase 4's Page View ping, the TLS Ask endpoint, Phase 3's Editor and proxy, and the public page's static files. On a Custom Domain, `/{code}` therefore only sees paths that no route claims.
    - `internal` must be a reserved Username, so that no Profile shadows the TLS Ask endpoint. Phase 3 owns the reserved list, and its spec already reserves `internal` (Phase 3 spec, Username rules, Reserved names; rung 1). If Phase 3 drops it, the route still wins by matching first and nothing more is needed.
  - **TLS Ask endpoint** `GET /internal/tls-ask?domain=<hostname>`:
    - 200 with an empty body when `resolveHost` gives `primary`, `spare` or `custom`
    - 404 for `unknown`
    - 400 when `domain` is missing or does not match the hostname pattern below
    - 503 when PocketBase cannot be reached and the host is not primary, which Caddy also takes as "no"

    It matches before the Profile grammar and answers on every host.
    ASSUMPTION: reachable on every host (rung 5: no extra Caddy rule; it also gives the post-switch check its v2-only answer). It confirms membership only for a hostname the caller already has. It never lists hostnames. The path keeps clear of PocketBase's `/api` and of `/r` (rung 6). Overturned if the Operator wants Spare Domains unconfirmable from outside. In that case Caddy's public sites answer 404 under `/internal/` and Caddy calls the app directly.
  - **Profile page bootstrap.**
    - The app embeds the result of `resolveProfileRequest` (`username`, `trackingCode`, `profilePath`) as a JSON block in each Profile page it serves. v2's copy of the public page reads it there instead of parsing `location.pathname`.
    - Every URL the page builds for itself is rebuilt from `location.origin` + `profilePath` (+ `/{code}`). That covers Escape targets, anything carrying a Tracking Code and any address-bar cleanup.
    - Nothing the page loads or builds names ofl.ink or another host. v1 already calls its profile data and Reveal through host-relative URLs, so origin-agnostic calls are house practice (rung 3).
    ASSUMPTION: embedding the identity in the served page is better than an extra lookup call (rung 5: no extra round trip, no new route). Overturned if Phase 2 already renders Profile data on the server. Host Resolution then feeds that render instead.
- **Schema.**
  ```
  profiles.customDomain   text, optional, max 253, hidden from the public API,
                          pattern ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$
                          unique index WHERE customDomain != ''
  spareDomains            base collection; list/view/create/update/delete rules all null (superusers only)
    domain                text, required, max 253, same pattern, unique index
  ```
  - The pattern has no look-ahead, because PocketBase patterns are Go regular expressions. Punycode (`xn--…`) passes, and `localhost` cannot be stored.
  - **Only the Operator sets a Custom Domain.** Phase 3's Profiles create rule and update rule each refuse any request from a non-superuser that sets `customDomain`. Without the create clause, a Creator could set it while creating their Profile in Onboarding. The Operator sets it as a superuser in the PocketBase admin UI, and the Editor has no field for it.
    ASSUMPTION: Operator-only (rung 4: easier to loosen than to take back). Section 9 made sign-up public, so any stranger could otherwise claim, and block, a domain they do not own. Overturned if the Operator wants self-serve Custom Domains, which would then need an ownership proof.
    ASSUMPTION (evidence blocked): the clause is written `@request.body.customDomain:isset = false`, PocketBase 0.23+ syntax. No PocketBase binary or docs are on this machine, and Phase 2 pins the version. Overturned by that version's rule syntax (older releases use `@request.data`).
  - **The domains stay private.** `customDomain` is hidden, and `spareDomains` is superuser-only, which is what null rules mean in PocketBase. The app reads both with the privileged access it already needs for Destinations (ADR 0002, ADR 0004).
    ASSUMPTION: the more closed option (rung 4). Overturned if the Editor must show a Creator their own Custom Domain.
  - ASSUMPTION: the names `customDomain`, `spareDomains`, `PRIMARY_HOSTS` and `CLOUDFLARE_RANGES` follow the plan's camelCase `isAdult` for fields and upper case for settings (rung 3). Overturned by Phase 2's naming.
- **Contracts.**
  - **Caddy to the app.** Observed today with the local `caddy:2-alpine` image (v2.11.4), using an on-demand catch-all with Caddy's internal CA and a stub ask server (rung 1):
    - Before issuing a certificate during a TLS handshake, Caddy calls `GET <ask URL>?domain=<SNI hostname>`.
    - On 200 the handshake succeeds with a fresh certificate. On 404 it fails (`curl` exit 35).
    - A certificate already in memory keeps being served after the ask turns to 404. After `docker restart`, Caddy asks again before using the stored certificate, and refuses it.
  - **Caddy configuration.**
    - A global on-demand TLS policy points its ask URL at the TLS Ask endpoint over the Compose network.
    - The production site address becomes one `https://` catch-all with on-demand TLS, carrying the same routes as Phase 2's public site. It serves ofl.ink, Phase 2's v2 host, every Spare Domain and every Custom Domain.
    - Caddy's reverse proxy passes the original Host header to the app, which is Caddy's default. The spec proves it end to end.
    - The local loop's plain-HTTP listener on the baseURL port accepts any Host header and carries none of the Cloudflare lines, because Phase 2's parity spec and Phase 4's Stats spec inject location headers locally (Phase 2 spec, Testing Decisions, `02-profile-parity`; Phase 4 spec, Contracts, Visitor country).
  - **The Cloudflare lines,** present on the production catch-all from this Phase's deploy on, so that the switch changes nothing in Caddy. Each line was observed on the local `caddy:2-alpine` image (v2.11.4) in front of a header-echo upstream (rung 1; see ## Review, D2a):
    - Caddy's trusted proxies are Cloudflare's published ranges, parsed strictly from the right (`trusted_proxies_strict`). With a trusted peer sending `X-Forwarded-For: 6.6.6.6, 1.2.3.4`, the default parsing made the client address the forged `6.6.6.6`. Strict parsing gave `1.2.3.4`, the address Cloudflare appends.
    - The reverse proxy replaces `X-Forwarded-For` with that one address (`header_up X-Forwarded-For {client_ip}`). Phase 2's limiter keys on `X-Forwarded-For` (Phase 2 spec, Reveal hardening), so it sees the Visitor's address behind Cloudflare and the direct peer's otherwise, whatever the Visitor sends.
    - From any direct peer outside those ranges (a `remote_ip` matcher), `CF-IPCountry` and `CF-Region-Code` are removed. A Visitor who reaches a DNS-only Custom Domain directly therefore cannot choose their country, and their Events record the unknown country.
    - v1's location headers `X-Country`, `X-Region` and `X-NF-Subdivision-Code` are removed from every request. Phase 2 reads them before Cloudflare's (Phase 2 spec, Contracts, Visitor location), and they pass through Cloudflare untouched, so leaving them would let any Visitor pick the Geo Rule that applies to them.
    - From Cloudflare's ranges, `CF-IPCountry` and `CF-Region-Code` pass through in the form Phases 2 and 4 read.
    - The ranges come from the `CLOUDFLARE_RANGES` deploy setting, which the Operator fills from Cloudflare's published lists. The agent fetches nothing (floor 2), and Caddy needs no plugin.
    - Phase 2's parity spec, run against the VPS in step 6, therefore leaves out its Geo Rule cases. Its local run proves them on the same code with the real Destinations (Phase 2 spec, Test loop and `02-profile-parity`).
    ASSUMPTION: peer-matched rather than trusting `CF-IPCountry` from anyone (rung 4: a plain copy trusts a header any Visitor can send on a DNS-only host). Overturned if Cloudflare changes its ranges; the setting is then refreshed by the same command.
    ASSUMPTION: v1's headers are dropped from this Phase's deploy on, not from the switch (rung 4: the switch stays a DNS change only). Overturned if the Operator wants Geo Rule parity proven on the VPS; the drop then moves to a deploy after the switch.
    Phase 2's parity spec puts `Geo Rule` in the title of every case that sends a location header (Phase 2 spec, `02-profile-parity`, Reveal), so `--grep-invert 'Geo Rule'` in step 6 leaves out exactly those cases.
  - **`PRIMARY_HOSTS`.** A comma-separated app setting.
    - production: `ofl.ink`, plus `www.ofl.ink` if it exists, plus the host of Phase 2's pre-Cutover v2 address. The catch-all now serves that host too, so its certificate must keep passing the ask.
    - local: `localhost`
  - **ofl.ink's certificate** is obtained on demand at the first handshake after the switch, so the Cutover changes nothing in Caddy.
    ASSUMPTION: rung 4. A fixed site block for ofl.ink would fail ACME validation until DNS moves, and could leave Caddy backing off at the moment of the switch. Overturned if a few seconds of issuance for the first Visitor after the switch is unacceptable; a fixed block is then added right after DNS moves.
  - **Test domains.**
    - `05-domains` arranges its own domains through PocketBase's REST API: the Fixture Profile's `customDomain` = `creator.test` and the Spare Domain `spare.test`. It removes both afterwards.
    - `unknown.test` is never added.
    - The seed (Phase 2's v1 Import of the Fixture Profile, plan section 7) is unchanged.
    - `.test` is a reserved top-level domain, so none of these names resolves on the public internet.
    ASSUMPTION: in-test set-up through PocketBase's REST API as a superuser, as Phase 2's tests arrange state (rung 3, assumed from run-1 precedent; rung 4: the seed stays untouched). Overturned if Phase 2's tests arrange state another way; the spec then uses that.
- **What does not change per host.**
  - Reveal and `/r/{Link Id}` behave the same on every host, and are not limited to the host's own Profile.
    ASSUMPTION: rung 5. Overturned if a Custom Domain must refuse other Profiles' Link Ids.
  - A Profile stays reachable at `ofl.ink/{username}` after it gets a Custom Domain, with no redirect.
    ASSUMPTION: rung 5. Overturned if Creators want ofl.ink to send Visitors on to their Custom Domain.
- **Spare Domains are always live.** Every listed Spare Domain serves every Profile at all times. Rotating means people replace ofl.ink in bio links, and nothing in v2 changes (D7 read as domain rotation, so no extra code). There is no "active domain" setting.
  ASSUMPTION: rung 5. Overturned if v2 must redirect from, or display, a currently active domain.
- **DNS records.**
  - ofl.ink and every Spare Domain sit in Cloudflare with Proxied records to the VPS's address. That gives Phase 4 its country header.
  - Cloudflare's SSL/TLS mode is Full (strict), and Always Use HTTPS stays off. Let's Encrypt's HTTP-01 challenge then reaches Caddy, which redirects to HTTPS by itself.
  - Custom Domains get a DNS-only A record to the VPS's address, plus AAAA if the VPS has IPv6 (ADR 0001). Their Events record the unknown country. Reveal's Geo Rules there take v1's US fallback (Phase 2 spec, Visitor location ASSUMPTION), so a Visitor from a country or US state that the rule lists gets the US entry instead of their own code. In all 7 v1 Links with a Geo Rule the US entry equals the rule's catch-all `default` (observed, plan review), so the wrong code is the catch-all, never another country's. Only the geo-IP position fixes this (PARKED, below).
  - Cloudflare replaces the `Server` header, so the post-switch check identifies v2 by the TLS Ask endpoint's empty 200, not by `Server: Caddy`.
  PARKED, needs-human (plan review): the production country source, and with it every Cloudflare part of this Phase. D5 names "VPS geo-ip or Cloudflare header" and does not choose (rung 2 is silent).
  - **Cloudflare position (this spec as written; Phase 4 spec, Contracts, Visitor country).** ofl.ink and every Spare Domain are Proxied, and Phase 4 reads `CF-IPCountry`. For it: rung 3, v1 takes the country from its edge's header (geo_utils.js:48); rung 5, no account, licensed download or dependency in the app; and Cloudflare's proxy hides the VPS address for ofl.ink and the Spare Domains (Further Notes, Needs the human, unresolved by evidence). Against it: rung 4, it moves the live domain's nameservers 48 hours ahead and turns DNSSEC off and on again if a DS record exists (Moving the zone), and it adds the Cloudflare lines and `CLOUDFLARE_RANGES`. Geo Rules on DNS-only Custom Domains also take v1's US fallback (the Custom Domains line above).
  - **geo-IP position.** A country database on the VPS, read behind Phase 2's Visitor location function, for every host. Every record stays DNS-only at ofl.ink's current DNS host. The zone does not move, DNSSEC is untouched, and the switch and rollback are one record change there (with the 300-second TTL set 48 hours ahead). The Cloudflare lines, `CLOUDFLARE_RANGES` and the trusted proxies drop, because the direct peer is the Visitor; v1's location headers are still dropped from every request. Custom Domains get real countries, so their Geo Rules work. For it: rung 4, ofl.ink's delegation never changes. Against it: a licensed database download and its refresh by the human (floor 2, network), a new dependency and lookup code (rung 5), and ofl.ink and the Spare Domains then publish the VPS address as Custom Domains already do.
  - **Evidence that settles it** (plan-review.md, Needs the human): step 2's `dig +short NS ofl.ink` and `dig +noall +answer DS ofl.ink`. If the zone is already on Cloudflare's nameservers, the move costs nothing and the Cloudflare position wins on rungs 3 and 5. If it is not, the Operator weighs the nameserver move (and any DNSSEC change) against taking on a geo-IP licence and its refresh.
  - **Parked by it:** stories 3, 18 and 19; The Cloudflare lines; this list of DNS records; Moving the zone; and in Acceptance, the `CLOUDFLARE_RANGES` line of step 1, step 3, the Cloudflare part of step 4, the two header probes of step 7, and where steps 8, 9, 13 and 16 change records. Everything else in this Phase is built the same either way.
  ASSUMPTION (evidence blocked): neither HTTP-01 through Cloudflare's proxy nor on-demand issuance on Cloudflare's first origin handshake could be observed (live DNS is out of bounds). The post-switch certificate check settles it. If issuance fails, the runbook sets the record DNS-only once so that Caddy issues directly, then sets it back to Proxied.
- **Moving the zone.** Cloudflare's proxy needs the zone on Cloudflare's nameservers, so the zone moves at least 48 hours before the switch, while v1 still serves.
  - Every recorded record is re-created there, DNS-only. Netlify-only types (NETLIFY, ALIAS) become an apex CNAME to `linkmeclone3.netlify.app` (the v1 address the n8n Form's texts name; `grep -o 'https://linkmeclone3.netlify.app[^"]*' n8n_oflink_Feb18.json`), which Cloudflare flattens.
  - Nothing in the Netlify site is changed. The delegation moves at the registrar.
  - If the registrar holds a DS record for ofl.ink, DNSSEC is turned off there first and the DS record left to expire, because the old signatures would make the zone unresolvable once Cloudflare answers. Once the zone is Active in Cloudflare, DNSSEC is turned on there and its DS record added at the registrar.
  - Cloudflare's "Add visitor location headers" Managed Transform is turned on with the zone, so that proxied requests carry `CF-Region-Code` for US-state Geo Rules (Phase 2 reads it, Phase 2 spec, Contracts, Visitor location).
    ASSUMPTION (evidence blocked): Cloudflare overwrites a Visitor-sent `CF-IPCountry` and `CF-Region-Code` on proxied requests; no network reads. Overturned by step 7's check through the Spare Domain. A forged value that survives Cloudflare then needs the human, because no Caddy rule can tell it apart.
  - The Cloudflare records are written into `RUN.md` as the rollback target. The switch and the rollback are then one record change each, inside Cloudflare.
  ASSUMPTION: rung 4. Moving the nameservers early, while nothing is served differently, separates the slow, risky step from the switch. Overturned if ofl.ink's registrar cannot delegate to Cloudflare.
- **Refreshing the v1 Snapshot and the final v1 Import.**
  - The v1 Snapshot is a clean clone of v1's GitHub repo, on `main`, tracking `origin/main`, with no local changes (`git -C linkme_clone3 remote -v`, `status --short` and `rev-parse --abbrev-ref @{u}`; rung 1).
  - The Operator refreshes it with `git -C linkme_clone3 pull --ff-only`. That reads the old repo and changes nothing there. Replacing the whole Snapshot with a newer copy of v1 is not editing it (ADR 0002).
  - The refresh waits until the n8n Form's workflow has no running execution and Netlify's newest production deploy is Published, so that an edit submitted just before the freeze is both in the repo and on ofl.ink. The pulled commit is recorded in `RUN.md` and must match the commit Netlify's Published deploy names, which covers Profiles, Destinations and images at once.
  - The refreshed Profile files are then compared byte for byte with what ofl.ink serves, and any difference or failed fetch stops the runbook. That proves the branch pulled is the one v1 deploys.
  ASSUMPTION: Netlify deploys v1 from `main` (plan section 1: n8n commits to GitHub and Netlify redeploys; the branch is not visible here). Overturned if the comparison reports differences; the Operator then pulls the branch Netlify deploys.
  - The final v1 Import is a re-run of Phase 2's v1 Import against a copy of the refreshed Snapshot on the VPS. It is re-runnable and v1 wins, until Cutover (the glossary's v1 Import).
  ASSUMPTION: the v1 Import runs on the VPS from a v1 Snapshot copy in the v2 directory; its command and that directory are Phase 2's (rung 3). Overturned by Phase 2's deploy procedure, whose command the runbook then uses.
  - A re-run overwrites any v2-side edit to an imported Profile. So Creators of imported Profiles get the Editor only after the switch. Profiles created only in v2 (public sign-up, D9) are not in v1 and survive it.
  ASSUMPTION: rung 4, no edit is lost. Overturned if the v1 Import is changed to skip Profiles already edited in v2.
  - From the switch on, the v1 Import is never run again. v1 wins on v1's fields (Phase 2 spec, v1 Import — re-runs), so a re-run would overwrite Creators' Editor edits. The n8n freeze holds through the 30 days and any rollback, so no re-run is ever needed. `RUN.md`'s `## Cutover` says so above the import command.
    ASSUMPTION: a written rule, not a guard in the import (rung 5; rung 4: the import is Phase 2's code). Overturned if a re-run after the switch ever happens; Phase 2's import then gains a guard.
- **What a rollback restores.** Rolling back moves ofl.ink alone.
  - v2 keeps running with all its data, and Custom Domains and Spare Domains stay served by it.
  - While rolled back, ofl.ink shows v1 as it stood at the freeze. Profiles created only in v2, v2-side edits since the switch, and Stats are hidden there, not lost. They return when ofl.ink is switched back.
  - While rolled back, ofl.ink also serves v1's secrets file again and v1's Link Ids reveal there again, while v2 Link Ids shared since the switch reveal nothing on v1 (ADR 0004). The n8n freeze still holds.
  - The trigger is a failed post-switch check, or a Mode that passed the device matrix on v1 and fails it on v2. Later in the 30 days, rolling back is the Operator's call.
  ASSUMPTION: rung 5. Overturned if a rollback must also carry v2-side edits back into v1, which section 8 forbids anyway.
- **Backups.**
  - Phase 3's deploy turned on PocketBase's scheduled backups in the admin UI (Settings → Backups): daily, keeping 7. Before the switch, the Operator checks that they are still on.
  - One backup is taken by hand and downloaded to the Mac. Its database must pass SQLite's integrity check and hold as many Profiles as the live admin UI shows, and the zip must hold uploaded files. That proves it is complete and readable.
    ASSUMPTION: no full restore into a second PocketBase before the switch (rung 5; Phase 2's image and volume names are not fixed here). Overturned if the Operator wants a restore drill; it then runs Phase 2's PocketBase image on a copy of the backup.
  ASSUMPTION (evidence blocked): the PocketBase release Phase 2 pins has built-in scheduled backups whose zip holds `data.db` at its root and uploaded files under `storage/`. No PocketBase binary or docs are on this machine. Overturned if it has none. A nightly cron job on the VPS then copies the PocketBase volume, stopped for the copy, into a dated directory.
  ASSUMPTION: backups stay on the VPS disk, apart from the one downloaded copy (rung 5); daily and 7 are rung 6. Overturned if the Operator wants an off-site copy, which PocketBase's S3 backup setting then takes.
- **Readiness traffic stays in Stats.** Before the switch, the parity runs, the readiness checks and the Spare Domain warm-up write Page Views and Clicks into imported Profiles. The runbook records the switch time in `RUN.md`, so Events before it can be told apart. Nothing is deleted.
  ASSUMPTION: rung 5, the plan asks for no Stats reset; rung 4, a deletion is the harder undo. Overturned if Creators object to the test traffic. A filtered delete after a backup then follows, and Phase 4's `dailyStats`, a view computed on read (Phase 4 spec, Schema), needs nothing more.
- **Removing a Custom Domain** means clearing the field and restarting Caddy. From then on the TLS Ask endpoint says no, and Caddy re-asks before it uses the stored certificate (observed, Contracts). Until that restart, Caddy keeps serving the certificate it holds in memory.
- **Turning Netlify off,** 30 days after the Cutover, is the Operator's, in two acts on their side. Plan section 5 says "cold backup for a month, then off", and section 8 keeps v1's exposure only "until Netlify is switched off" (rung 2).
  - First, ofl.ink comes off the Netlify site's domains. Re-adding it undoes this, and the zone stays in Cloudflare.
  - Then the site stops serving at every address, so that `linkmeclone3.netlify.app` no longer serves v1's secrets file or its Reveal function. That is what "off" means in section 8, and it is irreversible.
  - No agent and no Phase edits the Netlify site, its deploys or its config (section 8). There is no redirect deploy. The old GitHub repo and its history stay as they are, because section 8 leaves them untouched.
  ASSUMPTION (evidence blocked): deleting the site is the only Netlify control that stops it serving without a deploy; no network reads. Overturned if Netlify offers a reversible stop, which the Operator then uses. Either way, step 16's check that the secrets path no longer answers 200 is the proof.

## Testing Decisions

- **One seam:** the Playwright spec `tests/e2e/05-domains.spec.ts`.
  - It runs against the local stack on the existing baseURL `http://localhost:4173` (`playwright.config.ts:3`), through the same `./check.sh` loop and Phase 2's webServer (plan section 7). `playwright.config.ts` is unchanged.
  - At file level, `test.use({ launchOptions })` starts Chromium with `--host-resolver-rules=MAP *.test 127.0.0.1`. The browser then sends real `creator.test:4173` and `spare.test:4173` Host headers over plain HTTP. Observed today against `tests/dev-server.mjs` on port 4199: `http://creator.test:4199/juliafilippo_` rendered `#displayName` "Example Site" with `location.host` = `creator.test:4199`.
  - Playwright's `request` fixture does not use that mapping (`getaddrinfo ENOTFOUND creator.test`, observed). So host-routing checks go through `page`, and TLS Ask checks go through `request` against the baseURL with `?domain=`.
  - Set-up, not a second seam: `beforeAll` gives the Fixture Profile `customDomain = creator.test` and adds the Spare Domain `spare.test` (see Test domains). `afterAll` removes both, and a test that changes a domain restores it.
  - A failing assertion names the Link Id and never prints a Destination.
  - The spec saves a screenshot of `creator.test/` to `.scratch/goal_ai/shots/05-domains.png` (plan section 7; `playwright.config.ts` outputDir).
  ASSUMPTION: Phase 2's baseURL is Caddy's plain-HTTP listener, so the seam covers Caddy's Host pass-through as well as the app (rung 3: plan section 7 puts `docker compose up` behind the baseURL). Overturned if the baseURL points at the app directly. The spec then still covers Host Resolution, and Caddy's pass-through is left to the manual Custom Domain check.
  ASSUMPTION: the ask URL Caddy is configured with is proven on the VPS rather than by a second local check (rung 5: one seam). Step 1 proves it both ways. Its `https://$V2_HOST` request fails if the ask refuses, because Caddy re-asks before using a stored certificate (observed). The endpoint that `caddy adapt` reports must say yes to ofl.ink and no to `unknown.invalid`, which catches an ask that says yes to everyone. On the local `caddy:2-alpine` image, `caddy adapt` prints the ask as `"permission":{"endpoint":"…","module":"http"}`, and the image has BusyBox `wget` (observed). Overturned if Phase 2 mounts its Caddyfile somewhere other than the image's default `/etc/caddy/Caddyfile`; step 1 then uses that path.
- **Behaviour the spec asserts:**
  1. **TLS Ask.** It answers 200 for `creator.test`, `spare.test` and `localhost`, 404 for `unknown.test`, and 400 when `domain` is missing.
  2. **Custom Domain root, Tracking Code and Link Shortcut.**
     - `creator.test/` shows the Fixture Profile's display name and Link cards.
     - `creator.test/{code}` shows the same Profile.
     - `creator.test/?link={Link Id}` reveals that Link on load, as `localhost/{username}?link={Link Id}` does.
  3. **Attribution on every host.** Two numeric Tracking Codes, 111 and 222, each on `creator.test/{code}`, `spare.test/{username}/{code}` and `localhost/{username}/{code}`:
     - Tapping the Adult Link shows the Age Gate. Continue sends the Reveal request to the page's own host, and it answers 200 with a Destination ending in `/c{code}` for that page's code. D5 keeps the `/c{code}` suffix, and v1 appends it to numeric codes (`linkme_clone3/netlify/functions/reveal.js:25-36`).
     - The Direct Mode Link, and a Deeplink Mode Link whose Mode the REST set-up sets, each end at the same Destination on all three hosts.
     - Navigation to a Destination is intercepted and fulfilled with a harmless page, as `00-smoke` does.
  4. **Spare Domain.** `spare.test/{username}` shows the Fixture Profile, and `spare.test/{username}?link={Link Id}` reveals that Link on load.
  5. **Escape keeps the host.**
     - With an iOS Instagram User-Agent, `creator.test/` shows the Escape Overlay exactly when `localhost/{username}` does.
     - Tapping the Escape Mode Link on `creator.test/{code}` fires an Escape whose target URL names `creator.test` and the path `/{code}`, with no Username segment and no other host.
     - With an Android Instagram User-Agent, the `intent://` target names `creator.test` the same way.
     - On `spare.test/{username}/{code}`, the target keeps `/{username}/{code}`.
     - Custom-scheme navigation is captured the way Phase 1's spec captures it.
  6. **Page View and Click.** Loading `creator.test/` adds one Page View Event, and the Adult Link's Reveal on `creator.test/{code}` adds one Click Event, both for the Fixture Profile, read as a superuser through PocketBase's REST API.
     ASSUMPTION: Phase 4's events carry the Profile they belong to and their kind, as D5 lists them (rung 2 for the content, rung 3 for the field names). Overturned by Phase 4's schema, whose names the spec then uses.
  7. **No cross-domain loads.** On `creator.test` and `spare.test`, no request goes to another of ofl.ink's hosts (`localhost:4173`, the other `.test` host), and no request URL names `ofl.ink`. Third-party hosts the page already loads are left alone.
  8. **Cross-origin Reveal refused.** A `fetch` from a page on `creator.test` to Reveal on `spare.test:4173` cannot be read by the page (ADR 0004, same-origin).
  9. **Assignment is live, unique and ranked.** Each step goes through the REST set-up:
     - Changing the Fixture Profile's `customDomain` to `creator2.test` makes `creator2.test/` show the Profile on the next load, with no restart. The TLS Ask endpoint then answers 200 for `creator2.test` and 404 for `creator.test`.
     - Giving a second Profile, which the test creates, the same `customDomain` is refused.
     - With that second Profile's `customDomain` set to `spare.test`, `spare.test/{username}` still shows the Fixture Profile.
  10. **Only the Operator sets a domain.** The test creates a verified Creator as superuser. Signed in as that Creator, through the API the Editor uses (Phase 3), it tries two writes, and both are refused: creating a Profile with `customDomain`, and updating the Creator's own Profile's `customDomain`. The stored value is unchanged.
  11. **Domains stay private.**
      - Loading `localhost/{username}`: no response body the page receives contains `creator.test`.
      - Without a token, at the baseURL, no response to `/api/collections/profiles/records` or `/api/collections/spareDomains/records` contains `creator.test` or `spare.test`.
- **Not tested locally:** real certificate issuance, live DNS, Cloudflare, the Cloudflare lines (stories 18–19; see Caddy configuration) and real devices. They are the `# manual:` steps of Acceptance, and step 7 checks the Cloudflare lines at the origin and through Cloudflare.
- **Prior art.**
  - `tests/e2e/00-smoke.spec.ts`: Reveal intercepted with `page.route` and navigation fulfilled with a harmless page, the User-Agent overridden with `test.use`, and the `#displayName` and `.link-card` selectors.
  - Phase 2's specs, for REST set-up.
  - Phase 1's spec, for capturing custom-scheme navigation.

## Acceptance

```sh
set -e  # any failing check fails the block; the final ./check.sh cannot mask it (house precedent: Phases 1-4)
# --- automated, local, plain HTTP (the implementing agent) ---
s="$(git -C linkme_clone3 status --porcelain)"   # the v1 Snapshot was read, never edited (ADR 0005); under set -e a failing git stops the block here
test -z "$s"                                     # one check per line: set -e ignores a failure on the left of && (as Phase 2 notes)
test -f tests/e2e/05-domains.spec.ts
grep -q '^## Cutover' RUN.md

# --- needs the human: live DNS, Cloudflare, the VPS, purchases, phones (floor 2); the same steps, in order, are RUN.md's ## Cutover ---
# Set once: USERNAME=<an imported Username>  VPS=<ssh host>  V2_DIR=<v2's directory on the VPS>  V2_HOST=<Phase 2's v2 host>
#           VPS_IPV4=<VPS IPv4>  SPARE=<a Spare Domain>  DOMAIN=<a Creator's Custom Domain>
#           LINK_ID=<a Link Id of $USERNAME's Profile>  LIMIT=<the VPS's REVEAL_LIMIT_PER_MINUTE>
# manual: 1. record who holds ports 80 and 443 into RUN.md. Anything but v2's Caddy (Docker's proxy for it) blocks this Phase until the Operator chooses (ADR 0001):
#   ssh "$VPS" "sudo ss -ltnp '( sport = :80 or sport = :443 )'"
#   then deploy this Phase by Phase 2's deploy procedure, with two lines in the VPS .env:
#   PRIMARY_HOSTS=ofl.ink,<V2_HOST>    (append ,www.ofl.ink if step 2 shows it exists)
#   CLOUDFLARE_RANGES=<the output of: { curl -s https://www.cloudflare.com/ips-v4; echo; curl -s https://www.cloudflare.com/ips-v6; } | xargs>
#   rsync -a --exclude node_modules --exclude .scratch ./ "$VPS:$V2_DIR/" && ssh "$VPS" "cd $V2_DIR && docker compose up -d --build --wait"
#   then prove the ask wiring:  test "$(curl -s -o /dev/null -w '%{http_code}' "https://$V2_HOST/$USERNAME")" = 200
#   E="$(ssh "$VPS" "cd $V2_DIR && docker compose exec -T caddy caddy adapt --config /etc/caddy/Caddyfile" | grep -o '"endpoint":"[^"]*"' | cut -d'"' -f4)"
#   ssh "$VPS" "cd $V2_DIR && docker compose exec -T caddy wget -q -O /dev/null '$E?domain=ofl.ink'"              # the ask Caddy uses says yes
#   ! ssh "$VPS" "cd $V2_DIR && docker compose exec -T caddy wget -q -O /dev/null '$E?domain=unknown.invalid'"   # and refuses a stranger
# manual: 2. record v1's DNS in RUN.md. Copy every record of the ofl.ink zone as the DNS host lists it (type, name, value, TTL),
#   NETLIFY and ALIAS records included, then the live answers and the registrar:
#   dig +short NS ofl.ink; dig +noall +answer ofl.ink A ofl.ink AAAA www.ofl.ink CNAME www.ofl.ink A www.ofl.ink AAAA; dig +noall +answer DS ofl.ink; whois ofl.ink | grep -i registrar
# manual: 3. at least 48 h before the switch, move the zone to Cloudflare with v1 still serving. Add ofl.ink to a Cloudflare account;
#   re-create every recorded record DNS-only, TTL 300 on apex and www; NETLIFY or ALIAS records become an apex CNAME to linkmeclone3.netlify.app;
#   SSL/TLS mode Full (strict); Always Use HTTPS off; Network -> IP Geolocation on; Rules -> Transform Rules -> Managed Transforms -> Add visitor location headers on.
#   Write the Cloudflare records into RUN.md (the rollback target). If step 2 printed a DS record, turn DNSSEC off at the registrar first and wait until
#   dig +short DS ofl.ink prints nothing and that record's TTL has passed. At the registrar, set the NS to the pair Cloudflare names. Nothing in the Netlify
#   site is changed. Once Cloudflare shows the zone Active, and only if a DS record existed: DNSSEC on in Cloudflare, and its DS record at the registrar. Then:
#   dig +short NS ofl.ink                                                                  # Cloudflare's pair
#   curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'     # v1 still serves
# manual: 4. buy at least one Spare Domain (payment). Add it to Cloudflare with ofl.ink's SSL/TLS settings and A -> $VPS_IPV4 Proxied; set its NS
#   at the registrar; add it to spareDomains in the PocketBase admin UI (Phase 2's SSH tunnel); warm and check it:
#   test "$(curl -s -o /dev/null -w '%{http_code}' "https://$SPARE/$USERNAME")" = 200     # the first call issues the certificate
#   then open https://$SPARE/$USERNAME inside Instagram on a phone: the Profile opens with no Meta warning.
# manual: 5. backups. PocketBase admin UI -> Settings -> Backups: check auto backups are on, cron 0 3 * * *, keep 7 (Phase 3's deploy turned them on). Create one backup now and download it
#   to the Mac as $B, then prove it is complete and readable:
#   R="${TMPDIR:-/tmp}/pb-restore.db"; unzip -p "$B" data.db > "$R" && test "$(sqlite3 "$R" 'pragma integrity_check;')" = ok
#   test "$(sqlite3 "$R" 'select count(*) from profiles;')" = <the Profiles count the admin UI shows> && unzip -l "$B" | grep -q ' storage/'   # every Profile, and uploaded files
# manual: 6. freeze and final v1 Import. From now on nobody submits the n8n Form, through the 30 days and any rollback. Wait until n8n's Executions list shows
#   no running execution of the Form's workflow and Netlify's Deploys page shows the newest production deploy Published. Then refresh the v1 Snapshot
#   (reads the old repo, changes nothing there) and record its commit, which must match the commit that Published deploy names:
#   git -C linkme_clone3 pull --ff-only && echo "v1 commit: $(git -C linkme_clone3 rev-parse HEAD)" >> RUN.md
#   bad=0; for f in linkme_clone3/api/profiles/*.json; do curl -sf "https://ofl.ink/api/profiles/${f##*/}" | cmp -s - "$f" || { echo "differs from live v1: ${f##*/}"; bad=1; }; done; test "$bad" = 0
#   rsync -a --delete --exclude .git linkme_clone3/ "$VPS:$V2_DIR/linkme_clone3/"
#   ssh "$VPS" "cd $V2_DIR && docker compose run --rm -v \"\$PWD/linkme_clone3:/v1:ro\" app import-v1 --site /v1"   # Phase 2's command; never again after step 8
#   PLAYWRIGHT_BASE_URL="https://$V2_HOST" npx playwright test tests/e2e/02-profile-parity.spec.ts --grep-invert 'Geo Rule'   # must pass; Geo Rule cases run locally only
# manual: 7. readiness (steps 1, 4, 5 and 6 done, and):
#   nc -zv "$VPS_IPV4" 80 && nc -zv "$VPS_IPV4" 443
#   test "$(curl -s -o /dev/null -w '%{http_code}' "https://$V2_HOST/internal/tls-ask?domain=ofl.ink")" = 200
#   curl -s -o /dev/null --resolve "$V2_HOST:443:$VPS_IPV4" -H 'CF-IPCountry: DE' -H 'X-Country: DE' "https://$V2_HOST/r/$LINK_ID"   # straight to the origin: the newest Click Event for that Link (admin UI) has country XX
#   curl -s -o /dev/null -H 'CF-IPCountry: DE' -H 'X-Country: DE' "https://$SPARE/r/$LINK_ID"   # through Cloudflare: the newest Click Event has the Mac's own country (DE only if the Mac is in Germany)
#   for i in $(seq 1 $((LIMIT + 1))); do curl -s -o /dev/null -w '%{http_code}\n' --resolve "$V2_HOST:443:$VPS_IPV4" -H "X-Forwarded-For: 198.51.100.$i" "https://$V2_HOST/r/$LINK_ID"; done | grep -q 429   # a forged address does not dodge the limit
# manual: 8. switch. Record the time:  echo "switch: $(date -u +%FT%TZ)" >> RUN.md   then in Cloudflare replace the ofl.ink apex record with
#   A ofl.ink -> $VPS_IPV4 Proxied (AAAA -> the VPS's IPv6, Proxied, only if it has one); if www existed, CNAME www -> ofl.ink Proxied.
# manual: 9. verify from the Mac (the first request issues ofl.ink's certificate; retry a Cloudflare 52x once after a few seconds):
#   test "$(curl -s -o /dev/null -w '%{http_code} %{size_download}' 'https://ofl.ink/internal/tls-ask?domain=ofl.ink')" = "200 0"   # only v2 answers an empty 200
#   test "$(curl -s -o /dev/null -w '%{http_code}' "https://ofl.ink/$USERNAME")" = 200
#   S="${TMPDIR:-/tmp}/secrets-path"; curl -s -o "$S" https://ofl.ink/netlify/functions/secrets.json
#   node -e 'const fs=require("fs"),b=fs.readFileSync(process.argv[1],"utf8").replace(/\\\//g,"/");process.exit(Object.values(JSON.parse(fs.readFileSync("linkme_clone3/netlify/functions/secrets.json","utf8"))).filter(Boolean).some(u=>b.includes(u))?1:0)' "$S"   # no v1 Destination at the old path; prints none
#   ssh "$VPS" "cd $V2_DIR && docker compose logs caddy" | grep -i 'certificate obtained successfully' | grep -q ofl.ink
#   if no certificate was obtained: set the apex record DNS-only, repeat the first curl so Caddy issues directly, then set it Proxied again.
# manual: 10. no re-import and no clean-up. From the switch on the v1 Import is never run again (it would overwrite Editor edits); write that above
#   step 6's import command in RUN.md. Readiness traffic stays in Stats; the switch time recorded in step 8 tells it apart.
# manual: 11. real-device matrix (plan section 4) on https://ofl.ink/$USERNAME for every Mode, inside Instagram, Facebook, Threads and TikTok and in
#   Safari and Chrome, on iOS and Android; record each cell in RUN.md.
# manual: 12. tell Creators: Link Shortcuts carrying v1 Link Ids no longer reveal (ADR 0004) and must be re-shared; bio links on linkmeclone3.netlify.app
#   show a frozen v1 and must move to ofl.ink; n8n Form edits no longer reach ofl.ink. Invite imported Profiles' Creators to the Editor now.
#   Hand-over (Phase 3 spec, v1 Profiles are handed over): for each v1 Creator who has signed up, set their imported Profile's owner to their account
#   in the PocketBase admin UI. If they claimed another Username meanwhile, delete that bare Profile first. Never before step 8: step 6's import must be the last.
# manual: 13. rollback, if step 9 fails or a Mode that passed on v1 fails step 11: in Cloudflare restore the records written in step 3 (DNS-only); then
#   curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'     # within one TTL. v2 and its domains keep running; the n8n freeze still holds.
#   While rolled back, ofl.ink serves v1's secrets file and v1 Link Ids again, and v2 Link Ids shared since step 8 reveal nothing there.
# manual: 14. each Custom Domain. The Creator sets A $DOMAIN -> $VPS_IPV4, DNS-only (AAAA only if the VPS has IPv6). The Operator sets that Profile's
#   customDomain in the PocketBase admin UI. Then:
#   test "$(dig +short A "$DOMAIN")" = "$VPS_IPV4" && test "$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/")" = 200
#   open https://$DOMAIN/ inside Instagram on iOS and on Android and tap a Link of each Mode the Profile uses; an Escape lands on $DOMAIN, not ofl.ink.
#   To remove one later: clear the field, then  ssh "$VPS" "cd $V2_DIR && docker compose restart caddy"
# manual: 15. when ofl.ink is Flagged: the Operator and Creators replace ofl.ink with a warmed Spare Domain in every bio link; nothing in v2 changes.
#   Links already posted outside bios keep ofl.ink and are not recovered. Then buy and warm the next Spare Domain (step 4).
# manual: 16. Cutover + 30 days, the Operator switches v1 off (plan sections 5 and 8). First, in Netlify, the v1 site -> Domain management -> remove ofl.ink
#   (re-adding it undoes this). The zone stays in Cloudflare:
#   dig +short ofl.ink      # still Cloudflare's addresses
#   Then stop the site serving at every address: Site configuration -> General -> Danger zone -> Delete this site. Irreversible, and the Operator's own act:
#   test "$(curl -s -o /dev/null -w '%{http_code}' https://linkmeclone3.netlify.app/netlify/functions/secrets.json)" != 200   # v1's secrets file is served nowhere

./check.sh
```

## Depends on

- **Phase 2.** Provides:
  - the Compose stack with the `caddy`, `app` and `pocketbase` services on the VPS, with n8n left outside it (ADR 0001)
  - Caddy's certificate storage on a volume, so a restart reissues nothing
  - the app serving Profile pages, Reveal (same-origin and rate-limited, ADR 0004) and `/r/{Link Id}`
  - the collections users, profiles, links and events
  - the re-runnable v1 Import, where v1 wins until Cutover
  - the parity check that "the VPS URL serves every existing profile identically"
  - the pre-Cutover v2 host
  - the deploy procedure and the v1 Import command (Phase 2 spec, Acceptance, its `# manual:` VPS lines), and the SSH tunnel to the PocketBase admin UI
  - Visitor location, reading `cf-ipcountry` and `cf-region-code` after v1's headers (Contracts, Visitor location), with the real country source left to Cutover (Further Notes); and Reveal's limit keyed on `X-Forwarded-For` (Reveal hardening)
  - the local loop: `docker compose up` behind the baseURL, seeded with the Fixture Profile (plan section 7)

  Precondition: TLS on 443 must reach v2's Caddy, because on-demand TLS is Caddy's. ADR 0001 leaves open whether n8n's set-up already holds ports 80 and 443. Only the Operator's look at the live VPS settles that.
  ASSUMPTION: the precondition is stated here rather than solved (rung 2: plan section 5 gives the VPS deploy to Phase 2, and ADR 0001 leaves the port question to the Operator). Overturned by `ss -ltnp` on the VPS. If a proxy that cannot pass TLS through by SNI holds 443, this Phase is blocked until the Operator chooses again.
- **Phase 1.** Provides Mode, Escape and the Escape Overlay in v2's copy of the public page, with the Tracking Code kept in the Escape target (plan section 4). The bootstrap rebuilds that target from `profilePath`. Its spec's capture of custom-scheme navigation is reused by behaviour 5.
- **Phase 3.** Provides:
  - the Profiles create and update rules, which this Phase extends with the Operator-only `customDomain` clause
  - the Editor and the API path it uses on the Profile origin, which behaviours 10 and 11 exercise
  - the reserved-Username list, which already holds `internal` (Phase 3 spec, Username rules, Reserved names)
- **Phase 4.** Provides the Page View ping and the events that behaviour 6 reads, and Stats.
  Phase 4's spec reads country from `CF-IPCountry` only (Phase 4 spec, Contracts, Visitor country). That source is parked needs-human with this Phase's zone move (DNS records).
- **Phase 0.** Nothing directly. Under section 8, its v1 data repairs ride inside Phase 2's v1 Import, which step 6 re-runs.

## Out of Scope

- **Any edit to v1.** That means the old GitHub repo, the Netlify site's config or deploys (run 1's `_redirects` deploy is gone), and the n8n Form. Section 8 binds.
- **Proxies (D7).** A bonus after Phase 5. Read as domain rotation, they are the Spare Domains here, with no extra code.
- **An Editor field for Custom Domains, and self-serve domains.** The Operator sets the field in the PocketBase admin UI. A self-serve field would need ownership proof, and sign-up is public.
- **DNS ownership verification (TXT challenge).** Only the Operator sets a domain, which makes the check redundant.
- **Automatic detection that a domain is Flagged, and automatic rotation.** Rotation is a human act, and Meta offers no signal to watch.
- **An "active domain" setting, or Editor share URLs that follow it.** Nothing in the plan displays or redirects by domain.
- **Buying domains through a registrar API.** It is a payment (floor 2), and one purchase does not justify automation.
- **Pairing `www` and apex for Custom Domains automatically.** Exact hostnames only; a Creator who wants both asks for both.
  ASSUMPTION: rung 5. Overturned if most Creators turn out to need both.
- **More than one Custom Domain per Profile.** Nobody asked for it.
- **A 404 gate for unknown hosts.** Caddy's ask refusal already keeps them off HTTPS.
- **Limiting Reveal and `/r` to the host's own Profile.** It serves no threat.
- **Redirecting `ofl.ink/{username}` to a Profile's Custom Domain.** Not asked for.
- **Mapping v1 Link Ids onto v2's.** ADR 0004 accepts that v1 Link Shortcuts break at Cutover, and step 12 tells Creators.
- **Removing the "Powered by ofl.ink" footer text on Custom and Spare Domains.** It is text linking a host-relative `landing.html` (`linkme_clone3/index.html:55`), not a request to ofl.ink.
  ASSUMPTION: rung 5. Overturned if Meta is seen Flagging pages on that text.
- **End-to-end TLS in `./check.sh` with Caddy's internal CA.** It works (observed for this spec), but it would add a 443 listener and certificate trust to the local loop. The ask contract is observed, and the wiring is proven on the VPS.
- **Off-site backups, certificate monitoring and alerting.** YAGNI. Off-site is one PocketBase setting if wanted (see Backups).
- **Content rules and abuse reporting for public sign-up.** Bonus unless abuse appears (section 9, D9).
- **Bonus items: geo-rules UI, ffmpeg, Umami.** The plan places them after Phase 5.

## Further Notes

- ASSUMPTION (evidence blocked): which provider hosts ofl.ink's DNS, which registrar holds it, and whether `www.ofl.ink` exists are unknown, because reading live DNS is barred (floor 2). Step 2 settles them before anything is served differently. Overturned by that step's output.
- ASSUMPTION: a 300-second TTL, set at the zone move at least 48 hours before the switch, bounds both the switch and a rollback to about five minutes (rung 4). Overturned if the DNS host enforces a higher minimum TTL.
- ASSUMPTION: one warmed Spare Domain is enough to call Spare Domains "ready" (rung 5: the smallest thing that meets "spare domains ready"). Overturned if the Operator wants several held at once.
- ASSUMPTION: the Cutover runbook lives in `RUN.md` at the repo root, beside `check.sh` (rung 3: plan section 7 names `RUN.md` for manual items, and run 1 put it at the root). Overturned if another Phase places `RUN.md` elsewhere; the `## Cutover` section moves with it.
- **Needs the human,** all in Acceptance, with exact commands where a command exists and the screen named where only a dashboard does:
  1. the port record, the deploy settings including fetching Cloudflare's ranges, and the ask check (step 1)
  2. reading live DNS, DNSSEC and the registrar (step 2)
  3. the Cloudflare account, any DNSSEC change and the nameserver change (step 3)
  4. buying a Spare Domain (step 4)
  5. backups (step 5)
  6. the n8n freeze, pulling v1's repo, the VPS import and parity (step 6)
  7. the readiness checks, the switch and the post-switch checks (steps 7–9)
  8. real phones (steps 4, 11 and 14)
  9. telling Creators, and the owner hand-over of imported Profiles (step 12)
  10. the rollback, if needed (step 13)
  11. each Custom Domain (step 14)
  12. rotation (step 15)
  13. switching v1 off: removing ofl.ink from the Netlify site, then deleting the site, which is irreversible (step 16)
  14. the production country source, Cloudflare or geo-IP on the VPS (DNS records, PARKED)

  Deleting the GitHub repo is never a step here; section 8 leaves it untouched.
- **Needs the human, unresolved by evidence:** do Spare Domains recover traffic at all? Every Spare Domain serves the same pages from the same VPS. Cloudflare's proxy hides that address for ofl.ink and the Spare Domains, but DNS-only Custom Domains publish it. So a Flag aimed at content or at the address could carry over. D6 and section 4 bind the mitigation, and this Phase implements it. The review confirmed this as needs-human (## Review, D11). Rotation does change the origin, so a Flag on the hostname alone is escaped, but nothing here shows that Meta does not carry a Flag across. Evidence that settles it: on the first real Flag, open the warmed Spare Domain through the actual bio link in Instagram on a phone and follow a Link onward. A warning there means rotation fails, and the Operator chooses another mitigation. A second server address is a candidate, not a proven cure.
- Evidence placed for this Phase:
  - `linkme_clone3/netlify.toml` holds no domain configuration, only `publish = "."`, a catch-all rewrite to `index.html` and headers.
  - The n8n export names `https://ofl.ink/{ID}` and `https://linkmeclone3.netlify.app/{ID}` in its form texts and has no domain handling.
  - No v1 code hard-codes ofl.ink apart from the footer text.
  - The link.me Template has no domain screen.

## Review

codex, 2026-10-02. A blind call (B) read the plan, CONTEXT.md, ADRs 0001–0005 and the harness, and then a draft call (D) read this spec. Neither could see docs/spec/, .scratch/ or linkme_clone3/. Totals: accept 13, partial 7, reject 10, needs-human 2.

Blind call:

- B1 Who binds a Custom Domain? Public sign-up does not settle it. **reject**: Schema already settles it (Operator only, rung 4), and behaviour 10 tests it.
- B2 Hostname resolution must keep certificate admission and routing in step. **reject**: one `resolveHost` feeds both the TLS Ask endpoint and the page grammar, and behaviour 9 checks that they change together.
- B3 Custom Domains need a route through Cloudflare (Creator proxying or Cloudflare for SaaS), or an explicit no-country policy. **reject**: DNS records already makes them DNS-only with the unknown country. Cloudflare for SaaS needs an account and a payment the plan never asks for.
- B4 The final data boundary needs a conflict policy for imports after v2 editing starts. **partial**: the freeze, the final import and the Editor after the switch were already there. Added: the import is never re-run after the switch, and the freeze holds through a rollback (Refreshing the v1 Snapshot, step 10). See D12.
- B5 The rollback must say what happens to v2-only data, the fresh Link Ids and v1's exposure. **accept**: What a rollback restores, story 14 and step 13 now say that ofl.ink serves v1's secrets file and v1 Link Ids again, and that v2 Link Ids reveal nothing there.
- B6 Whether a Spare Domain is an alias or the preferred address is still a product decision. **reject**: settled as always-live aliases with no active-domain setting (Spare Domains are always live, rung 5).
- B7 The domain lifecycle (normalisation, uniqueness, apex and `www`, removal, transfer) is undefined. **reject**: Interfaces covers normalisation, Schema covers the pattern and the unique index, Out of Scope covers `www`, and Removing a Custom Domain covers removal. A transfer is the Operator editing two fields.
- B8 Removing a domain must stop service even while its certificate is cached, and a failed lookup must deny. **reject**: removal includes a Caddy restart, after which Caddy re-asks and refuses (observed, Contracts). If PocketBase is down the endpoint answers 503, which Caddy takes as no.
- B9 Should the Editor, login and reset live on every origin or on one? **reject**: the rule is explicit (app routes match first on every host). No plan line restricts them, and nothing breaks.
- B10 Which requests count as Cloudflare's, how forged forwarding and country headers are handled, and what `XX` and `T1` mean. **accept**: see D2a. `XX` and `T1` are Phase 4's (`docs/spec/phase-04-stats.md:114`, its behaviour 4).
- B11 US-state Geo Rules (CONTEXT.md:104) need a trusted state source. **accept**: Phase 2 reads `cf-region-code` (`docs/spec/phase-02-vps-foundation.md:251`), and Cloudflare sends it only with the "Add visitor location headers" Managed Transform. Step 3 turns that on, and the Cloudflare lines treat the header like `CF-IPCountry`.
- B12 DNS, IPv6, Cloudflare TLS and who owns ports 80/443 beside n8n (ADR 0001:16). **accept**: see D4. DNS records and Moving the zone already covered the rest.
- B13 "Identical" parity needs interpreting. **reject**: Phase 2 owns the parity check and its cases (Depends on). This Phase only runs it.
- B14 A Spare Domain must keep working while ofl.ink is down. **partial**: behaviour 7 already covered the local hosts. It now also fails on any request that names `ofl.ink` (D8).
- B15 What do Visitors see on a stale v1 Link Shortcut? **reject**: ADR 0004 accepts the break, and the answer to an unknown `?link=` is Phase 2's.
- B16 Calling the ask endpoint proves only its answer, not that Caddy consults it, so test real TLS. **partial**: local TLS stays out (Out of Scope). Step 1 now reads the endpoint Caddy actually uses and requires a yes for ofl.ink and a no for `unknown.invalid`. Observed: `caddy adapt` on `caddy:2-alpine` prints `"permission":{"endpoint":"http://app:3000/internal/tls-ask","module":"http"}`, and the image ships BusyBox `wget`.
- B17 `check.sh` runs only Playwright (check.sh:1-3). **reject**: the loop belongs to Phases 0 and 2. This Phase adds one spec to it.
- B18 Spare Domains are disproved if a real Flag blocks the spare too. **needs-human**: the same question as D11.

Draft call:

- D1 Removing ofl.ink from Netlify is not "then off". `linkmeclone3.netlify.app` would keep serving the secrets file for good (goal_ai.txt:162, :219). **accept**: rung 2, because section 8 ends the exposure when Netlify is switched off. Turning Netlify off, story 16 and step 16 now have two human acts: remove the domain, then delete the site. The check is that the secrets path no longer answers 200.
- D2a Trusting Cloudflare's ranges with Caddy's default left-to-right `X-Forwarded-For` parsing lets a Visitor forge the rate-limit key. **accept**: reproduced locally with a header-echo upstream behind `caddy:2-alpine` v2.11.4. With a trusted peer and `X-Forwarded-For: 6.6.6.6, 1.2.3.4`, default parsing gave `xff=[6.6.6.6]` and `trusted_proxies_strict` gave `xff=[1.2.3.4]`. An untrusted peer gave `xff=[172.17.0.1] country=[]`. The Cloudflare lines now parse strictly and hand the app `{client_ip}` alone. The same check showed that Phase 2 reads `x-country` before `cf-ipcountry` (`docs/spec/phase-02-vps-foundation.md:250`), and that header passes through Cloudflare. v1's location headers are therefore now dropped on every request.
- D2b Stories 18–19 have no assertion, and the local listener leaves the lines out, so test both kinds of peer locally. **partial**: not locally, because Phase 2's parity spec and Phase 4's Stats spec inject location headers on the local listener (`phase-02-vps-foundation.md:468`, `phase-04-stats.md:225`). Step 7 now checks both stories at the origin and through Cloudflare.
- D3 Step 6's comparison exits 0 on a mismatch, the freeze does not prove the last edit landed, and only Profile JSON is compared. **accept**: the loop is now a gate that fails. Step 6 waits for n8n's running executions and Netlify's Published deploy to finish, then records the pulled commit. That commit must match the deploy's, which covers Destinations and images too.
- D4 `nc` cannot tell v2's Caddy from n8n's proxy on ports 80/443. **accept**: step 1 records `ss -ltnp` for both ports before deploying. Anything but v2's Caddy blocks the Phase until the Operator decides (ADR 0001:16). Step 4's Spare warm-up proves that a new hostname reaches Caddy.
- D5 A DS record at the registrar can turn the nameserver move into an outage, and step 8 contradicts "one DNS record change". **accept**: step 2 records the DS record, and step 3 turns DNSSEC off before the move and back on through Cloudflare. Solution and story 3 now say one change to the apex (and `www`) records.
- D6 The backup check proves neither that it restores nor that it is complete. **partial**: step 5 now requires the live Profile count and uploaded files in the zip, and says "complete and readable" instead of "restores". A restore into a second PocketBase is not added (rung 5).
- D7 Deleting the Events from before the switch is destructive scope nobody asked for, and it skips the aggregates. **accept**: removed from story 17, from Implementation Decisions and from step 10. The switch time in RUN.md tells test traffic apart. Aggregates were not the problem: Phase 4's `dailyStats` is a view computed on read (`phase-04-stats.md:138`).
- D8 Stories 27, 28 and 25 are untested: a literal ofl.ink request, Click Events on a Custom Domain, and Deeplink Mode. **accept**: behaviours 7, 6 and 3 are extended. Stories 18–19 are D2b.
- D9 The snapshot guard `test -z "$(git … status --porcelain)"` passes when git fails. **accept**: it is now `s="$(git …)" && test -z "$s"`.
- D10 `<Phase 2's v1 Import command>` and "Phase 2's deploy procedure" are placeholders, so "all with exact commands" is false. **accept**: both are filled in from `docs/spec/phase-02-vps-foundation.md:569-574`. Further Notes now says that steps done only in a dashboard name the screen.
- D11 Do Spare Domains survive a Meta Flag once their paths match ofl.ink's? **needs-human**, confirmed. For: a Spare Domain is a different origin, so a Flag on the hostname alone is escaped (codex; plan section 4 names D6 as the mitigation). Against: the same pages, Destinations and server sit behind it, and DNS-only Custom Domains publish the server's address, so a Flag on content or address may carry over (Further Notes). What settles it: after the first real Flag, open the warmed Spare Domain through the actual bio link in Instagram and follow a Link onward. Further Notes now calls a second server address a candidate, not a cure.
- D12 "v1 wins until Cutover" can be tested without the live site, but this spec doesn't test it, and nothing stops a re-run after the switch. **partial**: Phase 2 already tests it locally with `tests/fixtures/v1-rerun-a/` and `-b/` (`docs/spec/phase-02-vps-foundation.md:494-499`), so the test is not repeated here. The rule that the import is never re-run is added (Refreshing the v1 Snapshot, step 10).
- D13 Depends on treats Phase 4's Cloudflare choice and Phase 3's reserved list as facts. **partial**: both now cite their specs (`phase-04-stats.md:153,158`, `phase-03-auth-and-editor.md:206`) and stay conditional on them.

### Six hats

Six-hats review of specs 00–05 taken as one set (HEAD 16d5a11), reconciled in the plan review, 2026-10-02. Ids: W white, R red, K black, Y yellow, G green, U blue, C the coordinator's points, X found by the reconciler. Bullets about the whole set are reconciled only in `docs/spec/plan-review.md`, Six hats. Cross-spec line citations in the entries above date from their own review and may have drifted; the main text now cites sections.

- K3 **accept** (second trap). Acceptance now opens with `set -e`, as in Phases 1–4. The Snapshot check is split into two lines, because `set -e` ignores a failure on the left of `&&` (found by the plan review's own check; Phase 2's Acceptance notes the same rule).
- C4 **accept**. No runbook step set imported Profiles' owners; only Phase 3's Acceptance did, at Phase 3 time. Step 12 now does the hand-over after the switch, and refuses to before step 8, because step 6's import must be the last.
- K2 **accept**. Backups started only "from the Cutover on", while Profiles created only in v2 exist from Phase 3's deploy. Scheduled backups now start at Phase 3's deploy. This Phase checks them and proves one complete, and the Solution, story 20, Owns, Backups and step 5 now say so.
- W3 **accept**. Every main-text citation of another spec by line number (Phase 3's reserved names, Phase 2's limiter, Visitor location, re-runs, deploy lines, Phase 4's Schema and Visitor country) now cites a section name.
- C5 **accept**. Step 6's `--grep-invert 'Geo Rule'` rested on a rung-6 ASSUMPTION about Phase 2's test titles. Phase 2 now promises them, and the ASSUMPTION is a statement.
- K1 **accept**, fix folded into the parked country source. DNS records now says that Geo Rules on DNS-only Custom Domains take v1's US fallback. Observed: in all 7 v1 Geo Rules the US entry equals the catch-all `default`, so the code given is the catch-all, never another country's. Cloudflare for SaaS stays rejected (B3: a payment the plan never asks for). Only the geo-IP position gives these hosts real countries.
- G1 **needs-human** (with R2, U1 and C6). The ASSUMPTION that Phase 4's source is Cloudflare is replaced by a PARKED block under DNS records. It gives both positions with their rungs, the evidence that settles them (step 2's `dig` of NS and DS, and whether the Operator accepts a geo-IP licence and its refresh), and the stories, decisions and steps the question parks. The Solution and Further Notes' needs-human list name it. The ladder cannot settle it offline: rung 4 favours geo-IP only if the zone is not already on Cloudflare, and that is a live read (floor 2).
- C6 **accept**. The Spare Domain question stays needs-human (B18, D11), unchanged. Under the geo-IP position ofl.ink and the Spare Domains would also publish the VPS address, which the PARKED block records as a cost.
- Y3 **partial**. "Every risky step can be undone" holds for the record switch, the import's stale warnings and the hand-over. It does not hold for the zone move with a DNSSEC change, which is slow to undo, or for deleting the Netlify site, which step 16 already marks as irreversible and the Operator's own act. No change.
- W1 **partial** (Phase 5's size against the plan's "~1 day + ongoing", goal_ai.txt:161). The 48-hour lead and the DNSSEC work belong to the parked zone move. The rest of the runbook (freeze, final import, parity, switch, checks, rollback) is the plan's own Phase 5 and stays.

Counts: accept 7, partial 2, reject 0, needs-human 1 (the country source; the Spare Domain question is the existing needs-human, unchanged).
