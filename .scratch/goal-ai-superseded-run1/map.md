# goal-ai — map

Run id: 20261002T121608Z. Design-only run (no `--execute`). Invocation: `/spec-auto goal_ai.txt --tickets 40`.

## Destination

The plan at [goal_ai.txt](../../goal_ai.txt): ofl.ink moves from Netlify + GitHub-as-DB + n8n to a Hostinger VPS (Caddy + Node app + PocketBase), after a security cleanup of v1 (secrets.json no longer public). Each Link gets one Mode (direct | escape_ig | deeplink), images become WebP via sharp, traffic is tracked per link/day/country, creators get login/register/editor, and ofl.ink cuts over with custom and spare domains.

## Notes

- Plan: [goal_ai.txt](../../goal_ai.txt)
- Glossary: [CONTEXT.md](../../CONTEXT.md)
- ADRs: [0001-v2-on-own-vps-beside-live-v1.md](../../docs/adr/0001-v2-on-own-vps-beside-live-v1.md), [0002-pocketbase-holds-data-auth-and-files.md](../../docs/adr/0002-pocketbase-holds-data-auth-and-files.md), [0003-one-mode-per-link.md](../../docs/adr/0003-one-mode-per-link.md), [0004-no-destination-in-any-public-file.md](../../docs/adr/0004-no-destination-in-any-public-file.md)
- Specs: [phase-00](../../docs/spec/phase-00-security-cleanup.md), [phase-01](../../docs/spec/phase-01-link-modes-and-escape.md), [phase-02](../../docs/spec/phase-02-vps-foundation.md), [phase-03](../../docs/spec/phase-03-auth-and-editor.md), [phase-04](../../docs/spec/phase-04-stats.md), [phase-05](../../docs/spec/phase-05-cutover-and-domains.md)
- Plan review: [plan-review.md](../../docs/spec/plan-review.md)

## Tickets

| NN | Ticket | Spec | Blocked by | Status |
|---|---|---|---|---|
| 01 | [The dev server stand-in follows netlify.toml, and the smoke spec reads the Adult Link's id from the served Profile](issues/01-dev-server-follows-netlify-toml.md) | 00 | — | ready-for-agent |
| 02 | [weiwei and jaka7q open as real Profiles](issues/02-weiwei-and-jaka7q-open.md) | 00 | — | ready-for-agent |
| 03 | [Only the site folder is published: `/netlify/` answers 404 and every Visitor address still works](issues/03-publish-only-the-site-folder.md) | 00 | 01, 02 | ready-for-agent |
| 04 | [Every Link gets its own random 12-digit Link Id that the n8n Form keeps, and old ids stop revealing](issues/04-random-link-ids-that-n8n-keeps.md) | 00 | 01, 03 | ready-for-agent |
| 05 | [No Adult Link carries its Destination in a public file](issues/05-adult-destinations-leave-public-files.md) | 00 | 04 | ready-for-agent |
| 06 | [Go-live runbook: the Operator's handoff for n8n, GitHub and the live site](issues/06-go-live-runbook-handoff.md) | 00 | 01, 02, 03, 04, 05 | parked — needs-human |
| 07 | [The Fixture Profile and a Mode-less fixture open locally, and In-App Browser detection lives in the page script](issues/07-fixture-profiles-and-detection-in-script.md) | 01 | 01, 03 | ready-for-agent |
| 08 | [A Link Shortcut opens its Link with the Tracking Code it arrived with, and In-App Browsers keep the code in the address bar](issues/08-link-shortcut-keeps-tracking-code.md) | 01 | 07 | ready-for-agent |
| 09 | [The Profile's default Mode decides whether the Escape Overlay shows on open, in every In-App Browser the plan names](issues/09-profile-default-mode-decides-overlay.md) | 01 | 04, 07 | ready-for-agent |
| 10 | [Each Link can carry its own Mode, and Direct Mode Links open in place](issues/10-link-mode-and-direct-mode.md) | 01 | 09 | ready-for-agent |
| 11 | [An Escape Mode tap fires the Escape from the Visitor's own tap, carrying the Tracking Code and a Link Shortcut](issues/11-escape-fires-from-the-tap.md) | 01 | 08, 10 | ready-for-agent |
| 12 | [The Escape Overlay offers every way out: "Open in browser", "Try another way" and "Copy link"](issues/12-escape-overlay-ways-out.md) | 01 | 11 | ready-for-agent |
| 13 | [On Android the Escape opens Chrome, and falls back to the plain web address when Chrome is missing](issues/13-android-escape-with-fallback.md) | 01 | 12 | ready-for-agent |
| 14 | [Deeplink Mode hands the Destination's https link to the phone, so its app opens when installed](issues/14-deeplink-mode.md) | 01 | 10 | ready-for-agent |
| 15 | [Non-Adult Destinations leave v1's public files, if the Operator rules that ADR 0004 covers them](issues/15-non-adult-destinations-leave-public-files.md) | 01 | 05, 08, 10 | parked — needs-human |
| 16 | [Phase 1 real-device runbook: the Operator's handoff for the n8n import, the deploy preview and real phones](issues/16-real-device-runbook-handoff.md) | 01 | 06, 07, 08, 09, 10, 11, 12, 13, 14 | parked — needs-human |
| 17 | [The v2 stack starts with one `docker compose up` and serves v1's published files, beside the dev server stand-in](issues/17-v2-stack-starts-and-serves-v1-files.md) | 02 | 03 | parked — needs-human |
| 18 | [Every PocketBase collection comes from versioned migrations and answers no one but a superuser](issues/18-collections-closed-to-all-but-superuser.md) | 02 | 17 | ready-for-agent |
| 19 | [Every v1 Profile opens on v2 from PocketBase, seeded by the v1 Import, with no Destination in its page or data](issues/19-every-v1-profile-opens-on-v2.md) | 02 | 02, 04, 07, 10, 17, 18 | ready-for-agent |
| 20 | [A Click on v2 ends at the same Destination as on v1, through `/r` or Reveal, with v1's Tracking Codes and Geo Rules](issues/20-clicks-reach-v1-destinations-on-v2.md) | 02 | 05, 08, 19 | ready-for-agent |
| 21 | [Reveal answers only its own origin, and Reveal and `/r` slow down a harvester](issues/21-reveal-guard.md) | 02 | 20 | ready-for-agent |
| 22 | [An edit made through PocketBase shows on the next page load](issues/22-pocketbase-edit-shows-on-next-load.md) | 02 | 18, 19 | ready-for-agent |
| 23 | [An avatar uploaded through the app is stored as WebP, and only a caller PocketBase allows can replace it](issues/23-avatar-upload-as-webp-for-allowed-callers.md) | 02 | 19 | ready-for-agent |
| 24 | [Every phone photo format arrives upright, shrunk to its target and stripped of metadata](issues/24-every-photo-format-upright-and-stripped.md) | 02 | 17, 23 | ready-for-agent |
| 25 | [The v1 Import refuses a broken v1 tree, names each bad file and writes nothing](issues/25-v1-import-refuses-broken-tree.md) | 02 | 19 | ready-for-agent |
| 26 | [The v1 Import warns about what v1 already shows broken, and a re-run adds no duplicates and names what v1 dropped](issues/26-v1-import-warns-and-reruns.md) | 02 | 20, 25 | ready-for-agent |
| 27 | [Phase 0's specs pass against v2](issues/27-phase-0-specs-on-v2.md) | 02 | 05, 06, 19, 20 | ready-for-agent |
| 28 | [Phase 1's spec passes against v2 on the seeded Fixture Profile](issues/28-phase-1-spec-on-v2.md) | 02 | 13, 14, 19, 20 | ready-for-agent |
| 29 | [`./check.sh` runs only against v2 at localhost:4173, the dev server stand-in is gone, and the parity spec can be pointed at the VPS](issues/29-check-runs-only-against-v2.md) | 02 | 21, 22, 24, 26, 27, 28 | ready-for-agent |
| 30 | [The VPS's ports 80 and 443 reach v2's Caddy the way the Operator chose](issues/30-vps-ports-reach-caddy.md) | 02 | 17 | parked — needs-human |
| 31 | [Phase 2 VPS runbook: the Operator's handoff for the VPS, its DNS and the admin tunnel](issues/31-vps-runbook-handoff.md) | 02 | 06, 29, 30 | parked — needs-human |
| 32 | [The Editor's address and the Creator's PocketBase paths answer on the Profile origin, and no other part of PocketBase does](issues/32-editor-address-and-creator-api-on-profile-origin.md) | 03 | 18, 19, 23, 29 | ready-for-agent |
| 33 | [A Creator who holds a Profile logs in at `/edit`, sees it in the Editor and logs out, and no one else can read its Destinations](issues/33-creator-logs-in-to-their-profile.md) | 03 | 18, 19, 32 | ready-for-agent |
| 34 | [An invited Creator signs up on one screen, claims a Username and waits on "verify your email"](issues/34-invited-sign-up-claims-username.md) | 03 | 18, 19, 33 | ready-for-agent |
| 35 | [A verified Creator finishes Onboarding with a display name and a first Link, and their Profile is live](issues/35-verified-creator-finishes-onboarding.md) | 03 | 20, 22, 34 | ready-for-agent |
| 36 | [In the Editor a Creator adds, edits, reorders and deletes their Links, and no one else can](issues/36-editor-adds-edits-reorders-deletes-links.md) | 03 | 35 | ready-for-agent |
| 37 | [A Link's Mode and 18+ toggle, set in the Editor, act on the public Profile as an imported Link's do](issues/37-link-mode-and-adult-toggle.md) | 03 | 20, 28, 36 | ready-for-agent |
| 38 | [Avatars, Link backgrounds and stock icons go in as any common image and come out as webp, for their owner only](issues/38-images-in-any-format-come-out-webp.md) | 03 | 23, 24, 35, 36 | ready-for-agent |
| 39 | [The Editor changes the display name, bio, avatar and default Mode, and an expired session never looks like a broken save](issues/39-profile-panel-and-default-mode.md) | 03 | 36, 37, 38 | ready-for-agent |
| 40 | [The Link form keeps OnlyFans tracking and takes a Geo Rule as raw JSON, and the plan's DONE journey runs end to end](issues/40-tracking-codes-and-geo-rule-in-link-form.md) | 03 | 20, 37, 38, 39 | ready-for-agent |
| 41 | ["Forgot password", and the screens that the verification and reset emails open](issues/41-forgot-password-and-email-link-screens.md) | 03 | 33, 34 | ready-for-agent |
| 42 | [Anyone can sign up without an invite, if the Operator answers D9 "public"](issues/42-public-sign-up-if-d9-public.md) | 03 | 34 | parked — needs-human |
| 43 | [Phase 3 runbook: the Operator's handoff for mail, real phones, the n8n Form and handing over imported Profiles](issues/43-phase-3-runbook-handoff.md) | 03 | 31, 40, 41, 63 | parked — needs-human |
| 44 | [v2 serves its own copy of the public page script, ahead of v1's directory, and nothing a Visitor sees changes](issues/44-v2-serves-its-own-page-script.md) | 04 | 28, 29 | ready-for-agent |
| 45 | [A Profile load counts as one Page View, and its Creator sees it by day and by country on the Stats page](issues/45-page-view-reaches-stats.md) | 04 | 18, 19, 20, 32, 33, 34, 44 | ready-for-agent |
| 46 | [A Click through `/r` counts, and Stats shows Clicks and CTR on its cards, per day, per Link and per country](issues/46-r-click-reaches-stats.md) | 04 | 20, 45 | ready-for-agent |
| 47 | [Passing the Age Gate and opening a Link Shortcut each count as one Click through Reveal, and unknown Link Ids count nothing](issues/47-reveal-clicks-count.md) | 04 | 20, 21, 46 | ready-for-agent |
| 48 | [Today, 7D and 30D tabs and the Link and country filters narrow every Stats panel, and an empty range says so](issues/48-ranges-and-filters.md) | 04 | 46, 47 | ready-for-agent |
| 49 | [Each Event names the In-App Browser it came from, and stores nothing that identifies the Visitor](issues/49-in-app-browser-and-nothing-else-stored.md) | 04 | 18, 45 | ready-for-agent |
| 50 | [A Creator reads only their own Profile's Stats, and nobody outside the Operator reads a raw Event](issues/50-owner-only-stats.md) | 04 | 32, 33, 45, 46 | ready-for-agent |
| 51 | [A Tracking Code stays with the Profile it arrived on, and OnlyFans still gets `/c{code}` there](issues/51-tracking-code-stays-with-its-profile.md) | 04 | 19, 20, 44, 47 | ready-for-agent |
| 52 | [A deleted Link keeps its Clicks as "Deleted link", and a deleted Profile takes its Events with it](issues/52-deleted-link-and-profile.md) | 04 | 35, 36, 45, 46, 48 | ready-for-agent |
| 53 | [A failed or slow Event write never breaks or stalls a Visitor's Click](issues/53-failed-event-write-never-blocks-click.md) | 04 | 45, 46, 47 | ready-for-agent |
| 54 | [The Page View ping is rate-limited per address and Profile, apart from Reveal's budget](issues/54-page-view-ping-rate-limited.md) | 04 | 21, 45, 50 | ready-for-agent |
| 55 | [Phase 4 runbook: the Operator's handoff for the Stats look, a real phone and the production country source](issues/55-phase-4-runbook-handoff.md) | 04 | 31, 51, 52, 53, 54, 63 | parked — needs-human |
| 56 | [v2's page learns which Profile it shows from the app, builds every address from its own origin, and nothing a Visitor sees changes](issues/56-page-learns-its-profile-from-the-app.md) | 05 | 19, 28, 29, 44, 45, 51 | ready-for-agent |
| 57 | [The Operator gives a Profile a Custom Domain in PocketBase, and the domain shows that Profile at its root, with Tracking Codes and Link Shortcuts](issues/57-custom-domain-shows-its-profile.md) | 05 | 17, 18, 19, 32, 45, 56 | ready-for-agent |
| 58 | [On a Custom Domain every tap behaves as on ofl.ink: Reveal keeps the page's Tracking Code, the Escape stays on the domain, and other origins are refused](issues/58-every-tap-on-a-custom-domain.md) | 05 | 20, 21, 28, 57 | ready-for-agent |
| 59 | [Only the Operator sets a Custom Domain; a change shows on the next load, one domain fits one Profile, and no public answer names it](issues/59-only-the-operator-sets-a-custom-domain.md) | 05 | 19, 32, 34, 35, 57 | ready-for-agent |
| 60 | [Caddy asks the app before it issues any certificate, so only ofl.ink's own hosts, Spare Domains and Custom Domains get HTTPS, and the Cutover needs no change in Caddy](issues/60-certificates-only-for-known-hosts.md) | 05 | 17, 29, 30, 34, 57, 59 | ready-for-agent |
| 61 | [Every Spare Domain listed in PocketBase serves every Profile at ofl.ink's paths, ahead of any Custom Domain, and the list stays private](issues/61-spare-domains-serve-every-profile.md) | 05 | 18, 32, 58, 59, 60 | ready-for-agent |
| 62 | [Behind Cloudflare only Cloudflare decides a Visitor's country and address, and a Visitor who reaches a Custom Domain directly cannot choose them](issues/62-only-cloudflare-sets-country.md) | 05 | 20, 21, 45, 54, 60 | ready-for-agent |
| 63 | [Cutover runbook: the Operator's handoff for moving ofl.ink to v2, checking it, rolling back and turning Netlify off](issues/63-cutover-runbook-handoff.md) | 05 | 06, 16, 30, 31, 61, 62 | parked — needs-human |
| 64 | [Domains and backups runbook: the Operator's handoff for the first Spare Domain, PocketBase backups, the first Custom Domain and the day ofl.ink is Flagged](issues/64-domains-and-backups-runbook-handoff.md) | 05 | 30, 31, 58, 60, 61, 63 | parked — needs-human |

64 tickets: 53 ready-for-agent, 11 parked — needs-human. Ticket budget for this invocation: 40 (unused; design-only).

## Decisions so far

ADRs:
- 0001 v2 runs on our own VPS in Docker Compose, beside a live v1 (D1)
- 0002 PocketBase holds v2's data, logins and files; collection rules enforce ownership (D2)
- 0003 One three-way Mode per Link, not two checkboxes (D3)
- 0004 No Destination in any public file; Reveal by script is obfuscation, not protection (D8 + Phase 0)

Per spec (gist):
- 00: v1 deploys only its site folder (secrets path 404); Adult Destinations leave public files; corrupted profiles repaired; random 12-digit Link Ids the n8n Form keeps; purge + repo-private are a human runbook.
- 01: per-Link Mode overriding a Profile default (default Escape); overlay only in Escape Mode; escape fires from the tap (x-safari + instagram://extbrowser on iOS, intent:// with fallback on Android); broader in-app detection; Tracking Code survives escape; one Playwright spec with fake UAs.
- 02: compose at repo root (caddy, app on Hono, pocketbase pinned release); app answers v1's own paths so v1 script is reused; collections users/profiles/links/events, all superuser-only until Phase 3; re-runnable v1 Import (v1 wins); sharp WebP upload with caller's token; Reveal rate-limited + same-origin; dev-server stand-in retired after migration.
- 03: D9 taken as invite-only (flagged); allow-listed PocketBase proxy on the Profile origin; verified email required for content writes; onboarding + editor styled on link.me edit page; one spec file.
- 04: v2 gets its own copy of the page script; events written by /r, Reveal and a page-view ping; dailyStats as a PocketBase view (UTC days); owner-only; Cloudflare header is the production country source.
- 05: Cutover is a DNS change behind Cloudflare; Caddy on-demand TLS gated by an app ask endpoint; Custom Domain (Operator-set) and Spare Domains resolved from Host; backups owned here; runbooks for cutover and domains.

## Not yet specified

- D7 proxies: scope undefined by the plan; if it means domain rotation, Phase 5 covers it.
- Bonus items: geo-rules UI, ffmpeg for video, Umami.
- Phase 2 names no step-2 screenshot (its public page is v1's unchanged).
- Plan §7's "one spec per ticket" is read as one spec file per Phase, extended per ticket (flagged in tickets 07 and 17).

## Out of scope

See [plan-review.md § Cut (YAGNI)](../../docs/spec/plan-review.md) — 61 items deduplicated across specs, each with its reason.

## Needs the human

- **D11b (Phase 2, tickets 30/31/63):** what holds ports 80/443 on the VPS. Run `ssh <vps> 'docker ps --format "{{.Names}}\t{{.Ports}}"; sudo ss -ltnp "( sport = :80 or sport = :443 )"'`; if something listens, choose "Caddy fronts both" or "existing proxy fronts v2".
- **D9 (Phase 3, ticket 42):** public sign-up or invite-only. Written answer.
- **D1 (Phase 1, ticket 15):** do v1's non-Adult `url`s stay public before Cutover, and what happens to the 6 non-Adult Links carrying an Adult Destination.
- **B24b (Phase 5, ticket 64):** whether a Spare Domain recovers traffic once ofl.ink is Flagged; only a real Flag settles it.
- **Network fetches (ticket 17):** docker pulls, `pnpm --dir app add hono @hono/node-server sharp`, compose build; see the ticket for exact commands.
- **Runbooks (tickets 06, 16, 31, 43, 55, 63, 64):** every live-system step (n8n import, repo private + history purge, Netlify, VPS deploy, SMTP, DNS, Cloudflare, buying a Spare Domain, real phones).

## Assumptions to veto

Sharpest first; full list of 25 (of ~180) in [plan-review.md § Open questions](../../docs/spec/plan-review.md).

1. v2's Caddy can take 80/443 on the VPS. *Falls:* Phase 2 deploy and all of Phase 5 (on-demand TLS) if a proxy already holds 443 without SNI passthrough.
2. Only Adult Links lose their Destination from v1's public files; non-Adult keep a public url. *Falls:* ADR 0004's promise for v1; ticket 15's scope flips.
3. Cloudflare's proxy supplies Visitor country in production. *Falls:* Geo Rule Tracking Codes and Stats countries default to US/XX; Phase 5's zone move is unnecessary.
4. D9 = invite-only. *Falls:* Phase 3 regains content rules, abuse reporting, captcha; Phase 5's Operator-only Custom Domains may need self-serve.
5. The v1 Import is re-run until Cutover, v1 wins. *Falls:* Editor edits by imported Creators before Cutover would be overwritten; the hand-over timing in ticket 43 changes.
6. Serving v1's `public/` folder as v2's page until Phase 4 forks it. *Falls:* any v2-only page change before Phase 4 breaks parity tests or leaks into v1.
7. Deeplink Mode on v2 goes through Reveal (empty public url). *Falls:* if OSes do hand a 302 from /r to the app, the simpler path would do.
8. PocketBase without SMTP answers verify/reset requests with success. *Falls:* local stack needs a mail catcher (`docker pull axllent/mailpit`), parking tickets 34 and 41.
9. Case-twin Profile files (Jaka/jaka etc.) are skipped on import and looked up lower-cased. *Falls:* the capitalised addresses die at Cutover if the Operator wants them kept distinct.
10. The pinned PocketBase has built-in scheduled backups. *Falls:* v2 goes live without backups; a cron copy replaces them.
