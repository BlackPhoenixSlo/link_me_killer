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
28. As an Operator, I want an Escape Mode tap to put the escape target's path and query into the address bar, so that the menu route also carries the Link Shortcut, and a Tracking Code that came only from storage.
29. As a Visitor who closes the Escape Overlay, I want the address bar put back as it was before my tap, so that a reload doesn't reopen the Link I walked away from.
30. As an Operator, I want the address bar cleaned of the Tracking Code in a System Browser, as v1 does, so that nothing changes where no Escape is needed.
31. As a Visitor arriving at `/{username}/{code}?link={Link Id}`, I want that Link to open with that Tracking Code, so that an Escape lands where it was aimed and is credited to the right source.
32. As a Visitor arriving in a System Browser with a Link Shortcut, I want it to resolve the Link the way a tap would and then travel by the Link's Mode, so that an escaped Link lands where its tap would have.
33. As a Visitor arriving in an In-App Browser with a Link Shortcut to an Escape Mode Link, I want the Escape Overlay aimed at this address, with no Reveal and no Escape until I tap, so that the Escape still comes from a tap.
34. As a Visitor arriving with a Link Shortcut whose Link Id is not on this Profile, I want the Profile to load as a plain visit, so that a stale or foreign id does nothing.
35. As a Visitor tapping a Deeplink Mode Link on Android, I want the phone to open the app that owns the Destination's https link, falling back to the web page, so that I land in the app when I have it.
36. As a Visitor tapping a Deeplink Mode Link on iOS or a computer, I want the Destination's https address opened directly, so that iOS can hand it to its app and everyone else gets the web page.
37. As a Visitor tapping an Adult Deeplink Mode Link, I want the Age Gate first and then the deeplink, so that the gate behaves the same in every Mode.
38. As an Operator, I want a Deeplink Mode Link always to get its Destination from Reveal, so that the phone is handed the Destination's own https link and not v2's click path.
39. As an Operator, I want the page to need no Destination in the Profile JSON, with a Link that has no `url` getting its Destination from Reveal at the moment of the Click, so that v2's server can keep every Destination out of public payloads (ADR 0004, plan section 9).
40. As an Operator, I want Escapes, Link Shortcuts and "Copy link" to use whichever host served the Profile, so that they keep working on a Spare Domain or a Custom Domain.
41. As an Operator, I want all Mode handling to stay inside the public page as a plain script with no build step and no dependency, reading only the Profile JSON and Reveal, so that Phase 2's app serves the same page unchanged on the VPS.
42. As an Operator, I want this Phase to leave v1 alone (the v1 Snapshot, the old repo, Netlify and the n8n Form), so that ofl.ink keeps working exactly as it is while v2 gains the Modes.
43. As an Operator, I want every behaviour above checked headlessly against the Fixture Profile with fake Instagram, FBAN and TikTok User-Agents, so that `./check.sh` catches a regression before any phone is involved.
44. As an Operator, I want a screenshot of the Escape Overlay saved in the effort's shots folder, so that I can see the result without running anything.
45. As an Operator, I want the real-device matrix for every Mode listed as manual rows in RUN.md, so that I can confirm on real phones that every Mode works before Cutover.

## Implementation Decisions

- **Owns.** All of these are in this repo, never in the v1 Snapshot.
  - **Profile page script.** Phase 0's copy of the v1 Snapshot's page script. It gains:
    - Mode resolution
    - In-App Browser and platform detection
    - Escape and Deeplink navigation, and the Escape Overlay's behaviour
    - the Link Shortcut fix and the address-bar rule
    - Reveal for Links without a `url` and for every Deeplink Mode Link
  - **Profile page markup and styles.** The Escape Overlay gains its controls and app-neutral copy. The inline Instagram-only check in the page head is removed, so detection lives in the script alone.
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
  - **Reveal.** The page calls it exactly as Phase 0's page copy does: Link Id, Username, and a Tracking Code when the Link has tracking on. This Phase adds callers, never parameters.

  ASSUMPTION: the control names and the app-neutral wording ("this app" where v1 says "Instagram", and no brand icon) follow v1's wording style (rung 3). A plain copy change overturns them if the Operator wants different words.
- **Schema.** No database. PocketBase's `mode` field and the v1 Import default are Phase 2's. The Profile JSON the page reads gains two optional fields, and `url` becomes optional:

  ```ts
  type Mode = "direct" | "escape_ig" | "deeplink";  // ADR 0003's stored values
  profile.mode?: Mode   // the Profile's default Mode
  links[].mode?: Mode   // overrides the Profile's default for this Link
  links[].url?: string  // where a Direct or Escape tap on a non-Adult Link goes; absent → Reveal; never read in Deeplink Mode
  // effective Mode = recognised links[].mode ?? recognised profile.mode ?? "escape_ig"
  ```

  ASSUMPTION: a missing or unrecognised Mode resolves to Escape Mode, the default plan section 8 gives v1 Profiles on import, so a Profile that reaches the page without a Mode behaves as an imported one does (rungs 3 and 4). Overturned if the Operator wants Mode-less Profiles to fall back to Direct Mode; that one constant changes here and in Phase 2's import.

  ASSUMPTION: a present `url` is followed as given, as v1 does for non-Adult Links (rung 3). Which value the server puts there (nothing, or v2's `/r/{Link Id}` per plan section 9) is the server's decision; the page needs no Destination in the JSON. Overturned if Phase 2 wants the page to build the `/r/` address itself.
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
  - **Destination.** A non-Adult Link with a `url` goes there. Every other Link goes through Reveal at the moment of the Click: Adult Links, Links without a `url`, and every Deeplink Mode Link. Every Reveal uses the page's existing Tracking Code rule.
  - **Direct Mode.** The page navigates plainly, inside or outside an In-App Browser. An Adult Link passes the Age Gate first.
  - **Escape Mode in an In-App Browser.**
    - The tap handler assigns the escape link synchronously, with no request before it, and then shows the overlay.
    - For an Adult Link, the Age Gate opens first, and "Continue (18+)" is the tap that escapes.
    - No Reveal happens.
  - **Escape Mode outside an In-App Browser** behaves as Direct Mode.
  - **Deeplink Mode.** The page reveals, then uses the Deeplink link. An Adult Link passes the Age Gate first, and Reveal runs after "Continue (18+)".

  ASSUMPTION: an Adult Escape Mode Link shows the Age Gate in the In-App Browser, and the Link Shortcut then reveals without a second gate in the System Browser. That is the existing Link Shortcut behaviour (rung 3). Overturned if the Operator wants the gate shown in the System Browser instead.
- **Link Shortcut.** It is read on page load, before the address bar is touched, so `/{username}/{code}?link={Link Id}` reveals with that code. It then follows the Link's effective Mode.
  - In an In-App Browser, an Escape Mode Link shows the Escape Overlay aimed at the current address, with no Reveal and no Escape until a tap.
  - Anywhere else, the Link is resolved as a tap resolves it and travels by its Mode. Escape Mode outside an In-App Browser is Direct Mode.
  - A Link Id that is not on this Profile is ignored, and the page loads as a plain visit.

  ASSUMPTION: an unknown Link Id is ignored instead of being sent to Reveal as v1 does, because a v2 Link Id belongs to one Profile and v2 regenerates every id anyway (rung 4: doing nothing is the cheaper undo). Overturned if a Link Shortcut must reveal a Link that is not on its own Profile.
- **Address bar.**
  - In an In-App Browser it keeps `/{username}/{code}` and the query, so the app's own "Open in browser" menu item carries both.
  - When an Escape Mode tap fires there, the same handler replaces the address with the escape target's path and query (`/{username}[/{code}]?link={Link Id}`). The menu route then also carries the Link Shortcut and a code that came only from storage.
  - "Close" puts back the address the page had before the tap.
  - In a System Browser the address is cleaned to `/{username}` after the Link Shortcut has been read, as v1 does.

  ASSUMPTION: only an Escape Mode tap rewrites the address, never page open, so a stored code is not stamped into every In-App Browser visit (rung 4). Overturned if the overlay shown on open must also carry a stored code through the menu route.

  ASSUMPTION: the cleaning stays outside In-App Browsers rather than being dropped everywhere (rung 4: the smaller change from v1). Overturned if the Operator wants the Tracking Code visible in every browser.
- **Tracking Code storage.** The page keeps storing the path code as Phase 0's copy does. Moving that store to one key per Profile (D5's "replace the global localStorage trackId") is not this Phase's work. The escape target is defined as "the code the page would pass to Reveal", so it follows that change without an edit, and this Phase's tests store codes only on the Profile they read them back on.

  ASSUMPTION: the per-Profile Tracking Code key is Phase 4's, because plan section 5 gives D5 to Phase 4 and section 8 moved only Phase 1's Mode and escape fix (rung 2), even though this Phase now owns the page script that holds the key. Until Phase 4 lands, a stored code can come from another Profile, as it does in v1. Overturned if Phase 4's spec does not claim the change; then it lands here as a one-key change in the Profile page script.
- **No new dependency, build step or service.** The page stays one plain script with no modules or packages (house precedent: v1 has no package manifest). It talks only to the Profile JSON and Reveal, so Phase 2's app serves it unchanged.

## Testing Decisions

**One seam:** the public page running in Chromium under Playwright, served by the existing dev-server stand-in (the config's existing `webServer`), with fake User-Agents set per `test.describe`. Nothing is added to the server, so the same spec runs unchanged once Phase 2 swaps the stand-in for its own stack. The spec is `tests/e2e/01-link-modes-and-escape.spec.ts`. It asserts what a Visitor sees and where a tap sends them, never the script's internals. It reads Link Ids, Modes and the Username from the Fixture Profile the stand-in serves, and fails fast if no Link resolves to one of the three Modes or no Link is Adult.

Test-side observers, all inside the seam:

- **Navigation recorder.** An init script records the destination URL of every Navigation API `navigate` event.
  - Observed 2026-10-02 with Playwright 1.58 Chromium, on a localhost origin: `x-safari-https://…`, `intent://…#Intent;…;end` (fragment intact) and `instagram://extbrowser/?url=…` were each recorded in full, and the page stayed put.
  - Playwright's `request` event drops the intent's fragment, so intent assertions use the recorder or the overlay links' `href`.
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
    - records `x-safari-https://{host}/{p}/TC?link={id}`, and the address becomes `/{p}/TC?link={id}`
    - shows the overlay with "Open in browser" carrying that `href`, "Try another way" carrying `instagram://extbrowser/?url=` plus the encoded target, and the target as text
    - makes no Reveal request
    - "Copy link" puts `https://{host}/{p}/TC?link={id}` on the clipboard.
    - "Close" hides the overlay and puts the address back to `/{p}/TC`.
  - After an earlier visit to `/{p}/TC` in the same browser context, a tap on the Escape Mode Link from `/{p}` carries `TC` in both the recorded target and the address bar.
  - `/{p}/TC?link={Escape Mode Link Id}` shows the overlay aimed at that address, with "Close", no Reveal request and nothing `x-safari-` recorded.
  - The Adult Link, set to Escape Mode, shows the Age Gate. "Continue (18+)" records the `x-safari-` Escape, and no Reveal request is ever made.
  - The Deeplink Link reveals, then navigates plainly to the answer.
  - Variants:
    - A Link given an unrecognised Mode follows the Profile default: it navigates plainly, and nothing `x-safari-` is recorded.
    - A default of `escape_ig`, or an unrecognised default, on a Profile that still holds the Direct and Deeplink Links shows the overlay on open, with "Close". After "Close" the Direct Link navigates plainly.
    - Every Link set to Escape Mode, with an `escape_ig` default, shows the overlay on open with no "Close".
    - A default of `deeplink` shows no overlay on open.
    - The Adult Link set to Direct shows the Age Gate. "Continue (18+)" reveals and navigates plainly, and nothing `x-safari-` is recorded.
- **Android Instagram UA.**
  - A tap on the Escape Mode Link records `intent://{host}/{p}/TC?link={id}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url={encoded target};end`. "Open in browser" carries the same `href`, and there is no "Try another way".
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

# The v1 Snapshot is untouched (ADR 0005): its own git sees no change.
test -z "$(git -C linkme_clone3 status --porcelain)"

# This Phase's spec, then the Escape Overlay screenshot it leaves for the human (plan section 7, step 2).
npx playwright test tests/e2e/01-link-modes-and-escape.spec.ts
test -s .scratch/goal_ai/shots/01-link-modes-and-escape.png

# manual: look at .scratch/goal_ai/shots/01-link-modes-and-escape.png (iOS Instagram Escape Overlay) and confirm that the copy reads well.
# manual: once v2 answers on a public https address (Phase 2's first deploy to the VPS), create a throwaway Profile there. Give it Escape Mode as its default, and one Direct Link, one Escape Mode Link, one Deeplink Mode Link and one Adult Escape Mode Link with tracking on, each with a harmless Destination. Open it as /{username}/{code}.
# manual: run the real-device matrix on that Profile: an iPhone and an Android phone x the Instagram, Facebook, Threads and TikTok In-App Browsers, plus Safari (iOS) and Chrome (Android), for each Mode. Record one RUN.md row per cell: device, OS version, app version, pass/fail.
#   - On open: the Escape Overlay shows, with "Close", in every In-App Browser, and never in Safari or Chrome.
#   - Direct: the Link opens in place.
#   - Escape: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself, and the Adult Link's final address ends in /c{code}. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram), the app-menu instruction and "Copy link" still gets out.
#   - Escape, on an Android phone with Chrome disabled: lands in the fallback browser, not on a dead Link.
#   - Deeplink, once with the Destination's app installed and once without: the app opens, or the web page does.
./check.sh
```

## Depends on

- **Phase 0.** It must land first. This Phase assumes only what the plan and the run brief give it:
  - The public page copy in this repo (markup, script, styles), taken from the v1 Snapshot, reading the v1 Profile JSON shape at `/{username}[/{code}]`.
  - The dev-server stand-in that serves the page copy as the Playwright `webServer`, with a Reveal copy that answers by Link Id and appends `/c{code}` as v1's does, reading a test-only secrets file.
  - The Fixture Profile, a `juliafilippo_` copy, holding a Direct, an Escape, a Deeplink and an Adult Link, with Link Ids per ADR 0004.
  - A green smoke spec against the page copy.

  ASSUMPTION: Phase 0's Fixture Profile carries `profile.mode` and `links[].mode` in this Phase's Schema (rung 5: one shape for both Phases). Overturned if it ships without them; this Phase then adds those fields to the Fixture Profile and nothing else.

  ASSUMPTION: Phase 0's test-only secrets file holds a Destination for every Fixture Link, each on a host other than localhost, so that the real Reveal copy answers every Mode's path and the network fence catches the navigation (rung 5). Overturned if it holds fewer; this Phase then adds the missing entries to that test-only file and nothing else.
- The real-device matrix (a `# manual:` item) waits on Phase 2's first public https deploy, but no code from Phase 2 is needed for this Phase to land.

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

  ASSUMPTION: the matrix runs on v2's first public https deploy on the VPS (Phase 2), with a throwaway Profile, and this Phase's automated Acceptance does not wait for it. A tunnel would be a new dependency and network traffic, and v1 must not carry this code (rung 4). Overturned if the Operator offers another https host sooner.
- **Smoke spec.** This Phase's Acceptance ends with `./check.sh`, which runs the smoke spec, so the smoke spec must still pass after this Phase.

  ASSUMPTION: if the smoke spec's Instagram case opens a Profile whose default Mode is not Escape Mode, so that this Phase's Mode-dependent overlay no longer shows there, this Phase changes only that case to serve an Escape-default variant through `page.route`. Nothing else in the smoke spec changes (rung 5). Overturned if Phase 0 points that case at an Escape-default Profile.
- **Threads.** The detection pattern is the plan's, verbatim (rung 2). The Threads row of the real-device matrix is the check that Threads' In-App Browser identifies itself with a word the pattern holds; a miss there is a matrix failure for the Operator, not a change this Phase makes.
