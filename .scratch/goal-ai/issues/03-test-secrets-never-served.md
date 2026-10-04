# 03: Test Secrets sit beside the Fixture Profile and are never served

Spec: docs/spec/phase-00-new-repo-ground.md
Covers: user stories 3, 12, 13, 15, 17
Seams: the Dev-Server Stand-in's HTTP surface at baseURL, driven by Playwright's `request` client (smoke test 5); the Test Secrets' contents through the spec's Acceptance fixture check
Blocked by: 02: A Visitor sees the Fixture Profile at /fixture in a hermetic loop
Status: claimed 20261004T191309Z 2026-10-04T19:34:47Z

**What to build:** Every fixture Link's Destination lives in a test-only secrets file beside the fixtures. It uses v1's secrets format, one flat object from Link Id to Destination, and v1's directory layout.
- Its keys are exactly the fixture's Link Ids.
- Every Destination's hostname is exactly `example.com`. The Adult Link's is `https://example.com/adult`, and it appears nowhere in the public Fixture Profile file.
- Each non-Adult Link's public url equals its Test Secrets value, which is the v1 shape the Page Copy still navigates by.

The stand-in never hands the secrets file out. A request for v1's old secrets path, or for the fixtures' secrets file by its repo path, gets back an HTML page that contains no Test Secrets Destination. The test checks content, not status. So it holds unchanged on Phase 2's app, which answers those paths with 404 and the landing page.

ASSUMPTION: the Test Secrets land in their own ticket, together with the test that proves they are not served, and before the Reveal Stand-in that reads them. So the secrets file never sits in the repo unproven. (Rung 4.) Overturned if the build run wants fewer tickets. This one then folds into 04.

- [ ] The spec's Acceptance fixture check passes in full, including:
  - the Test Secrets keys equal the Link Ids;
  - every value is on `example.com`;
  - each non-Adult url equals its secret;
  - the Adult Destination does not appear in the Profile file.
- [ ] Smoke test 5 from the spec's Testing Decisions passes. Requested through Playwright's `request` client, neither of the two secrets paths returns the file. Each body contains `<html` and none of the Test Secrets Destinations. The status is not asserted.
- [ ] No path through the stand-in reaches a file in the fixtures' functions directory or the repo root.
- [ ] The Fixture Profile and Test Secrets sit in the same relative layout as the v1 Snapshot's Profiles and secrets file.
- [ ] `./check.sh` passes, and the spec's leak scan reports nothing.
- [ ] No dependency is added. The Playwright config, `check.sh` and `package.json` are unchanged.
