# Map — goal-ai (run 2, under plan amendment §8)

`--execute` — invoked 2026-10-04 as `/spec-auto goal_ai.txt --execute --tickets 24`; run id 20261004T191309Z; resumed at step 5 (steps 0–4 committed at 4e9e361). Plan §11 answers ports and country source.

Run id: 20261002T174527Z. Mode: design-only (no `--execute`). Run 1 (64 tickets, Netlify-first) is superseded and kept at `.scratch/goal-ai-superseded-run1/` and `docs/spec-superseded-run1/`.

## Destination

ofl.ink v2: a Docker Compose link-in-bio service (Caddy, Hono on Node, PocketBase) built entirely in this repo and run on the Operator's Hostinger VPS, that serves every v1 Profile identically with no Destination in any public file, gives each Link one Mode (Direct, Escape, Deeplink), lets Creators sign up publicly and edit in a phone-first Editor, shows Stats, and is cut over from v1 by one DNS change while v1's repo, Netlify site and n8n Form are never touched. Plan: [goal_ai.txt](../../goal_ai.txt) (sections 8 and 9 amend 0–7).

## Notes

- Plan: [goal_ai.txt](../../goal_ai.txt)
- Glossary: [CONTEXT.md](../../CONTEXT.md)
- ADRs: [0001 v2 on own VPS beside live v1](../../docs/adr/0001-v2-on-own-vps-beside-live-v1.md) · [0002 PocketBase holds data, auth, files](../../docs/adr/0002-pocketbase-holds-data-auth-and-files.md) · [0003 One Mode per Link](../../docs/adr/0003-one-mode-per-link.md) · [0004 No Destination in any public file](../../docs/adr/0004-no-destination-in-any-public-file.md) · [0005 Leave v1 untouched, build v2 here](../../docs/adr/0005-leave-v1-untouched-build-v2-in-new-repo.md)
- Specs:
- [Phase 00 — new-repo-ground](../../docs/spec/phase-00-new-repo-ground.md)
- [Phase 01 — link-modes-and-escape](../../docs/spec/phase-01-link-modes-and-escape.md)
- [Phase 02 — vps-foundation](../../docs/spec/phase-02-vps-foundation.md)
- [Phase 03 — auth-and-editor](../../docs/spec/phase-03-auth-and-editor.md)
- [Phase 04 — stats](../../docs/spec/phase-04-stats.md)
- [Phase 05 — cutover-and-domains](../../docs/spec/phase-05-cutover-and-domains.md)
- Plan review: [docs/spec/plan-review.md](../../docs/spec/plan-review.md) (Workstreams, Adversary counts, Six hats, Cut, Not yet specified, Open questions, Needs the human, Blindness caveat)

## Tickets

Waves are serial: Phase 0 → 1 → 2 → 3 → 4 → 5. 44 tickets. Plan §11 (2026-10-04) answered ports (Traefik fronts Caddy) and country source (Cloudflare) and closed the network gate: 24 done by the Operator, 13/37/42 ready-for-agent, 11/23/32/38/43 parked only as Operator VPS steps, 44 parked needs-human.

| NN | Ticket | Spec | Blocked by | Status |
|---|---|---|---|---|
| 01 | [The test loop serves the Page Copy](issues/01-page-copy-served.md) | phase-00 | None | done |
| 02 | [A Visitor sees the Fixture Profile at /fixture in a hermetic loop](issues/02-fixture-profile-visible.md) | phase-00 | 01 | done |
| 03 | [Test Secrets sit beside the Fixture Profile and are never served](issues/03-test-secrets-never-served.md) | phase-00 | 02 | done |
| 04 | [Age Gate then Reveal on fixture data with no v1 Snapshot in the loop](issues/04-reveal-on-fixture-without-snapshot.md) | phase-00 | 03 | done |
| 05 | [Each Link travels by its own Mode in a System Browser](issues/05-modes-in-system-browser.md) | phase-01 | 04 | done |
| 06 | [The Escape Overlay opens with the page only on an Escape-default Profile in every In-App Browser](issues/06-overlay-on-open-by-default-mode.md) | phase-01 | 05 | done |
| 07 | [An Escape Mode tap in iOS Instagram escapes to Safari from the tap itself](issues/07-ios-escape-on-tap.md) | phase-01 | 06 | done |
| 08 | [An Adult Escape Mode Link passes the Age Gate then escapes with no Reveal in the app](issues/08-adult-escape-after-age-gate.md) | phase-01 | 07 | done |
| 09 | [On Android an Escape opens Chrome or its fallback and a Deeplink Link hands off to its app](issues/09-android-escape-and-deeplink.md) | phase-01 | 07 | done |
| 10 | [The escaped Link opens by itself in the System Browser credited to the same Tracking Code](issues/10-link-shortcut-lands-escape.md) | phase-01 | 08, 09 | done |
| 11 | [The real-device matrix passes for every Mode on v2's first public https deploy](issues/11-real-device-matrix.md) | phase-01 | 10, 23 | parked — VPS step: the Operator runs the commands (plan §11) |
| 12 | [The v2 stack is declared and its Compose contract checks pass offline](issues/12-stack-declared-offline.md) | phase-02 | 01 | done |
| 13 | [The Operator's network commands fetch the stack's packages and images](issues/13-network-commands.md) | phase-02 | 12 | ready-for-agent |
| 14 | [The v1 Import repairs or refuses every v1 file before it writes anything](issues/14-import-repairs-or-refuses.md) | phase-02 | 03 | done |
| 15 | [The v1 Import writes the Fixture Profile into PocketBase on a running test stack](issues/15-import-writes-fixture.md) | phase-02 | 13, 14 | ready-for-agent |
| 16 | [The Fixture Profile is served by v2's stack and every Phase 0 and Phase 1 spec passes on it](issues/16-fixture-served-on-stack.md) | phase-02 | 10, 15 | ready-for-agent |
| 17 | [Every v1 Profile page on v2 matches the v1 Snapshot card for card](issues/17-v1-pages-match.md) | phase-02 | 16 | ready-for-agent |
| 18 | [Every Click on a v1 Link ends at v1's Destination for the same Tracking Code and Visitor location](issues/18-v1-clicks-match.md) | phase-02 | 17 | ready-for-agent |
| 19 | [Re-running the v1 Import keeps every Link Id and refuses a broken v1 tree without writing](issues/19-import-reruns-and-refusal.md) | phase-02 | 17 | ready-for-agent |
| 20 | [A PocketBase admin edit shows on the next page load while PocketBase's API stays closed](issues/20-live-edit-closed-api.md) | phase-02 | 16 | ready-for-agent |
| 21 | [A photo uploaded in any D4 format is stored upright and resized as WebP](issues/21-image-upload-webp.md) | phase-02 | 16 | ready-for-agent |
| 22 | [Reveal and /r answer only v2's own origin within a per-client limit](issues/22-reveal-guard.md) | phase-02 | 18, 19, 20, 21 | ready-for-agent |
| 23 | [v2 serves every v1 Profile identically on its public https host on the VPS](issues/23-vps-deploy.md) | phase-02 | 22 | parked — VPS step: the Operator runs the commands (plan §11) |
| 24 | [The Operator pulls the local mail catcher's image](issues/24-mail-catcher-image.md) | phase-03 | None | done |
| 25 | [Anyone with the sign-up link creates an account and claims a Username](issues/25-sign-up-and-claim.md) | phase-03 | 20 | ready-for-agent |
| 26 | [A verified Creator goes through Onboarding to a live Profile whose Links act like imported ones](issues/26-onboarding-to-live-profile.md) | phase-03 | 25, 18, 21 | ready-for-agent |
| 27 | [A Creator changes their Profile in the Editor and its default Mode reaches the page](issues/27-editor-profile-and-mode.md) | phase-03 | 26 | ready-for-agent |
| 28 | [A Creator manages their Links in the Editor and a refused save keeps what they typed](issues/28-editor-links.md) | phase-03 | 26 | ready-for-agent |
| 29 | [Log-in lands a Creator where they left off and a handed-over Profile opens in the Editor](issues/29-log-in-lands-where-left.md) | phase-03 | 26 | ready-for-agent |
| 30 | [Only a Profile's owner and the Operator can read or change it through PocketBase's API](issues/30-owner-rules-over-http.md) | phase-03 | 26 | ready-for-agent |
| 31 | [Verification and reset emails reach the local mail catcher and their links work](issues/31-mail-links.md) | phase-03 | 24, 22, 27, 28, 29, 30 | ready-for-agent |
| 32 | [Sign-up runs on the VPS with the Operator's mail and nightly backups](issues/32-vps-sign-up-live.md) | phase-03 | 31, 23 | parked — VPS step: the Operator runs the commands (plan §11) |
| 33 | [A Page View and a Click through /r reach the Creator's Stats page](issues/33-page-view-and-click-reach-stats.md) | phase-04 | 01, 10, 18, 20, 27, 29 | ready-for-agent |
| 34 | [Reveals and Link Shortcuts count as Clicks and Stats read per Link per day per country](issues/34-reveals-and-shortcuts-count.md) | phase-04 | 33, 22 | ready-for-agent |
| 35 | [A Tracking Code stays with the Profile it arrived on](issues/35-tracking-code-stays-with-profile.md) | phase-04 | 33, 01, 10, 18 | ready-for-agent |
| 36 | [Only the owner reads a Profile's Stats and recording never blocks a Click or a deletion](issues/36-owner-only-stats-and-safe-recording.md) | phase-04 | 34, 35, 22, 31 | ready-for-agent |
| 37 | [Events carry each Visitor's real country from the production country source](issues/37-production-country-source.md) | phase-04 | 36, 42 | ready-for-agent |
| 38 | [A phone inside Instagram is recorded as Instagram on v2's VPS host](issues/38-instagram-recorded-on-vps.md) | phase-04 | 36, 32 | parked — VPS step: the Operator runs the commands (plan §11) |
| 39 | [Custom Domains and Spare Domains listed in PocketBase serve Profiles by host and pass the TLS Ask](issues/39-domains-served-by-host.md) | phase-05 | 22, 30 | ready-for-agent |
| 40 | [On a Custom Domain or Spare Domain every Mode and Escape and Reveal works and counts as on ofl.ink](issues/40-every-host-behaves-as-ofl-ink.md) | phase-05 | 39, 10, 36 | ready-for-agent |
| 41 | [Caddy asks the app before every certificate and the Cutover runbook is written](issues/41-caddy-asks-and-runbook-written.md) | phase-05 | 40, 29 | ready-for-agent |
| 42 | [Visitor location trusts only the production country source and ofl.ink's DNS is ready for a one-record switch](issues/42-country-source-and-dns-ready.md) | phase-05 | 41 | ready-for-agent |
| 43 | [The Operator switches ofl.ink to v2 by one DNS change while v1 stays live](issues/43-cutover-runbook.md) | phase-05 | 41, 42, 23, 32, 38 | parked — VPS step: the Operator runs the commands (plan §11) |
| 44 | [Bio links move to a warmed Spare Domain the day ofl.ink is Flagged](issues/44-spare-domain-rotation.md) | phase-05 | 43 | parked — needs-human: Spare Domain vs Meta Flag |

## Decisions so far

- **ADR 0001:** v2 runs on our own VPS in Docker Compose, beside a live v1.
- **ADR 0002:** PocketBase holds v2's data, logins and files; collection rules enforce ownership.
- **ADR 0003:** One three-way Mode per Link, not two checkboxes.
- **ADR 0004:** No Destination in any public file; Reveal by script is obfuscation, not protection.
- **ADR 0005:** v1 is left untouched; v2 is built only in this repo.
- **Phase 00:** This repo has its own copy of v1's public page and a test-only Fixture Profile; the local test loop serves and asserts on those two alone; neither git nor any test output ever holds the v1 Snapshot or a Destination.
- **Phase 01:** Every Link travels by its own Mode (Direct, Escape, Deeplink); the Escape Overlay appears only where Escape Mode calls for it; an Escape fires from the Visitor's own tap with a fallback, and the Tracking Code survives the move to the System Browser.
- **Phase 02:** One Docker Compose stack in this repo (Caddy, Node app, PocketBase) serves every v1 Profile imported and repaired from the v1 Snapshot with fresh Link Ids, shows admin edits on the next load, stores images as WebP, and gives out a Destination only one Click at a time.
- **Phase 03:** Anyone holding the sign-up link creates an account, claims a Username, verifies email and builds their Profile and Links in a phone-first Editor styled on the link.me Template; PocketBase rules let only them change it.
- **Phase 04:** A signed-in Creator's Stats page shows their own Page Views, Clicks and CTR per Link, per UTC day and per country, counted from Profile loads, /r redirects and Reveals; a Tracking Code stays with the Profile it arrived on.
- **Phase 05:** ofl.ink is served by v2 from the VPS while v1 stays untouched and live on its netlify.app address as the fallback; a Creator's Custom Domain shows their Profile; at least one warmed Spare Domain is ready once ofl.ink is Flagged.
- **Plan answers (§9):** D1 moot (v1's non-Adult urls stay as they are); D9 public sign-up; the Operator runs network commands when a ticket asks.
- Plan answer (§10, 2026-10-04): the Netlify site stays on indefinitely; no Netlify change ever; Cutover runbook has no irreversible step.

## Not yet specified

From plan-review.md:
- Landing page "Create Your Own Page" entry point: ticket 25 now points it at v2's sign-up (ASSUMPTION in the ticket).
- Link icon upload target built by Phase 2 but unused by Phase 3's stock icons: kept in ticket 21 (ASSUMPTION).
- Phase 2 screenshot: added in ticket 17 (ASSUMPTION).
- Build-run rules from the plan (open UI tickets headed, failing tickets stay open with output pasted): rules for the `--execute` run, not a Phase.
- Phase 3's real-phone Onboarding and HEIC check: a RUN.md row in ticket 32.
- Partly covered: Phase 1 Done waits on the VPS deploy (23); Clicks per country after Phase 5; n8n beside v2 waits on the ports answer; HEIC through sharp unverified.

## Out of scope

See plan-review.md `## Cut (YAGNI)`. Headlines: any edit to v1 (repo, Netlify, n8n, v1 Snapshot); purging secrets.json from the old history; rotating v1 Link Ids; the n8n Mode radio; ffmpeg and video; HTTP proxies; a Geo Rule UI; Umami; captcha and abuse tooling; invite lists; realtime anywhere; multi-container app; Template sections beyond those kept.

## Needs the human

1. **Ports 80/443 — RESOLVED by plan §11 (2026-10-04):** Traefik holds them; v2's Caddy runs behind a Traefik TCP router (HostSNI(`*`), TLS passthrough, PROXY protocol) and an HTTP router for non-n8n hosts. Tickets 11, 23, 32, 38, 43 stay parked only for the Operator's VPS commands.
2. **Country source — RESOLVED by plan §11 (2026-10-04): Cloudflare.** Nameservers move Namecheap → Cloudflare when ticket 42 asks (human step). Geo Rules on DNS-only Custom Domains fall back to US, accepted. 37 and 42 unparked.
3. **Whether a Spare Domain survives a Meta Flag.** Parks 44. Settled only after the first real Flag.
4. **Network commands — DONE by the Operator 2026-10-04 (plan §11):** app/package.json with hono, @hono/node-server, sharp; alpine:3, axllent/mailpit pulled; PocketBase 0.40.4 zips in vendor/. Builds must be offline; a ticket whose build needs the network parks.
5. Human-only acts without a question: domains, Cloudflare account, SMTP credential, real phones. Full list in plan-review.md `## Needs the human`.

## Assumptions to veto

Sharpest first (full list of 199 flags in plan-review.md `## Open questions`):
1. **Traefik can front Caddy by file-editable config with SNI passthrough and PROXY protocol without breaking n8n** (plan §11). If wrong: the VPS deploy (23) and everything after it stall until the Operator chooses again.
2. **The Namecheap → Cloudflare zone move is safe and a 300 s TTL bounds the switch and rollback** (narrowed by plan §11). If wrong: the live ofl.ink can stop resolving during a zone move, or a rollback outlasts a TTL.
3. **No v1 Import runs after the switch (a RUN.md rule, not a code guard).** If wrong: one re-run overwrites every Editor edit on imported Profiles; only a backup undoes it.
4. **PocketBase has usable scheduled backups.** If wrong: v2-only data from Phase 3's deploy on dies with the disk.
5. **Cloudflare overwrites a forged CF-IPCountry.** If wrong: Stats countries and US-state Geo Rule codes become forgeable. Moot under geo-IP.
6. **PocketBase sniffs file type from content, and `expand`/realtime obey read rules.** If wrong: a same-origin script guard is gone; Destinations could leak through the Editor proxy.
7. **Reveal's 60/IP/min limit fits real traffic.** If wrong: carrier-NAT Visitors silently get nothing from Adult and Deeplink Links.
8. **Deeplink keeps user activation across Reveal, and the Escape works on real phones.** If wrong: Phase 1 is not Done.
9. **Phase 1's "lands on its url" checks still pass on v2's /r redirect** (ticket 16). If wrong: one Phase 1 spec edit.
10. **The adversary draft calls were informed, not blind** (plan-review `## Blindness caveat`): the review worktree's .git let codex read sibling specs. If this matters: re-run reviews from a worktree with an isolated object store.
