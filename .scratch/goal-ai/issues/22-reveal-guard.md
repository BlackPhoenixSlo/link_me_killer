# 22: Reveal and /r answer only v2's own origin within a per-client limit

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 14, 25, 35, 57, 59
Seams: the running stack's public HTTP surface at baseURL through `./check.sh`, with the `request` fixture setting `Origin`, `Sec-Fetch-Site` and `X-Forwarded-For` and repeating calls; the limit is read from the committed test env. The spec's Acceptance block
Blocked by: 18: Every Click on a v1 Link ends at v1's Destination for the same Tracking Code and Visitor location, 19: Re-running the v1 Import keeps every Link Id and refuses a broken v1 tree without writing, 20: A PocketBase admin edit shows on the next page load while PocketBase's API stays closed, 21: A photo uploaded in any D4 format is stored upright and resized as WebP
Status: done

**What to build:** Bulk harvesting of Destinations is slowed (D8).
- **Origin.** Reveal answers 403, with no Destination, when `Origin` names another origin than the one the request came to, or when `Sec-Fetch-Site` is cross-site or same-site. A request carrying neither header passes, and the page's own Reveals still pass.
- **No CORS.** No Reveal answer carries a CORS header.
- **Limit.** Reveal and `/r` share one in-memory, fixed-window limit per client IP, set by the Reveal limit in the environment. The client IP is the last `X-Forwarded-For` entry, the one Caddy writes, never one the client set. Over the limit both answer 429, with no Destination in the body.

The Reveal-guard spec runs in the last project, after every other spec, since it uses up the window.

This ticket also closes the Phase's local Acceptance. The Phase's DONE gate stays with 23.

ASSUMPTION: the guard lands last among the local tickets. Until then the test env's limit of 600 is not enforced, and every earlier spec runs unguarded (rung 5: the guard needs only Reveal and `/r` from 16, and this order lets one ticket close the Acceptance). Overturned if Reveal must never run unguarded on any commit. The guard then moves into 16, and this ticket keeps the Acceptance close.

ASSUMPTION: the spec's whole local Acceptance block runs on this, the last local ticket, as 04 closes Phase 0 and 10 closes Phase 1 (rung 3). Overturned if the build run checks each Phase's Acceptance as a separate step. The block then moves there unchanged.

- [x] The Reveal-guard spec passes:
  - a foreign `Origin` and `Sec-Fetch-Site: cross-site` each get 403 with no Destination;
  - no Reveal answer carries `Access-Control-Allow-Origin`;
  - repeated Reveal and `/r` calls reach 429 within the test limit plus one;
  - no 429 body holds a Destination.
- [x] A client-set first `X-Forwarded-For` entry neither resets nor escapes its limit.
- [x] The spec's whole local Acceptance block exits 0 under `set -e`. It covers:
  - the v1 Snapshot and `.env` git-ignored;
  - the Compose contract checks;
  - the stand-in gone and `reuseExistingServer: false`;
  - all five Phase 2 specs present;
  - the scan that finds no v1 Destination in any file git tracks or would add, printing file names only;
  - `./check.sh` with every earlier spec.
- [x] The v1 Snapshot's git status is clean. Nothing in the old repo, Netlify or the n8n Form is touched.

## Build notes (ticket 22)

- Click guard: `app/src/click-guard.js` (`allow(clientIp)`, `sameOrigin(request)`, `clientIp(request)`: the last `X-Forwarded-For` entry, and `originOf(request)`, the one own-origin derivation, which `server.js` now uses for Profile JSON too). `REVEAL_LIMIT_PER_MINUTE` is read once at start; a value that is not a number above 0 stops the app from starting (compose.yaml:38 holds the only default). Wired in `app/server.js`: Reveal checks the origin (403), then the limit (429); `/r` checks the limit only (429, no Location). Both run before the Link lookup, so a refused call reads nothing from PocketBase; 403 and 429 bodies are fixed JSON with `Cache-Control: no-store` and no CORS header.
- Spec: `tests/e2e/02-reveal-guard.spec.ts`, in a project of its own, `reveal-guard`, which depends on `stack-import`; `chromium` ignores both files.
- Measured with `PARITY_PACE_LOG` during the Acceptance run: the parity spec sends 282 Reveal and `/r` calls, at most 257 in any 60 s, so the test env's 600 holds with room to spare. `tests/e2e.env` is unchanged and no earlier spec met a 429.
- Acceptance: the spec's local block minus its `# manual:` lines (/tmp/spec-auto-goal-ai/accept-02.sh) exited 0 under `set -e`; its `./check.sh` gave 297 passed, 1 skipped (the HEIC fixme parked in ticket 21).

ASSUMPTION: Reveal checks the origin before the limit, and both run before the Link lookup (rung 5: the cheap checks come first and a refused call costs no PocketBase read; a cross-origin call refused with 403 does not use up the window of the IP it came from). Overturned if cross-origin attempts must count against the limit too; `allow` then moves above `sameOrigin`.

ASSUMPTION: the window is the wall-clock minute, shared by every client, and the whole table is dropped when a new minute starts (rung 5: a fixed window with memory bounded by one minute's clients and no timer). Overturned if a burst across a minute boundary (up to twice the limit within seconds) must be refused; the window then becomes a sliding log.

ASSUMPTION: two chained last projects (`stack-import`, then `reveal-guard`) rather than one, because in one project the guard spec would run beside or before the import spec (files run in name order and 02-reveal-guard sorts first), and its used-up window would refuse the import spec's `/r` calls (rung 1: tests/e2e/02-v1-import.spec.ts:366 calls `/r`). Overturned if the import spec stops calling `/r`; both specs can then share one last project.

- The spec has no remote skip: against a stack that does not serve the Fixture Profile (the VPS), its beforeAll fails before any Reveal or `/r` call, so no remote window is used up.

ASSUMPTION: a request without `X-Forwarded-For` makes `clientIp` throw, so Reveal and `/r` answer Hono's 500 with no Destination (rung 4: a loud 500 shows a changed proxy at once, where one key shared by every header-less call would hide it until load turned it into 429s for every Visitor). Every request comes through Caddy, which always writes the header, and the app publishes no port. Overturned if something other than Caddy must reach Reveal or `/r`; it then needs a client address of its own.

ASSUMPTION: the last-entry rule is proven only by inspection locally (rung 1 for the observation: a temporary log of the entry count, removed after, showed every call of the guard spec, the two-entry ones included, reaching the app with one `X-Forwarded-For` entry, because Caddy trusting no proxy replaces a client-set header with the peer address). It matters once Caddy trusts a proxy (Phase 5 Cloudflare / ticket 23 Traefik PROXY protocol), where the last entry Caddy appends is the trusted proxy's peer — flag for RUN.md. Overturned if a stack test can put a trusted proxy in front of Caddy; the spec then proves the rule.

ASSUMPTION: a burst with no 429 within the limit plus one is sent once more before the check fails, because a minute boundary inside a burst restarts the fixed window's count. A burst takes about a second and the window is a minute, so two bursts in a row cannot both cross a boundary (rung 5: the app exposes no window clock, and waiting for a fresh window would add up to a minute). Overturned if a burst ever takes longer than half a minute; the spec then waits for a fresh window first.

ASSUMPTION: `Origin: null`, or an `Origin` that does not parse, counts as another origin and gets 403 (rung 4: it is cheaper to let a refused Reveal through later than to recall Destinations already harvested). Overturned if a real Visitor's browser sends `Origin: null` on the page's own Reveal.

Acceptance: the Phase 2 local block (minus `# manual:` lines) exited 0 under `set -e` on 2026-10-05, run by the coordinator from cold after the review (297 passed, 1 skipped; 0 containers, 0 volumes, v1 Snapshot porcelain clean, no Destination in the run log).
