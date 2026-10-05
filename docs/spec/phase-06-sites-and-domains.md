# Phase 06 — Sites and domains (design proposal)

**Status.** DESIGN PROPOSAL, 2026-10-06, being built by the editor-ui run (see .scratch/editor-ui/RUN.md). The Operator answers § 5 afterwards; every § 5 item is built under the ASSUMPTION beside it. Vocabulary is CONTEXT.md's: the Operator's "site" is a Profile (CONTEXT.md, Profile, ASSUMPTION), and "a domain for each site" is a Custom Domain.

**The ask** (Operator, 2026-10-06, intent): one Creator can make more sites, and each site can have its own domain, e.g. `jakabasej.com` either sending Visitors on to `ofl.ink/jakabasej` or showing the Profile there directly.

**Recommendation.**
- Sites: **Option A**, several Profiles per account (capped), each with its own Username, a Profile switcher in the Editor, and Stats per Profile.
- Domains: **Option 1**, served directly on the Custom Domain, made Creator self-service behind a DNS proof (TXT plus A/AAAA to the VPS) that the app checks; the TLS Ask says yes only to `live` domains. No redirect mode: a Creator who only wants forwarding sets it up at their registrar, with nothing from ofl.ink.

## 1. What exists today

Accounts and Profiles
- At most one Profile per account: `idx_profiles_owner`, unique on `profiles(owner) WHERE owner != ''` (`pocketbase/pb_migrations/1791140004_sign_up_and_claim.js`); Phase 3 story 46 and "One Profile per Creator", whose ASSUMPTION is "overturned by agency-style accounts, which would drop the index". `tests/e2e/03-auth-and-editor.spec.ts` asserts "a second Profile" is refused (400).
- The claim (`app/editor/screens/auth.js`) posts `{ username, owner, mode }`; the create rule allows nothing else, refuses reserved names and lets an unverified account claim. The update rule refuses `username`, `owner`, `verified`, `v1Key` and needs a verified email (`1791140005_content_rules.js`). The links and `dailyStats` rules key on `profile.owner`, so they already hold for any number of Profiles.
- The Editor assumes one: `onboarded()` reads `profiles/records?perPage=1` and takes `items[0]` (`app/editor/app.js`), and every screen gets that `profile`. Stats sends no Profile filter and lets the list rule choose its rows (`app/editor/stats.js`, header), which is right only while an account owns one Profile. The Bio Link is `location.origin + '/' + username` (`address()`).

Custom Domains and Spare Domains (Phase 5, built)
- Schema (`1791140008_domains.js`): `profiles.customDomain`, hidden, hostname pattern, unique when set; the Creator create and update rules carry `@request.body.customDomain:isset = false` (on 0.40.4 a hidden field is dropped from a non-superuser's body before the rules run, so a Creator's value is silently not stored). `spareDomains`: every rule null. Only the Operator sets either, in the admin UI.
- Host Resolution (`app/src/host-resolver.js`): lower-case, drop port and trailing dot, then primary (`PRIMARY_HOSTS`, no database) → spare → custom → unknown, exact match, no cache. On a custom host `/` is the Profile, `/{code}` the Profile with a Tracking Code, deeper paths no Profile; every other host keeps `/{username}[/{code}]`.
- TLS Ask (`GET /internal/tls-ask?domain=`, `app/server.js`): 200 for primary, spare or custom; 404 unknown; 400 malformed; 503 when PocketBase is down. The Caddyfile has a global `on_demand_tls { ask …/internal/tls-ask }` and one catch-all with `tls { on_demand }`; Traefik passes every SNI but n8n's through to Caddy, so a new hostname needs no proxy change.
- The page learns its Profile from the server's `#profile-bootstrap` block (`{ username, trackingCode, profilePath }`), and Escape targets are rebuilt from `location.origin + profilePath`.
- Stats on a Custom Domain: Events carry Profile, Link, country, In-App Browser and time, and no host, so a Custom Domain's Page Views and Clicks count exactly as on ofl.ink (Phase 5 story 28). Custom Domains are DNS-only, so Caddy strips `CF-IPCountry` (peer outside Cloudflare's ranges): the country is unknown and Geo Rules take v1's US fallback (Phase 5, DNS records, accepted). Reveal answers the page's own origin only (`sameOrigin`), and its limit keys on the Visitor's address from Traefik's PROXY header. The Tracking Code is stored per Profile id, per origin.
- What the Creator sees: nothing. No Editor field, and the value is hidden even from the owner's reads. Opened at `jakabasej.com/edit`, the Bio Link reads `https://jakabasej.com/jakabasej`, which on a custom host is the Profile with an ignored non-numeric code.
- Removal: the Operator clears the field and restarts Caddy, which keeps an in-memory certificate until then.
- Redirect versus served: Phase 5 serves directly; `ofl.ink/{username}` stays reachable and nothing redirects either way (Phase 5 Out of Scope). A "redirect" here would mean the Custom Domain answering 3xx to `ofl.ink/{username}[/{code}]` instead of serving the page.

## 2. A Creator owns several sites

**Option A — several Profiles per account, a switcher in the Editor.**
- Schema (`1791140010_several_profiles.js` or the next free number): `profiles.slot`, an integer, min 1, max N (the cap), not required (ownerless imported Profiles have none). `idx_profiles_owner` is replaced by a unique index on `(owner, slot) WHERE owner != ''`. The up migration sets `slot = 1` on every owned Profile, so nothing existing clashes; the down migration restores the old index and fails loudly if an account owns two.
- Rules: the create rule also accepts `slot`, requires `@request.body.slot > 0`, and requires `@request.auth.verified = true` unless `@request.body.slot = 1` (an unverified account still claims exactly one, Phase 3). The update rule refuses `slot` alongside `username`, `owner`, `verified` and `v1Key`. `@request.body.owner = @request.auth.id` stays, so a Creator still cannot set the badge, change a Username or give a Profile to anyone. Two concurrent claims for one slot meet the unique index.
- Editor: `onboarded()` lists the account's Profiles (`perPage=N&sort=slot`) and works on the current one: the id kept in localStorage (`oflink.profile`), else the lowest slot. A switcher at the head of the Editor and Stats ("@jakabasej ▾") lists them by @Username, plus "Add a Profile" while a slot is free. That opens `/edit/new`, the claim step with the next free slot, followed by the same derived Onboarding for the new Profile. Stats adds `profile='{current id}'` to its filter. Hand-over: the Operator sets owner and a free slot, and the bare Profile no longer has to be deleted first (Phase 5 step 12 changes).
- Tests: 03's "a second Profile" refusal becomes a cap test (slot 2 accepted when verified, refused when unverified, slot N+1 refused, a duplicate slot refused). 05's step-12 hand-over order test changes with it, and 04 and 06 gain the switcher. A one-Profile account sees no change anywhere.
- Risk: low to medium. Every rule already keys on owner; the change is one index, one field and the Editor's "which Profile" question. Squatting grows from 1 to N Usernames per verified mailbox.

**Option B — one Profile per account, more accounts.** No schema, rule, Editor or test change: the Creator signs up again with another address (`name+site2@…` is a new email to PocketBase) and logs out and in to switch. No risk in code, but one password and one inbox per site, no switcher, and it does not meet "one user". It works today as the stopgap.

**Option C — a "sites" layer above Profiles.** A new `sites` collection (owner, name) and `profiles.site`. Every rule that says `owner` or `profile.owner` becomes `site.owner` or `profile.site.owner` (profiles, links, dailyStats, the upload route's view check), the v1 Import and the hand-over set `site`, and every Phase 3–5 rule test is rewritten. It adds a noun CONTEXT.md bans ("site") with no behaviour of its own: nothing the Operator asked for is a property of a group of Profiles. Risk: high, for no gain.

**Recommendation: A.** It is the overturn path Phase 3 already wrote, it moves no ownership rule, and B serves meanwhile.
ASSUMPTION: one global cap, N = 3 (rung 6; rung 4: raising a cap is one migration, lowering it strands Profiles). Overturned by the Operator's pricing answer; a per-account cap then becomes `users.maxProfiles`, set by the Operator, with `@request.body.slot <= @request.auth.maxProfiles` in the create rule.
ASSUMPTION: a slot number and a unique index rather than a counting rule or a PocketBase hook (rung 5: `pocketbase/` holds no hooks; rung 4: the index holds under concurrent claims). Overturned if the pinned PocketBase reliably counts back-relations in a rule; `slot` then goes.
ASSUMPTION (evidence blocked): PocketBase 0.40.4 lets a non-required number field with min 1 stay empty on ownerless Profiles. Overturned if it does not; the minimum then lives in the create rule only.
ASSUMPTION: the current Profile is remembered per device in localStorage, not carried in the URL (rung 5). Overturned if Creators edit two Profiles in two tabs; a `?profile=` query then wins over storage.
ASSUMPTION: Stats shows the current Profile only, with no all-Profiles total (rung 5; a one-Profile account sees exactly today's Stats). Overturned if the Operator wants a total.
ASSUMPTION: "Add a Profile" shows only to a verified account, which is every account past Onboarding, so the claim's bare-400 "reserved" message (`claimReason`) stays true (rung 3). Overturned if unverified accounts get the switcher.
ASSUMPTION: the Editor's copy says "Profile", never "site" (rung 3: CONTEXT.md). Overturned if the Operator wants "site" in the UI.

## 3. A domain per site

**Option 1 — serve directly, Creator self-service.**
- Schema (`customDomains` migration): a `customDomains` collection with `profile` (relation, required, cascade delete), `domain` (text, required, max 253, Phase 5's hostname pattern), `token` (text, autogenerated `[a-z0-9]{32}`), `status` (select `pending` | `live`) and `checked` (date, set by the app). Indexes: unique on `profile` (one domain per Profile, pending or live) and unique on `domain WHERE status = 'live'` (a pending claim never blocks the real owner).
- Rules: list and view are `@request.auth.id != "" && profile.owner = @request.auth.id`. Create checks the same owner through `@request.body.profile.owner`, needs `@request.auth.verified = true`, and refuses `id`, `status`, `token` and `checked`. Update is null, so only the app and the Operator change a record. Delete is the owner.
- Migration: every `profiles.customDomain` is copied into a `live` record (the Operator set those), then the field, its index and the `customDomain` clauses go. The proxy allow-list (`PROXIED` in `app/server.js`) gains `customDomains`.
- Host Resolution: `profileWithDomain` reads `customDomains` with `status = 'live'` and expands the Profile. Everything else in the order is unchanged, so the TLS Ask answers 200 only for a live domain and 404 for a pending one.
- Check route `POST /api/domain-check/:id`, beside `/api/upload` and on its pattern:
  - The caller's token is required (401), and the record is viewed through PocketBase with that token, PocketBase's status passed through, so the rules decide ownership. Reveal's per-address limit applies (429).
  - Then `node:dns` (no dependency) checks five things:
    - (a) the name is not a primary host or Spare Domain, and is not under one;
    - (b) TXT `_oflink.{domain}` holds `oflink-verify={token}`;
    - (c) there is at least one A record, and every A is `ORIGIN_IPV4`;
    - (d) every AAAA is `ORIGIN_IPV6`; none at all is fine;
    - (e) there is no CAA record, or one allows `letsencrypt.org`.
  - All pass → `live`, written as superuser; a clash on the live index answers "taken".
  - The answer is `{ status, problems[], records[] }`. `records` holds the exact records to set, so the Editor never hard-codes the VPS address.
  - New settings: `ORIGIN_IPV4`, `ORIGIN_IPV6` (empty if none), and `DNS_SERVERS` for the test stack only.
- Removal: the Creator deletes the record, and the host is `unknown` from the next request (the landing page at `/`). Caddy drops the certificate at its next restart.
- The Operator's path stays: a superuser can still create a `live` record in the admin UI without the proof, and can delete any record.

**Option 2 — 301 redirect to `ofl.ink/{username}`.** It needs the same DNS, the same certificate (the bio link is https, so Caddy must still complete TLS for the name), the same ask and the same proof. The only difference is that the catch-all answers `302 https://{CANONICAL_HOST}/{username}[/{code}]{?query}` instead of the page; a 301 is cached by browsers for good and could never be taken back.
- Gains: one address in the bar. Stats gains nothing, because Events have no host field, so served and redirected visits count the same.
- Losses: the Custom Domain's isolation from a Flag. The In-App Browser follows the redirect, so a Flagged ofl.ink takes every redirecting domain with it, and rotating to a Spare Domain would need the "active domain" setting Phase 5 rejected. It also adds a round trip inside the In-App Browser, and Tracking Code and `?link=` must be carried across.
- A Creator who wants only this has it today with nothing from ofl.ink: URL forwarding at their registrar, or a Cloudflare Redirect Rule, to `https://ofl.ink/{username}`.

**Option 3 — both, a per-domain mode "Serve here" / "Send to ofl.ink".** Option 1 plus a `mode` field and option 2's branch. It doubles the domain test matrix for a mode nobody has asked for by name.

**DNS records the Creator sets.**
- `A {name} → ORIGIN_IPV4`, DNS only, plus `AAAA {name} → ORIGIN_IPV6` only if the VPS has IPv6. Every other A or AAAA for that name is deleted; registrar parking records are the usual leftover, and Let's Encrypt prefers IPv6. `TXT _oflink.{name} → oflink-verify={token}`, which may stay. `{name}` is `@` for the apex and `www` (or another label) for a subdomain.
- Cloudflare: the record must be DNS only (grey cloud). Proxied, the name resolves to Cloudflare, so check (c) fails.
- No CNAME to `ofl.ink`: ofl.ink is Proxied in the Operator's Cloudflare, so the name would land on Cloudflare's edge, not the VPS, and Cloudflare refuses a proxied cross-account CNAME outright.
ASSUMPTION: A/AAAA to the VPS, not a CNAME to an Operator-held DNS-only target (rung 3: Phase 5 step 14's one record; rung 5). Overturned if the VPS address must change without every Creator editing DNS; a DNS-only target host then becomes the advice for subdomains, and check (c) already follows CNAMEs.
ASSUMPTION: domains proxied through the Creator's own Cloudflare are refused for now (rung 4). Overturned by § 5 question 6; they would bring real countries, because Cloudflare's ranges are trusted, but they need an HTTP check through the domain in place of (c).

**Certificates, limits and on-demand abuse.**
- Let's Encrypt's limits (as published): 50 new certificates per registered domain per 7 days, 300 new orders per account per 3 hours, and 5 failed authorizations per hostname per account per hour. Each Creator domain is its own registered domain, so Creators never share the first. ofl.ink, every Spare Domain and every Custom Domain share the Operator's one ACME account for the rest.
- The danger is an ask that says yes to names that do not point here: every SNI anyone sends straight to the VPS would start an order that fails validation. Phase 5's ask already refuses unknown names. This design keeps that by answering 200 only for `live`, and a record reaches `live` only after (b)–(e) prove that it points here and that its owner holds the DNS.
- Caps: one domain per Profile, N Profiles per account, a verified email to add one, and exact hostnames only (no wildcard).
- After `live` nothing re-checks the DNS, so a domain pointed away later fails only its own renewals.
ASSUMPTION (evidence blocked): the figures above come from memory of Let's Encrypt's page, with no network reads. Overturned by the current page, which the Operator reads before the build.
ASSUMPTION: the ask stays database-only, with no DNS lookup per ask (rung 5; rung 4: a resolver hiccup during a Caddy restart would otherwise take live domains dark). Overturned if Caddy's logs show renewal failures from moved domains; a daily re-check then sets them back to `pending`.

**Apex and www.** Exact hostnames, as in Phase 5: the Creator adds the one in their bio, and the screen suggests the apex. The other variant is not served; a Creator who wants it forwards it at their registrar. A second hostname per Profile that 308s to the first would be a later ticket.
ASSUMPTION: rung 5 (Phase 5 Out of Scope, pairing www and apex). Overturned if Visitors often type the other variant.

**On a Custom Domain, unchanged from Phase 5.**
- The bootstrap: the custom branch already gives `{ username, trackingCode, profilePath: '/' }`, so the page and `script.js` do not change.
- Stats: Visits count under the Profile; country is unknown and Geo Rules use the US fallback.
- Reveal: same-origin, limited per Visitor address; the Tracking Code is stored per origin and Profile id.
- The Editor's Bio Link shows `https://{domain}/` once the domain is `live`, and ofl.ink's address otherwise.

**Flagging and abuse.**
- Isolation is the upside: a Flag on `jakabasej.com` hits one Creator.
- DNS-only Custom Domains publish the VPS address that Cloudflare hides for ofl.ink and the Spare Domains, and self-service hands that address to every verified sign-up. A Flag aimed at the address, or at the page code every host shares, may carry across (Phase 5 Further Notes, D11, still open).
- A stranger can sign up, prove their own domain and serve their own Links from the VPS. An abuse report to Hostinger names the VPS address, and a suspension takes ofl.ink, every domain and n8n down together. The Operator's lever is deleting the record or the account (Phase 3 story 56).
- "Powered by ofl.ink" stays on Custom Domains (Phase 5 Out of Scope), linking them to ofl.ink for anyone who looks.

**Recommendation: Option 1, with no redirect mode.** Option 2 needs the same DNS, certificate and proof, so it saves nothing and gives Stats nothing. It also gives up the Flag isolation that is the reason for a Custom Domain here, and registrar forwarding already gives a Creator a redirect for free.

Creator flow:
1. In the Editor, on the Profile, open "Domain", type `jakabasej.com` and press "Add domain".
2. The screen lists the records to add at the DNS provider: A and TXT, plus AAAA if the VPS has IPv6.
3. Add them and press "Check now"; the screen says what it sees and what is still missing.
4. Once all pass it says "Live"; open `https://jakabasej.com` once, and the first visit sets up HTTPS in a few seconds.
5. Put `https://jakabasej.com` in the bio; `jakabasej.com/{code}` carries a Tracking Code, and "Remove domain" undoes it all.

Screen copy, "Domain" at `/edit/domain`. The values shown are examples; the real ones come from the check route:
```
h1      Use your own domain
p       Show @jakabasej at an address you own, like jakabasej.com. You need to be able to change your domain's DNS records (where you bought it, or at Cloudflare).
label   Domain
hint    Without https:// or a slash. Use exactly the address you will put in your bio.
button  Add domain
--- pending ---
h2      Point jakabasej.com here
p       Add these records where your domain's DNS is managed, then press Check now. Changes can take a few minutes, sometimes a few hours.
table   Type | Name    | Value
        A    | @       | 203.0.113.10
        TXT  | _oflink | oflink-verify=k3j9…
p       Delete any other A or AAAA record for this name. On Cloudflare, set the cloud to DNS only (grey).
button  Check now
status  Not yet: No TXT record _oflink.jakabasej.com yet. | jakabasej.com points to 192.0.2.7, not 203.0.113.10. | Delete the AAAA record 2001:db8::1. | Another Profile already uses jakabasej.com.
--- live ---
h2      jakabasej.com is live
p       It shows this Profile now. Open it once to finish setting up HTTPS, then put it in your bio. ofl.ink/jakabasej keeps working too.
buttons Open · Copy · Remove domain
confirm Remove jakabasej.com? Visitors on it will stop seeing this Profile.
foot    Only want jakabasej.com to forward to ofl.ink/jakabasej? Set up URL forwarding where you bought the domain. You don't need to add it here.
```

## 4. Tickets, in build order

| # | Ticket | Satisfies | Test seam |
|---|---|---|---|
| 1 | A Creator can own up to N Profiles, each with its own Username | § 2 Option A, Schema and Rules; CONTEXT.md's Profile entry | `tests/e2e/07-sites.spec.ts`, rule checks over HTTP at the proxy as in 03; 03's second-Profile case and 05's hand-over case updated |
| 2 | The Editor switches between a Creator's Profiles and adds another | § 2 Option A, Editor | Playwright through `/edit` at 375px: switcher, `/edit/new`, Onboarding per Profile |
| 3 | Stats shows the current Profile only | § 2, Stats ASSUMPTION | `04-stats` with a two-Profile account; one-Profile cases unchanged |
| 4 | Custom Domains move to their own collection, and only live ones get a certificate or a Profile | § 3 Option 1, Schema, migration, Host Resolution | `05-domains` (TLS Ask 200/404, `creator.test` routing), arranged with records instead of the field |
| 5 | A test DNS server answers the app in the local stack | § 3 check route (prefactoring) | `tests/fake-dns.mjs` (node:dgram, on the app image, no pull), exercised by ticket 6 |
| 6 | A Creator's domain goes live only once its TXT and A/AAAA records point here | § 3 check route, Certificates | HTTP `POST /api/domain-check/:id` against the fake DNS: each problem, "taken", then live → TLS Ask 200 → `jakabasej.test/` shows the Profile |
| 7 | The Editor's Domain screen adds, checks and removes a Custom Domain | § 3 Creator flow and copy | Playwright at `/edit/domain`, 375px; the Bio Link shows the live domain |
| 8 | RUN.md: self-service Custom Domains, `ORIGIN_IPV4`/`ORIGIN_IPV6`, removal and abuse | § 3, replacing the Operator's part of Phase 5 step 14 | Acceptance grep plus the `# manual:` lines |

Acceptance sketch:
```sh
set -e
s="$(git -C linkme_clone3 status --porcelain)"
test -z "$s"
test -f tests/e2e/07-sites.spec.ts && test -f tests/e2e/07-domains.spec.ts
grep -q '^## Custom Domains' RUN.md
h="$(grep -rIl "$(printf 'onlyfans.%s/' com)" app tests pocketbase RUN.md docs/spec/phase-06-sites-and-domains.md || true)"
test -z "$h"
# manual: 1. VPS .env: ORIGIN_IPV4=<VPS IPv4>, ORIGIN_IPV6=<VPS IPv6 or empty>; deploy by Phase 2's procedure.
# manual: 2. a real domain: add it in the Editor, set the records, Check now -> Live; then
#   test "$(dig +short A "$DOMAIN")" = "$VPS_IPV4" && test "$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/")" = 200
#   test "$(curl -s -o /dev/null -w '%{http_code}' "https://ofl.ink/internal/tls-ask?domain=$PENDING")" = 404   # pending: no certificate
# manual: 3. open https://$DOMAIN/ inside Instagram on iOS and Android; an Escape lands on $DOMAIN (Phase 5 step 14).
./check.sh
```

## 5. Parked — needs the Operator

1. Profiles per account: is 3 right? Should there be per-account limits or paid tiers (`users.maxProfiles`)?
2. Domains: is one per Profile enough? Is there a per-account total? Should both www and the apex be served?
3. Do Spare Domains stay Operator-only? Proposed: yes, because they serve every Profile.
4. Is a redirect-only mode wanted at all, given that registrar forwarding does it for free and it ties every domain to ofl.ink's Flags?
5. Should a domain go live after the DNS proof alone, or also need the Operator's approval (an `approved` flag the ask would also require)?
6. Should Creators be able to proxy their domain through their own Cloudflare (real country, VPS address hidden)? That needs an HTTP-based check.
7. Does the VPS have IPv6 (`ORIGIN_IPV6`)?
8. Is giving the VPS address to every verified sign-up acceptable, or should Custom Domains get their own address (an extra Hostinger IP, which is a payment)?
9. What do Hostinger's acceptable-use terms say about third-party domains served from the VPS?

## 6. Other assumptions

- ASSUMPTION: `customDomains` is its own collection rather than more fields on profiles (rung 4: with no Creator update, a live record's domain can never change; a field on profiles would let a Creator edit a live domain into an unproven one, and a rule cannot reset a status). Overturned if PocketBase rules gain a way to reset a field on change.
- ASSUMPTION: a TXT proof as well as the A check (rung 4: an A record alone would let anyone claim a domain a departed Creator left pointing at the VPS, or n8n's own hostname). Overturned if the Operator approves every domain by hand (§ 5 question 5).
- ASSUMPTION: the check is an app route, not a PocketBase hook (rung 3: the upload route's pattern, viewing with the caller's token and writing as superuser; rung 5: no hooks exist). Overturned if hooks are adopted for other reasons.
- ASSUMPTION: the test DNS seam is a Node UDP responder on the app image, pointed at by `DNS_SERVERS` (floor: no image pulls, no packages; rung 3: `tests/` scripts on existing images). Overturned if DNS wire-format code in tests is judged too much; the check module then takes an injected resolver, tested at a lower seam.
- ASSUMPTION: the specs are named `07-sites.spec.ts` and `07-domains.spec.ts` (one per track, built in parallel), after the editor-ui run's `06-editor-ui.spec.ts`. Overturned by nothing.
- ASSUMPTION: a Creator's removal needs no Caddy restart (rung 5: the host is `unknown` at once and shows the landing page at `/`; the certificate goes at the next restart, as Phase 5 observed). Overturned if a removed domain must stop answering HTTPS at once; the Operator then restarts Caddy on request.
- ASSUMPTION: `/edit/new` and `/edit/domain` need no reserved Username, and `/api/domain-check` sits under the reserved `api` (Phase 3: Username rules, Reserved names). Overturned by nothing foreseeable.
