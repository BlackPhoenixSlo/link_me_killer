# 27: Phase 0's specs pass against v2

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 1, 40
Seams: the smoke spec and Phase 0's spec, as Phase 0 leaves them, now run against v2's public HTTP surface in the v2 Playwright project.
Blocked by: 19: Every v1 Profile opens on v2 from PocketBase…; 20: A Click on v2 ends at the same Destination as on v1…; 05: No Adult Link carries its Destination in a public file (Phase 0's last change to its spec); 06: Go-live runbook: the Operator's handoff for n8n, GitHub and the live site (the spec's ASSUMPTION that this Phase's `./check.sh` runs after Phase 0's go-live push, once Phase 0's BASE tests skip themselves)
Status: ready-for-agent

**What to build:** The first batch of the move from the dev server stand-in to v2. The smoke spec and Phase 0's spec leave the stand-in's project and run against v2. v2 keeps every promise they check, with only the adjustments the spec names:

- `/netlify/*` answers 404 through v2's own rule.
- Phase 0's BASE tests (3, 6 and 7) skip themselves because the go-live push has landed. Before that push, test 6 would meet the deliberate `/r/{id}` difference.

The Phase 1 spec stays on the stand-in until ticket 28.

- [ ] The smoke spec and Phase 0's spec run in the v2 project and pass. Only the project they belong to changes.
- [ ] Phase 0's test 1 gets 404 on the old secrets path from v2.
- [ ] Link Ids from before Phase 0 regenerated them get 404 from v2's Reveal.
- [ ] Phase 0's BASE tests report as skipped, not failed.
- [ ] If an assertion fails on v2 for a reason the spec does not name as a deliberate difference, v2 is fixed, not the assertion.
- [ ] Playwright: moves `tests/e2e/00-smoke.spec.ts` and `tests/e2e/00-security-cleanup.spec.ts` into the v2 project. `./check.sh` passes.
