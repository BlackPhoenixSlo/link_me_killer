# 09: On Android an Escape opens Chrome or its fallback and a Deeplink Link hands off to its app

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 18, 21, 35, 37, 38, 40
Seams: the public page in Chromium under Playwright, served by the Dev-Server Stand-in, with the Android Instagram User-Agent and a desktop User-Agent carrying "Instagram"; observed through the navigation recorder and the overlay links' href (never request events, which drop an intent's fragment), the network fence's Reveal watch and Profile variants
Blocked by: 07: An Escape Mode tap in iOS Instagram escapes to Safari from the tap itself
Status: ready-for-agent

**What to build:** On an Android phone in an In-App Browser, a tap on an Escape Mode Link fires, from the tap itself:

`intent://{host}/{path}[?query]#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=` + the encoded escape target + `;end`

So Chrome opens the escape target, and a phone without Chrome falls back to the plain web address instead of a dead Link. The Escape Overlay's "Open in browser" carries the same href. Android gets no "Try another way".

On Android, in any browser, a Deeplink Mode Link reveals its Destination. If the Destination is an absolute https address, the page then fires a package-less intent:

`intent://{Destination host}/{path}[?query]#Intent;scheme=https;S.browser_fallback_url=` + the encoded Destination + `;end`

Android picks the app that owns the link and falls back to the web page. Any other Destination is navigated to plainly. An Adult Deeplink Link passes the Age Gate first, and Reveal runs after "Continue (18+)". On iOS and computers, Deeplink Mode stays the plain navigation that 05 and 06 already check.

In an In-App Browser on a platform that is neither iOS nor Android, an Escape Mode tap fires no link. It shows the overlay, whose "Open in browser" carries the plain https escape target, with no "Try another way".

- [ ] Android Instagram: from `/fixture/{code}`, a tap on the Escape Link records `intent://{host}/fixture/{code}?link={Escape Link Id}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url={encoded target};end`. "Open in browser" carries the same href and records it when tapped. There is no "Try another way".
- [ ] Android Instagram: a tap on the Deeplink Link makes a Reveal request. It then records `intent://{Destination host}/{path}#Intent;scheme=https;S.browser_fallback_url={encoded Destination};end` for Reveal's answer, with no package.
- [ ] Android Instagram: the Adult Link set to Deeplink (variant) shows the Age Gate. "Continue (18+)" makes a Reveal request, then records the package-less intent for the answer.
- [ ] A desktop User-Agent carrying "Instagram": a tap on the Escape Link records no navigation and shows the overlay. Its "Open in browser" carries the plain https target, and there is no "Try another way".
- [ ] Every check already in the Phase's spec still passes. The smoke spec passes. The v1 Snapshot's own git status stays clean.
- [ ] Any dev server already on port 4173 is stopped first. Then `./check.sh` passes.
- [ ] No dependency, build step or module is added. The page stays one plain script that reads only the Profile JSON and Reveal.
