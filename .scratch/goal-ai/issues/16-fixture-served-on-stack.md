# 16: The Fixture Profile is served by v2's stack and every Phase 0 and Phase 1 spec passes on it

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 2, 6, 11, 13, 15, 37, 38, 54, 55, 56
Seams: the running v2 stack's public HTTP surface at baseURL, driven by Playwright through `./check.sh`: pages, plus the `request` fixture for Profile JSON and for redirects (not followed). The parity spec's Fixture Profile journeys, with every Destination host answered by `page.route`
Blocked by: 10: The escaped Link opens by itself in the System Browser credited to the same Tracking Code, 15: The v1 Import writes the Fixture Profile into PocketBase on a running test stack
Status: done

**What to build:** From this ticket on, `./check.sh` runs every spec against v2:
- It starts the test stack in its own Compose project and waits until it is healthy.
- It seeds the stack through the v1 Import with the Fixture site. The v1 Snapshot joins the seed in 17.
- It runs the suite at the same baseURL. Playwright waits on the Fixture Profile's JSON, which exists only after the seed's last write.
- On shutdown it takes the stack down along with its data.

The Dev-Server Stand-in is deleted, and a server already on the port is never reused. When `PLAYWRIGHT_BASE_URL` is set, the suite runs against that host and starts nothing.

**The page.** A Visitor opening `/fixture` gets the Page Copy from the app. The page reads its Profile JSON from the app, built from PocketBase on every request:
- Each Link carries a fresh Link Id, its effective Mode and its default Tracking Code, verbatim, where it has one.
- Its `url` is `{origin}/r/{Link Id}` for a non-Adult Link in Direct or Escape Mode, and empty for an Adult Link or any Link in Deeplink Mode.
- No Destination, Geo Rule, owner or private v1 key is ever in it.
- Images come from PocketBase's files, only while each is still its record's current file, and they are cached for good.

**Clicks.**
- `/r/{Link Id}` redirects to a Link's Destination.
- Reveal hands out the Destination with v1's digit rule: a digit Tracking Code appends `/c{digits}`, and anything else appends nothing. Geo Rules arrive in 18.
- Neither answer is cached, and Reveal never sends a CORS header.

**Other paths.** Unknown Usernames and Link Ids answer 404 as the contract says. `/netlify/…` answers 404 with the landing page as its body. Any other path is a Page Copy file, else the index page.

The app reads PocketBase as the superuser named in the environment and never logs a Destination.

ASSUMPTION: Geo Rules wait for 18. The Fixture Profile's Adult Link has a Geo Rule but no default Tracking Code (Phase 0 spec, Contracts), and the Phase 1 spec names no `geo` case, so no Phase 0 or Phase 1 spec asks Reveal for one (rung 1, confirmed by the devil's-advocate pass). Overturned if one does. 18's Geo Rule half and Visitor location then move here.

ASSUMPTION: a Phase 1 check that a Direct or Escape Link "lands on its url" still passes on v2. Phase 1 observes this with its navigation recorder, which records the address the page navigated to, `/r/{Link Id}`, and not where the redirect ends (rung 1: Phase 1 spec, the navigation recorder). Overturned if a Phase 1 assertion reads the final address. That assertion then reads the recorder's address instead. This Phase makes two kinds of edit to a Phase 1 spec: those final-address reads become recorder reads, and the three Deeplink Link variants that strip, remove or garble the mode and expect plain navigation also set the Link's `url` to `{origin}/r/{Link Id}` (rung 1: v2 serves `url: ""` for a stored Deeplink Link, app/src/public-profile.js:30, so a variant that only strips the mode is JSON v2 never serves; a Link without a Deeplink mode carries its `/r` url).

ASSUMPTION: the seed holds only the Fixture site here. That is the fresh-clone path, which the spec requires anyway; the v1 Snapshot joins in 17 (rung 5). Overturned if 17 folds into this ticket.

- [ ] `./check.sh` starts the test stack, seeds it, runs every spec, and leaves no container or volume of the test project behind. It never reuses a running server, and a set `PLAYWRIGHT_BASE_URL` skips the stack.
- [ ] The Dev-Server Stand-in is gone, and the Phase 0 and Phase 1 specs pass on v2 with the two edits recorded above.
- [ ] The parity spec's Fixture Profile journeys pass on `/fixture` with a desktop User-Agent. Every id is read from the served Profile JSON:
  - the Direct Link's Click goes through `/r/{Link Id}` and ends at its Test Secrets Destination;
  - the Deeplink Link's Click sends Reveal with its id and never requests `/r`, and the page then requests its Test Secrets Destination;
  - `/fixture?link={Direct Link's id}` ends at the Direct Link's Test Secrets Destination.
- [ ] In the Fixture Profile's JSON:
  - every id is 12 lower-case letters or digits;
  - `url` follows the rule above;
  - both Mode fields carry effective values;
  - no `destination`, `geo`, `owner` or `v1Key` key appears.
- [ ] An unknown Username's Profile JSON answers 404 with the contract's body. `/netlify/functions/secrets.json` answers 404 with the landing page as its body. The landing page, style and script come back byte-identical to the Page Copy. An unknown path gives the index page with 200.
- [ ] Cache headers:
  - an image URL from the Profile JSON returns the Fixture site's bytes with the immutable cache header;
  - Profile JSON carries v1's must-revalidate header;
  - Reveal and `/r` answers carry no-store, and no Reveal answer has `Access-Control-Allow-Origin`.
- [ ] Nothing the app or the seed prints during a run contains a Test Secrets value.
- [ ] After a code change in the app, the rebuild fetches nothing from the network. A needed change to the app's manifest or lockfile parks this ticket on 13's install and build lines.
- [ ] The spec's Acceptance checks for the stand-in being gone and for `reuseExistingServer: false` pass, and 12's Compose checks still pass.
- [ ] `tests/e2e/01-page-copy-only.spec.ts` (ticket 01, stand-in only: it asserts 200 plus the index body for a secrets path, where the v2 app answers 404) is deleted or folded into the smoke spec now that the stack replaces the Dev-Server Stand-in.
- [ ] tests/stack-import-check.mjs's checks are folded into a Playwright spec that runs against the stack, and the script is deleted.
