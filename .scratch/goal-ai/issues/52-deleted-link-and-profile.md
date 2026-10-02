# 52: A deleted Link keeps its Clicks as "Deleted link", and a deleted Profile takes its Events with it

Spec: docs/spec/phase-04-stats.md
Covers: user stories 20, 28
Seams: Creator steps go through PocketBase's records API at the same origin, with the Stats Creator's token. Operator steps go to PocketBase's loopback port with the superuser credentials. Visitors are fresh browser contexts, with navigation to other hosts stubbed. Stats is read before and after.
Blocked by: 46: A Click through `/r` counts… (the Links table and `/r` Clicks); 48: Today, 7D and 30D tabs and the Link and country filters… (the Link filter, which gains "Deleted link"); 45: A Profile load counts as one Page View… (the Profile cascade in the migration, and the ping); 35: A verified Creator finishes Onboarding… (the Link create rule); 36: In the Editor a Creator adds, edits, reorders and deletes their Links… (the Link delete rule)
Status: ready-for-agent

**What to build:** Tidying a Profile never rewrites its history, and removing a Profile never gets stuck on its traffic.

- Deleting a Link clears the Link on its past Clicks. The Clicks keep their Profile, country and day. Stats shows them on a "Deleted link" row in the Links table, and the Link filter gains a "Deleted link" option. The totals do not change.
- Deleting a Profile deletes its Events, through ticket 45's cascade, so the Events never block the deletion.

- [ ] Spec test 9. The Stats Creator creates a Link with a stub Destination through PocketBase's API. A Visitor opens `/r/{its Id}`, and then the Creator deletes the Link.
  - The Links table's "Deleted link" row shows +1 Click.
  - The Clicks card shows the same total as just before the delete.
- [ ] With the Link filter on "Deleted link", the Clicks card shows that row's Clicks.
- [ ] Spec test 10. The Operator creates a throwaway Profile through the API, with a Username unique to the run. A Visitor loads it, and its ping answers 204. The Operator then deletes the Profile. The delete succeeds, and no Event for that Profile remains.
- [ ] The page requested nothing from the `events` collection.
- [ ] Playwright: extends `tests/e2e/04-stats.spec.ts` (tests 9 and 10). `./check.sh` passes.
