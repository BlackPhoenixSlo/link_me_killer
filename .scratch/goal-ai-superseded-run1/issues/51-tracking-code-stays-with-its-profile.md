# 51: A Tracking Code stays with the Profile it arrived on, and OnlyFans still gets `/c{code}` there

Spec: docs/spec/phase-04-stats.md
Covers: user stories 25, 26
Seams: one Visitor browser context that visits two Profiles in turn, with navigation to other hosts stubbed. The test observes each Reveal request and Reveal's real answer.
Blocked by: 44: v2 serves its own copy of the public page script… (the copy whose key changes); 47: Passing the Age Gate and opening a Link Shortcut each count as one Click through Reveal… (the Stats Profile's Adult Link with Tracking on); 20: A Click on v2 ends at the same Destination as on v1… (Reveal's `/c{code}` resolver); 19: Every v1 Profile opens on v2 from PocketBase… (the seed's test-only secrets file, which gives the Fixture Profile's Adult Link its Destination)
Status: ready-for-agent

**What to build:** A Tracking Code that arrives on one Creator's Profile can no longer leak into another Creator's Destination.

- v2's page keeps the Tracking Code in one `localStorage` entry per Username. This replaces the global entry (D5). The old global entry is ignored, not migrated.
- Only the key changes:
  - as in v1, a code is sent only for a Link with Tracking on;
  - the Profile's stored code wins over the Link's default Tracking Code;
  - a stored code does not expire.
- Reveal's resolver is unchanged. Digits append `/c{digits}`, `geo` goes through the Geo Rule, and anything else appends nothing.
- Phase 1's rule that keeps the Tracking Code in the URL during an Escape is untouched.
- Live v1 keeps its global key until Cutover, because only v2's copy changes.

- [ ] Spec test 8. A Visitor opens the Fixture Profile with Tracking Code 123 in the URL (`/{username}/123`). On that Profile, its Adult Link's Destination ends in `/c123`.
- [ ] The same Visitor then opens the Stats Profile and follows its Adult Link, which has Tracking on. That Reveal request carries no Tracking Code, and the Destination carries no `/c123`.
- [ ] A Visitor whose browser holds a code only under v1's old global entry opens the Stats Profile and follows its Adult Link. That Reveal request carries no Tracking Code.
- [ ] Phase 1's spec still passes on v2, so the Tracking Code survives an Escape.
- [ ] Playwright: extends `tests/e2e/04-stats.spec.ts` (test 8). `./check.sh` passes.
