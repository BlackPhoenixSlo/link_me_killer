# An unverified email holds nothing back in the Editor; only a password reset needs a confirmed mailbox

Phase 3 let an account whose email was not verified claim one Username and nothing more: every other write to a Profile or its Links, a second Profile slot and a Custom Domain carried `@request.auth.verified = true`, so a stranger could not publish on the shared domain before proving they hold the mailbox. A self-hosted deploy with no SMTP never sends the verification email (PocketBase logs a send error on sign-up and the account is simply left unverified), so every Creator there stopped at "verify your email" and never reached the Editor. We take the hatch Phase 3 left in its own ASSUMPTION ("Overturned if the Operator wants new Creators to publish before verifying"): an unverified account uses the whole Editor, and verification matters only for what needs a working mailbox, a password reset, which is unchanged. Migration `1791140019` drops the clause from the profiles update rule, the links create, update and delete rules, the customDomains create rule and the slot > 1 clause of the profiles create rule. Onboarding goes from the claim straight to the Profile step. `/edit/verify?token=` and `/edit/verify-email` stay reachable, and a non-blocking notice in the Editor offers "Resend email" until the account is verified.

## Considered Options

- **Keep the gate and require SMTP on every deploy.** Rejected: a fresh self-hosted deploy is unusable until the Operator sets up mail.
- **A setting, feature flag or SMTP probe that lifts the gate only where mail is missing.** Rejected: two behaviours to build and test for one deploy-time difference.

## Consequences

- A stranger can publish a full Profile with Links on the shared domain, claim every Profile slot and add a Custom Domain from an address they do not control. The Operator's lever stays deleting the account in the admin UI (Phase 3 story 56). If abuse appears, the clause goes back in a later migration, and every deploy then needs SMTP.
- On a deploy with no SMTP no password reset reaches anyone; the Operator sets a new password in the admin UI.
- PocketBase's `request-password-reset` does not read `verified`, and neither does the Editor's Forgot password screen, so with SMTP an unverified account can still reset its password. The banner's "you can't reset your password until you confirm it" is the Operator's framing, kept on purpose: the verification email and the reset email both need working SMTP, so on a deploy with no SMTP neither arrives. The copy holds there and overstates only where mail works.
- Anyone can sign up with another person's address and publish a full Profile, Links, every slot and a Custom Domain under it. With SMTP the real owner of the address takes the account back through Forgot password, which reaches their mailbox. Without SMTP only the Operator can undo it, in the PocketBase admin UI.
