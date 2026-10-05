# RUN: goal-ai, execute run (run id 20261004T191309Z)

## Status

**PARTIAL.** Stop condition: the ticket budget. `--tickets 24` allowed 24 tickets, and 24 landed: 01–10, 12–22, 25, 26 and 27.

Last reviewer verdict: `Verdict: APPROVE`, round 2 of "A Creator changes their Profile in the Editor and its default Mode reaches the page".

Full-suite command: `./check.sh`, which runs `npx playwright test`. The real last lines of the coordinator's cold run after that ticket, exit 0:

```
  1 skipped
  311 passed (3.5m)
```

The one skip is the HEIC case, a `test.fixme` in tests/e2e/02-image-upload.spec.ts (see Parked).

The run started 2026-10-04 and finished 2026-10-05. It resumed at step 5. Steps 0–4 were committed at 4e9e361 by design run 2.

Tally of the map's 44 tickets: 25 done (24 landed by this loop, plus one done by the Operator), 6 parked, 13 not reached.

**Not reached.** All are `ready-for-agent`; the budget ran out first.

| NN | Ticket | Phase | Blocked by |
|---|---|---|---|
| 28 | A Creator manages their Links in the Editor and a refused save keeps what they typed | 3 | 26 (done) |
| 29 | Log-in lands a Creator where they left off and a handed-over Profile opens in the Editor | 3 | 26 (done) |
| 30 | Only a Profile's owner and the Operator can read or change it through PocketBase's API | 3 | 26 (done) |
| 31 | Verification and reset emails reach the local mail catcher and their links work | 3 | 27, 28, 29, 30 |
| 33 | A Page View and a Click through /r reach the Creator's Stats page | 4 | 29 |
| 34 | Reveals and Link Shortcuts count as Clicks and Stats read per Link per day per country | 4 | 33 |
| 35 | A Tracking Code stays with the Profile it arrived on | 4 | 33 |
| 36 | Only the owner reads a Profile's Stats and recording never blocks a Click or a deletion | 4 | 34, 35, 31 |
| 37 | Events carry each Visitor's real country from the production country source | 4 | 36, 42 |
| 39 | Custom Domains and Spare Domains listed in PocketBase serve Profiles by host and pass the TLS Ask | 5 | 30 |
| 40 | On a Custom Domain or Spare Domain every Mode and Escape and Reveal works and counts as on ofl.ink | 5 | 39, 36 |
| 41 | Caddy asks the app before every certificate and the Cutover runbook is written | 5 | 40, 29 |
| 42 | Visitor location trusts only the production country source and ofl.ink's DNS is ready for a one-record switch | 5 | 41 |

The next takeable ticket is "A Creator manages their Links in the Editor and a refused save keeps what they typed". The log-in and owner-rules tickets are unblocked too.

### Running it

- Never run `./check.sh` while another Playwright run or the `oflinkv2-e2e` stack is up. tests/stack.sh ends with `docker compose down -v`, so a second run wipes the first one's stack.
- A full cold run takes about 3.6 minutes.
- The projects run in order: chromium, then stack-import, then reveal-guard. `./check.sh tests/e2e/02-v1-import.spec.ts` runs the chromium project first unless you pass `--no-deps`.
- `V1_SNAPSHOT=` points the import and parity specs at a fresh clone of v1. The default is linkme_clone3/.
- `PLAYWRIGHT_BASE_URL` targets a remote stack, and nothing is started locally. Workers drop to 1 by themselves (playwright.config.ts:20). Add `--grep-invert 'Geo Rule'` there.
- No TypeScript typecheck exists. `pnpm add -D typescript` would be a network fetch, and Playwright transpiles the specs.

## Ask

Invocation: `/spec-auto goal_ai.txt --execute --tickets 24`

Plan: /Users/jakabasej/oflinkv2/goal_ai.txt. Sections 0–7 are the original plan. §8 AMENDMENT: v1 is never touched, and v2 is built only in this repo. §9 ANSWERS. §10: the Netlify site stays on indefinitely. §11: Traefik fronts Caddy (TLS passthrough, PROXY protocol), the country source is Cloudflare, and the Operator has run the network commands.

Run id 20261004T191309Z. Effort: goal-ai.

### Design run (run 2, 2026-10-02)

Invocation `/spec-auto goal_ai.txt --tickets 40`, run id 20261002T174527Z, status DONE design-only. It wrote CONTEXT.md, ADRs 0001–0005, six Phase specs (docs/spec/phase-00 to phase-05), docs/spec/plan-review.md, 44 tickets and map.md. Its commits: c52cbe2 specs, 16d5a11 adversary reviews, 7d00646 six-hats reconcile and plan-review, af3f3bc tickets and map. Run 1 (Netlify-first, 64 tickets) is superseded. It is kept at docs/spec-superseded-run1/ and .scratch/goal-ai-superseded-run1/.

## Built

Each ticket below also has a `docs(goal-ai): claim ticket NN` commit just before its feat commit. Other commits since 4e9e361: 2350b5d (plan §11 answers), 2c6b95c (baseline: the app manifest and lockfile from the network gate), dd7aa18 (plan §11 carried into specs and tickets). This file is left in the working tree, uncommitted.

### Phase 0: New-repo ground. Done.

Acceptance: the whole block exited 0 after ticket 04. Its `./check.sh` gave 12 passed.

| NN | Ticket | Commit |
|---|---|---|
| 01 | The test loop serves the Page Copy | ee4dda2 feat(goal-ai): the test loop serves the Page Copy |
| 02 | A Visitor sees the Fixture Profile at /fixture in a hermetic loop | 587d146 feat(goal-ai): a Visitor sees the Fixture Profile at /fixture in a hermetic loop |
| 03 | Test Secrets sit beside the Fixture Profile and are never served | d9af30f feat(goal-ai): Test Secrets sit beside the Fixture Profile and are never served |
| 04 | Age Gate then Reveal on fixture data with no v1 Snapshot in the loop | 2c18368 feat(goal-ai): Age Gate then Reveal on fixture data with no v1 Snapshot in the loop |

### Phase 1: Link Modes and Escape. Local lines pass; not Done.

Acceptance: the automated lines exited 0 after ticket 10 (65 passed). The Phase is not Done, because its gate, the real-device matrix, is parked.

| NN | Ticket | Commit |
|---|---|---|
| 05 | Each Link travels by its own Mode in a System Browser | f668e4b feat(goal-ai): each Link travels by its own Mode in a System Browser |
| 06 | The Escape Overlay opens with the page only on an Escape-default Profile in every In-App Browser | 0205eee feat(goal-ai): the Escape Overlay opens with the page only on an Escape-default Profile in every In-App Browser |
| 07 | An Escape Mode tap in iOS Instagram escapes to Safari from the tap itself | 4c4dc79 feat(goal-ai): an Escape Mode tap in iOS Instagram escapes to Safari from the tap itself |
| 08 | An Adult Escape Mode Link passes the Age Gate then escapes with no Reveal in the app | 50c3d58 feat(goal-ai): an Adult Escape Mode Link passes the Age Gate then escapes with no Reveal in the app |
| 09 | On Android an Escape opens Chrome or its fallback and a Deeplink Link hands off to its app | 9056b82 feat(goal-ai): on Android an Escape opens Chrome or its fallback and a Deeplink Link hands off to its app |
| 10 | The escaped Link opens by itself in the System Browser credited to the same Tracking Code | 3d89092 feat(goal-ai): the escaped Link opens by itself in the System Browser credited to the same Tracking Code |

### Phase 2: VPS foundation. Local block passes; not Done.

Acceptance: the local block, minus its `# manual:` lines, exited 0 under `set -e` on 2026-10-05 after ticket 22 (297 passed, 1 skipped). The result is recorded in that ticket. The Phase is not Done, because the VPS deploy is parked.

| NN | Ticket | Commit |
|---|---|---|
| 12 | The v2 stack is declared and its Compose contract checks pass offline | ef32657 feat(goal-ai): the v2 stack is declared and its Compose contract checks pass offline |
| 13 | The Operator's network commands fetch the stack's packages and images | **Operator-done** 2026-10-04 (the network commands). 11d20c8 feat(goal-ai): the test stack builds offline from the local images and vendor/. That commit records the offline-build observation in the ticket and map only, with no code. |
| 14 | The v1 Import repairs or refuses every v1 file before it writes anything | cee1f99 feat(goal-ai): the v1 Import repairs or refuses every v1 file before it writes anything |
| 15 | The v1 Import writes the Fixture Profile into PocketBase on a running test stack | 5ea76bd feat(goal-ai): the v1 Import writes the Fixture Profile into PocketBase on a running test stack |
| 16 | The Fixture Profile is served by v2's stack and every Phase 0 and Phase 1 spec passes on it | ca4bdd5 feat(goal-ai): the Fixture Profile is served by v2's stack and every Phase 0 and Phase 1 spec passes on it |
| 17 | Every v1 Profile page on v2 matches the v1 Snapshot card for card | 1c1640f feat(goal-ai): every v1 Profile page on v2 matches the v1 Snapshot card for card |
| 18 | Every Click on a v1 Link ends at v1's Destination for the same Tracking Code and Visitor location | 41344c8 feat(goal-ai): every Click on a v1 Link ends at v1's Destination for the same Tracking Code and Visitor location |
| 19 | Re-running the v1 Import keeps every Link Id and refuses a broken v1 tree without writing | 3c7ca9d feat(goal-ai): re-running the v1 Import keeps every Link Id and refuses a broken v1 tree without writing |
| 20 | A PocketBase admin edit shows on the next page load while PocketBase's API stays closed | b71df53 feat(goal-ai): a PocketBase admin edit shows on the next page load while PocketBase's API stays closed |
| 21 | A photo uploaded in any D4 format is stored upright and resized as WebP | 2162470 feat(goal-ai): a photo uploaded in any D4 format is stored upright and resized as WebP (HEIC parked on heic-convert) |
| 22 | Reveal and /r answer only v2's own origin within a per-client limit | ee8c754 feat(goal-ai): Reveal and /r answer only v2's own origin within a per-client limit; Phase 2 local Acceptance exits 0 |

### Phase 3: Auth and Editor. In progress; Acceptance not run.

Four of nine tickets are done. Four are ready and not reached. The VPS sign-up is parked.

| NN | Ticket | Commit |
|---|---|---|
| 24 | The Operator pulls the local mail catcher's image | **Operator-done** 2026-10-04 (`docker pull axllent/mailpit`). No commit. |
| 25 | Anyone with the sign-up link creates an account and claims a Username | 63cb37a feat(goal-ai): anyone with the sign-up link creates an account and claims a Username |
| 26 | A verified Creator goes through Onboarding to a live Profile whose Links act like imported ones | f7f88a0 feat(goal-ai): a verified Creator goes through Onboarding to a live Profile whose Links act like imported ones |
| 27 | A Creator changes their Profile in the Editor and its default Mode reaches the page | 113e6d3 feat(goal-ai): a Creator changes their Profile in the Editor and its default Mode reaches the page |

### Phases 4 and 5: Stats, Cutover and domains. Not reached; no Acceptance run.

## Parked

No stash was made, because no ticket failed round 3. The five VPS steps are the Operator's: run the commands quoted in each ticket. Nothing was deployed from this session.

| NN | Ticket | Why | Stash | Blocks |
|---|---|---|---|---|
| 11 | The real-device matrix passes for every Mode on v2's first public https deploy | VPS step: it needs v2's public https host and real phones | none | nothing; it is Phase 1's Done gate |
| 23 | v2 serves every v1 Profile identically on its public https host on the VPS | VPS step: the Operator deploys behind Traefik | none | 11, 32, 43, and Phase 2's Done |
| 32 | Sign-up runs on the VPS with the Operator's mail and nightly backups | VPS step; also the SMTP credential, a real inbox, real phones | none | 38, 43 |
| 38 | A phone inside Instagram is recorded as Instagram on v2's VPS host | VPS step; also a real phone | none | 43 |
| 43 | The Operator switches ofl.ink to v2 by one DNS change while v1 stays live | VPS step; also DNS, Cloudflare, purchases, real phones | none | 44 |
| 44 | Bio links move to a warmed Spare Domain the day ofl.ink is Flagged | needs-human: whether a Spare Domain survives a Meta Flag | none | nothing |
| 21, HEIC sub-item | the HEIC case of "A photo uploaded in any D4 format is stored upright and resized as WebP" | network: sharp 0.35.5's prebuilt libvips has no HEVC decoder ("Support for this compression format has not been built in: HEVC") | none | the iPhone HEIC step of the VPS sign-up ticket; the rest of ticket 21 is done |

## Assumptions to veto

Sharpest first. Each was checked against its ticket file or the code that ticket wrote. The 199 design flags are in docs/spec/plan-review.md `## Open questions`.

1. **The Reveal and `/r` limit keys on the last `X-Forwarded-For` entry** ("Reveal and /r answer only v2's own origin within a per-client limit"; app/src/click-guard.js:30). Locally Caddy trusts no proxy and replaces any client-set header, so the last entry equals the first. The rule is proven only by inspection, from a temporary entry-count log. The Caddyfile has no `trusted_proxies` and no PROXY-protocol listener (observed: it is one `reverse_proxy app:3000` site). Once a proxy sits in front of Caddy, the entry Caddy writes is that proxy's address, unless Caddy's PROXY-protocol listener (Traefik) or the Phase 5 "Cloudflare lines" (`trusted_proxies_strict` plus `header_up X-Forwarded-For {client_ip}`) are in place. Falls: every Visitor shares one window. At the production default of 60 per minute (compose.yaml:38), everyone gets false 429s, and Adult and Deeplink Links give nothing.
2. **Traefik fronts Caddy by TCP passthrough with PROXY protocol** (plan §11's ASSUMPTION; "v2 serves every v1 Profile identically on its public https host on the VPS"). That ticket also assumes Traefik reaches Caddy on the free `HTTP_PORT`/`HTTPS_PORT` and can send PROXY protocol. Neither was observed. The ticket says "Nothing new in code", but Caddy's HTTPS listener must accept PROXY protocol from Traefik only, and no committed file does that yet. Falls: the VPS deploy stalls, n8n breaks under SNI passthrough, or the limit collapses as in item 1. Also, if Traefik sends the header to a Caddy that does not expect it, https fails (inferred, not observed).
3. **Staleness is global** ("Re-running the v1 Import keeps every Link Id and refuses a broken v1 tree without writing"; app/bin/import-v1:318). A run over part of the input (`--site` with a subset) names every other v1-imported Profile on a `stale in v2:` line. Falls: the VPS deploy tells the Operator to delete every record a `stale in v2:` line names. A partial run followed by that step deletes live Profiles.
4. **The gateway confirms an empty profiles or links list per token** ("Anyone with the sign-up link creates an account and claims a Username"; "A verified Creator goes through Onboarding to a live Profile whose Links act like imported ones"; app/src/gateway.js:16). Opening the read rules turned a stale superuser token's 403 into a guest's empty 200. So the gateway refreshes through `_superusers/auth-refresh`, or lists again, before it answers 404. Cost: one extra PocketBase call for each unknown Username or Link Id, and for each Profile with no Link, with no time bound. Profile loads are outside the Reveal limit, which covers Reveal and `/r` only. Falls: a scan of unknown Usernames costs PocketBase two calls each, with no limit.
5. **The users `authRule` is `""`: any account signs in, verified or not** (pocketbase/pb_migrations/1791140000_users_closed.js:6 from "The v1 Import writes the Fixture Profile into PocketBase on a running test stack"; 1791140004_sign_up_and_claim.js:31 from the sign-up ticket). Observed on PocketBase 0.40.4: an unverified account signs in (200), so the claim stays at sign-up. Falls: an unverified address can claim a Username before it verifies, so Usernames can be squatted. This is by design. The content rules from the Onboarding ticket still block every other write until the account is verified.
6. **`Origin: null` or a malformed `Origin` counts as another origin and gets 403** ("Reveal and /r answer only v2's own origin within a per-client limit"; app/src/click-guard.js:62). Falls: if a real In-App Browser sends `Origin: null` on the page's own Reveal, its Visitors get nothing from Adult and Deeplink Links. Only the real-device matrix can show it.
7. **Deleting a Link keeps its Events with an empty link** (events.link `cascadeDelete: false`; pocketbase/pb_migrations/1791140003_events.js:4; "A PocketBase admin edit shows on the next page load while PocketBase's API stays closed"). Falls: if Phase 4 wants a deleted Link's Events gone, it needs a migration, and Stats must handle Events with no link until then.
8. **Two Phase 0/1 spec edits, and the recorder reading** ("The Fixture Profile is served by v2's stack and every Phase 0 and Phase 1 spec passes on it"; commit ca4bdd5). The smoke spec keys Test Secrets by the fixture card's title. Three Deeplink variants carry the `/r` url v2 serves. Phase 1's "lands on its url" checks read the navigation recorder, which records `/r/{Link Id}`, not where the redirect ends. Falls: Phase 1's specs no longer prove the final landing on v2. The parity spec of "Every Click on a v1 Link ends at v1's Destination…" covers `/r` instead.
9. **HEIC is parked on heic-convert** ("A photo uploaded in any D4 format is stored upright and resized as WebP"). Falls: until the human runs the command, an iPhone camera photo gets 415, and the iPhone step of the VPS sign-up fails.
10. **The reserved Usernames are a fixed list in the migration, checked over HTTP, not generated at build** ("Anyone with the sign-up link creates an account and claims a Username"). The spec claims every name `node app/bin/reserved-usernames` prints and expects a refusal. Falls: a new top-level route needs a matching clause in a migration. The claim loop in `./check.sh` fails until it has one. Overturned if the list must be generated by `docker compose build`.
11. **"Change Profile Picture" saves with "Save profile", not when a file is picked** ("A Creator changes their Profile in the Editor and its default Mode reaches the page"). Since fix round 1 this is a rung-2 decision, from the spec's "Each form saves on its own Save button, with no autosave". The Template uploads on pick. Falls: one Editor change, if the Operator wants the Template's behaviour.

## Needs the human

1. **Before the VPS deploy: how the client address reaches Caddy.** Traefik must send PROXY protocol, and Caddy's HTTPS listener must accept it from Traefik only. The Caddyfile does neither today, and the deploy ticket says "Nothing new in code". Decide who adds Caddy's listener: a VPS-only Caddy setting, or a ticket before the deploy. Also confirm the Phase 5 Cloudflare lines land with "Visitor location trusts only the production country source and ofl.ink's DNS is ready for a one-record switch" before ofl.ink is Proxied. The deploy ticket's check: two separate clients each reach their own 429.
2. **The VPS deploy** ("v2 serves every v1 Profile identically on its public https host on the VPS"). These are the Phase 2 spec's `# manual:` lines (docs/spec/phase-02-vps-foundation.md:602–610), quoted:
   ```sh
   rsync -a --exclude /node_modules --exclude .scratch ./ root@srv1395798.hstgr.cloud:/opt/oflinkv2/
   cd /opt/oflinkv2 && docker compose up -d --build --wait                          # on the VPS
   docker compose run --rm -v "$PWD/linkme_clone3:/v1:ro" app import-v1 --site /v1   # on the VPS; exit 0
   curl -sI http://<v2 host>/ | grep -i '^location: https://'                         # from the Mac
   PLAYWRIGHT_BASE_URL=https://<v2 host> npx playwright test tests/e2e/02-profile-parity.spec.ts   # from the Mac
   ssh -L 8090:127.0.0.1:8090 root@srv1395798.hstgr.cloud   # edit a display name at http://localhost:8090/_/; reload https://<v2 host>/<username>
   ```
   Around them, the Operator also writes the VPS `.env` (`SITE_ADDRESS`, the superuser email and password, `HTTP_PORT`/`HTTPS_PORT` on free ports) and points the v2 host's A record at the VPS. In Traefik's file-editable dynamic config, the Operator adds a TCP router ``HostSNI(`*`)`` with TLS passthrough and the PROXY protocol header, below n8n's own rule, plus an HTTP router on 80 for every host that is not n8n's. Then the Operator deletes every record a `stale in v2:` line names (see assumption 3).
3. **The real-device matrix** ("The real-device matrix passes for every Mode on v2's first public https deploy"). Run it once the VPS deploy is up. It needs no command: create the throwaway Profile, open `/{username}/{code}` in every cell, and fill the rows in /Users/jakabasej/oflinkv2/RUN.md under `## Phase 1 real-device matrix`.
4. **The VPS sign-up** ("Sign-up runs on the VPS with the Operator's mail and nightly backups"). Use the same VPS lines as item 2. Then in the admin UI, set Settings, Application URL to the public origin and Settings, Mail to the Operator's SMTP sender (never committed). Turn on Backups with cron `0 3 * * *` and keep 7. Run the real-inbox verify and reset, then Onboarding on a real iPhone (HEIC) and a real Android phone.
5. **Instagram on the VPS** ("A phone inside Instagram is recorded as Instagram on v2's VPS host"). Use the same VPS lines as item 2. Open a Profile inside Instagram on a phone, read the newest Event in the admin UI, and fill RUN.md's Phase 4 row.
6. **The Cutover** ("The Operator switches ofl.ink to v2 by one DNS change while v1 stays live"). Every command is in the ticket's 14-step checklist. Step 1 begins:
   ```sh
   ssh "$VPS" "sudo ss -ltnp '( sport = :80 or sport = :443 )'"
   rsync -a --exclude /node_modules --exclude .scratch ./ "$VPS:$V2_DIR/" && ssh "$VPS" "cd $V2_DIR && docker compose up -d --build --wait"
   ```
   Step 13, the rollback check, after restoring the DNS-only records:
   ```sh
   curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'
   ```
7. **HEIC** (network; the sub-item parked in "A photo uploaded in any D4 format is stored upright and resized as WebP"):
   ```sh
   pnpm --dir app add heic-convert && docker compose --env-file tests/e2e.env build
   ```
   Then a ticket decodes HEIC with heic-convert ahead of the pipeline and drops the `test.fixme` in tests/e2e/02-image-upload.spec.ts.
8. **Does a Spare Domain survive a Meta Flag?** ("Bio links move to a warmed Spare Domain the day ofl.ink is Flagged"). This is settled only after the first real Flag: open the warmed Spare Domain through the real bio link in Instagram on a phone and follow a Link onward. A Meta warning there means rotation fails.
9. **DNS evidence, kept from the design run.** Plan §11 resolved the country source as Cloudflare. The evidence command was:
   ```sh
   dig +short NS ofl.ink; dig +noall +answer DS ofl.ink
   ```
   It gave Namecheap's `dns1/dns2.registrar-servers.com` and no DS record, so the zone move needs no DNSSEC step. The ports question was settled by `ssh root@srv1395798.hstgr.cloud 'docker ps --format "{{.Names}}\t{{.Image}}\t{{.Ports}}"; ss -ltnp "( sport = :80 or sport = :443 )"'`: Traefik (`n8n-traefik-1`) holds 80/443.
10. **Human-only acts with no question:** buying Spare Domains, the Cloudflare account and the nameserver move, the SMTP credential, real phones, and `git -C linkme_clone3 pull --ff-only` before the final import.

## Agents spawned

Execute run. For each ticket: one `implementer` (opus) to implement, one `reviewer` (opus) per round, and one `implementer` fix per `REQUEST_CHANGES`. No codex adversary ran in the execute loop; reviews used the reviewer persona only.

| Ticket | Implement | Review rounds | Fix rounds | Outcome |
|---|---|---|---|---|
| 01–12, 14–20 | 1 each | rounds not recorded in the ticket | rounds not recorded in the ticket | done, landed (see Built) |
| 13 | rounds not recorded in the ticket | rounds not recorded in the ticket | rounds not recorded in the ticket | done; the network part was the Operator's, and the offline build was observed and recorded |
| 21 | 1 | 2 | 1 | APPROVE in round 2; HEIC sub-item parked |
| 22 | 1 | 2 | 1 | APPROVE in round 2; Phase 2 local Acceptance exit 0 |
| 24 | none | none | none | Operator-done, no agent |
| 25 | 1 | 3 | 2 | APPROVE in round 3 |
| 26 | 1 | 3 | 1 implementer fix, plus a two-line coordinator fix | APPROVE in round 3 |
| 27 | 1 | 2 | 1 (the ticket records "Fix round 1") | APPROVE in round 2 |

Also:
- Coordinator (the main session): claimed and landed each ticket (a Destination-host scrub before every commit), ran the Phase 0, 1 and 2 Acceptance blocks and the cold full-suite runs, and made the two-line fix on ticket 26.
- RUN.md writer ×1 (subagent, opus): wrote this file. Done.

Design run 2 (all `general-purpose`, opus): Spec ×6, Adversary ×6 (codex blind and draft calls, reconciled into each spec's `## Review`), Six hats ×1, Plan review ×1, Tickets ×6 (Phase 2's agent also ran one devils-advocate pass), and the coordinator's graph, cycle and coverage checks. All done.

## Cut (YAGNI)

From the design run (deduplicated in docs/spec/plan-review.md `## Cut (YAGNI)`):
- **Any edit to v1** (the old repo, Netlify config, the n8n workflow, linkme_clone3/): barred by plan §8.
- **Purging secrets.json from the old history, making the old repo private, `publish = "public"`**: the exposure is accepted indefinitely (plan §10, ADR 0005).
- **Rotating or mapping v1 Link Ids**: v2 mints fresh ids, and v1 Shortcuts break by design (ADR 0004).
- **An n8n Mode radio, the n8n prefix-bug fix, "n8n becomes admin-only"**: moot, because the v2 Editor is the only v2 editing surface.
- **ffmpeg, video, animated images; HTTP proxies; a Geo Rule UI; Umami; captcha, abuse reporting, content rules; sign-up rate limits; an invite list**: plan bonus items or not asked for. D9 is public sign-up.
- **Realtime anywhere**: "live instantly" means the next load.
- **A least-privilege PocketBase account, multiple app containers, a shared rate-limit store, re-encoding imported WebP, mirroring v1 deletions**: the smallest thing that meets the plan.
- **Template sections beyond those kept, a copy button for Link Shortcuts, translated overlay copy, per-app artwork, wider in-app detection, an Age Gate on Link Shortcuts, revealing or escaping without a tap**: plan §6 says "nothing more", and §4 says Escapes fire from a tap.

Added by the execute run:
- **heic-convert deferred** until the human runs the network command. The HEIC case stays `test.fixme` ("A photo uploaded in any D4 format is stored upright and resized as WebP").
- **No time bound on the gateway's empty-list check.** A bound would serve a real Profile as missing for that long after a token is invalidated (the sign-up and Onboarding tickets).
- **No client-side message for an empty Destination**, and **the icon is not re-sent on a retry** of a half-saved Link. Both came from the review rounds of the Onboarding ticket; no ticket file records them.
- **No rollback of a half-saved Onboarding step.** A refused avatar or background keeps the form, and a retry updates the same Link ("A verified Creator goes through Onboarding…").
- **No PocketBase pattern for the default Tracking Code.** "Digits only, or empty" is checked in the browser alone. v2's Reveal ignores any other code.
- **No icon-name field.** A stock icon is stored as the Page Copy's own WebP bytes.
- **No Editor control for the verified badge, a Username change, or deleting a Profile or account.** These stay in the Operator's admin UI ("A Creator changes their Profile in the Editor…").
- **None of the link.me Template's files are served.** The Editor's CSS is hand-written after its palette and shapes (the sign-up ticket).
- **No dry-run flag on the v1 Import** ("The v1 Import repairs or refuses every v1 file before it writes anything").
- **A fixed wall-clock-minute window, not a sliding log**, for the Reveal limit. A burst across a minute boundary can reach twice the limit.
- **No TypeScript typecheck**, since adding typescript would be a network fetch.
