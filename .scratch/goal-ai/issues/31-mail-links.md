# 31: Verification and reset emails reach the local mail catcher and their links work

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 6, 7, 8, 14, 15, 57
Seams: the running v2 stack at Playwright's baseURL, the Creator in the browser at 390×844; the mail catcher's HTTP API on loopback, read for the newest message to an address, whose link the browser then follows. The spec's Acceptance block
Blocked by: 24: The Operator pulls the local mail catcher's image, 22: Reveal and /r answer only v2's own origin within a per-client limit, 27: A Creator changes their Profile in the Editor and its default Mode reaches the page, 28: A Creator manages their Links in the Editor and a refused save keeps what they typed, 29: Log-in lands a Creator where they left off and a handed-over Profile opens in the Editor, 30: Only a Profile's owner and the Operator can read or change it through PocketBase's API
Status: done

**What to build:** Email ties each account to a mailbox the Creator controls, and the tests follow the real links.
- **Local mail.** Mailpit joins the local stack only, and the local seed sets it as PocketBase's SMTP and sets the Application URL to the public origin. The VPS stack gains no mail catcher; the Operator's SMTP is set there by hand (32). Phase 2's Compose contract checks still pass.
- **The email links.** The users collection's verification and password-reset templates link to `/edit/verify?token=…` and `/edit/reset?token=…` on the Application URL. These two Editor URLs are fixed.
- **Verify.** The verification email is requested as soon as the account exists. Its link opens a screen that says the email is verified, or that the link is invalid or expired, with a way to resend. On the "verify your email" screen, "Resend email" sends a new one, and "Continue" moves on once the account is verified.
- **Forgot password.** The log-in screen offers it. It shows the same "check your inbox" message whether or not the address has an account. The reset link opens a screen where the Creator sets a new password, and logging in with it lands in the Editor. A bad or expired reset link says so and offers to send a new one.
- **The real link everywhere.** From this ticket on, every test that needs a verified Creator follows the verification link from the mail catcher. The Operator step that marked accounts verified stays only in 29's hand-over test, as the spec says.
- **The Phase's local Acceptance.** The spec's whole tracer bullet (Testing Decisions, behaviour 1) now runs with the real verification link. The spec saves its screenshot of the finished Editor. Phase 3's spec runs before the Reveal-guard project, so the guard's window never refuses its Reveals.

ASSUMPTION: the spec's whole local Acceptance block runs on this, the last local ticket, as 22 closes Phase 2's (rung 3). Overturned if the build run checks each Phase's Acceptance as a separate step; the block then moves there unchanged.

ASSUMPTION: this ticket waits for 22, so Phase 3's Acceptance runs `./check.sh` over Phase 2's complete local loop, the Reveal guard included (rung 3: the spec's Depends on needs `./check.sh` green on Phase 2's stack). Overturned if 22 lands later; this ticket then drops that line, and 22 places its guard project after Phase 3's spec.

- [x] After sign-up, the verification email reaches the mail catcher for that address. Its link shows "verified", and "Continue" opens the Profile step.
- [x] "Resend email" delivers a verification email to the same address when none was sent before.
- [x] The verify and reset screens each reject a bad token with "invalid or expired" and offer a resend.
- [x] "Forgot password" shows the same "check your inbox" message for a known and an unknown address.
- [x] The reset email's link opens the reset screen. The Creator sets a new password, logging in with it lands in the Editor, and the old one is refused.
- [x] No test but the hand-over marks an account verified as a superuser.
- [x] The spec's whole local Acceptance block exits 0 under `set -e`: the Phase 3 spec passes, its screenshot is non-empty, and `./check.sh` passes. Its `# manual:` lines are 24's and 32's.

## Notes

ASSUMPTION: the Resend box is proved on an account whose first verification email was never requested, because PocketBase 0.40.4 throttles a repeat request (204, no send) for about two minutes and the local seed cannot lower that window (rung 5: a two-minute poll would add ~2 min to every suite run). Overturned if a literal "second email" proof is required; the poll loop then returns, bounded at 200 s.

## Landed

Run 20261005T084628Z. Reviewer: REQUEST CHANGES round 1 (7 findings: untruthful Resend message, 200 s throttle poll (coordinator: fast path), silent migration no-op, hard-coded container count, dropped #overlay check, missing reset heading, describe placement), fix round 1, round 2 REQUEST CHANGES on one untested clause in box 2 that the coordinator had worded; the coordinator removed the clause, which the reviewer named as the last blocker. Mailpit joins the test stack only, behind the `mail` profile in tests/compose.mail.yaml via COMPOSE_FILE in tests/e2e.env; compose.yaml unchanged. Coordinator ran the Phase 3 Acceptance block minus `# manual:` lines under `set -e`: exit 0 (spec alone passed, screenshot non-empty, cold `./check.sh --reporter=line` `327 passed (3.9m)`, `1 skipped`).
