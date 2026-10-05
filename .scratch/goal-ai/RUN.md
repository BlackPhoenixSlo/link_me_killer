# RUN.md — goal-ai, execute run 2 (run id 20261005T084628Z)

## Status

**PARTIAL.** Two stop conditions fired together: the ticket budget (14 tickets landed, `--tickets 14`) and an empty frontier. The frontier is empty because every remaining ticket is parked for the Operator, not from a cycle, a dead claim or a user story without a ticket (checked: every map row is `done` or `parked`). Every ticket the Operator named in the build order is done (28, 29, 30, 31, 45, 33, 34, 35, 36, 39, 40, 41, 42, 37). What remains is the Operator's VPS, DNS and phone work (11, 23, 32, 38, 43) and the needs-human question of 44. No agent code work is left on the local stack.

- Last reviewer verdict: **APPROVE** ("Events carry each Visitor's real country from the production country source", round 2 of 3).
- Full-suite command and its real last lines, run cold by the coordinator on the final tree with no other stack up:
  ```
  ./check.sh --reporter=line
    1 skipped
    358 passed (3.8m)
  exit=0
  ```
  The one skip is the HEIC `test.fixme` in tests/e2e/02-image-upload.spec.ts, parked since the first execute run.
- Phase Acceptance blocks (every line but `# manual:` ones, under `set -e`, run by the coordinator): Phase 3 exit 0 (327 passed, at ticket 31); Phase 4 exit 0 (341 passed at ticket 36; exit 0, 358 passed after ticket 37); Phase 5 local block exit 0 (358 passed at ticket 41; exit 0, 358 passed after tickets 42 and 37).
- Nothing was pushed, deployed, pulled or fetched. v1 (linkme_clone3/, Netlify, n8n) was not touched: `git -C linkme_clone3 status --porcelain` is empty, and no file names a Destination (the Destination-host scrub from the Operator's instructions, run over app, tests, pocketbase, compose files, Caddyfile, RUN.md, .env.example before every commit).
- Previous run (8faa1c2): PARTIAL at its 24-ticket budget with 311 passed. This run adds 14 tickets and 49 tests (311 → 360 incl. the skip).

### Running it

```sh
./check.sh --reporter=line                    # the whole suite, ~3.7 min cold; never while another run or an oflinkv2 stack is up
tests/caddy-ask.sh                            # Caddy's on-demand ask + every offline caddy adapt check (tickets 41, 45, 42), own side stack
tests/proxy-protocol.sh                       # PROXY protocol from an allowed proxy only (ticket 45), own side stack
tests/cloudflare-lines.sh                     # the Cloudflare lines at run time on the local Caddy image (ticket 42), plain docker run
```
Each side script refuses to start while any `oflinkv2` container is up and tears its own project down on every exit path (tests/side-stack.sh).

## Ask

Invocation, verbatim: `/spec-auto goal_ai.txt --execute --tickets 14`. Plan: /Users/jakabasej/oflinkv2/goal_ai.txt.

The Operator's resume instructions (2026-10-05): resume at step 5; do not re-spec; build order 28, 29, 30, 31, then Phase 4 33–37, then Phase 5 39–42; everything local (no VPS, DNS, image pulls or packages); 11, 23, 32, 38, 43 stay parked for the Operator, 44 needs-human; a Phase 5 ticket needing a real domain or certificate is proven with Caddy's internal CA or a hosts-file name and flagged; one extra local task before Phase 4 (Caddy PROXY protocol behind an env flag, the Reveal/`/r` client key) as a prefactoring ticket; observe every landed ticket cold; run each finished Phase's Acceptance block minus `# manual:` lines.

### Design run (run 2, 2026-10-02)

Unchanged: CONTEXT.md, docs/adr/, docs/spec/phase-00…05, docs/spec/plan-review.md, 44 tickets. This run added ticket 45 as a prefactoring ticket (map.md says so).

## Built

One line per ticket landed this run, by title, with its commit subject. Every ticket was reviewed by a fresh reviewer and observed cold by the coordinator.

### Phase 3: Auth and Editor. Local Acceptance exit 0 at ticket 31; not Done (ticket 32 is the Operator's VPS step).

| Ticket | Commit | Rounds | Suite |
|---|---|---|---|
| A Creator manages their Links in the Editor and a refused save keeps what they typed | 972d640 | 2 | 317 |
| Log-in lands a Creator where they left off and a handed-over Profile opens in the Editor | 0751a8b | 2 | 322 |
| Only a Profile's owner and the Operator can read or change it through PocketBase's API | cde7c8a | 2 | 325 |
| Verification and reset emails reach the local mail catcher and their links work | daede16 | 2 | 327, Phase 3 Acceptance exit 0 |

### Prefactoring (phase-02 + phase-05), at the Operator's instruction

| Ticket | Commit | Rounds | Suite |
|---|---|---|---|
| Caddy accepts PROXY protocol from Traefik behind an env flag and the Reveal/r client key stays per Visitor | 25ac85a | 1 + should-fix pass | 327; tests/proxy-protocol.sh PASS |

### Phase 4: Stats. Local Acceptance exit 0 at ticket 36 and again after ticket 37; not Done (ticket 38 is the Operator's VPS step; 37's last box is the Operator's post-switch probe).

| Ticket | Commit | Rounds | Suite |
|---|---|---|---|
| A Page View and a Click through /r reach the Creator's Stats page | 8c37049 | 2 | 330 |
| Reveals and Link Shortcuts count as Clicks and Stats read per Link per day per country | 96bc280 | 2 | 334 |
| A Tracking Code stays with the Profile it arrived on | bfde306 | 2 | 336 |
| Only the owner reads a Profile's Stats and recording never blocks a Click or a deletion | 5a2dcb6 | 2 | 341, Phase 4 Acceptance exit 0 |
| Events carry each Visitor's real country from the production country source (agent part; box 5 is `# manual:`) | 0d5a856 | 2 | 358, Phase 4 Acceptance exit 0 |

### Phase 5: Cutover and domains. Local Acceptance exit 0 at ticket 41 and again after 42; not Done (43 and 44 parked).

| Ticket | Commit | Rounds | Suite |
|---|---|---|---|
| Custom Domains and Spare Domains listed in PocketBase serve Profiles by host and pass the TLS Ask | 70c350d | 2 | 349 |
| On a Custom Domain or Spare Domain every Mode and Escape and Reveal works and counts as on ofl.ink | 8fa3e98 | 2 | 357 |
| Caddy asks the app before every certificate and the Cutover runbook is written | abf70aa | 2 | 358, Phase 5 local Acceptance exit 0; tests/caddy-ask.sh PASS |
| Visitor location trusts only the production country source and ofl.ink's DNS is ready for a one-record switch (agent part; boxes 1 and 5 are `# manual:`) | 95b8a26 | 3 | 358; tests/cloudflare-lines.sh PASS; Phase 5 local Acceptance exit 0 after 37 |

What production now has that it did not at 8faa1c2: the Editor's Links page, log-in landing and hand-over, owner-only PocketBase rules, Mailpit-backed verify/reset links; the Event Recorder (300 ms bound, swallowed failures), `/r` and Reveal and the Page View ping recording Clicks and Page Views, the `dailyStats` view and the Stats page (Today/7D/30D, Link and Country filters, "Deleted link", "Unknown"), the ping's own limiter; Host Resolution (primary → Spare → Custom → unknown, no cache), `GET /internal/tls-ask`, the `#profile-bootstrap` block the page reads instead of its address, the Domains schema (migration 1791140008); Caddy's PROXY protocol flag (`PROXY_PROTOCOL_FROM`), on-demand TLS asking the app, and the Cloudflare lines (`CLOUDFLARE_RANGES`); the repo-root RUN.md `## Cutover` runbook (steps 1–15) and a pending Phase 4 real-device row.

### Phases 0, 1, 2

Unchanged from the previous RUN.md: Phase 0 Done; Phase 1 local lines pass, not Done (11); Phase 2 local block passes, not Done (23).

## Parked

No stash was made: no ticket failed round 3. Unchanged from the previous run except that every ticket these block on the agent side is now done, so each is only the Operator's step away.

| NN | Ticket | Why | Stash | Blocks |
|---|---|---|---|---|
| 11 | The real-device matrix passes for every Mode on v2's first public https deploy | VPS step: v2's public https host and real phones | none | nothing; Phase 1's Done gate |
| 23 | v2 serves every v1 Profile identically on its public https host on the VPS | VPS step: the Operator deploys behind Traefik | none | 11, 32, 43, Phase 2's Done |
| 32 | Sign-up runs on the VPS with the Operator's mail and nightly backups | VPS step; SMTP credential, real inbox, real phones | none | 38, 43 |
| 38 | A phone inside Instagram is recorded as Instagram on v2's VPS host | VPS step; a real phone | none | 43 |
| 43 | The Operator switches ofl.ink to v2 by one DNS change while v1 stays live | VPS step; DNS, Cloudflare, purchases, real phones. The runbook is written (RUN.md `## Cutover`) | none | 44 |
| 44 | Bio links move to a warmed Spare Domain the day ofl.ink is Flagged | needs-human: whether a Spare Domain survives a Meta Flag | none | nothing |
| 21, HEIC sub-item | the HEIC case of "A photo uploaded in any D4 format…" | network: sharp's prebuilt libvips has no HEVC decoder | none | the iPhone HEIC step of 32 |

## Assumptions to veto

Sharpest first; each names what falls if it is wrong. Every one is written as an `ASSUMPTION:` line where the decision lives.

1. **A Creator's write naming a Custom Domain answers 200 and stores nothing, not a refusing status** ("Custom Domains and Spare Domains…"; pocketbase/pb_migrations/1791140008_domains.js). Observed on PocketBase 0.40.4: a hidden field is dropped from a non-superuser body before the rules run, so the spec's `customDomain:isset = false` clause never fires while `hidden` stays. The effect holds (no Creator can set one; the owner's read has no such key) and the test asserts 200 + nothing stored. Falls: if a literal refusal is wanted, a later migration drops `hidden`, the clause then refuses, and each owner can read their own domain.
2. **A header-less cross-origin `no-cors` GET to Reveal over plain HTTP is answered 200 and records a Click** ("On a Custom Domain or Spare Domain every Mode…"; ticket 22's "neither Origin nor Sec-Fetch-Site: pass" rule, pinned by tests/e2e/02-reveal-guard.spec.ts). The page cannot read the answer (opaque), so the ticket's box holds. Over HTTPS Chromium sends `Sec-Fetch-Site: cross-site` and gets 403. Falls: browsers without Fetch Metadata can inflate a Profile's Clicks from another site; the guard then needs a Referer check (one shared-guard change).
3. **The Cloudflare lines are proven over plain HTTP plus adapted-JSON equality, not by a TLS request** ("Visitor location trusts only the production country source…"; tests/cloudflare-lines.sh and tests/caddy-ask.sh). Routes and trusted proxies of the `https://` catch-all are asserted byte-identical to the exercised `:80`-with-lines-on run. Falls: if a Caddy release handles request headers differently under TLS, or if the box is read as requiring TLS, the check runs the catch-all with Caddy's internal CA.
4. **`tls { on_demand }` and the global ask are always present; the local `:80` listener relies on `caddy adapt` dropping the TLS policy for a plain-HTTP address** ("Caddy asks the app before every certificate…"; Caddyfile). Observed on caddy:2-alpine v2.11.4; tests/caddy-ask.sh asserts the `:80` adaptation has no TLS policy and no warning. Falls: a Caddy release that attaches TLS to a plain-HTTP address would make the local loop ask for certificates; the two lines then move into an env-selected snippet.
5. **Caddy sees Traefik's connections from Traefik's Docker subnet** (`PROXY_PROTOCOL_FROM` in .env.example; "Caddy accepts PROXY protocol from Traefik…"). Not observed: the live VPS is out of bounds. Falls: with a wrong range Caddy reads and drops the header, every Visitor shares one rate-limit window (the previous run's assumption 1), and the Cloudflare lines' `remote_ip` sees the wrong peer. The check at ticket 23: two separate clients each reach their own 429.
6. **Every Custom Domain page load or TLS Ask costs one PocketBase auth-refresh, and an unknown host two** (app/src/gateway.js; "Custom Domains and Spare Domains…"). The Spare lookup comes back empty on the success path, which triggers the gateway's refresh-before-404. Falls: a scan of unknown hosts costs PocketBase two calls each with no limit; the fix is a bound or a cache the spec currently rules out.
7. **Stats test 7's "no response body holds a `destination` key" is read as none outside the Other Creator's own expanded Links** ("Only the owner reads a Profile's Stats…"; tests/e2e/04-stats.spec.ts). PocketBase expands a Creator's own Link with its Destination, which Phase 3's links rule already lets them read. Falls: if Stats must never expand a Destination even to its owner, that is a Schema decision (hide `links.destination` or make `dailyStats.link` not a relation).
8. **`PRIMARY_HOSTS` and `SITE_ADDRESS=https://` are required at the Cutover's step 1** (compose.yaml requires `PRIMARY_HOSTS`; RUN.md step 1 adds `SITE_ADDRESS=https://`, a line the spec's step 1 did not list but its Contracts decide). Falls: a VPS `.env` without `PRIMARY_HOSTS` fails to start; one that keeps Phase 2's fixed host gives Spare and Custom Domains no certificate.
9. **Phase 4's test 4 fully observes "the Event Recorder never calls Phase 2's location lookup"** ("Events carry each Visitor's real country…"). The lookup's telltales (US for no header, T1 passed through, `x-country` winning) are all asserted; a source-reading test was deleted at review as duplicate. Falls: a lookup call with no effect on Events would go unnoticed; harmless to Stats.
10. **Test 11 arranges "every Event write fails" through a temporary required field via the superuser API, and the Phase 2 schema check no longer requires `events.updated` to predate the run** ("Only the owner reads a Profile's Stats…"; tests/e2e/02-v1-import.spec.ts). Falls: if the events collection must never change through the API even in a test, test 11 needs another failure mode.
11. **The Resend test takes the fast path and assumes PocketBase's ~2 min resend throttle** ("Verification and reset emails…"), and **the Fixture-owner superuser-read assertion stays as an Operator-side guard** (ticket 29, spec/ticket conflict noted in its Landed note). Carried from this run's first half.
12. **The ping limiter keys on client address plus lower-cased Username** (app/src/click-guard.js). Other spellings of one name share a window. Falls: nothing visible; a Username is already case-insensitive in Host Resolution.
13. **Cloudflare overwrites a Visitor-sent `CF-IPCountry`/`CF-Region-Code` on proxied requests** (the spec's, evidence blocked; carried into the runbook's step 7 probe). Falls: a forged value that survives Cloudflare makes the country numbers untrustworthy and the source goes back to the Operator.

The previous run's eleven assumptions still stand except its 1 and 2 (the PROXY protocol listener and the client key), which ticket 45 resolved locally and item 5 above now carries as the one unobserved VPS fact.

## Needs the human

Every item is the Operator's; no agent runs any of them (floor 2). Commands are quoted from the tickets and RUN.md `## Cutover`.

1. **The VPS `.env` before the deploy** (ticket 23; RUN.md step 1). Set, besides the Phase 2 values: `PRIMARY_HOSTS=ofl.ink,www.ofl.ink,<v2 host>` (comma-separated; `.env.example`), `SITE_ADDRESS=https://`, `PROXY_PROTOCOL_FROM=<Traefik's Docker subnet>` from
   ```sh
   for n in $(docker inspect n8n-traefik-1 --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'); do docker network inspect "$n" --format '{{range .IPAM.Config}}{{.Subnet}} {{end}}'; done
   ```
   and `CLOUDFLARE_RANGES` from
   ```sh
   { curl -s https://www.cloudflare.com/ips-v4; echo; curl -s https://www.cloudflare.com/ips-v6; } | xargs
   ```
   Check after the deploy: two separate clients each reach their own 429 on Reveal (ticket 23). If they share one, assumption 5 is wrong: find the source Caddy sees (`docker compose logs caddy`) and put that range in `PROXY_PROTOCOL_FROM`.
2. **The VPS deploy** ("v2 serves every v1 Profile identically on its public https host on the VPS"), Phase 2's `# manual:` lines (docs/spec/phase-02-vps-foundation.md:602–610):
   ```sh
   rsync -a --exclude /node_modules --exclude .scratch ./ root@srv1395798.hstgr.cloud:/opt/oflinkv2/
   cd /opt/oflinkv2 && docker compose up -d --build --wait                          # on the VPS
   docker compose run --rm -v "$PWD/linkme_clone3:/v1:ro" app import-v1 --site /v1   # on the VPS; exit 0
   curl -sI http://<v2 host>/ | grep -i '^location: https://'                         # from the Mac
   PLAYWRIGHT_BASE_URL=https://<v2 host> npx playwright test tests/e2e/02-profile-parity.spec.ts   # from the Mac
   ssh -L 8090:127.0.0.1:8090 root@srv1395798.hstgr.cloud   # edit a display name at http://localhost:8090/_/; reload https://<v2 host>/<username>
   ```
   Traefik: a TCP router ``HostSNI(`*`)`` with TLS passthrough and PROXY protocol below n8n's rule, plus an HTTP router on 80 for every non-n8n host. Then delete every record a `stale in v2:` line names.
3. **The real-device matrix** ("The real-device matrix passes for every Mode…"): fill RUN.md `## Phase 1 real-device matrix` on the deployed host.
4. **The VPS sign-up** ("Sign-up runs on the VPS with the Operator's mail and nightly backups"): admin UI Settings → Application URL and Mail (SMTP sender, never committed); Backups cron `0 3 * * *`, keep 7; real-inbox verify and reset; Onboarding on a real iPhone and Android.
5. **Instagram on the VPS** ("A phone inside Instagram is recorded as Instagram on v2's VPS host"): open a Profile inside Instagram on a phone, read the newest Event in the admin UI, fill RUN.md's `## Phase 4 real-device row` (inAppBrowser = instagram; country XX until Cutover).
6. **The Cutover** ("The Operator switches ofl.ink to v2 by one DNS change while v1 stays live"): RUN.md `## Cutover`, steps 1–15 in order, in one sitting. Its two `# manual:` boxes from "Visitor location trusts only the production country source…" come first: step 2 records the zone as the DNS host lists it plus
   ```sh
   dig +short NS ofl.ink; dig +noall +answer ofl.ink A ofl.ink AAAA www.ofl.ink CNAME www.ofl.ink A www.ofl.ink AAAA; dig +noall +answer DS ofl.ink; whois ofl.ink | grep -i registrar
   ```
   and step 3, at least 48 h before step 8, moves the zone from Namecheap to Cloudflare (every record re-created DNS-only, TTL 300 on apex and `www`; SSL Full (strict); Always Use HTTPS off; IP Geolocation on; Managed Transform "Add visitor location headers" on; no DNSSEC step, since step 2 printed no DS), then
   ```sh
   dig +short NS ofl.ink                                                                  # Cloudflare's pair
   curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'     # v1 still serves
   ```
   Step 12's hand-over is never before step 8, in the order (a) delete the bare Profile, (b) set the owner; PocketBase refuses (b) otherwise. Step 13's rollback check after restoring the DNS-only records:
   ```sh
   curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'
   ```
   Nothing in Netlify ever changes.
7. **After the switch, the country probe** ("Events carry each Visitor's real country…", box 5):
   ```sh
   curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'CF-IPCountry: ZZ' https://ofl.ink/v/<a Username>
   ```
   Expect 204 and the newest Event showing this machine's real country, not `ZZ` or `XX`. `XX` → Cloudflare dashboard → ofl.ink → Network → IP Geolocation on. `ZZ` → assumption 13 is wrong; the source goes back to you.
8. **HEIC** (network): `pnpm --dir app add heic-convert && docker compose --env-file tests/e2e.env build`, then a ticket decodes HEIC ahead of the pipeline and drops the `test.fixme`.
9. **Does a Spare Domain survive a Meta Flag?** ("Bio links move to a warmed Spare Domain…"): settled only after the first real Flag, by opening the warmed Spare Domain through the real bio link in Instagram on a phone.
10. **Human-only acts with no question:** buying Spare Domains, the Cloudflare account and nameserver move, the SMTP credential, real phones, `git -C linkme_clone3 pull --ff-only` before the final import.

## Agents spawned

All `model: opus`, fresh per ticket; the coordinator (Fable) dispatched, reviewed verdicts, ran every cold suite and Acceptance block, and committed. Reviewer findings went to the implementer verbatim; coordinator-applied fixes were comment-only nits.

| Ticket | Implementer | Reviewer | Outcome |
|---|---|---|---|
| 28 | implementer | reviewer | APPROVE round 2 |
| 29 | implementer | reviewer | APPROVE round 2 (finding 4 kept as Operator-side guard) |
| 30 | implementer | reviewer | APPROVE round 2 (throwaway migration denied by the permission classifier → ASSUMPTION (evidence blocked)) |
| 31 | implementer | reviewer | APPROVE round 2 (coordinator removed an untested clause it had written into box 2) |
| 45 | implementer (resumed for should-fix) | reviewer | APPROVE with should-fix, applied |
| 33 | implementer | reviewer | APPROVE round 2 |
| 34 | implementer | reviewer | APPROVE round 2 |
| 35 | implementer | reviewer | APPROVE round 2 (coordinator's cold run collided with the implementer's own; re-run clean) |
| 36 | implementer a53d4b8 | reviewer adda93a | APPROVE round 2 (4 should-fix + 2 nits) |
| 39 | implementer af4c16c | reviewer a9a8f64 | APPROVE round 2 (blocker: `$'`/`$$` in a path corrupted the bootstrap JSON; fixed with a replacer function + test) |
| 40 | implementer a063f14 | reviewer a7de853 | APPROVE round 2 (6 should-fix, tests-only; no app change) |
| 41 | implementer a9e8bd1 | reviewer a28fa81 | APPROVE round 2 (shared tests/side-stack.sh, non-vacuous cert count, runbook wording) |
| 42 | implementer aa2cd85 | reviewer a13f7e2 | APPROVE round 3 (one adapt owner; multi-range IPv4+IPv6; one untrue header sentence fixed by the coordinator) |
| 37 | implementer a7d43f6 | reviewer aecda97 | APPROVE round 2 (source-reading test deleted as duplicate of test 4) |

No devils-advocate or six-hats agent was spawned this run (the design run did that; nothing was re-specced). No codex adversary call: step 3 was not re-run.

## Cut (YAGNI)

Carried from the design run and the first execute run (see the previous RUN.md at 8faa1c2 and docs/spec/plan-review.md `## Cut (YAGNI)`): any edit to v1; purging secrets.json; rotating v1 Link Ids; n8n changes; ffmpeg/video, proxies, Geo Rule UI, Umami, captcha, sign-up limits; realtime; least-privilege PocketBase account, multiple app containers, shared rate-limit store; heic-convert until the network command; no gateway time bound; no Editor controls for badge/Username/delete; no Template files served; no import dry-run; fixed-minute Reveal window; no TypeScript typecheck.

Added by this run:
- **No migration for tickets 36 and 40**: 33's rules and Phase 2's cascades already held (regression tests instead); 39's `profilePath` bootstrap already made every host behave (regression tests, no app change).
- **No refusing status for a Creator's Custom Domain write** while `hidden` stays (assumption 1); **no hook** (the spec excludes hooks).
- **No Referer check in the Reveal guard** for header-less cross-origin calls (assumption 2); not this run's to close.
- **No env-selected snippet for `tls { on_demand }`** (a second variable that must agree with `SITE_ADDRESS`); **no env-selected upstream** for the echo in tests/cloudflare-lines.sh (`--add-host app:127.0.0.1` instead); **no internal-CA TLS run** (adapted-JSON equality instead).
- **No source-reading test** for "never calls the lookup" (test 4 observes it); **no unit-test seam** (the spec adds none).
- **No cache for host lookups** (the spec says none) and **no save-time validation** of a Custom Domain equal to a primary host or Spare Domain (Host Resolution's order settles it).
- **No 503 test for the TLS Ask** (would need PocketBase stopped mid-run); coded, inspected.
- **No stalled-write test** for the recorder's 300 ms bound (the spec rules it out); checked by hand in node, not committed.
- **No geo-IP alternative** (plan §11 chose Cloudflare).
- **The Phase 1 In-App Browser drivers and `eventCount`, `callsTo429`, `setOwner`'s status, `logInToHandedOver` moved into tests/e2e/helpers.ts** as the one shared module; Phase 5's own plumbing stays in tests/e2e/domains-helpers.ts.
