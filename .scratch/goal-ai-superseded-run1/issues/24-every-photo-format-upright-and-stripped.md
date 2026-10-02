# 24: Every phone photo format arrives upright, shrunk to its target and stripped of metadata

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 14, 15, 16, 43
Seams: the stack's public HTTP surface. Playwright `request` sends multipart uploads and reads back the stored bytes. `page` reads `naturalWidth` and `naturalHeight`. Committed image fixtures stand in for phone photos, so the spec runs offline.
Blocked by: 23: An avatar uploaded through the app is stored as WebP…; 17: The v2 stack starts with one `docker compose up`… (its HEIC probe result decides whether HEIC is decoded through heic-convert)
Status: ready-for-agent

**What to build:** Any image a Creator sends from a phone (JPG, PNG, HEIC, GIF or WebP) is stored as WebP, for every upload target.

- A Profile's avatar and a Link's icon are shrunk to 512 px on the longest side, and a Link's background to 1080 px. An image is never enlarged.
- It is turned upright from its camera orientation and keeps its transparency.
- Location and camera metadata are dropped.
- An animated GIF keeps its first frame.
- Anything over 20 MB, and anything that cannot be decoded, is refused.

HEIC goes through sharp alone or through heic-convert, as ticket 17's probe decided. No other dependency is added.

- [ ] Committed JPG, PNG, GIF, WebP and HEIC fixtures each come back as WebP, judged by the `RIFF…WEBP` bytes. This holds both at the URL the upload returns and at the URL in the Profile JSON.
- [ ] Sizes read in the browser:
  - a 3000×2000 background comes back at 1080×720;
  - a 2000×2000 avatar comes back at 512×512;
  - a large icon comes back at 512 px on its longest side;
  - a small image is not enlarged.
- [ ] A JPEG tagged with EXIF orientation 6 comes back with its width and height swapped.
- [ ] A JPEG carrying EXIF GPS and camera tags comes back with no `EXIF` or `XMP ` chunk in the WebP file.
- [ ] A PNG with transparency comes back as a WebP with an alpha channel.
- [ ] An animated GIF comes back as a WebP with a single frame.
- [ ] Each of these is refused:
  - a text file gets 415;
  - an image over sharp's default pixel limit gets 415;
  - a body over 20 MB gets 413.
- [ ] Every fixture is committed, small, and made offline. No fixture is a real Creator's photo.
- [ ] A screenshot of a Link with an uploaded background, and of the rotated photo, is saved under `.scratch/goal-ai/shots/`.
- [ ] Playwright: extends `tests/e2e/02-image-upload.spec.ts`. `./check.sh` passes.
