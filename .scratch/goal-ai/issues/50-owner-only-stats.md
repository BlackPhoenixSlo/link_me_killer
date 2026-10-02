# 50: A Creator reads only their own Profile's Stats, and nobody outside the Operator reads a raw Event

Spec: docs/spec/phase-04-stats.md
Covers: user stories 23, 24
Seams: rule probes through Playwright `request`. `dailyStats` is probed at the same origin, through Phase 3's allow-listed proxy, as each Creator and signed out. The `events` rule checks and the Operator's steps go to PocketBase's loopback port, as Phase 3's rule checks do, because PocketBase's rules are the boundary (ADR 0002). Creator journeys run in Playwright's browser at a phone-sized viewport.
Blocked by: 45: A Profile load counts as one Page View… (the `dailyStats` owner rule, the Stats page and the seed); 46: A Click through `/r` counts… (the Links table that the UI check reads); 32: The Editor's address and the Creator's PocketBase paths answer on the Profile origin… (the allow-list, which forwards `dailyStats` and not `events`); 33: A Creator who holds a Profile logs in at `/edit`… (Creator tokens at the same origin)
Status: ready-for-agent

**What to build:** Two-sided proof that one Creator's numbers stay theirs.

- The seed gains the Other Creator: a verified account, with its test password in the test env file. The Other Creator owns the Other Profile, which has one Direct Mode Link. Only this Phase's spec visits these two seeded Profiles, so other specs running in parallel do not disturb their counts.
- `dailyStats` admits only the Profile's owner, through ticket 45's rule. `events` keeps Phase 2's superuser-only rules, so no Visitor or Creator can create, list or view an Event. This ticket adds no rule. It proves the boundary from both sides.

- [ ] Spec test 7. Each Creator first records a Page View on their own Profile. Then, through PocketBase's records API:
  - With the Stats Creator's token, every listed `dailyStats` row belongs to the Stats Profile. Viewing a known Other Profile row by its id answers 404.
  - The same holds the other way round, with the Other Creator's token.
  - With either Creator's token, and signed out, listing or viewing `events` returns no record, and creating an Event is refused.
  - Signed out, listing `dailyStats` returns no items.
- [ ] In the UI, the Other Creator's Stats page names none of the Stats Profile's Links.
- [ ] The page requested nothing from the `events` collection.
- [ ] Playwright: extends `tests/e2e/04-stats.spec.ts` (test 7). `./check.sh` passes.
