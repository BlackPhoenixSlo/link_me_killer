# Phase 03 — Login, register, Profile creation, add Links, Editor UI

**Objective.** Anyone holding the sign-up link can create an account, claim a Username, verify their email and build their Profile and Links in a phone-first Editor styled on the link.me Template. Every save is live on their v2 Profile at the next page load, and PocketBase's collection rules let only them change it.

## Problem Statement

A Creator cannot sign up for ofl.ink, cannot log in and cannot change their own Profile.

Today a Profile exists only if someone fills in the n8n Form. That is a chain of eight form pages (`n8n_oflink_Feb18.json`: one form trigger and seven form nodes). It asks for a raw Username and refuses any avatar or background that is not already `.webp` ("upload avatar .webp"). Its Geo Rule box is labelled "Don't fuck up the JSON cause I didn't code in guardreals". Each submission costs several GitHub commits and a Netlify build. The form's trigger has no authentication setting, so anyone holding its URL can rewrite any Profile, and nothing ties a Profile to a person. A Creator cannot see their Links in one place or reorder them, and a typo can break a page silently (`weiwei.json` does not parse today).

Phase 2 gives v2 a database, file storage and an admin screen, but only the Operator can use them. v2 has no sign-up, no log-in and no screen where a Creator edits anything. The Operator wants friends to register themselves from a link the Operator shares (plan §0: "option for people to register on my site"; §9 D9: public sign-up, no invite list).

## Solution

v2 gets its own Editor at `/edit`, on the same origin as the Profiles. Anyone with the link opens the sign-up screen and enters an email, a password and the Username they want. Onboarding then takes them through five steps:

1. claim the Username
2. verify the email
3. fill in the Profile
4. add a first Link
5. see the live address, with Open and Copy, to paste into their Instagram or TikTok bio

From then on, logging in lands them in the Editor, a phone-sized copy of the link.me Template's "Edit Profile" screen. In it the Creator can:

- change their display name, bio, avatar and the Profile's default Mode
- add, edit, reorder and delete Links. Each Link has a title, a Destination, an icon, a background image, an Adult flag, a Mode, OnlyFans tracking with a default Tracking Code, and a Geo Rule written as raw JSON

Images upload in any common format and come out as webp. A save shows on the public Profile at the next page load, with no build and no commit. PocketBase sends the verification and password-reset emails. PocketBase's collection rules guarantee five things:

- only the owner can change a Profile or its Links
- an account whose email is not verified can claim a Username and nothing more, so a stranger cannot publish on the shared domain before proving they hold the mailbox
- no Visitor and no other Creator can read a Destination through PocketBase's API. A Visitor gets one only through Reveal or the redirect, one Click at a time (ADR 0004)
- a Destination is an http(s) URL or a root-relative path, never a script
- only the Operator can change the verified badge, the Username or ownership

A v1 Creator does not start over. Once they have an account, the Operator hands them their imported Profile by setting its owner in PocketBase's admin UI.

## User Stories

Sign-up and verification

1. As anyone the Operator has sent the sign-up link, I want to create an account on one screen with my email, a password and the Username I want, without an invitation, so that my account and my Profile's address are made together.
2. As a Creator signing up, I want the Username I type to be lowercased as I type it, so that "Julia" becomes "julia" instead of an error.
3. As a Creator signing up, I want to be told when my Username is taken, is shorter than 3 or longer than 30 characters, uses anything but lowercase letters, digits and underscore, or is a reserved word, so that I can pick a valid one.
4. As a Creator whose Username was refused after my account was made, I want to land, signed in, on the claim step and try again, so that a clash never leaves me with an account and no way forward.
5. As a v1 Creator who tries my old Username, I want the refusal to say that the Operator hands over Usernames held on v1, so that I ask for mine instead of claiming a second, empty Profile.
6. As a Creator, I want a verification email as soon as my account exists, so that my account is tied to a mailbox I control and a password reset can reach me.
7. As a Creator who has claimed a Username but not verified, I want Onboarding to wait on a "verify your email" screen with "Resend email" and "Continue" buttons, so that I can carry on once I have followed the link.
8. As a Creator, I want the verification link to open a screen that says either that my email is verified, or that the link is invalid or expired with a way to resend it, so that I know where I stand.
9. As the Operator, I want an account whose email is not verified to be unable to put anything but its Username on a Profile (no display name, bio, avatar, Link or image), so that a stranger cannot publish on the shared domain from an address they do not control.

Log-in and session

10. As a Creator, I want to log in with my email and password on a screen that looks like the Editor, so that the product feels like one place.
11. As a Creator, I want to stay logged in on my phone until I log out, so that I do not type my password every time.
12. As a Creator, I want to log out, so that a shared or lost phone cannot change my Profile.
13. As a Creator whose session has expired, I want a save to send me to log-in and then back to the Editor, so that an expired session never looks like a broken save.
14. As a Creator who forgot my password, I want to ask for a reset email from the log-in screen and see the same "check your inbox" message whether or not the address has an account, so that I can recover my account while the screen reveals nothing about who has one.
15. As a Creator, I want the reset link to open a screen where I set a new password and then log in with it, so that I regain access without the Operator.

Onboarding

16. As a new Creator, I want to go straight from sign-up into Onboarding, so that I am never dropped on an empty screen.
17. As a new Creator, I want the Profile step to ask for a display name (required), a bio, and an avatar in any image format I have (jpg, png, heic, gif or webp), so that I never need an outside converter.
18. As a new Creator, I want the first-Link step to use the same Link form as the Editor, so that I learn it once.
19. As a new Creator, I want the last step to show my Profile's address with "Open" and "Copy" buttons, so that I can check the page and paste the address into my Instagram or TikTok bio.
20. As a Creator who left Onboarding halfway, I want to resume at the first unfinished step when I log in again, so that I redo nothing.
21. As a Creator who has finished Onboarding, I want log-in to land me in the Editor, so that I go straight to my Links.

Editor: Profile

22. As a Creator, I want my Profile's address at the top of the Editor with a copy button, like the link.me Template's "Your Bio Link", so that I can always find it.
23. As a Creator, I want to change my display name and bio, so that my page stays current.
24. As a Creator, I want to change my avatar by uploading any common image format and have it come out as a 512px webp, so that the page stays fast and I never convert files myself.
25. As a Creator, I want to set my Profile's default Mode (Direct, Escape or Deeplink) under "Quick Settings", where the link.me Template has its "Deeplink Banner" toggle, so that one choice decides whether the Escape Overlay shows when my page opens and covers every Link I leave on "Profile default".

Editor: Links

26. As a Creator, I want to see my Links in the order Visitors see them, so that the Editor matches my page.
27. As a Creator, I want "Add link" to open one form with title, Destination, icon, background image, Adult flag and Mode, so that adding a Link is one step (plan §6).
28. As a Creator, I want a new Link to appear last on my Profile, so that adding one never reshuffles the Links I have already ordered.
29. As a Creator, I want to pick a Link's icon from the stock icons the n8n Form offers (OnlyFans, link, Twitch, Instagram, or none), so that my cards look like today's cards.
30. As a Creator, I want to upload a Link's background image in any common format and have it come out as a 1080px webp, and to replace or remove it later, so that I control a card's look without converting files.
31. As a Creator, I want to set each Link's Mode to "Profile default", Direct, Escape or Deeplink, with a new Link starting on "Profile default", so that each Link leaves the In-App Browser the way I want.
32. As a Creator, I want an 18+ toggle on each Link that is independent of its Mode, so that an Adult Link puts the Age Gate in front of its Destination in any Mode.
33. As a Creator, I want to turn on OnlyFans tracking for a Link and give it a default Tracking Code, as the n8n Form lets me today, so that OnlyFans keeps crediting subscribers to my traffic sources.
34. As a Creator, I want to edit a Link's Geo Rule as raw JSON in a textarea filled with the current rule, so that I can set per-country Tracking Codes before a proper Geo Rule screen exists.
35. As a Creator, I want invalid Geo Rule JSON refused with a message that leaves the Link unchanged, so that a typo can never break my page the way `weiwei.json` broke on v1.
36. As a Creator, I want to edit any field of an existing Link, its Destination included, so that I can fix a title or point the Link somewhere new.
37. As a Creator, I want to move a Link up or down, so that my most important Link sits first.
38. As a Creator, I want to delete a Link only after confirming, so that a mis-press does not remove it.
39. As a Creator, I want every save to show on my public Profile at the next page load, without a build or a commit, so that "live instantly" holds.
40. As a Creator, I want a failed save to show its reason and keep everything I typed, so that I never lose input.
41. As a Creator, I want the Editor laid out for a phone first, so that I can manage my Profile from the device I post from.

Ownership and safety

42. As a Creator, I want nobody else to be able to change, add to, reorder or delete my Profile and Links, or replace my images, so that my page and my income stay mine.
43. As a Creator, I want my Destinations readable through PocketBase's API only by me and the Operator, and absent from every public file and page payload, so that a Visitor gets one only through Reveal or the redirect at the moment of a Click (ADR 0004).
44. As a Creator, I want nobody to be able to list accounts or read my email address through the API, so that public sign-up does not expose who uses ofl.ink.
45. As the Operator, I want Creators unable to set or change their verified badge, Username or ownership, so that the badge means I granted it and Profile addresses stay stable.
46. As the Operator, I want each Creator to own at most one Profile, so that one account cannot hoard Usernames.
47. As the Operator, I want every Link made in the Editor to get a random Link Id that the Creator cannot choose, so that ADR 0004's non-guessable ids hold for new Links.
48. As the Operator, I want a Destination refused unless it starts with `https://`, `http://` or `/`, so that no Link can run script on the origin where Creators stay logged in.
49. As the Operator, I want every stored avatar, background and icon to be a webp, whichever way it was uploaded, so that no Creator can store a file that carries script on the shared origin.
50. As a Visitor, I want a Link that a Creator made in the Editor to look and behave like an imported one (Mode, Age Gate, Reveal, Tracking Code), so that new and old Profiles act the same.

v1 Creators

51. As a v1 Creator, I want the Operator to hand my imported Profile to my new account, so that I edit my existing page instead of starting a new one.
52. As the Operator, I want to hand over an imported Profile by setting its owner in PocketBase's admin UI whenever I choose, so that a hand-over needs no code and no special timing.
53. As a v1 Creator whose Profile has been handed over, I want log-in to land me in the Editor on that Profile with its Links, so that I skip Onboarding.
54. As a v1 Creator whose Profile has been handed over, I want later v1 Imports to leave it alone, so that my Editor changes are not overwritten.

Operator

55. As the Operator, I want to keep editing any Profile, Link or account in PocketBase's admin UI, so that I can fix or take over anything.
56. As the Operator, I want to delete an abusive account and its Profile in PocketBase's admin UI, so that I can act on abuse while content rules and abuse reporting remain Bonus.
57. As the Operator, I want to set the SMTP sender once in PocketBase's settings, so that verification and reset emails come from my domain.
58. As the Operator, I want the n8n Form to keep working on v1 exactly as it does until Cutover, so that the live product never changes (ADR 0005).

## Implementation Decisions

- **Owns.**
  - **Editor client** (new). These are the Editor's screens:
    - sign-up, log-in and forgot-password
    - the verify-email and reset-password confirmations
    - Onboarding: claim Username, then verify, then Profile, then first Link, then the live address
    - the Editor itself: Bio Link, Profile panel, Quick Settings, Links list and Link form
  - **Editor route** (a change to Phase 2's app). Serves the Editor client under one path prefix, `/edit`.
  - **PocketBase API proxy** (a change to Phase 2's app). Forwards an allow-list of PocketBase's REST paths on the Profile origin, so the Editor reaches PocketBase same-origin.
  - **Auth-and-ownership migration** (a new PocketBase migration). It holds:
    - the sign-up, log-in, read and write rules on users, profiles and links
    - the verified-email gate and the one-Profile-per-Creator index
    - the Username validation and the reserved Usernames
    - the Destination check and the webp-only file fields
    - the action URLs in the verification and reset emails
  - **Spec** `tests/e2e/03-auth-and-editor.spec.ts`.
- **Interfaces.**
  - **Editor client.** It exposes screens, not code. Three URLs are fixed:
    - `/edit`, the entry point, which sends a Creator to log-in, to their Onboarding step or to the Editor
    - `/edit/verify?token=…` and `/edit/reset?token=…`, the two that emails link to

    Every other screen sits under `/edit/` and is free to move.
  - **Editor route.** Answers `/edit` and `/edit/…` with the Editor client and is matched before the Profile catch-all. No other route changes.
  - **PocketBase API proxy.** Forwards `/api/collections/users/…`, `/api/collections/profiles/…` and `/api/collections/links/…` to PocketBase. Method, headers and body pass through unchanged, and PocketBase's answer comes back unchanged. Every other path keeps Phase 2's answer.
  - **Auth-and-ownership migration.** It changes rules, indexes, field validation and the two email templates on Phase 2's users, profiles and links collections. It adds no collection. It adds a field only where Phase 2 lacks one that Schema names (see Depends on).
- **Schema.** The decision, trimmed. Field names follow Phase 2's: "owner", "default Mode", "verified badge", "destination", "profile" and "id" mean whatever Phase 2 calls them. The shapes state intent; the syntax follows the PocketBase version Phase 2 pins.

  ```
  users     create        anyone; the request sets nothing but email, password, passwordConfirm
            auth          anyone with an account, verified email or not
            list/view     own record only
            update/delete/manage   superuser only
  profiles  owner         → users, optional (imported Profiles have none);
                          UNIQUE INDEX ON profiles(owner) WHERE owner != ''
            username      ^[a-z0-9_]{3,30}$, unique
            avatar        file, image/webp only
            list/view     owner = self
            create        signed in AND owner = self AND username not reserved
                          AND the request sets nothing but username, owner, default Mode
            update        owner = self AND email verified
                          AND the request sets none of username, owner, verified badge
            delete        superuser only
  links     background    file, image/webp only (icon too, where Phase 2 stores it as a file)
            list/view     profile.owner = self
            create        profile.owner = self AND email verified AND the request sets no id
                          AND destination starts with https://, http:// or /
            update        profile.owner = self AND email verified AND the request sets no profile
                          AND destination, when sent, starts with https://, http:// or /
            delete        profile.owner = self AND email verified
  ```

  Phase 2 closes every rule to superusers, and its app reads PocketBase as a superuser to render public Profiles. Visitors therefore never meet these rules, and opening the owner read rules changes nothing they see. PocketBase rules apply per record, not per field, so the links read rule is what keeps every Destination to its owner and the Operator. Superusers bypass every rule, so the Operator in the admin UI and Phase 2's v1 Import are not bound by the reserved-name or Destination checks. They are bound by the field validations (the Username pattern and webp-only files).
- **Contracts.**
  - **Editor ↔ PocketBase.** The Editor calls PocketBase's REST API same-origin, with plain `fetch` and no SDK (rung 5: no new dependency, and installing one is a network fetch). It keeps the auth token in `localStorage` and sends it as the `Authorization` header. Each time the Editor opens, it refreshes the token, so a Creator who comes back within the token's lifetime stays logged in (story 11). A 401 answer sends the Creator to log-in with a return path.
    - The allow-list holds the three collections the Editor calls, records and auth paths alike. Phase 4 adds its own Stats collection in its own migration and proxy change.
    - Nothing else is forwarded: not `_superusers` or any other collection, not `/api/realtime`, `/api/batch`, `/api/settings` or `/api/logs`, not PocketBase's own `/api/files/…`, and not the admin UI at `/_/`. Phase 2's own `/api/…` routes keep their answers.

    ASSUMPTION: an allow-list, rather than all of `/api/collections/*` minus `_superusers` (rung 4: a closed default; a blanket proxy would publish the superuser login. Rung 5: no screen uses realtime or batch). Overturned if a later screen needs another path; that Phase adds it to the list.
  - **Editor ↔ Phase 2's image upload endpoint.** The Editor sends the raw file (jpg, png, heic, gif or webp) with the Creator's token and a target: their Profile's avatar, or the background of one of their Links. The endpoint stores a webp (avatar 512px, background 1080px, q80, per D4) and returns the stored image reference. It writes with the caller's token, so collection rules decide ownership, the verified-email gate included (ADR 0002: "the Node app does not"). The browser never converts images.
  - **Stored values the Editor writes.**
    - Mode: `direct`, `escape_ig` or `deeplink`, or empty for "Profile default" (ADR 0003).
    - Destination: text starting with `https://`, `http://` or `/`.
    - Adult: a boolean.
    - Geo Rule: a JSON object, or empty for none.
    - Icon: one of v1's stock icons, `/images/onlyicon.webp`, `/images/linkicon.webp`, `/images/twitchicon.webp` or `/images/igicon.webp`, or none. These are the n8n Form's options (observed: `n8n_oflink_Feb18.json`, node "Form2", field "add icon only if you add image"). The icon is stored the way Phase 2 stores imported icons.
    - OnlyFans tracking: a boolean.
    - Default Tracking Code: digits only, or empty. v1's Reveal drops any code that is not all digits (observed: `linkme_clone3/netlify/functions/reveal.js:25`).
    - Order: a number per Link. A new Link takes the highest order plus one.
  - **Email links.** The users collection's verification and password-reset templates point at `{APP_URL}/edit/verify?token={TOKEN}` and `{APP_URL}/edit/reset?token={TOKEN}`. PocketBase's Application URL is the public origin, and the Operator sets it (`# manual:`).
- **Sign-up is public** (rung 2: plan §9 D9, "PUBLIC sign-up … no invite list"). Anyone may create a users record, and the Operator shares the sign-up link privately. Email verification stays. Content rules, abuse reporting and captcha stay Bonus unless abuse appears (Out of Scope).
- **Content writes need a verified email; the Username claim does not.** Keeping the claim at sign-up is rung 2: plan §6 says "username claimed on signup". Before verifying, an account may create its Profile with only a Username, itself as owner and the default Mode. Every other write to a Profile or its Links needs `@request.auth.verified`, and that includes avatar and background uploads, because the upload endpoint writes with the Creator's token.
  ASSUMPTION: the verified-email gate on content writes (rung 4: a closed rule is cheaper to undo than strangers' content on a shared domain that can be Flagged). Overturned if the Operator wants new Creators to publish before verifying; one clause then comes out of four rules.
  ASSUMPTION: two things are harmless: a bare Profile (Username only, no display name, no Link) reachable at `/{username}` before verification, and a Username held by an account that never verifies (rung 2 keeps the claim at sign-up; the Operator deletes squatters in the admin UI). Overturned if squatting appears. The profiles create rule then also requires a verified email, and the claim step moves after the verify screen.
- **The sign-up sequence:**
  1. create the account
  2. sign in
  3. request the verification email
  4. claim the Username by creating the Profile
  5. show the "verify your email" screen

  If the claim fails (taken, reserved or invalid), the Creator is already signed in and lands on the claim step. PocketBase's unique index and validation reject the Username, and the Editor shows the reason. There is no separate availability lookup (rung 5; the owner-only read rules leave nothing to look up anyway). On the verify screen, "Continue" refreshes the session and moves on once PocketBase reports the account verified.
  ASSUMPTION (evidence blocked): with an empty auth rule, PocketBase lets an account whose email is unverified sign in with its password. Overturned if the pinned version blocks this. The claim then moves to the first log-in after verification, and the tracer-bullet test verifies the account before logging in.
- **Username rules.** A Username is lowercase letters, digits and underscore, 3 to 30 characters, and the Editor lowercases input as it is typed. PocketBase enforces this with a field pattern and a unique index, not only in the browser. All 27 v1 Snapshot Profile file names fit (observed: `ls linkme_clone3/api/profiles` gives 4 to 13 characters from `[a-z0-9_]`).
  - **Reserved names.** `api`, `edit`, `images`, `internal` and `netlify` are reserved, plus every other top-level path segment of 3 or more characters that the app routes when this Phase lands, read from the app's routes at build time.
  - **Already refused by the pattern.** Shorter segments, such as Phase 2's `/r/…`, fail the 3-character minimum. Names with a dot, such as `landing.html`, fail the pattern.
  - **Enforcement.** PocketBase patterns are Go regular expressions, which have no look-ahead. So the profiles create rule carries one `@request.body.username != "<name>"` clause per reserved name. The update rule already keeps the Username unchanged.
  - **Ownership of the list.** This Phase owns the list. A later Phase that adds a top-level route of 3 or more characters adds its clause in an additive migration. A Creator screen that a later Phase adds under `/edit/`, such as Phase 4's Stats page, needs no new name.

  ASSUMPTION: `internal` and `netlify` are reserved before any route uses them (rung 4: releasing a reserved name is cheap, taking back a claimed one is not). Overturned if no Phase routes them; their clauses can then go.
  ASSUMPTION: Usernames have no dots (rung 3: every v1 Username fits; a dot would let `/{username}` collide with a file such as `/landing.html`). Overturned if the Operator wants Instagram-style dotted Usernames. The reserved check would then have to cover file names too.
- **A Creator cannot change their Username, delete their Profile or account, or touch the verified badge.** The Operator does these in PocketBase's admin UI (rung 4: changing a Username breaks every bio that links to it; deleting cannot be undone). Following "nothing more" in plan §6, the Editor shows no badge control.
  ASSUMPTION: the verified badge is the Operator's alone, although the n8n Form today lets whoever fills it tick "verified" (observed: its field "verified") (rung 4: opening the badge to Creators later is one rule; badges already self-granted cannot be told apart). Overturned if the Operator wants Creators to keep verifying themselves.
- **One Profile per Creator** (rung 5; CONTEXT.md's Profile entry already assumes this). A unique index on owner is partial, so the many ownerless imported Profiles stay valid.
  ASSUMPTION: no Creator runs several Profiles (rung 5). Overturned by agency-style accounts, which would drop the index.
  ASSUMPTION (evidence blocked): PocketBase accepts a partial unique index (`WHERE owner != ''`) and stores an unset relation as an empty string. Overturned if it does not. The profiles create rule then refuses a Profile whose owner already owns one.
- **"Publish" is the last Onboarding screen, not a state.** A Profile is public as soon as it exists, as D2 and §6 require ("live instantly"). The publish step shows the live address with Open and Copy (rung 5: no published field and no change to Phase 2's public page). Onboarding progress is derived, not stored, and a Creator lands on the first of these that applies:
  - no Profile → the claim step
  - email not verified → the verify screen
  - no display name → the Profile step
  - no Link → the first-Link step
  - otherwise → the Editor

  A handed-over imported Profile therefore lands in the Editor.
  ASSUMPTION: a half-onboarded Profile being publicly reachable is harmless (rung 5). Overturned if Profiles must stay hidden until published; that adds a published flag that Phase 2's public page checks.
- **New Profiles start on Escape Mode.** The claim sets the default Mode to `escape_ig`, so no Profile is ever without one.
  ASSUMPTION: Escape Mode, the default every imported Profile takes (rung 3: CONTEXT.md, v1 Import; plan §8). Overturned if the Operator wants Direct Mode for new Creators; that is one value in the claim.
- **v1 Profiles are handed over when the Operator sets `owner` in PocketBase's admin UI, whenever the Operator chooses** (rung 5: no code and no claim-by-email logic). Phase 2's v1 Import re-runs with v1 winning only for ownerless Profiles. An owned Profile belongs to its Creator, and the import leaves it alone.
  - **Before Cutover.** ofl.ink serves v1 until Cutover. So an n8n Form edit to a handed-over Profile changes v1 only and is gone at Cutover; the Operator stops editing that Profile in the n8n Form.
  - **Before the hand-over.** A v1 Creator who tries their old Username sees story 5's message and stays on the claim step, so the hand-over still fits one Profile per Creator. If they claimed another Username meanwhile, the Operator deletes that bare Profile before setting the owner.

  ASSUMPTION: the hand-over can happen at any time, because Phase 2's v1 Import skips Profiles that have an owner (rung 5; rung 4: clearing the owner returns a Profile to v1-wins). Overturned if Phase 2's import overwrites owned Profiles. The Operator then hands over only after the last v1 Import before Cutover.
- **The Editor is static vanilla HTML, CSS and JS, with no build step and no new dependency** (rung 3: the v1 Snapshot has no package.json and no build). Creator-entered text is always rendered as text, never as HTML, as v1's `script.js` does at lines 124–125 and 155 (rung 3). With public sign-up, every Profile shares one origin with the Editor's stored token. Three things stop one Creator's content from running script in another's session: text-only rendering, the Destination check and webp-only files.
- **The layout copies the link.me Template's "Edit Profile" screen, phone-first, and nothing more** (plan §6). The parts kept (observed in `link.me/profile/edit.html`):
  - "Your Bio Link", with a copy button
  - "Change Profile Picture"
  - display name, @Username (read-only) and bio
  - "Quick Settings": the "Deeplink Banner" row ("Help visitors switch to Safari/Chrome") becomes the Profile default Mode selector
  - "Featured Links": one row per Link, with the reorder control where the drag handle sits, and a delete button
  - "Add link"
  - "Age Gate" ("Add an age gate to this page"), which becomes the per-Link 18+ toggle in the Link form

  The log-in and sign-up screens reuse the Editor's look, because there is no form to copy. `link.me/signup/ref/bC2M72Su.html` is a paid-plan upsell ("You've been invited to Linkme Pro … Choose your plan"), as observed. Every other Template section is cut (Out of Scope).
- **Reorder uses up/down buttons that swap a Link's order with its neighbour's** (rung 5: touch drag-and-drop needs a library or custom touch code).
  ASSUMPTION: buttons are acceptable in place of the Template's drag handle (rung 5). Overturned if the Operator wants touch drag-and-drop.
- **A Link's Mode may stay on "Profile default", which stores no Mode.** The Link form's Mode selector offers "Profile default (currently …)", Direct, Escape and Deeplink, and a new Link starts on Profile default. Changing the Profile default moves every Link left on it, imported Links included.
  ASSUMPTION: Phase 2's public page reads an empty Link Mode as the Profile's default Mode (rung 3: imported v1 Links carry no Mode and follow the Profile default until a Creator changes it, per CONTEXT.md, v1 Import). Overturned if Phase 2 stores a concrete Mode on every Link. The form then drops "Profile default" and preselects the Profile's default Mode.
- **OnlyFans tracking and the default Tracking Code are fields in the Link form.** The plan's §6 field list leaves them out. But v1 has both: the n8n Form's "click if its OF link (enables /6 -> /c6 tracking)" and `default_tracknumber`. D5 also keeps the `/c{code}` suffix. Leaving them out would lose attribution on every Link made in the Editor, so they are specced here and flagged.
  ASSUMPTION: Phase 2's links collection keeps v1's tracking flag and default Tracking Code (rung 3). Overturned if Phase 2 folds both into the Geo Rule; the two inputs then go, and the textarea covers them.
- **The Geo Rule is a textarea checked in the browser.** It is filled with the current rule, pretty-printed, and must parse as a JSON object or be empty for "no Geo Rule". Anything else blocks the save with a message and leaves the Link unchanged. There is no deeper schema check (rung 2: plan Phase 3, "raw JSON textarea (no UI yet)").
- **The Destination is editable by its owner, and PocketBase's links rules check its scheme.** The Link form shows it.
  - **Why.** The page script hands a revealed Destination to `window.location.href` (observed: v1 `script.js:40`, `:200`). The Editor's token sits in `localStorage` on that same origin, so a `javascript:` Destination would run script against any Creator who opens the Link.
  - **One check, at the boundary.** The Editor does not pre-check the prefix; it shows PocketBase's refusal (rung 5).
  - **Only Creator writes are checked.** The check lives in API rules, which superusers bypass, so imported Destinations stay as Phase 2 stored them.

  ASSUMPTION: a Creator who saves an imported Link whose Destination lacks an allowed prefix (v1 has relative `landing.html`; observed in `juliafilippo_.json`) is refused until they write `/landing.html` (rung 5: this Phase rewrites no imported data). Overturned if Phase 2's import already normalises such Destinations, in which case nothing here changes.
  ASSUMPTION: Phase 2 keeps the Destination in a field its owner may read under a rule (rung 3: D2's owner rules). Overturned if Phase 2 makes it a superuser-only hidden field. The Editor then treats the Destination as write-only ("leave blank to keep the current one").
- **File fields take webp only.** The proxy forwards PocketBase's records API, and that API takes multipart file uploads directly, skipping Phase 2's converter. So the migration limits the avatar and background file fields (and the icon, where it is a file) to `image/webp`. The users create rule also refuses every field but email and password, because PocketBase's stock users collection carries its own avatar file field.
  ASSUMPTION: enforced at the boundary ADR 0002 names, PocketBase itself, rather than by refusing multipart in the proxy (rung 4). Overturned if Phase 2 already restricts these fields, which makes this a no-op.
  ASSUMPTION (evidence blocked): PocketBase checks a file field's type from the file's content, not from the client's header. Overturned if it trusts the header; the proxy then also refuses multipart bodies on the forwarded paths.
- **Mail.** SMTP is the Operator's credential. It is set by hand in PocketBase's settings on the VPS and never stored in the repo (`# manual:`).
  - **Local runs** have no SMTP and use PocketBase's no-SMTP path: requests for verification and reset emails succeed, and only the delivery fails.
  - **In tests,** marking the account verified as a superuser stands in for the email link.

  ASSUMPTION (evidence blocked): with no SMTP configured, PocketBase still answers the verification and password-reset requests with success. Nothing here can check it: `which pocketbase` finds nothing, `docker images` lists no PocketBase or mail-catcher image, and network fetches are out of bounds. Overturned if PocketBase returns an error. The local stack then needs a mail catcher as its SMTP. That is an image pull parked for the human (`docker pull axllent/mailpit`), wired into the local stack only, and the spec then follows the real email links.
- **n8n is untouched, and the Editor is the only v2 editing surface.** The plan's Phase 3 DONE clause "n8n becomes admin-only" is moot (Out of Scope). The n8n Form keeps editing v1 until Cutover.

## Testing Decisions

One seam: **the running v2 stack at Playwright's `baseURL`**, which is the public origin. It is driven by one spec, `tests/e2e/03-auth-and-editor.spec.ts`, against Phase 2's local Docker Compose stack plus its seed, used as the `webServer` (plan §7). There is no new test runner and no unit-test seam (rung 3: the existing loop `./check.sh` → `npx playwright test`).

- **Creator journeys** run in Playwright's browser at a phone-sized viewport (390×844) and assert only what a Creator or Visitor sees. The Visitor side always runs in a fresh browser context with no Editor session.
- **Rule checks** use Playwright's `request` fixture at the same origin, calling the proxy exactly as the Editor does. This is the same seam at the HTTP level. The rules offer no screen on which a non-owner could even try, so HTTP is the highest seam that reaches them.
- **Operator steps arrange state; they are not a second seam under test.** They are marking an account verified (the stand-in for the email link), creating an ownerless Profile the way the v1 Import does, and setting an owner. They go to PocketBase's own API as a superuser, at the loopback address that Phase 2's local stack exposes, just as the Operator works in the admin UI. The proxy forwards neither `_superusers` nor anything but the three collections, so these steps cannot go through the public origin.
  ASSUMPTION: Phase 2's local seed creates a local-only superuser, whose credentials the spec reads from environment variables with local defaults, and its stack publishes PocketBase's port on loopback (rung 3: the Operator's own path is the admin UI on PocketBase directly). Overturned if Phase 2 gives tests another Operator path; the spec uses that instead. If Phase 2 provides neither, this Phase adds both to the local stack only.
- **Every test uses unique email addresses and Usernames** (a timestamp suffix), so tests in one run never collide.
- **Images** are built in the test as an in-memory PNG and passed with `setInputFiles`. This needs no fixture file and proves that a non-webp input comes out as webp.
- **Mail-less.** The spec asserts what the Creator sees and that PocketBase accepts the verification, resend and reset requests. It opens the verify and reset screens with a bad token and expects the "invalid or expired" message. The real email round trip is `# manual:`.
- **Screenshot.** The spec saves the finished Editor to `.scratch/goal_ai/shots/03-auth-and-editor.png` (plan §7, step 2; the directory is `outputDir` in `playwright.config.ts:7`).

Behaviours the spec covers:

1. **Tracer bullet, the plan's DONE** ("new user signs up, adds a link with image, page live"):
   - A stranger signs up with no invitation, claims a new Username and lands on "verify your email".
   - While the account is unverified, its token can create nothing but the claim. Over HTTP it can neither update the Profile, add a Link nor upload an avatar.
   - A superuser marks the account verified, and "Continue" moves on.
   - The Profile step takes a display name and a PNG avatar.
   - The first-Link step takes a title, an OnlyFans-style Destination, the OnlyFans stock icon, a PNG background, Adult on, Escape Mode, tracking on and default Tracking Code `7`.
   - The last screen shows the live address with Open and Copy.
   - In a fresh browser context, `/{username}` shows the display name and the Link title, and serves the avatar and background as `image/webp`.
   - The Destination string appears nowhere in that page's HTML or its network responses before the Link is pressed.
   - Pressing the Link shows the Age Gate. "Continue (18+)" calls Reveal, whose real answer is the entered Destination followed by `/c7`. The navigation itself is intercepted, as in `00-smoke.spec.ts`.
2. **Username refusals.** A taken Username (the Fixture Profile's `juliafilippo_`), a reserved one (`edit`), a too-short one (`ab`) and an invalid one (`bad.name`) are each refused with their reason. The Creator stays on the claim step and then claims a valid one. "Julia" typed in the field shows as "julia".
3. **Editor edits.** The Creator does each of these, and the public Profile shows the result on the next load:
   - edits the display name, the bio and a Link title
   - adds a second Link, which appears last, and moves it up
   - deletes a Link: cancelling the confirmation keeps it, confirming removes it
   - changes the Profile default Mode, after which a new Link's form starts on "Profile default" naming the new Mode
4. **Mode reaches the page.** With an Instagram User-Agent in a fresh context, the Escape Overlay shows when the page opens while the Profile default is Escape Mode. After the Creator switches the default to Direct Mode, it does not.
5. **Geo Rule.** Invalid Geo Rule JSON shows an error and leaves the Link unchanged. A valid object saves and fills the textarea after a reload. Emptying the textarea clears the rule.
6. **Session.**
   - Log out sends the Creator to log-in, and logging in again lands in the Editor.
   - A Creator who logs in partway through Onboarding resumes at the right step.
   - With the stored token replaced by an invalid one, a save sends the Creator to log-in, and logging in returns them to the Editor.
7. **Forgot password and email links.** "Forgot password" shows the same "check your inbox" message for a known and an unknown address. The verify and reset screens reject a bad token and offer a resend.
8. **Destination check.** A Link saved with a `javascript:` Destination is refused by PocketBase. The Editor shows the reason and keeps every field as typed.
9. **Hand-over.**
   - A superuser creates an ownerless Profile with a display name and a Link, as the v1 Import does.
   - A fresh Creator who tries that Username sees story 5's message.
   - The superuser sets that Creator as the Profile's owner and marks them verified.
   - The Creator's next log-in lands in the Editor on that Profile, with its Link, and an edit there shows on the public page.
10. **Rules, over HTTP at the public origin.** After every refused write, the owner reads the record back unchanged:
    - another Creator cannot update or delete the first Creator's Profile, and cannot update, delete or add a Link to it
    - neither Creator can move a Link onto the other's Profile
    - another Creator and an anonymous caller get no Destination from a list, a view, or a Profile read that expands its Links
    - an anonymous caller lists no accounts and no Profiles
    - another Creator cannot replace the first Creator's avatar or a Link's background through the upload endpoint
    - a direct multipart upload of a PNG to a file field through the proxy is refused
    - a Profile created with the verified badge or a display name set is refused, and the owner cannot change their own Username, owner or verified badge afterwards
    - a sign-up that sets `verified: true` either is refused or yields an unverified account
    - a Link created with a chosen `id` is refused
    - a second Profile for the same Creator is refused
    - a Destination that does not start with `https://`, `http://` or `/` is refused
    - the owner cannot delete their own Profile
    - `/api/collections/_superusers/auth-with-password` and `/api/realtime` answer 404 at the public origin, while the same Creator's calls through the proxy succeed

Prior art: `tests/e2e/00-smoke.spec.ts`. It tests through a real browser against the local server, uses a fake User-Agent and route interception, and finds elements by role and visible text. It targets the v1 dev server today (`tests/dev-server.mjs`), which Phase 2 replaces with the Docker Compose stack.

## Acceptance

```sh
cd "$(git rev-parse --show-toplevel)"
test -f tests/e2e/03-auth-and-editor.spec.ts
npx playwright test tests/e2e/03-auth-and-editor.spec.ts
test -s .scratch/goal_ai/shots/03-auth-and-editor.png
# manual: in PocketBase's admin UI on the VPS, set Settings -> Application URL to the public origin and Settings -> Mail to the Operator's SMTP sender (host, port, user, password, from-address); a human-held credential, never committed.
# manual: with SMTP set, sign up with a real inbox, follow the verification link (the screen says verified), then "Forgot password" -> follow the email link -> set a new password -> log in with it.
# manual: on a real iPhone (Safari) and Android phone (Chrome), complete Onboarding with a camera photo (HEIC on iOS) as avatar and background; the public Profile shows both as webp.
# manual: for each v1 Creator who has signed up, set their imported Profile's owner to their account in PocketBase's admin UI (any time), and stop editing that Profile through the n8n Form.
# manual (only if the local no-SMTP path fails): docker pull axllent/mailpit
./check.sh
```

## Depends on

- **Phase 2**, for everything this Phase runs on. Each item is assumed from the plan's Phase 2 line or from the run's brief, not observed:
  - PocketBase with the users, profiles and links collections, its admin UI and its verification and reset machinery, every rule closed to superusers until this Phase opens them, at a pinned version whose rule syntax this Phase's migration follows.
  - The fields this Phase writes:
    - profiles: an optional `owner` relation to users, a unique Username, a default Mode, the verified badge, display name, bio and avatar file
    - links: a relation to their Profile, title, Destination (the plan's "secret url"), Mode (empty means the Profile default), Adult flag, Geo Rule, order, icon, background file, OnlyFans tracking flag and default Tracking Code

    ASSUMPTION: Phase 2 has these fields under its own names (rung 3: the plan's Phase 2 collection list names some, and v1's Profile and Link files hold the rest). Overturned by Phase 2 naming or modelling them differently. The rules bind to Phase 2's names, and this Phase's migration adds `owner` (optional) or the default Mode only if they are missing, which is additive and keeps the v1 Import valid.
  - Link Ids: random, at least 10 characters, minted for every new links record without the client supplying one (ADR 0004).
    ASSUMPTION: the Link Id is the record id or a field PocketBase or Phase 2 fills by itself, so refusing a client-set `id` is enough (rung 5). Overturned if Phase 2 mints Link Ids in its import only; this Phase's migration then gives the field an autogenerate pattern.
  - The v1 Import: ownerless imported Profiles stored under their lowercase file-name Usernames, and re-runs that skip Profiles which have an owner.
    ASSUMPTION: Phase 2's v1 Import keys each Profile by its lowercase file name and skips owned Profiles on re-run (rung 4: an owned Profile's edits are the Creator's, and overwriting them cannot be undone). `cleocash.json` and `hannah.json` carry the capitalised names "Cleocash" and "Hannah" inside (observed), so a Phase 2 that uses the inner name would break this Phase's pattern. Overturned if Phase 2 does otherwise. The pattern then admits uppercase, or the hand-over waits for the last v1 Import (see Implementation Decisions).
  - The app container:
    - serves public Profiles at `/{username}`, reading PocketBase as a superuser and never sending a Destination, with Reveal and the `/r/{Link Id}` redirect server-side
    - serves v1's stock icons at `/images/…` and the stored images
    - provides the image upload endpoint: any format in, webp out (D4), written with the caller's token (ADR 0002)

    HEIC decoding is the endpoint's job under D4.
  - The local Docker Compose stack plus seed, with the Fixture Profile, as `playwright.config.ts`'s `webServer` at the same `baseURL` (plan §7). It also needs a local-only superuser and PocketBase's port on loopback (see Testing Decisions).
- **Phase 1**: the three Modes, the Escape Overlay on page open following the Profile default Mode, and the Age Gate, carried into v2's public page by Phase 2. The Editor only writes the values.
- **Phase 0**: nothing directly. Under the amendment (plan §8), its v1 data repairs happen inside Phase 2's v1 Import.

## Out of Scope

- **"n8n becomes admin-only"** (plan Phase 3 DONE). This is moot: the plan's §8 says the live n8n workflow is not touched by any Phase, and the n8n Form keeps editing v1 until Cutover. The v2 Editor is the only v2 editing surface.
- **Content rules, abuse reporting and captcha.** These are Bonus under §9 D9 unless abuse appears. Until then the Operator deletes abusive accounts and Profiles in the admin UI (story 56).
- **Sign-up and log-in rate limits beyond PocketBase's defaults.** These are Bonus too. If sign-up abuse appears, the Operator can turn on PocketBase's built-in rate limiter in its settings, with no code.
- **An invite list and invite emails.** D9 is public sign-up.
- **A Geo Rule screen.** The plan asks for a raw JSON textarea, "no UI yet"; a proper screen is Bonus.
- **Stats and the Template's analytics screen.** These are Phase 4.
- **A Custom Domain field and Spare Domain handling in the Editor.** These are Phase 5 / D6.
- **Proxies.** D7 is Bonus, after Phase 5.
- **Every Template section beyond the ones kept.** Plan §6 says "nothing more". This covers:
  - Shouts and Media, Gallery and Products
  - Events, Forms and Tracking Pixels
  - Link Scheduler, Music Smart Link, Social Grid, Video Feeds and Carousel
  - headers, fonts, colours and video profile
  - follower count, the Linkme icon toggle and the Pro upsell
- **A copy button for Link Shortcuts (`?link=`).** The plan does not ask for one.
- **Changing your own Username, and deleting your own Profile or account.** Both break shared links or cannot be undone. The Operator does them in the admin UI.
- **Changing your email, or changing your password inside the Editor.** "Forgot password" already covers a password change, and the plan asks for neither.
- **Uploading a custom icon.** The Editor offers stock icons only, as the n8n Form does today.
- **Converting images in the browser.** D4 puts conversion in the app container.
- **Social login, magic links, one-time codes and 2FA.** The plan specifies email and password.
- **Realtime updates and a live preview inside the Editor.** "Open" shows the real page, and no screen needs realtime.
- **Several Profiles per Creator.** See "One Profile per Creator".
- **A published or draft state.** A Profile is live as soon as it exists.
- **Any change to v1, the n8n Form, GitHub or Netlify.** ADR 0005.
- **Real-device In-App Browser tests.** That matrix belongs to Phase 1's DONE. This Phase adds only the manual phone check in Acceptance.

## Further Notes

- **Between this Phase and Cutover, saves show only on v2's own address.** ofl.ink serves v1 until Phase 5, and live v1 edits still go through the n8n Form. This is the plan's own sequencing (D1, Phase 5), recorded here and not reopened.
- **Phase 5's parity check and handed-over Profiles.** CONTEXT.md defines Cutover as done "only once v2 shows every v1 Profile identically". A Profile the Operator has handed over is its Creator's from then on and may differ from v1 by design.
  ASSUMPTION: Phase 5's parity check covers ownerless Profiles only (rung 4: a handed-over Profile's edits are the Creator's, and overwriting them cannot be undone). Overturned if parity must hold for every Profile at Cutover; the Operator then hands over only after Cutover.
- **Someone may sign up with another person's email address.** Such an account cannot verify, so it can hold at most a bare Username. The real owner of the address uses "Forgot password", which reaches their mailbox, to take the account over. The Operator deletes or renames the squatted Username in the admin UI.
  ASSUMPTION (evidence blocked): a password reset in PocketBase ends the account's other sessions. Overturned if the pinned version does not; the Operator then deletes the account in the admin UI instead.
- **PocketBase behaviours this spec relies on but could not observe.** No PocketBase binary or image is on this machine, and network fetches are out of bounds. Each is flagged where it is used:
  - a mail-less request still succeeds
  - an unverified account can sign in
  - rules can read request-body fields, test whether a field was sent, and follow relations (`profile.owner`)
  - unique indexes may be partial
  - file-type checks read the file's content
  - a password reset ends other sessions

  ASSUMPTION (evidence blocked): realtime and `expand` apply the same list and view rules as plain reads. Overturned by a PocketBase version where they do not. Realtime is not proxied anyway, and behaviour 10 checks `expand`.
