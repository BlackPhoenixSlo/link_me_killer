# Phase 01 — Link Modes and in-app-browser Escape

**Objective.** On v2's public page, every Link travels by its own Mode (Direct, Escape or Deeplink). The Escape Overlay appears only where Escape Mode calls for it. An Escape fires from the Visitor's own tap on iOS and Android and always has a fallback that gets out, and the Tracking Code survives the move into the System Browser.

## Problem Statement

The Operator cannot choose how a tap on a Link behaves. The public page that Phase 0 copies from the v1 Snapshot hard-codes one behaviour:

- Every Visitor whose browser says "Instagram" gets a full-screen Escape Overlay that cannot be closed. This happens even on a Profile whose Links have no reason to leave Instagram, such as a Link to the Creator's own Instagram account.
- Visitors in the Facebook, Threads or TikTok In-App Browsers get no help, because only "Instagram" is detected.
- On Android the Escape names Chrome and has no fallback, so a phone without Chrome gets a dead Link.
- iOS has a single undocumented trick, and it fires only after a Reveal round trip. Apps no longer treat a navigation that late as the Visitor's own tap.
- A Visitor who follows the overlay's menu instruction lands in a System Browser with fresh storage. The address bar has already been cleaned of the Tracking Code, so OnlyFans no longer credits the source that sent them.
- A Profile URL that carries both a Tracking Code and a Link Shortcut (`/{username}/{code}?link={Link Id}`) loses the Link Shortcut before it is read.
- An escaping Adult Link's Destination is revealed inside the In-App Browser, the one place the Operator wants to keep it out of ("a lil protection till the instagram").

The Operator asked for "a deeplink checkbox, a move-out-of-IG checkbox, and nothing from above".

## Solution

Each Link has one Mode, and each Profile has a default Mode that its Links inherit. Both live in the Profile JSON the page reads; Phase 2 later serves that JSON from PocketBase. A Profile or Link without a valid Mode is in Escape Mode, the Mode v1 Profiles are imported with.

- **Direct Mode.** A tap goes to the Destination wherever the Visitor is, with no Escape and no overlay.
- **Escape Mode.** Inside any In-App Browser the plan names, the tap itself fires an Escape. The Escape opens this same Profile in the System Browser, carrying the Tracking Code and a Link Shortcut, and the System Browser finishes the Click. The Escape Overlay then shows as the fallback, with these ways out:
  - "Open in browser"
  - on iOS Instagram, "Try another way" through Instagram's own open-in-browser link
  - the app-menu instruction
  - the address itself, with "Copy link"

  No Reveal happens inside the In-App Browser. Outside one, Escape Mode behaves as Direct Mode.
- **Deeplink Mode.** A tap reveals the Destination and hands its https link to the phone, so the Destination's app opens if it is installed, and the web page opens if not.

The Age Gate still guards every Adult Link, whatever its Mode. A Profile whose default Mode is Escape Mode shows the Escape Overlay as soon as it opens in an In-App Browser, as v1 does for Instagram. That overlay can be closed whenever the Profile holds a Link that does not escape. Escapes use the host that served the page, so they keep working on a Spare Domain or a Custom Domain.

## User Stories

1. As an Operator, I want each Link to carry one Mode (Direct, Escape or Deeplink), so that I choose how a tap travels instead of ticking two checkboxes that could contradict each other.
2. As an Operator, I want each Profile to carry a default Mode that its Links inherit, so that I set the common case once.
3. As an Operator, I want a Link's own Mode to override its Profile's default, so that an OnlyFans Link can escape while an Instagram Link on the same Profile stays Direct.
4. As an Operator, I want a Profile or Link that has no Mode to act as Escape Mode, so that every v1 Profile, which the v1 Import brings in with Escape Mode as its default, keeps v1's Escape behaviour until a Creator edits it.
5. As an Operator, I want a Mode value the page does not recognise to be treated as missing, so that a typo falls back to the inherited Mode instead of breaking the page.
6. As an Operator, I want the Mode to live in the Profile JSON the page already reads, so that Phase 2 can serve it from PocketBase and the Editor can set it with no further page change.
7. As an Operator, I want the Adult flag to stay independent of the Mode, so that an Adult Link can be Direct, Escape or Deeplink.
8. As a Visitor in Instagram, Facebook, Threads or TikTok, I want the page to recognise my In-App Browser, so that Escape Mode helps me in every one of those apps and not only in Instagram.
9. As a Visitor in an In-App Browser on a Profile whose default Mode is Escape Mode, I want the Escape Overlay as soon as the page opens, so that I can move to my System Browser before I tap anything.
10. As a Visitor in an In-App Browser on a Profile whose default Mode is Direct or Deeplink, I want no Escape Overlay when the page opens, so that I can use the Profile right away.
11. As a Visitor in a System Browser, I never want to see the Escape Overlay, so that nothing gets between me and the Links.
12. As a Visitor in an In-App Browser on an Escape-default Profile that also holds a Direct or Deeplink Link, I want to close the overlay shown on open, so that I can still reach those Links in place.
13. As an Operator, I want the overlay shown on open to stay uncloseable on a Profile whose Links all escape, so that such a Profile, every untouched v1 Profile included, keeps v1's overlay.
14. As a Visitor in any browser, I want a tap on a Direct Mode Link to open its Destination right where I am, so that Links which need no Escape just work.
15. As a Visitor in an In-App Browser, I want a tap on an Escape Mode Link to fire the Escape from the tap itself, with no request before it, so that the app still treats the Escape as my own action.
16. As a Visitor on iOS, I want that Escape to open this Profile in Safari through the `x-safari-https://` link v1 already uses, so that the method that works today keeps working.
17. As a Visitor in Instagram on iOS, I want a second "Try another way" link that uses `instagram://extbrowser/` and fires from my tap, so that I have another route when the first one is blocked.
18. As a Visitor on Android, I want the Escape to open this Profile in Chrome, falling back to the plain web address when Chrome is missing, so that the Link is never dead.
19. As a Visitor whose Escape did not happen, I want the Escape Overlay to offer the app-menu instruction, an "Open in browser" link, the address and a "Copy link" button, so that I can always get out by hand.
20. As a Visitor who opened the Escape Overlay by tapping a Link, I want to close it, so that I can still reach the Profile's other Links.
21. As a Visitor in an In-App Browser on a platform that is neither iOS nor Android, I want the Escape Overlay with a plain "Open in browser" link, so that I still have every manual way out.
22. As a Visitor who has reached the System Browser, I want the Link I tapped to open by itself, credited to the same Tracking Code, so that I don't have to find it and tap it again.
23. As a Visitor in an In-App Browser tapping an Adult Escape Mode Link, I want the Age Gate first and the Escape to fire from my "Continue (18+)" tap, so that I confirm my age once and the Escape still comes from my tap.
24. As an Operator, I want no Reveal inside an In-App Browser for an Escape Mode Link, so that the Destination is handed out only in the System Browser, never to the app.
25. As a Visitor in a System Browser, I want an Escape Mode Link to behave like a Direct Mode Link, so that nothing changes where no Escape is needed.
26. As an Operator, I want the escape target to carry this visit's Tracking Code, or else the one the page already holds, so that OnlyFans credits the source that sent the Visitor after the Escape, even though the System Browser starts with fresh storage.
27. As an Operator, I want the Tracking Code kept in the address bar while the Visitor is in an In-App Browser, so that the app's own "Open in browser" menu item carries it across.
28. As an Operator, I want the address bar to show the escape target's path and query whenever the Escape Overlay shows, on page open or after an Escape Mode tap, so that the menu route also carries a Tracking Code that came only from storage and, after a tap, the Link Shortcut.
29. As a Visitor who closes the Escape Overlay, I want the address bar put back as it was before the overlay showed, so that a reload doesn't reopen the Link I walked away from.
30. As an Operator, I want the address bar cleaned of the Tracking Code in a System Browser, as v1 does, so that nothing changes where no Escape is needed.
31. As a Visitor arriving at `/{username}/{code}?link={Link Id}`, I want that Link to open with that Tracking Code, so that an Escape lands where it was aimed and is credited to the right source.
32. As a Visitor arriving in a System Browser with a Link Shortcut, I want it to get the Link's Destination the way a tap would, with no Age Gate, and then travel by the Link's Mode, so that an escaped Link lands where its tap would have.
33. As a Visitor arriving in an In-App Browser with a Link Shortcut to an Escape Mode Link, I want the Escape Overlay aimed at that Link's escape target, with no Reveal and no Escape until I tap, so that the Escape still comes from a tap.
34. As a Visitor arriving with a Link Shortcut whose Link Id is not on this Profile, I want the Profile to load as a plain visit, so that a stale or foreign id does nothing.
35. As a Visitor tapping a Deeplink Mode Link on Android, I want the phone to open the app that owns the Destination's https link, falling back to the web page, so that I land in the app when I have it.
36. As a Visitor tapping a Deeplink Mode Link on iOS or a computer, I want the Destination's https address opened directly, so that iOS can hand it to its app and everyone else gets the web page.
37. As a Visitor tapping an Adult Deeplink Mode Link, I want the Age Gate first and then the deeplink, so that the gate behaves the same in every Mode.
38. As an Operator, I want a Deeplink Mode Link always to get its Destination from Reveal, so that the phone is handed the Destination's own https link and not v2's click path.
39. As an Operator, I want the page to need no Destination in the Profile JSON, with a Link whose `url` is absent or empty getting its Destination from Reveal at the moment of the Click, so that v2's server can keep every Destination out of public payloads (ADR 0004, plan section 9).
40. As an Operator, I want Escapes, Link Shortcuts and "Copy link" to use whichever host served the Profile, so that they keep working on a Spare Domain or a Custom Domain.
41. As an Operator, I want all Mode handling to stay inside the public page as a plain script with no build step and no dependency, reading only the Profile JSON and Reveal, so that Phase 2's app serves the same page unchanged on the VPS.
42. As an Operator, I want this Phase to leave v1 alone (the v1 Snapshot, the old repo, Netlify and the n8n Form), so that ofl.ink keeps working exactly as it is while v2 gains the Modes.
43. As an Operator, I want every behaviour above checked headlessly against the Fixture Profile with fake Instagram, FBAN and TikTok User-Agents, so that `./check.sh` catches a regression before any phone is involved.
44. As an Operator, I want a screenshot of the Escape Overlay saved in the effort's shots folder, so that I can see the result without running anything.
45. As an Operator, I want the real-device matrix for every Mode listed as manual rows in RUN.md, so that I can confirm on real phones that every Mode works; Phase 1 is Done only when they pass (plan section 5).

## Implementation Decisions

- **Owns.** All of these are in this repo, never in the v1 Snapshot.
  - **Profile page script.** `app/public/script.js`, Phase 0's copy of the v1 Snapshot's page script. It gains:
    - Mode resolution
    - In-App Browser and platform detection
    - Escape and Deeplink navigation, and the Escape Overlay's behaviour
    - the Link Shortcut fix and the address-bar rule
    - Reveal for Links whose `url` is absent or empty, and for every Deeplink Mode Link
  - **Profile page markup and styles.** `app/public/index.html` and `app/public/style.css`. The Escape Overlay gains its controls and app-neutral copy. The inline Instagram-only check in the page head is removed, so detection lives in the script alone.
  - **The Fixture Profile's Mode fields and test Destinations,** only where Phase 0 leaves them out (Depends on).
  - **This Phase's Playwright spec**, `tests/e2e/01-link-modes-and-escape.spec.ts`.
  - **Not changed:**
    - the dev-server stand-in, the Reveal copy and the Playwright config
    - the smoke spec, except as Further Notes allows
- **Interfaces.** The page exposes no code API. Its interface is what a Visitor sees and where each tap sends them.
  - **URL.** `/{username}[/{code}][?link={Link Id}]`, unchanged in form. The code and the Link Shortcut are now honoured together.
  - **Data the page reads.** The page also reads `profile.mode` and `links[].mode`. It treats `links[].url` as optional (Schema).
  - **Escape Overlay controls.** All are reachable by role and name:
    - heading "Open in System Browser". The heading and the overlay's element id are kept, so the smoke spec's Instagram check still finds them.
    - link "Open in browser", whose `href` is the platform's escape link
    - link "Try another way", on iOS Instagram only
    - the https escape target, shown as text
    - button "Copy link"
    - button "Close", on every Escape Overlay except the one shown on open on a Profile whose Links all escape
    - the app-menu instruction: tap the ··· menu, then "Open in external browser" / "Open in system browser".
  - **Reveal.** The page calls it exactly as Phase 0's page copy does: Link Id, Username, and a Tracking Code when the Link has tracking on. This Phase adds callers, never parameters. A Reveal that fails (404, 403, 429 or no answer) is handled as Phase 0's copy handles it, for the new callers too.

  ASSUMPTION: Reveal failures keep Phase 0's copy's handling and get no new error UI (rung 3). Overturned if the real-device matrix or Phase 2's 429 leaves Visitors stranded; then a retry message is added.

  ASSUMPTION: the control names and the app-neutral wording ("this app" where v1 says "Instagram", and no brand icon) follow v1's wording style (rung 3). A plain copy change overturns them if the Operator wants different words.
- **Schema.** No database. PocketBase's `mode` field and the v1 Import default are Phase 2's. The Profile JSON the page reads gains two optional fields, and `url` becomes optional:

  ```ts
  type Mode = "direct" | "escape_ig" | "deeplink";  // ADR 0003's stored values
  profile.mode?: Mode   // the Profile's default Mode
  links[].mode?: Mode   // overrides the Profile's default for this Link
  links[].url?: string  // where a Direct or Escape tap on a non-Adult Link goes; absent or "" → Reveal; never read in Deeplink Mode
  // effective Mode = recognised links[].mode ?? recognised profile.mode ?? "escape_ig"
  ```

  ASSUMPTION: a missing or unrecognised Mode resolves to Escape Mode, the default plan section 8 gives v1 Profiles on import, so a Profile that reaches the page without a Mode behaves as an imported one does (rungs 3 and 4). Overturned if the Operator wants Mode-less Profiles to fall back to Direct Mode; that one constant changes here and in Phase 2's import.

  ASSUMPTION: a non-empty `url` is followed as given, as v1 does for non-Adult Links (rung 3). Which value the server puts there (nothing, or v2's `/r/{Link Id}` per plan section 9) is the server's decision; the page needs no Destination in the JSON. Overturned if Phase 2 wants the page to build the `/r/` address itself.
- **Contracts.**
  - **Profile JSON.** The shape above is what Phase 2 serves from PocketBase. This Phase reads nothing else.
  - **In-App Browser detection.** The plan section 4 pattern is used verbatim and case-insensitive: `Instagram|FBAN|FBAV|Threads|musical_ly|Bytedance|TikTok` (rung 2). Platform detection is v1's: iPhone, iPad or iPod means iOS, and Android means Android.
  - **Escape target.** `https://{host}/{username}[/{code}][?link={Link Id}]`.
    - `{host}` is the host that served the page.
    - `{code}` is this visit's path code, otherwise the stored code. It is the code the page would pass to Reveal before falling back to the Link's own default.
    - `?link=` is present only when a Link tap or a Link Shortcut caused the Escape.
    - It is always https, matching plan section 4's literal `x-safari-https://` and `scheme=https` (rung 2).

    ASSUMPTION: the System Browser is sent to the Profile, not straight to the Destination. That is the only target known at tap time without a Reveal, which is what "escape on tap" and "keep trackId in the URL" (plan section 4) require (rung 5). Overturned if the Operator wants the System Browser to land on the Destination itself; the Destination would then have to be revealed inside the In-App Browser before the tap.

    ASSUMPTION: the target's code follows the page's existing Reveal precedence, path code first and stored code second (rung 3). Overturned if the Operator wants only the path code carried across.
  - **Escape link, per platform.**

    | Platform | Escape link |
    |---|---|
    | iOS | `x-safari-` + escape target |
    | iOS Instagram, second option ("Try another way") | `instagram://extbrowser/?url=` + encoded escape target |
    | Android | `intent://{host}/{path}[?query]#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=` + encoded escape target + `;end` |
    | anything else | none; "Open in browser" carries the escape target itself |

    ASSUMPTION: "Try another way" is offered only in Instagram's In-App Browser on iOS, because an `instagram://` link would push Facebook, Threads or TikTok Visitors into the Instagram app (rung 5). Overturned if the real-device matrix shows it escaping correctly from the other apps.

    ASSUMPTION: in an In-App Browser on a platform that is neither iOS nor Android, an Escape Mode tap fires no link. It only shows the overlay, whose "Open in browser" is the plain escape target, since no escape link is known there (rung 5). Overturned if such a platform shows up in real traffic and needs its own link.
  - **Deeplink link.** It applies only to an absolute https Destination (D3: "via its https app link"). Any other Destination is navigated to plainly.
    - Android, in any browser: `intent://{host}/{path}[?query]#Intent;scheme=https;S.browser_fallback_url=` + encoded Destination + `;end`. No package is named, so Android picks the app that owns the link.
    - Everywhere else: a top-level navigation to the Destination.

    On iOS and computers, Deeplink Mode therefore navigates as Direct Mode does once the Destination is in hand. Only the real-device matrix's app-installed and app-absent rows can tell them apart there.

    ASSUMPTION: a Deeplink Mode Link always gets its Destination from Reveal, whatever its `url` holds, and navigates from Reveal's answer. A server-side `url` such as v2's `/r/{Link Id}` would hand the phone ofl.ink's address, not the Destination's own app link (rung 5). The cost is that the navigation leaves the tap's call stack: Chrome keeps a short-lived user activation across the request, and iOS Universal Links in In-App Browsers are not guaranteed either way. Overturned if the real-device matrix shows dead Deeplink Links (then Reveal starts when the tap lands, or when the Age Gate opens), or shows that a redirect through `/r/` hands off to the app just as well.
- **When the Escape Overlay shows.**
  - **On page open,** when the visit is in an In-App Browser and the Profile's default Mode is Escape Mode (CONTEXT.md, Mode, flagged there). This overlay blocks scrolling. Nothing escapes by itself on open, because Escapes fire only from taps (plan section 4).
  - **Also on page open,** for a Link Shortcut to an Escape Mode Link opened in an In-App Browser.
  - **After a tap,** in an In-App Browser, once an Escape Mode tap has fired its Escape.
  - **Close.** Every Escape Overlay has "Close" except the one shown on page open on a Profile whose Links all resolve to Escape Mode. That overlay stays uncloseable, as v1's is. Close releases the scroll lock.

  ASSUMPTION: the overlay opened by a tap can always be closed (the Age Gate's close button is the precedent), and the overlay shown on open stays uncloseable only where every Link would escape anyway, as in v1 (rung 3). Overturned if the Operator wants the overlay shown on open always uncloseable, which makes Direct and Deeplink overrides on an Escape-default Profile unreachable in In-App Browsers.

  ASSUMPTION: the overlay shows straight after the tap fires the Escape, with no timer or page-visibility check, because a successful Escape leaves the app behind anyway (rung 5). Overturned if the real-device matrix shows the overlay flashing in a way that confuses Visitors.
- **Taps by Mode.**
  - **Destination.** A non-Adult Link with a non-empty `url` goes there as given, with no Tracking Code, as v1's non-Adult Links do (only Reveal appends `/c{code}`, plan section 1). Every other Link goes through Reveal at the moment of the Click: Adult Links, Links whose `url` is absent or empty (Phase 2 serves `""` for Adult and Deeplink Links), and every Deeplink Mode Link. Every Reveal uses the page's existing Tracking Code rule.
  - **Direct Mode.** The page navigates plainly, inside or outside an In-App Browser. An Adult Link passes the Age Gate first.
  - **Escape Mode in an In-App Browser.**
    - The tap handler assigns the escape link synchronously, with no request before it, and then shows the overlay.
    - For an Adult Link, the Age Gate opens first, and "Continue (18+)" is the tap that escapes.
    - No Reveal happens.
  - **Escape Mode outside an In-App Browser** behaves as Direct Mode.
  - **Deeplink Mode.** The page reveals, then uses the Deeplink link. An Adult Link passes the Age Gate first, and Reveal runs after "Continue (18+)".

  ASSUMPTION: an Adult Escape Mode Link shows the Age Gate in the In-App Browser, and the Link Shortcut then reveals without a second gate in the System Browser. That is the existing Link Shortcut behaviour (rung 3). Overturned if the Operator wants the gate shown in the System Browser instead.
- **Link Shortcut.** It is read on page load, before the address bar is touched, so `/{username}/{code}?link={Link Id}` reveals with that code. It then follows the Link's effective Mode.
  - In an In-App Browser, an Escape Mode Link shows the Escape Overlay aimed at that Link's escape target, with no Reveal and no Escape until a tap.
  - Anywhere else, the Link gets its Destination as a tap does (Taps by Mode, Destination) and travels by its Mode, with no Age Gate, since v1's Link Shortcut has none (Out of Scope). Escape Mode outside an In-App Browser is Direct Mode.
  - A Link Id that is not on this Profile is ignored, and the page loads as a plain visit.

  ASSUMPTION: an unknown Link Id is ignored instead of being sent to Reveal as v1 does, because a v2 Link Id belongs to one Profile and v2 regenerates every id anyway (rung 4: doing nothing is the cheaper undo). Overturned if a Link Shortcut must reveal a Link that is not on its own Profile.
- **Address bar.**
  - In an In-App Browser it keeps `/{username}/{code}` and the query, so the app's own "Open in browser" menu item carries both.
  - Whenever an Escape Overlay shows there, the page replaces the address with that overlay's escape target's path and query (`/{username}[/{code}][?link={Link Id}]`): on page open, and in the same handler as an Escape Mode tap. The menu route then also carries a code that came only from storage and, after a tap, the Link Shortcut.
  - "Close" puts back the address the page had before the overlay showed.
  - In a System Browser the address is cleaned to `/{username}` after the Link Shortcut has been read, as v1 does.

  ASSUMPTION: the address is rewritten whenever an Escape Overlay shows, the overlay shown on open included, because plan section 4's "keep trackId in the URL in escape mode so it survives 'open in browser' (fresh storage)" covers the overlay shown on open, which is Escape Mode's (rung 2 as read here; changed after review). It is never rewritten on an In-App Browser visit that shows no overlay, so a stored code is not stamped into those (rung 4). Overturned if the Operator wants a code that came only from storage kept out of the address on open; then only a tap rewrites it.

  ASSUMPTION: the cleaning stays outside In-App Browsers rather than being dropped everywhere (rung 4: the smaller change from v1). Overturned if the Operator wants the Tracking Code visible in every browser.
- **Tracking Code storage.** The page keeps storing the path code as Phase 0's copy does. Moving that store to one key per Profile (D5's "replace the global localStorage trackId") is not this Phase's work. The escape target is defined as "the code the page would pass to Reveal", so it follows that change without an edit, and this Phase's tests store codes only on the Profile they read them back on.

  ASSUMPTION: the per-Profile Tracking Code key is Phase 4's, because plan section 5 gives D5 to Phase 4 and section 8 moved only Phase 1's Mode and escape fix (rung 2), even though this Phase now owns the page script that holds the key. Until Phase 4 lands, a stored code can come from another Profile, as it does in v1, and an escape target can carry it. No Creator's traffic meets that interim: ofl.ink points at v1 until Cutover in Phase 5, after Phase 4 (plan section 5), and the real-device matrix uses a throwaway Profile. Phase 4's spec claims the key. Overturned if Phase 4's spec does not claim the change; then it lands here as a one-key change in the Profile page script.
- **No new dependency, build step or service.** The page stays one plain script with no modules or packages (house precedent: v1 has no package manifest). It talks only to the Profile JSON and Reveal, so Phase 2's app serves it unchanged.

## Testing Decisions

**One seam:** the public page running in Chromium under Playwright, served by the existing dev-server stand-in (the config's existing `webServer`), with fake User-Agents set per `test.describe`. Nothing is added to the server, so the same spec runs unchanged once Phase 2 swaps the stand-in for its own stack. The spec is `tests/e2e/01-link-modes-and-escape.spec.ts`. It asserts what a Visitor sees and where a tap sends them, never the script's internals. It reads Link Ids, Modes and the Username from the Fixture Profile the stand-in serves, and fails fast if no Link resolves to one of the three Modes or no Link is Adult.

Test-side observers, all inside the seam:

- **Navigation recorder.** An init script records the destination URL of every Navigation API `navigate` event.
  - Observed 2026-10-02 with Playwright 1.58 Chromium, on a localhost origin: `x-safari-https://…`, `intent://…#Intent;…;end` (fragment intact) and `instagram://extbrowser/?url=…` were each recorded in full, and the page stayed put.
  - Playwright's `request` event drops the intent's fragment, so intent assertions use the recorder or the overlay links' `href`.
  - It also marks whether each navigation started in the same task as the last tap: a capture-phase `click` listener sets a flag that a zero-delay timer clears. Every Escape fired by a tap or by "Continue (18+)" must carry that mark, which fails any request or other wait before it (story 15).
- **Network fence.** `page.route` lets localhost through and fulfils every other host with an empty page.
  - Fixture Destinations "land" there, so `toHaveURL` can assert them, and no test, CDN request included, leaves the machine (floor 2).
  - Reveal is the stand-in's real Reveal copy. Tests assert that the page lands on exactly what Reveal answered (`waitForResponse`), and that no Reveal request is made where none is allowed.
- **Profile variants.** `page.route` fetches the Profile JSON the stand-in serves and fulfils it with one or more fields changed: `profile.mode`, a Link's `mode`, `url`, `isAdult` or `tracking`, or every `mode` stripped. The smoke spec already intercepts a page request with `page.route`. This tests every default, invalid Modes and Adult Links in every Mode without more fixture files.

  ASSUMPTION: variants are served through `page.route` rather than as extra fixture files on the stand-in (rung 3: the smoke spec's route precedent; rung 5: no server change). Overturned if Phase 0's page copy fetches the Profile in a way a route cannot intercept.
- **Clipboard.** Clipboard permission is granted on the localhost origin, which is a secure context, so the spec can read what "Copy link" copied (observed as above).
- **Screenshot.** `page.screenshot` of the iOS Instagram Escape Overlay, opened by an Escape Mode tap, goes to `.scratch/goal_ai/shots/01-link-modes-and-escape.png` (plan section 7, step 2).

  ASSUMPTION: the shot goes into the harness's existing output folder, `.scratch/goal_ai/shots/` (playwright.config.ts `outputDir`), not a new `.scratch/goal-ai/` folder (rung 3). Playwright empties that folder at the start of each run, so the spec writes the shot on every run. Overturned if the Operator moves the harness's output folder.

Behaviours covered. `{p}` is the Fixture Profile's Username, and `TC` is a numeric Tracking Code in the path.

- **Desktop Chrome UA (System Browser).**
  - Variants with every default Mode, Escape Mode included, show no Escape Overlay.
  - The Direct and Escape Mode Links navigate plainly: to the `url` when the Link has one (variant) and through Reveal when it has none (variant).
  - The Deeplink Link makes a Reveal request even when it has a `url`, then navigates plainly to the answer.
  - The Adult Link shows the Age Gate. "Continue (18+)" reveals, and the page navigates to the answer.
  - `/{p}/TC` is cleaned to `/{p}`.
  - `/{p}/TC?link={Adult Link Id}`, with tracking on, calls Reveal with that id and `TC` as the Tracking Code, then navigates to the answer.
  - `/{p}/TC?link={Escape Mode Link Id}` lands where a tap on that Link would.
  - `/{p}?link={an id not on the Profile}` loads the Profile, with no Reveal request and no navigation.
- **iOS Instagram UA.** The Profile default is Direct (variant) unless a case says otherwise.
  - There is no overlay on open, and `/{p}/TC` keeps that address until a Link is tapped.
  - The Direct Link navigates plainly, and nothing `x-safari-` is recorded.
  - From `/{p}/TC`, a tap on the Escape Mode Link:
    - records `x-safari-https://{host}/{p}/TC?link={id}` in the tap's own task, and the address becomes `/{p}/TC?link={id}`
    - shows the overlay with "Open in browser" carrying that `href`, "Try another way" carrying `instagram://extbrowser/?url=` plus the encoded target, and the target as text
    - makes no Reveal request
    - "Copy link" puts `https://{host}/{p}/TC?link={id}` on the clipboard.
    - tapping "Open in browser", then "Try another way", records each one's `href` as a navigation.
    - "Close" hides the overlay and puts the address back to `/{p}/TC`.
  - After an earlier visit to `/{p}/TC` in the same browser context, a tap on the Escape Mode Link from `/{p}` carries `TC` in both the recorded target and the address bar.
  - The hop itself: the recorded target with `x-safari-` stripped, opened in a fresh browser context with a desktop UA (fresh storage, as in a System Browser), lands where a tap on that Link would. For the Adult Link set to Escape Mode with tracking on, that Reveal carries `TC`.
  - `/{p}/TC?link={Escape Mode Link Id}` shows the overlay aimed at that address, with "Close", no Reveal request and nothing `x-safari-` recorded.
  - The Adult Link, set to Escape Mode, shows the Age Gate. "Continue (18+)" records the `x-safari-` Escape in its own task, and no Reveal request is ever made. Closing the Age Gate instead records no navigation and makes no Reveal request.
  - The Deeplink Link reveals, then navigates plainly to the answer.
  - Variants:
    - A Link given an unrecognised Mode follows the Profile default: it navigates plainly, and nothing `x-safari-` is recorded.
    - A Link with its `mode` removed follows the Profile default: under `direct` it navigates plainly with nothing `x-safari-` recorded, and under `deeplink` it makes a Reveal request.
    - A default of `escape_ig`, or an unrecognised default, on a Profile that still holds the Direct and Deeplink Links shows the overlay on open, with "Close". After "Close" the Direct Link navigates plainly.
    - Every Link set to Escape Mode, with an `escape_ig` default, shows the overlay on open with no "Close".
    - After an earlier visit to `/{p}/TC` in the same browser context, opening `/{p}` with an `escape_ig` default shows the overlay on open, the address `/{p}/TC`, and "Open in browser" carrying `x-safari-https://{host}/{p}/TC`. "Close" puts the address back to `/{p}`.
    - A default of `deeplink` shows no overlay on open.
    - The Adult Link set to Direct shows the Age Gate. "Continue (18+)" reveals and navigates plainly, and nothing `x-safari-` is recorded.
- **Android Instagram UA.**
  - A tap on the Escape Mode Link records `intent://{host}/{p}/TC?link={id}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url={encoded target};end`. "Open in browser" carries the same `href` and records it when tapped, and there is no "Try another way".
  - The Deeplink Link reveals, then records `intent://{Destination host}/{path}#Intent;scheme=https;S.browser_fallback_url={encoded Destination};end`, with no package.
  - Variant: the Adult Link set to Deeplink shows the Age Gate. "Continue (18+)" reveals, then records the package-less intent for the answer.
- **Instagram, FBAN and TikTok UAs** (parametrised, plan section 7). A variant with every `mode` stripped shows the overlay on open at `/{p}/TC`, with no "Close". This guards both the Escape Mode fallback for Mode-less Profiles and the plan's broader detection.
- **iOS Safari and Android Chrome UAs.** No overlay, and the Escape Mode Link navigates plainly.
- **A desktop UA carrying "Instagram" (an In-App Browser on neither iOS nor Android).** A tap on the Escape Mode Link records no navigation and shows the overlay. Its "Open in browser" carries the plain https target, and there is no "Try another way".

Prior art:
- `tests/e2e/00-smoke.spec.ts` sets a fake Instagram UA through `test.use`, intercepts Reveal with `page.route` and `route.fetch`, and asserts by role and name. It must stay green.
- `tests/dev-server.mjs` is the stand-in under test.

## Acceptance

```sh
# Run from the repo root (/Users/jakabasej/oflinkv2) once Phase 0 has landed.
set -e  # any failing check fails the block; the final ./check.sh cannot mask it

# The v1 Snapshot is untouched (ADR 0005): its own git sees no change. The assignment fails the block when
# git itself fails (a missing Snapshot included); a bare test -z on the substitution would pass then.
snapshot_status="$(git -C linkme_clone3 --no-optional-locks status --porcelain)"
test -z "$snapshot_status"

# This Phase's spec, then the Escape Overlay screenshot it leaves for the human (plan section 7, step 2).
npx playwright test tests/e2e/01-link-modes-and-escape.spec.ts
test -s .scratch/goal_ai/shots/01-link-modes-and-escape.png

# manual: look at .scratch/goal_ai/shots/01-link-modes-and-escape.png (iOS Instagram Escape Overlay) and confirm that the copy reads well.
# manual: once v2 answers on a public https address (Phase 2's first deploy to the VPS), create a throwaway Profile there. Give it Escape Mode as its default, and one Direct Link, one Escape Mode Link, one Deeplink Mode Link and one Adult Escape Mode Link with tracking on, each with a harmless Destination. Open it as /{username}/{code}.
# manual (Phase 1 is not Done until this passes, goal_ai.txt:133): run the real-device matrix on that Profile: an iPhone and an Android phone x the Instagram, Facebook, Threads and TikTok In-App Browsers, plus Safari (iOS) and Chrome (Android), for each Mode. Record one RUN.md row per cell: device, OS version, app version, pass/fail.
#   - On open: the Escape Overlay shows, with "Close", in every In-App Browser, and never in Safari or Chrome.
#   - Direct: the Link opens in place.
#   - Escape: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself, and the Adult Link's final address ends in /c{code}. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram), the app-menu instruction and "Copy link" still gets out.
#   - Escape, on an Android phone with Chrome disabled: lands in the fallback browser, not on a dead Link.
#   - Deeplink, once with the Destination's app installed and once without: the app opens, or the web page does.
./check.sh
```

## Depends on

- **Phase 0.** It must land first. This Phase assumes only what the plan and the run brief give it:
  - The public page copy in this repo at `app/public/` (`index.html`, `script.js`, `style.css`), taken from the v1 Snapshot, reading the v1 Profile JSON shape at `/{username}[/{code}]`.
  - The dev-server stand-in, retargeted from the v1 Snapshot (today's `tests/dev-server.mjs:10`) to `app/public/` and the test fixtures, that serves the page copy as the Playwright `webServer`, with a Reveal copy that answers by Link Id and appends `/c{code}` as v1's does, reading a test-only secrets file.
  - The Fixture Profile, Username `fixture` (shaped like `juliafilippo_`, none of its data), holding a Direct, an Escape, a Deeplink and an Adult Link, with Link Ids per ADR 0004.
  - A green smoke spec against the page copy.

  ASSUMPTION: Phase 0's Fixture Profile carries `profile.mode` and `links[].mode` in this Phase's Schema (rung 5: one shape for both Phases). Overturned if it ships without them; this Phase then adds those fields to the Fixture Profile and nothing else.

  ASSUMPTION: Phase 0's test-only secrets file holds a Destination for every Fixture Link, each on a host other than localhost, so that the real Reveal copy answers every Mode's path and the network fence catches the navigation (rung 5). Overturned if it holds fewer; this Phase then adds the missing entries to that test-only file and nothing else.
- **Phase 2's first public https deploy, for Done only.** No code from Phase 2 is needed for this Phase's code and automated Acceptance to land. The plan's DONE for Phase 1, though, is "test matrix passes for every mode on real devices" (plan section 5, rung 2), and that matrix needs a public https host (Further Notes). Phase 1 therefore stays open, not Done, until every matrix row in RUN.md passes on that deploy.

## Out of Scope

- **The n8n Form's three-way Mode radio.** Dropped by plan section 8 ("amendment 8"): the n8n Form never gains a Mode (ADR 0005).
- **Any edit to v1.** This covers `linkme_clone3/script.js` and the rest of the v1 Snapshot, the old GitHub repo, Netlify and the live n8n workflow. Plan section 8 and ADR 0005 put this Phase's work only in the new repo's page copy, despite section 5's "in script.js".
- **Mode in PocketBase, and the v1 Import's Escape Mode default.** Phase 2 owns both, and this Phase defines only the JSON shape they serve.
- **Per-Link Mode and Adult toggles in the Editor.** Phase 3.
- **The per-Profile Tracking Code key** (D5's "replace the global localStorage trackId"). Phase 4, flagged under Implementation Decisions.
- **Counting Page Views and Clicks across the Escape hop.** Phase 4 owns Events, and this Phase writes none.
- **The `/r/{Link Id}` redirect and keeping Destinations out of the Profile JSON.** These are server work (Phase 2, ADR 0004, plan section 9). The page only needs no Destination in the JSON.
- **Any change to Reveal.** Its rate limit and same-origin answer (D8, ADR 0004) belong to whichever Phase builds v2's Reveal; the page calls it unchanged.
- **Serving, deploying or tunnelling the page to a public https host for phones.** This is Phase 2's deploy or a human step. A tunnel is a new dependency and a network fetch (floor 2).
- **An Age Gate on Link Shortcuts.** It is existing v1 behaviour, kept, and nobody asked for it.
- **Starting Reveal before the Deeplink tap or when the Age Gate opens,** to keep user activation. YAGNI until the real-device matrix shows a dead Link.
- **Escaping by itself on page open, without a tap.** Plan section 4 says Escapes fire from a tap.
- **Detecting In-App Browsers beyond the plan's pattern** (Snapchat, LinkedIn and so on). They are not in the plan.
- **Translated overlay copy or per-app artwork.** Not asked for.
- **Protecting ofl.ink from being Flagged.** The plan's riskiest assumption (section 4) is answered by Spare Domains (D6, Phase 5). This Phase only makes Escapes follow whichever host served the page.

## Further Notes

- **Real-device host.** The matrix needs a public https host, because every escape link is https and the stand-in is plain http on localhost.

  ASSUMPTION: the matrix runs on v2's first public https deploy on the VPS (Phase 2), with a throwaway Profile, and this Phase's automated Acceptance does not wait for it, though Phase 1 is not Done until the matrix passes (Depends on). A tunnel would be a new dependency and network traffic, and v1 must not carry this code (rung 4). Overturned if the Operator offers another https host sooner.
- **Smoke spec.** This Phase's Acceptance ends with `./check.sh`, which runs the smoke spec, so the smoke spec must still pass after this Phase.

  ASSUMPTION: if the smoke spec's Instagram case opens a Profile whose default Mode is not Escape Mode, so that this Phase's Mode-dependent overlay no longer shows there, this Phase changes only that case to serve an Escape-default variant through `page.route`. Nothing else in the smoke spec changes (rung 5). Overturned if Phase 0 points that case at an Escape-default Profile.
- **Threads.** The detection pattern is the plan's, verbatim (rung 2). The Threads row of the real-device matrix is the check that Threads' In-App Browser identifies itself with a word the pattern holds. A miss there fails the matrix, so Phase 1 is not Done (Depends on). It is parked for the Operator with the observed User-Agent, because widening the plan's pattern changes the plan; once the Operator accepts that, adding the observed word to the pattern is this Phase's one-line fix.

## Review

Reviewer: **codex** (codex-cli 0.155.0-alpha.9, `model_reasoning_effort=high`, read-only sandbox on a blind workspace: plan, CONTEXT.md, ADRs 0001–0005 and the harness only), 2026-10-02. Two calls: a blind call without this spec, and a draft call with it. Both exited 0 with fresh, non-empty output.

Draft call (with the spec):

- **accept** (D1) Acceptance could go green while the plan's DONE, "test matrix passes for every mode on real devices" (goal_ai.txt:133), is unmet. Depends on now names Phase 2's first public https deploy as a dependency for Done (not for landing), and the Acceptance matrix line, story 45 and Further Notes say Phase 1 is not Done until the matrix passes.
- **accept** (D2) The snapshot guard passed when git failed: `bash -c 'set -e; test -z "$(git -C linkme_clone3 status --porcelain)"; echo passed'` printed `fatal: cannot change to 'linkme_clone3'` and then `passed`. Acceptance now assigns the status first, so a failing git ends the block (checked: `set -e; s="$(git -C /nonexistent-dir status --porcelain)"` exits 128), and it uses `--no-optional-locks` as Phase 0's guard does.
- **accept** (D3) A code that came only from storage was lost on the menu route when the overlay showed on page open, because only a tap rewrote the address. The Address bar now rewrites to the escape target whenever an overlay shows, the one on open included, and "Close" restores the address. Stories 28, 29 and 33 changed, and an iOS Instagram test was added.
- **reject** (D4) "/r/{id} lacks an attribution contract." Only Reveal appends `/c{code}` (goal_ai.txt:36), and v1's non-Adult Links navigate to their public url (goal_ai.txt:39, :226), so they carry no code today. Phase 2's `/r` appends none either (phase-02 spec, Contracts). A tracked non-Adult Link loses nothing it has in v1. The Destination rule now says "as given, with no Tracking Code", so nobody reads it as a promise.
- **accept** (D5) Four story seams were untested. Added tests for: Link `mode` removed under a `direct` and a `deeplink` default (stories 2–3); tapping "Open in browser" and "Try another way", not just reading `href` (17, 19); opening the recorded escape target in a fresh context, with the Adult Reveal carrying `TC` (22, 26); and a same-task mark on every Escape navigation, which fails any wait before it (15).
- **accept** (D6) A Threads detection miss was written off as "not a change this Phase makes". Further Notes now says a miss fails the matrix, so the Phase is not Done. It parks for the Operator with the observed User-Agent, and the one-word pattern change becomes this Phase's fix once the plan's pattern is widened.
- **partial** (a) The per-Profile key: nothing breaks mechanically, as codex agrees. Accepted: the interim cross-Profile export is now stated, with why it never reaches Creator traffic (Cutover in Phase 5 comes after Phase 4, plan section 5), and Phase 4's spec claims the key. Rejected: moving the key here. Plan section 5 gives D5 to Phase 4, and the escape target follows the key without an edit.
- **accept** (b) Codex: compatible, since Deeplink always Reveals and `/r/{id}` is followed as given. Made exact against Phase 2's projection (`url` is `""` for Adult and Deeplink Links): the Schema, Destination rule, Owns and story 39 now say "absent or empty → Reveal", where the spec said "absent".
- **accept** (c) The spec never named `app/public/`. Owns now names `app/public/script.js`, `index.html` and `style.css`. Depends on names the same location and the stand-in's retargeting away from `linkme_clone3/` (tests/dev-server.mjs:10), matching Phase 0's Page Copy.

Blind call (before the spec):

- **reject** (B1) Codex prefers offering an Escape only after a Link tap, over a page-load overlay keyed to the Profile default. Imported v1 Profiles default to Escape Mode (goal_ai.txt:216), and Phase 2's DONE is "serves every existing profile identically" (goal_ai.txt:145). v1 shows the overlay on load, so the overlay on open is parity. The obstruction codex fears is answered by "Close" on any Profile that holds a non-escaping Link.
- **reject** (B2) Instructions-first instead of scheme attempts. Plan section 4 picks both schemes, fired from a tap (goal_ai.txt:109–114), and keeps the instruction and copy-link as the fallback, which the overlay already is. Codex itself offers instructions-first only if device evidence defeats the schemes, which the matrix tests.
- **reject** (B3) Carry a Link Shortcut and resume, or Reveal first and ask for a fresh tap. Already decided: the escape target plus the Link Shortcut is the resume protocol (Contracts, Escape target; Link Shortcut). Revealing first is the activation loss that plan section 4 warns against.
- **reject** (B4) Whether "inherit" means resolving at read time or copying the default onto Links. Already decided: the effective Mode rule resolves at read time (Schema), and Phase 2 stores an empty Link `mode` as "inherit".
- **partial** (B5) Making the Phase runnable before Phase 2, since the harness still roots in `linkme_clone3/`. The fixture-backed stand-in is Phase 0's and was already a Depends on. Accepted only the missing path, fixed with (c).
- **reject** (B6) Deeplink through `/r`, or Reveal followed by a fresh tap. `/r` would hand the phone ofl.ink's address, which no app owns. A second tap costs every Visitor a step against a failure nobody has seen. The single-tap Reveal is already flagged (Deeplink link ASSUMPTION), with the matrix as its falsifier (rung 5).
- **reject** (B7) Undefined handling of an absent, null or unknown Mode, of overrides, or of a changed default. Covered: the Schema's effective Mode rule treats anything unrecognised as missing (stories 4–5), and Links resolve against the current default.
- **partial** (B8) The Adult × Mode × Shortcut sequence. Already set: the gate comes before the Escape (story 23), and a Shortcut has no gate (v1 behaviour, Out of Scope). Accepted: "resolved as a tap resolves it" could be read as gating, so the Link Shortcut bullet and story 32 now say "with no Age Gate". A gate-cancel test was added (closing the Age Gate records no navigation and makes no Reveal).
- **reject** (B9) No protocol for escape completion, return or loop avoidance. Covered: the tap fires the first link and the overlay offers the rest (Escape Mode in an In-App Browser). An Escape never fires on load, and a Link Shortcut in an In-App Browser waits for a tap, so a fallback that loads in-app cannot loop.
- **reject** (B10) An incomplete handoff URL contract. Covered by Contracts, Escape target (host, path, code precedence, `?link=`, https) and by the platform table's encoding. An unknown Link Id is ignored (Link Shortcut).
- **partial** (B11) Unspecified disclosure boundaries and Reveal failure. Disclosure is Phase 2's (Out of Scope; ADR 0004). Accepted: the new Reveal callers now keep Phase 0's failure handling under a flagged ASSUMPTION, with no new error UI.
- **reject** (B12) A fuller outcome contract: Chrome or the app absent, detection misses, copy failures, focus and retry. The matrix rows define the Chrome-absent and app-absent outcomes, and the address shown as text is the manual copy route (story 19). Detection beyond the pattern, focus and retry are not in the plan (YAGNI).
- **partial** (B13) Release evidence. RUN.md rows already record device, OS, app version and pass/fail, and a Deeplink fixture Link is already required (Depends on; the spec fails fast without one). Accepted: the matrix now blocks Done (D1).
- **partial** (B14) Three seams. Rejected: a separate unit seam for "navigation decisions". The page is one plain script with no modules (house precedent), and the tests assert what a Visitor sees, not internals. Accepted: the fresh-context hop test (D5) and the gate-cancel test (B8). A failed-Reveal test is not added, because the behaviour stays Phase 0's.
- **reject** (B15) The harness serves the snapshot, the smoke spec uses a v1-shaped id, and check.sh has no unit stage. Retargeting the stand-in and the smoke spec is Phase 0's work (Depends on). The plan's check.sh runs unit tests "if any" (goal_ai.txt:191), and this Phase adds none.
- **reject** (B16) Falsifier: the schemes fail on real devices. Already the matrix's job: every overturn clause points at it, and it now blocks Done.
- **reject** (B17) Falsifier: hidden Destinations, tap activation and handoff do not compose. The escape target needs no Reveal before the tap (Contracts, Escape target), so this flow never needs a published Destination.
- **partial** (B18) Falsifier: a constructed https URL does not prove Deeplink works. Already acknowledged (Deeplink link: only the matrix's app-installed and app-absent rows tell Deeplink from Direct). Accepted through D1: those rows now block Done.
- **partial** (B19) Falsifier: the Escape loses the code, carries another Profile's code, skips the gate or loops. Code loss is answered by D3 and the fresh-context test. Another Profile's code is answered by (a). Skipping the gate on a Shortcut is v1 behaviour (Out of Scope). Loops are answered by B9.
- **reject** (B20) Falsifier: Escape lowers completion against Direct or instructions-first. The plan asks for a working matrix, not a measured uplift. Measuring needs Phase 4's Events, and nothing here claims an uplift.
- **reject** (B21) Falsifier: Meta flags ofl.ink despite hidden Destinations. Codex agrees this should not be a Phase 1 success claim, and it is not one (Out of Scope, last bullet; ADR 0004).

Counts: accept 7, partial 8, reject 15, needs-human 0. No material objection was left unanswered after the draft call.

### Six hats

Six-hats review of specs 00–05 taken as one set (HEAD 16d5a11), reconciled in the plan review, 2026-10-02. Ids: W white, R red, K black, Y yellow, G green, U blue, C the coordinator's points, X found by the reconciler. Bullets about the whole set are reconciled only in `docs/spec/plan-review.md`, Six hats. Cross-spec line citations in the entries above date from their own review and may have drifted; the main text now cites sections.

- C2 **accept**. Depends on called the Fixture Profile "a `juliafilippo_` copy". It now names the Username `fixture`, the name Phase 0 seeds.
- U1 **accept** (ports 80/443). Phase 1's Done waits for the real-device matrix on Phase 2's first public deploy, and that deploy waits for the Operator's answer on who holds ports 80 and 443 (needs-human, Phase 2 spec, Further Notes). This spec already says so (Depends on); the question is listed in plan-review.md, Needs the human. No change here. Answered 2026-10-04 by plan §11: Traefik keeps 80/443 and fronts v2's Caddy (Phase 2 spec, Further Notes, Ports 80 and 443), so the deploy waits only on the Operator's VPS step, no longer on a question.

Counts: accept 2, partial 0, reject 0, needs-human 0 (the ports question was Phase 2's, answered 2026-10-04 by plan §11).
