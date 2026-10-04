# 04: Age Gate then Reveal on fixture data with no v1 Snapshot in the loop

Spec: docs/spec/phase-00-new-repo-ground.md
Covers: user stories 1, 2, 3, 10, 14, 15, 16, 21, 22, 23, 24, 26
Seams: the Dev-Server Stand-in's HTTP surface at baseURL, driven by Playwright's `page` (smoke test 4, with the Reveal and the onward navigation observed from outgoing requests); the fresh-copy run, the leak scan and the v1 Snapshot facts through the spec's Acceptance commands
Blocked by: 03: Test Secrets sit beside the Fixture Profile and are never served
Status: claimed 20261004T191309Z 2026-10-04T19:38:16Z

**What to build:** On `/fixture`, a Visitor taps the Adult Link and sees the Age Gate. They press "Continue (18+)" and are sent to the Adult Link's test Destination.

The Reveal Stand-in answers that Reveal. It is a verbatim copy of v1's Reveal function and its Geo Rule helper, placed in the fixtures so that both resolve the Fixture Profile and the Test Secrets without edits. It keeps v1's contract:
- a known Link Id gets 200 with its Destination;
- a `/c{code}` Tracking Code suffix is added when a numeric code or a Geo Rule applies;
- an unknown id gets 404.

It reads only the Test Secrets. The stand-in now runs its functions from the fixtures. It still reloads a handler on every call, and it still answers 404 for a missing handler.

With that, the loop reads nothing from the v1 Snapshot, and the stand-in's startup log line no longer names it. A fresh clone without the Snapshot passes. This ticket closes Phase 0: the spec's whole Acceptance block passes.

ASSUMPTION: Phase 0 closes on its last ticket, which runs the spec's whole Acceptance block (rung 5). Overturned if the build run checks each Phase's Acceptance as a separate step. The block then moves there unchanged.

- [ ] Smoke test 4 from the spec's Testing Decisions passes:
  - Tapping "Adult Link" shows the Age Gate.
  - Pressing "Continue (18+)" sends a Reveal. Its `id` is the id of the Link titled "Adult Link" in the page's own served Profile JSON, never the fixture file or a literal. Its `user` is `fixture`.
  - The stand-in answers 200 with `realUrl` equal to the Adult Link's Destination in the Test Secrets.
  - The page then requests exactly that URL, and the off-machine guard aborts it.
- [ ] The spec's Acceptance checks headed "The Reveal Stand-in is v1's Reveal and Geo Rule helper, verbatim; the fixtures hold nothing else" pass.
- [ ] The stand-in reads no file from the v1 Snapshot, and its startup log line does not name it.
- [ ] The fresh-copy run passes. Phase 0's new and changed files are in the git index (staged or committed); the spec's fresh copy reads the index only. A copy of the index without the v1 Snapshot passes the smoke spec under `CI=1` on its own server.
- [ ] The spec's whole Acceptance block exits 0 and ends with `./check.sh`. The block checks that:
  - the v1 Snapshot is unedited, git-ignored and untracked;
  - the Page Copy and the Reveal Stand-in are byte-identical to their originals;
  - no v1 Destination is in any file git would take, in git history or in test output;
  - no v1 Link Id is in the tests.
- [ ] Manual: a glance at `.scratch/goal_ai/shots/00-smoke.png` shows the Fixture Profile looking like v1's `juliafilippo_` page, minus Font Awesome glyphs and the verified badge.
- [ ] Any dev server already on port 4173 was stopped before the specs ran.
- [ ] No dependency is added. The Playwright config, `check.sh` and `package.json` are unchanged since before Phase 0.
