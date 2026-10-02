# goal-ai — RUN.md

## Status

**DONE (design-only).** Stop condition: step 4 complete and the invocation carried no `--execute`, so step 5 (work loop) did not run. Last reviewer verdict: n/a (no code reviewed; the adversary step reviewed specs, all six labelled `codex`). Full-suite command: `./check.sh` — not run by this run (nothing was built; the only existing spec, `tests/e2e/00-smoke.spec.ts`, is the harness the user committed before the run).

## Ask

Invocation, verbatim: `/spec-auto goal_ai.txt --tickets 40`
Plan: `/Users/jakabasej/oflinkv2/goal_ai.txt`. Run id `20261002T121608Z`. Effort `goal-ai`.

## Built

Design artifacts only (no tickets executed):

- `CONTEXT.md` — glossary, ~40 terms in 7 groups. Commit `docs(goal-ai): glossary and ADRs`.
- `docs/adr/0001`–`0004` — D1, D2, D3, D8+Phase 0. Same commit; 0002 and 0004 wording corrected in the plan-review pass.
- `docs/spec/phase-00` … `phase-05` — six specs, each with `## Review` (codex blind + draft call, then a `### Six hats` reconcile). Commits `docs(goal-ai): phase specs 00-05` and `docs(goal-ai): adversary reviews, six-hats reconcile, plan-review`.
- `docs/spec/plan-review.md` — workstreams (six strict waves), adversary counts, six-hats reconcile, 61 YAGNI cuts, not-yet-specified, 25 sharpest assumptions, needs-the-human.
- `.scratch/goal-ai/issues/01`–`64` and `map.md` — 64 tracer-bullet tickets, 53 ready-for-agent, 11 parked needs-human. Commit `docs(goal-ai): 64 tracer-bullet tickets and map`.

Adversary counts (accept / partial / reject / needs-human): 00: 9/11/10/0 · 01: 6/8/10/1 · 02: 10/19/14/1 · 03: 8/8/7/2 (one objection, D9) · 04: 14/9/12/0 · 05: 12/15/10/1.

Acceptance per Phase: not run (no Phase has any `done` ticket).

## Parked

No ticket was attempted, so no stash exists. Tickets parked at creation (`parked — needs-human`), with what they block:

- 06 Go-live runbook (Phase 0: n8n pause, repo private, history purge, Netlify) — blocks 16, 27, 31, 63.
- 15 Non-Adult Destinations leave public files — rests on the D1 ruling; blocks nothing.
- 16 Phase 1 real-device runbook — blocks 63.
- 17 v2 stack starts and serves v1 files — network fetch gate (docker pulls, pnpm add, compose build); blocks every Phase 2–5 agent ticket.
- 30 VPS ports reach Caddy — rests on D11b; blocks 31, 60, 63, 64.
- 31 Phase 2 VPS runbook — blocks 43, 55, 63, 64.
- 42 Public sign-up if D9 is "public" — rests on D9; blocks nothing.
- 43 Phase 3 runbook (SMTP, real inbox, phones, hand-over) — blocks nothing.
- 55 Phase 4 runbook (screenshot, phone, Cloudflare country) — blocks nothing.
- 63 Cutover runbook — blocks 64 (prose gate, see ticket note).
- 64 Domains and backups runbook — payment (Spare Domain), Cloudflare, real phones; rests on B24b.

## Assumptions to veto

Sharpest first (full 25 in plan-review.md § Open questions):

1. v2's Caddy can take ports 80/443 on the VPS. *Falls:* Phase 2 deploy and all of Phase 5's on-demand TLS if a proxy holds 443 without SNI passthrough.
2. Only Adult Links lose their Destination from v1's public files. *Falls:* ADR 0004's promise for v1; ticket 15 flips scope.
3. Cloudflare's proxy is the production country source. *Falls:* Geo Rule codes and Stats countries default to US/XX; Phase 5's zone move is unnecessary.
4. D9 = invite-only. *Falls:* Phase 3 regains content rules, abuse reporting, captcha; Custom Domains may need self-serve.
5. v1 Import is re-run until Cutover, v1 wins. *Falls:* imported Creators' Editor edits before Cutover are overwritten.
6. v1's `public/` is served as v2's page until Phase 4 forks it. *Falls:* any v2-only change before Phase 4 breaks parity or leaks into v1.
7. Deeplink on v2 goes through Reveal (empty public url). *Falls:* if OSes hand a 302 from /r to the app, the simpler path would do.
8. PocketBase without SMTP answers verify/reset with success. *Falls:* tickets 34 and 41 park on `docker pull axllent/mailpit`.
9. Case-twin Profile files are skipped on import, looked up lower-cased. *Falls:* /Jaka, /JakaJaka, /weiWEi die at Cutover if meant to be distinct.
10. Pinned PocketBase has built-in scheduled backups. *Falls:* v2 goes live without backups.
11. Plan §7's "one spec per ticket" read as one Playwright file per Phase, extended per ticket. *Falls:* 64 spec files instead of ~9.
12. Blind-call blindness was by instruction plus command-log evidence, not structural: the review worktree's git index listed `docs/spec/` names (HEAD held the specs), though logs show no spec content was read. *Falls:* nothing built on it; a future run should exclude git metadata or use a plain copy.

## Needs the human

- **D11b** — run `ssh <vps> 'docker ps --format "{{.Names}}\t{{.Ports}}"; sudo ss -ltnp "( sport = :80 or sport = :443 )"'`; if anything listens, choose "Caddy fronts both" or "existing proxy fronts v2". Unparks 30.
- **D9** — written answer: public sign-up or invite-only. Unparks or closes 42.
- **D1** — ruling: do v1's non-Adult `url`s stay public before Cutover; what happens to the 6 non-Adult Links carrying an Adult Destination (mark Adult / remove / leave). Unparks 15.
- **B24b** — on the first real Flag, open `https://$SPARE/$USERNAME` inside Instagram on a phone; no Meta warning = rotation works. Informs 64.
- **Network fetch gate (17)** — `docker pull caddy:2-alpine && docker pull node:22-alpine && docker pull alpine:3`; `pnpm --dir app add hono @hono/node-server sharp`; `docker compose --env-file tests/e2e.env build`; `pnpm --dir app add heic-convert` only if the HEIC probe in the ticket fails. Also the pinned PocketBase release archive download named in the Phase 2 spec.
- **Runbooks** — 06, 16, 31, 43, 55, 63, 64 list every live-system step with commands.
- **Phase 0 history purge** needs `brew install git-filter-repo` (ticket 06).

## Agents spawned

21 subagents, all `general-purpose`, model opus:

- Domain — CONTEXT.md + 4 ADRs — done.
- Spec ×6 (Phases 00–05, parallel) — six specs — done.
- Adversary ×6 (parallel; each two `codex exec` calls, read-only sandbox, effort high; no fallback needed) — `## Review` per spec — done; 5 needs-human findings across 4 specs.
- Six hats ×1 (persona body as brief) — report over the set — done; 7 cross-Phase gaps named.
- Plan review ×1 — reconciled six-hats into specs, fixed ADR 0002/0004 wording and 5 stale cross-refs, wrote plan-review.md — done.
- Tickets ×6 (serial, Phases 00→05) — 64 tickets — done. Coordinator fixed two forward refs (43, 55 → 63) and broke one Blocked-by cycle (63↔64, recorded as prose in 63).

Review worktree removed (`git worktree list` shows only the main tree).

## Cut (YAGNI)

61 items, deduplicated in plan-review.md § Cut. Headline cuts and why:

- D7 proxies — undefined scope; if it means domain rotation, Phase 5's Spare Domains cover it.
- ffmpeg — D4 chose sharp; ffmpeg only if video is added (Bonus).
- Geo-rules UI — plan says raw JSON textarea, "no UI yet".
- Umami — only if PocketBase stats prove insufficient.
- Public sign-up extras (content rules, abuse reporting, captcha, rate limits) — return only if D9 = public.
- Chart library — bars as plain elements; a real chart lib is a parked install.
- MaxMind geo-IP — Cloudflare header chosen; MaxMind needs an account, download and new dependency.
- Touch drag-and-drop reorder — buttons suffice until asked.
- Multiple Profiles per Creator / agency accounts — one Profile per Creator.
- `netlify dev` as webServer — the Node stand-in (Phases 0–1) then docker compose (Phase 2+) replace it.
- Public PocketBase admin hostname — SSH tunnel only.
- Scheduled rollup for Stats — a PocketBase view computed on read.
- Reserved Username `v` — the 3-character minimum already blocks it.
