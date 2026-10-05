# 26: A verified Creator goes through Onboarding to a live Profile whose Links act like imported ones

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 9, 17, 18, 19, 27, 29, 30, 31, 32, 33, 39, 43, 47, 49, 50
Seams: the running v2 stack at Playwright's baseURL: Creator journeys in the browser at 390×844; the Visitor side in a fresh context with no Editor session, its navigation intercepted as in the smoke spec; rule checks with the `request` fixture at the same origin. One Operator step arranges state at PocketBase's loopback port, as a superuser: marking the account verified
Blocked by: 25: Anyone with the sign-up link creates an account and claims a Username, 18: Every Click on a v1 Link ends at v1's Destination for the same Tracking Code and Visitor location, 21: A photo uploaded in any D4 format is stored upright and resized as WebP
Status: done

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

- [x] Over HTTP, an unverified Creator's token is refused when it updates its Profile, adds a Link, or uploads an avatar through the upload endpoint. The owner then reads both records back unchanged.
- [x] At 390×844, the journey after sign-up runs end to end:
  - the Operator step marks the account verified, and Continue opens the Profile step;
  - the Profile step does not move on without a display name, and then takes one with an in-memory PNG avatar;
  - the first-Link step takes a title, an OnlyFans-style Destination on example.com, the OnlyFans stock icon, a PNG background, Adult on, Escape Mode, tracking on and default Tracking Code `7`;
  - the last screen shows the live address with Open and Copy;
  - in the Editor, the Creator adds a second Link: Adult off, Direct Mode, a different Destination.
- [x] In a fresh context, `/{username}` shows the display name and both Link titles, and serves the avatar and the background as `image/webp`.
- [x] Neither Destination string appears in that page's HTML, its Profile JSON or any of its network responses before a Link is pressed.
- [x] The non-Adult Link's `/r/{Link Id}` answers 302 to its Destination.
- [x] Pressing the Adult Link shows the Age Gate. "Continue (18+)" calls Reveal, whose real answer is the entered Destination followed by `/c7`. The navigation itself is intercepted.
- [x] `./check.sh` passes.

## Build notes (implementer)

Files: `pocketbase/pb_migrations/1791140005_content_rules.js` (new), `app/editor/editor.js` and `app/editor/editor.css` (the Profile step, the Link form, the live address, the Editor's Links list and "Add link", derived progress), `app/src/gateway.js` (an empty links list confirmed like an empty profiles list), `tests/e2e/03-auth-and-editor.spec.ts` (the gate over HTTP and the journey; the owner-expand check amended), amended `tests/e2e/02-v1-import.spec.ts` (schema rules; re-auth probe on events, plus a `/r`-first pass) and `tests/e2e/02-live-edit.spec.ts` (anonymous links reads now "no record").

Observed on the pinned PocketBase 0.40.4 (the test stack with this migration, 2026-10-05):
- an unverified owner's Profile update answers 404, its Link create a bare 400, and its avatar upload through the endpoint 404 (the endpoint passes on PocketBase's answer to its write: the owner may view the record, so the view passes and the PATCH is refused);
- a verified owner's `owner+`, `owner-` and `username` on profiles, and `profile+`, `linkId:autogenerate` and a `javascript:` Destination on links, are refused; `linkId`, `linkId:autogenerate`, an empty or `javascript:` Destination and another Creator's Profile are refused on create; a multipart create with a WebP icon passes the rules;
- another Creator and a guest list links as 200 with no item, and so does a token PocketBase no longer accepts (a garbage token: links 200 empty, events 403). With the gateway's links confirmation removed, the new `/r`-first pass of 02-v1-import's re-auth check fails (404 for a live Link); with it, it passes.
- The file fields were already `image/webp` only (1791140001, 1791140002; 02-v1-import's schema test), so the migration leaves them alone.

ASSUMPTION: the links Destination check is three LIKE prefixes in the rules (`~ "https://%"`, `"http://%"`, `"/%"`), because PocketBase's rules have no regular expression; LIKE ignores ASCII case, and links.destination's own pattern (1791140002) still refuses anything but lowercase `http(s)://<host>` or `/<path>`, `//host` included (rung 5). Overturned if PocketBase's rules gain a prefix operator.
ASSUMPTION: the gateway confirms an empty links list as it confirms an empty profiles list, because the links read rule now lets a stale superuser token read as a guest's empty 200 (rung 1 for the behaviour; rung 3 for the fix, ticket 25's profiles confirmation). Only an unknown Username or Link Id, and a Profile with no Link, cost one extra call, with no time bound (rung 5). Overturned if a scan of unknown Link Ids must cost one call each.
ASSUMPTION: 02-v1-import's re-auth check probes the stale token on events, which stay superuser-only, as ticket 25's ASSUMPTION anticipated, and gains a second password reset after which `/r` is read before any Profile, so the links confirmation is exercised (rung 2: the brief; rung 1 for the probe's 403). Overturned when Phase 4 opens events reads; the probe then needs another superuser-only path.
ASSUMPTION: an unverified owner's refused avatar upload answers 404, PocketBase's own status for an update its rule refuses, passed on as the endpoint already passes on PocketBase's answers (rung 3: app/server.js's upload contract; rung 1 for the 404). Overturned if the endpoint must answer 403 for the gate; it would then need to tell the gate from a missing record.
ASSUMPTION: a stock icon is stored as the Page Copy's own WebP (`/images/onlyicon.webp` etc.) in the Link's icon file field, byte for byte, sent in the Link's own multipart create through the proxy, because the v1 Import copies a WebP image unchanged into that field (rung 3; the journey compares the icon the Visitor is served with `app/public/images/onlyicon.webp`), rather than through the upload endpoint, which would re-encode it (rung 5). Overturned if stock icons must be stored as a name; that needs a field.
ASSUMPTION: the default Tracking Code's "digits only, or empty" is checked in the browser alone, because PocketBase's rules have no regular expression and the field keeps v1's values verbatim for the Import; v2's Reveal ignores any other code anyway (app/src/destination.js) (rung 5). Overturned if PocketBase must refuse it; the field then needs a pattern every imported value meets.
ASSUMPTION: screen paths `/edit/profile`, `/edit/first-link`, `/edit/live` and `/edit/add-link` (rung 6: the spec fixes only `/edit`, `/edit/verify`, `/edit/reset`). Opening any of them anew runs `/edit`'s derived routing, so a reload of the live address or of "Add link" lands in the Editor (the spec's intended consequence for the live address). Overturned by a later ticket moving screens.
ASSUMPTION: the Profile step saves the display name and bio first, then sends the avatar; a refused avatar keeps the Creator on the step with the reason, and the first Link's background is sent after the Link is created, a refused one keeping the form with the reason and turning a retry into an update of that Link rather than a second Link (rung 5: no rollback). Overturned if a half-saved step must be undone.
ASSUMPTION: the Profile step's "required" display name is checked by the Editor (a whitespace-only name counts as none) with its own message, not the browser's native bubble, so the refusal is visible text (rung 5). Overturned if PocketBase must refuse an empty display name; that rule would also bind the claim.
ASSUMPTION: the Editor's home for now is "Your Bio Link" with Copy, "Featured Links" (one row per Link, titles only, in `order`) and "Add link"; editing, reordering and deleting are tickets 27 and 28 (rung 5). Overturned by those tickets.
ASSUMPTION: the journey's Operator step goes to PocketBase's loopback port, so the Onboarding journey alone skips when the stack under test is not the local test stack, as the 02 specs do (rung 3: `onLocalStack`); the verified-email gate over HTTP needs no loopback and runs against any stack. The journey reads the stored values back as the Creator, with the Editor's token through the proxy, and the stock icon from the Visitor's served Profile JSON, never as the Operator (spec, Testing Decisions: Operator steps arrange state and are not a second seam). Overturned when 31's mail catcher replaces the Operator step.
ASSUMPTION: no Creator write sets `v1Key` on a Profile or a Link: the profiles update and links create and update rules each also refuse `@request.body.v1Key:isset`, though the spec's Schema names only Username, owner and badge, and the record id and Link Id. The v1 Import reads `v1Key` as "came from v1": it matches Links by it and names a v1Key record missing from its input on a `stale in v2:` line, and records born in v2 have none (app/bin/import-v1:312-313, :402, :425, :430). Rung 4: closed is cheaper to undo than a forged v1 record; the claim (1791140004) already refuses it. Overturned if a Creator must ever write `v1Key`.
ASSUMPTION: the 03 spec's owner-expand check, written while links rules were null, now expects a 200 empty answer to the owner's filter on `links_via_profile` (it was a 400), because this ticket opens links reads to owners and that owner has no Link; an owned Profile with Links seen by another Creator or a guest is ticket 30's check (rung 2: Phase 3's checks change only where a ticket opens a rule). Overturned by ticket 30's fuller check.

Validation: `PLAYWRIGHT_BASE_URL=http://localhost:4173 npx playwright test tests/e2e/03-auth-and-editor.spec.ts --project=chromium` 12 passed against a running test stack; cold `./check.sh --reporter=line` 309 passed, 1 skipped (3.6m).
