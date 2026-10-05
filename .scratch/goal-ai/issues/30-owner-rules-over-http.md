# 30: Only a Profile's owner and the Operator can read or change it through PocketBase's API

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 42, 43, 44, 45, 46, 47, 48, 49, 55, 56
Seams: the `request` fixture at the public origin, calling the proxy exactly as the Editor does, as two signed-in Creators and an anonymous caller; Phase 2's upload endpoint at the same origin. Operator steps at PocketBase's loopback port, as a superuser, arrange state and stand in for the admin UI, which calls the same API
Blocked by: 26: A verified Creator goes through Onboarding to a live Profile whose Links act like imported ones
Status: done

**What to build:** Proof that one Creator's Profile, Links and images are theirs alone, and that a Visitor gets a Destination only through Reveal or the redirect. The rules offer no screen on which a non-owner could even try, so HTTP is the highest seam that reaches them. 25 and 26 wrote the auth-and-ownership rules. Wherever a probe here gets through, this ticket closes it in the migration, to the spec's Schema and with no new rule. After every refused write, the owner reads the record back unchanged.

The spec's rule probes (Testing Decisions, behaviour 10), each against Creator A, verified, with a Profile, an avatar and Links with backgrounds:
- Creator B cannot update or delete A's Profile, and cannot update, delete or add a Link to it.
- Neither Creator can move a Link onto the other's Profile.
- Creator B and an anonymous caller get no Destination from a list, a view, or a Profile read that expands its Links.
- An anonymous caller and a signed-in Creator get nothing from a list or view of the ownerless Fixture Profile or its Links, expanded or not.
- An anonymous caller lists no accounts and no Profiles. Creator B cannot list or view A's account or email.
- Creator B cannot replace A's avatar, or a background of A's Links, through the upload endpoint.
- A direct multipart upload of a PNG to a file field through the proxy is refused.
- A Profile created with the verified badge or a display name set is refused. The owner cannot change their own Username, owner or verified badge afterwards.
- A sign-up that sets `verified: true` is refused or yields an unverified account.
- A Link created with a chosen record id or Link Id is refused, and so is a Link Id sent in an update.
- A second Profile for the same Creator is refused.
- A Destination that does not start with `https://`, `http://` or `/` is refused.
- The owner cannot delete their own Profile.

The Operator keeps every power, because superusers bypass the rules:
- a superuser edits A's Profile, one of A's Links and A's account;
- a superuser deletes an abusive account and its Profile, after which that Profile's page lands on the landing page and the account can no longer log in.

ASSUMPTION: the rules are written in the tickets whose paths first use them (25, 26) and proven together here (rung 5: one probe set rather than a scattered one; nothing deploys before 32, so no gap between tickets reaches the public). Overturned if each rule must ship with its own refusal test; those probes then move into 25 and 26, and this ticket keeps the cross-Creator and Operator cases.

- [x] Every probe above is refused or returns nothing, and the owner reads every record back unchanged.
- [x] No response body in this ticket's run holds a Destination, except the owner's own reads.
- [x] Both Operator powers work, and the deleted Profile's page lands on the landing page.
- [x] `./check.sh` passes.

## Notes

Every probe passed on first run: 25 and 26's rules already hold, so this ticket's tests are regression tests and no migration was needed (no new migration file).
- Cross-Creator writes, moves, uploads (box 1): `another Creator cannot change, delete, add to or take from a Profile…`.
- Reads by Creator B and an anonymous caller, the Fixture, accounts and emails (boxes 1, 2): `another Creator and an anonymous caller read nothing…`. It replaces ticket 25's `no proxied answer holds a Destination…` test, which it covers with Links in place.
- Owner-self refusals, direct multipart, Link Id, second Profile, Destination prefixes (box 1): `the owner cannot change their Username…`.
- A Profile created with the badge or a display name, and a sign-up setting `verified: true` (box 1): ticket 25's `the claim sets only Username, owner and default Mode…`, on an unverified account. The profiles create rule has no verified clause (1791140004_sign_up_and_claim.js), so that account stands for a verified one.
- Operator powers (box 3): `the Operator edits a Creator's Profile, Link and account, then deletes…`.
- Box 2: every non-owner call goes through `probe` (tests/e2e/helpers.ts), which fails on an answer holding the other Creator's Destinations or a Fixture Destination. Operator calls return only a status.

ASSUMPTION: the probes replace ticket 25's read test, so off the local test stack no read probe runs (rung 5). Overturned if they must run against a deployed stack.
ASSUMPTION: any of 400, 403 or 404 counts as refused, since the owner's read-back proves nothing changed (rung 5). Overturned if each probe must pin PocketBase's exact status.
ASSUMPTION: the Operator's account edit is proved on the stock users `name` field (rung 6). Overturned if it must touch another field.
ASSUMPTION: the Operator deletes the Profile and then the account, because `profiles.owner` has `cascadeDelete: false` (1791140001_profiles.js), so deleting the account alone would leave an ownerless Profile live (rung 1 for the cascade, rung 5 for the order). Overturned if deleting an account must take its Profile with it; that would be a migration setting the cascade.
ASSUMPTION: two existing drivers, `openInInstagram` (ticket 27, folded into `openProfile` in fix round 1) and `reach` (ticket 29), moved into tests/e2e/helpers.ts so the spec stays under 1000 lines (rung 3: helpers.ts precedent; rung 5).

## Landed

Run 20261005T084628Z. Reviewer: REQUEST CHANGES round 1 (5 findings: duplicate openInInstagram/visitorSees driver, shadowed readBack/refused imports, inline uploads, casts nit, unprobed answers), fix round 1, APPROVE round 2. All tests are regression tests: tickets 25–26's rules already held, no migration written. ASSUMPTION (evidence blocked): a throwaway rule-weakening migration to prove the probes can fail was denied by the permission classifier; the probes' power rests on the reviewer's reading of each payload against the migrations and on the owner-reads-own-Destination control. Coordinator cold `./check.sh --reporter=line`: exit 0, `325 passed (3.6m)`, `1 skipped`.
