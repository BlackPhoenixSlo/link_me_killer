# 19: Re-running the v1 Import keeps every Link Id and refuses a broken v1 tree without writing

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 28, 37, 45, 51, 52, 53
Seams: the v1 Import CLI through `docker compose run`, as the Operator runs it, observed through its output and exit code; PocketBase's REST API on its loopback port, to arrange and inspect state; the running stack's public HTTP surface at baseURL, to see what Visitors get
Blocked by: 17: Every v1 Profile page on v2 matches the v1 Snapshot card for card
Status: done

**What to build:** The Operator can re-run the import against a refreshed v1 Snapshot until Cutover, and v1 wins:
- **Matching.** Profiles match by Username and Links by their private v1 key. No duplicate appears, and every Link keeps its v2 Link Id, duplicated v1 ids included.
- **v1's fields win:** display name, bio, verified, avatar, title, order, Adult flag, tracking, default Tracking Code, Geo Rule, Destination, icon and background. Image files are replaced on every run.
- **v2-only fields survive.** Mode, owner and Link Id are set on creation and never touched again.
- **New and vanished Links.** A Link new in v1 gets a fresh Link Id. A v1-imported record that the input no longer has is named in a `stale in v2:` line and kept, still served, until the Operator deletes it. Records born in v2 are never named.
- **Write errors.** A PocketBase error while writing exits 2, and running again completes the import.

The import spec proves this on the test stack, in the last project:
- **Case twins and a stable re-run.** v1's git tree is archived and piped into the import, which recreates all 30 files on Linux. The run exits 0 with exactly three case-twin `skipped:` lines (Jaka, JakaJaka, weiWEi). Profile and Link counts and every served Link Id are unchanged.
- **Refusal.** The run takes 14's broken tree, plus a case twin with different bytes written inside the container. It exits 1 with one `invalid v1 file:` line per bad file. Afterwards `/importcheck_ok` lands on the landing page, and PocketBase's counts are unchanged.
- **Re-run with changes:**
  1. import tree A;
  2. set its Profile's Mode to Direct Mode through PocketBase's API;
  3. import tree B, which retitles one Link, drops one and adds one.

  The retitled Link shows its new title under the same Link Id. The added Link has a fresh one. The dropped Link is named `stale in v2` and still served. The Mode is still Direct.
- **No Destination printed.** No run's output contains any Destination of its input.
- **Survives recreation.** The PocketBase and app containers are recreated. The re-run Profile still serves with Direct Mode, and the Fixture Profile's avatar still serves with the same bytes.

Trees A and B are committed beside 14's broken tree. Every url in them is on example.com.

- [ ] The import spec's case-twin, refusal, re-run, no-Destination and recreation cases pass under `./check.sh`, after every other spec. Without the v1 Snapshot, its v1 cases skip as `v1 Snapshot absent`.
- [ ] Nothing is written into the v1 Snapshot: the archive is read from git and unpacked only inside the container. The v1 Snapshot's git status is clean.
- [ ] A v1 url that begins with two backslashes (a browser sends it off-site) is refused with `invalid v1 file:`, not rewritten into a root-relative path (review note from ticket 15).
