# Phase 03 — Login, register, Profile creation, add Links, Editor UI

**Objective.** An invited Creator can sign up, claim a Username and verify their email, then build their Profile and Links in a mobile-first Editor styled on the link.me Template. Every save is live on their v2 Profile, and only they can change it.

## Problem Statement

Today a Creator gets a Profile through the n8n Form. It is a chain of six forms that asks for a raw Username and rejects any avatar or background image that is not already `.webp` (it sends you to an outside converter). It says "Don't fuck up the JSON cause I didn't code in guardrails" above the Geo Rule box. Each submission costs several GitHub commits and a Netlify build. Anyone holding the form's URL can rewrite any Profile, because the form has no login (its trigger node carries no authentication setting) and nothing ties a Profile to a person. Creators cannot see their Links in one place, cannot reorder them, and cannot log in anywhere. A typo can break their page silently (weiwei.json is invalid JSON today).

## Solution

v2 gets its own Editor, on the same origin as the Profiles. The Operator invites a Creator by email. The Creator opens the sign-up screen and enters their email, a password and the Username they want. They then go through a short Onboarding: claim the Username, verify their email, fill in the Profile, add a first Link, and see the live address to paste into their bio.

After that they log in to the Editor, a phone-sized copy of link.me's "Edit Profile" screen. From it they can:

- change their display name, bio, avatar and default Mode
- add, edit, reorder and delete Links, each with a title, Destination, icon, background image, Adult flag, Mode and Geo Rule

Images upload as any common format and come out as webp. A save shows on the public Profile at the next page load. Email verification and password reset come from PocketBase. PocketBase's collection rules guarantee five things:

- only the owner can change a Profile or its Links
- only a Creator whose email is verified can put anything but a Username on a Profile
- no Visitor or other Creator can read a Destination through PocketBase's API; a Visitor receives one only through Reveal or the redirect, one Click at a time (ADR 0004)
- a Destination is an http(s) URL or a root-relative path, never a script
- Creators cannot give themselves the verified badge

## User Stories

Invitation and sign-up

1. As the Operator, I want to invite a Creator by adding their email address to an invite list in PocketBase's admin UI, so that only people I manage can create accounts.
2. As the Operator, I want an invite to need nothing more than the email address, so that inviting someone takes one row and no code.
3. As an invited Creator, I want to sign up on one screen with my email, a password and the Username I want, so that my account and my Profile's address are created together.
4. As someone who was not invited, I want sign-up to refuse me with "Sign-up is by invitation", so that I know to contact the Operator instead of retrying.
5. As a Creator signing up, I want to be told when my Username is taken, too short, uses characters other than lowercase letters, digits and underscore, or is a reserved word, so that I can pick a valid one.
6. As a Creator whose Username was refused after my account was created, I want to land on the claim-Username step and try again, so that a clash never leaves me with an account and no Profile.
7. As a Creator, I want to receive a verification email after sign-up, so that my account is tied to a mailbox I control and password reset reaches me.
8. As a Creator who has claimed a Username but not verified yet, I want Onboarding to pause on a "verify your email" screen with "Resend email" and "Continue" buttons, so that I can carry on once I have clicked the link.
9. As a Creator, I want the verification link to open a screen that says my email is verified, or that the link is invalid or expired with a way to resend, so that I know where I stand.
10. As a v1 Creator whose Profile came over in the v1 Import, I want the Operator to hand that Profile to my new account after Cutover, so that I edit my existing page instead of starting a new one and no later v1 Import overwrites my edits.

Login and session

11. As a Creator, I want to log in with my email and password on a screen that looks like the Editor, so that the product feels like one place.
12. As a Creator, I want to stay logged in on my phone until I log out, so that I do not have to type my password each time.
13. As a Creator, I want to log out, so that a shared or lost device cannot edit my Profile.
14. As a Creator whose session has expired, I want to be sent to the login screen and returned to the Editor afterwards, so that an expired token never looks like a broken save.
15. As a Creator who forgot my password, I want to request a reset email from the login screen and see the same "check your inbox" message whether or not the address has an account, so that I can recover my account without the screen revealing who is registered.
16. As a Creator, I want the reset link to open a screen where I set a new password and then log in with it, so that I regain access without the Operator.

Onboarding

17. As a new Creator, I want to go straight from sign-up into Onboarding, so that I am never dropped on an empty screen.
18. As a new Creator, I want the Profile step to ask for a display name (required), a bio, and an avatar in any image format I have (jpg, png, heic, gif or webp), so that I never need an outside converter.
19. As a new Creator, I want the first-Link step to use the same Link form as the Editor, so that I learn it once.
20. As a new Creator, I want the last step to show my Profile's address with "Open" and "Copy" buttons, so that I can check the page and paste the address into my Instagram or TikTok bio.
21. As a Creator who left Onboarding halfway, I want to resume at the first unfinished step when I log in again, so that I do not redo anything.
22. As a Creator who has finished Onboarding, I want login to land me in the Editor, so that I go straight to my Links.

Editor: Profile

23. As a Creator, I want to see my Profile's address at the top of the Editor with a copy button, as in the link.me Template's "Your Bio Link", so that I can always find it.
24. As a Creator, I want to change my display name and bio, so that my page stays current.
25. As a Creator, I want to change my avatar by uploading any common image format and have it come out as a 512px webp, so that the page stays fast and I never convert files myself.
26. As a Creator, I want to set my Profile's default Mode (Direct, Escape or Deeplink) under Quick Settings, where the link.me Template has its "Deeplink Banner" toggle, so that one choice covers the page-open Escape Overlay and every Link left on "Profile default".

Editor: Links

27. As a Creator, I want to see my Links in the order Visitors see them, so that the Editor matches my page.
28. As a Creator, I want "Add link" to open one form with title, Destination URL, icon, background image, Adult flag and Mode, so that adding a Link is one step.
29. As a Creator, I want to pick the Link's icon from the stock icons v1 offers (OnlyFans, link, Twitch, Instagram, none), so that my cards look like today's cards.
30. As a Creator, I want to upload a Link's background image in any common format and have it come out as a 1080px webp, so that I never convert files myself.
31. As a Creator, I want to replace or remove a Link's background image, so that I can change a card's look.
32. As a Creator, I want to set each Link's Mode to Profile default, Direct, Escape or Deeplink, with a new Link starting on Profile default, so that each Link leaves the In-App Browser the way I want.
33. As a Creator, I want an 18+ toggle on each Link that is independent of its Mode, so that an Adult Link puts the Age Gate in front of its Destination in any Mode.
34. As a Creator, I want to turn OnlyFans tracking on for a Link and give it a default Tracking Code, as the n8n Form lets me today, so that OnlyFans keeps crediting subscribers to my traffic sources.
35. As a Creator, I want to edit a Link's Geo Rule as raw JSON in a textarea prefilled with the current rule, so that I can set per-country Tracking Codes before a proper UI exists.
36. As a Creator, I want invalid Geo Rule JSON rejected with a message that leaves the Link unchanged, so that a typo can never break my page the way weiwei.json broke in v1.
37. As a Creator, I want to edit any field of an existing Link, so that I can fix a title or point it to a new Destination.
38. As a Creator, I want to move a Link up or down, so that my most important Link sits first.
39. As a Creator, I want to delete a Link after a confirmation, so that a mis-tap does not remove it.
40. As a Creator, I want every save to show on my public Profile at the next page load, without a build or commit, so that "live instantly" is true.
41. As a Creator, I want a failed save to show its reason and keep what I typed, so that I never lose input.
42. As a Creator, I want the Editor laid out for a phone first, so that I can manage my Profile from the same device I post from.

Ownership and safety

43. As a Creator, I want no one else to be able to change, add to, reorder or delete my Profile and Links, so that my page and my money are mine.
44. As a Creator, I want my Destinations readable through PocketBase's API only by me and the Operator, and absent from every public file and page payload, so that a Visitor gets one only through Reveal or the redirect at the moment of a Click and ADR 0004 holds for Links made in the Editor.
45. As the Operator, I want Creators unable to set or change their own verified badge, Username or ownership, so that the badge means I granted it and Profile addresses stay stable.
46. As the Operator, I want each Creator to own at most one Profile, so that Usernames are not hoarded.
47. As a Visitor, I want a Link that a Creator added in the Editor to look and behave like an imported Link (Mode, Age Gate, Reveal), so that new and old Profiles act the same.

Operator

48. As the Operator, I want to keep editing any Profile, Link or account in PocketBase's admin UI, so that I can fix or take over anything.
49. As the Operator, I want to set the SMTP sender once in PocketBase's settings, so that verification and reset emails come from my domain.
50. As the Operator, I want the n8n Form to be mine alone once Creators have the Editor, so that no Creator edits through a login-less form.
51. As the Operator, I want an account whose email is not verified unable to put anything but its Username on a Profile, so that someone who signs up with an invited address they do not control cannot publish on my domain.
52. As the Operator, I want a Destination refused unless it is an http(s) URL or a root-relative path, so that no Link can run script on the origin where Creators stay logged in.

## Implementation Decisions

- **Owns.**
  - **Editor client** (new): the Editor's screens. These are sign-up, log-in, forgot-password, verify-email confirmation, reset-password confirmation, Onboarding (claim Username → Profile → first Link → live address) and the Editor itself (Profile panel, Quick Settings, Links list, Link form).
  - **Editor route** (a change to Phase 2's app): serves the Editor client under one path prefix, `/edit`, matched before the Profile catch-all.
  - **PocketBase API proxy** (a change to Phase 2's app): forwards an allow-list of PocketBase's REST paths on the Profile origin, so the Editor reaches PocketBase same-origin.
  - **Auth-and-ownership migration** (a new PocketBase migration): the invite list, the sign-up rule, the owner read and write rules on Profiles and Links, the verified-email gate, the Destination check, Username validation, and the action URLs in the verification and reset emails.
  - **Spec** `03-auth-and-editor`.
- **Interfaces.**
  - **Editor client.** Exposes screens, not code. Its fixed URLs are the two that emails link to: `/edit/verify?token=…` and `/edit/reset?token=…`. Every other screen sits under `/edit` and is free to move.
  - **Editor route.** Adds the `/edit` prefix to the app.
  - **PocketBase API proxy.** Forwards `/api/collections/users/…`, `/api/collections/profiles/…` and `/api/collections/links/…` to PocketBase with method, headers and body unchanged. Every other path keeps Phase 2's answer. No other route changes.
  - **Auth-and-ownership migration.** Changes only rules, the invite list and validation on Phase 2's collections. It adds a field only where the "Schema" item below says so.
- **Schema.** The decision, trimmed. Field names follow Phase 2's, so "owner" means whatever relation Phase 2 gives a Profile to its Creator; D2 writes the rule as `user = @request.auth.id`.

  ```
  invites   email (unique, required)            every API rule: superuser only
  users     create: request email ∈ invites.email      view/update/delete: own record (PocketBase default)
  profiles  owner → users, unique (one Profile per Creator), optional (imported Profiles have none)
            username: ^[a-z0-9_]{3,30}$, unique, not a reserved name
            list/view: owner = self
            create: signed in AND owner = self AND the request sets only username and owner
            update: owner = self AND account verified AND username, owner, verified unchanged
            delete: superuser only
  links     list/view: the Link's Profile's owner = self
            create/update/delete: the Link's Profile's owner = self AND account verified;
                                  update cannot move a Link to another Profile
            destination: starts with https://, http:// or /
  ```

  Phase 2 closes every rule to superusers, and its app reads PocketBase as a superuser to render public Profiles (docs/spec/phase-02-vps-foundation.md:97, :107). Visitors therefore never touch these rules, and Phase 3 must open the owner read rules above: without them the Editor cannot list its own Links, and Phase 2's upload endpoint, which first views the target record with the caller's token (phase-02:232), refuses every Creator. PocketBase rules apply per record, not per field, so the links read rule is what keeps every Destination to its owner and superusers. If Phase 2 has not given Profiles an owner relation or a default Mode (ADR 0003), this migration adds them as optional fields. That change is additive, so the v1 Import stays valid.
  ASSUMPTION: Phase 2's collections carry the owner relation, the Profile default Mode and the Link fields named in the plan (secret url, mode, isAdult, geo, order). Overturned by Phase 2's spec naming them differently; the rule shapes above then bind to Phase 2's names.
- **Contracts.**
  - **Editor ↔ PocketBase.** PocketBase's REST API, same-origin, called with plain `fetch` (no SDK). The auth token is kept in `localStorage` and sent as the `Authorization` header. A 401 response sends the Creator to log-in, with a return path.
    Phase 2 does not route PocketBase through Caddy, and it leaves the public route to this Phase (phase-02, Caddy and Out of Scope). So the app proxies it (PocketBase API proxy), and no CORS has to be opened.
    - The allow-list holds the three collections the Editor calls, records and auth paths alike. Phase 4 adds `dailyStats`.
    - Everything else under `/api/` keeps Phase 2's answer: the app's own `/api/profiles/…`, `/api/files/…` and `/api/upload/…`, or 404.
    - So `_superusers`, `invites`, realtime, the admin UI and PocketBase's own file route are never public. PocketBase's `/api/files/{collection}/{record}/{file}` has the same shape as the app's file route, and since it is not proxied the two never collide.

    ASSUMPTION: an allow-list rather than all of `/api/collections/*` minus `_superusers`. Rung 4: a closed default; a blanket proxy would publish the superuser login, which Phase 2 keeps behind an SSH tunnel. Rung 5: no realtime, which no screen uses. Overturned if a later screen needs realtime or another collection; that Phase adds its path to the list.
  - **Editor ↔ Phase 2's image upload endpoint.** The Editor sends the raw file (jpg/png/heic/gif/webp) with the Creator's token and the target: their avatar, or one Link's background image. The endpoint stores the webp (avatar 512px, background 1080px, q80, per D4) and returns the stored image reference. The browser never converts images.
    The endpoint writes with the calling Creator's token, never the superuser's (observed: docs/spec/phase-02-vps-foundation.md:97, :233), so collection rules decide ownership (ADR 0002: "the Node app does not"), including the verified-email gate. The rules tests try a cross-owner upload.
  - **Stored values the Editor writes.**
    - Mode: `direct`, `escape_ig`, `deeplink`, or empty for "Profile default" (ADR 0003; Phase 2 stores an empty Link Mode as the Profile's default, docs/spec/phase-02-vps-foundation.md:123).
    - Destination: text starting with `https://`, `http://` or `/` (Phase 2 allows root-relative paths for imported Links, phase-02:124).
    - Adult: a boolean.
    - Geo Rule: a JSON object.
    - Icon: a webp file in Phase 2's `links.icon` file field (phase-02:128), which the v1 Import fills with v1's stock icon files byte for byte. The Editor sets a stock icon by sending that stock file (`/images/onlyicon.webp`, `/images/linkicon.webp`, `/images/twitchicon.webp` or `/images/igicon.webp`) to the upload endpoint with the Link's icon as target; "none" clears the field.
      ASSUMPTION: the v2 app keeps serving v1's stock icon files at those paths, since the public page is v1's index.html and script.js. Overturned if Phase 2 moves them; the Editor then reads them from the new place.
    - Order: a number for each Link.
  - **Email links.** PocketBase's verification and password-reset templates point at `{APP_URL}/edit/verify?token={TOKEN}` and `{APP_URL}/edit/reset?token={TOKEN}`. PocketBase's application URL is the public origin.
- **D9: sign-up is private and invite-only** (rung 4: opening sign-up later is additive, a rule change plus the public extras listed under Out of Scope, whereas spam from open sign-up can get the one shared domain Flagged, which cannot be undone). The invite list holds email addresses, and the users create rule admits only those addresses. PocketBase's unique email makes each invite single-use with no hook or code generation (rung 5).
  The Operator revokes an unused invite by deleting its row, and a used one by deleting the account, both in the admin UI.
  ASSUMPTION: D9 is answered "private / invite-only". Overturned by the Operator answering "public". Sign-up then opens to anyone, and the public-sign-up items under Out of Scope come back in. The plan calls D9 "Open question (blocks Phase 3 scope)" and orders Phase 3 "D9 first" (goal_ai.txt:101, :148), so this decision is needs-human (see Review) and Depends on lists the Operator's answer.
- **Content writes require a verified email; the Username claim does not.** Before verifying, an account may create its Profile with only a Username and itself as owner, which keeps "username claimed on signup" (plan §6). Every other write to a Profile or its Links, avatar and background uploads included, requires a verified account. The invite list says which address may sign up; verification proves the person signing up holds that mailbox, so someone who knows an invited address cannot publish on the shared domain (rung 4: a closed rule is cheaper to undo than content on a Flagged domain).
  ASSUMPTION: a bare Profile (Username only) reachable at `/{username}` before verification is harmless. Overturned if it is not; Profile create then also requires a verified account, and the claim moves to the first log-in after verification.
  ASSUMPTION (evidence blocked): if someone else signs up first with an invited address, the invitee regains the account through "Forgot password", which reaches the real mailbox, and PocketBase ends the other sessions when the password changes. No PocketBase binary is on this machine to check either. Overturned if the pinned version does neither; the Operator then deletes the account in the admin UI.
- **The sign-up sequence:** create the account → sign in → request verification → create the Profile with the chosen Username, which is the claim. If the claim fails (taken, reserved or invalid), the Creator is already signed in and lands on the claim step. PocketBase's unique index and validation reject the Username, and the Editor shows the reason. There is no separate availability lookup (rung 5). After the claim, an unverified Creator stops on the "verify your email" screen; "Continue" refreshes the session and moves on once PocketBase reports the account verified.
- **Username rules:** lowercase letters, digits and underscore, 3 to 30 characters. Input is lowercased as it is typed. All 26 parsing v1 Usernames already fit (observed: `ls linkme_clone3/api/profiles` gives names of 4 to 13 characters from `[a-z0-9_]`). The reserved names are `api`, `edit`, `images`, `internal` and `netlify`: every top-level path segment of 3 or more characters that v2 routes in any Phase (Phase 2's `/api/…`, v1's `/images/…` and Phase 2's `/netlify/*` 404; this Phase's `/edit`; Phase 5's `/internal/tls-ask`). Shorter segments, such as `r` and Phase 4's `v`, are already refused by the 3-character minimum, and names with a dot by the pattern. The rule is enforced in PocketBase, not only in the browser. PocketBase patterns are Go regular expressions with no look-ahead (phase-05, Schema), so the profiles create rule carries one `@request.body.username != "<name>"` clause per reserved name; the update rule already keeps the Username unchanged. This Phase owns the list. A later Phase that adds a top-level route of 3 or more characters adds its clause in an additive migration.
  ASSUMPTION: `internal` is reserved here, ahead of Phase 5's route, so the list has one owner (rung 4: a reserved name is cheap to release, a claimed one is not). Overturned if Phase 5 renames its route; the clause follows the name.
  ASSUMPTION: no dot in Usernames, so `/{username}` never collides with a file such as `/landing.html`. Overturned if the Operator wants dotted Usernames (Instagram allows them); the reserved-name check would then have to cover file names too.
- **A Creator cannot change their Username, delete their Profile or edit the verified badge.** The Operator does these in PocketBase's admin UI (rung 4: a Username change breaks every bio that links to it; the badge is only meaningful if the Operator grants it). Following "nothing more" in plan §6, the Editor shows no verified control.
  ASSUMPTION: the verified badge is the Operator's alone, although the n8n Form lets whoever fills it tick "verified" today. Overturned if the Operator wants Creators to keep self-verifying.
- **One Profile per Creator** (rung 5; CONTEXT.md's Profile entry already assumes this).
  ASSUMPTION: no Creator runs several Profiles. Overturned by agency-style accounts, which would drop the unique owner.
- **"Publish" is the last Onboarding screen, not a state.** A Profile is public as soon as it exists, as D2 and §6 require ("live instantly"). The publish step shows the live address with Open and Copy (rung 5: no published field and no change to Phase 2's public page). Onboarding progress is derived, not stored: no Profile → claim step; account not verified → verify screen; no display name → Profile step; no Link → first-Link step; otherwise the Editor. A handed-over imported Profile therefore lands in the Editor.
  ASSUMPTION: a half-onboarded Profile being publicly reachable is harmless under invite-only. Overturned if Profiles must stay hidden until the Creator publishes; that adds a published flag that Phase 2's public page checks.
- **v1 Creators' imported Profiles are handed over after Cutover.** Phase 2's v1 Import upserts with v1 winning and is re-run before Cutover, and Phase 5 runs a final one (observed: docs/spec/phase-02-vps-foundation.md:253; docs/spec/phase-05-cutover-and-domains.md:144, :199). A Profile edited in the Editor before then would be overwritten. So the Operator sets an imported Profile's owner in PocketBase's admin UI only after the final v1 Import, and until then edits v1 Creators' pages through the n8n Form as today. If such a Creator signs up earlier and tries their old Username, they see "This Username is taken. If it was yours on v1, ask the Operator to hand it over", and stay on the claim step without a Profile, so the hand-over still fits one Profile per Creator (rung 4: no code; rung 5: no claim-by-invite logic).
  ASSUMPTION: the Operator moves v1 Creators by hand, after Cutover. Overturned if there are too many to do by hand, or if they must use the Editor before Cutover; the v1 Import then has to skip Profiles that have an owner.
- **The Editor is static vanilla HTML/CSS/JS with no build step and no new dependency.** This matches v1's `linkme_clone3` (rung 3). Creator-entered text is always rendered as text, never as HTML, as v1's `script.js` does at lines 124–125 and 155 (rung 3).
- **The layout copies the link.me Template's "Edit Profile" screen, phone-first, and nothing more** (plan §6). The parts kept:
  - "Your Bio Link" with a copy button
  - Change Profile Picture
  - display name, @Username (read-only) and bio
  - "Quick Settings": the "Deeplink Banner" row becomes the Profile default Mode selector
  - "Featured Links": one row per Link, with a reorder control where the drag handle sits and a delete button
  - "Add link"
  - "Age Gate", which becomes the per-Link 18+ toggle inside the Link form

  The log-in and sign-up screens reuse the Editor's look, because there is no log-in or sign-up template to copy: `link.me/signup/ref/*.html` is a paid-plan upsell page (observed). Every other Template section is cut (see Out of Scope).
- **Reorder is done with up/down buttons that rewrite Link order** (rung 5: drag-and-drop does not work with touch without a library or custom touch code).
  ASSUMPTION: buttons are acceptable in place of the Template's drag handle. Overturned if the Operator wants touch drag-and-drop.
- **A Link's Mode may be left on "Profile default", which stores no Mode.** Phase 2 reads an empty Link Mode as the Profile's default (observed: docs/spec/phase-02-vps-foundation.md:123), as CONTEXT.md's "a Profile has a default Mode that its Links inherit" says. The Link form's Mode selector offers "Profile default (currently …)", Direct, Escape and Deeplink. Changing the Profile default moves every Link left on it, imported Links with no Mode included.
  ASSUMPTION: a new Link starts on "Profile default" rather than on a copy of today's default (rung 3: Phase 2 and the imported Links already work this way). Overturned if the Operator wants new Links fixed at the default of the day; the form then preselects the concrete Mode.
- **OnlyFans tracking and the default Tracking Code are fields in the Link form.** The plan's §6 list of Link fields leaves them out. v1 has both (the n8n Form's "click if its OF link" checkbox and `default_tracknumber`), and D5 keeps the `/c{code}` suffix. Leaving them out would lose attribution on every Link made in the Editor.
  ASSUMPTION: Phase 2's links collection keeps v1's tracking flag and default Tracking Code, because its "serves every existing profile identically" DONE needs them. Overturned if Phase 2 folds both into the Geo Rule; these two inputs are then dropped and the textarea covers them.
- **The Geo Rule textarea is checked in the browser and stored in PocketBase as JSON.** It must parse as a JSON object, or be empty for "no Geo Rule". Any other input blocks the save with a message. There is no deeper schema check (rung 5; plan: "raw JSON textarea (no UI yet)").
- **The Destination is editable by its owner, and must start with `https://`, `http://` or `/`.** The Editor shows it in the Link form. PocketBase's links rules enforce the prefix. The page script hands a revealed Destination to `window.location.href` (v1 `script.js`:108–109 call `performBounce`, which sets it at line 40), and the Editor keeps the Creator's token in `localStorage` on that same origin, so a `javascript:` Destination would run script there against any Creator who taps it. The Editor does not pre-check the prefix; it shows PocketBase's refusal (rung 5: one check, at the boundary).
  ASSUMPTION: Phase 2 stores the Destination in a field the owner can read under a rule. Overturned if Phase 2 makes it a superuser-only hidden field; the Editor then treats the Destination as write-only ("leave blank to keep the current one").
- **Mail.** SMTP is the Operator's credential and is set by hand in PocketBase's settings, never in the repo (`# manual:` in Acceptance). Local runs have no mail server.
  ASSUMPTION (evidence blocked): with no SMTP configured, PocketBase still answers the verification and reset requests with success and only fails the delivery. No PocketBase binary or image is on this machine to check this: `which pocketbase` finds nothing, and `docker images` shows no PocketBase or mail-catcher image. Overturned if PocketBase returns an error. The local stack then needs a mail catcher, which is an image pull that is parked for the human (for example `docker pull axllent/mailpit`).
- **n8n becomes Operator-only with no change to n8n by this Phase.** n8n is a live system on the VPS (floor 2), and D1 says "n8n stays as is". The Operator stops giving the n8n Form URL to Creators and turns on the form trigger's Basic Auth by hand (`# manual:`).

## Testing Decisions

One seam: **the running v2 stack at Playwright's `baseURL`**, driven by one spec, `tests/e2e/03-auth-and-editor.spec.ts`. That stack is Phase 2's local Docker Compose stack plus its seed, used as the `webServer` (plan §7). No new test runner and no unit-test seam (rung 3: the existing `./check.sh` → `npx playwright test` loop).

- **Creator journeys** run in Playwright's browser at a phone-sized viewport and assert only what the Creator or a Visitor sees. The Visitor side always runs in a fresh browser context with no Editor session.
- **Operator actions and rule checks** use Playwright's `request` fixture, which is the same seam at the HTTP level. Acting as a second Creator or anonymously goes through the same origin, the way the Editor does. Superuser steps, such as adding an invite (what the admin UI does) or marking an account verified, go to PocketBase's loopback port, as Phase 2's tests arrange state, because the proxy forwards neither `_superusers` nor `invites`. The rules have no UI that would let a non-owner even try, so HTTP is the highest seam that reaches them.
  ASSUMPTION: the local stack's seed creates a local-only PocketBase superuser, whose credentials the spec reads from environment variables with local defaults. Overturned if Phase 2's seed already provides another Operator path; the spec uses that one instead. If Phase 2 provides none, Phase 3 adds the superuser to the seed, local only.
- **Every run uses unique email addresses and Usernames** (a timestamp suffix), so that tests in one run never collide. Phase 2's wrapper starts a fresh stack for each run and removes it with `down -v` (`reuseExistingServer: false`, phase-02, Test loop), so nothing carries over between runs.
- **Images** are built in the test as an in-memory PNG and passed with `setInputFiles`. This needs no fixture file and proves that a non-webp input comes out as webp.
- **Mail-less.** The spec asserts what the Creator sees, and that PocketBase accepts the verification, resend and reset requests. It opens the verify and reset screens with a bad token and expects the "invalid or expired" message. The real email round trip is `# manual:` (it needs the Operator's SMTP).
  ASSUMPTION: tests cannot receive email tokens locally, so the happy paths of the verify and reset confirmation screens are checked by hand. Overturned once a local mail catcher exists; the spec would then follow the real links.
- **Screenshot.** The spec saves a screenshot of the finished Editor to `.scratch/goal_ai/shots/03-auth-and-editor.png` (plan §7, step 2).

Behaviours the spec covers:

1. An address not on the invite list is refused sign-up with the invitation message.
2. Tracer bullet, which is the plan's DONE:
   - the Operator invites an address, and the Creator signs up with a new Username, which is claimed
   - Onboarding pauses on "verify your email". While unverified, the Creator's token can neither update the Profile nor add a Link over HTTP. The test then marks the account verified as a superuser (the stand-in for the email link) and presses "Continue".
   - Onboarding: display name and PNG avatar, then a first Link with title, Destination, stock icon, PNG background, Adult on, Escape Mode, OnlyFans tracking on and a Geo Rule, then the live-address screen
   - in a fresh browser context, the public `/{username}` shows the display name and the Link title, both images are served as webp, and the Link's entry in the page payload carries `escape_ig` and Adult
   - the Destination string appears nowhere in that page's HTML or its network responses before the Link is tapped
   - tapping the Link shows the Age Gate; "Continue (18+)" calls Reveal, whose real answer begins with the Destination entered (the navigation itself is intercepted, as in `00-smoke.spec.ts`)
   - on `/{username}/geo` with an injected Visitor country that the Geo Rule names, the revealed Destination carries that country's Tracking Code
3. A taken Username, a reserved one (`edit`) and an invalid one (`Bad.Name`) are each refused. The Creator stays on the claim step and can claim a valid one.
4. In the Editor, the Creator does each of these and the public Profile shows the result on the next load:
   - edits a Link title
   - adds a second Link and moves it up
   - deletes a Link after confirming
   - changes the Profile default Mode; a new Link's form then starts on "Profile default" naming the new Mode
5. Invalid Geo Rule JSON shows an error and leaves the Link unchanged. Valid JSON saves.
6. Log out sends the Creator to log-in. Logging in again lands in the Editor. A Creator who logs in in the middle of Onboarding resumes at the right step. With the stored token replaced by an invalid one, a save sends the Creator to log-in, and logging in returns them to the Editor.
7. "Forgot password" shows the same "check your inbox" message for a known and an unknown address. The verify and reset screens reject a bad token.
8. A Link saved with a `javascript:` Destination is refused by PocketBase. The Editor shows the reason and keeps every field as typed.
9. Hand-over: as a superuser, the test creates an ownerless Profile with a display name and a Link, as the v1 Import does, and sets its owner to a fresh verified Creator. That Creator's log-in lands in the Editor on that Profile.
10. Rules, over HTTP. After every refused write, the owner reads the record back unchanged:
   - another Creator cannot update the first Creator's Profile, nor update, delete or add a Link to it
   - neither Creator can move a Link onto the other's Profile
   - another Creator and an anonymous caller get no Destination from a list, a view, or a Profile read that expands its Links
   - another Creator cannot replace the first Creator's avatar or a Link's background through the upload endpoint
   - a Profile created with the verified badge set is refused, and the owner cannot change their own Username, owner or verified badge afterwards
   - a Destination that does not start with `https://`, `http://` or `/` is refused
   - a second Profile for the same Creator is refused
   - at the public origin, `/api/collections/_superusers/auth-with-password` and `/api/collections/invites/records` answer 404, while the same Creator's calls through the proxy succeed

Prior art: `tests/e2e/00-smoke.spec.ts`. It tests through a real browser against the local server, uses a fake User-Agent and route interception, and finds elements by role and visible text.

## Acceptance

```sh
cd "$(git rev-parse --show-toplevel)"
test -f tests/e2e/03-auth-and-editor.spec.ts
npx playwright test tests/e2e/03-auth-and-editor.spec.ts
test -s .scratch/goal_ai/shots/03-auth-and-editor.png
# manual: Operator enters the SMTP sender (host, port, user, password, from-address) in PocketBase admin UI -> Settings -> Mail on the VPS; a human-held credential, never committed.
# manual: with SMTP set, invite a real inbox, sign up, click the verification link (screen says verified), then "Forgot password" -> follow the email link -> set a new password -> log in with it.
# manual: on a real iPhone (Safari) and Android phone (Chrome), complete Onboarding using a camera photo (HEIC on iOS) as avatar and background; the public Profile shows both as webp.
# manual: n8n becomes Operator-only: stop sharing the n8n Form URL with Creators and turn on Basic Auth on its "On form submission" trigger in n8n on the VPS.
# manual: after Cutover's final v1 Import (Phase 5), for each v1 Creator, set their imported Profile's owner to their new account in PocketBase admin UI.
./check.sh
```

## Depends on

- **The Operator's answer to D9** (plan D9: "Open question (blocks Phase 3 scope)"). This spec proceeds on invite-only; see Review, needs-human.
- **Phase 2**:
  - PocketBase with the users, profiles and links collections, its admin UI and its email (verify/reset) machinery
  - the app container that serves public Profiles at `/{username}` reading PocketBase as a superuser, the image upload endpoint (any format → webp, written with the caller's token) and the Reveal and redirect behaviour
  - Caddy routing
  - the local Docker Compose stack plus seed, which `playwright.config.ts` uses as its `webServer`
- **Phase 1**: the three Mode values and what each does on the public page, carried into v2 by Phase 2. The Editor only writes the values.
- **Phase 0**: nothing directly. Its random Link Ids and the "no Destination in public files" rule (ADR 0004) carry into v2 through Phase 2, and this Phase's tests re-check that rule for Links made in the Editor.

## Out of Scope

- **Extras that only public sign-up needs** (content rules, abuse reporting, captcha and sign-up rate limits). Not needed while sign-up is invite-only (D9 above). They come back in if the Operator answers D9 "public".
- **A Geo Rule UI.** The plan calls for a raw JSON textarea, "no UI yet"; the UI is listed under Bonus.
- **Stats, and the Template's analytics screen.** Phase 4.
- **A Custom Domain field and Spare Domain handling in the Editor.** Phase 5 / D6. The Editor runs on the origin PocketBase's application URL names.
- **Proxies.** D7 is a bonus, after Phase 5.
- **Every Template section beyond the ones kept above.** This covers Shouts and Media, Gallery, Products, Events, Forms, Tracking Pixels, Link Scheduler, Music Smart Link, Social Grid, Video Feeds, Carousel, headers, fonts and colours, video profile, follower count, the QR code, the AI assistant and the Pro upsell. Plan §6 says "nothing more".
- **A copy button for Link Shortcuts (`?link=`).** The plan does not ask for it in Phase 3, and v1 behaviour for these is unchanged.
- **Changing your own Username, and deleting your own Profile or account.** Both break shared links. The Operator does them in PocketBase's admin UI.
- **Uploading a custom icon.** Stock icons only, as the n8n Form offers today.
- **Converting images in the browser.** D4 puts conversion in the app container.
- **Social login, magic links and 2FA.** The plan specifies email and password.
- **An invite screen and sending invite emails.** PocketBase's admin UI is the Operator's tool, and the Operator sends the sign-up address to the Creator through their own channel.
- **Any change to n8n or to v1 (GitHub/Netlify).** n8n is live and "stays as is" (D1). The Editor edits v2 only.
- **Real-device In-App Browser tests.** That matrix belongs to Phase 1's DONE and RUN.md. This Phase only adds the manual phone check in Acceptance.
- **Login rate limiting or lockout beyond PocketBase's own defaults.** There are few accounts and every one is invited. This comes back in with public sign-up.

## Further Notes

- **D9 may be escalated to the human.** It is decided above as invite-only and flagged. It is needs-human (see Review). Every part of the design that depends on it sits in the users create rule (one line). Switching to public means opening that rule and bringing back the public-sign-up Out of Scope items; the verified-email gate on content writes is already in place.
- **Gap between this Phase and Cutover.** Editor saves go to v2. ofl.ink keeps serving v1 until Phase 5. Until then, a Creator's Editor edits show only on v2's own address, and live v1 edits still go through the Operator's n8n Form. This is the plan's own sequencing (D1, Phase 5). It is recorded here, not reopened. Imported Profiles are handed to their Creators only after Cutover's final v1 Import, so the two write paths never touch the same Profile.
- **PocketBase behaviours this spec relies on but could not observe**, because no PocketBase binary or image is on this machine and network fetches are out of bounds. Each is flagged where it is used:
  - a mail-less request still succeeds
  - unverified accounts can sign in
  - collection rules can read the request body and other collections, including a superuser-only one
  - a create rule can tell which fields the request sets
  - a password change ends the account's other sessions
  - unique indexes give a readable validation error

  The exact rule syntax depends on the PocketBase version Phase 2 pins. The rule shapes in "Schema" state the intent, not the syntax.
  ASSUMPTION (evidence blocked): an unverified PocketBase account can authenticate with its password by default. Overturned if the pinned version blocks it; the claim then moves to the first log-in after verification, and the tracer-bullet test marks the account verified through the superuser API before logging in.

## Review

Reviewer: codex (`codex exec --sandbox read-only`, reasoning effort high), 2026-10-02. Two calls on a workspace blind to `docs/spec/` and to `linkme_clone3/`: B = the blind call (before the draft), D = the draft call. Claims were checked against the real repo read-only, including the other Phase specs.

Blind call

- **B1** D9 is an open question that "blocks Phase 3 scope" (goal_ai.txt:101, :148), so the Phase is not ready for unattended implementation. **needs-human**: the same objection as D1, settled there.
- **B2** "Private" could mean Operator-provisioned accounts handed to Creators rather than invited self sign-up. **reject**: the plan's DONE is "new user signs up" and its login definition is "username claimed on signup" (goal_ai.txt:154, :173). Both require self sign-up.
- **B3** The spec must choose between draft-then-publish and immediately live. **reject**: already chosen and flagged under "'Publish' is the last Onboarding screen, not a state".
- **B4** Choose how the Editor reaches data (Creator-token PocketBase calls or the Node app) and how public rendering omits Destinations. **partial**: the path was already Creator-token REST. Reconciling showed that Phase 2 closes every rule to superusers (docs/spec/phase-02-vps-foundation.md:107), while the draft said Phase 3 "changes none of Phase 2's read rules". The Editor could not have listed its own Links. Schema now opens owner list/view rules. Public rendering reads as a superuser and never sends a destination (phase-02:97, :171), so it needs no change.
- **B5** Decide whether a Link copies the Profile's default Mode or inherits it, and say what a change of default does to existing Links. **accept**: Phase 2 stores an empty Link Mode as "the Profile's default" (phase-02:123), which fired this spec's own overturn clause. Rewritten: the Mode selector gains "Profile default", new Links start on it, and the Stored values and behaviour 4 follow.
- **B6** A guided Onboarding and a single Editor with completion steps are both possible. **reject**: the plan names the sequence "claim username -> profile -> first link -> publish" (goal_ai.txt:150), which is a constraint.
- **B7** Missing access-state contract: what unverified accounts may do, verification and reset failures, invite binding, expiry and revocation, and public-access extras. **partial**: unverified permissions and binding are rewritten (see D2). Revocation is added (the Operator deletes the invite row or the account). Invalid or expired verify and reset links were already covered (stories 9 and 16, behaviour 7). Invite expiry is rejected as YAGNI, since a unique email already makes an invite single-use. The public extras hang on D9.
- **B8** Username and Profile lifecycle: normalisation, reserved paths, concurrent claims, renames, abandoned claims, one or many Profiles, and imported identities. **reject**: each is already decided. Usernames are lowercase `[a-z0-9_]{3,30}` with reserved route names, the unique index settles concurrent claims, Creators cannot rename, there is one Profile per Creator, and imported Usernames stay held by their imported Profiles. Abandoned claims are Operator admin-UI work.
- **B9** The permission matrix is incomplete: Link reparenting, ownership fields, files, user records, expand and realtime. **partial**: owner read rules are now explicit, and behaviour 10 adds Profile updates by another Creator, Link moves between Profiles, and reads that expand a Profile's Links. Reparenting and ownership were already in the rules. Users stay own-record (PocketBase default). Avatars and backgrounds are public images by design.
  ASSUMPTION (evidence blocked): realtime and expand apply the same list/view rules. Overturned by a PocketBase version where they do not; behaviour 10 then adds a realtime subscription check.
- **B10** Validation and failed-save behaviour: Destination schemes, field lengths, Geo Rule schema, concurrency. **partial**: the Destination scheme is accepted. v1 hands a revealed Destination to `window.location.href` (linkme_clone3/script.js:108–109 → :40), and the Editor's token sits in `localStorage` on the same origin. A Destination must now start with `https://`, `http://` or `/`, enforced in PocketBase (story 52, behaviours 8 and 10). Field lengths and a Geo Rule schema are rejected under rung 5 ("raw JSON textarea (no UI yet)", goal_ai.txt:152). Concurrency is rejected: one owner per Profile.
- **B11** Upload contract: size limits, malformed files, animation, crop, ownership, cleanup, and whether the icon is an upload. **partial**: the icon is settled. Phase 2 stores it as a webp file (phase-02:128), so the Editor sends the stock icon file to the upload endpoint. Size limits, animation, orientation and fit are Phase 2's endpoint decisions (phase-02:235). Ownership is covered by D6.
- **B12** Mobile usability: touch and keyboard reorder, labels, pending and saved states, preview. **reject**: up/down buttons work by touch and keyboard, "Open" previews the page, and a failed save shows its reason. Role and text locators (as in tests/e2e/00-smoke.spec.ts:23, :46) force labelled controls. Pending states are polish.
- **B13** The v1/v2 hand-off: v1 edits made after the import, and which side is authoritative before Cutover. **accept**: Phase 2's import upserts with "v1 wins" and is re-run (phase-02:253), and Phase 5 runs a final one (docs/spec/phase-05-cutover-and-domains.md:144, :199). A Profile handed over before then would lose its Editor edits. Rewritten: imported Profiles are handed over only after Cutover's final v1 Import. Story 10, the decision, the Acceptance manual line and Further Notes follow.
- **B14** Seams: an independent Visitor browser, local mail capture, unchanged state after refused writes, and actual output format and size. **partial**: a fresh Visitor context and unchanged-state read-backs are accepted (Testing Decisions, behaviour 10). Mail capture stays parked, because a mail-catcher image pull is floor 2. Output dimensions belong to Phase 2's DONE ("any image upload comes out as webp", goal_ai.txt:146).
- **B15** Test each Mode with Adult on and off; the Fixture Profile does not guarantee Deeplink. **partial**: one Editor-made Link is now followed end to end (D5). The full Mode × Adult matrix is Phase 1's real-device DONE and Phase 2's parity tests (goal_ai.txt:133, :145), since this Phase only writes values.
- **B16** The harness cannot yet supply evidence: it starts dev-server.mjs on Desktop Chrome, takes screenshots only on failure and reuses servers. **reject**: Phase 2 replaces the webServer (tests/dev-server.mjs:3, Depends on). The spec sets a phone viewport and saves an explicit screenshot.
- **B17** Name the falsifiers: self-service scope, rule isolation, Phase 2 foundation, and loss of import or v1 edits. **partial**: rule isolation is behaviour 10, and loss of v1 edits is fixed by B13. A sign-up taking an imported Username is blocked by the unique Username (behaviour 3). The flagging falsifier targets a claim this spec never makes.

Draft call

- **D1** D9 is treated as decided although the plan leaves it open and says it blocks Phase 3 (goal_ai.txt:101, :148). **needs-human**. The spec decided invite-only on rung 4: opening sign-up later is one rule, whereas spam on the one shared domain can get it Flagged, which cannot be undone. The verified-email gate now in place makes a later switch cheaper still. The reviewer holds that the plan reserves D9 for the Operator ("D9 first") and that an ASSUMPTION is not that decision. Only the Operator's public/private answer settles it, and no repo evidence can. Depends on now lists it.
- **D2** The invite list does not prove the person signing up holds the invited mailbox, so anyone who knows an invited address can sign up and edit. Behaviour 1 only tries an unlisted address. **accept**: content writes now require a verified account. The Username claim alone is allowed before verification, to keep "username claimed on signup". The decision "Content writes require a verified email" replaces "Writes are not gated", and story 51 and behaviour 2 test it.
- **D3** The Profile create rule lets a Creator set `verified: true` at creation. **accept**: create may now set only username and owner (Schema), and behaviour 10 tries a create with the badge set.
- **D4** Story 44 ("never by a Visitor … through any page or API") forbids the Reveal that ADR 0004 and CONTEXT.md require. **accept**: story 44 and the Solution now restrict Destination reads through PocketBase's API and public files, with Reveal and the redirect as the one Click-time path.
- **D5** Acceptance passes while every Editor-made Link is unusable, because no test follows one. **accept**: behaviour 2 now taps the new Adult Link in a fresh Visitor context: the Age Gate shows, Reveal's real answer begins with the entered Destination, the page payload carries `escape_ig`, and `/geo` with an injected country carries the Geo Rule's code.
- **D6** The upload fallback (check ownership, then write as superuser) weakens ADR 0002, and no test tries a cross-owner upload. **accept**: Phase 2 already writes with the caller's token (phase-02:97, :233), so the fallback is deleted from Contracts. Behaviour 10 tries a cross-owner avatar and background upload.
- **D7** Stories 14, 41, 10, 34–35, 43 and 45 have no seam test. **accept**: behaviour 6 covers an expired token (14), behaviour 8 a server-refused save that keeps input (41), behaviour 9 the hand-over (10), behaviour 2 tracking and the Geo Rule (34–35), and behaviour 10 cross-owner Profile updates and Link moves (43, 45).
- **D8** The Phase 2 webServer dependency is appropriate though not yet verifiable here, and keeping attribution and an Operator-only n8n is not scope creep (playwright.config.ts:11, tests/dev-server.mjs:3, goal_ai.txt:92, :154). **reject**: this is not an objection, so nothing changes.

### Six hats

Six thinking hats on the whole Phase set, 2026-10-02, reconciled in the plan review. Labels follow docs/spec/plan-review.md (W white, R red, K black, Y yellow, G green, U blue). "Owner" is the one Phase that holds the decision.

- **W5** (reserved Usernames are assigned piecemeal across Phases 2–5, and no spec says how the list is enforced) **accept**, owner here. Username rules now list `api`, `edit`, `images`, `internal` and `netlify`, enforce them as one create-rule clause per name (PocketBase patterns have no look-ahead), and make this Phase the list's one owner. `r` and Phase 4's `v` are already refused by the 3-character minimum.
- **W10** (unique test addresses were justified by `reuseExistingServer`, which Phase 2 turns off, with `down -v`) **accept**. The reason is rewritten; the practice stays, for tests within one run.
- **K4 / G7** (the public PocketBase route is unowned; the app's `/api/files` shares PocketBase's path shape; a blanket proxy publishes `_superusers`) **partial**, owner here. Accepted: this Phase owns the proxy (Owns, Interfaces, Contracts), and superuser steps in tests move to PocketBase's loopback port. Changed from the suggestion: an allow-list of `users`, `profiles` and `links` rather than all of `/api/collections/*` minus `_superusers`, and no `/api/realtime`, which no screen uses (rungs 4 and 5, flagged). Behaviour 10 checks that `_superusers` and `invites` answer 404 at the public origin.
- **K7** (case twins) **accept**, owner Phase 2. No change here: with capitalised twins skipped, every imported Username fits this Phase's lower-case pattern.
