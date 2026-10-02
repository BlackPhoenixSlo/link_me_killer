# Phase 00 — New-repo ground

**Objective.** This repo has its own copy of v1's public page and a test-only Fixture Profile. The local test loop serves and asserts on those two alone. Neither git nor any test output ever holds the v1 Snapshot or any of its Destinations.

## Problem Statement
Plan §8 settles that v1 (the old GitHub repo, the Netlify site and the n8n Form) is never touched, and that v2 is built entirely in this repo. This repo's test loop, though, is still wired to v1. The dev-server stand-in serves the v1 Snapshot directly. It runs v1's own Reveal against v1's real secrets file. The smoke spec asserts on a real v1 Link Id of the live `juliafilippo_` Profile. That causes four problems:

- Phase 1 has no v2 page to change. The only page the loop serves is the one §8 forbids editing.
- Every test run reads real Destinations, so a failed run can carry one into its screenshots and traces.
- A fresh clone of this repo has no v1 Snapshot, because it is git-ignored, so `./check.sh` cannot run there.
- No Profile lets every Mode be tested. `juliafilippo_` has no Mode at all and no Deeplink-style Link.

## Solution
v1's public page (index, script, style, landing page and the stock Link icons) is copied byte-for-byte into this repo. That copy is where v2's page starts: Phase 1 edits it and Phase 2's app serves it. A Fixture Profile shaped like `juliafilippo_` is added, with one Link in each Mode plus one Adult Link. A test-only secrets file sits beside it, and every Destination in that file is on `example.com`. The dev-server stand-in now serves the page copy, the Fixture Profile and a verbatim copy of v1's Reveal that reads only the test secrets file. It reads nothing from the v1 Snapshot. The smoke spec now runs against the Fixture Profile, so it never sees or asserts on a real Link Id or Destination, and it blocks every request that would leave the machine. The v1 Snapshot stays exactly as it is, outside git.

## User Stories
1. As the Operator, I want the v1 Snapshot never edited by any Phase 0 work, so that it stays a faithful reference for how v1 looks and behaves and a faithful source for the v1 Import.
2. As the Operator, I want the v1 Snapshot never committed to this repo, so that none of v1's Destinations, images or n8n exports enter v2's git history.
3. As the Operator, I want v1's secrets file kept out of every tracked file, out of git history, out of anything a blanket `git add -A` would pick up, and out of all test output, so that v2 never publishes or archives a v1 Destination (ADR 0004, ADR 0005).
4. As the Operator, I want v2's public page to start as a byte-for-byte copy of v1's index, script, style and landing page, so that v2 begins from the page Visitors already know.
5. As the Operator, I want the page copy to carry only the stock Link icons that v1 Profiles reference, and no Profile data, Creator photos, videos or n8n exports, so that the copy holds the page and nothing else.
6. As a Phase 1 implementer, I want the page copy to be the only page the test loop serves, so that each edit I make to it shows up in the next `./check.sh`.
7. As a Phase 2 implementer, I want the page copy kept where the v2 app will live, so that the app can serve it without reaching into the v1 Snapshot.
8. As a test author, I want a Fixture Profile shaped like `juliafilippo_` (display name, avatar, verified badge, bio, ordered Links with icon, background image, Adult flag, tracking flag and Geo Rule), so that the page copy renders it exactly as it renders a v1 Profile.
9. As a test author, I want the Fixture Profile to have one Direct Mode Link, one Escape Mode Link and one Deeplink Mode Link, so that every Mode is testable.
10. As a test author, I want the Fixture Profile to have one Adult Link with a Geo Rule, so that the Age Gate, Reveal and Tracking Codes are testable.
11. As a test author, I want each fixture Link's title to name its Mode or Adult flag, so that a spec can find a Link card by its visible title.
12. As a test author, I want every fixture Link's Destination held in a test-only secrets file, all on `example.com`, so that no test ever touches a real Destination.
13. As the Operator, I want the Adult Link's Destination to be absent from the public fixture Profile file and present only in the test secrets file, so that the fixture keeps the Adult-Link rule of ADR 0004.
14. As a Phase 2 implementer, I want fixture Link Ids that are already v2-shaped (random, at least 10 letters and digits, not derived from the Username), so that a seed can keep them unchanged (plan D8).
15. As a Phase 2 implementer, I want the fixtures in the same file format and directory layout as the v1 Snapshot's Profiles and secrets file, so that anything that reads the v1 Snapshot can also read the fixtures.
16. As a test author, I want the stand-in's Reveal to answer from the test secrets file only, so that a Reveal in a test returns a test Destination and never a v1 one.
17. As the Operator, I want the stand-in to never serve a secrets file as a static file, so that the local loop does not repeat v1's leak.
18. As a Visitor (simulated), I want the Fixture Profile at `/fixture` to show its display name and its four Link cards, so that the page copy plainly works from its new home.
19. As a Visitor inside Instagram (fake User-Agent), I want to see the Escape Overlay on the Fixture Profile, so that v1's current behaviour is preserved in the copy until Phase 1 changes it.
20. As a Visitor in an ordinary browser, I want no Escape Overlay, so that the page works normally outside In-App Browsers.
21. As a Visitor tapping the Adult Link, I want the Age Gate first, and after "Continue (18+)" a Reveal that sends me to the Adult Link's test Destination, so that the Age Gate-then-Reveal path is proven on fixture data.
22. As the Operator, I want the smoke spec to assert only on Fixture Profile data, never on a real Link Id or Destination, so that test sources and test output stay free of v1 data.
23. As the Operator, I want no test request to leave this machine (not a Destination, not a CDN), so that the loop is hermetic and following a Link never sends real traffic.
24. As a contributor with a fresh clone (no v1 Snapshot present), I want `./check.sh` to pass, so that the test loop depends only on what this repo tracks.
25. As the Operator, I want a phone-sized screenshot of the Fixture Profile saved as `.scratch/goal_ai/shots/00-smoke.png` on every run, so that I can glance at the page copy without running anything myself (plan §7).
26. As the Operator, I want Phase 0 to add no dependency and change neither the Playwright config, `check.sh` nor `package.json`, so that the loop the plan built before this run stays as it is.

## Implementation Decisions
- **Owns.**
  - **Page Copy**: v1's public page at `app/public/`. It holds `index.html`, `script.js`, `style.css`, `landing.html`, and under `images/` exactly the stock Link icons `igicon.webp`, `onlyicon.webp`, `linkicon.webp` and `twitchicon.webp`. At the end of Phase 0 each file is byte-identical to its v1 Snapshot original. Phase 1 edits it and Phase 2's app serves it.

    ASSUMPTION: the Page Copy lives in `app/public/`. Plan §9 puts the v2 app in `app/` and §8 has that app serve the page, so it can serve its own directory without an extra mount (rung 5). Overturned if Phase 2 lays out the app's static files elsewhere; the fix is a directory move plus one path in the stand-in.
  - **Reveal Stand-in**: verbatim copies of v1's Reveal function and its Geo Rule helper, in `tests/fixtures/netlify/functions/`.
  - **Fixture Profile**: `tests/fixtures/api/profiles/fixture.json`.
  - **Test Secrets**: `tests/fixtures/netlify/functions/secrets.json`.
  - **Dev-Server Stand-in**: `tests/dev-server.mjs`, modified.
  - **Smoke Spec**: `tests/e2e/00-smoke.spec.ts`, rewritten onto the Fixture Profile.
  - Verified but not modified: `.gitignore` already lists the v1 Snapshot (observed, `.gitignore:4`, and `git check-ignore -v linkme_clone3/netlify/functions/secrets.json` matches it). The Playwright config, `check.sh` and `package.json` are unchanged.
- **Interfaces.**
  - Dev-Server Stand-in, on `http://localhost:4173` (the `PORT` env var still overrides; baseURL is unchanged):
    - A path that names a file in the Page Copy returns that file.
    - `/api/profiles/{username}.json` returns the matching file from the fixtures' `api/profiles/`.
    - `/.netlify/functions/{name}` runs the Reveal Stand-in's handler of that name. It still reloads the handler on every call, and a missing handler still answers 404.
    - Every other path, including a Profile path such as `/fixture` or `/fixture/{code}`, returns the Page Copy's `index.html` with status 200. This is the same catch-all v1 has.
    - No path reaches any file under the fixtures' `netlify/` directory, and no path reaches the repo root. The stand-in reads nothing from the v1 Snapshot.
    - Change from today: the static root moves from the v1 Snapshot to the Page Copy, Profiles and functions come from `tests/fixtures/`, and the startup log line no longer names the v1 Snapshot.

    ASSUMPTION: the stand-in reads nothing from the v1 Snapshot, so a fresh clone passes `./check.sh`. Once the page is a copy and the smoke spec runs on the fixture, nothing in the loop needs the Snapshot (rung 5). Overturned if a later Phase wants side-by-side v1 rendering in the loop; that Phase would add it, guarded so that it is skipped when the Snapshot is absent.

    ASSUMPTION: the local Netlify stand-in stays `tests/dev-server.mjs`, not the `netlify dev` of plan §7. That file already calls itself a stand-in for `netlify dev` (rung 3), and netlify-cli would be a new, network-fetched dependency (rung 5). Overturned if the Operator wants real `netlify dev`; that is an install command for the human.
  - Reveal Stand-in: `GET /.netlify/functions/reveal?id={Link Id}&user={username}[&trackingId={code|geo}]` keeps v1's contract unchanged. For a known Link Id it answers `200 {"realUrl": …}`, appending `/c{code}` when a numeric or Geo-Rule Tracking Code applies (the Geo Rule is read from the fixture Profile file, with the country from the `x-country` header). For an unknown id it answers `404`. It reads only the Test Secrets.

    ASSUMPTION: the Reveal Stand-in is v1's Reveal copied verbatim, with its open CORS and no rate limit, because it runs only on localhost, is never deployed, and must keep v1's contract until Phase 2 replaces it (rung 5). Overturned if Phase 1 needs a Reveal behaviour v1 lacks; Phase 1 would then change the stand-in.
  - Page Copy: no interface changes in Phase 0. It still fetches `/api/profiles/{username}.json` and `/.netlify/functions/reveal`, and it still falls back to `juliafilippo_` at `/`. Because the stand-in has no such fixture, `/` falls through to the landing page, which is v1's behaviour for a missing Profile.
- **Schema.** None. Phase 0 has no database. The fixture file formats are under Contracts.
- **Contracts.**
  - The Fixture Profile is a v1 Profile file, plus a `mode` key on the profile (its default Mode) and on every Link, using plan D3's values. The page copy ignores `mode` until Phase 1. Trimmed to the decision (the Link Ids shown are placeholders):
    ```json
    {
      "profile": { "username": "fixture", "displayName": "Fixture Profile", "avatarUrl": "/images/linkicon.webp",
                   "verified": true, "bio": "Fixture Profile for tests", "mode": "escape_ig" },
      "links": [
        { "id": "<random ≥10 [A-Za-z0-9]>", "title": "Adult Link", "isAdult": true, "mode": "escape_ig", "url": "",
          "tracking": true, "geo": { "default": "10", "US": { "default": "10", "NJ": "15" }, "SI": "40" },
          "icon": "/images/onlyicon.webp", "backgroundImage": "/images/onlyicon.webp" },
        { "id": "…", "title": "Direct Link",   "isAdult": false, "mode": "direct",    "url": "https://example.com/direct",   "tracking": false, "geo": null, "icon": "/images/linkicon.webp" },
        { "id": "…", "title": "Escape Link",   "isAdult": false, "mode": "escape_ig", "url": "https://example.com/escape",   "tracking": false, "geo": null, "icon": "/images/igicon.webp" },
        { "id": "…", "title": "Deeplink Link", "isAdult": false, "mode": "deeplink",  "url": "https://example.com/deeplink", "tracking": false, "geo": null, "icon": "/images/twitchicon.webp" }
      ]
    }
    ```

    ASSUMPTION: the Fixture Profile's Username is `fixture`, not `juliafilippo_`, so that it cannot collide with the real `juliafilippo_` Profile that Phase 2's v1 Import brings into the same database (rung 4). Overturned if a later Phase needs the fixture at `/juliafilippo_`; then it is a file rename and one constant in the spec.

    ASSUMPTION: the Fixture Profile has four Links, adding a Deeplink Mode Link to the three that plan §7 and CONTEXT.md's "Fixture Profile" entry list, because §7 also says "so every mode is testable" (rung 2 needs it, but the list itself omits it). Overturned if Deeplink Mode is dropped. CONTEXT.md's entry should be widened by whoever owns it.

    ASSUMPTION: the Fixture Profile's default Mode is Escape Mode, and so is its Adult Link's. Amendment 8 gives imported v1 Profiles Escape Mode as their default, and `juliafilippo_`'s Adult Link escapes today (rung 3). This also keeps the Instagram overlay test true under the glossary's rule that the default Mode decides the on-load Escape Overlay. Overturned if Phase 1 needs the Adult Link in another Mode; that is one field in the fixture.

    ASSUMPTION: Mode is stored as a `mode` key with D3's values on each fixture Link and on the fixture's `profile` object (its default). D3 names the field and its values and says "per-link (or per-site default)", but not where the default sits in the file (rung 5). Overturned by Phase 1's chosen shape; only the fixture file changes.

    ASSUMPTION: the fixture's avatar and background image are stock icons, and no v1 photo is copied. Every candidate image is a photograph of a person, and a photo committed to git cannot be recalled from history (rung 4). Overturned if the Operator supplies a placeholder image cleared for the repo.

    ASSUMPTION: Link titles are "Adult Link", "Direct Link", "Escape Link" and "Deeplink Link", in that order, following `juliafilippo_`'s Adult-first order (rung 6). Overturned by any naming a later spec prefers; only the titles change.
  - Test Secrets has v1's secrets format: one flat object from Link Id to Destination string. Its keys are exactly the fixture's Link Ids, and every value's hostname is exactly `example.com` (the Adult Link's is `https://example.com/adult`). A non-Adult Link's `url` equals its Test Secrets value, which is the v1 shape the page copy still navigates by. The Adult Link's Destination appears only in Test Secrets.

    ASSUMPTION: `example.com` test Destinations committed under `tests/fixtures/` are not "Destinations" in ADR 0004's sense ("no Destination ... in this repo's git history"), which means real Creator destinations. They are reserved test addresses that lead to no Creator (rung 5: one static file). Overturned if ADR 0004 is meant to cover test data too; then the Test Secrets would have to be generated at test time.
  - The fixture layout copies the v1 Snapshot's tree: Profiles in `api/profiles/`, the secrets file in `netlify/functions/`. That is why the verbatim Reveal and Geo Rule helper resolve both files without edits. Anything that reads the v1 Snapshot by its root can read the fixtures by `tests/fixtures/`.
  - The fixture's Link Ids are random strings, fixed once in the file, of at least 10 letters and digits. They do not contain the Username (plan D8). Specs refer to Links by visible title, or read the ids from the fixture file. No spec hard-codes them twice.
- The Page Copy is a copy, not a link. It does not import or reference the v1 Snapshot, so Phase 1's edits can never reach v1.
- The smoke spec aborts every request whose host is not the stand-in's. Destinations (`example.com`), Font Awesome on cdnjs and the verified badge on Wikimedia therefore never leave the machine. A Visitor's onward navigation is asserted from the outgoing request, not from a loaded page. As a result, Font Awesome glyphs and the verified badge are missing from the screenshot.

  ASSUMPTION: floor 2's "nothing leaves the machine" covers the browser during tests, so the smoke spec aborts every request not addressed to the stand-in, including Font Awesome and the verified badge, which today's smoke spec lets the browser fetch. Overturned if test-time CDN requests are acceptable; then only `example.com` would need blocking, and the screenshot would show the icons.
- The smoke spec's first test sets a phone-sized viewport (390×844) and writes a full-page screenshot of `/fixture` to `.scratch/goal_ai/shots/00-smoke.png`. Playwright clears that directory at the start of each run, and the spec writes the screenshot again each time.

  ASSUMPTION: the plan §7 screenshot is written by the smoke spec itself, phone-sized (390×844), to `.scratch/goal_ai/shots/00-smoke.png`. Playwright's `outputDir` is that folder and is cleared on every run, so a hand-taken shot would not survive the next `./check.sh` (rung 5; the size is rung 6). Overturned if the Operator wants hand-taken shots kept elsewhere.
- Implementers must stop any dev server already running on port 4173 (for example one left from before Phase 0) before running specs, because the Playwright config reuses an existing server outside CI. The Acceptance fresh-copy run sets `CI=1`, so it fails instead of reusing a stale server.

## Testing Decisions
- **One seam: the Dev-Server Stand-in's HTTP surface at baseURL, driven by Playwright.** The Smoke Spec uses it through a real browser (`page`) and, for the not-served check, through Playwright's `request` client. Nothing tests the stand-in's internals.
- The Smoke Spec (`tests/e2e/00-smoke.spec.ts`) verifies these behaviours on the Fixture Profile only:
  1. `/fixture` shows the display name "Fixture Profile" and four Link cards titled "Adult Link", "Direct Link", "Escape Link" and "Deeplink Link". The phone-sized screenshot is written.
  2. With an Instagram User-Agent, the Escape Overlay ("Open in System Browser") is visible.
  3. With the default desktop User-Agent, the Escape Overlay is hidden.
  4. Tapping "Adult Link" shows the Age Gate ("Mature Content Disclaimer"). Pressing "Continue (18+)" sends a Reveal whose `id` is the Adult Link's id from the fixture file and whose `user` is `fixture`. The stand-in answers 200 with `realUrl` equal to the Adult Link's Destination from Test Secrets, and the page then requests exactly that URL (the request is blocked).
  5. Neither `/netlify/functions/secrets.json` nor `/tests/fixtures/netlify/functions/secrets.json` returns the secrets file. Each answers the page's HTML, and neither body contains any Test Secrets Destination.
  - Throughout the spec, every request to a host other than the stand-in's is aborted.
- Facts that no browser can see are checked by the Acceptance commands, not by a second test seam: byte-identity of the copies, the contents of the Page Copy and the fixtures, the v1 Snapshot staying unedited and untracked, the fresh-clone run, and the scan for v1 leaks.
- Prior art: `tests/e2e/00-smoke.spec.ts` (fake Instagram User-Agent through `test.use`, Reveal observed with `page.route`/`waitForRequest`), and `tests/dev-server.mjs` (the Netlify stand-in this Phase rewires).

## Acceptance
```sh
# These checks describe the end of Phase 0. Phase 1 is expected to break the byte-identity checks once it edits the Page Copy.

# The v1 Snapshot is unedited, git-ignored and untracked.
test -z "$(git -C linkme_clone3 --no-optional-locks status --porcelain)"
git check-ignore -q linkme_clone3/netlify/functions/secrets.json
test -z "$(git ls-files linkme_clone3)"

# The Page Copy is v1's public page plus the four stock icons, byte for byte, and nothing else.
for f in index.html script.js style.css landing.html images/igicon.webp images/onlyicon.webp images/linkicon.webp images/twitchicon.webp; do
  cmp "linkme_clone3/$f" "app/public/$f"
done
test "$(cd app/public && find . -type f ! -name .DS_Store | LC_ALL=C sort | tr '\n' ' ')" = "./images/igicon.webp ./images/linkicon.webp ./images/onlyicon.webp ./images/twitchicon.webp ./index.html ./landing.html ./script.js ./style.css "

# The Reveal Stand-in is v1's Reveal and Geo Rule helper, verbatim; the fixtures hold nothing else.
for f in reveal.js geo_utils.js; do
  cmp "linkme_clone3/netlify/functions/$f" "tests/fixtures/netlify/functions/$f"
done
test "$(cd tests/fixtures && find . -type f ! -name .DS_Store | LC_ALL=C sort | tr '\n' ' ')" = "./api/profiles/fixture.json ./netlify/functions/geo_utils.js ./netlify/functions/reveal.js ./netlify/functions/secrets.json "

# The Fixture Profile: a Link per Mode plus one Adult Link, v2-shaped ids, example.com-only test Destinations.
node -e '
const assert = require("assert");
const p = require("./tests/fixtures/api/profiles/fixture.json");
const s = require("./tests/fixtures/netlify/functions/secrets.json");
assert.strictEqual(p.profile.username, "fixture");
assert.strictEqual(p.profile.mode, "escape_ig");
const nonAdult = p.links.filter((l) => !l.isAdult), adult = p.links.filter((l) => l.isAdult);
assert.deepStrictEqual(nonAdult.map((l) => l.mode).sort(), ["deeplink", "direct", "escape_ig"]);
assert.strictEqual(adult.length, 1);
assert.deepStrictEqual(Object.keys(s).sort(), p.links.map((l) => l.id).sort());
for (const l of p.links) {
  assert.ok(["direct", "escape_ig", "deeplink"].includes(l.mode));
  assert.match(l.id, /^[A-Za-z0-9]{10,}$/);
  assert.ok(!l.id.toLowerCase().includes("fixture"));
  assert.strictEqual(new URL(s[l.id]).hostname, "example.com");
}
for (const l of nonAdult) assert.strictEqual(l.url, s[l.id]);
assert.ok(!JSON.stringify(p).includes(s[adult[0].id]));
'

# The smoke spec runs on the fixture and leaves the screenshot.
npx playwright test tests/e2e/00-smoke.spec.ts
test -s .scratch/goal_ai/shots/00-smoke.png
# manual: glance at .scratch/goal_ai/shots/00-smoke.png; it should look like v1's juliafilippo_ page, minus Font Awesome glyphs and the verified badge.

# A fresh copy of what this repo tracks, without the v1 Snapshot, passes the smoke spec on its own server.
fresh="$(mktemp -d)"
git ls-files -co --exclude-standard -z | tar --null -T - -cf - | tar -xf - -C "$fresh"
test ! -e "$fresh/linkme_clone3"
ln -s "$PWD/node_modules" "$fresh/node_modules"
(cd "$fresh" && CI=1 npx playwright test tests/e2e/00-smoke.spec.ts)

# No v1 Destination in any file git would take, in git history or in test output; no v1 Link Id in tests/.
# Prints file names only, never a value.
node -e '
const fs = require("fs"), { execSync } = require("child_process");
const sh = (c) => execSync(c, { encoding: "utf8", maxBuffer: 1 << 28 });
const v1 = require("./linkme_clone3/netlify/functions/secrets.json");
const destinations = Object.values(v1).filter(Boolean);
const linkIds = Object.keys(v1).filter((id) => id.length >= 6);
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } };
const repoFiles = sh("git ls-files -co --exclude-standard").split("\n").filter(Boolean);
const testOutput = sh("find .scratch/goal_ai/shots test-results -type f 2>/dev/null || true").split("\n").filter(Boolean);
const bad = [];
for (const f of [...repoFiles, ...testOutput]) if (destinations.some((d) => read(f).includes(d))) bad.push("v1 Destination in " + f);
if (destinations.some((d) => sh("git log --all -p").includes(d))) bad.push("v1 Destination in git history");
for (const f of repoFiles.filter((f) => f.startsWith("tests/"))) if (linkIds.some((id) => read(f).includes(id))) bad.push("v1 Link Id in " + f);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
'

./check.sh
```

## Depends on
None. The test harness this Phase rewires is already committed (`package.json`, `playwright.config.ts`, `check.sh`, the dev-server stand-in and the smoke spec, in commit `ee0d4b6`), and the v1 Snapshot is already git-ignored. What Phase 0 provides to later Phases:
- Phase 1 gets the Page Copy to edit and the Fixture Profile with a Link per Mode.
- Phase 2 gets the Page Copy for its app to serve, plus the Fixture Profile and Test Secrets in v1 format and layout.
- Phases 1 and 2 both get a smoke spec that never touches v1 data.

Plan §7 says Phase 2 replaces the stand-in ("same specs, same baseURL").

## Out of Scope
Cut (YAGNI or by the plan):
- **Serving only a `public/` folder on Netlify (`publish = "public"`).** Amendment 8: the Netlify site is not touched.
- **Making `BlackPhoenixSlo/linkme_clone3` private.** Amendment 8: the old GitHub repo is not touched.
- **Purging secrets.json from the old repo's git history.** Amendment 8. ADR 0005 accepts that the exposure lasts until Netlify is switched off after Cutover.
- **Regenerating (rotating) v1's Link Ids.** Amendment 8: v1 is untouched. v2 mints a fresh Link Id for every Link in Phase 2's v1 Import.
- **Fixing the n8n prefix bug.** Amendment 8: the live n8n workflow is not touched.
- **Repairing weiwei (invalid JSON), jaka7q (literal expression as display name), the duplicate Link Ids and the prefix-repeated ids.** Amendment 8: these repairs happen inside Phase 2's v1 Import, never in v1's files or the v1 Snapshot.
- **Run 1's done-check, "ofl.ink/netlify/functions/secrets.json returns 404; all profiles parse".** Amendment 8: v1 keeps serving the file (accepted consequence, ADR 0005). Checking it would also mean reading live production, which is out of bounds. Parsing every v1 Profile is part of Phase 2's v1 Import.
- **Mode behaviour in the Page Copy** (Escape Overlay only in Escape Mode, Android fallback URL, broader In-App Browser detection, Escape fired from the tap, `instagram://extbrowser`, Tracking Code surviving the Escape). This is Phase 1 (plan §5, §8). Phase 0's copy is verbatim.
- **The n8n Form's three-way Mode radio.** Dropped by amendment 8.
- **The real-device test matrix and its RUN.md entries.** Phase 0 changes no Escape behaviour; the matrix belongs to Phase 1 (plan §4, §5).
- **The other 26 v1 Profiles, v1's Creator photos, `example.webm`, the n8n exports, `sdf`, `txt_replacement_dmca`, `optimize.py`, README and `netlify.toml`.** None of these is the public page. Profiles and images reach v2 through Phase 2's v1 Import, which reads the v1 Snapshot. `optimize.py` is replaced by sharp (D4, Phase 2). A person's photo or a 10 MB video committed to git cannot be recalled from history.

  ASSUMPTION: `landing.html` is copied without `example.webm`. The landing video therefore shows nothing in the copy, because the stand-in answers that path with the page's HTML. Rung 4: a 10 MB binary of unknown content in git history cannot be recalled. Overturned if the Operator wants the video in v2; that is one copied file.
- **Self-hosting Font Awesome and the verified badge.** The copy is verbatim and the tests do not depend on either one. Any edit to the copy belongs to Phase 1.
- **Pointing the landing page's "Create Your Own Page" away from the n8n Form.** The copy is verbatim. The new target is sign-up, which belongs to Phase 3 (plan §5).
- **Hardening the Reveal Stand-in** (CORS limited to its own origin, rate limit). The stand-in is test-only and never deployed. ADR 0004's rules govern v2's own Reveal, which Phase 2 builds.
- **Installing `netlify dev`.** The house stand-in already plays that role, and netlify-cli would be a new dependency fetched over the network.
- **Docker Compose, the Node app, PocketBase and the seed script.** Phase 2 (plan §5, §7).
- **Editing CONTEXT.md or the ADRs.** This run writes only this spec. The discrepancies found are recorded under Further Notes.

## Further Notes
- Rung 2 (plan §8 binds over §7): §7's "Phase 0-1 (Netlify era): webServer serves linkme_clone3" is replaced by serving the Page Copy, because §8 has Phase 1 land in "the NEW repo's copy of the public page".
- Rung 1 (stale ADR text): ADR 0004's consequence that the v1 Snapshot "is untracked but not git-ignored" is out of date. `.gitignore:4` now lists `linkme_clone3/`, and `git check-ignore -v` confirms it covers the secrets file. Whoever owns the ADRs may want to update that line.
- Rung 1 (the icon set): the four stock icons are the only `/images/` files used as Link icons by v1 Profiles (`grep -ho '/images/[A-Za-z0-9_.-]*' linkme_clone3/api/profiles/*.json | sort | uniq -c`). `onlyicon2.webp` is a byte-identical duplicate of `onlyicon.webp` that no Profile references.
- Rung 1 (today's state): no v1 Destination appears in this repo's git history or in any file git would take. The only v1 data in `tests/` is the smoke spec's v1 Link Ids (the Acceptance leak scan, run before Phase 0, reports only "v1 Link Id in tests/e2e/00-smoke.spec.ts"). Phase 0 removes those.
- Every decision below rung 2 is flagged inline, beside the decision it qualifies:
  - Page Copy location: Owns.
  - The stand-in reading nothing from the v1 Snapshot, and the stand-in instead of `netlify dev`: Interfaces.
  - The verbatim Reveal Stand-in: Interfaces.
  - The fixture's Username, its four Links, its default and Adult Mode, the `mode` key, its stock-icon images and its titles: Contracts.
  - `example.com` test Destinations versus ADR 0004: Contracts.
  - Blocking all off-machine requests in tests, and the spec-written screenshot: the decisions after Contracts.
  - Leaving out `example.webm`: Out of Scope.
