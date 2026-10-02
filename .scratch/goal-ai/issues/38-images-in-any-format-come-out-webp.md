# 38: Avatars, Link backgrounds and stock icons go in as any common image and come out as webp, for their owner only

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 18, 29, 30, 31
Seams: Creator journeys in Playwright's browser at a phone-sized viewport, with each image built in the test as an in-memory PNG and passed with `setInputFiles`. The Visitor side in a fresh browser context, reading the served images. Rule probes against the app's upload endpoint through Playwright `request`, as a second Creator and as an unverified one.
Blocked by: 35: A verified Creator finishes Onboarding… (the Profile step); 36: In the Editor a Creator adds, edits, reorders and deletes their Links… (the Link form in the Editor, for replacing and removing a background); 23: An avatar uploaded through the app is stored as WebP, and only a caller PocketBase allows can replace it (the upload endpoint, writing with the caller's token); 24: Every phone photo format arrives upright, shrunk to its target and stripped of metadata (every format, and the Link targets)
Status: ready-for-agent

**What to build:** Images in Onboarding and in the Link form. The Editor sends each file raw, with the Creator's token, to Phase 2's upload endpoint, which stores the webp. The browser never converts images.

- **Avatar.** Onboarding's Profile step gains an avatar that takes jpg, png, heic, gif or webp and comes out as a 512px webp.
- **Background.** The Link form gains a background image that comes out as a 1080px webp, and that can be replaced or removed.
- **Icon.** The Link form gains a picker with v1's stock icons: OnlyFans, link, Twitch, Instagram and none. The Editor sets a stock icon by sending v1's own stock icon file to the endpoint as the Link's icon. "None" clears it.

The endpoint writes with the caller's token, so PocketBase's rules decide who may change an image, the verified-email gate included (ADR 0002).

- [ ] Spec behaviour 2, the images. A PNG avatar in the Profile step and a PNG background on the first Link both show on the public Profile in a fresh browser context, and both are served as webp.
- [ ] Each stock icon shows on the Link on the public Profile at the next load. "None" leaves the Link with no icon.
- [ ] A replaced background shows at the next load. A removed one leaves the Link with no background.
- [ ] Spec behaviour 10, over HTTP. Each of these is refused through the upload endpoint, and the record reads back unchanged:
  - another Creator replaces the first Creator's avatar;
  - another Creator replaces a Link's background;
  - an unverified Creator uploads an avatar to their own Profile.
- [ ] Playwright: extends `tests/e2e/03-auth-and-editor.spec.ts`. `./check.sh` passes.
