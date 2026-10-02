# Phase 05 — Cutover and domains

**Objective.** ofl.ink is served by v2 from the VPS, with Netlify kept as a cold backup. A Creator's Custom Domain shows their Profile. At least one Spare Domain is ready to serve every Profile once ofl.ink is Flagged.

## Problem Statement

Visitors still reach v1 on Netlify. v2 runs on the VPS, but nobody gets there until ofl.ink's DNS moves, and the Operator has no written, reversible way to move it. Every Profile also lives under the one domain ofl.ink. When Meta Flags ofl.ink, every Creator's bio link breaks at once, and there is nowhere to send them. Plan section 4 calls this the riskiest assumption in the project. Creators who own a domain cannot use it: v1 has no Custom Domains (plan section 1), and the link.me Template has no screen for them (`link.me/**/*.html` mentions "domain" only inside a Meta pixel URL).

## Solution

The Operator follows a Cutover runbook in `RUN.md`. It records the current DNS, moves the zone to Cloudflare days ahead with v1's records and a low TTL, checks that v2 is ready, changes the ofl.ink records to point at the VPS through Cloudflare's proxy, checks the result, and says how to roll back. That is the whole Cutover: Caddy and the app need no change on the day. Netlify stays untouched for a month and is then turned off.

Caddy gets a certificate for a hostname the first time someone visits it, and only after asking the app whether the hostname is ofl.ink's own, a Spare Domain or a Custom Domain. Giving a Creator a domain then takes two steps: the Creator points an A record at the VPS, and the Operator types the domain into the Creator's Profile in PocketBase. No deploy is needed. A Spare Domain works the same way: buy it, point it at the VPS, list it in PocketBase, and open it once so its certificate is issued.

The domain types behave as follows:

- **Custom Domain.** It stands in for `ofl.ink/{username}`.
- **Spare Domain.** It serves every Profile at the same paths as ofl.ink.
- **All of them.** A Profile page never loads anything from another of ofl.ink's domains, so a Flagged ofl.ink does not drag the other domains down with it.

## User Stories

Cutover

1. As the Operator, I want a Cutover runbook in `RUN.md` with exact commands in order, so that I can switch ofl.ink to v2 in one sitting without guessing.
2. As the Operator, I want to record every record of the ofl.ink zone as the DNS host defines it (type, name, value, TTL), and the live answers beside them, before changing anything, so that a rollback restores exactly what v1 had.
3. As the Operator, I want the ofl.ink zone moved to Cloudflare at least 48 hours ahead, carrying v1's records unchanged with a 300-second TTL, so that the switch and any rollback are one record change that takes effect within minutes.
4. As the Operator, I want a readiness gate before the switch, so that I switch only once v2 shows every v1 Profile identically. The gate is three checks: Phase 2's parity spec passes against the VPS, the TLS Ask endpoint on the VPS says yes to ofl.ink and to Phase 2's v2 host, and ports 80 and 443 are open.
5. As the Operator, I want no n8n Form submissions between the final v1 Import and the switch, so that no v1 edit is lost on the way to v2.
6. As the Operator, I want the Cutover to be a DNS change only, with nothing in Caddy or the app changing on the day, so that rolling back is the same DNS change in reverse.
7. As a Visitor, I want every ofl.ink URL already in a bio to keep working after the Cutover, so that tapping a Creator's bio link still opens their Profile. That covers `ofl.ink/{username}`, `ofl.ink/{username}/{code}` and Link Shortcuts.
8. As the Operator, I want post-switch checks, so that I know ofl.ink is now served by v2 and the v1 secrets path stays dead. The checks are: v2's TLS Ask endpoint answers on ofl.ink, a Profile's JSON answers 200, the certificate was issued, and the old `secrets.json` path answers the page shell rather than a JSON file.
9. As the Operator, I want to re-run the real-device test matrix from plan section 4 on ofl.ink after the switch, so that every Mode still works inside each In-App Browser and in Safari and Chrome.
10. As the Operator, I want a rollback procedure that re-creates the recorded DNS records, so that Visitors get v1 back within one TTL if v2 misbehaves.
11. As the Operator, I want v1 on Netlify left serving for 30 days after the Cutover, so that the rollback has somewhere to go.
12. As the Operator, I want a dated step that turns Netlify off after those 30 days without losing the ofl.ink DNS zone, so that v1 stops serving and costing attention while DNS stays intact.

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
30. As the Operator, I want each Spare Domain pointed, certified and checked before it is needed, including once inside Instagram on a phone, so that rotating to it is instant and it is not already Flagged.
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
  - **Backups.** v2's PocketBase data from the Cutover on, when v2 becomes the only copy of edits made in the Editor.
  - **The Caddy country lines** that Phase 4's Cutover note asks for (see Caddy configuration).
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
    - The app's own routes match before this grammar on every host: Reveal, `/r`, Phase 4's `/v`, the TLS Ask endpoint, the Editor and the PocketBase API paths Phase 3 proxies, and v1's static files. On a Custom Domain, `/{code}` therefore only sees paths that no route claims.
    - **Removing a Custom Domain** means clearing the field. The TLS Ask endpoint then says no, so Caddy obtains no new certificate for it. Caddy may still present the certificate it already holds until that lapses. Meanwhile the domain is an `unknown` host and gets the `/{username}` grammar like one.
      ASSUMPTION (evidence blocked): whether Caddy re-asks before serving a stored on-demand certificate was not observed for this run. Rung 5 for the decision itself. Overturned if a removed domain must stop serving at once; the Operator then also deletes its certificate from Caddy's data volume.
  - **TLS Ask endpoint** `GET /internal/tls-ask?domain=<hostname>`:
    - 200 with an empty body when `resolveHost` gives `primary`, `spare` or `custom`
    - 404 for `unknown`
    - 400 when `domain` is missing or not a hostname
    - 503 when PocketBase cannot be reached, which also means "no"

    The route matches before the Profile catch-all and is reachable on every host. That exposes only whether a hostname is served by ofl.ink, which public DNS already shows.
    ASSUMPTION: the path `/internal/tls-ask` is chosen to stay clear of `/api` (PocketBase) and `/r` (rung 6). Phase 3's reserved-Username list already holds `internal` (phase-03, Username rules). Overturned by a route-naming convention set in Phase 2.
  - **Public page bootstrap.** The app embeds the result of `resolveProfileRequest` in each Profile page it serves (`username`, `trackingCode`, `profilePath`). v2's copy of the public page script (phase-04, Public page copy) reads it there instead of parsing `location.pathname`. Today `script.js:46-50` takes the Username from the first path segment and falls back to `juliafilippo_` on `/`, which would show the wrong Profile on a Custom Domain's root. Any URL the page builds for itself is rebuilt from `location.origin` + `profilePath`: address-bar cleanup, Escape targets and anything carrying a Tracking Code. Nothing the page loads or builds names ofl.ink. v1 already calls the profile JSON and Reveal through host-relative URLs (`script.js:67`, `:85`, `:233`), so origin-agnostic calls are house practice.
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
  - **Who can set a Custom Domain.** Phase 3's create rule and update rule on Profiles each gain the clause `@request.body.customDomain:isset = false` (PocketBase 0.23 syntax; Phase 2 pins at least 0.23). Without the create clause, a Creator could set the field when creating the Profile during Onboarding. Only the Operator sets it, as a superuser in the PocketBase admin UI. There is no Editor field for it.
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
    - The country lines, on the catch-all from this Phase's deploy on, so the switch itself changes nothing in Caddy:
      - `trusted_proxies` holds Cloudflare's published ranges.
      - Every request loses any `X-Country` it carries.
      - A request whose direct peer is in those ranges (a `remote_ip` matcher) then gets `X-Country` set from `CF-IPCountry`.
      - From any other peer, `CF-IPCountry` is removed too. A Visitor who reaches a DNS-only Custom Domain directly therefore cannot choose their country; their Events record `XX`.
      - The local loop's plain-HTTP listener carries none of these lines, so specs still send their own `x-country`.

      ASSUMPTION: peer-matched rather than a plain `header_up X-Country {header.CF-IPCountry}` (rung 4: the plain line trusts a header any Visitor can send on a DNS-only host). Cloudflare's ranges are copied into the Caddyfile by hand at deploy (rung 5). Overturned if Cloudflare changes its ranges; the copy is then refreshed.
  - **`PRIMARY_HOSTS`.** A comma-separated app setting:
    - production: `ofl.ink`, plus `www.ofl.ink` if it exists, plus the host of Phase 2's `SITE_ADDRESS` (the pre-Cutover v2 host). The catch-all now serves that host too, so its certificate also passes the ask check.
    - local: `localhost`
  - **ofl.ink's certificate.** ofl.ink itself gets its certificate on demand, so the Cutover changes nothing in Caddy.
    ASSUMPTION: chosen because a fixed site block for ofl.ink would fail ACME validation until DNS moves and could leave Caddy in retry backoff at the moment of the switch (rung 4: the Cutover stays a pure DNS change). Overturned if a few seconds of certificate issuance for the first Visitor after the switch is unacceptable. In that case a fixed block is added right after DNS moves.
  - **Test domains.** `05-domains` arranges its own domains through PocketBase's REST API on the loopback port, the way Phase 2's tests arrange state. It sets the Fixture Profile's `customDomain` to `creator.test`, adds the Spare Domain `spare.test` and removes both afterwards. `unknown.test` is never added. Phase 2's seed, the v1 Import of the local v1 tree, is unchanged: v1 files have no domain field. `.test` is a reserved top-level domain, so none of these names can resolve on the public internet.
    ASSUMPTION: in-test set-up rather than a seed change (rung 3, Phase 2's practice; rung 4, the seed stays untouched). Overturned if the seed must carry the domains for a check outside Playwright.
- **What does not change per host.** Reveal and the `/r/:linkId` redirect behave the same on every host and are not limited to the host's own Profile.
  ASSUMPTION: rung 5. Overturned if a Custom Domain must refuse other Profiles' Link Ids.
  A Profile also stays reachable at `ofl.ink/{username}` after it gets a Custom Domain, with no redirect.
  ASSUMPTION: rung 5. Overturned if Creators want ofl.ink to send Visitors on to their Custom Domain.
- **Spare Domains are always live.** Every listed Spare Domain serves every Profile at all times. Rotating means people replace ofl.ink in bio links, and nothing in v2 changes. There is no "active domain" flag.
  ASSUMPTION: rung 5. Overturned if v2 must redirect from, or display, a currently active domain.
- **DNS records.**
  - ofl.ink and every Spare Domain sit in Cloudflare with Proxied records to the VPS's address. Phase 4 takes Visitor country from Cloudflare's `CF-IPCountry` and puts them there at Cutover.
  - Cloudflare's SSL/TLS mode is Full (strict), and Always Use HTTPS stays off. Let's Encrypt's HTTP-01 challenge then reaches Caddy, which redirects to HTTPS by itself.
  - Custom Domains get a DNS-only A (and AAAA) record to the VPS's address (ADR 0001), and their Events record country `XX` (Phase 4).
  - Cloudflare replaces the `Server` header, so the post-switch checks identify v2 by its TLS Ask endpoint's empty 200, not by `Server: Caddy`.

  ASSUMPTION: rung 3, following Phase 4's decision. This meets the condition this spec first set for leaving its DNS-only reading of ADR 0001. Overturned if the Operator will not use Cloudflare; every record is then DNS-only and Events record `XX`.
  ASSUMPTION (evidence blocked): HTTP-01 through Cloudflare's proxy, and on-demand issuance on Cloudflare's first handshake with the origin, were not observed for this run. The post-switch certificate check settles it. If issuance fails, the runbook sets the record DNS-only once so that Caddy issues directly, then sets it back to Proxied.
- **Moving the zone.** Cloudflare's proxy needs the zone on Cloudflare's nameservers, so the zone moves at least 48 hours before the switch, while v1 still serves.
  - Every recorded record is re-created there DNS-only. Netlify-only types (NETLIFY, ALIAS) become an apex CNAME to `linkmeclone3.netlify.app`, which Cloudflare flattens.
  - The Cloudflare records are written into `RUN.md` as the rollback target.
  - The switch and the rollback are then one record change each, inside Cloudflare.

  ASSUMPTION: rung 4. Moving the nameservers early, with nothing served differently, separates the slow and risky step from the switch. Overturned if ofl.ink's registrar cannot delegate to Cloudflare.
- **Cutover runbook.** A `## Cutover` section in `RUN.md` at the repo root holds the `# manual:` steps of the Acceptance block below, in that order, with blanks for the recorded DNS answers and the dates. The plan names `RUN.md` as the home of manual items (plan section 7).
  ASSUMPTION: `RUN.md` sits at the repo root beside `check.sh` (rung 3). Overturned if Phase 1 or 2 already placed it elsewhere.
- **Freezing v1 edits.** The n8n Form is not changed (D1). The Operator stops submitting it from the final v1 Import until the switch. After the Cutover, edits made through it reach only the Netlify cold backup.
  - The final v1 Import is a re-run of Phase 2's import, which upserts by Username and Link Id, lets v1 win and deletes nothing.
  - A re-run therefore overwrites any v2-side edit to an imported Profile. Profiles created only in v2 survive it.
  - So the Operator invites the Creators of imported Profiles to the Editor only after the switch, and asks any already invited to hold their edits until then.
  ASSUMPTION: rung 4, no edit is lost. Overturned if the import is changed to skip Profiles already edited in v2.
- **What a rollback restores.** Rolling back moves ofl.ink alone.
  - v2 keeps running with all its data, and Custom Domains and Spare Domains stay served by it.
  - While rolled back, ofl.ink shows v1 as it stood at the final Import. Profiles created only in v2, v2-side edits since the switch and Stats are hidden there, not lost, and they return when ofl.ink is switched back.
  - The trigger is any failed post-switch verify step, or a Mode that passed the device matrix on v1 and fails it on v2. Later in the 30 days, rolling back is the Operator's call.
  - v2's own data is covered by this Phase's Backups.
  ASSUMPTION: rung 5. Overturned if a rollback must also carry v2-side edits back into v1.
- **Backups.** Before the switch, the Operator turns on PocketBase's scheduled backups in the admin UI (Settings → Backups): daily, keeping 7. Before the switch, one backup is also taken by hand, downloaded to the Mac through the SSH tunnel and restored into a throwaway local PocketBase, to prove a restore works.
  ASSUMPTION (evidence blocked): the PocketBase release Phase 2 pins has built-in scheduled backups; no PocketBase binary or docs were on this machine to observe. Overturned if it has none; a nightly cron job on the VPS then copies the PocketBase volume, stopped for the copy, into a dated directory.
  ASSUMPTION: backups stay on the VPS disk, apart from the one downloaded copy (rung 5). The numbers daily and 7 are rung 6. Overturned if the Operator wants an off-site copy; PocketBase's S3 backup setting then takes it.
- **Readiness traffic leaves no Stats.** The parity runs against the VPS, the ask checks and the Spare Domain warm-up all write Page Views and Clicks into real Profiles before the switch. The runbook records the switch time in `RUN.md`. After the post-switch checks pass, it takes one backup and then deletes every `events` record created before that time.
  ASSUMPTION: every Event before the switch is test traffic, because no real Visitor reaches v2 until ofl.ink points at it (rung 4: the backup keeps them). Overturned if the v2 host or a Spare Domain was shared with real Visitors before the switch.
- **Turning Netlify off.** 30 days after the Cutover, "off" means three steps:
  - publish one last production deploy whose only file is a `_redirects` holding `/* https://ofl.ink/:splat 301!`
  - remove ofl.ink from the Netlify site's domains
  - stop builds

  `linkmeclone3.netlify.app` (the address shown in the n8n Form's texts) then sends every old path to the same path on ofl.ink, and v1's pages and Reveal function stop answering there. Republishing an earlier deploy undoes it. Deleting the site remains the Operator's separate, irreversible decision.
  ASSUMPTION: a redirect rather than a blank site (rung 4: links shared under the Netlify address keep working through v2, and Netlify's deploy list undoes it). Overturned if the Operator wants that address dead, or the site deleted outright.

## Testing Decisions

- **One seam.** The Playwright spec `tests/e2e/05-domains.spec.ts` runs against the local stack on the existing baseURL (`http://localhost:4173`), through the same `./check.sh` loop and Phase 2's webServer wrapper.
  - At file level it launches Chromium with `--host-resolver-rules=MAP *.test 127.0.0.1`. The browser then sends real `creator.test:4173` / `spare.test:4173` Host headers over plain HTTP. Checked on 2026-10-02 against `tests/dev-server.mjs`: Chromium loaded `http://creator.test:4199/juliafilippo_`.
  - Playwright's `request` fixture does **not** use that mapping (`getaddrinfo ENOTFOUND`, observed). So Host-routing checks go through `page` only, and TLS Ask checks go through `request` against the baseURL with `?domain=`.
  - `playwright.config.ts` is unchanged.
  - **Set-up, not a second seam.** `beforeAll` gives the Fixture Profile `customDomain = creator.test` and adds the Spare Domain `spare.test` through PocketBase's REST API on its loopback port, as a superuser, the way Phase 2's tests arrange state. `afterAll` removes both, and a test that changes a domain restores it.
  - A failing assertion names the Link Id and never prints a Destination (Phase 2's rule).
  - The spec saves a screenshot of `creator.test/` to `.scratch/goal_ai/shots/05-domains.png` (plan section 7).
- **Behaviour the spec asserts:**
  1. **TLS Ask.** It answers 200 for `creator.test`, `spare.test` and `localhost`, something other than 200 for `unknown.test`, and 400 when `domain` is missing.
  2. **Custom Domain root, Tracking Code and Link Shortcut.**
     - `creator.test/` shows the Fixture Profile's display name and Link cards.
     - `creator.test/{code}` shows the same Profile.
     - `creator.test/?link={Link Id}` reveals that Link on load, as `localhost/{username}?link={Link Id}` does.
  3. **Attribution on every host.** Two different Tracking Codes, A and B, each on `creator.test/{code}`, `spare.test/{username}/{code}` and `localhost/{username}/{code}`. It asserts behaviour rather than parameter names:
     - The Adult Link's Reveal request goes to the page's own host and carries that page's code. It answers 200 with the Destination that Phase 2's v1 oracle gives for that Link and code.
     - The Direct Mode Link ends at the oracle's Destination.
     - Navigation to a Destination is intercepted, as in `00-smoke`.
  4. **Spare Domain.** `spare.test/{username}` shows the Fixture Profile, and `spare.test/{username}?link={Link Id}` reveals that Link on load.
  5. **The Escape target keeps the host.**
     - With an iOS Instagram User-Agent, tapping the Escape Mode Link on `creator.test/{code}` navigates to an `x-safari-https://` URL whose host is `creator.test` and whose path is `/{code}`, with no Username segment.
     - With an Android Instagram User-Agent, the `intent://` URL names `creator.test` the same way.
     - On `spare.test/{username}/{code}` the target keeps `/{username}/{code}`.
     - Custom-scheme navigation is captured the way Phase 1's spec captures it.
  6. **Page View.** On `creator.test/`, the Page View ping goes to the page's own host at `/v/{username}` with the Fixture Profile's Username (Phase 4's route).
  7. **No cross-domain loads.** On `creator.test` and `spare.test`, no request goes to another of ofl.ink's hosts (`localhost:4173`, the other `.test` host). Third-party hosts are left alone: v1's `index.html:9` and `:42` load `cdnjs.cloudflare.com` and `upload.wikimedia.org`.
  8. **Cross-origin Reveal refused.** A `fetch` from a page on `creator.test` to Reveal on `spare.test:4173` cannot be read by the page (ADR 0004 same-origin).
  9. **Assignment is live, unique and ranked.** Each step goes through the REST set-up:
     - Changing the Fixture Profile's `customDomain` to `creator2.test` makes `creator2.test/` show the Profile on the next load, with no restart. TLS Ask then answers 200 for `creator2.test` and 404 for `creator.test`.
     - Giving a second Profile, which the test creates, the same `customDomain` is refused.
     - With the second Profile's `customDomain` set to `spare.test`, `spare.test/{username}` still shows the Fixture Profile.
  10. **Only the Operator sets a domain.** Signed in as a verified Creator the test creates as superuser, a request that creates a Profile with `customDomain` is refused, and so is one that updates the Creator's own Profile's `customDomain`. The stored value stays unchanged.
  11. **Domains stay private.** Without a token, no response to these three requests at the baseURL contains `creator.test` or `spare.test`: `/api/profiles/{username}.json`, `/api/collections/profiles/records` and `/api/collections/spareDomains/records`.
- **One wiring check outside Playwright, in the Acceptance block.** It runs on a stack started with Phase 2's test env file. It reads the ask URL from Caddy's own adapted config and calls it from inside the Caddy container. The answer must be yes for `localhost`, a primary host that needs no PocketBase data, and no for `unknown.test`. That catches a wrong ask URL, which nothing else short of production would show. The stack is taken down before `./check.sh`, whose wrapper starts its own. It is the only non-Playwright check.
- **Not tested locally.** Real certificate issuance, live DNS and real devices. They are `# manual:` steps.
- **Prior art.**
  - `tests/e2e/00-smoke.spec.ts`. It intercepts Reveal with `page.route` and fulfils navigation to a harmless page, overrides the User-Agent with `test.use`, and targets the `#displayName` and `.link-card` selectors.
  - Phase 2's specs, for REST set-up and the v1 oracle.
  - Phase 1's spec, for capturing custom-scheme navigation.

## Acceptance

```sh
# --- automated, local, plain HTTP ---
# The exact ask URL Caddy is configured with says yes to a known host and no to an unknown one, called from inside Caddy,
# on a stack started with Phase 2's test env file and taken down before ./check.sh starts its own.
docker compose --env-file tests/e2e.env up -d --build --wait
docker compose --env-file tests/e2e.env exec -T caddy caddy validate --config /etc/caddy/Caddyfile
ASK=$(docker compose --env-file tests/e2e.env exec -T caddy caddy adapt --config /etc/caddy/Caddyfile \
  | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).apps.tls.automation.on_demand.permission.endpoint')
docker compose --env-file tests/e2e.env exec -T caddy wget -q -O /dev/null "$ASK?domain=localhost"
if docker compose --env-file tests/e2e.env exec -T caddy wget -q -O /dev/null "$ASK?domain=unknown.test"; then echo "ask allowed an unknown host" >&2; exit 1; fi
docker compose --env-file tests/e2e.env down -v

test -f tests/e2e/05-domains.spec.ts
grep -q '^## Cutover' RUN.md

# --- needs the human (floor 2: live DNS, the real VPS, Netlify, purchases) ---
# manual: deploy this Phase to the VPS by Phase 2's deploy procedure, with PRIMARY_HOSTS=ofl.ink,<v2 host> in the VPS .env
#   (<v2 host> is Phase 2's SITE_ADDRESS; add www.ofl.ink if the next step shows it exists).
# manual: record v1's DNS in RUN.md. First copy every record of the ofl.ink zone as the current DNS host lists it
#   (type, name, value, TTL; Netlify DNS: Domains -> ofl.ink -> DNS records), NETLIFY and ALIAS records included. Then the live answers:
#   dig +short NS ofl.ink; dig +noall +answer ofl.ink A ofl.ink AAAA www.ofl.ink CNAME www.ofl.ink A www.ofl.ink AAAA
# manual: at least 48 h before the switch, move the zone to Cloudflare (Phase 4's country source) with v1 still serving:
#   add ofl.ink to a Cloudflare account; re-create every recorded record there DNS-only, with TTL 300 on the apex and www records;
#   NETLIFY or ALIAS records become an apex CNAME to linkmeclone3.netlify.app; SSL/TLS mode Full (strict); Always Use HTTPS off;
#   Network > IP Geolocation on. Write the Cloudflare records into RUN.md as the rollback target. At the registrar, set the NS
#   to the pair Cloudflare names. Then check that v1 still serves:
#   dig +short NS ofl.ink                                                                      # Cloudflare's pair
#   curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'
# manual: readiness. Bring the v1 tree on the Mac and on the VPS to the commit the live v1 serves. This moves v1's data and static files
#   only; v2's page script is its own copy since Phase 4. From the Mac:
#   PLAYWRIGHT_BASE_URL=https://<v2 host> npx playwright test tests/e2e/02-profile-parity.spec.ts
#   On the VPS, in the v2 directory, run the ASK= line above without --env-file, then:
#   for h in ofl.ink <v2 host>; do docker compose exec -T caddy wget -q -O /dev/null "$ASK?domain=$h" || echo "ask refused $h"; done
# manual: from the Mac: nc -zv "$VPS_IPV4" 80 && nc -zv "$VPS_IPV4" 443
# manual: buy at least one Spare Domain (payment); add it to Cloudflare with ofl.ink's SSL/TLS settings and A -> $VPS_IPV4 Proxied, and set
#   its NS at the registrar; add it to spareDomains in the PocketBase admin UI; warm and check it:
#   curl -s -o /dev/null -w '%{http_code}\n' "https://$SPARE/$USERNAME"    # expect 200; the first call issues the certificate
#   then open https://$SPARE/$USERNAME inside Instagram on a phone: the Profile opens with no Meta warning.
# manual: stop submitting the n8n Form. Invite Creators of imported Profiles to the Editor only after the switch (Freezing v1 edits).
#   Copy the current v1 tree to the VPS, run the final v1 Import (Phase 2's command), then re-run the parity spec.
# manual: backups (Backups): in the PocketBase admin UI over the SSH tunnel, Settings -> Backups: schedule daily, keep 7. Create one
#   backup by hand, download it to the Mac, and restore it into a throwaway local PocketBase; its Profiles must open.
# manual: switch: write the time (UTC) into RUN.md, then in Cloudflare replace the ofl.ink apex record with A ofl.ink -> $VPS_IPV4, Proxied
#   (AAAA -> $VPS_IPV6 Proxied only if the VPS has IPv6, else none); point www at ofl.ink, Proxied, if it existed.
# manual: verify from the Mac (the first request issues the ofl.ink certificate):
#   test "$(curl -s -w '%{http_code}' 'https://ofl.ink/internal/tls-ask?domain=ofl.ink')" = 200      # empty body + 200 = v2, not v1's catch-all page
#   test "$(curl -s -o /dev/null -w '%{http_code}' "https://ofl.ink/api/profiles/$USERNAME.json")" = 200
#   S="${TMPDIR:-/tmp}/secrets-path"; code=$(curl -s -o "$S" -w '%{http_code}' https://ofl.ink/netlify/functions/secrets.json)
#   case "$code" in 200|404) ;; *) echo "secrets path answered $code" >&2; false;; esac        # answered, not failing
#   ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$S" 2>/dev/null  # the page shell, not a JSON file
#   on the VPS: docker compose logs caddy | grep -i 'certificate obtained successfully' | grep -q ofl.ink
#   if no certificate was obtained: set the apex record DNS-only, repeat the first curl so Caddy issues directly, then set it back to Proxied.
# manual: clear readiness traffic (Readiness traffic leaves no Stats): create one backup by hand, then in the admin UI filter events by
#   created < "<switch time from RUN.md>" and delete every match.
# manual: real-device matrix (plan section 4) on https://ofl.ink/$USERNAME for every Mode, inside Instagram, Facebook, Threads and TikTok
#   and in Safari and Chrome, on iOS and Android.
# manual: rollback if a verify step fails, or a Mode that passed on v1 fails the matrix: in Cloudflare, restore the records written at the zone move
#   (DNS-only); v1 on Netlify answers again within one TTL. See "What a rollback restores".
# manual: first Custom Domain: the Creator sets A $DOMAIN -> $VPS_IPV4; the Operator sets that Profile's customDomain in the PocketBase admin UI; then:
#   dig +short A "$DOMAIN"; curl -s -o /dev/null -w '%{http_code}\n' "https://$DOMAIN/"      # expect $VPS_IPV4, then 200
#   open https://$DOMAIN/ inside Instagram on iOS and on Android and tap a Link of each Mode the Profile uses; an Escape lands on $DOMAIN, not ofl.ink.
# manual: when ofl.ink is Flagged: the Operator and Creators replace ofl.ink with a warmed Spare Domain in every bio link; nothing in v2 changes.
#   Links already posted outside bios (stories, DMs, old posts) keep ofl.ink and are not recovered.
# manual: Cutover + 30 days: the NS are Cloudflare's since the zone move, so nothing in Netlify answers for ofl.ink's DNS. Deploy the redirect
#   from an empty directory, so that no netlify.toml or functions are picked up:
#   D=$(mktemp -d); printf '/* https://ofl.ink/:splat 301!\n' > "$D/_redirects"; (cd "$D" && netlify deploy --prod --dir . --site "$NETLIFY_SITE_ID")
#   In Netlify, remove ofl.ink under Domain management and stop builds. Then check:
#   test "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "https://linkmeclone3.netlify.app/$USERNAME")" = "301 https://ofl.ink/$USERNAME"
#   To undo: Netlify -> Deploys -> an earlier deploy -> Publish deploy. Deleting the site (netlify sites:delete) is a separate Operator decision.

./check.sh
```

## Depends on

- **Phase 2.** Provides:
  - the Docker Compose stack, with Caddy on ports 80/443 on the VPS beside n8n, the Node app serving Profile pages, Reveal and `/r/:linkId`, and PocketBase with the `profiles` collection on loopback only
  - one Caddy site at `SITE_ADDRESS`, and a volume that keeps Caddy's certificates
    - This Phase replaces that site with the on-demand catch-all. Phase 2 left on-demand TLS and its ask check to this Phase.
    - On-demand TLS relies on that volume, so a restart re-issues nothing.
  - the Caddyfile at the image default `/etc/caddy/Caddyfile`
  - the local loop on `http://localhost:4173`:
    - `tests/e2e.env`
    - the webServer wrapper, which starts the stack in its own Compose project, seeds it with the v1 Import and tears it down
    - tests that arrange state through PocketBase's REST API on loopback
  - the v1 Import, an upsert by Username and Link Id where v1 wins and nothing is deleted, so it can be re-run as the final Import
  - the parity spec `tests/e2e/02-profile-parity.spec.ts`, which `PLAYWRIGHT_BASE_URL` points at the VPS, and the v1 oracle its tests use
  - `tests/fixtures/secrets.json`, which gives the Fixture Profile's Adult Link the Destination behaviour 3 reveals

  ASSUMPTION: the Caddyfile path and the baseURL port carry over from the image default and plan section 7. Overturned by Phase 2's compose file, whose values the Acceptance then uses.

  Precondition: TLS on 443 must reach v2's Caddy, directly or by SNI passthrough, because on-demand TLS is Caddy's. Of Phase 2's open 80/443 answer (its needs-human D11b), "nothing holds them" and "Caddy fronts both" meet it. "The existing proxy fronts v2" meets it only if that proxy passes TLS through by SNI; otherwise this Phase is blocked until the Operator chooses again.
  ASSUMPTION: the precondition is stated rather than solved here (rung 2: plan §5 makes Phase 2 own the deploy). Overturned by the `docker ps` / `ss` output on the VPS, which settles D11b.
- **Phase 0.** v1 with `secrets.json` no longer served. The cold backup and any rollback target must be that fixed v1.
- **Phase 1.** Provides:
  - the Mode and Escape code in the public page, which the bootstrap change and the post-switch real-device matrix both cover
  - the escape target `https://{host}/{username}[/{code}]`, which the bootstrap change rebuilds from `profilePath`
  - its capture of custom-scheme navigation, which behaviour 5 reuses
- **Phase 3.** Provides:
  - the Profiles create and update rules, which this Phase extends with the Operator-only `customDomain` clause
  - the allow-listed PocketBase API proxy on the Profile origin, which behaviour 11 reads; `spareDomains` is not on the list, so it answers 404 there
  - the reserved-Username list, which already holds `internal`
- **Phase 4.** Provides:
  - the Page View ping `POST /v/{username}`, which behaviour 6 checks
  - the production country source, Cloudflare's `CF-IPCountry`. This Phase owns the set-up: the runbook moves the zone and proxies the records, and the catch-all carries the country lines (Caddy configuration).
  - v2's own copy of the public page script (phase-04, Public page copy), which the bootstrap edits

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

- ASSUMPTION (evidence blocked): which provider hosts ofl.ink's DNS, which registrar holds it, and whether `www.ofl.ink` exists are all unknown, because reading live DNS is barred by floor 2. The runbook's `dig` step and the zone move settle them before anything is served differently. Overturned by that step's output.
- ASSUMPTION: a 300-second TTL set at least 24 hours before the switch bounds both the switch and a rollback to about five minutes (rung 4). Overturned if the DNS host enforces a higher minimum TTL.
- ASSUMPTION: one Spare Domain is enough to call Spare Domains "ready" (rung 5: smallest that meets "spare domains ready"). Overturned if the Operator wants several held at once.
- Evidence placed for this Phase:
  - **v1 Netlify config.** `linkme_clone3/netlify.toml` holds no domain configuration, only a catch-all rewrite to `index.html`.
  - **n8n export.** `n8n_oflink_Feb18.json` has no domain handling. Its form texts name `https://ofl.ink/{ID}` and `https://linkmeclone3.netlify.app/{ID}`.
  - **v1 code.** No v1 code hard-codes ofl.ink apart from the footer text.

## Review

codex, 2026-10-02. Two calls, both exited 0 with fresh output. Call 1 (blind) had only the plan, CONTEXT.md, the ADRs and the test harness. Call 2 also had this spec. Claims were checked against the real repo, read-only, including the Phase 0–4 specs that the reviewer could not see. Those specs were being edited during this review, so they are cited by section, not by line.

Call 1, blind:

- **partial**: B1. "DONE does not establish rollback safety, domain isolation or recovery from flagging." The spec already has a rollback, behaviour 7 and a rotation procedure. What a rollback restores is now its own decision (B4). Whether rotation actually recovers traffic is B24b.
- **reject**: B2. Keep Netlify, or use Traefik. D1 is a binding constraint (goal_ai.txt:73), and D6 plus Phase 2 already chose Caddy.
- **reject**: B3. Pre-provisioned domains versus self-serve domains with a verification lifecycle. D6 names on-demand TLS (goal_ai.txt:94-95), so the spec makes domains Operator-only behind the ask check and leaves self-serve to D9.
- **accept**: B4. "Cold backup" promised nothing specific. The new decision "What a rollback restores" says it: ofl.ink alone moves, v2 and its data keep running, and Custom and Spare Domains stay on v2. v2-only Profiles, edits and Stats are hidden, not lost. The decision also names the trigger.
- **reject**: B5. Spare Domains versus Custom Domains versus both. The spec builds both, as D6 asks.
- **reject**: B6. Domain rotation versus an HTTP proxy. The Out of Scope section already leaves D7 out and specs only rotation.
- **partial**: B7. "On-demand TLS is already Phase 2's." That is wrong: Phase 2's Caddy decision leaves on-demand TLS and the ask check to this Phase. The check did find that Phase 2's `SITE_ADDRESS` host is served by the new catch-all but was missing from the production `PRIMARY_HOSTS`. It is added, and Depends on now names the site this Phase replaces.
- **partial**: B8. The parity gate lacked a concrete procedure. The readiness step now names Phase 2's parity spec and its `PLAYWRIGHT_BASE_URL` command (Phase 2's test loop), run on the same v1 commit on the Mac and the VPS. The reviewer's list of discrepancy criteria is rejected: Phase 2's oracle is v1 itself, which already defines "identical".
- **accept**: B9. There was no single writer during the transition. "Freezing v1 edits" now states that the final Import is Phase 2's v1-wins upsert (Phase 2's v1 Import decision), which overwrites v2-side edits to imported Profiles. So imported Creators get the Editor only after the switch.
- **partial**: B10. Recovery guarantees. Data loss, the trigger and the owner are now stated in "What a rollback restores". RPO and RTO numbers are rejected as YAGNI; the 300 s TTL already bounds the switch. Backing up v2's data stays with Phase 2's volumes.
- **partial**: B11. The DNS transition procedure. Recording the zone is now complete (call 2's finding 3). Checking found that Phase 4 now fixes Cloudflare's `CF-IPCountry` as the production country source, set up at Cutover. That meets the overturn condition of this spec's DNS-only decision. "DNS records" and the new "Moving the zone" now put ofl.ink and the Spare Domains behind Cloudflare: the nameservers move at least 48 h early with v1's records, and the switch and rollback are single record changes. Issuing the certificate before the switch is rejected, because a fixed site block fails ACME until DNS moves. A DNS-only fallback for the first issuance is added instead.
- **partial**: B12. Domain ownership lifecycle. Removal is now specified (clear the field; the ask check refuses new certificates). A TXT ownership proof is rejected, because only the Operator sets a domain. Normalization, uniqueness and collisions were already specified.
- **partial**: B13. Certificate operations. Depends on now names Phase 2's certificate volume (Phase 2's Caddy decision), which on-demand TLS relies on. Monitoring and alerting are rejected as YAGNI; the post-switch log grep covers the one issuance that matters.
- **partial**: B14. Host-to-Profile routing. App routes now match before the host grammar on every host. `internal` is added to the reserved Usernames, because Phase 3 drew its list from the routes of its own time (Phase 3's Username rules). Canonical redirects are rejected; the spec already decides "no redirect".
- **partial**: B15. Behaviour across origins. The Stats identity is now asserted by behaviour 6, the Page View ping on the Custom Domain. Rate limits per alias are rejected: Phase 2's limiter does not depend on the host. Reveal's origin policy was already covered by behaviour 8.
- **partial**: B16. A usable rotation procedure. "Ready" now includes opening the Spare Domain inside Instagram with no Meta warning (story 30). The rotation step notes that links posted outside bios are not recovered. A measured rotation drill is rejected as YAGNI.
- **reject**: B17. Resolve D9 first. Domains are Operator-only here whatever D9 says, and the ASSUMPTION already names D9 as what would overturn it.
- **partial**: B18. Test the seam from hostname to Event. Plain HTTP through Caddy into the app is the seam, and the Page View ping (behaviour 6) is added. TLS stays a manual step (see B19).
- **reject**: B19. HTTPS on the local loop with a local CA. Out of Scope already records that it works but adds a 443 listener and certificate trust. The ask wiring check plus the manual issuance cover the boundary.
- **partial**: B20. Security checks below the UI. Domain privacy and write restriction are now behaviours 10 and 11, and the secrets check is fixed (call 2's finding 4). Rate limiting stays with Phase 2's reveal-guard spec. Checks against the backup belong to Phase 0's Acceptance, which curls both hosts.
- **reject**: B21. Rehearse the Cutover and rollback locally. A DNS switch cannot be rehearsed offline. The rollback is the same record change reversed, now with complete record definitions.
- **reject**: B22. Commission against real DNS, TLS and devices. That is already the `# manual:` half of Acceptance.
- **accept**: B23. The harness. The Acceptance ran `docker compose up` without Phase 2's `tests/e2e.env` and Compose project (Phase 2's test loop and Acceptance). It now uses the test env file, checks `localhost` and `unknown.test`, and takes the stack down before `./check.sh`. Plan section 7's screenshot is added. The fake User-Agent is rejected as a defect, because plan section 7 prescribes it.
- **reject**: B24a. "Hiding Destinations prevents flagging is unproven." Plan section 4 says the same, and nothing in this spec rests on it.
- **needs-human**: B24b. Do Spare Domains recover traffic at all? Reviewer: unproven. Every Spare Domain serves the same pages from the same VPS address, so a flag aimed at content or address would carry over. Spec: D6 and section 4 make Spare Domains the mitigation, a binding plan decision that this Phase implements. Evidence that settles it: on the first real Flag, open the warmed Spare Domain in Instagram on a phone. A warning there means rotation fails, and the Operator must choose another mitigation, such as a second address or Custom Domains first.
- **partial**: B24c. Rotation does not reach links already distributed. The rotation step now says so. Recovering those links is impossible from v2.
- **partial**: B24d. "A DB field plus TLS may serve the wrong Profile or drop attribution." It is now falsifiable locally: behaviours 3, 5 and 9 check the Profile, attribution, assignment and collisions per host.
- **partial**: B24e. "Netlify may be an inadequate rollback." What it cannot serve is now stated (B4). It remains adequate for the Profiles it had, which is all the plan asks (goal_ai.txt:162).
- **reject**: B24f. "Passing local tests do not prove Phase 5." The spec already says so under "Not tested locally", and it puts DNS, TLS and devices in `# manual:` steps.

Call 2, draft:

- **accept**: Finding 1. The Operator-only clause covered update only, so a Creator could set `customDomain` when creating the Profile. Both the create and update rules now carry `@request.body.customDomain:isset = false`, and behaviour 10 tests both.
- **accept**: Finding 2. The final Import contradicted "made re-runnable". The import is already a re-runnable upsert (Phase 2's v1 Import decision), so the false overturn clause is gone. The decision now states what a re-run overwrites (see B9). Depends on now lists the upsert.
- **accept**: Finding 3. `dig` answers cannot rebuild NETLIFY or ALIAS records. Story 2 and the record step now copy the zone's record definitions (type, value, TTL) from the DNS host, with `dig +noall +answer` for apex and www, A and AAAA, plus TTLs, as the cross-check. Rollback re-creates those definitions.
- **accept**: Finding 4. The verify step passed on a 503 from Caddy, and the secrets check passed on 000 or 500. It is worse than reported, in two ways. First, Phase 2's app serves index.html as a catch-all (Phase 2's public page decision), and Phase 0 needed an explicit rule to get its 404. So `!= 200` would also fail on a healthy v2 and trigger a needless rollback. Second, behind Cloudflare the `Server` header reads `cloudflare`, never `caddy`. Verify now asks for the TLS Ask endpoint's empty 200 (only v2 answers that), a 200 on the Profile JSON, a 200 or 404 on the secrets path, and a body there that is not JSON.
- **accept**: Finding 5. Comparing hosts passes when every host drops the code. Behaviour 3 now uses two codes on all three hosts. It asserts that the Reveal request carries the page's code and returns the v1 oracle's Destination for it, with no Destination in failure output.
- **accept**: Finding 6. The Shortcut, Spare Tracking Code and Escape target were untested on the new hosts. Behaviours 2, 3, 4 and 5 now cover them, and the first Custom Domain gets a real-device tap of each Mode.
- **accept**: Finding 7. Only seeded reads were tested. The domains are now arranged in-test through PocketBase's REST API (Phase 2's practice). Behaviour 9 tests live change, uniqueness and precedence, 10 tests Creator writes, and 11 tests privacy. Checking found that Phase 2's seed is the v1 Import (Phase 2's test loop), so the old "seed gains the test domains" had nowhere to go.
- **accept**: Finding 8. The device matrix lacked Safari and Chrome (goal_ai.txt:116). Story 9 and the matrix step now include both.
- **accept**: Finding 9. "Off" did not stop `linkmeclone3.netlify.app` serving v1. "Off" now also publishes a `_redirects`-only deploy to ofl.ink and verifies its 301. Republishing an earlier deploy undoes it, and deletion stays the Operator's call.

### Six hats

Six thinking hats on the whole Phase set, 2026-10-02, reconciled in the plan review. Labels follow docs/spec/plan-review.md (W white, R red, K black, Y yellow, G green, U blue). "Owner" is the one Phase that holds the decision.

- **W2** (this Phase assumes Phase 2's 80/443 answer, which is still needs-human) **accept**, owner here. Depends on now states the precondition: TLS on 443 must reach Caddy, directly or by SNI passthrough; "the existing proxy fronts v2" without passthrough blocks this Phase.
- **W4** (parity runs against the VPS after Phase 4 write test Clicks into real Profiles' Stats) **accept**, owner here. New decision "Readiness traffic leaves no Stats": record the switch time, back up, then delete pre-switch `events`. `dailyStats` is a view (Phase 4), so nothing else needs clearing.
- **W5** (reserved Usernames were added piecemeal) **accept**, owner Phase 3, whose list now holds `internal`. Owns, the TLS Ask ASSUMPTION and Depends on no longer add it.
- **W7** (this spec and Phase 4 both claimed the Caddy country lines) **accept**, owner here. Owns names them, and Phase 4's Acceptance points here.
- **W8** (`CF-IPCountry` is spoofable on a DNS-only Custom Domain) **accept**, owner here. Caddy sets `X-Country` from `CF-IPCountry` only for direct peers in Cloudflare's ranges and strips both headers from every other request (flagged, rung 4).
- **R2 / K6 / G2** (the readiness step would replace v2's page script with v1's and strip Phase 4's ping) **accept**, owner Phase 4, which gives v2 its own copy of the page. Here the bootstrap edits that copy, and the readiness step says it moves only v1's data and static files.
- **K2** (Phase 0's test 1 expects a 404 for the secrets path, which v2's catch-all would answer with the page shell) **accept**, owner Phase 2, which now answers `/netlify/*` with 404. No change here: the post-switch check already accepts 200 or 404, with no JSON body.
- **K3** (the Fixture Profile's Adult Link has no Destination) **accept**, owner Phase 2. Depends on now names `tests/fixtures/secrets.json` for behaviour 3.
- **K4** (the public PocketBase route is unowned) **accept**, owner Phase 3, whose allow-list leaves `spareDomains` out. Behaviour 11 still holds: that path answers 404 without a token.
- **K5** (nothing backs up v2's data after Cutover) **accept**, owner here. New decision "Backups" (scheduled daily, keep 7, one restore proven before the switch). Rollback no longer defers this to Phase 2's volumes; this Review's B10 line predates the change.
- **K7** (the case twins Jaka/jaka, JakaJaka/jakajaka and weiWEi/weiwei) **accept**, owner Phase 2, which skips byte-equal twins and looks up lower-cased. No change here: the readiness parity run covers it.
- **G10** (stay DNS-only if the Operator won't take on Cloudflare) **reject**: no change, because it is already Phase 4's overturn clause. If it fires, this Phase's country lines simply never match a peer, and every Event records `XX`.
