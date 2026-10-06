# RUN.md — editor-ui (Editor and landing redesign), 2026-10-05/06

## Status

**DONE, locally.** The Editor at /edit and the landing page are redesigned, the suite is green cold, three path-limited
commits are on `main` (5b35981, 047c801, fe65d35) on top of another run's 27abaaa. Nothing was pushed, deployed or pulled;
v1 (linkme_clone3/, Netlify, n8n) was not touched or read; the Destination-host grep over every changed path is empty.

Full suite, run cold by the coordinator on the final tree with no other stack up (`.scratch/editor-ui/check-cold.log`):
```
./check.sh --reporter=line
  1 skipped
  431 passed (3.7m)
exit=0
```
The one skip is the HEIC `test.fixme` in tests/e2e/02-image-upload.spec.ts, as before. 06-editor-ui adds 6 tests.

## What changed

**Editor (app/editor/, commit 5b35981).** Light theme from `tokens.css`; components in `editor.css` (`e-` classes), Stats
rules in `stats.css`; `app.js` is the shell (router, api, render, shared `field/steps/icon/pageTitle/card`, `submitting()`
with aria-busy and focus return), screens in `screens/auth.js`, `screens/links.js`, `screens/profile.js`, and `stats.js`.
- One Edit Profile screen at /edit/home (ruling: no new routes): h1, jump chips (Links · Profile · Modes), Bio Link card
  (address whole, Copy, Open), Links card (Add link, rows with Up/Down/Delete), Profile card, Quick Settings card, Log out.
- Creator nav: "Editor" and "Stats" as a floating bottom bar below 1024px, a left sidebar from 1024px.
- Onboarding and log-in: cards with a "Step n of 5" line, hints under fields, full-width primary buttons.
- Link editor: a sheet with the document scrolling, a sticky Save/Cancel bar on phones, OnlyFans tracking + Default
  Tracking Code + Geo Rule inside a `<details>` "Tracking and Geo Rule" that is closed on a fresh Link.
- Delete asks in an in-page `<dialog role="alertdialog">` ("Delete this link?" / "Delete link" / "Keep it").
- Default Mode stays a native select; a one-line helper under it explains the chosen Mode and never implies a save.
- Stats: same requests, data, texts and ARIA; segmented range buttons, two filter columns, three stat cards, zebra tables.
- Copy: "PocketBase refused the Link: …" → "This Link was not saved: …"; "PocketBase did not answer." → "The server did
  not answer. Check your connection, then try again." Every spec-pinned heading, label, button, status and URL is unchanged.

**Landing (app/public/landing.html + images, commit 047c801).** Hero ("One link for your bio") with the not-found note,
"Live in three steps", "Taps that land where you want" (Direct, Escape, Deeplink, 18+ Age Gate, hidden Destinations),
"See what works" (Stats), "Ready when you are". Tokens from /edit/tokens.css, all other styles inline, no script. Exactly
one "Create your page" (→ /edit/signup) and one "Log in" link. The n8n/Netlify line is gone.

**Tests (commit fe65d35 + 27abaaa).** 03 and helpers.ts were updated in lockstep (landing link name and n8n assertions,
the delete dialog, `openTracking()` before filling disclosure fields); that hunk was swept into the other run's 27abaaa
while both were uncommitted. New tests/e2e/06-editor-ui.spec.ts covers the new flows.

**Docs.** docs/spec/editor-redesign.md: the brief (sections 1–10) and the coordinator's rulings (section 11), which
override the brief where they disagree. .scratch/editor-ui/test-inventory.md: every selector the tests use.

## Screenshots

Final shots, taken on the local stack by `npx playwright test -c tests/shots/playwright.config.ts` (Creator "mia", three
Links, seeded Page Views and Clicks), live in app/public/images/landing/: editor-links-mobile.webp, editor-stats-mobile.webp,
profile-mobile.webp (780×1688), editor-desktop.webp (1280×800). Their PNG originals are beside this file
(.scratch/editor-ui/*.png). Re-take them only with no oflinkv2 stack and no other `playwright test` running.

## Process

Step 1: brief + test inventory in parallel; codex, six-hats and devil's-advocate reviews of the brief; rulings in §11.
Step 2: a behaviour-preserving split of editor.js into modules (23/23 flows identical), then five surface agents in
parallel (shell/CSS, auth, Links, Profile/Modes, Stats) plus the landing; a fresh reviewer per piece (all REQUEST CHANGES
round 1, findings passed verbatim), one consolidation pass for the cross-file findings, an accessibility/mobile pass
(9 fixes; AA contrast measured, 44px targets, 320px and 200% zoom, reduced motion, dialog focus), a test-update agent
(the only one allowed to run the stack), and a screenshot agent. Step 3: cold suite, commits, this file.

## Assumptions to veto (sharpest first)

1. **One Edit Profile screen with jump chips, not four tabs.** P3 says "one Edit Profile screen … nothing more" and the
   brief's tabs needed two new routes and broke the onboarding guard; the chips give the link.me feel without routes.
   Falls if the Operator wanted separate Links/Profile/Modes pages: then /edit/me and /edit/modes, a nav rule for
   Creators with zero Links, and Log out reachable from every tab.
2. **`/` still shows the default Profile (juliafilippo_); the landing lives at /landing.html.** Making `/` the landing
   needs an app/server.js change (serve landing.html when the resolved Username is empty on a non-Custom host), which the
   permission classifier refused to let this run make. Unknown Usernames and the sign-up link still reach the landing.
   Falls if ofl.ink's root must sell the product: apply that server change and add a smoke test for `/`.
3. **A `<dialog>` confirm and a closed "Tracking and Geo Rule" disclosure are better for Creators than window.confirm and
   a flat form.** Webviews may suppress confirm(); the disclosure hides fields most Creators never use. Both changed test
   steps in 03 (updated, not weakened). Falls if a Creator who needs the Geo Rule does not find it: open the disclosure by
   default and keep the summary.

Also: the Default Mode helper sentences describe the current pop-out behaviour in app/public/script.js (27abaaa); the
landing names no adult platform; the Save bar stops being sticky below 481px of height (200% zoom, landscape phones).

## What the Operator must do

- Deploy as usual (not done here): the app image copies app/editor and app/public, nothing else changed; no migration
  from this run (27abaaa's popOutTiming migration is the other run's).
- Decide assumption 2 (landing at `/`); the change is five lines in app/server.js's catch-all.
- Look at the landing at https://v2.ofl.ink/landing.html and the Editor on a real phone (iOS Safari: the sticky Save bar
  above the keyboard, the bottom nav above the home indicator); no test runs on a real device.
- Optional: the Stats Link filter does not offer "Deleted link" although phase-04 §Stats page says so (pre-existing,
  not a restyle matter); the public Profile shows Link icons only with a background image (as v1), so the profile shot
  is plain.

## Phase 06 (2026-10-06): landing at `/`, several Profiles, self-service Custom Domains

Assumption 2 above is overturned: `/` is the landing (1115f19), with "See a demo" → /demo (claim Username `demo` on the VPS).
Design: docs/spec/phase-06-sites-and-domains.md (§ 2 Option A, § 3 Option 1, no redirect mode). Built by two parallel opus
agents (PROFILES: tickets 1-3; DOMAINS: tickets 4-7), one reviewer round (9 findings applied), cold suite green.

What changed
- Profiles: `profiles.slot` 1..3, unique (owner, slot); claims send slot; a verified account adds a Profile at /edit/new;
  a "Profile" select under the Home and Stats h1 switches (localStorage `oflink.profile`); Stats filters by the current Profile.
- Custom Domains: `customDomains` collection (profile, domain, token, status pending|live, checked); `profiles.customDomain`
  migrated into live records and dropped; the TLS Ask and Host Resolution read live records only; `POST /api/domain-check/:id`
  checks TXT `_oflink.{domain}=oflink-verify={token}`, A = ORIGIN_IPV4, AAAA = ORIGIN_IPV6, CAA, and not an own host, via
  node:dns (`DNS_SERVERS` for the test stack's fake DNS, tests/fake-dns.mjs); Editor screen /edit/domain ("Domain" on Home).
- Tests: 07-sites.spec.ts, 07-domains.spec.ts; 02-v1-import, 03, 05, 06 updated in lockstep; helpers `handOver` replaces `setOwner`.

What the Operator must do
- VPS .env: ORIGIN_IPV4=<VPS IPv4>, ORIGIN_IPV6=<VPS IPv6 or empty>; deploy (migrations 1791140011/12 run on start).
- Claim Username `demo` and fill its Profile so the landing's "See a demo" shows something.
- Hand-over (RUN.md step 12): always set owner AND a free slot in the same save.
- Answer phase-06 § 5 (cap of 3, one domain per Profile, approval before live, Creator-side Cloudflare, Hostinger terms).

Sharpest assumptions
1. Serve directly, no redirect mode: a redirect needs the same DNS, certificate and proof, and forwarding is free at a registrar.
2. Cap N = 3 Profiles per account, one Custom Domain per Profile, exact hostname only (apex and www not paired).
3. A domain goes live on the DNS proof alone, with no Operator approval; the abuse lever is deleting the record or account.
