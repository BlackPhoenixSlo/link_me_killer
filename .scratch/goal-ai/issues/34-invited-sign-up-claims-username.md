# 34: An invited Creator signs up on one screen, claims a Username and waits on "verify your email"

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 1, 2, 3, 4, 5, 6, 7, 8, 17, 45, 46
Seams: Creator journeys in Playwright's browser at a phone-sized viewport. Rule probes through Playwright `request` at the same origin. Superuser steps at PocketBase's loopback port, adding an invite as the admin UI does, because the proxy forwards no invite path.
Blocked by: 33: A Creator who holds a Profile logs in at `/edit`… (the session, the Editor landing and the owner read rules the claim step reads with); 18: Every PocketBase collection comes from versioned migrations… (the closed sign-up rule this ticket opens, and the Username pattern it tightens); 19: Every v1 Profile opens on v2 from PocketBase… (the imported Usernames, which stay taken and must fit the tightened rule)
Status: ready-for-agent

**What to build:** Sign-up and the claim, up to the pause for email verification.

- **Invites.** The Operator invites a Creator by adding one row, holding only their email address, to an invite list in PocketBase's admin UI. Every rule of the invite list is superuser-only. Only an address on the list may sign up; PocketBase's unique email makes each invite single-use. An address not on the list is refused with "Sign-up is by invitation".
- **Sign-up.** One screen asks for an email, a password and the Username wanted. The Username is lowercased as it is typed. Signing up creates the account, signs in, requests the verification email, then creates the Profile with only the Username and the Creator as owner. That last step is the claim, and Onboarding starts straight away.
- **The claim.** A Username must be 3 to 30 lowercase letters, digits and underscores, unused, and none of the reserved names `api`, `edit`, `images`, `internal` and `netlify`. PocketBase enforces this, not only the browser. A refused claim leaves the Creator signed in on the claim step with the reason. A taken Username adds "If it was yours on v1, ask the Operator to hand it over". There is no separate availability lookup.
- **Profile create rule.** The caller must be signed in, the owner must be the caller, and the request may set only the Username and the owner. Each Creator owns at most one Profile; ownerless imported Profiles do not count.
- **Verify pause.** After the claim, an unverified Creator stops on "verify your email", with "Resend email" and "Continue". "Continue" refreshes the session and stays there until PocketBase reports the account verified; ticket 35 takes it on from there.
- **Resume.** A log-in lands on the first unfinished step: no Profile goes to the claim step, and an unverified account goes to "verify your email".

ASSUMPTION: sign-up is invite-only, carried from the spec's D9 decision (rung 4: the closed default, which opening later only adds to). Overturned by the Operator answering D9 "public" (ticket 42); this ticket's invite gate then opens, and everything else here stands.
ASSUMPTION (evidence blocked): carried from the spec's Further Notes, the pinned PocketBase lets an unverified account log in, answers a verification request with success when no SMTP is set, and lets a create rule read the request body, look up the superuser-only invite list and tell which fields a request sets. Overturned by the pinned version. If an unverified log-in is blocked, the claim moves to the first log-in after verification, as the spec says. If a rule cannot be expressed, the ticket parks with PocketBase's answer pasted, for a spec change. If the verification request fails without SMTP, the local stack needs a mail catcher, which is a network fetch: the ticket parks with `docker pull axllent/mailpit` for the human.

- [ ] Spec behaviour 1: an address not on the invite list is refused sign-up with "Sign-up is by invitation", and no account exists for it afterwards.
- [ ] Spec behaviour 2, start. The superuser invites an address. The Creator signs up with a new Username, and the Profile exists with that Username and the Creator as owner. Onboarding pauses on "verify your email". PocketBase accepts the "Resend email" request, and "Continue" keeps an unverified Creator on that screen.
- [ ] A second sign-up with the same invited address is refused.
- [ ] Spec behaviour 3. A taken Username (an imported v1 one, which shows the hand-over hint), a reserved one (`edit`) and an invalid one (`Bad.Name`) are each refused. The Creator stays on the claim step with no Profile, then claims a valid one.
- [ ] A Creator who logs out on the claim step, or on "verify your email", lands back on that step at the next log-in.
- [ ] Spec behaviour 10, over HTTP. Each of these is refused, and the owner then reads back exactly one Profile, unchanged:
  - a Profile created with the verified badge set;
  - a Profile created for another owner;
  - a second Profile for the same Creator.
- [ ] The seed still imports every v1 Profile, all of them ownerless, under the tightened Username rule.
- [ ] Playwright: extends `tests/e2e/03-auth-and-editor.spec.ts`. `./check.sh` passes.
