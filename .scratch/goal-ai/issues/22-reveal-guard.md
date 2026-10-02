# 22: Reveal and /r answer only v2's own origin within a per-client limit

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 14, 25, 35, 57, 59
Seams: the running stack's public HTTP surface at baseURL through `./check.sh`, with the `request` fixture setting `Origin`, `Sec-Fetch-Site` and `X-Forwarded-For` and repeating calls; the limit is read from the committed test env. The spec's Acceptance block
Blocked by: 18: Every Click on a v1 Link ends at v1's Destination for the same Tracking Code and Visitor location, 19: Re-running the v1 Import keeps every Link Id and refuses a broken v1 tree without writing, 20: A PocketBase admin edit shows on the next page load while PocketBase's API stays closed, 21: A photo uploaded in any D4 format is stored upright and resized as WebP
Status: ready-for-agent

**What to build:** Bulk harvesting of Destinations is slowed (D8).
- **Origin.** Reveal answers 403, with no Destination, when `Origin` names another origin than the one the request came to, or when `Sec-Fetch-Site` is cross-site or same-site. A request carrying neither header passes, and the page's own Reveals still pass.
- **No CORS.** No Reveal answer carries a CORS header.
- **Limit.** Reveal and `/r` share one in-memory, fixed-window limit per client IP, set by the Reveal limit in the environment. The client IP is the last `X-Forwarded-For` entry, the one Caddy writes, never one the client set. Over the limit both answer 429, with no Destination in the body.

The Reveal-guard spec runs in the last project, after every other spec, since it uses up the window.

This ticket also closes the Phase's local Acceptance. The Phase's DONE gate stays with 23.

ASSUMPTION: the guard lands last among the local tickets. Until then the test env's limit of 600 is not enforced, and every earlier spec runs unguarded (rung 5: the guard needs only Reveal and `/r` from 16, and this order lets one ticket close the Acceptance). Overturned if Reveal must never run unguarded on any commit. The guard then moves into 16, and this ticket keeps the Acceptance close.

ASSUMPTION: the spec's whole local Acceptance block runs on this, the last local ticket, as 04 closes Phase 0 and 10 closes Phase 1 (rung 3). Overturned if the build run checks each Phase's Acceptance as a separate step. The block then moves there unchanged.

- [ ] The Reveal-guard spec passes:
  - a foreign `Origin` and `Sec-Fetch-Site: cross-site` each get 403 with no Destination;
  - no Reveal answer carries `Access-Control-Allow-Origin`;
  - repeated Reveal and `/r` calls reach 429 within the test limit plus one;
  - no 429 body holds a Destination.
- [ ] A client-set first `X-Forwarded-For` entry neither resets nor escapes its limit.
- [ ] The spec's whole local Acceptance block exits 0 under `set -e`. It covers:
  - the v1 Snapshot and `.env` git-ignored;
  - the Compose contract checks;
  - the stand-in gone and `reuseExistingServer: false`;
  - all five Phase 2 specs present;
  - the scan that finds no v1 Destination in any file git tracks or would add, printing file names only;
  - `./check.sh` with every earlier spec.
- [ ] The v1 Snapshot's git status is clean. Nothing in the old repo, Netlify or the n8n Form is touched.
