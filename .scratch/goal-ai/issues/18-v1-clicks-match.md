# 18: Every Click on a v1 Link ends at v1's Destination for the same Tracking Code and Visitor location

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 2, 3, 4, 5, 6, 16, 21, 36, 39, 48, 49, 57
Seams: the running v2 stack's public HTTP surface at baseURL through `./check.sh`: the `request` fixture for Reveal and for `/r` redirects (not followed), and pages for the journeys, with the final navigation to a Destination's host caught by `page.route`. The oracle is v1's own Reveal handler, loaded from the v1 Snapshot in the test process
Blocked by: 17: Every v1 Profile page on v2 matches the v1 Snapshot card for card
Status: ready-for-agent

**What to build:** Reveal gains Geo Rules. With `trackingId=geo`, it picks the Tracking Code from the Link's Geo Rule by the Visitor's country and US state, exactly as v1 does. Visitor location reads them from the request headers: v1's header names first, then Cloudflare's. The country falls back to US.

The parity spec then proves every Click on v2 against v1's own Reveal handler. It loads that handler from the v1 Snapshot in the test process, the technique the deleted stand-in used. No test re-implements Tracking Codes or Geo Rules.
- **Every non-Adult Link:** `/r` answers 302 with `Location` equal to the card's v1 url, made root-relative if it was relative. That includes the non-Adult Links that also had a secrets entry, and the OnlyFans ones. weiwei's is checked by 17's repair checks.
- **Every Adult Link:** v2's Reveal gives the same answer as v1's handler for the same card:
  - with no code, digits, `geo` and junk;
  - for Links with a Geo Rule, several country and state header pairs;
  - Adult Links without a secrets entry answer 404 on both.
- **Test titles:** every case that sends a location header has `Geo Rule` in its title.
- **Old ids:** every v1 Link Id and every secrets key gets 404 from Reveal and from `/r`.
- **Journeys:**
  - a non-Adult card goes through `/r/{id}` to its v1 url;
  - `/{username}/{digits}`, then the Age Gate, sends Reveal with those digits and lands where v1 sends that code;
  - `/{username}?link={v2 Adult Link Id}` reveals on load.

Against a remote host (`PLAYWRIGHT_BASE_URL`), the spec sends its Reveal and `/r` calls through one paced helper, at most 50 a minute, in one worker. A run against the VPS's production limit then completes.

Destinations are compared only as booleans, so a failure names a Username and card position, never a Destination.

ASSUMPTION: nothing here commits to a production country source. Visitor location reads the headers the spec lists, and the decided source (Cloudflare, plan §11) sits behind that one function (plan-review, Needs the human, item 2; the spec says this Phase's tickets do not wait for it). Phase 2's Caddy passes the injected headers through, so the Geo Rule cases also run against the VPS in 23. Overturned if the Operator picks geo-IP before this lands. The lookup then goes behind the same function, and the parity cases need a seam in front of it.

- [ ] With the v1 Snapshot present, the parity spec's `/r`, Reveal, old-id and journey cases pass for every v1 Link under `./check.sh`. Without it they skip as `v1 Snapshot absent`.
- [ ] `--list` with `--grep-invert 'Geo Rule'` leaves out exactly the cases that send a location header.
- [ ] Locally the spec never meets a 429.
- [ ] Pacing is checked once with `PLAYWRIGHT_BASE_URL` pointed at a hand-started local stack: Reveal and `/r` calls stay at 50 a minute or fewer, in one worker.
- [ ] No failure output, and nothing the stack prints during the run, contains a Destination.
- [ ] The v1 Snapshot's git status is clean after the run.
