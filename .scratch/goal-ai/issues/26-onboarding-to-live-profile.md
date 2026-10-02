# 26: A verified Creator goes through Onboarding to a live Profile whose Links act like imported ones

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 9, 17, 18, 19, 27, 29, 30, 31, 32, 33, 39, 43, 47, 49, 50
Seams: the running v2 stack at Playwright's baseURL: Creator journeys in the browser at 390×844; the Visitor side in a fresh context with no Editor session, its navigation intercepted as in the smoke spec; rule checks with the `request` fixture at the same origin. One Operator step arranges state at PocketBase's loopback port, as a superuser: marking the account verified
Blocked by: 25: Anyone with the sign-up link creates an account and claims a Username, 18: Every Click on a v1 Link ends at v1's Destination for the same Tracking Code and Visitor location, 21: A photo uploaded in any D4 format is stored upright and resized as WebP
Status: ready-for-agent

**What to build:** The plan's DONE, "new user signs up, adds a link with image, page live". Until 31 brings mail, the Operator step stands in for the verification link.

- **The verified-email gate.** While the account is unverified, its token can create the claim and nothing more. It cannot update its Profile, add a Link, or upload an avatar through Phase 2's upload endpoint, which writes with the caller's token.
- **The Profile step.** Once the account is verified, Continue moves on to the Profile step. It asks for a display name (required) and a bio, and takes an avatar in jpg, png, heic, gif or webp. The Editor sends the raw file to Phase 2's upload endpoint with the Creator's token, and the endpoint stores a 512 px webp. The browser never converts an image.
- **The Link form.** The first-Link step is the Link form the Editor uses everywhere. It holds:
  - title and Destination;
  - icon, one of v1's stock icons (OnlyFans, link, Twitch, Instagram) or none, stored the way Phase 2 stores imported icons;
  - background image, in any of the same formats, stored by the endpoint as a 1080 px webp;
  - an 18+ toggle (Adult), independent of Mode;
  - Mode: "Profile default (currently …)", Direct, Escape or Deeplink. A new Link starts on Profile default, which stores no Mode;
  - OnlyFans tracking on or off, and a default Tracking Code of digits only, or empty.

  The stored values are the spec's (Contracts, Stored values). A new Link takes the highest order plus one, and Phase 2 gives it a random Link Id the Creator never chooses.
- **The live address.** The last Onboarding screen shows the Profile's public address with "Open" and "Copy". It leads into the Editor, which for now holds the Links list, in the order Visitors see them, and "Add link", which opens the same Link form.
- **Derived progress.** `/edit` extends 25's routing. With no display name it opens the Profile step, with no Link the first-Link step, and otherwise the Editor. Nothing about progress is stored.
- **The content rules.** These are the rest of the auth-and-ownership migration, as the spec's Schema states them:
  - profiles update: the signed-in owner with a verified email, setting none of Username, owner or the verified badge;
  - links list and view: the signed-in owner of the Link's Profile only;
  - links create: the same owner, verified, setting neither the record id nor the Link Id, with a Destination that starts with `https://`, `http://` or `/`;
  - links update: the same owner, verified, setting neither the Profile nor the Link Id, with the same Destination check when a Destination is sent;
  - links delete: the same owner, verified;
  - file fields take `image/webp` only. Phase 2 already restricts them (21: "PocketBase itself refuses a PNG put straight into a file field"), so this is a no-op if that holds.

ASSUMPTION: until 31, a test that needs a verified Creator arranges one the way the Operator would. A superuser marks the account verified at PocketBase's loopback port, and the Creator then presses Continue. The spec keeps that Operator step for the hand-over and follows the real link everywhere else (Testing Decisions, Mail). Rung 2: the brief keeps every ticket that does not need mail ready-for-agent. Rung 4: it is test arrangement only and changes nothing shipped, and 31 swaps it for the real link in every test but the hand-over. Overturned if verification must be proven by the real link in every ticket; 26 to 30 then also block on 24.

- [ ] Over HTTP, an unverified Creator's token is refused when it updates its Profile, adds a Link, or uploads an avatar through the upload endpoint. The owner then reads both records back unchanged.
- [ ] At 390×844, the journey after sign-up runs end to end:
  - the Operator step marks the account verified, and Continue opens the Profile step;
  - the Profile step does not move on without a display name, and then takes one with an in-memory PNG avatar;
  - the first-Link step takes a title, an OnlyFans-style Destination on example.com, the OnlyFans stock icon, a PNG background, Adult on, Escape Mode, tracking on and default Tracking Code `7`;
  - the last screen shows the live address with Open and Copy;
  - in the Editor, the Creator adds a second Link: Adult off, Direct Mode, a different Destination.
- [ ] In a fresh context, `/{username}` shows the display name and both Link titles, and serves the avatar and the background as `image/webp`.
- [ ] Neither Destination string appears in that page's HTML, its Profile JSON or any of its network responses before a Link is pressed.
- [ ] The non-Adult Link's `/r/{Link Id}` answers 302 to its Destination.
- [ ] Pressing the Adult Link shows the Age Gate. "Continue (18+)" calls Reveal, whose real answer is the entered Destination followed by `/c7`. The navigation itself is intercepted.
- [ ] `./check.sh` passes.
