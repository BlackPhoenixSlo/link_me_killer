# 28: Phase 1's spec passes against v2 on the seeded Fixture Profile

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 7, 40
Seams: Phase 1's spec, as Phase 1 leaves it, now run against v2's public HTTP surface in the v2 Playwright project. It uses fake In-App Browser User-Agents, its navigation recorder, and its Reveal and `example.com` stubs. The Fixture Profile and `fixture_v1` come from the seed, not from the stand-in's fixture lookup.
Blocked by: 19: Every v1 Profile opens on v2 from PocketBase…; 20: A Click on v2 ends at the same Destination as on v1…; 13: On Android the Escape opens Chrome… and 14: Deeplink Mode hands the Destination's https link to the phone… (Phase 1's last changes to its page script and spec; with their own blockers they cover tickets 07–12)
Status: ready-for-agent

**What to build:** The second batch of the move to v2. Phase 1's spec leaves the dev server stand-in's project and runs against v2, which serves Phase 1's page script unchanged. Every Mode, Escape and Escape Overlay behaviour therefore holds for Visitors on v2 as on v1. Two things carry it across:

- a Deeplink Mode Link has an empty `url`, so the page script reveals it and hands the phone the real Destination;
- Phase 1's Reveal stub answers a non-Adult fixture Link with that Link's own `url`.

ASSUMPTION: if Phase 1's navigation recorder sees the `/r/{id}` hop before a non-Adult Link's Destination, the recorder follows that redirect to the Destination; the assertion is not weakened. Rung 5: the hop is a deliberate difference the spec names under "What 'identically' means". Overturned if Phase 1's spec must run on v2 byte for byte unchanged; v2's Profile JSON would then have to carry non-Adult Destinations, against ADR 0004.

- [ ] Phase 1's spec runs in the v2 project and passes, for every Mode on the Fixture Profile and for the Mode-less `fixture_v1`. Only its project and the hop handling above change.
- [ ] A Deeplink Mode Link reaches its Destination through Reveal, and the Android Deeplink test passes on v2.
- [ ] A non-Adult tap goes through `/r/{id}` and ends at the fixture's `example.com` Destination, answered by the spec's stub. No request leaves the machine.
- [ ] The Escape Overlay shows and hides on v2 exactly as Phase 1's spec expects for each In-App Browser it names.
- [ ] Playwright: moves `tests/e2e/01-link-modes-and-escape.spec.ts` into the v2 project. `./check.sh` passes.
