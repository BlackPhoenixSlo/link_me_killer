# 54: The Page View ping is rate-limited per address and Profile, apart from Reveal's budget

Spec: docs/spec/phase-04-stats.md
Covers: user stories 27
Seams: Playwright `request` sends pings at the same origin, with the limit read from the test env file. This test runs last in the file, so the exhausted window affects no other test.
Blocked by: 45: A Profile load counts as one Page View… (the ping); 50: A Creator reads only their own Profile's Stats… (the seeded Other Profile that the test exhausts); 21: Reveal answers only its own origin, and Reveal and `/r` slow down a harvester (the limiter code and `REVEAL_LIMIT_PER_MINUTE`)
Status: ready-for-agent

**What to build:** Nobody can flood Events and fill the server's disk through the ping.

- The ping uses Reveal's limiter code and threshold (`REVEAL_LIMIT_PER_MINUTE`). It keeps its own fixed-window counter, keyed by client IP and Username. The client IP is the one Caddy reports.
- Over the limit, the ping answers 429, as Reveal does, and records nothing.
- Pings never spend the Reveal and `/r` window that Phase 2's specs are sized against. Another spec's Profile loads cannot rate-limit this Phase's seeded Profiles.

- [ ] Spec test 12. Pings to the Other Profile reach 429 within `REVEAL_LIMIT_PER_MINUTE` + 1 requests, with the value from the test env file.
- [ ] Right after that, a ping for the Stats Profile still answers 204, and `/r` for the Stats Profile's Direct Mode Link still redirects.
- [ ] The test runs last in the file.
- [ ] Playwright: extends `tests/e2e/04-stats.spec.ts` (test 12). `./check.sh` passes.
