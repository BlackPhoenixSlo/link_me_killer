# 29: Log-in lands a Creator where they left off and a handed-over Profile opens in the Editor

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 5, 11, 12, 13, 20, 21, 51, 52, 53, 54
Seams: the running v2 stack at Playwright's baseURL: the Creator in the browser at 390×844; the Visitor in a fresh context. Operator steps arrange state at PocketBase's loopback port, as a superuser: creating an ownerless Profile the way the v1 Import does, setting its owner, marking its new owner verified
Blocked by: 26: A verified Creator goes through Onboarding to a live Profile whose Links act like imported ones
Status: ready-for-agent

**What to build:** A Creator's session lasts until they end it, and log-in always lands them in the right place.
- **Staying logged in.** The Editor keeps the auth token in `localStorage` and sends it as the `Authorization` header. Each time the Editor opens it refreshes the token, so a Creator who comes back within the token's lifetime is still logged in.
- **Log out** ends the session on this device and shows log-in.
- **An expired session.** Any 401 answer sends the Creator to log-in with a return path, and logging in brings them back to the Editor. An expired session never looks like a broken save.
- **Where log-in lands.** The first of these that applies: no Profile, the claim step; email not verified, the verify screen; no display name, the Profile step; no Link, the first-Link step; otherwise the Editor.
- **Hand-over.** When the Operator sets an imported Profile's owner in PocketBase's admin UI, that Creator's next log-in lands in the Editor on that Profile, with its Links. No code beyond the landing rule is needed.

This ticket proves the hand-over on a throwaway ownerless Profile that the test creates. No imported v1 Profile gets an owner in this Phase. Step 12 of Phase 5's Cutover runbook does that, after the last v1 Import, so no v1 Import can overwrite a Creator's edits (ADR 0002).

- [ ] Logging out shows log-in, and logging in again lands in the Editor.
- [ ] Reopening the Editor in the same browser context, without logging in, still shows the Editor.
- [ ] A Creator who logs in partway through Onboarding resumes at the right step: the claim step after a refused claim, the verify screen while unverified, the Profile step with no display name, and the first-Link step with no Link.
- [ ] With the stored token replaced by an invalid one, a save sends the Creator to log-in, and logging in returns them to the Editor.
- [ ] Hand-over:
  - a superuser creates an ownerless Profile with a display name and a Link, as the v1 Import does;
  - a fresh Creator who tries that Username sees the message that the Operator hands over Usernames held on v1 at Cutover, and stays on the claim step;
  - the superuser sets that Creator as the Profile's owner and marks them verified;
  - the Creator's next log-in lands in the Editor on that Profile, with its Link, and an edit there shows on the public page.
- [ ] After the whole run, the Fixture Profile still has no owner.
- [ ] `./check.sh` passes.
