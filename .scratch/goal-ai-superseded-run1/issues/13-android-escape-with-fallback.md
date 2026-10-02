# 13: On Android the Escape opens Chrome, and falls back to the plain web address when Chrome is missing

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 19, 32, 36
Seams: the Profile page under Playwright against the dev server, with an Android Instagram User-Agent. Observed through the navigation recorder, which keeps the intent link's fragment, and the overlay links' `href`.
Blocked by: 12: The Escape Overlay offers every way out…
Status: ready-for-agent

**What to build:** On Android, the Escape hands the Visitor to Chrome. It aims at the escape target on the host that served the page, and carries that target as its fallback. A phone without Chrome opens the Profile in another browser instead of meeting a dead Link.

- A tap on an Escape Mode Link in an Android In-App Browser fires this Escape.
- The overlay's "Open in browser" carries the same link, both on open and after a tap.
- Android gets no "Try another way".

RUN.md gains the Android Escape rows, including one Android phone with Chrome disabled, which must land in the fallback browser.

- [ ] Android Instagram UA, tapping the Escape Mode Link from `/fixture/TC`:
  - records `intent://{host}/fixture/TC?link={id}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url={encoded target};end`;
  - "Open in browser" carries the same `href`;
  - there is no "Try another way".
- [ ] Android Instagram UA: on the overlay on open of `fixture_v1/TC`, "Open in browser" is the Chrome link for `/fixture_v1/TC`, with no Link Shortcut.
- [ ] Intent assertions read the navigation recorder or the overlay's `href`, never Playwright's request event, which strips the fragment.
- [ ] Earlier behaviours still pass: the iOS Escape, the overlay's controls, and Direct Mode taps.
- [ ] RUN.md holds the Android Escape rows, including the one with Chrome disabled, every cell still unmarked.
- [ ] Playwright: extends `tests/e2e/01-link-modes-and-escape.spec.ts`. `./check.sh` passes.
