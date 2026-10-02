# Plan review

Reconciliation pass over the six Phase specs, 2026-10-02. Docs only: no code, no live system read or written. Inputs: the plan (goal_ai.txt), CONTEXT.md, docs/adr/, the six specs with their codex reviews, and a six-thinking-hats review of the whole set. Each six-hats bullet is reconciled here or in the `### Six hats` part of the Review of every spec it touches. The labels used there are indexed below.

## Workstreams

The plan's build order (section 5) is fixed and binding, so the Phases form one chain. No two Phases run in parallel: each one consumes the previous one's code, data or rules.

| Wave | Phase | Spec | Depends on |
|---|---|---|---|
| 1 | 0. Security and data cleanup on v1 | phase-00-security-cleanup.md | Nothing. |
| 2 | 1. Link Modes and Escape | phase-01-link-modes-and-escape.md | Phase 0: the `public/` layout, the new Link Ids and the dev-server stand-in. |
| 3 | 2. VPS foundation | phase-02-vps-foundation.md | Phases 0 and 1: v2 serves v1's fixed page, and v1 is the parity oracle. Its deploy waits on the 80/443 answer (Needs the human). |
| 4 | 3. Auth and Editor | phase-03-auth-and-editor.md | Phase 2's stack, schema and import; Phase 1's Mode values. Its scope waits on D9 (it proceeds on invite-only). |
| 5 | 4. Stats | phase-04-stats.md | Phase 2's `events` and `/r`; Phase 3's owner rules and API proxy. |
| 6 | 5. Cutover and domains | phase-05-cutover-and-domains.md | Phases 0 to 4. TLS on 443 must reach v2's Caddy (the 80/443 answer). |

## Adversary

Reviewer for every spec: codex (`codex exec --sandbox read-only`, reasoning effort high), 2026-10-02. Each spec had two calls: a blind call (B: plan, glossary, ADRs, harness, without the spec) and a draft call (D: with the spec). Every finding was checked against the real repo, read-only. Counts are the reconcile lines in each spec's `## Review`, before the six-hats lines.

| Spec | Reviewer | Accepted | Partial | Rejected | Needs-human |
|---|---|---|---|---|---|
| Phase 0, phase-00-security-cleanup.md | codex, B + D | 9 | 11 | 10 | none |
| Phase 1, phase-01-link-modes-and-escape.md | codex, B + D | 6 | 8 | 10 | 1: D1, v1's public non-Adult `url`s against ADR 0004 |
| Phase 2, phase-02-vps-foundation.md | codex, B + D | 10 | 19 | 14 | 1: D11b, what holds 80/443 and who fronts whom |
| Phase 3, phase-03-auth-and-editor.md | codex, B + D | 8 | 8 | 7 | 2: B1 and D1, both D9 (public or invite-only sign-up) |
| Phase 4, phase-04-stats.md | codex, B + D | 14 | 9 | 12 | none |
| Phase 5, phase-05-cutover-and-domains.md | codex, B + D | 12 | 15 | 10 | 1: B24b, whether a Spare Domain recovers traffic |

How blind the blind calls were: the blind-call workspace's git index listed docs/spec/ file names, because its HEAD contained the specs. The command logs show no spec content was read. So the blindness held by instruction plus log evidence, not by structure.

## Six hats

### Set-level reconcile lines

- **W1** (five needs-human items, and Phase 5 quietly assumes the answer to two of them) **accept**. All five are under Needs the human, with items 2 and 3 as one entry (D11b). Phase 5's silent assumption is W2: Phase 5's Depends on now states it as a precondition.
- **W9** (nothing has been observed on the VPS, in live DNS or from a PocketBase binary) **accept**, no change possible. Floor 2 bars live reads and image pulls, so each such claim stays flagged `ASSUMPTION (evidence blocked)`. Needs the human and Open questions name the observation that settles each one.
- **W11 / G1 / U4 item 4** (D1 switches DNS "at parity", section 5 puts Cutover last; move Cutover forward) **reject**, rung 2. Section 5's order is fixed and binding. D1's "at parity" is the condition Cutover must meet, which is Phase 5's readiness gate, not its slot. G1's gains are real: no window in which v1 and v2 both take edits, and no need for re-runs to keep v1 winning. Only the human can trade them for the order, by editing section 5.
- **R1** (six specs agreed on names through "Overturned by Phase N's actual …" clauses, not one shared contract) **accept**. This pass is the answer: each of the seven cross-Phase gaps now has one owning Phase (table below), and every other Phase points to the owner by section name.
- **R3** (heavy for about 27 Profiles; v1's Reveal keeps open CORS and no rate limit for weeks after parity) **partial**.
  - The size is the plan's, by rung 2: D1 to D9 and section 5 fix the Phases.
  - v1's Reveal: rejected for Phase 0, for the reasons in Phase 0's Review (B7):
    - ADR 0004 and section 5 limit Phase 0 to four steps.
    - A guess at a 12-digit random id hits with a probability of about 4·10^-11.
    - CORS does not bind a crawler that is not a browser.
  - The window is real. It closes at Cutover, the plan's last step.
- **Y1** (Phase 0 stands alone and found real exposure) **accept**. The Workstreams start with Phase 0.
- **Y2** (strong rules carry through every Phase) **accept**, and this pass keeps them:
  - the fixture secrets file and Deeplink's empty `url` keep "no Destination in any public payload";
  - the allow-listed proxy keeps PocketBase's rules as the boundary.
- **Y3** (one test loop and v1 as the oracle, with three exceptions that only show on the VPS) **accept**. Each exception now has an owner:
  - case twins: Phase 2;
  - 80/443: Phase 5's precondition plus the needs-human D11b;
  - the page-script reset: Phase 4's own copy.
- **U1** (one docs-only pass before anything runs with `--execute`) **accept**. This is that pass.
- **U2** (stale cross-references) **accept**. All five were fixed in place, and line numbers now read as section names:
  - **phase-02:455**: Cloudflare, plus Phase 5's Caddy lines.
  - **phase-03:193**: the unique-addresses reason, now a fresh stack with `down -v`.
  - **phase-04:69**: "Phase 2's port" became v2's own copy.
  - **phase-04:220**: counting by delta, now a fresh stack whose tests share Profiles in order.
  - **phase-04:294-301**: now a pointer to Phase 5.
- **U3** (ADR wording) **accept**. ADR 0004 now says new Link Ids stop future guessing and do not make a leaked Destination useless. ADR 0002 now says the v1 Import is re-runnable until Cutover, with v1 winning.
  - CONTEXT.md's v1 Import entry still says "the one-time copy". CONTEXT.md is outside this pass's files, so the next pass that may edit it fixes the wording.
- **U4** (park one list for the human, cheapest first) **partial**.
  - Items 1 (80/443), 2 (D9), 3 (the non-Adult `url`s) and 6 (Spare Domain efficacy) are under Needs the human, in that order.
  - Item 4 (Cutover at parity or last) is settled by rung 2 (W11).
  - Item 5 (whether any bio uses /Jaka, /JakaJaka or /weiWEi) is moot. Phase 2 now looks Usernames up lower-cased, so each of those paths serves the same Profile as its lower-case twin.
- **U5** (build Phase 0 alone first; re-review Phase 2 against Phases 1, 4 and 5 before building it) **partial**.
  - Phase 0 first: accept (Wave 1).
  - The re-review: this pass reconciled Phase 2 with Phases 1, 4 and 5 on every seam the hats named. No separate adversary run is scheduled.

  ASSUMPTION: no second adversary run on Phase 2 before its build (rung 5). Overturned if the 80/443 answer is "the existing proxy fronts v2", which changes Phase 2's Caddy and deploy; Phase 2 is then re-reviewed.
- **Recommendation** (one docs-only pass giving each of the seven gaps one owner; park 80/443 and D9; start with Phase 0) **accept**, done as written.

### The seven cross-Phase gaps

| Gap | Owner | Rung | What the owner decided | Pointers in |
|---|---|---|---|---|
| The public PocketBase API route and its path map | Phase 3 | 2, then 4 and 5 | An allow-listed proxy on the Profile origin: `users`, `profiles`, `links`, and Phase 4 adds `dailyStats`. No realtime, no `_superusers`, no `invites`. Superuser steps in tests go to PocketBase's loopback port. | Phases 2, 4, 5 |
| The public page script after Phase 2 | Phase 4 | 2, then 4 | v2 forks its own copy of the page files Phase 4 changes, served ahead of v1's directory. Phase 5's bootstrap edits that copy. The readiness step moves only v1's data and static files. | Phases 2, 5 |
| Backups after Cutover | Phase 5 | 2, then 5 | PocketBase's scheduled backups, daily, keeping 7, with one restore proven before the switch. Pre-switch test Events are cleared after a backup. | Phase 2 |
| The Fixture Profile's Adult Link Destination | Phase 2 | 2, then 5 | `tests/fixtures/secrets.json`, and `--secrets` may repeat. An id found in two files refuses the import. | Phases 0, 1, 4, 5 |
| Deeplink through `/r` | Phase 2 | 2, then 4 | Profile JSON `url` is empty for Deeplink Mode Links as well as Adult ones. The page gets the Destination through Reveal, then opens the intent. | Phase 1 |
| Phase 0's secrets-path 404 against v2's catch-all | Phase 2 | 2, then 5 | `GET /netlify/*` answers 404 with landing.html. | Phases 0, 5 |
| Case twins (Jaka/jaka, JakaJaka/jakajaka, weiWEi/weiwei) | Phase 2 | 2, then 4 | The import skips a byte-equal twin with a warning and refuses twins that differ. `getProfile` matches lower-cased. | Phases 0, 3, 5 |

ASSUMPTION: each owner is the Phase whose plan work already holds the area (rung 2: plan section 5 order). The shape of each decision is the most reversible one (rung 4), then the smallest (rung 5). Overturned if the human reassigns an area. Only the owner's section then moves, since every other Phase cites it by section name.

### Index of six-hats labels

W = white, R = red, K = black, Y = yellow, G = green, U = blue.

| Label | Gist | Verdict | Reconciled in |
|---|---|---|---|
| W1 | five needs-human items | accept | here |
| W2 | Phase 5 assumes the 80/443 answer | accept | Phase 5 (owner), Phase 2 |
| W3 | fixture location settled | accept | Phases 1, 2 (no edit) |
| W4 | VPS parity runs write test Clicks into real Stats | accept | Phase 5 (owner), Phases 2, 4 |
| W5 | reserved Usernames piecemeal; `v` redundant; enforcement unspecified | accept | Phase 3 (owner), Phases 2, 4, 5 |
| W6 | phase-02:455 stale DNS-only text | accept | Phase 2 |
| W7 | two specs claim the Caddy country lines | accept | Phase 5 (owner), Phase 4 |
| W8 | `CF-IPCountry` spoofable on DNS-only Custom Domains | accept | Phase 5 (owner), Phases 2, 4 |
| W9 | nothing observed on VPS, DNS, PocketBase binary | accept | here |
| W10 | `reuseExistingServer` drift | accept | Phases 3, 4; Phase 2 is the reference |
| W11 | D1 vs section 5 timing | reject (rung 2) | here |
| R1 | seams agreed via overturn clauses | accept | here |
| R2 | v1's `public/` as v2's page | accept | Phase 4 (owner), Phases 2, 5 |
| R3 | heavy for 27 Profiles; v1 Reveal open | partial | here |
| K1 | Deeplink through `/r` | accept | Phase 2 (owner), Phase 1 |
| K2 | Phase 0's 404 vs v2's catch-all | accept | Phase 2 (owner), Phases 0, 5 |
| K3 | fixture Adult Link has no Destination | accept | Phase 2 (owner), Phases 0, 1, 4, 5 |
| K4 | public PocketBase route unowned | accept / partial | Phase 3 (owner, partial with G7), Phases 2, 4, 5 |
| K5 | no backups after Cutover | accept | Phase 5 (owner), Phase 2 |
| K6 | page script after Phase 2 | accept | Phase 4 (owner), Phases 2, 5 |
| K7 | case twins | accept | Phase 2 (owner), Phases 0, 3, 5 |
| Y1 | Phase 0 stands alone | accept | here |
| Y2 | strong rules carry through | accept | here |
| Y3 | one test loop, v1 as oracle | accept | here |
| G1 | move Cutover forward | reject (rung 2) | here |
| G2 | v2's own page copy from Phase 4 | accept | Phase 4 (owner), Phases 2, 5 |
| G3 | fixture secrets file, repeatable `--secrets` | accept | Phase 2 |
| G4 | decide Deeplink explicitly | accept | Phase 2 (owner), Phase 1 |
| G5 | Phase 2 answers `/netlify/*` with 404 | accept | Phase 2 |
| G6 | lowercase or skip case twins | accept | Phase 2 |
| G7 | one proxy excluding `_superusers` | partial (allow-list, no realtime) | Phase 3 |
| G8 | per-Profile Tracking Code key into Phase 1 | reject (rung 2) | Phases 1, 4 |
| G9 | drop the `v` reservation | accept | Phase 4 |
| G10 | stay DNS-only without Cloudflare | reject (already the overturn clause) | Phases 4, 5 |
| U1 | one docs-only pass | accept | here |
| U2 | stale cross-references | accept | Phases 2, 3, 4; here |
| U3 | ADR wording | accept | ADRs 0002 and 0004; Phases 0, 2 |
| U4 | park one list for the human | partial | here |
| U5 | Phase 0 first; re-review Phase 2 | partial | here |
| Recommendation | docs-only pass, owners, park, Phase 0 first | accept | here |

## Cut (YAGNI)

Every Out of Scope item across the six specs, deduplicated. Phases are given as P0 to P5.

**Security and data**

- **Purging Destinations from the git history of the Profile files** (P0): The plan names only secrets.json, and the repo becomes private.
- **Reveal using its `user` parameter in a file path** (P0): No leak was observed, and v2's Reveal replaces this code.
- **Fixing Profile files whose inner `username` differs from their file name** (weiwei, juliafilippo, cleocash, hannah) (P0): v1 routes by file name, so no Visitor sees the difference.
- **PocketBase backups before Cutover** (P2): Until Cutover v1 is the source of truth, and the v1 Import rebuilds v2.
- **A least-privilege service account for the app** (P2): The superuser is enough until Phase 3 exposes PocketBase.
- **Sign-up extras: content rules, abuse reporting, captcha and sign-up rate limits** (P3): Sign-up is invite-only (D9), and they come back in if the Operator answers D9 "public".
- **Login rate limiting or lockout beyond PocketBase's own defaults** (P3): There are few accounts and every one is invited, and this comes back in with public sign-up.
- **Social login, magic links and 2FA** (P3): The plan specifies email and password.
- **DNS ownership verification (TXT challenge) for Custom Domains** (P5): Only the Operator can set a domain, which makes the check redundant.
- **A 404 gate for unknown hosts** (P5): Caddy's `ask` refusal already keeps them off HTTPS.
- **Limiting Reveal and `/r` to the host's own Profile** (P5): No threat is served by it.

**Product features: Profile page and Escape**

- **Stamping an explicit Mode onto the live Profile files** (P1): A missing Mode resolves to Escape Mode, which keeps today's Escape Overlay.
- **An Age Gate on Link Shortcuts** (P1): It is existing v1 behaviour that Phase 1 does not alter, and nobody asked for it.
- **Starting Reveal when the Age Gate opens, so Adult Links in Deeplink Mode keep user activation** (P1): It waits until the real-device matrix shows a dead Link.
- **Detecting In-App Browsers beyond the plan's pattern, such as Snapchat or LinkedIn** (P1): It is not in the plan.
- **Translating the Escape Overlay copy, or giving it per-app artwork** (P1): Nobody asked for it.
- **Auto-escaping on page open, with no tap** (P1): Plan section 4 says Escapes fire from a tap.

**Product features: Editor**

- **Every link.me Template section beyond the kept ones** (Shouts and Media, Gallery, Products, Events, Forms, Tracking Pixels, Link Scheduler, Music Smart Link, Social Grid, Video Feeds, Carousel, headers, fonts and colours, video profile, follower count, QR code, AI assistant, Pro upsell) (P3): Plan §6 says "nothing more".
- **A copy button for Link Shortcuts (`?link=`)** (P3): The plan does not ask for it in Phase 3, and v1 behaviour for Link Shortcuts is unchanged.
- **Changing your own Username, and deleting your own Profile or account** (P3): Both break shared links, so the Operator does them in PocketBase's admin UI.
- **Uploading a custom icon** (P3): Stock icons only, as the n8n Form offers today.
- **Converting images in the browser** (P3): D4 puts conversion in the app container.
- **An invite screen and sending invite emails** (P3): PocketBase's admin UI is the Operator's tool, and the Operator sends the sign-up address to the Creator through their own channel.
- **An Editor field for Custom Domains, and Spare Domain handling in the Editor** (P3, P5): Phase 3 hands it to Phase 5, and Phase 5 cuts it because the Operator sets the field in PocketBase's admin UI and a self-serve field would need ownership checks while D9 is open.

**Product features: Stats**

- **Real-time panel, "Live" badge and 30-second refresh** (P4): The plan asks for numbers by day, not live ones.
- **Period comparison, % change, Engagement Rate, Total Interactions, hourly pattern, cities and world map** (P4): These link.me Template extras fall outside "per-link clicks + page views, by day and country" (plan section 6).
- **Traffic sources by referrer** (P4): D5 does not log the referrer.
- **An In-App Browser breakdown on the Stats page** (P4): D5 lists only Page Views, Clicks and click-through rate per Link per day per country, and the Operator reads In-App Browser in PocketBase's admin UI.
- **Unique Visitors and de-duplication** (P4): They need a Visitor identifier, which D5 does not log.
- **Bot filtering** (P4): The Page View ping needs JavaScript, which keeps most crawlers out, so it waits until the numbers look inflated.
- **Excluding the Creator's own visits** (P4): Nobody asked for it.
- **Stats per Tracking Code** (P4): D5 keeps `/c{code}` for OnlyFans attribution, and OnlyFans reports that itself.
- **US state or region on Events** (P4): Geo Rules use it, but D5 logs country only.
- **Custom date ranges and CSV export** (P4): Nobody asked for them.
- **Operator-wide Stats across Profiles** (P4): PocketBase's admin UI already shows every Event to the Operator.
- **Event retention and pruning** (P4): At about 27 Profiles, SQLite holds years of Events, so it waits until disk use grows.
- **A scheduled rollup job or table** (P4): The `dailyStats` view meets "daily aggregation".
- **Per-Creator time zones** (P4): Days are UTC.
- **A chart library** (P4): It is a new dependency, and plain bars meet the brief.

**Product features: Domains**

- **Automatic detection that ofl.ink is Flagged, and automatic rotation** (P5): The plan treats rotation as a human act, and Meta offers no signal to watch.
- **An "active domain" setting, or Editor share URLs that follow it** (P5): Nothing in the plan displays or redirects by domain.
- **Pairing `www` and apex for Custom Domains automatically** (P5): Exact hostnames only, and a Creator who wants both asks again (flagged).
- **More than one Custom Domain per Profile** (P5): Nobody asked for it.
- **Removing the "Powered by ofl.ink" footer text on Custom and Spare Domains** (P5): It is text pointing at a host-relative `landing.html`, not a link to ofl.ink (flagged).

**Bonus items, after Phase 5**

- **Proxies (D7)** (P2, P3, P5): The plan marks them as a bonus after Phase 5, and if D7 means rotating domains, the Spare Domains already cover it with no extra code.
- **A Geo Rule UI** (P2, P3, P5): The plan calls for a raw JSON textarea, "no UI yet", and lists the UI under Bonus.
- **Umami** (P2, P4, P5): The plan lists it as a Bonus "if PocketBase stats are not enough".
- **ffmpeg, video and animated images** (P2, P5): D4 says "ffmpeg only if video is added later", and the plan places it after Phase 5.

**Operations and infrastructure**

- **A response cache or realtime push to open pages** (P2): "Live instantly" means the next load, which reading PocketBase on every request already gives.
- **More than one app container, or a shared rate-limit store** (P2): One container serves the whole stack.
- **A geo-IP database on the VPS (MaxMind)** (P2, P4): It needs an account, a licensed download, a new dependency and lookup code, while Cloudflare's headers need none, so it waits until the Operator will not proxy through Cloudflare.
- **Re-encoding imported v1 images** (P2): The v1 Import copies them unchanged so the pages look identical.
- **The n8n Form writing into PocketBase** (P2): v1 stays the source of truth until Cutover, and re-running the v1 Import carries its edits over.
- **Fixing the other n8n flaws** (non-atomic delete-then-create, shared secrets.json edits overwriting each other, about 5 commits plus a build per edit, banner names built from an id's digits) (P0): The plan leaves n8n "untouched except the prefix bug", and D2 replaces GitHub-as-database in v2.
- **Any change to the n8n Form or to v1 (GitHub/Netlify), including the Form's texts and flow** (P3, P5): n8n is live and "stays as is" (D1).
- **Deleting the in-repo n8n exports, sdf, txt_replacement_dmca, or banner images the new copies replace** (P0): They stop being deployed or used, and deleting them is not needed and cannot be undone cheaply.
- **Deleting the Netlify site, the GitHub repo or v1 data** (P5): It is irreversible, so it is left to the Operator.
- **Buying domains through a registrar API** (P5): It is a payment, so human-only under floor 2, and one purchase does not justify automation.

**Tests and tooling**

- **`netlify dev` as the Playwright webServer** (P0, plan §7): Phase 0's dev server stand-in replaces it (`tests/dev-server.mjs`, already the webServer in playwright.config.ts, now reading netlify.toml's publish folder and redirects), because installing netlify-cli is a network fetch (floor 2), and Phase 2 then swaps in its docker compose wrapper.
- **End-to-end TLS in `./check.sh` using Caddy's internal CA** (P5): It would add a 443 listener and certificate trust to the local loop, so the loop stays plain HTTP and certificate issuance stays manual.
- **A Deeplink Mode or Escape Mode counting matrix** (P4): Clicks are counted where `/r` or Reveal hands out the Destination, whatever the Mode, and Phase 1 tests each Mode's path.

**Deferred to a named Phase, not cut**

These appear in Out of Scope lists but are owned by a later Phase.

- Rate-limited Reveal and same-origin CORS (D8) (P0, P1): Phase 2's Click guard. Phase 1 said D8 was "applied in Phase 0", which Phase 0 contradicts; this pass corrected Phase 1 to name Phase 2.
- Hiding non-Adult Links' Destinations from Profile files (P0): Phase 1 and Phase 2.
- The Fixture Profile (P0): Phase 1.
- The always-on Escape Overlay and Modes (P0): Phase 1.
- Protection against ofl.ink being Flagged (P0): Phase 5's Spare Domains (D6).
- Mode storage in v2 and its v1 Import mapping (P1): Phase 2.
- Per-Link Mode and 18+ toggles in the Editor (P1): Phase 3.
- A per-Profile Tracking Code in place of the global localStorage code (P1, P2): Phase 4 (D5).
- Counting Clicks across the Escape hop (P1): Phase 4.
- Importing the n8n export into the live n8n, deploying the preview, promoting to ofl.ink (P1): Phase 1, as `# manual:` steps the Operator runs (floor 2).
- Writing Events, daily aggregation, the Stats page and the link.me Template's analytics screen (P2, P3): Phase 4.
- Creator login, register, verify and reset, Onboarding, the Editor, owner collection rules, the allow-listed proxy to PocketBase, reserved Usernames and D9 (P2): Phase 3.
- The Custom Domain field, Caddy on-demand TLS with its `ask` check, host-to-Profile routing and Spare Domains (P2): Phase 5.
- Pointing ofl.ink's DNS at the VPS, keeping Netlify as cold backup, turning v1 off (P2): Phase 5 (Cutover).
- PocketBase backups from Cutover on (P2): Phase 5.
- The real-device In-App Browser matrix (P2, P3): Phase 1's DONE and its manual RUN.md item.

## Not yet specified

Checked against plan sections 0, 3 (D7), 5 (Bonus), 6 and 7.

- **Section 0 (the original plan).** Every line maps to a Phase except two:
  - "proxies", which is D7 (below);
  - "ffmpeg for image conversion": D4 replaced it with Sharp for images (Phase 2), and ffmpeg is left only for video, a Bonus item.
- **Section 3, D7 (Proxies).** Not specified. The plan calls its scope undefined. If it means rotating domains, Phase 5's Spare Domains already cover it with no extra code. Any other meaning, such as an HTTP proxy in front of Destinations, needs the Operator to define it before a spec can exist.
- **Section 5, Bonus.** Not specified: the geo-rules UI, ffmpeg for video, and Umami "if PocketBase stats are not enough". Until then, Geo Rules travel as data through the v1 Import and are edited as Phase 3's raw JSON textarea, as plan section 5's Phase 3 line says ("no UI yet"). Phases 2, 3, 4 and 5 cut these items explicitly (see Cut).
- **Section 6 (definitions of done).** All four are specified:
  - traffic tracking: Phase 4;
  - login and register, with verify, reset and the Username claimed on sign-up: Phase 3;
  - one form for adding Links: Phase 3;
  - the mobile-first layout copied from link.me: Phase 3.
- **Section 7 (local test loop).** Specified: every Phase's Acceptance ends with `./check.sh` and names its Playwright files, and real-device checks sit in `RUN.md` (Phases 1 and 5). Three parts are not yet specified:
  - **One spec per ticket.** Specs and Acceptance blocks are per Phase, not per ticket, and Phase 2 alone names five Playwright files. The split into tickets, each with its own Acceptance, is step 5's job and has not been written.
  - **Step 2 screenshots.** Phases 0, 1, 3, 4 and 5 save shots to `.scratch/goal_ai/shots/`. Phase 2 names none: its public page is v1's, unchanged.
  - **Step 3 parking.** "Failing = ticket stays open; agent fixes or parks with the failing output pasted in the ticket" is a rule for step 5. No spec repeats it.
  - The `netlify dev` webServer of section 7 is under Cut.

## Open questions

These are the 25 ASSUMPTIONs with the most riding on them, sharpest first. When an entry merges lines, it names every place it comes from.

1. **Phase 2 (Further Notes: what holds ports 80 and 443) and Phase 5 (Depends on: Phase 2 precondition)**: v2's Caddy can take ports 80 and 443 on the VPS, or get TLS on 443 by SNI passthrough, but nobody has looked at what the n8n set-up already runs there. *If wrong:* if a proxy already holds 443 and cannot pass TLS through, Phase 2 cannot deploy as written, and Phase 5's on-demand TLS, every Custom Domain and Spare Domain, and the Cutover itself are blocked until the Operator chooses again. The other way out, "Caddy fronts both", makes v2 reach n8n and breaks Phase 2's n8n decision. *Settled by:* the `docker ps` / `ss` output from the VPS (Phase 2's needs-human D11b), then the Operator's choice.
2. **Phase 0 (Which Destinations leave the public files) and Phase 1 (Taps by Mode; Link Shortcut)**: only Adult Links lose their Destination from v1's Profile files. Non-Adult Links keep a public `url`, including the 6 non-Adult Links that carry 2 of the 12 Adult Destinations. *If wrong:* v1 breaks ADR 0004's "no Destination in any public file" until Cutover, and 2 Adult Destinations stay public after Phase 0 counts as done. Fixing it means blanking every `url` in the n8n public-link field set and in the 27 Profile files, and sending every v1 tap and Link Shortcut through Reveal. *Settled by:* the Operator ruling on whether ADR 0004 covers non-Adult Links in v1 (needs-human D1 in Phase 1's Review), and marking those 6 Links Adult or removing them.
3. **Phase 0 (Further Notes: old deploys, forks and old commits)**: the old secrets.json may survive in four places: Netlify's permalinks for earlier deploys, a dev branch deploy, forks of the public repo, and GitHub's copies of old commit hashes. Manual checks after the purge cover all four. *If wrong:* a copy those checks miss keeps every Adult Destination public. Phase 0's 404 test still passes, so its DONE line reads as met. *Settled by:* an old deploy's permalink and an old commit's GitHub URL both answering 404 after the push, no branch deploy existing, and the repo having no forks.
4. **Phase 2 (Reveal hardening; Contracts: `/r`)**: Reveal lets through requests that carry neither `Origin` nor `Sec-Fetch-Site`. `/r` gives out the Destination of any Link, Adult or not, and only the shared rate limit stands in front of it. *If wrong:* any script can read the Link Ids in a Profile's JSON and collect every Adult Destination through `/r`, which skips both the Age Gate and Reveal's origin check. Refusing such requests changes the Reveal and `/r` contracts. Phase 4 counts Clicks on both, and Phase 5 serves both on every host. *Settled by:* the Operator deciding whether non-browser clients must be refused, and whether Adult Destinations may leave only through Reveal.
5. **Phase 2 (Further Notes: where the Visitor's country comes from), Phase 4 (Further Notes: production country source) and Phase 5 (DNS records)**: Cloudflare's proxy supplies Visitor country in production, so v2 needs no geo-IP database. *If wrong:* without Cloudflare, Geo Rule Tracking Codes on v2 differ from v1's for every non-US Visitor, which breaks OnlyFans attribution at Cutover. Every Event records `XX`. Phase 5's proxied records, zone move and Caddy country lines all fall away, and a geo-IP lookup must land before Cutover. *Settled by:* the Operator agreeing to proxy ofl.ink and the Spare Domains through Cloudflare, with visitor location headers on.
6. **Phase 5 (Further Notes: DNS host and registrar; Moving the zone)**: ofl.ink's registrar can delegate to Cloudflare, the zone can move 48 hours early, and a 300-second TTL holds the switch and a rollback to about five minutes. Nobody has seen which DNS host or registrar ofl.ink uses, or whether `www.ofl.ink` exists. *If wrong:* the zone cannot move, so the Cloudflare plan in entry 5 fails. The switch and the rollback also stop being one record change each, and a higher minimum TTL stretches both. *Settled by:* the output of the runbook's `dig` step and of the zone move.
7. **Phase 5 (DNS records; ofl.ink's certificate)**: Caddy gets ofl.ink's certificate on demand, at the first handshake after the switch, through Cloudflare's proxy with HTTP-01. Neither step has been observed. *If wrong:* Cloudflare's Full (strict) mode finds no valid origin certificate, so every Visitor to ofl.ink gets an error at the moment of Cutover. The error lasts until the runbook sets the record to DNS-only so Caddy can get the certificate directly. *Settled by:* the post-switch certificate check.
8. **Phase 2 (v1 Import), Phase 3 (v1 Creators' imported Profiles are handed over after Cutover) and Phase 5 (Freezing v1 edits)**: the v1 Import is re-run until Cutover as an upsert where v1 wins. Imported Profiles therefore stay with the Operator, and v1 Creators get the Editor only after the final v1 Import. *If wrong:* if Creators must edit before Cutover, or a v2 edit lands on an imported Profile, the final v1 Import overwrites that edit with no warning. The import would then have to skip Profiles that have an owner, and Phase 5's freeze would change. *Settled by:* the Operator confirming that v1 Creators can wait until after Cutover, and that there are few enough to move by hand.
9. **Phase 5 (Backups)**: the PocketBase release that Phase 2 pins has built-in scheduled backups, and daily copies kept on the VPS disk are enough. *If wrong:* v2 goes live with no working backup, or with backups that are lost along with the VPS disk. A failure after Cutover then loses Profiles, Creators' edits and Stats, and Phase 2 takes no backups before Cutover either. *Settled by:* Settings → Backups in the pinned release's admin UI, together with the restore drill. An Operator request for an off-site (S3) copy overturns the disk-only part.
10. **Phase 2 (PocketBase: admin UI) and Phase 3 (Editor ↔ PocketBase)**: PocketBase's admin UI and superuser login stay off the public internet and are reached only through an SSH tunnel. The app proxies only an allow-list of the three Editor collections, plus Phase 4's `dailyStats`. *If wrong:* a public admin host name or a broader proxy puts the superuser login, which guards every Destination, on the public internet. *Settled by:* the Operator not asking for a public admin host, and no later screen needing realtime updates or another collection.
11. **Phase 3 (D9: sign-up is private and invite-only) and Phase 5 (Who can set a Custom Domain)**: D9 is answered "private / invite-only", and only the Operator sets Custom Domains. *If wrong:* public sign-up brings back the content rules, abuse reporting and captcha that Phase 3 leaves out. It also opens the shared domain to spam that can get it Flagged, and may call for self-serve Custom Domains with ownership checks in Phase 5. *Settled by:* the Operator's answer to D9, which the plan marks as blocking Phase 3's scope.
12. **Phase 5 (Caddy configuration)**: Caddy sets `X-Country`, and trusts the forwarded client IP, only for requests from Cloudflare's address ranges, which are copied into the Caddyfile by hand at deploy. *If wrong:* once Cloudflare adds a range, requests from it lose their country (US for Tracking Codes, `XX` in Stats). Caddy also reports Cloudflare's own address as the client IP, so many Visitors share one rate-limit bucket and get 429s on Reveal and `/r`. *Settled by:* a change in Cloudflare's published ranges, which calls for refreshing the copy.
13. **Phase 2 (PocketBase: version pin)**: the pin is the newest release the implementer knows of, at least 0.23. Nobody checked the actual newest release. *If wrong:* the shipped release may not match the rule syntax used in Phase 3 and in Phase 5's `@request.body.customDomain:isset`. It may also differ on behaviours that Phases 3 to 5 rely on without observing them: unverified sign-in, sessions ending on a password change, the page-size cap and scheduled backups. *Settled by:* the human bumping the pin, then checking those behaviours against the pinned release.
14. **Phase 2 (Reveal hardening: rate limit)**: a limit of 60 requests per client IP per minute, held in memory in one app container, never trips a real Visitor. *If wrong:* Visitors behind mobile-carrier NAT share one IP and get 429s, so their Adult Links stop opening. Phase 4's Page View ping uses the same threshold, so their Page Views drop too. *Settled by:* false 429s from mobile-carrier NAT, which call for a higher number.
15. **Phase 1 (Schema)**: a Profile with no valid Mode acts as Escape Mode, and the 27 live Profile files are not stamped with a Mode. *If wrong:* if Mode-less Profiles should fall back to Direct Mode, the fallback changes in Phase 1's script, in Phase 2's v1 Import and in Phase 3's "Profile default". As written, Facebook, Threads and TikTok Visitors on all 27 live Profiles start seeing the Escape Overlay the day Phase 1 ships. *Settled by:* the Operator choosing Direct Mode as the fallback, or asking for every Profile to be stamped now.
16. **Phase 3 (Content writes require a verified email; the Username claim does not)**: an unverified account may claim a Username and create a bare public Profile. If someone else signs up first with an invited address, "Forgot password" gives the invitee the account back, and PocketBase ends the other sessions. *If wrong:* a squatter who knows an invited address keeps the account and its Username, with a bare Profile on the shared domain, until the Operator deletes it by hand. Profile creation would then also need a verified account. *Settled by:* the pinned PocketBase ending other sessions when the password changes, and the Operator judging bare Profiles harmless.
17. **Phase 3 (Further Notes: PocketBase behaviours this spec relies on but could not observe)**: an unverified PocketBase account can sign in with its password by default. *If wrong:* the sign-up sequence breaks at the Username claim, which moves to the first log-in after verification. The tracer-bullet test must then mark accounts verified through the superuser API. *Settled by:* an unverified sign-in attempt on the pinned release.
18. **Phase 2 (Interfaces)**: the app reads PocketBase as a superuser, and no least-privilege service account exists. *If wrong:* a new service account needs rules for Phase 2's Destination reads, Phase 4's Event writes and Phase 5's reads of the hidden domain fields. Phase 5's choice to hide the domains assumes superuser access. *Settled by:* the Operator asking for a least-privilege service account before Phase 3 exposes PocketBase.
19. **Phase 1 (Escape target)**: the System Browser lands on the Profile with a Link Shortcut, not straight on the Destination. *If wrong:* the Destination must be revealed before the tap, which puts it in the page early. That also changes how Phase 4 counts Clicks and Page Views across the Escape, and how Phase 5 builds Escape targets for each host. *Settled by:* the Operator saying whether the System Browser should land on the Destination directly.
20. **Phase 1 (Taps by Mode) and Phase 2 (Contracts: Deeplink Links)**: a Deeplink Mode Link navigates from the Reveal callback, and v2 gives every Deeplink Link an empty `url` so it goes through Reveal. *If wrong:* without the tap's user activation, the phone can refuse the hand-off, and Deeplink Links stop working in In-App Browsers. v2 then either goes back to `/r/{id}`, where Deeplink acts like Direct, or starts Reveal when the Age Gate opens. *Settled by:* the real-device matrix.
21. **Phase 3 (One Profile per Creator)**: no Creator runs several Profiles. *If wrong:* agency-style accounts drop the one-owner-per-Profile rule. Phase 3's rules and Onboarding, Phase 4's own-Profile Stats and Phase 5's one Custom Domain per Profile then all need a model where one Creator has many Profiles. *Settled by:* whether any Creator needs agency-style access to several Profiles.
22. **Phase 2 (Contracts: Visitor location) and Phase 4 (Visitor country)**: the app reads v1's country header names (`x-country`) before Cloudflare's, so a Visitor can set their own country until Phase 5's Caddy lines remove that header. *If wrong:* if a faked country matters, Visitors on v2's host before Phase 5 can choose the Geo Rule Tracking Code their Click gets and skew Stats by country. Caddy would then have to strip v1's header names from Phase 2 on. *Settled by:* the Operator deciding whether a Visitor choosing their own country matters.
23. **Phase 4 (What counts)**: every load counts as a Page View, with no de-duplication, including the second load after an Escape. *If wrong:* Escape Mode Profiles, which under Phase 1's default include every Mode-less live Profile, show about two Page Views per escaped Click, so their click-through rates read low. The fix marks escaped loads in the URL, which touches Phase 1's Escape target. *Settled by:* Escape Mode Profiles showing a visibly deflated click-through rate.
24. **Phase 0 (Two local commits; Further Notes: go-live runbook)**: the data step is redone on fresh data at go-live, and n8n stays deactivated from the fetch until after the force-push. *If wrong:* an n8n edit made in that window lands on history that the force-push overwrites, so that Creator's change is lost. *Settled by:* the Operator guaranteeing no edits during the switch, or `rev-list --count` printing 0 at go-live.
25. **Phase 1 (n8n Form)**: the live n8n accepts `radio` form fields at the export's form node version (2.5). The live n8n version cannot be read from here. *If wrong:* the import rejects the export, and the Operator cannot set any Mode from the n8n Form until the field is rebuilt as a `dropdown`. Phase 0's path fix is in the same export file, so a failed import can hold it back too. *Settled by:* the import into the live n8n.

| Spec | ASSUMPTION lines | of which evidence blocked | in the 25 | Main themes of the rest |
|---|---|---|---|---|
| Phase 0 | 20 | 4 | 6 | n8n path prefix and Link Ids, banner copies and hand repairs, Netlify 404 rule behaviour, dev server and test baseline |
| Phase 1 | 23 | 1 | 7 | Escape Overlay copy and timing, per-platform escape fallbacks, Mode inheritance and form radios, Tracking Code and address bar, Fixture Profile and test hosting |
| Phase 2 | 45 | 3 | 12 | stack layout and base images, schema rules and field names, v1 Import edge cases, image upload pipeline, seed and test loop |
| Phase 3 | 20 | 3 | 7 | Phase 2 field names, Username rules and badge, Editor form defaults, mail-less local testing |
| Phase 4 | 41 | 4 | 5 | Phase 2 schema bindings, Click and Page View rules, aggregation and UTC days, ping path and limiter, Stats page layout, seed and test plumbing |
| Phase 5 | 33 | 4 | 12 | Host Resolution and path grammar, Custom Domain removal and privacy, Spare Domain readiness, rollback and Netlify shutdown, runbook and test plumbing |
| Total | 182 | 19 | 49 | |

A script did the counting: it matches `ASSUMPTION( \(evidence blocked\))?:` once per line and skips each spec's `## Review` section. "in the 25" counts lines, not entries, so a merged entry adds one for each line it covers. Phase 4's Further Notes repeats many of its own decisions, so several of its 41 lines are restatements.

This file adds two ASSUMPTION lines of its own, both under Six hats: no second adversary run on Phase 2 (U5), and how the seven gap owners were chosen.

## Needs the human

Cheapest first within the list. Each entry names the exact command or observation that settles it.

- **Phase 2, D11b: what holds ports 80 and 443 on the VPS, and who fronts whom.** This gates Phase 2's deploy and all of Phase 5. Settle it in two steps:
  1. Run this from the Mac:
     ```sh
     ssh <vps> 'docker ps --format "{{.Names}}\t{{.Ports}}"; sudo ss -ltnp "( sport = :80 or sport = :443 )"'
     ```
     If nothing listens, v2's Caddy takes the ports and n8n is untouched.
  2. If something listens, the Operator chooses one of Phase 2's two options:
     - "Caddy fronts both";
     - "the existing proxy fronts v2". This option works for Phase 5 only if that proxy passes TLS through by SNI.
- **Phase 3, D9 (B1 and D1): public sign-up or invite-only.** Settled by the Operator's written answer. The spec proceeds on invite-only. A public answer adds a sign-up path without an invite and changes Phase 3's create rule.
- **Phase 1, D1: v1's non-Adult `url`s stay public, against ADR 0004.** Settled by the Operator's written ruling. The six-hats suggestion is to keep them public, but rule on the 6 non-Adult Links whose `url` carries an Adult Destination, which Phase 0 keeps non-Adult. Marking them Adult adds an Age Gate; removing them ends the leak.
- **Phase 5, B24b: does a Spare Domain recover traffic once ofl.ink is Flagged?** Only a real Flag settles it.
  - On the first one, open `https://$SPARE/$USERNAME` inside Instagram on a phone, and confirm the Profile opens with no Meta warning.
  - Then watch the Profile's Page Views on the Stats page over the following days.
- **Phase 0 and Phase 4.** None.
