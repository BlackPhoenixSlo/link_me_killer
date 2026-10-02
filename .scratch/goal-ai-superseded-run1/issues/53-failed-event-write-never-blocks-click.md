# 53: A failed or slow Event write never breaks or stalls a Visitor's Click

Spec: docs/spec/phase-04-stats.md
Covers: user stories 10
Seams: Operator steps at PocketBase's loopback port change the events collection and then restore it. A Visitor in a fresh browser context, with navigation to other hosts stubbed, observes the Click.
Blocked by: 46: A Click through `/r` counts… (`/r` records Clicks); 47: Passing the Age Gate and opening a Link Shortcut each count as one Click through Reveal… (Reveal records Clicks); 45: A Profile load counts as one Page View… (the ping records Page Views)
Status: ready-for-agent

**What to build:** An Event-store failure never costs a Creator a subscriber.

- The Event Recorder never throws. It awaits each Event write for at most 300 ms. Past that, the redirect, Reveal or ping answers anyway, and the write's outcome is only logged. A failed write is logged and swallowed.
- The rule holds for all three callers: `/r`, Reveal and the Page View ping.
- A stalled write has no automated test, because the seam has no fault switch and this Phase adds none. The 300 ms bound is the guarantee (the spec's Testing Decisions).
- The spec's evidence-blocked assumption for test 11 stands. If the pinned PocketBase refuses to add a required field to a populated collection, the test narrows the `kind` choices instead, so that the app's values fail.

- [ ] Spec test 11. The Operator adds a temporary required field to `events` through the API, so every Event write fails. A Visitor clicks the Stats Profile's Direct Mode Link and reaches the stub Destination. A `finally` step restores the collection.
- [ ] While writes fail, the Stats Profile still loads, and its Adult Link's Reveal, after the Age Gate, still returns its Destination.
- [ ] Playwright: extends `tests/e2e/04-stats.spec.ts` (test 11). `./check.sh` passes.
