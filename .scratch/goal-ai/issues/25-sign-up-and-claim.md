# 25: Anyone with the sign-up link creates an account and claims a Username

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 1, 2, 3, 4, 5, 7, 10, 16, 41
Seams: the running v2 stack at Playwright's baseURL, the public origin: Creator journeys in the browser at 390×844, the Visitor side in a fresh context with no Editor session; rule and proxy checks with the `request` fixture at the same origin, calling the proxy exactly as the Editor does
Blocked by: 20: A PocketBase admin edit shows on the next page load while PocketBase's API stays closed
Status: ready-for-agent

**What to build:** A stranger opens v2's sign-up screen with no invitation and enters an email, a password and the Username they want. They land, signed in, on "verify your email". This is the Phase's first path through every layer: the Editor route, the same-origin API, the auth-and-ownership rules and the Editor's first screens.

- **The Editor.** v2 answers `/edit` and every path under it with the Editor, matched before the Profile catch-all. The Editor is static HTML, CSS and JS with no build step and no new package. It copies the look of the link.me Template's "Edit Profile" screen, phone-first, and sign-up and log-in reuse that look. `/edit` sends a Creator with no session to log-in, which links to sign-up. It sends a signed-in Creator to the first Onboarding step that applies: no Profile, the claim step; email not verified, the verify screen. 26 adds the later steps. Creator-entered text is always rendered as text, never as HTML.
- **The landing page.** Its "Create Your Own Page" button opens v2's sign-up screen instead of the n8n Form. Phase 0 deferred this to Phase 3 (plan-review, Not yet specified).
- **Same-origin API.** The app forwards PocketBase's users, profiles and links collection paths, records and auth alike. Method, headers and body pass through unchanged both ways. Every other path keeps Phase 2's answer: `_superusers` and every other collection, realtime, batch, settings, logs, PocketBase's own files and the admin UI.
- **The sign-up sequence.** The Editor creates the account, signs in, and asks PocketBase for the verification email. It then claims the Username by creating the Profile with only the Username, the Creator as owner and Escape Mode as the default Mode. Last, it shows "verify your email" with "Resend email" and "Continue". Continue refreshes the session and moves on only once PocketBase reports the account verified. Until 31 no mail is delivered locally, and sign-up never waits on it.
- **The claim's rules.** These are this ticket's part of the auth-and-ownership migration, as the spec's Schema states them:
  - users: anyone may create an account, setting nothing but email and password. Any account may sign in, verified or not. A signed-in account lists and views only its own record. Only superusers update or delete accounts.
  - profiles: a signed-in account may create one Profile for itself, setting nothing but Username, owner and default Mode, and only under a Username that is not reserved. A partial unique index on owner keeps one Profile per Creator and leaves the ownerless imported Profiles valid. The owner lists and views their own Profile, and no one else can. Every owner comparison starts with "signed in", so an anonymous caller never matches an ownerless Profile. Only superusers delete Profiles.
- **Username rules.** Lowercase letters, digits and underscore, 3 to 30 characters, and unique. PocketBase's field pattern and unique index enforce this, not only the browser, and the field lowercases input as it is typed. Reserved: `api`, `edit`, `images`, `internal` and `netlify`, plus every other top-level path segment of 3 or more characters that the app routes, read from the app's routes at build time. The create rule carries one clause per reserved name.
- **Refusals.** If the claim fails, the Creator is already signed in and stays on the claim step with PocketBase's reason: taken, reserved, too short or too long, or a character outside the pattern. The message for a taken Username says that the Operator hands over Usernames held on v1 at Cutover (story 5). There is no separate availability lookup.
- **Phase 2's closed-API checks** change only where this ticket opens a rule. An anonymous sign-up now succeeds, and an anonymous list or view of profiles returns no record (an empty list or a refusal both pass). Every other check stays, "no response body holds a Destination" included.

ASSUMPTION: the landing page change is the button's target alone. Its "Powered by n8n & Git & Netlify" subtitle stays verbatim, and the target is v2's sign-up screen, whose path the test does not pin (rung 5: the smallest change that gives the button an owner; plan-review, Not yet specified). Overturned if the Operator wants new copy on the button; that is one line of the Page Copy. This ticket takes the button because it is the first to make sign-up exist.

ASSUMPTION (the spec's, evidence blocked): PocketBase lets an account with an unverified email sign in with its password. Overturned if the pinned version refuses it. As the spec says, the claim then moves to the first log-in after verification. This ticket records the refusal, and 26 arranges verification before log-in.

- [ ] At 390×844, a stranger signs up with a fresh email and Username and no invitation, and lands signed in on "verify your email" with "Resend email" and "Continue". Pressing Continue while unverified leaves them on that screen.
- [ ] In a fresh context, a Visitor on the landing page presses "Create Your Own Page" and lands on the sign-up screen. The landing page no longer links to the n8n Form.
- [ ] "Julia" typed into the Username field shows as "julia".
- [ ] `fixture` (taken, with the Cutover hand-over message), `edit` (reserved), `ab` (too short) and `bad.name` (invalid) are each refused with their reason. The Creator stays signed in on the claim step, then claims a valid Username and reaches the verify screen.
- [ ] Over HTTP, every reserved name is refused as a claim, each top-level route of 3 or more characters that the app serves included.
- [ ] Logging in again in a fresh context lands on the verify screen. A Creator whose claim failed and who logs in again lands on the claim step.
- [ ] At the public origin, `/api/collections/_superusers/auth-with-password` and `/api/realtime` answer 404, while the same Creator's calls through the proxy succeed.
- [ ] `./check.sh` passes, Phase 2's amended closed-API checks included.
