# 39: The Editor changes the display name, bio, avatar and default Mode, and an expired session never looks like a broken save

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 14, 24, 25, 26, 40, 42
Seams: Creator journeys in Playwright's browser at a phone-sized viewport, with the stored token replaced in the browser for the expired-session case. The Visitor side in a fresh browser context, reading the page and its payload.
Blocked by: 36: In the Editor a Creator adds, edits, reorders and deletes their Links… ("Add link" in the Editor); 37: A Link's Mode and 18+ toggle… (the Link form's "Profile default" choice); 38: Avatars, Link backgrounds and stock icons go in as any common image… (the avatar upload)
Status: ready-for-agent

**What to build:** The Editor's Profile panel and Quick Settings, as in the link.me Template's "Edit Profile" screen.

- The display name and bio can be changed. "Change Profile Picture" takes any common image, as in Onboarding, and it comes out as a 512px webp.
- Quick Settings: where the Template has its "Deeplink Banner" row, a selector for the Profile's default Mode (Direct, Escape or Deeplink). One choice covers the Escape Overlay on page open and every Link left on "Profile default", imported Links with no Mode included.
- When PocketBase answers a save with 401, the Creator goes to the log-in screen with a return path, and logging in brings them back to the Editor.
- The Username stays read-only, and the Editor shows no control for the verified badge.

- [ ] Changing the display name, the bio and the avatar each shows on the public Profile at the next load, with the avatar served as webp.
- [ ] Spec behaviour 4, last part. Changing the Profile's default Mode shows in the page payload at the next load, and a Link left on "Profile default" follows it. A new Link's form then starts on "Profile default", naming the new Mode.
- [ ] Spec behaviour 6, last part. With the stored token replaced by an invalid one, a save sends the Creator to the log-in screen. Logging in returns them to the Editor.
- [ ] Playwright: extends `tests/e2e/03-auth-and-editor.spec.ts`. `./check.sh` passes.
