# Phase 03 — Login, register, Profile creation, add Links, Editor UI

> **Amendment 2026-10-10.** A Mode is Direct or Escape only; `deeplink` and `deeplink_open` are removed (iOS/Instagram escape is passive, with no native scheme). See phase-01's amendment note.

> **Amendment 2026-10-10 (ADR 0006).** An account whose email is not verified uses the whole Editor; verification matters only for a password reset. Migration `1791140019` drops `@request.auth.verified = true` from the content rules, and Onboarding no longer waits on the verify screen. The sections below follow; ## Review stays as written.

**Objective.** Anyone holding the sign-up link can create an account, claim a Username and build their Profile and Links in a phone-first Editor styled on the link.me Template. Every save is live on their v2 Profile at the next page load, and PocketBase's collection rules let only them change it.

## Problem Statement

A Creator cannot sign up for ofl.ink, cannot log in and cannot change their own Profile.

Today a Profile exists only if someone fills in the n8n Form. That is a chain of eight form pages (`n8n_oflink_Feb18.json`: one form trigger and seven form nodes). It asks for a raw Username and refuses any avatar or background that is not already `.webp` ("upload avatar .webp"). Its Geo Rule box is labelled "Don't fuck up the JSON cause I didn't code in guardreals". Each submission costs several GitHub commits and a Netlify build. The form's trigger has no authentication setting, so anyone holding its URL can rewrite any Profile, and nothing ties a Profile to a person. A Creator cannot see their Links in one place or reorder them, and a typo can break a page silently (`weiwei.json` does not parse today).

Phase 2 gives v2 a database, file storage and an admin screen, but only the Operator can use them. v2 has no sign-up, no log-in and no screen where a Creator edits anything. The Operator wants friends to register themselves from a link the Operator shares (plan §0: "option for people to register on my site"; §9 D9: public sign-up, no invite list).

## Solution

v2 gets its own Editor at `/edit`, on the same origin as the Profiles. Anyone with the link opens the sign-up screen and enters an email, a password and the Username they want. Onboarding then takes them through four steps, with the verification email sent but not waited on (ADR 0006):

1. claim the Username
2. fill in the Profile
3. add a first Link
4. see the live address, with Open and Copy, to paste into their Instagram or TikTok bio

From then on, logging in lands them in the Editor, a phone-sized copy of the link.me Template's "Edit Profile" screen. In it the Creator can:

- change their display name, bio, avatar and the Profile's default Mode
- add, edit, reorder and delete Links. Each Link has a title, a Destination, an icon, a background image, an Adult flag, a Mode, OnlyFans tracking with a default Tracking Code, and a Geo Rule written as raw JSON

Images upload in any common format and come out as webp. A save shows on the public Profile at the next page load, with no build and no commit. PocketBase sends the verification and password-reset emails. An unverified email holds nothing back in the Editor; only a password reset needs a confirmed mailbox (ADR 0006). PocketBase's collection rules guarantee four things:

- only the owner can change a Profile or its Links
- no Visitor and no other Creator can read a Destination through PocketBase's API. A Visitor gets one only through Reveal or the redirect, one Click at a time (ADR 0004)
- a Destination is an http(s) URL or a root-relative path, never a script
- only the Operator can change the verified badge, the Username or ownership

A v1 Creator does not start over. Once they have an account, the Operator hands them their imported Profile by setting its owner in PocketBase's admin UI, after the last v1 Import at Cutover.

## User Stories

Sign-up and verification

1. As anyone the Operator has sent the sign-up link, I want to create an account on one screen with my email, a password and the Username I want, without an invitation, so that my account and my Profile's address are made together.
2. As a Creator signing up, I want the Username I type to be lowercased as I type it, so that "Julia" becomes "julia" instead of an error.
3. As a Creator signing up, I want to be told when my Username is taken, is shorter than 3 or longer than 30 characters, uses anything but lowercase letters, digits and underscore, or is a reserved word, so that I can pick a valid one.
4. As a Creator whose Username was refused after my account was made, I want to land, signed in, on the claim step and try again, so that a clash never leaves me with an account and no way forward.
5. As a v1 Creator who tries my old Username, I want the refusal to say that the Operator hands over Usernames held on v1 at Cutover, so that I ask for mine instead of claiming a second, empty Profile.
6. As a Creator, I want a verification email as soon as my account exists, so that my account is tied to a mailbox I control and a password reset can reach me.
7. As a Creator who has claimed a Username but not verified, I want Onboarding to go straight on to my Profile, and the Editor to show a small notice with "Resend email" until I verify, so that I am never stuck waiting for an email and I know a password reset needs a confirmed address.
8. As a Creator, I want the verification link to open a screen that says either that my email is verified, or that the link is invalid or expired with a way to resend it, so that I know where I stand.
9. As the Operator, I want an account whose email is not verified to use the whole Editor, so that a self-hosted deploy with no SMTP, where every account stays unverified, works out of the box (ADR 0006).

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
52. As the Operator, I want to hand over an imported Profile by setting its owner in PocketBase's admin UI once the last v1 Import has run, so that a hand-over needs no code and no v1 Import overwrites the Creator's edits (ADR 0002: v1 wins until Cutover).
53. As a v1 Creator whose Profile has been handed over, I want log-in to land me in the Editor on that Profile with its Links, so that I skip Onboarding.
54. As a v1 Creator whose Profile has been handed over, I want no v1 Import to run after the hand-over, so that my Editor changes are not overwritten.

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
    - Onboarding: claim Username, then Profile, then first Link, then the live address; the verify screen stays reachable, but Onboarding does not stop on it (ADR 0006)
    - the Editor itself: Bio Link, Profile panel, Quick Settings, Links list and Link form

    Its files live in `app/editor/`, outside the Page Copy at `app/public/` (Phase 0), which stays the public page alone.

    ASSUMPTION: `app/editor/` (rung 5: inside the app's own directory, and outside the Page Copy whose file list Phase 0 pins). Overturned if Phase 2 lays out the app's static files differently; only the Editor route's directory changes.
  - **Editor route** (a change to Phase 2's app). Serves the Editor client under one path prefix, `/edit`.
  - **PocketBase API proxy** (a change to Phase 2's app). Forwards an allow-list of PocketBase's REST paths on the Profile origin, so the Editor reaches PocketBase same-origin.
  - **Auth-and-ownership migration** (a new PocketBase migration). It holds:
    - the sign-up, log-in, read and write rules on users, profiles and links
    - the verified-email gate (dropped since by `1791140019`, ADR 0006) and the one-Profile-per-Creator index
    - the Username validation and the reserved Usernames
    - the Destination check and the webp-only file fields
    - the action URLs in the verification and reset emails
  - **Local mail catcher** (a change to Phase 2's local stack and seed). Mailpit, set as PocketBase's SMTP in local runs only (see Mail).
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
            list/view     signed in AND own record only
            update/delete/manage   superuser only
  profiles  owner         → users, optional (imported Profiles have none);
                          UNIQUE INDEX ON profiles(owner) WHERE owner != ''
            username      ^[a-z0-9_]{3,30}$, unique
            avatar        file, image/webp only
            list/view     signed in AND owner = self
            create        signed in AND owner = self AND username not reserved
                          AND the request sets nothing but username, owner, default Mode
            update        signed in AND owner = self
                          AND the request sets none of username, owner, verified badge
            delete        superuser only
  links     background    file, image/webp only (icon too, where Phase 2 stores it as a file)
            list/view     signed in AND profile.owner = self
            create        signed in AND profile.owner = self
                          AND the request sets neither the record id nor the Link Id
                          AND destination starts with https://, http:// or /
            update        signed in AND profile.owner = self
                          AND the request sets neither profile nor the Link Id
                          AND destination, when sent, starts with https://, http:// or /
            delete        signed in AND profile.owner = self
  ```

  "Signed in" is `@request.auth.id != ""`, and it opens every rule that compares an owner. Imported Profiles have an empty owner, and an anonymous caller's `@request.auth.id` is empty too. So `owner = @request.auth.id` on its own would match every imported Profile for anyone, and the links read rule would hand out their Destinations (ADR 0004). The Link Id is Phase 2's own autogenerated `linkId` field, separate from the record id (observed: Phase 2 spec, Schema, `linkId`). The rules refuse a sent `linkId` as well as a sent `id`, so the Creator cannot choose the Link Id, whatever PocketBase does with a sent value.

  Phase 2 closes every rule to superusers, and its app reads PocketBase as a superuser to render public Profiles. Visitors therefore never meet these rules, and opening the owner read rules changes nothing they see. PocketBase rules apply per record, not per field, so the links read rule is what keeps every Destination to its owner and the Operator. Superusers bypass every rule, so the Operator in the admin UI and Phase 2's v1 Import are not bound by the reserved-name or Destination checks. They are bound by the field validations (the Username pattern and webp-only files).
- **Contracts.**
  - **Editor ↔ PocketBase.** The Editor calls PocketBase's REST API same-origin, with plain `fetch` and no SDK (rung 5: no new dependency, and installing one is a network fetch). It keeps the auth token in `localStorage` and sends it as the `Authorization` header. Each time the Editor opens, it refreshes the token, so a Creator who comes back within the token's lifetime stays logged in (story 11). A 401 answer sends the Creator to log-in with a return path. Each form saves on its own Save button, with no autosave, and the last save wins.

    ASSUMPTION: no conflict check between two open tabs (rung 5). Overturned if two people edit one Profile at once.
    - The allow-list holds the three collections the Editor calls, records and auth paths alike. Phase 4 adds its own Stats collection in its own migration and proxy change.
    - Nothing else is forwarded: not `_superusers` or any other collection, not `/api/realtime`, `/api/batch`, `/api/settings` or `/api/logs`, not PocketBase's own `/api/files/…`, and not the admin UI at `/_/`. Phase 2's own `/api/…` routes keep their answers.

    ASSUMPTION: an allow-list, rather than all of `/api/collections/*` minus `_superusers` (rung 4: a closed default; a blanket proxy would publish the superuser login. Rung 5: no screen uses realtime or batch). Overturned if a later screen needs another path; that Phase adds it to the list.
  - **Editor ↔ Phase 2's image upload endpoint.** The Editor sends the raw file (jpg, png, heic, gif or webp) with the Creator's token and a target: their Profile's avatar, or the background of one of their Links. The endpoint stores a webp (avatar 512px, background 1080px, q80, per D4) and returns the stored image reference. It writes with the caller's token, so collection rules decide ownership (ADR 0002: "the Node app does not"). The browser never converts images.
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
- **Content writes do not need a verified email; only a password reset needs a confirmed mailbox** (ADR 0006). Keeping the claim at sign-up is rung 2: plan §6 says "username claimed on signup". Before verifying, an account may claim its Username, fill in its Profile, upload images and add, edit and delete Links. No profiles or links rule reads `@request.auth.verified`. Until the account is verified, the Editor shell shows a non-blocking notice: "Email not verified. You can use everything, but you can't reset your password until you confirm it." with a "Resend email" button. It goes once PocketBase reports the account verified.
  ASSUMPTION: the verified-email gate on content writes (rung 4: a closed rule is cheaper to undo than strangers' content on a shared domain that can be Flagged). Overturned 2026-10-10: the Operator wants a self-hosted deploy with no SMTP usable out of the box, so new Creators publish before verifying, and `1791140019` takes the clause out of the four rules (ADR 0006).
  ASSUMPTION: content from an account that never verifies is harmless: a Profile with Links reachable at `/{username}`, and the Usernames it holds (rung 2 keeps the claim at sign-up; the Operator deletes abusive accounts and squatters in the admin UI, story 56). Overturned if abuse or squatting appears. The clause then goes back into the content rules in a later migration, and every deploy needs SMTP.
- **The sign-up sequence:**
  1. create the account
  2. sign in
  3. request the verification email
  4. claim the Username by creating the Profile
  5. go on to the Profile step, without waiting for the email (ADR 0006)

  If the claim fails (taken, reserved or invalid), the Creator is already signed in and lands on the claim step. PocketBase's unique index and validation reject the Username, and the Editor shows the reason. There is no separate availability lookup (rung 5; the owner-only read rules leave nothing to look up anyway). With no SMTP, PocketBase logs a send error and the account stays unverified. The verify screen (`/edit/verify-email`) is no longer on the way, but stays reachable; there "Continue" refreshes the session and moves on once PocketBase reports the account verified.
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
  - no display name → the Profile step
  - no Link → the first-Link step
  - otherwise → the Editor

  A handed-over imported Profile therefore lands in the Editor. Two consequences are intended:
  - A Creator who deletes every Link lands on the first-Link step at the next log-in. That step is the Editor's own Link form, followed by the live address.
  - A Creator who leaves on the live-address screen lands in the Editor, whose Bio Link shows the same address with Copy (story 22).

  ASSUMPTION: derived progress rather than a stored "onboarded" flag (rung 5: no new field). Overturned if the Operator wants a Creator with no Links kept in the Editor; that adds one boolean to profiles.
  ASSUMPTION: a half-onboarded Profile being publicly reachable is harmless (rung 5). Overturned if Profiles must stay hidden until published; that adds a published flag that Phase 2's public page checks.
- **New Profiles start on Escape Mode.** The claim sets the default Mode to `escape_ig`, so no Profile is ever without one.
  ASSUMPTION: Escape Mode, the default every imported Profile takes (rung 3: CONTEXT.md, v1 Import; plan §8). Overturned if the Operator wants Direct Mode for new Creators; that is one value in the claim.
- **v1 Profiles are handed over when the Operator sets `owner` in PocketBase's admin UI, after the last v1 Import, at Cutover** (rung 3: ADR 0002 and CONTEXT.md's v1 Import keep v1 winning until Cutover; rung 4: an import that overwrites a Creator's edits cannot be undone; rung 5: no code and no claim-by-email logic). Phase 2's re-runs keep `owner` but overwrite every v1 field of an imported Profile (observed: Phase 2 spec, v1 Import — re-runs). A hand-over before the last run would therefore lose the Creator's Editor changes.
  - **Before Cutover.** ofl.ink serves v1, so a v1 Creator keeps editing through the n8n Form as today. An earlier hand-over would gain them nothing, because a v2 save shows only on v2's own address until Cutover.
  - **Before the hand-over.** A v1 Creator who tries their old Username sees story 5's message and stays on the claim step, so the hand-over still fits one Profile per Creator. If they claimed another Username meanwhile, the Operator deletes that bare Profile before setting the owner.

  ASSUMPTION: the hand-over waits for the last v1 Import (rungs 3 and 4). Overturned if the Operator wants v1 Creators editing in v2 before Cutover. That needs a v1 Import that skips owned Profiles, which changes ADR 0002 and Phase 2.
- **The Editor is static vanilla HTML, CSS and JS, with no build step and no new dependency** (rung 3: the v1 Snapshot has no package.json and no build). Creator-entered text is always rendered as text, never as HTML, as v1's `script.js` does at lines 124–125 and 155, and so the Page Copy's `app/public/script.js` does too (rung 3). With public sign-up, every Profile shares one origin with the Editor's stored token. Three things stop one Creator's content from running script in another's session: text-only rendering, the Destination check and webp-only files.
- **The layout copies the link.me Template's "Edit Profile" screen, phone-first, and nothing more** (plan §6). The parts kept (observed in `link.me/profile/edit.html`):
  - "Your Bio Link", with a copy button
  - "Change Profile Picture"
  - display name, @Username (read-only) and bio
  - "Quick Settings": the "Deeplink Banner" row ("Help visitors switch to Safari/Chrome") becomes the Profile default Mode selector
  - "Featured Links": one row per Link, with the reorder control where the drag handle sits, and a delete button
  - "Add link"
  - "Age Gate" ("Add an age gate to this page"), which becomes the per-Link 18+ toggle in the Link form

  The log-in and sign-up screens reuse the Editor's look, because there is no form to copy. `link.me/signup/ref/bC2M72Su.html` is a paid-plan upsell ("You've been invited to Linkme Pro … Choose your plan"), as observed. Every other Template section is cut (Out of Scope).
- **Reorder uses up/down buttons that swap a Link's order with its neighbour's** (rung 5: touch drag-and-drop needs a library or custom touch code). A move is two writes, one per Link. If either fails, the Editor shows the reason and reloads the list from PocketBase, so it never shows an order the page does not.
  ASSUMPTION: buttons are acceptable in place of the Template's drag handle (rung 5). Overturned if the Operator wants touch drag-and-drop.
- **A Link's Mode may stay on "Profile default", which stores no Mode.** The Link form's Mode selector offers "Profile default (currently …)", Direct, Escape and Deeplink, and a new Link starts on Profile default. Changing the Profile default moves every Link left on it, imported Links included.
  Phase 2 stores an empty Link Mode as "the Profile's default Mode", and its Profile JSON serves each Link's effective Mode (observed: Phase 2 spec, Schema `links.mode`, and Contracts, Profile JSON `mode`). Inheritance is therefore a dependency, not a fallback (see Depends on).
- **OnlyFans tracking and the default Tracking Code are fields in the Link form.** The plan's §6 field list leaves them out. But v1 has both: the n8n Form's "click if its OF link (enables /6 -> /c6 tracking)" and `default_tracknumber`. D5 also keeps the `/c{code}` suffix. Leaving them out would lose attribution on every Link made in the Editor, so they are specced here and flagged.
  ASSUMPTION: Phase 2's links collection keeps v1's tracking flag and default Tracking Code (rung 3). Overturned if Phase 2 folds both into the Geo Rule; the two inputs then go, and the textarea covers them.
- **The Geo Rule is a textarea checked in the browser.** It is filled with the current rule, pretty-printed, and must parse as a JSON object or be empty for "no Geo Rule". Anything else blocks the save with a message and leaves the Link unchanged. There is no deeper schema check (rung 2: plan Phase 3, "raw JSON textarea (no UI yet)").
- **The Destination is editable by its owner, and PocketBase's links rules check its scheme.** The Link form shows it.
  - **Why.** The page script, the Page Copy's `app/public/script.js` copied from v1, hands a revealed Destination to `window.location.href` (observed in v1: `script.js:40`, `:200`). The Editor's token sits in `localStorage` on that same origin, so a `javascript:` Destination would run script against any Creator who opens the Link.
  - **One check, at the boundary.** The Editor does not pre-check the prefix; it shows PocketBase's refusal (rung 5).
  - **Only Creator writes are checked.** The check lives in API rules, which superusers bypass, so imported Destinations stay as Phase 2 stored them.

  ASSUMPTION: a Creator who saves an imported Link whose Destination lacks an allowed prefix (v1 has relative `landing.html`; observed in `juliafilippo_.json`) is refused until they write `/landing.html` (rung 5: this Phase rewrites no imported data). Overturned, and now moot: Phase 2's import stores a relative `url` root-relative (Phase 2 spec, v1 Import — repairs, Relative urls), so imported Destinations already pass the check and nothing here changes.
  - **The owner reads it back.** Phase 2 keeps the Destination in an ordinary text field (observed: Phase 2 spec, Schema, `destination`), so the owner read rules let the Link form show it. ADR 0004 bars public reads, not the owner's. An owner-readable Destination is a dependency (see Depends on), and the Editor has no write-only mode.
- **File fields take webp only.** The proxy forwards PocketBase's records API, and that API takes multipart file uploads directly, skipping Phase 2's converter. So the migration limits the avatar and background file fields (and the icon, where it is a file) to `image/webp`. The users create rule also refuses every field but email and password, because PocketBase's stock users collection carries its own avatar file field.
  ASSUMPTION: enforced at the boundary ADR 0002 names, PocketBase itself, rather than by refusing multipart in the proxy (rung 4). Overturned if Phase 2 already restricts these fields, which makes this a no-op.
  ASSUMPTION (evidence blocked): PocketBase checks a file field's type from the file's content, not from the client's header. Overturned if it trusts the header; the proxy then also refuses multipart bodies on the forwarded paths.
- **Mail.** SMTP is the Operator's credential. It is set by hand in PocketBase's settings on the VPS and never stored in the repo (`# manual:`).
  - **Local runs** send mail to a mail catcher, Mailpit, added to the local stack only and set as PocketBase's SMTP by the local seed. Its image is a pull for the human (`docker pull axllent/mailpit`), like every other image (plan §9).
  - **In tests,** the spec reads the newest message for an address from Mailpit's HTTP API on loopback and follows its verification or reset link in the browser. The success screens are tested, not only the "invalid or expired" ones. Marking an account verified as a superuser remains only for arranging the hand-over.

  ASSUMPTION: a mail catcher in the local stack (rung 4: a local-only service that leaves production untouched and comes out with one Compose entry; rung 5 over a PocketBase mail hook, which would be test code inside the stack). Overturned if the Operator declines the image. Verify and reset success then fall back to the manual Acceptance lines, and a superuser marks test accounts verified.
- **n8n is untouched, and the Editor is the only v2 editing surface.** The plan's Phase 3 DONE clause "n8n becomes admin-only" is moot (Out of Scope). The n8n Form keeps editing v1 until Cutover.

## Testing Decisions

One seam: **the running v2 stack at Playwright's `baseURL`**, which is the public origin. It is driven by one spec, `tests/e2e/03-auth-and-editor.spec.ts`, against Phase 2's local Docker Compose stack plus its seed, used as the `webServer` (plan §7). There is no new test runner and no unit-test seam (rung 3: the existing loop `./check.sh` → `npx playwright test`).

- **Creator journeys** run in Playwright's browser at a phone-sized viewport (390×844) and assert only what a Creator or Visitor sees. The Visitor side always runs in a fresh browser context with no Editor session.
- **Rule checks** use Playwright's `request` fixture at the same origin, calling the proxy exactly as the Editor does. This is the same seam at the HTTP level. The rules offer no screen on which a non-owner could even try, so HTTP is the highest seam that reaches them.
- **Operator steps arrange state; they are not a second seam under test.** They are marking an account verified (for the hand-over only), creating an ownerless Profile the way the v1 Import does, and setting an owner. They go to PocketBase's own API as a superuser, at the loopback address that Phase 2's local stack exposes, just as the Operator works in the admin UI. The proxy forwards neither `_superusers` nor anything but the three collections, so these steps cannot go through the public origin.
  ASSUMPTION: Phase 2's local seed creates a local-only superuser, whose credentials the spec reads from environment variables with local defaults, and its stack publishes PocketBase's port on loopback (rung 3: the Operator's own path is the admin UI on PocketBase directly). Overturned if Phase 2 gives tests another Operator path; the spec uses that instead. If Phase 2 provides neither, this Phase adds both to the local stack only.
- **Every test uses unique email addresses and Usernames** (a timestamp suffix), so tests in one run never collide.
- **Images** are built in the test as an in-memory PNG and passed with `setInputFiles`. This needs no fixture file and proves that a non-webp input comes out as webp.
- **Mail.** The spec follows the real verification and reset links from the local mail catcher, and also opens both screens with a bad token and expects the "invalid or expired" message. Delivery through the Operator's SMTP is `# manual:`.
- **Screenshot.** The spec saves the finished Editor to `.scratch/goal_ai/shots/03-auth-and-editor.png` (plan §7, step 2; the directory is `outputDir` in `playwright.config.ts:7`).

Behaviours the spec covers:

1. **Tracer bullet, the plan's DONE** ("new user signs up, adds a link with image, page live"):
   - A stranger signs up with no invitation, claims a new Username and lands on the Profile step, with the email still unverified.
   - Every step below, up to the verification link, runs while the account is unverified (ADR 0006).
   - The Profile step takes a display name and a PNG avatar.
   - The first-Link step takes a title, an OnlyFans-style Destination, the OnlyFans stock icon, a PNG background, Adult on, Escape Mode, tracking on and default Tracking Code `7`.
   - The last screen shows the live address with Open and Copy.
   - In the Editor, the Creator adds a second Link: Adult off, Direct Mode, a different Destination.
   - The Editor shows the "Email not verified" notice with "Resend email". The verification email reaches the local mail catcher. Following its link shows "verified", and after "Continue" the notice is gone.
   - In a fresh browser context, `/{username}` shows the display name and both Link titles, and serves the avatar and background as `image/webp`.
   - Neither Destination string appears in that page's HTML, its Profile JSON or any of its network responses before a Link is pressed.
   - The non-Adult Link's `/r/{Link Id}` answers 302 to its Destination.
   - Pressing the Adult Link shows the Age Gate. "Continue (18+)" calls Reveal, whose real answer is the entered Destination followed by `/c7`. The navigation itself is intercepted, as in `00-smoke.spec.ts`.
2. **Username refusals.** A taken Username (the Fixture Profile's `fixture`, the one Profile a fresh clone seeds), a reserved one (`edit`), a too-short one (`ab`) and an invalid one (`bad.name`) are each refused with their reason. The Creator stays on the claim step and then claims a valid one. "Julia" typed in the field shows as "julia".
3. **Editor edits.** The Creator does each of these, and the public Profile shows the result on the next load:
   - edits the display name, the bio and a Link title
   - replaces the avatar, and replaces and then removes a Link's background
   - reopens a Link, sees its current Destination in the form, changes it, and Reveal then answers the new one
   - adds another Link, which appears last, and moves it up
   - deletes a Link: cancelling the confirmation keeps it, confirming removes it
   - changes the Profile default Mode, after which a new Link's form starts on "Profile default" naming the new Mode
4. **Mode reaches the page.** With an Instagram User-Agent in a fresh context, the Escape Overlay shows when the page opens while the Profile default is Escape Mode. After the Creator switches the default to Direct Mode, it does not. With one Link left on "Profile default" and one set to Escape, the public Profile JSON then gives the first Link Direct and keeps the second on Escape.
5. **Geo Rule.** Invalid Geo Rule JSON shows an error and leaves the Link unchanged. A valid object saves and fills the textarea after a reload. Emptying the textarea clears the rule.
6. **Session.**
   - Log out sends the Creator to log-in, and logging in again lands in the Editor.
   - A Creator who logs in partway through Onboarding resumes at the right step.
   - With the stored token replaced by an invalid one, a save sends the Creator to log-in, and logging in returns them to the Editor.
7. **Forgot password and email links.** "Forgot password" shows the same "check your inbox" message for a known and an unknown address. The reset email's link, from the mail catcher, opens the reset screen. The Creator sets a new password, logging in with it lands in the Editor, and the old one is refused. The verify and reset screens reject a bad token and offer a resend.
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
    - an anonymous caller and a signed-in Creator get nothing from a list or view of the ownerless Fixture Profile or its Links, expanded or not
    - an anonymous caller lists no accounts and no Profiles, and another Creator cannot list or view the first Creator's account or email
    - another Creator cannot replace the first Creator's avatar or a Link's background through the upload endpoint
    - a direct multipart upload of a PNG to a file field through the proxy is refused
    - a Profile created with the verified badge or a display name set is refused, and the owner cannot change their own Username, owner or verified badge afterwards
    - a sign-up that sets `verified: true` either is refused or yields an unverified account
    - a Link created with a chosen record id or Link Id is refused, and so is a Link Id sent in an update
    - a second Profile for the same Creator is refused
    - a Destination that does not start with `https://`, `http://` or `/` is refused
    - the owner cannot delete their own Profile
    - `/api/collections/_superusers/auth-with-password` and `/api/realtime` answer 404 at the public origin, while the same Creator's calls through the proxy succeed

Prior art: `tests/e2e/00-smoke.spec.ts`. It tests through a real browser against the local server, uses a fake User-Agent and route interception, and finds elements by role and visible text. It targets the v1 dev server today (`tests/dev-server.mjs`), which Phase 2 replaces with the Docker Compose stack.

## Acceptance

```sh
set -e
cd "$(git rev-parse --show-toplevel)"
# manual: docker pull axllent/mailpit   (done by the Operator 2026-10-04, plan §11; image is local)
test -f tests/e2e/03-auth-and-editor.spec.ts
npx playwright test tests/e2e/03-auth-and-editor.spec.ts
test -s .scratch/goal_ai/shots/03-auth-and-editor.png
# manual: in PocketBase's admin UI on the VPS, set Settings -> Application URL to the public origin and Settings -> Mail to the Operator's SMTP sender (host, port, user, password, from-address); a human-held credential, never committed.
# manual: with SMTP set, sign up with a real inbox, follow the verification link (the screen says verified), then "Forgot password" -> follow the email link -> set a new password -> log in with it.
# manual: on a real iPhone (Safari) and Android phone (Chrome), complete Onboarding with a camera photo (HEIC on iOS) as avatar and background; the public Profile shows both as webp.
# manual: in PocketBase's admin UI on the VPS, Settings -> Backups: auto backups on, cron 0 3 * * *, keep 7. Public sign-up makes v2 the only copy of new Profiles from this deploy on (Further Notes, Backups).
# (The hand-over of imported Profiles, setting each one's owner, is step 12 of Phase 5's Cutover runbook, after the last v1 Import; Phase 3's Done does not wait for it.)
./check.sh
```

## Depends on

- **Phase 2**, for everything this Phase runs on. Each item is assumed from the plan's Phase 2 line or from the run's brief, not observed:
  - PocketBase with the users, profiles and links collections, its admin UI and its verification and reset machinery, every rule closed to superusers until this Phase opens them, at a pinned version whose rule syntax this Phase's migration follows.
  - The fields this Phase writes:
    - profiles: an optional `owner` relation to users, a unique Username, a default Mode, the verified badge, display name, bio and avatar file
    - links: a relation to their Profile, title, Destination (the plan's "secret url"), Mode (empty means the Profile default), Adult flag, Geo Rule, order, icon, background file, OnlyFans tracking flag and default Tracking Code

    The Destination is an ordinary field that a rule can open to its owner, and an empty Link Mode means the Profile's default Mode (observed in Phase 2's spec: Schema, `links.mode` and `destination`).

    ASSUMPTION: Phase 2 has these fields under its own names (rung 3: the plan's Phase 2 collection list names some, and v1's Profile and Link files hold the rest). Overturned by Phase 2 naming or modelling them differently. The rules bind to Phase 2's names, and this Phase's migration adds `owner` (optional) or the default Mode only if they are missing, which is additive and keeps the v1 Import valid.
  - Link Ids: Phase 2's `linkId` field, 12 random `[a-z0-9]` characters, autogenerated for every new links record (ADR 0004; observed in Phase 2's spec: Schema, `linkId`). This Phase's rules refuse a client-sent `linkId`.
  - The v1 Import: ownerless imported Profiles stored under their lowercase file-name Usernames. Re-runs overwrite v1's fields until Cutover (ADR 0002), which is why the hand-over waits for the last one.
    ASSUMPTION: Phase 2's v1 Import keys each Profile by its lowercase file name (rung 3: every v1 file name is lowercase). `cleocash.json` and `hannah.json` carry the capitalised names "Cleocash" and "Hannah" inside (observed), so a Phase 2 that uses the inner name would break this Phase's pattern. Overturned if Phase 2 does otherwise; the pattern then admits uppercase.
  - The app container:
    - serves public Profiles at `/{username}`, reading PocketBase as a superuser and never sending a Destination, with Reveal and the `/r/{Link Id}` redirect server-side
    - serves v1's stock icons at `/images/…` and the stored images
    - provides the image upload endpoint: any format in, webp out (D4), written with the caller's token (ADR 0002)

    HEIC decoding is the endpoint's job under D4.
  - The local Docker Compose stack plus seed, with the Fixture Profile, as `playwright.config.ts`'s `webServer` at the same `baseURL` (plan §7). It also needs a local-only superuser and PocketBase's port on loopback (see Testing Decisions). `./check.sh` must already pass on it, `00-smoke.spec.ts` included, which reads its Link Ids from the served Fixture Profile since Phase 0 (Phase 0 spec, Owns, Smoke Spec).
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
- **Phase 5's parity check and handed-over Profiles.** CONTEXT.md defines Cutover as done "only once v2 shows every v1 Profile identically". The hand-over waits for the last v1 Import, so parity is checked on every Profile before any is handed over. A handed-over Profile may differ from v1 afterwards, by design.
- **Someone may sign up with another person's email address.** Such an account cannot verify, but it can still build a Profile with Links (ADR 0006). With SMTP, the real owner of the address uses "Forgot password", which reaches their mailbox, to take the account over; without SMTP no mail arrives and only the Operator can undo it. The Operator deletes the squatted Profile, or renames its Username, in the admin UI.
  ASSUMPTION (evidence blocked): a password reset in PocketBase ends the account's other sessions. Overturned if the pinned version does not; the Operator then deletes the account in the admin UI instead.
- **PocketBase behaviours this spec relies on but could not observe.** No PocketBase binary or image is on this machine, and network fetches are out of bounds. Each is flagged where it is used:
  - an unverified account can sign in
  - rules can read request-body fields, test whether a field was sent, and follow relations (`profile.owner`)
  - unique indexes may be partial
  - file-type checks read the file's content
  - a password reset ends other sessions

  ASSUMPTION (evidence blocked): realtime and `expand` apply the same list and view rules as plain reads. Overturned by a PocketBase version where they do not. Realtime is not proxied anyway, and behaviour 10 checks `expand`.
- **Backups start with this Phase's VPS deploy.** From then on public sign-up stores Profiles that v1 never had, so the v1 Import can no longer rebuild PocketBase (Phase 2 spec, Out of Scope, PocketBase backups). The Operator turns on PocketBase's scheduled backups at that deploy (Acceptance): daily, keeping 7, on the VPS disk. Phase 5 spec, Backups, holds the reasons for those values, the evidence-blocked ASSUMPTION that the pinned release has built-in backups, and the cron fallback. Before the switch, Phase 5 checks that they are on and proves one backup complete (rung 4: a lost sign-up cannot be recovered; plan review, six hats).

## Review

Reviewer: codex (`codex exec`, model_reasoning_effort=high, read-only sandbox, blind workspace without docs/spec/, .scratch/, .claude/, linkme_clone3/ or link.me/). Date: 2026-10-02. Two calls: B = blind (no spec shown), D = draft. R = found by the reconciler while checking a D finding against `docs/spec/phase-02-vps-foundation.md`. Counts: 9 accept, 8 partial, 19 reject, 0 needs-human.

Blind call

- B1 `./check.sh` fails in the workspace (`error: unknown command 'test'`) and the harness still serves v1. **reject**: the workspace has no `node_modules`, so `npx playwright` cannot run there. This Phase runs on Phase 2's Compose `webServer` (Depends on).
- B2 Creator request path: browser to PocketBase, or Node mediating. **reject**: decided. The browser calls the same-origin proxy with the Creator's token, and the upload endpoint writes with that token (ADR 0002:3).
- B3 Publication model, draft or progressive. **reject**: decided and flagged. "Publish" is a screen, and a Profile is live on creation (plan §6, "live instantly").
- B4 Save model unspecified. **partial**: each form now saves on its own button, with no autosave and last save wins (Contracts, flagged). No other change.
- B5 Public data model. **reject**: decided. Owner-only read rules, and Phase 2's app reads as superuser and never sends a Destination (`docs/spec/phase-02-vps-foundation.md:234`).
- B6 Imported Profile access, Operator assignment or a proof-based claim. **reject**: decided (the Operator sets owner). Its timing changed under B15/D1.
- B7 Editor implementation, server-rendered or browser app. **reject**: decided. Static vanilla JS, rung 3.
- B8 Verification and session lifecycle. **reject**: stories 6–15 and the sign-up sequence cover it. The success paths are now tested under D5.
- B9 Username allocation. **reject**: covered by the pattern, lowercasing, reserved names, the unique index (concurrent claims), no rename, squatters deleted by the Operator, and story 5 for v1 names.
- B10 Profile cardinality and writable fields. **reject**: covered. One Profile per Creator, and badge, Username and owner are superuser-only.
- B11 Draft/public lifecycle. **reject**: decided. Live on existence, derived Onboarding, and a deleted Link's `/r` answers 404 in Phase 2. Link Shortcut copying is Out of Scope.
- B12 Link validation and inheritance. **partial**: the Destination scheme and inheritance were already decided, and inheritance is now tested (D7). Field limits and Tracking Code precedence stay with Phase 2's schema and resolver.
- B13 Media lifecycle. **reject**: Phase 2's upload contract fixes the limits (20 MB, 415) and old-file deletion (`docs/spec/phase-02-vps-foundation.md:217`, `:383`). Replacement and removal are now tested under D8.
- B14 Concurrent edits and reorder atomicity. **partial**: a move is two writes, and on failure the Editor now shows the reason and reloads the list. Last save wins is flagged. Atomic batch writes stay out (`/api/batch` is not proxied).
- B15 v1 Import "v1 wins until Cutover" conflicts with Creator edits (ADR 0002:12). **accept**: the hand-over now waits for the last v1 Import, at Cutover. Stories 5, 52 and 54, the Solution, the hand-over decision, Depends on, Acceptance and Further Notes were rewritten (same as D1).
- B16 No measurable mobile or usability criteria. **reject**: plan §6 says "nothing more". §7's check is a phone viewport plus a screenshot, which the spec has.
- B17 "n8n becomes admin-only" vs §8. **reject**: already moot in Out of Scope.
- B18 The Destination test must tell Reveal apart from public payloads. **reject**: behaviour 1 already scopes the check to "before a Link is pressed" and then asserts Reveal's answer.
- B19 The harness is Desktop Chrome on the v1 dev server. **reject**: the spec sets a 390×844 viewport per test, and Phase 2 swaps the `webServer` (Depends on).
- B20 The smoke test stubs Reveal. **reject**: behaviour 1 asserts Reveal's real answer and intercepts only the navigation.
- B21 Real-device escape. **reject**: manual Acceptance line, plus Phase 1's device matrix.
- B22 Falsifiers: foundation missing, privileged Node, a newcomer needing the Operator, Editor controls. **partial**: each maps to Depends on or to behaviours 1, 3, 4 and 10. "Needs the Operator" held for the tracer, which used a superuser to verify; fixed under D5.
- B23 Obfuscation does not stop Flagging. **reject**: ADR 0004:14 already says so, and Spare Domains are Phase 5.

Draft call

- D0 Public sign-up is consistent throughout (codex cites spec lines 151, 192, 285, 373). Noted; no change.
- D1 The hand-over assumed imports skip owned Profiles, against ADR 0002:12 and CONTEXT.md's Cutover parity. **accept**: Phase 2's re-runs overwrite v1 fields and keep only mode, owner and linkId (`docs/spec/phase-02-vps-foundation.md:345–346`), so the assumption was false. The hand-over now follows the last v1 Import, and the parity assumption in Further Notes is gone (see B15).
- D2 Read rules `owner = self` match an anonymous caller on ownerless imported Profiles, so their Destinations would leak. **accept**: every owner rule now starts with `@request.auth.id != ""` (Schema). Behaviour 10 now probes the ownerless Fixture Profile anonymously and as a signed-in Creator.
- D3 The write-only Destination fallback contradicts an Editor that shows it. **accept**: the fallback is removed. Phase 2's Destination is an ordinary text field (`docs/spec/phase-02-vps-foundation.md:180`), and Depends on now requires it owner-readable. Behaviour 3 now reopens a Link, sees its Destination, changes it and checks Reveal.
- D4 The privacy check covers one loaded Adult page, not non-Adult Links or other public files. **partial**: accepted for non-Adult Links. The tracer adds a Direct, non-Adult Link, checks the Profile JSON for both Destinations, and checks `/r/{Link Id}` → 302. Rejected for "every published file": this Phase publishes no file that can hold a Destination. The Editor is static code whose only data path is the proxy (behaviour 10), and the public file surface is Phase 2's (ADR 0004).
- D5 Verify and reset success have no local test. **accept**: a local-only Mailpit becomes PocketBase's SMTP. The tracer and behaviour 7 follow the real verification and reset links, and the evidence-blocked "mail-less request succeeds" assumption is gone. `docker pull axllent/mailpit` is now an unconditional `# manual:` line: building parks on it for the human (plan §9), and design does not.
- D6 Derived Onboarding sends a Creator who deleted every Link back to the first-Link step, and cannot tell "live-address step unseen" from done. **partial**: the derived rule stays (rung 5, no new field). Both consequences are now stated as intended and flagged: a zero-Link Creator lands on a Link form, and the live address sits in the Editor's Bio Link.
- D7 The Mode fallback would drop "Profile default". **accept**: the fallback is removed. Phase 2 stores empty as the Profile default and serves the effective Mode (`docs/spec/phase-02-vps-foundation.md:179`, `:232`). Behaviour 4 now asserts that an inheriting Link follows the new default while an explicit Link keeps its own.
- D8 Untested promises: avatar and background replacement, per-Link Mode, Adult and Geo effect, and another Creator reading an account. **partial**: avatar replace, background replace and remove, and another Creator's account read were added (behaviours 3 and 10). Adult/Mode independence is covered by the tracer's Adult+Escape and non-Adult+Direct Links. Rejected for the Geo effect: Geo resolution is Phase 2's resolver, and this Phase only stores the JSON, which behaviour 5 round-trips.
- D9 The Acceptance block can exit 0 after a failed prerequisite (codex: `bash -c 'test -s /nope; bash -c "set -e; true"'` → 0). **accept**: `set -e` added. House precedent: Phase 1's Acceptance uses it.
- D10 "Phase 4 adds its own Stats collection" is false; events belong to Phase 2. **reject**: Phase 4's spec adds its own `dailyStats` collection to the allow-list and keeps `events` off it (`docs/spec/phase-04-stats.md:82`, `:354`).
- D11 `00-smoke.spec.ts` pins a v1 Link Id that v2 cannot serve. **partial**: Phase 2 owns that edit (`docs/spec/phase-02-vps-foundation.md:452–455`). Depends on now requires `./check.sh` green on Compose with it, and this Phase does not touch the smoke spec. (Superseded since: Phase 0 removes the pinned id itself, and Depends on now says so.)
- D12 The Page Copy location `app/public/` is never named. **accept**: the spec now names the Page Copy at `app/public/` (`docs/spec/phase-00-new-repo-ground.md:46`) for the page script and text rendering. It places the Editor in `app/editor/` (flagged), outside the file list Phase 0 pins. (The conflict with Phase 2 noted here is gone: Phase 2's spec now serves `app/public/` too, Phase 2 spec, Public page.)
- R1 The Link Id is Phase 2's autogenerated `linkId`, not the record id (`docs/spec/phase-02-vps-foundation.md:175`), so refusing a sent `id` left it choosable on create and update. **accept**: the links create and update rules now refuse a sent `linkId`, behaviour 10 tests both, and the Depends on assumption is replaced by the observation.

### Six hats

Six-hats review of specs 00–05 taken as one set (HEAD 16d5a11), reconciled in the plan review, 2026-10-02. Ids: W white, R red, K black, Y yellow, G green, U blue, C the coordinator's points, X found by the reconciler. Bullets about the whole set are reconciled only in `docs/spec/plan-review.md`, Six hats. Cross-spec line citations in the entries above date from their own review and may have drifted; the main text now cites sections.

- K3 **accept** (first trap). Testing Decisions' taken-Username case named "the Fixture Profile's `juliafilippo_`". A fresh clone seeds only `fixture` (Phase 2 spec, Test loop, Fresh clone), so the case now uses `fixture`.
- W3 **accept**. Main-text citations of Phase 2 by line number (Schema, re-runs, Profile JSON) now cite section names. The Schema citation for `linkId` had drifted.
- U2 **accept** (stale notes). Depends on said Phase 2 replaces the smoke spec's pinned v1 id; Phase 0 removes it, and the line now says so. In ## Review, D12's claim that Phase 2 still assumes `public/` at the repo root is replaced by a note that it is resolved, and D11's matching claim is marked superseded. Both verdicts and the counts are unchanged.
- C4 **accept**. The Acceptance line that sets imported Profiles' owners ran "at Cutover" inside this Phase's Acceptance, so nothing ran it at Cutover. It is now step 12 of Phase 5's Cutover runbook, and this Acceptance points there. Phase 3's Done no longer waits on Cutover.
- K2 **accept**. Public sign-up makes v2 the only copy of new Profiles from this Phase's VPS deploy on, and no Phase backed them up until Cutover. A Further Notes bullet and a `# manual:` Acceptance line now turn on PocketBase's scheduled backups at this deploy (rung 4). Phase 5 keeps the pre-switch check.
- X1 **accept**. The ASSUMPTION that a Creator saving an imported relative Destination is refused had its overturn condition met: Phase 2's import stores relative urls root-relative (Phase 2 spec, v1 Import — repairs). It is now marked moot.

Counts: accept 6, partial 0, reject 0, needs-human 0.
