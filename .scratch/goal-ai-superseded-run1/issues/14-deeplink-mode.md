# 14: Deeplink Mode hands the Destination's https link to the phone, so its app opens when installed

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 10, 29, 30, 31, 36
Seams: the Profile page under Playwright against the dev server, with Android Instagram, iOS Instagram and desktop User-Agents. Observed through the navigation recorder, the Reveal stub and Profile variants.
Blocked by: 10: Each Link can carry its own Mode…
Status: ready-for-agent

**What to build:** A tap on a Deeplink Mode Link resolves the Destination the way any tap does, then hands it to the phone.

- **Android, in any browser.** An absolute https Destination goes out as an intent link that names no app, so Android picks the app that owns the link and falls back to the web page.
- **iOS and computers.** The Destination's https address opens directly. iOS can hand it to its app, and everyone else gets the web page.
- **Anything that is not an absolute https Destination** navigates plainly.
- **Adult Deeplink Mode Links.** The Age Gate shows first. "Continue (18+)" reveals the Destination, then hands it over.

The assertions hold whether a Link's Destination comes from its `url` or from Reveal, because the Reveal stub answers a non-Adult Link with its own `url`. On v2 a Deeplink Mode Link has no `url` (Phase 2), so this spec carries over unchanged.

RUN.md gains the Deeplink rows: one with the Destination's app installed and one without.

- [ ] Android Instagram UA: the Deeplink Link records `intent://example.com/…#Intent;scheme=https;S.browser_fallback_url=…;end`, which names no app.
- [ ] Android Instagram UA, variant where the Adult Link is in Deeplink Mode:
  - the Age Gate shows first;
  - "Continue (18+)" reveals the Destination;
  - an intent link for the revealed Destination is then recorded, naming no app.
- [ ] iOS Instagram UA: the Deeplink Link navigates plainly to its https Destination, with no `x-safari` navigation.
- [ ] Desktop UA: the Deeplink Link navigates plainly.
- [ ] RUN.md holds the Deeplink rows for app installed and app absent, every cell still unmarked.
- [ ] Playwright: extends `tests/e2e/01-link-modes-and-escape.spec.ts`. `./check.sh` passes.
