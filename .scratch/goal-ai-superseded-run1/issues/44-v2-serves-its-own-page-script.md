# 44: v2 serves its own copy of the public page script, ahead of v1's directory, and nothing a Visitor sees changes

Spec: docs/spec/phase-04-stats.md
Covers: no user story of its own. It is the prefactor the spec's Public page copy decision calls for (Owns; Six hats R2 / K6 / G2), which tickets 45 and 51 then change.
Seams: the stack's public HTTP surface through Playwright `request`, comparing the files v2 serves with the app's copy and with v1's directory, both read in the test process. Phase 0's specs, Phase 1's spec and the smoke spec, unchanged, on v2.
Blocked by: 29: `./check.sh` runs only against v2 at localhost:4173… (the v2-only test loop; with its own blockers, 27 and 28, v2's page already carries Phase 0's and Phase 1's last changes); 28: Phase 1's spec passes against v2 on the seeded Fixture Profile (the Phase 1 script the copy starts from)
Status: ready-for-agent

**What to build:** Prefactoring for the Phase. Until now v2 serves v1's own page files, so any change to v2's page would also land on live v1. This Phase is the first whose page change v1 must not get. So v2 takes its own copy of the page script, and the next tickets change only that copy.

- The app holds its own copy of the public page script, taken from v1's tree as it stands after Phase 0's and Phase 1's changes. Only the page files this Phase changes are copied, and today that is the script alone.
- The app serves its copy ahead of v1's directory. index.html, the stylesheet, landing.html, the images and every other file still come from v1's directory.
- v1's tree is untouched. Live v1 keeps its own script, including the global Tracking Code key, until Cutover. A later fix to v1's script must be made twice (the spec's stated cost).
- Phase 5's bootstrap later edits this copy, and its readiness step moves only v1's data and static files.
- The Phase's spec file starts here. It runs serially, in the order of the spec's tests, in the v2 project. It runs ahead of the last project, whose guard spec spends the Reveal window (ticket 21).

- [ ] The copy starts byte-for-byte equal to v1's script, so v2's page behaves exactly as before.
- [ ] The script v2 serves is byte-for-byte the app's copy. landing.html and one image are byte-for-byte v1's. From ticket 45 on, when the copy differs from v1's script, this check tells the two apart.
- [ ] `git status` in v1's tree shows no change from this ticket.
- [ ] Phase 0's specs, Phase 1's spec and the smoke spec pass on v2 unchanged.
- [ ] Playwright: adds `tests/e2e/04-stats.spec.ts`. `./check.sh` passes.
