# RUN — goal-ai (run 2)

## Status

**DONE (design-only).** Stop condition: step 4 complete without `--execute`, so step 5 (work loop) was not entered; by the skill, the run goes from Tickets straight to Finish. Last reviewer verdict: none (no implementer or reviewer ran; the only reviews are the six codex adversary reviews and the six-hats pass, reconciled in each spec's `## Review` and in `docs/spec/plan-review.md`). Full-suite command: `./check.sh` — not run this run (design-only; the committed baseline harness at HEAD still serves the v1 Snapshot; Phase 0's first ticket rewires it). Ticket budget `--tickets 40` unused.

Run 1 (same invocation, Netlify-first reading of the plan, 64 tickets, Status DONE design-only) is **superseded** by plan amendment §8 (v1 is never touched; v2 is built only in this repo). Its artifacts are kept for reference at `docs/spec-superseded-run1/` and `.scratch/goal-ai-superseded-run1/`.

Amended 2026-10-04 by plan §10: the Netlify site stays on indefinitely; propagated to Phase 5 (and Phases 0, 2 and 4), ADRs 0004/0005 (and 0001), CONTEXT.md, plan-review, tickets 43/44 (and 41, 42), map.

## Ask

Invocation: `/spec-auto goal_ai.txt --tickets 40`
Plan: `/Users/jakabasej/oflinkv2/goal_ai.txt` (sections 0–7 original; §8 AMENDMENT and §9 ANSWERS appended by the user mid-run 1, and binding for run 2).
Run id: 20261002T174527Z. Effort: goal-ai.

## Built

Design-only: nothing was built. Specs and ticket count instead.

| Phase | Spec | Tickets | Ready | Parked |
|---|---|---|---|---|
| 0 New-repo ground | docs/spec/phase-00-new-repo-ground.md | 01–04 | 4 | 0 |
| 1 Link Modes and Escape | docs/spec/phase-01-link-modes-and-escape.md | 05–11 | 6 | 1 |
| 2 VPS foundation | docs/spec/phase-02-vps-foundation.md | 12–23 | 10 | 2 |
| 3 Auth and Editor | docs/spec/phase-03-auth-and-editor.md | 24–32 | 7 | 2 |
| 4 Stats | docs/spec/phase-04-stats.md | 33–38 | 4 | 2 |
| 5 Cutover and domains | docs/spec/phase-05-cutover-and-domains.md | 39–44 | 3 | 3 |
| | **Total** | **44** | **34** | **10** |

Also: CONTEXT.md (glossary, ~40 terms), ADRs 0001–0005, docs/spec/plan-review.md, .scratch/goal-ai/map.md. Acceptance blocks: not run (design-only).

Commits this run: c52cbe2 specs · 16d5a11 adversary reviews · 7d00646 six-hats reconcile, cleanup pass, plan-review · af3f3bc tickets and map · (this file).

## Parked

No ticket was claimed, so no stash. Tickets parked at creation (status in the ticket file):

- 11 The real-device matrix passes for every Mode on v2's first public https deploy — needs-human: ports 80/443. Blocks nothing (Phase 1 Done gate).
- 13 The Operator's network commands fetch the stack's packages and images — network (commands below). Blocks 15 and everything on the stack (16–23, 26–44 transitively).
- 23 v2 serves every v1 Profile identically on its public https host on the VPS — needs-human: ports. Blocks 11, 32, 43.
- 24 The Operator pulls the local mail catcher's image — network: `docker pull axllent/mailpit`. Blocks 31, 32, 36 transitively.
- 32 Sign-up runs on the VPS with the Operator's mail and nightly backups — needs-human: ports. Blocks 38, 43.
- 37 Events carry each Visitor's real country from the production country source — needs-human: country source. Blocks nothing.
- 38 A phone inside Instagram is recorded as Instagram on v2's VPS host — needs-human: ports. Blocks 43.
- 42 Visitor location trusts only the production country source and ofl.ink's DNS is ready for a one-record switch — needs-human: country source. Blocks 37, 43.
- 43 The Operator switches ofl.ink to v2 by one DNS change while v1 stays live — needs-human: ports; country source. Blocks 44.
- 44 Bio links move to a warmed Spare Domain the day ofl.ink is Flagged — needs-human: Spare Domain vs Meta Flag. Blocks nothing.

## Assumptions to veto

Sharpest first; each with what falls if it is wrong. Full list (199 flags) in docs/spec/plan-review.md `## Open questions`.

1. **Ports 80/443 are free for v2's Caddy on the VPS** (Phase 2 Further Notes, Phase 5 step 1, ADR 0001). Falls: Phase 2's VPS deploy and Done, Phase 1's Done, all of Phase 5; forcing the ports risks the live n8n.
2. **ofl.ink's zone can be switched by one record with a 300 s TTL, and a zone move (if Cloudflare) is safe** (Phase 5 DNS records, Moving the zone). Falls: the live ofl.ink can stop resolving during the move, or a rollback outlasts a TTL while every bio link is down.
3. **The v1 Import is never re-run after Cutover, enforced by a RUN.md rule rather than code** (Phase 3 hand-over, Phase 5 Refreshing the v1 Snapshot). Falls: one re-run overwrites every Editor edit on imported Profiles; only a backup undoes it.
4. **PocketBase's scheduled backups are usable and started at Phase 3's deploy.** Falls: v2-only Creators' data dies with the disk.
5. **Cloudflare overwrites a forged CF-IPCountry** (Phase 4, Phase 5; evidence blocked). Falls: Stats countries and US-state Geo Rule codes become forgeable. Moot under geo-IP.
6. **PocketBase checks file type from content, and `expand`/realtime obey read rules** (Phase 3; evidence blocked). Falls: a same-origin script guard; Destinations could leak through the Editor proxy (ADR 0004).
7. **Reveal's 60 per IP per minute limit, in memory, produces no false 429s.** Falls: carrier-NAT Visitors silently get nothing from Adult and Deeplink Links; `/c{code}` credit is lost.
8. **Deeplink keeps user activation across Reveal; the tap-driven Escape works on real iOS and Android** (Phase 1). Falls: Phase 1 is not Done; the matrix (ticket 11) decides.
9. **Phase 1's "lands on its url" assertions still pass once v2 serves non-Adult Links through /r** (ticket 16). Falls: one Phase 1 spec edit.
10. **Fixture Profile with four Links (adds Deeplink) under Username `fixture`** stands in for every v1 behaviour. Falls: a v1 behaviour no fixture Link exercises goes untested until the VPS parity run.
11. **Geo Rules on DNS-only Custom Domains fall back to US under Cloudflare** is acceptable (plan-review observed all 7 v1 Geo Rules' US code equals their default). Falls: a future Creator's Geo Rule credits the wrong code on their Custom Domain.
12. **The adversary draft calls were informed, not blind.** The review worktree's `.git` pointed at the real repo, so codex could and did `git show HEAD:docs/spec/...` (Phases 0 and 4 reported it; Phase 4 also fetched four public docs pages). Blind calls cited no spec. Falls: nothing in the specs, but reviewer independence for cross-spec findings is weaker than the label suggests. Fix for a future run: a worktree with an isolated object store, or a plain copy.
13. **The tickets land near 44 rather than the 40 budget**, because Phase 2 has 59 stories. Falls: nothing; the budget bounds the `--execute` loop, not the design.

## Needs the human

1. **Who holds ports 80/443 on the VPS** (parks 11, 23, 32, 38, 43):
   ```sh
   ssh root@srv1395798.hstgr.cloud 'docker ps --format "{{.Names}}\t{{.Image}}\t{{.Ports}}"; ss -ltnp "( sport = :80 or sport = :443 )"'
   ```
2. **Production country source: Cloudflare header or geo-IP on the VPS** (parks 37, 42, 43). First evidence:
   ```sh
   dig +short NS ofl.ink; dig +noall +answer DS ofl.ink
   ```
   If the nameservers are already Cloudflare's, Cloudflare wins. If not, weigh the nameserver move (and DNSSEC off/on if a DS record exists) against a geo-IP database licence and its monthly refresh. Both positions, rungs and what each parks are in plan-review.md `## Needs the human` item 2.
3. **Whether a Spare Domain survives a Meta Flag** (parks 44). Settled after the first real Flag by opening the warmed Spare Domain through the bio link in Instagram.
4. **Network commands** (floor 2; run on this Mac when ticket 13 or 24 asks):
   ```sh
   mkdir -p app && (cd app && pnpm init)          # only if app/package.json is absent
   pnpm --dir app add hono @hono/node-server sharp
   docker pull alpine:3                            # caddy:2-alpine and node:22-alpine are already local
   docker compose --env-file tests/e2e.env build   # downloads the pinned PocketBase release and the app's packages
   pnpm --dir app add heic-convert                 # only if the HEIC upload case fails with sharp alone
   docker pull axllent/mailpit                     # ticket 24, Phase 3's local mail catcher
   ```
5. **VPS and Cutover commands** (tickets 23, 32, 38, 42, 43): rsync, `docker compose up -d --build --wait`, the import on the VPS, the live `curl`/`dig`/`whois` checks, the DNS switch and the n8n freeze. Each is quoted in its ticket and in plan-review.md `## Needs the human`.
6. **Human-only acts without a question:** buying Spare Domains, the Cloudflare account (if chosen), the SMTP credential, real phones for the device matrix, `git -C linkme_clone3 pull --ff-only` before the final import.

## Agents spawned

Run 2 (this run), all `general-purpose`, `model: opus`:
- Spec ×6 (Phases 00–05) — wrote docs/spec/phase-NN-*.md — done.
- Adversary ×6 (Phases 00–05) — codex blind + draft calls, reconciled into `## Review` — done; counts 00: 19/7/6/0, 01: 7/8/15/0, 02: 13/7/13/1, 03: 9/8/19/0, 04: 14/7/16/0, 05: 13/7/10/2 (one question twice).
- Six hats ×1 — report over the set — done; recommended parking the country source and a cleanup pass.
- Plan review ×1 — reconciled six-hats into specs, cleanup pass, CONTEXT.md and ADR 0004 fixes, wrote plan-review.md — done.
- Tickets ×6 (serial, 00→05) — wrote 44 tickets; Phase 2's agent also ran one devils-advocate subagent on its own tickets — done.
- Coordinator (this session): commits, graph/cycle/coverage checks (script; 44 tickets, no cycles, every story covered), map.md, RUN.md.

Run 1 (superseded): Domain ×1, Spec ×6, Adversary ×6, Six hats ×1, Plan review ×1, Tickets ×6, all done; see `.scratch/goal-ai-superseded-run1/RUN.md`.

## Cut (YAGNI)

Deduplicated in plan-review.md `## Cut (YAGNI)`. Headlines and why:
- **Any edit to v1** (old repo, Netlify config, n8n workflow, linkme_clone3/, v1 ping or key): barred by plan §8.
- **Purging secrets.json from the old history, making the old repo private, `publish = "public"`**: the exposure is accepted indefinitely (plan §10, ADR 0005).
- **Rotating or mapping v1 Link Ids**: v2 mints fresh ids; v1 Shortcuts break by design (ADR 0004).
- **n8n Mode radio, n8n prefix-bug fix, "n8n becomes admin-only"**: moot; the v2 Editor is the only v2 editing surface.
- **ffmpeg, video, animated images; HTTP proxies; a Geo Rule UI; Umami; captcha, abuse reporting, content rules; sign-up rate limits; invite list**: plan bonus items or not asked for; D9 is public sign-up.
- **Realtime anywhere (live preview, live Stats, push)**: "live instantly" means the next load.
- **Least-privilege PocketBase account, multiple app containers, shared rate-limit store, re-encoding imported WebP, mirroring v1 deletions**: smallest thing that meets the plan.
- **Template sections beyond those kept, a copy button for Link Shortcuts, translated overlay copy, per-app artwork, in-app detection beyond the plan's pattern, Age Gate on Link Shortcuts, revealing or escaping without a tap**: plan §6 says "nothing more"; §4 says Escapes fire from a tap.
