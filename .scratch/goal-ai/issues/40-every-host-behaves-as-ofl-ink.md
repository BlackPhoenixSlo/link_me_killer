# 40: On a Custom Domain or Spare Domain every Mode and Escape and Reveal works and counts as on ofl.ink

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 25, 26, 27, 28, 37, 45
Seams: the Playwright spec `05-domains` against the local stack at the existing baseURL through `./check.sh`, with `*.test` mapped to loopback in Chromium, the In-App Browser User-Agents set as Phase 0's smoke spec sets them, custom-scheme navigation captured as Phase 1's spec captures it, navigation to a Destination fulfilled with a harmless page, and Events read as a superuser through PocketBase's REST API
Blocked by: 39: Custom Domains and Spare Domains listed in PocketBase serve Profiles by host and pass the TLS Ask, 10: The escaped Link opens by itself in the System Browser credited to the same Tracking Code, 36: Only the owner reads a Profile's Stats and recording never blocks a Click or a deletion
Status: done

**What to build:** A Visitor who opens a Profile on a Custom Domain or a Spare Domain gets exactly what ofl.ink gives them, and the domain changes nothing but the address. Every URL the page builds for itself (Escape targets, anything that carries the Tracking Code, any address-bar clean-up) is rebuilt from the page's own origin plus the Profile path the app handed it, plus `/{code}`. So an Escape from `creator.test/{code}` lands on `creator.test/{code}`, and one from `spare.test/{username}/{code}` keeps `/{username}/{code}`. Reveal and the Page View ping go to the page's own host, Reveal answers that origin and refuses others, and the Page View and the Click are credited to the Profile the app resolved. Nothing the page loads or builds names ofl.ink or another of ofl.ink's hosts, so a Flagged ofl.ink does not take the other domains down with it. Reveal and `/r/{Link Id}` stay the same on every host and are not limited to the host's own Profile.

- [x] With Tracking Codes 111 and 222, each on `creator.test/{code}`, `spare.test/{username}/{code}` and `localhost/{username}/{code}`: tapping the Adult Link shows the Age Gate, Continue sends Reveal to the page's own host, and it answers 200 with a Destination ending in `/c{code}` for that page's code.
- [x] On the same three hosts, the Direct Mode Link and a Deeplink Mode Link (its Mode set in the REST set-up) each end at the same Destination.
- [x] With an iOS Instagram User-Agent, `creator.test/` shows the Escape Overlay exactly when `localhost/{username}` does.
- [x] Tapping the Escape Mode Link on `creator.test/{code}` fires an Escape whose target names `creator.test` and the path `/{code}`, with no Username segment and no other host; with an Android Instagram User-Agent the `intent://` target names `creator.test` the same way.
- [x] On `spare.test/{username}/{code}` the Escape target keeps `/{username}/{code}`.
- [x] Loading `creator.test/` adds one Page View Event, and the Adult Link's Reveal on `creator.test/{code}` adds one Click Event, both for the Fixture Profile.
- [x] On `creator.test` and `spare.test`, no request goes to another of ofl.ink's hosts (`localhost:4173` or the other `.test` host), and no request URL names `ofl.ink`. Third-party hosts the page already loads are left alone.
- [x] A `fetch` from a page on `creator.test` to Reveal on `spare.test:4173` cannot be read by the page.
- [x] A failing assertion names the Link Id and never prints a Destination, and `./check.sh` passes.

## Landed

Run 20261005T084628Z. Reviewer APPROVE (round 2 of 3). Cold ./check.sh --reporter=line: 357 passed, 1 skipped, exit 0. No app code changed: ticket 39's profilePath bootstrap already made every box hold, so the nine boxes are regression tests in 05-domains.spec.ts (16 tests). Red-first shown by a temporary script.js edit, then restored. Phase 1's In-App Browser drivers (UA, recordNavigations, xSafari, intents, escapeOverlay) moved from 01 into tests/e2e/helpers.ts (shared by 01 and 05; Playwright forbids importing a spec file); eventCount moved from 04 into helpers.ts (first Phase 4 driver there, precedent callsTo429). ASSUMPTION: the per-host 'refuses others' 403 is checked through request with a .test Host header, because the page cannot see a CORS-refused status (Playwright reports requestfailed, no response event). Known gap for RUN.md: over plain HTTP a cross-origin no-cors GET to Reveal is answered 200 and records a Click (ticket 22's 'neither header' rule, pinned by 02-reveal-guard); the page cannot read it; over HTTPS Sec-Fetch-Site: cross-site is refused.
