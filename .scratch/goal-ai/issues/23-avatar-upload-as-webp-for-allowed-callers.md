# 23: An avatar uploaded through the app is stored as WebP, and only a caller PocketBase allows can replace it

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 14, 17, 30
Seams: the stack's public HTTP surface. Playwright `request` sends the multipart upload, and `page` reads the shown avatar. PocketBase's REST API on its loopback port provides tokens (the superuser's, and a plain `users` record's that the test creates through the superuser API) and reads the record back.
Blocked by: 19: Every v1 Profile opens on v2 from PocketBase…
Status: ready-for-agent

**What to build:** A tracer through the upload endpoint, for one target (a Profile's avatar) and one format (JPG). The other formats and targets are ticket 24.

1. The app first checks the caller's token by viewing the target record through PocketBase with that token. A caller that PocketBase refuses costs no image work.
2. The app then turns the image into WebP, with its longest side at most 512 px.
3. It replaces the file using the caller's token, never the superuser's, and answers with the new image URL.

The app holds no login, session or ownership logic of its own; PocketBase decides who may change the record (ADR 0002). In Phase 2 only a superuser token gets through.

- [ ] With the superuser's token, a JPG sent as a Profile's avatar gets 200 with a URL. Afterwards:
  - the bytes at that URL start with a `RIFF…WEBP` header;
  - the Profile JSON's avatar is that URL, and the page shows it;
  - the old avatar URL answers 404.
- [ ] With no token, the upload gets 401 and the record is unchanged.
- [ ] Each of these is refused, with 401 or PocketBase's own 403 or 404, and leaves the record unchanged:
  - a malformed token;
  - the token of a plain `users` record.
- [ ] An unknown collection, field or record gets 404.
- [ ] A refused caller who sends a file that is not an image gets the refusal, not 415, because the token is checked before any decoding.
- [ ] The app has no login, session or ownership code. Every write it makes for an upload carries the caller's token.
- [ ] A screenshot of the Profile with its new avatar is saved under `.scratch/goal-ai/shots/`.
- [ ] Playwright: extends `tests/e2e/02-image-upload.spec.ts`. `./check.sh` passes.
