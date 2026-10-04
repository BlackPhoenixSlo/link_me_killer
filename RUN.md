# RUN

## Phase 1 real-device matrix (docs/spec/phase-01-link-modes-and-escape.md)

**Phase 1 is not Done until every row below passes** (plan section 5: "test matrix passes for every mode on real devices"). The automated Acceptance (`./check.sh`) does not replace these rows. Every row is pending until someone runs it on a real phone and fills in its blanks.

### Throwaway Profile recipe

The matrix needs a public https host, because every escape link is https and the suite now runs on the test stack via `tests/stack.sh`, which is plain http on localhost. Never run `./check.sh` while another Playwright run or the test stack is up: `reuseExistingServer` is false, so it fails fast on the busy port rather than flaking. `./check.sh tests/e2e/02-v1-import.spec.ts` first runs the whole chromium project (it is the last project); add `--no-deps` to skip that in the dev loop. Run it on v2's first public https deploy (Phase 2's first deploy to the VPS):

1. Create a throwaway Profile there. Do not use a Creator's Profile.
2. Give it Escape Mode (`escape_ig`) as its default Mode.
3. Give it these Links, each with a harmless Destination:
   - one Direct Mode Link;
   - one Escape Mode Link;
   - one Deeplink Mode Link, whose Destination is an https page that a phone app owns, so that the app can be installed for one row and removed for the other;
   - one Adult Escape Mode Link with tracking on.
4. Pick a numeric Tracking Code and open the Profile as `/{username}/{code}` in each browser below.

### How to fill a row

- **Device model, OS version, App version:** the phone, its OS version, and the version of the app whose browser is under test (the browser's own version for Safari or Chrome).
- **Pass/fail:** `pass` or `fail`, replacing `pending`. A failing row names what happened instead. A Threads row that fails because the page does not see an In-App Browser also records the observed User-Agent, for the Operator (spec, Further Notes, Threads).

### Rows

| # | Phone | Browser | Check | Expected | Device model | OS version | App version | Pass/fail |
|---|---|---|---|---|---|---|---|---|
| 1 | iPhone | Instagram | On open | The Escape Overlay shows, with "Close". |  |  |  | pending |
| 2 | iPhone | Instagram | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 3 | iPhone | Instagram | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 4 | iPhone | Instagram | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 5 | iPhone | Instagram | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 6 | iPhone | Instagram | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |
| 7 | iPhone | Facebook | On open | The Escape Overlay shows, with "Close". |  |  |  | pending |
| 8 | iPhone | Facebook | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 9 | iPhone | Facebook | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 10 | iPhone | Facebook | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 11 | iPhone | Facebook | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 12 | iPhone | Facebook | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |
| 13 | iPhone | Threads | On open | The Escape Overlay shows, with "Close". |  |  |  | pending |
| 14 | iPhone | Threads | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 15 | iPhone | Threads | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 16 | iPhone | Threads | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 17 | iPhone | Threads | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 18 | iPhone | Threads | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |
| 19 | iPhone | TikTok | On open | The Escape Overlay shows, with "Close". |  |  |  | pending |
| 20 | iPhone | TikTok | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 21 | iPhone | TikTok | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 22 | iPhone | TikTok | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 23 | iPhone | TikTok | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 24 | iPhone | TikTok | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |
| 25 | iPhone | Safari (iOS) | On open | No Escape Overlay shows. |  |  |  | pending |
| 26 | iPhone | Safari (iOS) | Direct | Tap the Direct Link: it opens in place. |  |  |  | pending |
| 27 | iPhone | Safari (iOS) | Escape | Tap the Escape Mode Link: it opens in place, as a Direct Link does (no Escape, no overlay). |  |  |  | pending |
| 28 | iPhone | Safari (iOS) | Escape, Adult | Tap the Adult Escape Mode Link: the Age Gate shows; "Continue (18+)" opens the Destination in place, and the final address ends in /c{code}. |  |  |  | pending |
| 29 | iPhone | Safari (iOS) | Deeplink, app installed | Tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 30 | iPhone | Safari (iOS) | Deeplink, app absent | Tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |
| 31 | Android phone | Instagram | On open | The Escape Overlay shows, with "Close". |  |  |  | pending |
| 32 | Android phone | Instagram | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 33 | Android phone | Instagram | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 34 | Android phone | Instagram | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 35 | Android phone | Instagram | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 36 | Android phone | Instagram | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |
| 37 | Android phone | Instagram | Escape, Chrome disabled | "Close" the overlay shown on open, then tap the Escape Mode Link on a phone with Chrome disabled: the Visitor lands in the fallback browser on /{username}/{code}?link={Link Id}, not on a dead Link. |  |  |  | pending |
| 38 | Android phone | Facebook | On open | The Escape Overlay shows, with "Close". |  |  |  | pending |
| 39 | Android phone | Facebook | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 40 | Android phone | Facebook | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 41 | Android phone | Facebook | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 42 | Android phone | Facebook | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 43 | Android phone | Facebook | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |
| 44 | Android phone | Facebook | Escape, Chrome disabled | "Close" the overlay shown on open, then tap the Escape Mode Link on a phone with Chrome disabled: the Visitor lands in the fallback browser on /{username}/{code}?link={Link Id}, not on a dead Link. |  |  |  | pending |
| 45 | Android phone | Threads | On open | The Escape Overlay shows, with "Close". |  |  |  | pending |
| 46 | Android phone | Threads | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 47 | Android phone | Threads | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 48 | Android phone | Threads | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 49 | Android phone | Threads | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 50 | Android phone | Threads | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |
| 51 | Android phone | Threads | Escape, Chrome disabled | "Close" the overlay shown on open, then tap the Escape Mode Link on a phone with Chrome disabled: the Visitor lands in the fallback browser on /{username}/{code}?link={Link Id}, not on a dead Link. |  |  |  | pending |
| 52 | Android phone | TikTok | On open | The Escape Overlay shows, with "Close". |  |  |  | pending |
| 53 | Android phone | TikTok | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 54 | Android phone | TikTok | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 55 | Android phone | TikTok | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 56 | Android phone | TikTok | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 57 | Android phone | TikTok | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |
| 58 | Android phone | TikTok | Escape, Chrome disabled | "Close" the overlay shown on open, then tap the Escape Mode Link on a phone with Chrome disabled: the Visitor lands in the fallback browser on /{username}/{code}?link={Link Id}, not on a dead Link. |  |  |  | pending |
| 59 | Android phone | Chrome (Android) | On open | No Escape Overlay shows. |  |  |  | pending |
| 60 | Android phone | Chrome (Android) | Direct | Tap the Direct Link: it opens in place. |  |  |  | pending |
| 61 | Android phone | Chrome (Android) | Escape | Tap the Escape Mode Link: it opens in place, as a Direct Link does (no Escape, no overlay). |  |  |  | pending |
| 62 | Android phone | Chrome (Android) | Escape, Adult | Tap the Adult Escape Mode Link: the Age Gate shows; "Continue (18+)" opens the Destination in place, and the final address ends in /c{code}. |  |  |  | pending |
| 63 | Android phone | Chrome (Android) | Deeplink, app installed | Tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 64 | Android phone | Chrome (Android) | Deeplink, app absent | Tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |
