# 41: "Forgot password", and the screens that the verification and reset emails open

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 9, 15, 16
Seams: Creator journeys in Playwright's browser at a phone-sized viewport. PocketBase's answers to the reset and verification requests, through Playwright `request` at the same origin. The superuser reads PocketBase's email settings at its loopback port.
Blocked by: 33: A Creator who holds a Profile logs in at `/edit`… (the log-in screen); 34: An invited Creator signs up on one screen… (the verification request and "Resend email")
Status: ready-for-agent

**What to build:** Account recovery and the two screens the emails link to. Their addresses are the Editor's only fixed URLs: `/edit/verify?token=…` and `/edit/reset?token=…`.

- **Forgot password.** The log-in screen offers "Forgot password". It asks for an email and always shows the same "check your inbox" message, whether or not the address has an account.
- **Email links.** PocketBase's verification and password-reset emails point at those two screens, on the public origin that PocketBase's application URL names.
- **Verify screen.** It says the email is verified, or that the link is invalid or expired, with a way to resend.
- **Reset screen.** It sets a new password, then sends the Creator to log in with it, or says the link is invalid or expired.

Local runs have no mail server, so the happy paths of both screens are checked by hand in ticket 43.

ASSUMPTION (evidence blocked): carried from the spec, PocketBase answers a password-reset request with success when no SMTP is set. Overturned if it returns an error. The local stack then needs a mail catcher, which is a network fetch: the ticket parks with `docker pull axllent/mailpit` for the human.

- [ ] Spec behaviour 7. "Forgot password" shows the same "check your inbox" message for a known and an unknown address, and PocketBase accepts the request.
- [ ] The verify screen and the reset screen each reject a bad token with the "invalid or expired" message, and the verify screen offers to resend.
- [ ] Read back as the superuser, the verification and reset emails point at the Editor's verify and reset screens on the public origin.
- [ ] Playwright: extends `tests/e2e/03-auth-and-editor.spec.ts`. `./check.sh` passes.
