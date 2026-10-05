# 21: A photo uploaded in any D4 format is stored upright and resized as WebP

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 17, 18, 19, 20, 30, 32, 58
Seams: the running stack's public HTTP surface at baseURL through `./check.sh`: multipart uploads with the `request` fixture, and the returned images loaded in the browser for their natural size. PocketBase's REST API on its loopback port, to make tokens and to try a direct file write
Blocked by: 16: The Fixture Profile is served by v2's stack and every Phase 0 and Phase 1 spec passes on it
Status: claimed 20261004T191309Z 2026-10-05T00:57:28Z

**What to build:** A caller holding a PocketBase token that may change a record sends a photo straight from a phone (JPG, PNG, HEIC, GIF or WebP) to the upload endpoint. The targets are a Profile's avatar, a Link's icon and a Link's background.
1. The app first checks the token by viewing the target record through PocketBase, before decoding anything. The app never decides ownership itself.
2. It turns the image upright from its camera orientation.
3. It shrinks the longest side to 512 px (avatar, icon) or 1080 px (background), never enlarging.
4. It keeps transparency and drops all metadata, location and camera tags included. An animated GIF keeps its first frame.
5. It encodes WebP at quality 80 and replaces the file with the caller's token. PocketBase deletes the old file.

The answer names the new file, and the Profile JSON then carries it.

Each refusal leaves the record unchanged:
- no token: 401;
- a malformed token, or a plain users record's token: refused, with 401 or PocketBase's own 403 or 404 passed through;
- a target not in the list: 404;
- over 20 MB: 413;
- anything that is not a decodable image, or an image over the decoder's default pixel limit: 415.

PocketBase itself refuses a PNG put straight into a file field.

A v1 image that is not WebP imports through the same pipeline at its target size. None exists in the v1 Snapshot today.

Committed fixtures cover every format and are made offline with no new tool. This Mac's `sips` writes the HEIC, JPEG, PNG and GIF fixtures, and Chromium's canvas writes the WebP one. `sips` cannot set an orientation or GPS tag, so a small script with no package writes those EXIF blocks. Among them:
- a JPEG tagged with EXIF orientation 6;
- a JPEG carrying GPS and camera tags;
- a 3000×2000 background and a 2000×2000 avatar;
- a small image.

ASSUMPTION: the Link icon target stays, though plan-review's Not yet specified notes that Phase 3 offers stock icons only and nothing uses the target yet. Rung 2: the spec's upload targets, and plan section 6 ("icon, bg image (any format -> webp)"). It costs one entry in the target list. Overturned if the Operator confirms stock icons only. The icon target then goes.

ASSUMPTION (the spec's, evidence blocked): sharp alone may not decode HEVC-coded HEIC. If the HEIC case fails, this ticket sets `Status: parked — network: pnpm --dir app add heic-convert && docker compose --env-file tests/e2e.env build` and pastes in the failing output. Once the human has run that, the ticket resumes with heic-convert decoding HEIC ahead of the pipeline. Overturned if the HEIC case passes with sharp alone.

- [ ] The upload spec passes under `./check.sh`:
  - every format comes back as WebP, judged by its bytes, both from the returned URL and from the Profile JSON;
  - the 3000×2000 background comes back at 1080×720 and the 2000×2000 avatar at 512×512;
  - the small image is not enlarged;
  - orientation 6 comes back with its sides swapped;
  - the GPS-tagged JPEG comes back with no EXIF or XMP chunk.
- [ ] Every refusal in the spec leaves the record unchanged, and PocketBase refuses a PNG written straight into a file field.
- [ ] After a replacement, the old file's URL answers 404 and the new one has the immutable cache header.
- [ ] A throwaway v1-shaped tree whose avatar is a PNG imports with a WebP avatar at 512 px.
- [ ] The fixtures are committed and small. No new tool, package or network fetch made them.
