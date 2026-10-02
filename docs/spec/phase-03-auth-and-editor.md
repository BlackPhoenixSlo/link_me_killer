# Phase 03 — Login, register, Profile creation, add Links, Editor UI

**Objective.** An invited Creator can sign up and claim a Username, then build their Profile and Links in a mobile-first Editor styled on the link.me Template. Every save is live on their v2 Profile, and only they can change it.

## Problem Statement

Today a Creator gets a Profile through the n8n Form. It is a chain of six forms that asks for a raw Username and rejects any avatar or background image that is not already `.webp` (it sends you to an outside converter). It says "Don't fuck up the JSON cause I didn't code in guardrails" above the Geo Rule box. Each submission costs several GitHub commits and a Netlify build. Anyone holding the form's URL can rewrite any Profile, because the form has no login (its trigger node carries no authentication setting) and nothing ties a Profile to a person. Creators cannot see their Links in one place, cannot reorder them, and cannot log in anywhere. A typo can break their page silently (weiwei.json is invalid JSON today).

## Solution

v2 gets its own Editor, on the same origin as the Profiles. The Operator invites a Creator by email. The Creator opens the sign-up screen and enters their email, a password and the Username they want. They then go through a short Onboarding: claim the Username, fill in the Profile, add a first Link, and see the live address to paste into their bio.

After that they log in to the Editor, a phone-sized copy of link.me's "Edit Profile" screen. From it they can:

- change their display name, bio, avatar and default Mode
- add, edit, reorder and delete Links, each with a title, Destination, icon, background image, Adult flag, Mode and Geo Rule

Images upload as any common format and come out as webp. A save shows on the public Profile at the next page load. Email verification and password reset come from PocketBase. PocketBase's collection rules guarantee three things:

- only the owner can change a Profile or its Links
- no Visitor or other Creator can read a Destination
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
8. As a Creator who has not verified yet, I want a reminder in the Editor with a "resend email" button, so that I can finish verifying later.
9. As a Creator, I want the verification link to open a screen that says my email is verified, or that the link is invalid or expired with a way to resend, so that I know where I stand.
10. As a v1 Creator whose Profile came over in the v1 Import, I want the Operator to hand that Profile to my new account, so that I edit my existing page instead of starting a new one.

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
26. As a Creator, I want to set my Profile's default Mode (Direct, Escape or Deeplink) under Quick Settings, where the link.me Template has its "Deeplink Banner" toggle, so that one choice covers the page-open Escape Overlay and the starting Mode of new Links.

Editor: Links

27. As a Creator, I want to see my Links in the order Visitors see them, so that the Editor matches my page.
28. As a Creator, I want "Add link" to open one form with title, Destination URL, icon, background image, Adult flag and Mode, so that adding a Link is one step.
29. As a Creator, I want to pick the Link's icon from the stock icons v1 offers (OnlyFans, link, Twitch, Instagram, none), so that my cards look like today's cards.
30. As a Creator, I want to upload a Link's background image in any common format and have it come out as a 1080px webp, so that I never convert files myself.
31. As a Creator, I want to replace or remove a Link's background image, so that I can change a card's look.
32. As a Creator, I want to set each Link's Mode with a three-way choice, preset to my Profile's default for a new Link, so that each Link leaves the In-App Browser the way I want.
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
44. As a Creator, I want my Destinations to be readable only by me and the Operator, never by a Visitor or another Creator through any page or API, so that ADR 0004 holds for Links made in the Editor.
45. As the Operator, I want Creators unable to change their own verified badge, Username or ownership, so that the badge means I granted it and Profile addresses stay stable.
46. As the Operator, I want each Creator to own at most one Profile, so that Usernames are not hoarded.
47. As a Visitor, I want a Link that a Creator added in the Editor to look and behave like an imported Link (Mode, Age Gate, Reveal), so that new and old Profiles act the same.

Operator

48. As the Operator, I want to keep editing any Profile, Link or account in PocketBase's admin UI, so that I can fix or take over anything.
49. As the Operator, I want to set the SMTP sender once in PocketBase's settings, so that verification and reset emails come from my domain.
50. As the Operator, I want the n8n Form to be mine alone once Creators have the Editor, so that no Creator edits through a login-less form.

## Implementation Decisions

- **Owns.**
  - **Editor client** (new): the Editor's screens. These are sign-up, log-in, forgot-password, verify-email confirmation, reset-password confirmation, Onboarding (claim Username → Profile → first Link → live address) and the Editor itself (Profile panel, Quick Settings, Links list, Link form).
  - **Editor route** (a change to Phase 2's app): serves the Editor client under one path prefix, `/edit`, matched before the Profile catch-all.
  - **Auth-and-ownership migration** (a new PocketBase migration): the invite list, the sign-up rule, the ownership rules on Profiles and Links, Username validation, and the action URLs in the verification and reset emails.
  - **Spec** `03-auth-and-editor`.
- **Interfaces.**
  - **Editor client.** Exposes screens, not code. Its fixed URLs are the two that emails link to: `/edit/verify?token=…` and `/edit/reset?token=…`. Every other screen sits under `/edit` and is free to move.
  - **Editor route.** Adds the `/edit` prefix to the app. No other route changes.
  - **Auth-and-ownership migration.** Changes only rules, the invite list and validation on Phase 2's collections. It adds a field only where the "Schema" item below says so.
- **Schema.** The decision, trimmed. Field names follow Phase 2's, so "owner" means whatever relation Phase 2 gives a Profile to its Creator; D2 writes the rule as `user = @request.auth.id`.

  ```
  invites   email (unique, required)            every API rule: superuser only
  users     create: request email ∈ invites.email      view/update/delete: own record (PocketBase default)
  profiles  owner → users, unique (one Profile per Creator), optional (imported Profiles have none)
            username: ^[a-z0-9_]{3,30}$, unique, not a reserved name
            create: signed in AND owner = self
            update: owner = self AND username, owner, verified unchanged
            delete: superuser only
  links     create/update/delete: the Link's Profile's owner = self; update cannot move a Link to another Profile
            Destination readable only by the owning Creator (and superusers); never anonymously
  ```

  Phase 3 changes none of Phase 2's read rules, as long as they publish no Destination. If Phase 2 has not given Profiles an owner relation or a default Mode (ADR 0003), this migration adds them as optional fields. That change is additive, so the v1 Import stays valid.
  ASSUMPTION: Phase 2's collections carry the owner relation, the Profile default Mode and the Link fields named in the plan (secret url, mode, isAdult, geo, order). Overturned by Phase 2's spec naming them differently; the rule shapes above then bind to Phase 2's names.
- **Contracts.**
  - **Editor ↔ PocketBase.** PocketBase's REST API, same-origin, called with plain `fetch` (no SDK). The auth token is kept in `localStorage` and sent as the `Authorization` header. A 401 response sends the Creator to log-in, with a return path.
    ASSUMPTION: PocketBase's API is reachable on the Profile origin through Phase 2's Caddy. Overturned if Phase 2 keeps it internal; the Editor route then also proxies PocketBase's API paths same-origin, so no CORS has to be opened.
  - **Editor ↔ Phase 2's image upload endpoint.** The Editor sends the raw file (jpg/png/heic/gif/webp) with the Creator's token and the target: their avatar, or one Link's background image. The endpoint stores the webp (avatar 512px, background 1080px, q80, per D4) and returns the stored image reference. The browser never converts images.
    ASSUMPTION: the endpoint writes to PocketBase as the calling Creator, so collection rules decide ownership (ADR 0002: "the Node app does not"). Overturned if Phase 2's endpoint writes with superuser rights; it must then check ownership through PocketBase with the Creator's token before writing, and this spec's rules tests cover it.
  - **Stored values the Editor writes.**
    - Mode: exactly `direct`, `escape_ig` or `deeplink` (ADR 0003).
    - Adult: a boolean.
    - Geo Rule: a JSON object.
    - Icon: the same value form the v1 Import stores for the stock icons (v1 uses `/images/onlyicon.webp`, `/images/linkicon.webp`, `/images/twitchicon.webp`, `/images/igicon.webp`, or empty).
    - Order: a number for each Link.
  - **Email links.** PocketBase's verification and password-reset templates point at `{APP_URL}/edit/verify?token={TOKEN}` and `{APP_URL}/edit/reset?token={TOKEN}`. PocketBase's application URL is the public origin.
- **D9: sign-up is private and invite-only** (rung 4: opening sign-up later is additive, a rule change plus the public extras listed under Out of Scope, whereas spam from open sign-up can get the one shared domain Flagged, which cannot be undone). The invite list holds email addresses, and the users create rule admits only those addresses. PocketBase's unique email makes each invite single-use with no hook or code generation (rung 5).
  ASSUMPTION: D9 is answered "private / invite-only". Overturned by the Operator answering "public". Sign-up then opens to anyone, and the public-sign-up items under Out of Scope come back in.
- **Writes are not gated on email verification** while sign-up is invite-only. The invite list already decides who may sign up. Verification is still sent and shown, and password reset depends on it (rung 5).
  ASSUMPTION: the invited mailbox owner is the person who signs up, so unverified accounts may edit. Overturned by public sign-up, or by an invited address being taken by someone else; every write rule then also requires a verified account.
- **The sign-up sequence:** create the account → sign in → request verification → create the Profile with the chosen Username, which is the claim. If the claim fails (taken, reserved or invalid), the Creator is already signed in and lands on the claim step. PocketBase's unique index and validation reject the Username, and the Editor shows the reason. There is no separate availability lookup (rung 5).
- **Username rules:** lowercase letters, digits and underscore, 3 to 30 characters. Input is lowercased as it is typed. All 26 parsing v1 Usernames already fit (observed: `ls linkme_clone3/api/profiles` gives names of 4 to 13 characters from `[a-z0-9_]`). The reserved names are `edit`, plus every top-level path segment the v2 stack routes. The implementer reads those from Phase 2's app router and Caddy file, so a Username can never shadow a route. The rule is enforced in PocketBase, not only in the browser.
  ASSUMPTION: no dot in Usernames, so `/{username}` never collides with a file such as `/landing.html`. Overturned if the Operator wants dotted Usernames (Instagram allows them); the reserved-name check would then have to cover file names too.
- **A Creator cannot change their Username, delete their Profile or edit the verified badge.** The Operator does these in PocketBase's admin UI (rung 4: a Username change breaks every bio that links to it; the badge is only meaningful if the Operator grants it). Following "nothing more" in plan §6, the Editor shows no verified control.
  ASSUMPTION: the verified badge is the Operator's alone, although the n8n Form lets whoever fills it tick "verified" today. Overturned if the Operator wants Creators to keep self-verifying.
- **One Profile per Creator** (rung 5; CONTEXT.md's Profile entry already assumes this).
  ASSUMPTION: no Creator runs several Profiles. Overturned by agency-style accounts, which would drop the unique owner.
- **"Publish" is the last Onboarding screen, not a state.** A Profile is public as soon as it exists, as D2 and §6 require ("live instantly"). The publish step shows the live address with Open and Copy (rung 5: no published field and no change to Phase 2's public page).
  ASSUMPTION: a half-onboarded Profile being publicly reachable is harmless under invite-only. Overturned if Profiles must stay hidden until the Creator publishes; that adds a published flag that Phase 2's public page checks.
- **v1 Creators' imported Profiles** are handed over by the Operator, who sets the Profile's owner in PocketBase's admin UI. If such a Creator tries to claim their old Username at sign-up, they see "This Username is taken. If it was yours on v1, ask the Operator to hand it over" (rung 5: no claim-by-invite logic).
  ASSUMPTION: the Operator moves v1 Creators by hand. Overturned if there are too many to do by hand; the invite would then carry the Username to hand over.
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
- **A new Link's Mode starts as the Profile's default.** The Link's own Mode is then stored explicitly (ADR 0003: "every Link has one").
  ASSUMPTION: Phase 1/2 store a concrete Mode on every Link. Overturned if they treat an empty Link Mode as "inherit"; the selector then gains a fourth choice, "Profile default".
- **OnlyFans tracking and the default Tracking Code are fields in the Link form.** The plan's §6 list of Link fields leaves them out. v1 has both (the n8n Form's "click if its OF link" checkbox and `default_tracknumber`), and D5 keeps the `/c{code}` suffix. Leaving them out would lose attribution on every Link made in the Editor.
  ASSUMPTION: Phase 2's links collection keeps v1's tracking flag and default Tracking Code, because its "serves every existing profile identically" DONE needs them. Overturned if Phase 2 folds both into the Geo Rule; these two inputs are then dropped and the textarea covers them.
- **The Geo Rule textarea is checked in the browser and stored in PocketBase as JSON.** It must parse as a JSON object, or be empty for "no Geo Rule". Any other input blocks the save with a message. There is no deeper schema check (rung 5; plan: "raw JSON textarea (no UI yet)").
- **The Destination is editable by its owner.** The Editor shows it in the Link form.
  ASSUMPTION: Phase 2 stores the Destination in a field the owner can read under a rule. Overturned if Phase 2 makes it a superuser-only hidden field; the Editor then treats the Destination as write-only ("leave blank to keep the current one").
- **Mail.** SMTP is the Operator's credential and is set by hand in PocketBase's settings, never in the repo (`# manual:` in Acceptance). Local runs have no mail server.
  ASSUMPTION (evidence blocked): with no SMTP configured, PocketBase still answers the verification and reset requests with success and only fails the delivery. No PocketBase binary or image is on this machine to check this: `which pocketbase` finds nothing, and `docker images` shows no PocketBase or mail-catcher image. Overturned if PocketBase returns an error. The local stack then needs a mail catcher, which is an image pull that is parked for the human (for example `docker pull axllent/mailpit`).
- **n8n becomes Operator-only with no change to n8n by this Phase.** n8n is a live system on the VPS (floor 2), and D1 says "n8n stays as is". The Operator stops giving the n8n Form URL to Creators and turns on the form trigger's Basic Auth by hand (`# manual:`).

## Testing Decisions

One seam: **the running v2 stack at Playwright's `baseURL`**, driven by one spec, `tests/e2e/03-auth-and-editor.spec.ts`. That stack is Phase 2's local Docker Compose stack plus its seed, used as the `webServer` (plan §7). No new test runner and no unit-test seam (rung 3: the existing `./check.sh` → `npx playwright test` loop).

- **Creator journeys** run in Playwright's browser at a phone-sized viewport and assert only what the Creator or a Visitor sees.
- **Operator actions and rule checks** use Playwright's `request` fixture against the same origin, which is the same seam at the HTTP level. This covers adding an invite as a PocketBase superuser (what the admin UI does), and acting as a second Creator or anonymously. The rules have no UI that would let a non-owner even try, so HTTP is the highest seam that reaches them.
  ASSUMPTION: the local stack's seed creates a local-only PocketBase superuser, whose credentials the spec reads from environment variables with local defaults. Overturned if Phase 2's seed already provides another Operator path; the spec uses that one instead. If Phase 2 provides none, Phase 3 adds the superuser to the seed, local only.
- **Every run uses unique email addresses and Usernames** (a timestamp suffix), because the local stack is reused between runs (`reuseExistingServer`).
- **Images** are built in the test as an in-memory PNG and passed with `setInputFiles`. This needs no fixture file and proves that a non-webp input comes out as webp.
- **Mail-less.** The spec asserts what the Creator sees, and that PocketBase accepts the verification, resend and reset requests. It opens the verify and reset screens with a bad token and expects the "invalid or expired" message. The real email round trip is `# manual:` (it needs the Operator's SMTP).
  ASSUMPTION: tests cannot receive email tokens locally, so the happy paths of the verify and reset confirmation screens are checked by hand. Overturned once a local mail catcher exists; the spec would then follow the real links.
- **Screenshot.** The spec saves a screenshot of the finished Editor to `.scratch/goal_ai/shots/03-auth-and-editor.png` (plan §7, step 2).

Behaviours the spec covers:

1. An address not on the invite list is refused sign-up with the invitation message.
2. Tracer bullet, which is the plan's DONE:
   - the Operator invites an address, and the Creator signs up with a new Username
   - Onboarding: display name and PNG avatar, then a first Link with title, Destination, stock icon, PNG background, Adult on and Escape Mode, then the live-address screen
   - the public `/{username}` shows the display name and the Link title, and both images are served as webp
   - the Destination string appears nowhere in that page's HTML or its network responses
3. A taken Username, a reserved one (`edit`) and an invalid one (`Bad.Name`) are each refused. The Creator stays on the claim step and can claim a valid one.
4. In the Editor, the Creator does each of these and the public Profile shows the result on the next load:
   - edits a Link title
   - adds a second Link and moves it up
   - deletes a Link after confirming
   - changes the Profile default Mode, which preselects that Mode for the next new Link
5. Invalid Geo Rule JSON shows an error and leaves the Link unchanged. Valid JSON saves.
6. Log out sends the Creator to log-in. Logging in again lands in the Editor. A Creator who logs in in the middle of Onboarding resumes at the right step.
7. "Forgot password" shows the same "check your inbox" message for a known and an unknown address. The verify and reset screens reject a bad token.
8. Rules, over HTTP:
   - another Creator cannot update, delete, or add a Link to the first Creator's Profile
   - another Creator cannot read its Destinations, and an anonymous caller cannot either
   - the owner cannot change their own Username, owner or verified badge
   - a second Profile for the same Creator is refused

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
# manual: for each v1 Creator, set their imported Profile's owner to their new account in PocketBase admin UI.
./check.sh
```

## Depends on

- **Phase 2**:
  - PocketBase with the users, profiles and links collections, its admin UI and its email (verify/reset) machinery
  - the app container that serves public Profiles at `/{username}`, the image upload endpoint (any format → webp) and the Reveal and redirect behaviour
  - Caddy routing
  - the local Docker Compose stack plus seed, which `playwright.config.ts` uses as its `webServer`
- **Phase 1**: the three Mode values and what each does on the public page, carried into v2 by Phase 2. The Editor only writes the values.
- **Phase 0**: nothing directly. Its random Link Ids and the "no Destination in public files" rule (ADR 0004) carry into v2 through Phase 2, and this Phase's tests re-check that rule for Links made in the Editor.

## Out of Scope

- **Extras that only public sign-up needs** (content rules, abuse reporting, a verified-email gate on writes, captcha and sign-up rate limits). Not needed while sign-up is invite-only (D9 above). They come back in if the Operator answers D9 "public".
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

- **D9 may be escalated to the human.** It is decided above as invite-only and flagged. Every part of the design that depends on it sits in two places: the users create rule (one line) and the "no verification gate" decision. Switching to public means changing that rule, adding the verified clause to the write rules, and bringing back the public-sign-up Out of Scope items.
- **Gap between this Phase and Cutover.** Editor saves go to v2. ofl.ink keeps serving v1 until Phase 5. Until then, a Creator's Editor edits show only on v2's own address, and live v1 edits still go through the Operator's n8n Form. This is the plan's own sequencing (D1, Phase 5). It is recorded here, not reopened.
- **PocketBase behaviours this spec relies on but could not observe**, because no PocketBase binary or image is on this machine and network fetches are out of bounds. Each is flagged where it is used:
  - a mail-less request still succeeds
  - unverified accounts can sign in
  - collection rules can read the request body and other collections
  - unique indexes give a readable validation error

  The exact rule syntax depends on the PocketBase version Phase 2 pins. The rule shapes in "Schema" state the intent, not the syntax.
  ASSUMPTION (evidence blocked): an unverified PocketBase account can authenticate with its password by default. Overturned if the pinned version blocks it; sign-up would then stop at "verify your email" and the tracer-bullet test would mark the account verified through the superuser API before logging in.
