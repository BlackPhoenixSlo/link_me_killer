# 59: Only the Operator sets a Custom Domain; a change shows on the next load, one domain fits one Profile, and no public answer names it

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 18, 21, 23, 31
Seams: the spec's one seam.
- The set-up and the Operator's changes go through PocketBase's REST API on its loopback port, as a superuser.
- The Creator's attempts go through the Profile origin's PocketBase paths, with the Creator's token.
- The privacy checks use Playwright `request` at the baseURL, without a token.

Each test that changes a domain restores it.
Blocked by: 57: The Operator gives a Profile a Custom Domain in PocketBase… (the field, its unique index and Host Resolution); 34: An invited Creator signs up on one screen, claims a Username… (Profiles' create rule, which already lets a request set only the Username and the owner); 35: A verified Creator finishes Onboarding… (Profiles' update rule and the verified gate); 32: The Editor's address and the Creator's PocketBase paths answer on the Profile origin… (the allow-listed paths that behaviour 11 reads); 19: Every v1 Profile opens on v2 from PocketBase… (the app's Profile JSON, which behaviour 11 also reads)
Status: ready-for-agent

**What to build:** Giving a Profile a Custom Domain is the Operator's act alone, and a minute's work in the PocketBase admin UI. Nobody outside can list the domains.

- Profiles' create and update rules each gain a clause that refuses any request setting the Custom Domain. Only a superuser sets it. The Editor gets no field for it.
- A changed Custom Domain takes effect on the next page load, with no restart, because Host Resolution asks PocketBase every time (ticket 57).
- Two Profiles cannot hold the same Custom Domain.
- No answer to a caller without a token names a Custom Domain. The field stays hidden from PocketBase's public API, and the app's Profile JSON leaves it out.

- [ ] Spec behaviour 9, its first two steps:
  - changing the Fixture Profile's Custom Domain to `creator2.test` makes `creator2.test/` show the Profile on the next load, with no restart;
  - a second Profile, which the test creates, is refused the same Custom Domain.
- [ ] Spec behaviour 10: a verified Creator, created by the test as superuser, is refused both of these, and the stored value stays unchanged:
  - creating a Profile with a Custom Domain;
  - setting the Custom Domain of their own Profile.
- [ ] Spec behaviour 11, Custom Domain half: without a token, neither `/api/profiles/{username}.json` nor `/api/collections/profiles/records` at the baseURL contains `creator.test`.
- [ ] Playwright: extends `tests/e2e/05-domains.spec.ts` (the first two steps of spec behaviour 9, 10, and the Custom Domain half of 11). `./check.sh` passes.
