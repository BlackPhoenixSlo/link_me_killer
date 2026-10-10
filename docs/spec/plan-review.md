# Plan review — goal-ai run 2

Specs 00–05 (`docs/spec/phase-0*.md`), read at HEAD 16d5a11, with the six-hats report on the set reconciled into them. Plan: `goal_ai.txt`, whose sections 8 and 9 amend 0–7. `docs/spec-superseded-run1/` is ignored. This pass edited only the specs, `CONTEXT.md` and ADR 0004. Each spec's own reconcile lines are under `### Six hats` at the end of its `## Review`.

## Workstreams

| Wave | Phase | Spec | Depends on |
|---|---|---|---|
| 1 | 0 — New-repo ground | `phase-00-new-repo-ground.md` | none |
| 2 | 1 — Link modes and escape | `phase-01-link-modes-and-escape.md` | Phase 0. Done also waits for the real-device matrix on Phase 2's first public deploy. |
| 3 | 2 — VPS foundation | `phase-02-vps-foundation.md` | Phases 0 and 1. The VPS lines and Done also wait for the ports 80/443 answer (answered 2026-10-04 by plan §11: Traefik fronts Caddy). |
| 4 | 3 — Auth and editor | `phase-03-auth-and-editor.md` | Phases 1 and 2 (Phase 0 only through Phase 2). |
| 5 | 4 — Stats | `phase-04-stats.md` | Phases 0, 1, 2 and 3. Production countries also need Phase 5, but landing does not. The country-source line is parked. |
| 6 | 5 — Cutover and domains | `phase-05-cutover-and-domains.md` | Phases 1, 2, 3 and 4 (Phase 0 only through Phase 2). The Cloudflare parts are parked. |

The chain is serial, so no two Phases share a wave. Phases 0 and 1 need no network step and can be built now. The Operator's network commands (Needs the human) come before Phase 2's first build.

## Adversary

- **00** — codex (`codex exec`, reasoning high, read-only, a docs-and-harness workspace without the v1 Snapshot; blind call B, then draft call D): accept 19, partial 7, reject 6, needs-human 0.
- **01** — codex (codex-cli 0.155.0-alpha.9, `model_reasoning_effort=high`, read-only, a blind workspace of plan, CONTEXT.md, ADRs and harness; blind call, then draft call): accept 7, partial 8, reject 15, needs-human 0.
- **02** — codex (`codex exec --sandbox read-only`, `model_reasoning_effort="high"`; B blind, D draft, (a)–(d) coordinator flags, X own cross-check): accept 13, partial 7, reject 13, needs-human 1. That one is who holds ports 80/443 on the VPS (D4b).
- **03** — codex (`codex exec`, `model_reasoning_effort=high`, read-only, a blind workspace without docs/spec/, .scratch/, .claude/, linkme_clone3/ or link.me/; B blind, D draft, R reconciler): accept 9, partial 8, reject 19, needs-human 0. D0 is a note with no verdict and is not counted.
- **04** — codex (codex-cli 0.155.0-alpha.9, `model_reasoning_effort=high`, read-only; blind call, then draft call): accept 14, partial 7, reject 16, needs-human 0.
- **05** — codex (blind call B, then draft call D): accept 13, partial 7, reject 10, needs-human 2. B18 and D11 are one question: do Spare Domains survive a Meta Flag?
- **Six hats (this pass)**, from the per-spec `### Six hats` lines, counted as accept / partial / reject / needs-human:

  | Spec | Accept | Partial | Reject | Needs-human |
  |---|---|---|---|---|
  | 00 | 3 | 0 | 0 | 0 |
  | 01 | 2 | 0 | 0 | 0 |
  | 02 | 5 | 0 | 0 | 1 |
  | 03 | 6 | 0 | 0 | 0 |
  | 04 | 3 | 0 | 0 | 1 |
  | 05 | 7 | 2 | 0 | 1 |

  The needs-human item in 02, 04 and 05 is the same question: where the country comes from.

Every count was checked against the files. The six-hats pass changed no codex verdict.

## Six hats

Ids follow the report: W white, R red, K black, Y yellow, G green, U blue, C the coordinator's points, REC the recommendation. Bullets that touch only some specs carry a one-line pointer here. Their full reconcile is in those specs.

- **W1 partial.** The facts are confirmed:
  - six specs, each reviewed by codex;
  - amendment 8 holds in every one: no Phase edits v1, and v1's repairs sit in Phase 2's import;
  - the Page Copy is at `app/public/`.

  The Phase 5 budget point is reconciled in Phase 5. The 48-hour lead and the DNSSEC work belong to the parked zone move. The rest of the runbook is the plan's own Phase 5.
- **W2 accept.** The three evidence gaps stay flagged:
  - live VPS and DNS state: the ports question and step 2 of Phase 5, under Needs the human;
  - PocketBase behaviour: Open questions 7, 8 and 21;
  - whether Cloudflare overwrites a client-sent `CF-IPCountry`: Open question 6.
- **W3 accept** (Phases 3 and 5). The drifted cross-spec line citations now cite section names. The entries inside each `## Review` keep their original citations, and a note under each `### Six hats` says so.
- **R1 partial.** The out-of-date cross-references are fixed (W3). On weight, no cut is made beyond the specs' own Out of Scope. Each spec's length follows the plan's scope for its Phase. The answer to "heavier than needed" is this one cleanup pass (G3), not a rewrite.
- **R2 accept** (Phases 4 and 5). The unease is justified: one Phase's choice of header moves the live domain's nameservers. That choice is now parked needs-human (G1).
- **R3 accept.** The order 0→1→2 holds, with no change (see G2).
- **K1 accept, fix folded into G1** (Phases 2 and 5). Geo Rules on DNS-only Custom Domains take v1's US fallback. The defect is now stated in Phase 2 (the Visitor location ASSUMPTION) and in Phase 5 (DNS records).
  - Observed, counting only and reading no Destination: 7 of v1's 38 Links carry a Geo Rule. In all 7 the US entry's `default` equals the rule's own `default`. So the wrong code is the rule's catch-all, never another country's code.
  - Only a real country on those hosts fixes it. That is the geo-IP position. Phase 5's B3 already rejects Cloudflare for SaaS as a payment the plan never asks for.
- **K2 accept** (Phases 2, 3 and 5). Backups now start at Phase 3's VPS deploy (rung 4: a lost sign-up cannot be rebuilt). Phase 5 keeps the pre-switch check and the proof of one backup.
- **K3 accept** (Phases 3 and 5). Phase 3's taken-Username test now uses `fixture`, and Phase 5's Acceptance opens with `set -e`. Its Snapshot check is also split into two lines, because `set -e` ignores a failure on the left of `&&`.
- **Y1 accept.** No change. The three layers that keep Destinations private stay as specified (Phase 2 projection, Phase 3 rules, leak scans).
- **Y2 accept.** No change. The hermetic loop and v1's own reveal.js as the parity oracle stay.
- **Y3 partial** (Phase 5). The claim holds for the record switch, the import's warnings and the hand-over. It does not hold for the zone move with DNSSEC, which is slow to undo, or for deleting the Netlify site, which is irreversible and is the Operator's own act (Phase 5, step 16). Plan §10 (2026-10-04) drops the site deletion and step 16, so only the zone move remains.
- **G1 needs-human** (Phases 2, 4 and 5). Cloudflare or geo-IP on the VPS: see Needs the human, item 2. Resolved 2026-10-04 by plan §11: Cloudflare.
- **G2 reject.** The order stays 0→1→2, for reasons the report did not weigh:
  - **Rung 1: Phase 2 depends on Phase 1** (Phase 2 spec, Depends on).
    - Its Profile JSON sends a Deeplink Mode Link with an empty `url`. Only Phase 1's page takes such a Link through Reveal.
    - v1's verbatim page navigates to `link.url` on any non-Adult tap (`linkme_clone3/script.js:196-200`).
    - Phase 2's own Fixture journey asserts that "the Deeplink Link's tap sends Reveal… and never requests `/r`" (Phase 2 spec, `02-profile-parity`, Fixture Profile journeys).
    - So under 0→2→1, Phase 2's spec fails until Phase 1 lands.
  - **The saving is one file.** The stand-in that Phase 2 deletes is the rewire Phase 0 needs for its own smoke spec anyway.
  - **Phase 1's matrix waits either way.** It closes only on Phase 2's public deploy, in either order.
  - **The report's own reason.** Phase 1 needs no network step, so it is built while the Operator runs the installs and answers the ports question.
- **G3 accept.** This pass is the single cleanup across the set. No further spec-by-spec reviews.
- **U1 accept.** Both questions are under Needs the human:
  - ports 80/443, which gates Phase 1's Done, Phase 2's VPS lines and Done, and Phase 5;
  - the country source, raised from ASSUMPTION to needs-human.
- **U2 accept.** Every cleanup item is done:
  - 3:311 now uses `fixture` (Phase 3);
  - `set -e` (Phase 5);
  - `profile.id` in Phase 2's contract and story 15, marked as added by Phase 4;
  - the owner-setting hand-over is step 12 of Phase 5's runbook, and Phase 3's Acceptance points there;
  - backups start at Phase 3's deploy;
  - CONTEXT.md's Fixture Profile now has four Links and the Username `fixture`;
  - ADR 0004 now says git-ignored;
  - stale notes are removed or refreshed: 0:250, 3:386, 3:477 (and its twin, D11), 4:237 and 4:164;
  - cross-spec citations now name sections;
  - Phase 2 now promises its Geo Rule test titles.
- **U3 accept.** Build Phases 0 and 1 offline, then the Operator's network commands, then Phase 2 (Workstreams).
- **C1 accept** (Phases 0 and 3). `app/public/` is confirmed, and the stale notes are gone. The `public/` in Phase 0's Out of Scope is v1's Netlify folder, which is correct there.
- **C2 accept** (Phases 0, 1 and 3, and CONTEXT.md). The Fixture's name is now consistent: `fixture`, with four Links. Phase 1's Depends on also called it "a `juliafilippo_` copy", and that is fixed too.
- **C3 accept** (Phases 2 and 4). `profile.id` is in Phase 2's contract and story 15, and Phase 4 keeps ownership.
- **C4 accept** (Phases 3 and 5). The hand-over is a runbook step at Cutover.
- **C5 accept** (Phases 2, 4 and 5). The four loose ends:
  - The US-against-`XX` difference is intended, and Phase 4 now says so.
  - DNS-only hosts are K1.
  - 4:164 is refreshed.
  - The test-title dependency is now promised by Phase 2.
- **C6 accept** (Phases 2 and 5). Ports and Spare Domains stay needs-human, and the country source is added as the third question.
- **C7 accept** (Phase 0, ADR 0004). Fixed.
- **C8 accept.** Every network command is under Needs the human, with exact text.
- **REC partial.**
  - Accepted: build Phases 0 and 1 now, and do the one cleanup pass (done).
  - Narrowed: the ports answer gates Phase 2's VPS lines and Done, not its local build or `./check.sh` (Phase 2 spec, Depends on).
  - Narrowed: the country answer gates only Phase 4's Cloudflare-specific text (Needs the human, item 2) and Phase 5's Cloudflare parts. Phase 2's Visitor location function serves either answer, so Phase 2 does not wait for it.

## Cut (YAGNI)

Deduplicated from the six Out of Scope sections.

**Barred by plan section 8 (v1 is never touched):**
- Any edit to v1: the old repo, Netlify's config or deploys, the live n8n workflow, `linkme_clone3/`, and a v1 ping or key (01–05).
- `publish = "public"`, making the old repo private, and purging secrets.json from its history. The exposure is accepted indefinitely; v1 stays live on its netlify.app address (plan §10, ADR 0005) (00).
- Rotating v1 Link Ids, and mapping them onto v2's. v2 mints fresh ids, and Creators are told that v1 Shortcuts break (ADR 0004) (00, 05).
- The n8n prefix-bug fix and the n8n Form's three-way Mode radio (00, 01).
- Run 1's done-check (`secrets.json` answers 404). v1 keeps serving it, and live reads are out of bounds (00).
- "n8n becomes admin-only". Moot, because the v2 Editor is the only v2 editing surface (03).

**Not asked for, or YAGNI:**
- **Page Copy and harness.**
  - Copying v1's non-page files (the other Profiles, photos, `example.webm`, the n8n exports, `optimize.py`, `netlify.toml`). They are not the page, and git history cannot recall them (00).
  - Self-hosting Font Awesome and the badge. The copy is verbatim (00).
  - Hardening the test-only Reveal stand-in. It is never deployed (00).
  - Installing `netlify dev`. It would be a new dependency fetched over the network (00).
- **Escape.**
  - An Age Gate on Link Shortcuts. Nobody asked for one (01).
  - Revealing before the tap. YAGNI until the matrix shows a dead Link (01).
  - Escaping without a tap. Plan section 4 says Escapes fire from a tap (01).
  - In-App Browser detection beyond the plan's pattern (01).
  - Translated overlay copy or per-app artwork (01).
- **Media and Bonus items.**
  - ffmpeg, video and animated images (D4) (02, 05).
  - Proxies (D7). Read as domain rotation, they are the Spare Domains (02, 03, 05).
  - A Geo Rule UI. The plan asks for a raw textarea (02, 03, 05).
  - Umami (02, 04, 05).
  - Content rules, abuse reporting and captcha. Bonus unless abuse appears (§9 D9) (02, 03, 05).
  - Sign-up rate limits beyond PocketBase's defaults (03).
  - An invite list. D9 is public sign-up (03).
- **App.**
  - Realtime anywhere: a response cache or push, a live preview in the Editor, a live Stats panel. "Live instantly" means the next load (02, 03, 04).
  - A least-privilege PocketBase account. The superuser is enough while every rule is closed (02).
  - More than one app container, or a shared rate-limit store (02).
  - Re-encoding imported WebP (02).
  - Mirroring v1 deletions on re-runs, and rotating a Link Id. Warnings are enough until Cutover (02).
- **Editor.**
  - Template sections beyond those kept. Plan §6 says "nothing more" (03).
  - A copy button for Link Shortcuts (03).
  - Self-serve Username change and Profile or account deletion. These break links or cannot be undone, so the Operator does them (03).
  - Changing email, and changing the password inside the Editor. "Forgot password" covers it (03).
  - Custom icon upload. Stock icons only (03).
  - Converting images in the browser (03).
  - Social login, magic links, one-time codes and 2FA (03).
  - Several Profiles per Creator (03).
  - A draft or published state. A Profile is live once it exists (03).
- **Stats.**
  - Template extras: comparisons, Engagement Rate, hourly, cities and map, an In-App Browser breakdown, custom ranges, CSV, and Operator-wide Stats (04).
  - Referrers, Unique Visitors and US state on Events. D5 logs none of them (04).
  - Bot filtering and excluding the Creator's own visits (04).
  - Stats per Tracking Code. OnlyFans reports on it (04).
  - Event retention. SQLite holds years of Events at this scale (04).
  - A rollup job. The `dailyStats` view is the daily aggregation (04).
  - Per-Creator time zones. Days are UTC (04).
  - A per-Mode counting matrix (04).
  - A chart library (04).
  - A page-script fork (04).
- **Domains.**
  - Self-serve Custom Domains and a TXT ownership check. Only the Operator sets a domain (03 defers, 05 cuts).
  - Automatic Flag detection and rotation, and an "active domain" setting (05).
  - Buying domains through a registrar API. It is a payment (05).
  - Automatic `www`/apex pairing, and more than one Custom Domain per Profile (05).
  - A 404 gate for unknown hosts, Reveal limited to the host's own Profile, and a redirect from ofl.ink to the Custom Domain (05).
  - Removing the "Powered by ofl.ink" footer (05).
  - End-to-end TLS in `./check.sh` (05).
  - Off-site backups, certificate monitoring and alerting (05).

**Parked, not cut:** a geo-IP database on the VPS (02, 04). It returns if the Operator picks the geo-IP position (Needs the human, item 2).

**Deferred between Phases (owned, not cut):**
- Mode behaviour and the device matrix → Phase 1.
- v1 repairs, the stack and Reveal hardening → Phase 2.
- Sign-up, the Editor, owner rules and reserved Usernames → Phase 3.
- Events, the ping, `dailyStats` and the per-Profile Tracking Code key → Phase 4.
- Custom and Spare Domains, the switch, the freeze and the country-header handling → Phase 5.
- Backups → Phase 3's deploy (this pass).

## Not yet specified

Moot by §8, so not gaps: goal_ai.txt:65-68, :124-127, :129-130 (the "in script.js" and the n8n radio), :154 ("n8n becomes admin-only"), and §9 D1's public v1 urls.

- **goal_ai.txt:148-150, the entry point to sign-up.** Phase 0 defers re-pointing the landing page's "Create Your Own Page" button from the n8n Form to sign-up to Phase 3. Phase 3 never takes it up. After Cutover, v2's landing page would send newcomers to the frozen v1 Form. This needs an owner (Phase 3 is the natural one).
- **goal_ai.txt:174, the icon.** Phase 3 offers stock icons only. Phase 2 still builds a `links/icon` upload target (512 px) that nothing uses. This is a YAGNI conflict for Phase 2's owner.
- **goal_ai.txt:199-201, screenshots.** Phases 0, 1, 3, 4 and 5 save shots to `.scratch/goal_ai/shots/`. Phase 2 saves none, though it serves the public page and the upload endpoint. No spec says to open UI tickets with Claude-in-Chrome or `--headed` (:200).
- **goal_ai.txt:202, failing tickets.** No spec says that a failing ticket stays open, or parks with its failing output pasted in. This is a rule for the build run, not for a Phase.
- **goal_ai.txt:196, real-device rows.** These are RUN.md rows in Phases 1, 4 and 5. Phase 3's real-phone Onboarding and HEIC check has no RUN.md row.
- **Partly covered:**
  - **Phase 1's DONE (:133)** waits for Phase 2's public deploy.
  - **"Clicks per day per country" (:159, :91)** can be proven only after Phase 5, and its source is parked.
  - **n8n beside v2 on the VPS (:73-75, :141)** waits for the ports answer.
  - **HEIC through sharp (:88)** is unverified, with `heic-convert` as the fallback.
  - **Spare Domains as the real mitigation (:96, :117-118)** is needs-human.

## Open questions

Every `ASSUMPTION:` across the specs, grouped, sharpest first. 199 raw flags at HEAD: 00:14, 01:22, 02:53, 03:26, 04:28, 05:42, CONTEXT.md:9, ADRs:5.

1. **Ports 80/443 are free for v2's Caddy** (Phase 2 Further Notes; Phase 5 Depends on; ADR 0001).
   - Assumes: n8n has no proxy of its own on those ports, or its proxy can pass TLS through by SNI.
   - If wrong: Phase 2's VPS lines and Done stall, and so do Phase 1's Done and all of Phase 5. Forcing the ports risks the live n8n.
   - Overturned by: the ssh command under Needs the human. This is needs-human.
   - Resolved 2026-10-04 by plan §11: Traefik (`n8n-traefik-1`) holds them. It keeps them and fronts v2's Caddy, by a TCP router ``HostSNI(`*`)`` with TLS passthrough on 443 and an HTTP router on 80 for every host that is not n8n's. Plan §11's own flag replaces this one: overturned if Traefik's config is not file-editable on the VPS or SNI passthrough breaks n8n.
2. **The country source and the zone move** (Phase 4 Contracts, Visitor country; Phase 5 DNS records and Moving the zone; Phase 5 Further Notes: DNS host, registrar, `www`, the 300 s TTL).
   - Assumes: the registrar can delegate, step 2 records every record including DS, and a 300 s TTL bounds the switch and a rollback to about 5 minutes.
   - If wrong: the live ofl.ink can stop resolving during the move, or a rollback outlasts a TTL while every bio link is down.
   - Overturned by: step 2's `dig` and `whois`. Parked needs-human.
   - Narrowed 2026-10-04 by plan §11: the source is Cloudflare, so the zone moves. The nameservers are Namecheap's (`dns1/dns2.registrar-servers.com`) and there is no DS record, so the move needs no DNSSEC step. Still open, and settled by steps 2 and 3: the registrar's delegation, `www`, and the 300 s TTL.
3. **ofl.ink's certificate issues through Cloudflare at the switch** (Phase 5 Contracts, ofl.ink's certificate; DNS records, evidence blocked).
   - If wrong: Cloudflare 52x errors right after the switch, until the DNS-only fallback or a rollback.
   - Overturned by: step 9's certificate check. Moot under geo-IP.
4. **No v1 Import runs after the switch** (Phase 3, v1 Profiles are handed over; Phase 5, Refreshing the v1 Snapshot).
   - Assumes: a written RUN.md rule, not a guard in code.
   - If wrong: one re-run overwrites every Editor edit on imported Profiles, and only a backup undoes it.
   - Overturned by: any re-run after the switch, which then gives Phase 2's import a guard.
5. **PocketBase has usable scheduled backups** (Phase 5 Backups, evidence blocked; Phase 3 Further Notes, Backups).
   - Assumes: zip backups holding `data.db` and `storage/`, kept on the VPS disk, with no restore drill.
   - If wrong: v2-only data from Phase 3's deploy on dies with the disk.
   - Overturned by: a release without backups (fall back to a nightly copy of the volume), or the Operator asking for a drill or off-site S3.
6. **Cloudflare overwrites a forged `CF-IPCountry`** (Phase 4 Further Notes; Phase 5 Moving the zone; both evidence blocked).
   - If wrong: Stats countries and US-state Geo Rule codes become forgeable, and no Caddy rule can fix it.
   - Overturned by: Phase 4's `ZZ` probe and Phase 5's step 7. Moot under geo-IP.
7. **PocketBase checks a file's type from its content** (Phase 3, File fields take webp only, evidence blocked).
   - If wrong: one guard against script running in another Creator's same-origin Editor session is gone.
   - Overturned by: a version that trusts the header. The proxy then also refuses multipart.
8. **`expand` and realtime obey the read rules** (Phase 3 Further Notes, evidence blocked).
   - If wrong: Destinations or other Creators' data leak through the Editor proxy (ADR 0004).
   - Overturned by: behaviour 10's `expand` check against the pinned version.
9. **Reveal's limit fits real traffic** (Phase 2 Reveal hardening; Phase 1 Interfaces; Phase 4 Page View Ping).
   - Assumes: 60 per IP per minute, in memory, gives no false 429s.
   - If wrong: Visitors behind carrier NAT silently get nothing from Adult and Deeplink Links, and `/c{code}` credit is lost.
   - Overturned by: false 429s seen on mobile.
10. **Deeplink keeps user activation across Reveal** (Phase 1 Contracts; Phase 2 Contracts, empty `url`).
    - If wrong: Deeplink Links are dead inside apps, and Phase 1 is not Done.
    - Overturned by: the device matrix.
11. **The Escape works on real phones** (Phase 1 Contracts, When the Escape Overlay shows; Phase 4 In-App Browser).
    - If wrong: Visitors stay stuck in the app, and Phase 1 is not Done.
    - Overturned by: the RUN.md matrix rows and the User-Agents observed there.
12. **A refreshed `main` clone equals live v1** (Phase 2, What "identically" means; Phase 5, Refreshing; ADR 0002).
    - If wrong: the Cutover import ships stale Profiles.
    - Overturned by: step 6's byte comparison with ofl.ink.
13. **Stale records are deleted by hand, and their Events go with them** (Phase 2 re-runs; Phase 4 Schema).
    - If wrong: a card v1 dropped stays public, or a deleted Profile's Stats vanish.
    - Overturned by: the Operator wanting `--prune`, or wanting Events kept.
14. **The v1 Import's repair choices** (Phase 2, v1 Import — repairs, 8 flags).
    - If wrong: "identically" shifts, and a strict refusal can stop the final import.
    - Overturned by: the Operator's call on each repair.
15. **Where real and test Destinations may sit** (Phase 2 Test loop, real Destinations in a throwaway local volume; Phase 0 Contracts, `example.com`).
    - If wrong: the parity spec loses its Reveal oracle.
    - Overturned by: a ruling that ADR 0004 covers local or test data.
16. **`/r` and Reveal stay uncached, and `/r` serves Adult Links** (Phase 2 Contracts).
    - If wrong: a cached Destination replays outside the limit, or Adult Destinations skip the Age Gate.
    - Overturned by: a cache being added, or a ruling that Adult Destinations leave only through Reveal.
17. **A separate pre-Cutover v2 https host exists** (Phase 2 Further Notes, v2 host name; Phase 1 Further Notes, Real-device host).
    - If wrong: Phase 1 has nowhere to become Done.
    - Overturned by: the Operator naming the host, or offering another.
18. **The US fallback on hosts without a country header** (Phase 2, Visitor location; Phase 5 DNS records).
    - If wrong: under the Cloudflare position, Custom Domain Visitors get the Geo Rule's catch-all code instead of their own. In today's v1 data this is never another country's code.
    - Overturned by: the geo-IP answer to item 2.
19. **Public sign-up does not get ofl.ink Flagged** (Phase 3, Content writes do not need a verified email, ADR 0006; "Publish" is the last screen).
    - If wrong: squatted or stranger content on the shared domain invites a Flag.
    - Overturned by: abuse appearing.
20. **sharp runs on Alpine, and HEIC may need help** (Phase 2 Upload, Base images).
    - If wrong: iPhone photos break Phase 3's Onboarding.
    - Overturned by: the HEIC fixture result, which triggers `heic-convert` or a `node:22-slim` base.
21. **The pinned PocketBase behaves as recalled** (Phase 2 PocketBase; Phase 3 sign-up sequence and Further Notes; Phase 4 `dailyStats` read; Phase 5 Schema). Every flag here is evidence blocked.
    - If wrong: each falls back as stated, and an offline rebuild may break.
    - Overturned by: the first run against the pin.
22. **Escape Mode is the default everywhere** (Phase 0 Contracts; Phase 1 Schema; Phase 3, New Profiles start on Escape Mode; CONTEXT.md).
    - If wrong: one constant each in the page, the import and the claim.
    - Overturned by: the Operator preferring Direct.
23. **Tracking Codes survive the Escape and the key change** (Phase 1 Contracts and Address bar; Phase 4 Tracking Code storage).
    - If wrong: `/c{code}` credit is lost or lands on the wrong Profile.
    - Overturned by: the Operator's preference, or `profile.id` being barred from the JSON.
24. **Stats count what Creators expect** (Phase 4 Interfaces, Schema and What counts; Phase 5, Readiness traffic stays in Stats).
    - If wrong: the numbers mislead.
    - Overturned by: Creators objecting, or a 30D read taking over 1 s.
25. **One warmed Spare Domain is enough** (Phase 5 Further Notes and Spare Domains are always live).
    - If wrong: a Flag that follows the content or the address takes the spare too.
    - Needs-human (Needs the human, item 3).
26. **Low-stakes groups**, each a path, a number or a UI change with a one-line overturn:
    - Stats plumbing (Phase 4);
    - domain and runbook simplifications (Phase 5 Interfaces, Schema, rollback, RUN.md at the root);
    - Editor and auth scope (Phase 3);
    - build, access and harness shape (Phases 0–2, including root SSH to `srv1395798.hstgr.cloud`);
    - coined glossary names and inferred motives (CONTEXT.md, ADRs 0001 and 0005).

**Stale or already settled.** None of these needs action:
- the Page Copy location (Phases 0 and 2 agree);
- the imported relative Destination (Phase 3, now marked moot);
- Geo Rule and Event country agreement (Phase 4, refreshed);
- the VPS parity grep (Phase 2 now promises the titles);
- the limiter key behind Cloudflare (met by Phase 5's strict trusted proxies);
- webp-only enforced at PocketBase (Phase 2's Schema already restricts it);
- the smoke spec's Escape variant (Phase 0's fixture already defaults to Escape);
- the fresh clone without the Snapshot (Phase 2 skips with `v1 Snapshot absent`).

## Needs the human

**By spec.**

1. **Ports 80/443 on the VPS** (Phase 2, D4b and Further Notes; Phase 5, step 1; this gates Phase 1's Done too).
   - **Resolved 2026-10-04 by plan §11.** Traefik (container `n8n-traefik-1`) holds 80/443, fronting n8n on 127.0.0.1:5678. Traefik keeps them, and v2's Caddy runs behind it: a TCP router with ``HostSNI(`*`)`` and TLS passthrough to Caddy on 443 (n8n's own HostSNI rule stays higher priority), plus an HTTP router on 80 for every host that is not n8n's. Caddy keeps TLS and on-demand certificates, and story 24 stays satisfied. The VPS steps stay the Operator's, but no ticket waits on a question. The positions below are kept as the record.
   - Positions:
     - If nothing holds the ports, v2's Caddy takes them and nothing changes.
     - If a proxy in front of n8n holds them, the Operator picks one of two. Either v2's Caddy fronts both, so v2 reaches n8n, against story 24. Or the existing proxy fronts v2, so TLS for v2 and for Custom Domains lives outside this repo.
   - Settled by:

     ```sh
     ssh root@srv1395798.hstgr.cloud 'docker ps --format "{{.Names}}\t{{.Image}}\t{{.Ports}}"; ss -ltnp "( sport = :80 or sport = :443 )"'
     ```

2. **Production country source: Cloudflare header or geo-IP on the VPS** (raised by this review; Phase 2, Further Notes; Phase 4, Contracts, Visitor country; Phase 5, DNS records, PARKED).
   - **Resolved 2026-10-04 by plan §11: Cloudflare.** `dig +short NS ofl.ink` gave Namecheap's `dns1/dns2.registrar-servers.com` and no DS record, so no DNSSEC. The nameservers move from Namecheap to Cloudflare when Phase 5's zone move asks, and the Operator makes that move. Geo Rules on DNS-only Custom Domains fall back to US, which is accepted. Nothing listed under "What it parks" is parked any more, and the geo-IP position is not built. The positions below are kept as the record.
   - **Cloudflare.** ofl.ink and the Spare Domains are Proxied, and the app reads `CF-IPCountry`.
     - For: rung 3, v1 takes the country from its edge's header (`geo_utils.js:48`). Rung 5: nothing to license, download or add to the app. The VPS address stays hidden for ofl.ink and the Spare Domains.
     - Against: rung 4. The live nameservers move at least 48 h ahead, and DNSSEC goes off and on again if a DS record exists. It also adds the Cloudflare lines and `CLOUDFLARE_RANGES`. Geo Rules on DNS-only Custom Domains fall back to US (Six hats, K1).
   - **geo-IP.** A country database behind Phase 2's Visitor location function, for every host. Records stay DNS-only at the current DNS host, and the switch is one record change there.
     - For: rung 4, ofl.ink's delegation never changes. Custom Domains get real countries.
     - Against: a licensed database download and its refresh by the human (floor 2), and a new dependency and lookup code (rung 5). ofl.ink and the Spare Domains would publish the VPS address.
   - **Why the ladder stops here.** Rung 4 favours geo-IP only if the zone is not already on Cloudflare, and checking that is a live read (floor 2).
   - **Evidence that settles it.** First, `dig +short NS ofl.ink; dig +noall +answer DS ofl.ink`. If the nameservers are already Cloudflare's, the move costs nothing and Cloudflare wins. If not, the Operator weighs the nameserver move (plus any DNSSEC change) against accepting a geo-IP licence and its monthly refresh.
   - **What it parks:**
     - Phase 4: the source line of Contracts, Visitor country; story 31; the post-switch `ZZ` probe in Acceptance; the Out of Scope line "The app reads `CF-IPCountry` directly"; the Further Notes ASSUMPTIONs on the `ZZ` probe and on "once ofl.ink is Proxied"; and the local header injection (story 32, test 4), which under geo-IP needs a test seam in front of the lookup.
     - Phase 5: stories 3, 18 and 19; The Cloudflare lines; DNS records; Moving the zone. In Acceptance: step 1's `CLOUDFLARE_RANGES` line, step 3, the Cloudflare part of step 4, step 7's two header probes, and where steps 8, 9 and 13 change records.
   - **Unaffected:**
     - Phases 0, 1, 2 and 3 in full.
     - Phase 4's Events, ping, `XX` rule, `dailyStats` and Stats page.
     - Phase 5's Host Resolution, TLS Ask, page bootstrap, Domains schema, Custom and Spare Domain serving, backups check, freeze, final import and hand-over.
3. **Do Spare Domains survive a Meta Flag?** (Phase 5, B18 and D11, Further Notes.)
   - For: a different origin escapes a Flag on the hostname alone (D6, plan §4).
   - Against: the same pages, Destinations and server sit behind it, and DNS-only hosts publish the address.
   - Settled by: after the first real Flag, open the warmed Spare Domain through the real bio link in Instagram and follow a Link onward.

Human-only acts that are not open questions are listed in Phase 5's Further Notes, "Needs the human" (items 1–12; its item 13 is item 2 here). Examples: buying domains, the Cloudflare account, the SMTP credential (Phase 3) and real phones. Nothing in Netlify is ever changed (plan §10).

**Network commands the human runs** (floor 2). Each is quoted exactly as its spec has it.

The Operator's Mac, once, when the build asks (Phase 2 Acceptance; plan §9). Done 2026-10-04 (plan §11): the `pnpm --dir app add` line and both pulls. The build line no longer downloads anything, because PocketBase is COPYd from `vendor/` and the app from `app/` with its `node_modules` (Phase 2 spec, Offline build). Only `heic-convert` stays conditional.
```sh
pnpm --dir app add hono @hono/node-server sharp
docker pull alpine:3
docker compose --env-file tests/e2e.env build        # offline since 2026-10-04 (plan §11): no network request
pnpm --dir app add heic-convert                      # only if the HEIC case of 02-image-upload fails with sharp alone
docker pull axllent/mailpit                           # Phase 3's local mail catcher
```

Reading the old repo, which writes nothing there (Phase 2 Further Notes; Phase 5 step 6):
```sh
git -C linkme_clone3 pull --ff-only
```

The VPS (Phase 2 Acceptance):
```sh
rsync -a --exclude /node_modules --exclude .scratch ./ root@srv1395798.hstgr.cloud:/opt/oflinkv2/       # keeps vendor/ and app/node_modules
cd /opt/oflinkv2 && docker compose up -d --build --wait                          # on the VPS; the build pulls only absent base images there (plan §11)
docker compose run --rm -v "$PWD/linkme_clone3:/v1:ro" app import-v1 --site /v1   # on the VPS
curl -sI http://<v2 host>/ | grep -i '^location: https://'
PLAYWRIGHT_BASE_URL=https://<v2 host> npx playwright test tests/e2e/02-profile-parity.spec.ts
ssh -L 8090:127.0.0.1:8090 root@srv1395798.hstgr.cloud
```

Cutover (Phase 5 Acceptance; the steps are RUN.md's `## Cutover`):
```sh
ssh "$VPS" "sudo ss -ltnp '( sport = :80 or sport = :443 )'"                                                   # step 1
{ curl -s https://www.cloudflare.com/ips-v4; echo; curl -s https://www.cloudflare.com/ips-v6; } | xargs        # step 1, CLOUDFLARE_RANGES (Cloudflare, plan §11)
rsync -a --exclude /node_modules --exclude .scratch ./ "$VPS:$V2_DIR/" && ssh "$VPS" "cd $V2_DIR && docker compose up -d --build --wait"   # step 1
dig +short NS ofl.ink; dig +noall +answer ofl.ink A ofl.ink AAAA www.ofl.ink CNAME www.ofl.ink A www.ofl.ink AAAA; dig +noall +answer DS ofl.ink; whois ofl.ink | grep -i registrar   # step 2
curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'                          # steps 3 and 13: live v1 still answers
test "$(curl -s -o /dev/null -w '%{http_code}' "https://$SPARE/$USERNAME")" = 200                             # step 4
git -C linkme_clone3 pull --ff-only && echo "v1 commit: $(git -C linkme_clone3 rev-parse HEAD)" >> RUN.md     # step 6
bad=0; for f in linkme_clone3/api/profiles/*.json; do curl -sf "https://ofl.ink/api/profiles/${f##*/}" | cmp -s - "$f" || { echo "differs from live v1: ${f##*/}"; bad=1; }; done; test "$bad" = 0   # step 6
rsync -a --delete --exclude .git linkme_clone3/ "$VPS:$V2_DIR/linkme_clone3/"                                 # step 6
ssh "$VPS" "cd $V2_DIR && docker compose run --rm -v \"\$PWD/linkme_clone3:/v1:ro\" app import-v1 --site /v1"   # step 6
PLAYWRIGHT_BASE_URL="https://$V2_HOST" npx playwright test tests/e2e/02-profile-parity.spec.ts --grep-invert 'Geo Rule'   # step 6
nc -zv "$VPS_IPV4" 80 && nc -zv "$VPS_IPV4" 443                                                                # step 7
```
Steps 1, 3, 7, 9 and 14 add further `curl`, `dig` and `ssh` checks against v2's host, ofl.ink, the Spare Domain and a Custom Domain. Their exact text is in Phase 5's Acceptance. After the switch, Phase 4 adds one probe:
```sh
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'CF-IPCountry: ZZ' https://ofl.ink/v/<a Username>
```

## Blindness caveat

The review worktree's `.git` pointed at the real repo. So codex could read sibling specs with `git show HEAD:docs/spec/...` in its draft calls, and did: the Phase 0 and Phase 4 review runs reported it. Only Phase 4's `## Review` records it (Process notes: commit c52cbe2). Other draft calls may have done the same without saying so, and Phase 5's "neither could see docs/spec/" is not proven. Phase 4's draft call also fetched four public documentation pages by URL (PocketBase rules and relations, Playwright `page.route`, Cloudflare zone settings); no workspace content went with them.

The blind calls cited no spec. The draft calls' cross-spec findings are therefore not independent of the sibling specs. Their verdicts were rechecked against the files, but treat the draft-call reviews as informed, not blind. The six-hats report read the committed tree openly and claims no blindness.
