# 33: A Creator who holds a Profile logs in at `/edit`, sees it in the Editor and logs out, and no one else can read its Destinations

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 10, 11, 12, 13, 22, 23, 27, 42, 44, 48
Seams: Creator journeys in Playwright's browser at a phone-sized viewport, asserting only what the Creator sees. Rule probes through Playwright `request` at the same origin, as a second Creator and anonymously. Superuser steps go to PocketBase's loopback port: creating the Creator accounts, creating an ownerless Profile as the v1 Import does, and handing it over.
Blocked by: 32: The Editor's address and the Creator's PocketBase paths answer on the Profile origin…; 18: Every PocketBase collection comes from versioned migrations… (the Profile's owner relation, and the closed read rules this ticket opens); 19: Every v1 Profile opens on v2 from PocketBase… (the shape of an imported, ownerless Profile)
Status: ready-for-agent

**What to build:** The first path through every layer, read-only. The Operator hands a Profile to a Creator by setting its owner in PocketBase. The Creator opens `/edit` and logs in with email and password on a screen in the Editor's look. They land in the Editor, which shows:

- "Your Bio Link" at the top: the Profile's address, with a copy button;
- the display name, the @Username (read-only) and the bio;
- "Featured Links": one row per Link, in the order Visitors see them;
- a log-out control.

The Editor copies the link.me Template's "Edit Profile" screen, phone-first, and nothing more; the log-in screen reuses its look. The Editor is static HTML, CSS and script, with no build step and no new dependency. It shows Creator-entered text as text, never as markup. The session token stays in the browser, so the Creator stays logged in across reloads until they log out.

In PocketBase, a signed-in Creator may now list and view their own Profile and its Links, and nothing else. Writes stay closed until later tickets open them. The Operator's superuser keeps full access.

ASSUMPTION: the spec's one auth-and-ownership migration arrives as one additive migration per ticket (33 to 41), each adding the rules its screens need (rung 4: every step is additive and a fresh stack replays them all; rung 3: Phase 2's collections already come only from versioned migrations, ticket 18). Overturned if the Operator wants a single migration; the steps then fold into one before Phase 3 reaches the VPS.

- [ ] Hand-over (spec behaviour 9). As the superuser, the test creates an ownerless Profile with a display name and a Link, as the v1 Import does, then sets its owner to a fresh verified Creator. That Creator's log-in lands in the Editor on that Profile. It shows the Profile's address, display name, @Username, bio and Link titles, in the order Visitors see them.
- [ ] The copy button puts the Profile's address on the clipboard (granted clipboard).
- [ ] Reloading the Editor keeps the Creator logged in. Log-out sends them to the log-in screen, and `/edit` then asks for a log-in again. Logging in again lands in the Editor (spec behaviour 6, first part).
- [ ] A wrong password shows PocketBase's refusal on the log-in screen.
- [ ] A display name and a Link title that hold markup show literally in the Editor.
- [ ] Spec behaviour 10, reads. A second Creator and an anonymous caller each get none of the first Creator's Destinations from a list, a view, or a Profile read that expands its Links. The owner reads their own.
- [ ] The superuser still reads and edits every Profile, Link and account; the hand-over itself is such an edit.
- [ ] Every v1 Profile still opens at `/{username}` with no Destination in its page.
- [ ] Playwright: extends `tests/e2e/03-auth-and-editor.spec.ts`, whose Creator journeys now run at a phone-sized viewport. `./check.sh` passes.
