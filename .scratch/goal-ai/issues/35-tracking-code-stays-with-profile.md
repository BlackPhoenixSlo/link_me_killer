# 35: A Tracking Code stays with the Profile it arrived on

Spec: docs/spec/phase-04-stats.md
Covers: user stories 25, 26, 27, 28
Seams: the running v2 stack at Playwright's baseURL through `./check.sh`. Visitors in fresh browser contexts whose `localStorage` starts with v1's global key, with desktop and Instagram User-Agents; Reveal requests and answers observed with `waitForRequest` and `waitForResponse`, and every navigation to a host other than baseURL fulfilled with the stub page. The `request` fixture for Profile JSON. Operator steps at PocketBase's loopback port, as a superuser
Blocked by: 33: A Page View and a Click through /r reach the Creator's Stats page, 01: The test loop serves the Page Copy, 10: The escaped Link opens by itself in the System Browser credited to the same Tracking Code, 18: Every Click on a v1 Link ends at v1's Destination for the same Tracking Code and Visitor location
Status: done

**What to build:** A Tracking Code that arrives in one Creator's Profile URL can no longer reach another Creator's Destination or escape target (D5). The `/c{code}` suffix keeps working on the Profile the code arrived on.

- **Profile JSON.** The `profile` object of Phase 2's public Profile JSON gains the Profile's record `id`. This is Phase 4's own change, and Phase 2's contract already lists it as Phase 4's. Nothing else in the JSON changes.
- **One key per Profile.** The public page script, v2's own copy, stores and reads the Tracking Code under `linkme_tracking_id:{Profile id}`. The record id survives Username renames, a Username claimed again after its Profile is deleted, case-insensitive Username matches and v1 Import reruns.
- **v1's global key is ignored.** It is not read, not adopted and not rewritten. At Cutover it may hold another Creator's code.
- **Only the key changes.** As in v1, a code is sent only for a Link with Tracking on, the Profile's stored code wins over the Link's default code, and a stored code does not expire. Reveal's resolver still turns the code into `/c{code}`.
- **Escape.** Phase 1's escape target is "the code the page would pass to Reveal", so it follows the new key with no edit. The rule that keeps the Tracking Code in the URL during an Escape is untouched.

ASSUMPTION (the spec's): Phase 1 leaves the Tracking Code under v1's single global key, as Phase 1's spec defers the key to this Phase. Overturned if Phase 1's build already keys the code per Profile. This ticket then keeps only the tests.

- [x] The Stats Profile's and the Other Profile's JSON each carry `profile.id`, their record id. No `destination`, `geo`, `owner` or `v1Key` key appears.
- [x] Phase 2's Profile JSON and parity checks still pass. If one of them reads every `id` key as a Link Id, it is narrowed to Link Ids, since Phase 2's contract lists `profile.id` as this Phase's.
- [x] The spec's test 8 passes. A Visitor's context starts with v1's global `linkme_tracking_id` = 999. The Visitor:
  - opens `/{Other Profile's Username}/123` and follows its Adult Link. The Destination ends in `/c123`;
  - opens the Stats Profile and follows its Adult Link. That Reveal request carries no Tracking Code, and its Destination has neither `/c123` nor `/c999`;
  - opens the Stats Profile with `?link={its Adult Link's Id}`. That Reveal request carries no Tracking Code either.
- [x] A second context, with an Instagram User-Agent and the same global 999, opens `/{Other Profile's Username}/123` and then the Stats Profile. Once the Escape Overlay shows, the address bar carries neither `/123` nor `/999`.
- [x] Username reuse. The Operator creates a throwaway Profile with a run-unique Username and an Adult Link with Tracking on, and a third context opens `/{that Username}/777`. The Operator deletes that Profile and creates a new one under the same Username with the same kind of Link. The third context follows the new Profile's Adult Link, and that Reveal request carries no Tracking Code. The new Profile is then deleted.
- [x] Phase 1's spec still passes: the Tracking Code survives an Escape, and a code arriving in the URL is stored and used on its own Profile.
- [x] `./check.sh` passes.

## Landed

Run 20261005T084628Z. Reviewer: REQUEST CHANGES round 1 (test-only: a second Reveal waiter beside throughReveal, no test for 'not rewritten'), fix round 1 (same implementer, resumed), APPROVE round 2. Coordinator cold `./check.sh --reporter=line`: exit 0, `336 passed (3.7m)`, `1 skipped` (a first coordinator run collided with the implementer's own final run at web-server start and was discarded).
