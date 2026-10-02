# Phase 01 — Link Modes and in-app-browser Escape

**Objective.** Every Link on a v1 Profile travels by its own Mode (Direct, Escape or Deeplink). The Escape Overlay appears only where Escape Mode calls for it. An Escape fires from the Visitor's own tap on iOS and Android, with a fallback that works. The Tracking Code survives the move into the System Browser.

## Problem Statement

The Operator cannot choose how a Link behaves. The only choices are the ones v1 hard-codes:

- Every Visitor whose browser says "Instagram" gets a full-screen overlay that cannot be closed. This happens even on Profiles whose Links don't need to leave Instagram, such as a Link to another Instagram account.
- Visitors in the Facebook, Threads or TikTok In-App Browsers get no help at all.
- On Android the Escape names Chrome and has no fallback. A phone without Chrome gets a dead Link.
- On iOS there is a single undocumented trick, and it fires only after a network round trip. Apps treat a navigation that late as no longer coming from the Visitor's tap.
- A Visitor who follows the overlay's menu instruction lands in a browser with fresh storage. The address bar has already been cleaned of the Tracking Code, so OnlyFans no longer credits the source that sent them.
- A Profile URL that carries both a Tracking Code and a Link Shortcut (`/{username}/{code}?link={Link Id}`) loses the Link Shortcut before it is read.

The Operator wants three per-Link options ("deeplink", "move out of IG", "nothing from above") and a way to set them from the n8n Form.

## Solution

Each Link has one Mode, and each Profile has a default Mode that its Links inherit. The Operator picks both in the n8n Form with a three-way radio.

- **Direct Mode.** A tap goes straight to the Destination, wherever the Visitor is.
- **Escape Mode.** Inside an In-App Browser, a tap moves the Visitor to this same Profile in the System Browser, carrying the Tracking Code and a Link Shortcut, so the System Browser finishes the Click. The Escape Overlay then shows as the fallback. It offers:
  - an "Open in browser" button
  - on iOS Instagram, a second "Try another way" button
  - the app-menu instruction
  - a copy-link button

  Outside an In-App Browser, Escape Mode behaves like Direct Mode.
- **Deeplink Mode.** A tap hands the Destination's https link to the phone, so the Destination's app opens if it is installed, and the web page opens if not.

The Age Gate still guards every Adult Link, whatever its Mode. A Profile whose default Mode is Escape Mode shows the Escape Overlay as soon as it opens in an In-App Browser, as every Profile does in Instagram today; it can be closed whenever the Profile also holds a Link that is not in Escape Mode. Profiles that have no Mode yet resolve to Escape Mode. They keep v1's overlay, but the plan's broader detection, the Android fallback and the tap-fired Escape reach them at once, so Facebook, Threads and TikTok Visitors now see the overlay too.

## User Stories

1. As an Operator, I want each Link to carry one Mode, Direct, Escape or Deeplink, so that I choose how each tap travels instead of ticking two checkboxes that could contradict each other.
2. As an Operator, I want a Profile to carry a default Mode that its Links inherit, so that I set the common case once.
3. As an Operator, I want a Link's own Mode to override the Profile's default, so that one OnlyFans Link can escape while an Instagram Link on the same Profile stays Direct.
4. As an Operator, I want Profiles and Links that have no Mode yet to resolve to Escape Mode, so that the 27 live v1 Profiles keep today's overlay until I edit them, while still getting the plan's broader detection and fixed Escape.
5. As an Operator, I want a Mode value the page does not recognise to be treated as missing, so that a typo falls back to the inherited Mode instead of breaking the page.
6. As an Operator, I want the n8n Form's profile step to offer a three-way radio for the Profile's default Mode, so that I can set it without hand-editing JSON.
7. As an Operator, I want the n8n Form's per-link step to offer the same three-way radio for each Link's Mode, so that every Link can differ from the default.
8. As an Operator, I want both radios to open on the Mode the Profile or Link already has, so that re-editing a Profile does not silently reset its Modes.
9. As an Operator, I want the Mode to be written into the Profile file at both levels and to survive the n8n step that strips the Destination from Adult Links, so that the published Profile actually carries it.
10. As an Operator, I want the Adult flag to stay separate from the Mode, so that an Adult Link can be Direct, Escape or Deeplink.
11. As a Visitor in Instagram, Facebook, Threads or TikTok, I want the page to recognise my In-App Browser, so that Escape Mode helps me in every one of those apps and not only in Instagram.
12. As a Visitor in an In-App Browser on a Profile whose default Mode is Escape Mode, I want the Escape Overlay as soon as the page opens, so that I can move to my System Browser before I tap anything.
13. As a Visitor in an In-App Browser on a Profile whose default Mode is Direct or Deeplink, I want no Escape Overlay when the page opens, so that I can use the Profile right away.
14. As a Visitor in a System Browser, I never want to see the Escape Overlay, so that nothing gets between me and the Links.
15. As a Visitor in an In-App Browser, I want a tap on a Direct Mode Link to open its Destination right where I am, so that Links which need no Escape just work.
16. As a Visitor in an In-App Browser, I want a tap on an Escape Mode Link to try the Escape straight from my tap, so that the app still treats it as my own action.
17. As a Visitor on iOS, I want that Escape to open this Profile in Safari through the `x-safari-https://` link v1 already uses, so that the method that works today keeps working.
18. As a Visitor in Instagram on iOS, I want a second "Try another way" button that uses Instagram's own open-in-browser link, so that I have another route when the first one is blocked.
19. As a Visitor on Android, I want the Escape to open this Profile in Chrome, falling back to the plain web address when Chrome is missing, so that the Link is never dead.
20. As a Visitor whose Escape was blocked, I want the Escape Overlay to show the app-menu instruction, an "Open in browser" button and a "Copy link" button with the address shown, so that I can always get out by hand.
21. As a Visitor who opened the Escape Overlay by tapping a Link, I want to close it, so that I can still reach the Profile's other Links.
22. As a Visitor who has reached the System Browser, I want the Link I tapped to open by itself, credited to the same Tracking Code, so that I don't have to find it and tap it again.
23. As a Visitor in an In-App Browser tapping an Adult Escape Mode Link, I want the Age Gate first and the Escape to fire from my "Continue (18+)" tap, so that I confirm my age once and the Escape still comes from my tap.
24. As an Operator, I want no Reveal to happen inside an In-App Browser for an Escape Mode Link, so that the Destination is fetched only in the System Browser, where the Visitor ends up.
25. As an Operator, I want the Tracking Code, and after an Escape Mode tap the Link Shortcut, to be in the address bar while the Visitor is in an In-App Browser, so that the app's own "Open in browser" menu item carries both, even though the System Browser starts with fresh storage.
26. As an Operator, I want the address bar cleaned of the Tracking Code in a System Browser, as it is today, so that nothing changes where no Escape is needed.
27. As a Visitor arriving at `/{username}/{code}?link={Link Id}`, I want that Link to open with that Tracking Code, so that an Escape lands where it was aimed and is credited to the right source.
28. As a Visitor arriving with a Link Shortcut for a non-Adult Link, I want it to open the same Destination a tap would, so that an escaped non-Adult Link lands where its tap would have.
29. As a Visitor tapping a Deeplink Mode Link on Android, I want the phone to open the app that owns the Destination's https link, falling back to the web page, so that I land in the app when I have it.
30. As a Visitor tapping a Deeplink Mode Link on iOS or a computer, I want the Destination's https address opened directly, so that iOS can hand it to its app and everyone else gets the web page.
31. As a Visitor tapping an Adult Deeplink Mode Link, I want the Age Gate first and then the deeplink, so that the gate behaves the same in every Mode.
32. As an Operator, I want Escapes and Link Shortcuts to use whichever host served the Profile, so that they keep working on a Spare Domain or a Custom Domain.
33. As an Operator, I want the Mode logic to stay in the public page script with no new Netlify-only coupling, so that v2 reuses it in Phase 2.
34. As an Operator, I want the local test loop to hold a Fixture Profile with a Link in every Mode plus an Adult Link, and a second fixture with no Mode at all, so that every behaviour above is checked headlessly with fake User-Agents.
35. As an Operator, I want a screenshot of the Escape Overlay saved in the effort's shots folder, so that I can see the result without running anything.
36. As an Operator, I want the real-device matrix for this Phase listed as manual rows in RUN.md, so that I can sign off that every Mode works on real phones before v1 production gets it.
37. As an Operator, I want a Link I leave on the Profile's Mode in the n8n Form to be saved without a Mode of its own, so that it keeps following the Profile's default when I change that later, and so that picking the Profile's Mode returns an overridden Link to inheritance.
38. As a Visitor in an In-App Browser on an Escape-default Profile that also holds a Direct or Deeplink Link, I want to close the Escape Overlay shown on open, so that I can still reach those Links in place.
39. As a Visitor arriving with a Link Shortcut whose Link Id is not on this Profile, I want the Profile to load as a plain visit, so that a stale or foreign id does nothing.

## Implementation Decisions

- **Owns.**
  - **Profile page script.** v1's script, which renders a Profile and handles taps. It gains Mode resolution, In-App Browser and platform detection, Escape and Deeplink navigation, the Link Shortcut fix and Tracking Code handling.
  - **Profile page markup and styles.** The Escape Overlay gains its controls. The inline Instagram-only detection in the page head is removed, so detection lives in one place.
  - **n8n Form export** (the repo-root export of the live workflow). The profile step, the per-link step, the loader, the link JSON builder, the public-link field set and the profile JSON builder all gain Mode.
  - **Dev server.** It answers Profile-file requests from the test fixtures first.
  - **Test fixtures.** The Fixture Profile and a Mode-less v1-shaped fixture.
  - **The Phase's Playwright spec.**
  - **RUN.md.** This Phase adds its manual matrix rows, and creates the file if it is absent.
- **Interfaces.** The Profile page exposes no code API. Its interface is what a Visitor sees and where each tap sends them.
  - **URL.** `/{username}[/{code}][?link={Link Id}]` is unchanged in form. It now honours code and Link Shortcut together.
  - **Data the page reads.** The page also reads `profile.mode` and `links[].mode`.
  - **Escape Overlay controls.** All are reachable by role and name:
    - heading "Open in System Browser" (kept, so the smoke spec stays valid)
    - link "Open in browser"
    - link "Try another way" (iOS Instagram only)
    - the escape target shown as text
    - button "Copy link"
    - button "Close" (on every Escape Overlay except the one on page open of a Profile whose Links all escape)

  Reveal is called exactly as today.

  ASSUMPTION: the control names and the app-neutral overlay text ("this app" in place of "Instagram", with no brand icon) follow v1's wording style (rung 3). A plain-text change overturns them if the Operator wants other copy.

  The dev server's only new behaviour: a request for a Profile file that exists among the test fixtures is answered from there, and every other request is served as today.
- **Schema.** The Profile file (v1's per-Profile JSON) gains two optional fields. Everything else is unchanged.

  ```ts
  type Mode = "direct" | "escape_ig" | "deeplink";
  profile.mode?: Mode            // the Profile's default Mode
  links[].mode?: Mode            // overrides the Profile's default for this Link
  // effective Mode = valid links[].mode ?? valid profile.mode ?? "escape_ig"
  ```

  ASSUMPTION: a Profile with no valid Mode defaults to Escape Mode, which keeps today's always-on overlay on the live Profiles until they are edited. The change is not invisible: the plan's broader detection, Android fallback and tap-fired Escape (section 4) reach Mode-less Profiles at once, so Facebook, Threads and TikTok Visitors start seeing the overlay. (Rung 4: the cheapest default to undo.) Overturned if the Operator wants Mode-less Profiles to fall back to Direct Mode instead.

  ASSUMPTION: the 27 live Profile files are not rewritten to carry an explicit Mode. They pick one up on their next n8n Form edit (rung 4). Overturned if the Operator wants every Profile stamped now.
- **Contracts.**
  - **Escape target.** This Profile's address on the host that served it, always as https: `https://{host}/{username}[/{code}][?link={Link Id}]`.
    - `{code}` is the Tracking Code the page would pass to Reveal: this visit's path code, otherwise the stored one.
    - `?link=` is present only when a Link tap or Link Shortcut caused the Escape.

    ASSUMPTION: the System Browser is sent to the Profile, not straight to the Destination. That is the only target known at tap time without a Reveal, which is what plan section 4's "escape on tap" and "trackId survives escape" require (rung 5). Overturned if the Operator wants the System Browser to land directly on the Destination; the Destination would then have to be fetched before the tap.

    ASSUMPTION: the Tracking Code follows the page's existing Reveal precedence, path code first and then the stored code (rung 3). Scoping the code per Profile belongs to Phase 4 (D5). Overturned if Phase 4 lands first and changes where the code is kept.
  - **Escape link, per platform.** Platform detection is v1's: iPhone, iPad or iPod means iOS, and Android means Android.

    | Platform | Escape link |
    |---|---|
    | iOS | `x-safari-` + escape target |
    | iOS Instagram, second option | `instagram://extbrowser/?url=` + encoded escape target |
    | Android | `intent://{host}/{path}[?query]#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=` + encoded escape target + `;end` |
    | anything else | the escape target itself |

    ASSUMPTION: "Try another way" is offered only when the In-App Browser is Instagram's on iOS, because the `instagram://` link would switch Facebook, Threads or TikTok Visitors into the Instagram app (rung 5). Overturned if the real-device matrix shows it escaping correctly from other apps.

    ASSUMPTION: an In-App Browser on a platform that is neither iOS nor Android gets the plain escape target on "Open in browser" (rung 5). Overturned if such a platform turns up in real traffic and needs its own link.
  - **Deeplink link.** These apply only to an absolute https Destination (D3: "via its https app link"). Any other Destination navigates plainly.
    - Android, any browser: `intent://{host}/{path}[?query]#Intent;scheme=https;S.browser_fallback_url=` + encoded Destination + `;end`. No package is named, so Android picks the app that owns the link.
    - Everything else: a top-level navigation to the Destination.

    ASSUMPTION: these two forms are the Deeplink Mode mechanics. On iOS that means relying on Universal Links, which In-App Browsers may ignore, leaving the web page as the fallback (rung 5). Overturned by the real-device matrix.

    On iOS and computers, Deeplink Mode's navigation is therefore the same as Direct Mode's, and the local test cannot tell them apart there. Only Android's package-less intent differs locally. The real-device matrix's app-installed and app-absent rows decide whether iOS Deeplink adds anything.
  - **In-App Browser detection.** It uses plan section 4's pattern, verbatim and case-insensitive: `Instagram|FBAN|FBAV|Threads|musical_ly|Bytedance|TikTok`.
  - **n8n Form.**
    - The profile step gains a radio field for the Profile's default Mode, and the per-link step gains a radio field for the Link's Mode.
    - Each radio's options are exactly `direct`, `escape_ig` and `deeplink`, the stored values themselves, because n8n options carry no separate label.
    - The loader outputs the existing Profile's `mode` so that the profile radio opens on it. The per-link radio opens on the Link's existing Mode, otherwise on the Profile's. Each radio carries this as its `defaultValue` expression, as every other field in both form steps already does.
    - The link JSON builder writes `mode` only when the picked Mode differs from the Mode picked at the profile step of the same submission. Otherwise it leaves `mode` out, so the Link keeps inheriting. The public-link field set passes `mode` through, and the profile JSON builder writes `profile.mode`.

    ASSUMPTION: inheritance survives an edit by omission, not by a fourth "inherit" option, which keeps the plan's three-way radio (plan section 5, Phase 1) (rung 5). The cost is that a Link cannot be pinned to the Mode its Profile already has. Overturned if the Operator wants such a pin; that needs a fourth per-link option meaning "no Mode of its own".
    - Node names stay as they are.

    ASSUMPTION: D3's "ONE per-link (or per-site default) field" is offered at both levels, as ADR 0003 records. The radio is therefore added twice (rung 3). Overturned if the Operator wants only one of the two radios in the n8n Form.

    ASSUMPTION (evidence blocked): the live n8n accepts `radio` form fields at the form node's version in the export (2.5). The export already uses `checkbox`, which shipped in the same n8n release, but the live n8n version cannot be read from here. Overturned if the import rejects the field; the fallback is a `dropdown`, as the icon field already uses.
  - **Fixtures, the seed contract for later Phases.** Both fixtures are v1-shaped Profile files. Their Link Ids are 10 or more characters and not derived from the Username (ADR 0004). Their Destinations point at the dev server or at `example.com`.
    - The **Fixture Profile** (`fixture`) is a copy of `juliafilippo_`. Its default Mode is Direct, and it holds:
      - a Link with no Mode, which inherits Direct
      - an Escape Mode Link
      - a Deeplink Mode Link
      - an Adult Escape Mode Link with tracking on
    - The second fixture (`fixture_v1`) has no Mode anywhere.

    ASSUMPTION: Phase 1 creates these fixtures and the dev-server lookup. The Fixture Profile's default is Direct so that the Escape Overlay shown on page open does not block the per-Link tests. A Deeplink Link is added even though plan section 7's seed list names only direct, escape_ig and adult, because the same line asks that "every mode is testable" (rung 5). Overturned if Phase 0 already ships a Fixture Profile; Phase 1 then adds its Modes to that one.
- **When the Escape Overlay shows.** It shows on page open when the visit is in an In-App Browser and the Profile's default Mode is Escape. That overlay blocks scrolling. Following CONTEXT.md, the Profile default decides this. Nothing auto-escapes on page open, because Escapes fire only from taps. The overlay also shows in an In-App Browser after an Escape Mode tap, or for a Link Shortcut to an Escape Mode Link.
  - **Close.** Every Escape Overlay has a Close button except one: the overlay on page open of a Profile whose Links are all in Escape Mode, which stays uncloseable as in v1. A Mode-less Profile therefore behaves as v1, and an Escape-default Profile that holds a Direct or Deeplink Link still lets the Visitor reach it.

  ASSUMPTION: the overlay opened by a Link tap is closable, following the Age Gate's close-button precedent. The overlay on page open stays uncloseable only where every Link would escape anyway, following v1 (rung 3). Overturned if the Operator wants the on-open overlay always uncloseable, accepting that Direct and Deeplink overrides on an Escape-default Profile are then unreachable in In-App Browsers.

  ASSUMPTION: the overlay shows right after the tap fires the Escape, not after a timer or a page-visibility check. If the Escape succeeds, the app is left behind anyway (rung 5). Overturned if the real-device matrix shows the overlay flashing in a way that confuses Visitors.
- **Taps by Mode.**
  - A non-Adult Link's Destination comes from the Profile file's `url`. An Adult Link, or a Link without a `url`, goes through Reveal, as v1 does. After Phase 0, secrets.json holds a Destination for every Link, non-Adult ones included (Phase 0 spec, regenerate-link-ids steps 3 and 4), so blanking a non-Adult `url` later needs no change to this script.
  - Direct Mode navigates there plainly, inside or outside an In-App Browser. v1 used to escape every Adult Link in Instagram; that stops.
  - Escape Mode inside an In-App Browser:
    - The tap assigns the Escape link synchronously in the tap handler, with no request before it.
    - For an Adult Link, the Age Gate opens first and "Continue (18+)" is the tap that escapes.
    - No Reveal happens in the In-App Browser.
  - Escape Mode outside an In-App Browser is Direct.
  - Deeplink Mode resolves the Destination as above, then uses the Deeplink link. For an Adult Link, Reveal runs after "Continue (18+)".

  ASSUMPTION: non-Adult Links keep their public `url` in this Phase, as Phase 0 leaves them (Phase 0 spec, "Which Destinations leave the public files"); the plan's Phase 1 list does not include hiding them (rung 5). This stands against ADR 0004's "no Destination in any published file" and is parked needs-human in the Review. Overturned if the Operator rules that ADR 0004 covers them in v1: the n8n public-link field set and the 27 Profile files then blank every `url`, and the script stays as specified.

  ASSUMPTION: an Adult Escape Mode Link shows the Age Gate in the In-App Browser. The Link Shortcut then reveals without a second gate in the System Browser, which is the existing Link Shortcut behaviour (rung 3). Overturned if the Operator wants the gate shown in the System Browser instead.

  ASSUMPTION: an Adult Deeplink Link navigates from the Reveal callback. That may lose the tap's user activation, and it relies on the fallback URL if Android refuses the hand-off (rung 5). Overturned if the real-device matrix shows dead Links; then Reveal starts when the Age Gate opens.
- **Link Shortcut.** It is read on page load before the address bar is touched, so `/{username}/{code}?link={Link Id}` reveals with that code. It then follows the Link's effective Mode:
  - In an In-App Browser, an Escape Mode Link shows the Escape Overlay aimed at the current URL, with no Reveal and no Escape until a tap.
  - Anywhere else, the Link is resolved the way a tap resolves it, then navigated by its Mode.
  - A Link Id that is not on this Profile is ignored, and the page loads as a plain visit.

  ASSUMPTION: a Link Shortcut resolves its Destination the way a tap does: the Profile file's `url` for a non-Adult Link, and Reveal otherwise (rung 3: the tap path). v1 sends every Shortcut to Reveal; after Phase 0, Reveal holds every Link's Destination, so either path lands on the same Destination. Overturned if the Operator blanks non-Adult `url`s (the needs-human line in the Review); Reveal then serves every Link with no change here.

  ASSUMPTION: an unknown Link Id is ignored rather than sent to Reveal as v1 does, because Reveal looks ids up across every Profile and Phase 0 regenerates every id anyway (rung 5). Overturned if a Shortcut must reveal a Link that is not on its Profile.
- **Address bar.** In an In-App Browser it keeps `/{username}/{code}` and the query, so the app's own "Open in browser" menu item carries both. When an Escape Mode tap fires there, the same handler replaces the address with the escape target's path and query (`/{username}[/{code}]?link={Link Id}`). The menu route then also carries the Link Shortcut, and a code that came only from storage. "Close" puts back the address the page had before the tap. In a System Browser the address is cleaned to `/{username}` as today.

  ASSUMPTION: only an Escape Mode tap rewrites the address, not page open, so a stored code left by another Profile is not stamped into every In-App Browser visit (rung 4). Overturned if the on-open overlay's menu route must also carry a stored code.

  ASSUMPTION: the cleaning is kept outside In-App Browsers rather than removed everywhere (rung 4: the smaller change). Overturned if the Operator wants the Tracking Code visible in every browser.
- **No new dependency, build step or service.**
  - The Profile page stays one vanilla script with no modules (house precedent: v1 has no package manifest).
  - Mode handling depends only on the Profile file and the existing Reveal endpoint, so Phase 2 carries it over unchanged.
  - Reveal itself is not touched. Of D8, Phase 0 applies the Link Id format; the rate limit and same-origin check are v2's, in Phase 2's Click guard.

## Testing Decisions

**One seam:** the Profile page running in Chromium under Playwright, against the existing dev server (the existing `webServer`), with fake User-Agents set per `test.describe`. The spec is `tests/e2e/01-link-modes-and-escape.spec.ts`. It asserts what a Visitor sees and where a tap sends them, never script internals.

The spec uses these test-side observers, all inside the seam:

- **Navigation recorder.** An init script records every Navigation API `navigate` event's destination URL.
  - Observed locally on 2026-10-02 with Playwright 1.58 Chromium: it captures custom-scheme navigations in full, fragment included. `intent://example.com/x#Intent;scheme=https;S.browser_fallback_url=…;end` was recorded intact, and the page stayed put.
  - Playwright's `request` event also sees `x-safari-https:`, `intent:` and `instagram:` navigations, but strips the fragment. So assertions on intent links use the recorder or the overlay links' `href`.
- **Network.** `page.route` fulfils Reveal, as the smoke spec already does, and every `example.com` request. No test leaves the machine. For a non-Adult fixture Link, the Reveal stub answers with that Link's `url` from the fixture file. On v1 such a Link never calls Reveal; on v2 a Deeplink Mode Link does (Phase 2 spec, Contracts), so the Deeplink assertions hold on both.
- **Profile variants.** `page.route` fulfils `/api/profiles/fixture.json` with the Fixture Profile changed in one field, as the smoke spec already fulfils Reveal. This tests other defaults, invalid Modes and other Adult Modes without more fixture files.
- **Clipboard.** Granted clipboard permission lets the spec read what "Copy link" copied.
- **Screenshot.** `page.screenshot` of the iOS Instagram Escape Overlay goes to `.scratch/goal_ai/shots/01-link-modes-and-escape.png` (plan section 7, step 2).

Behaviours covered (`TC` = a Tracking Code in the path):

- **Desktop / System Browser UA.**
  - The Fixture Profile shows no Escape Overlay.
  - The inheriting Link and the Escape Mode Link both navigate plainly to their Destinations.
  - The Deeplink Link navigates plainly.
  - The Adult Link shows the Age Gate, then Reveals and navigates.
  - `/fixture/TC` is cleaned to `/fixture`.
  - `/fixture/TC?link={adult Link Id}` calls Reveal with that id and `trackingId=TC`, then navigates.
  - `/fixture/TC?link={Escape Mode Link Id}` navigates to that Link's `url`, with no Reveal request.
  - `/fixture?link={an id not on the Profile}` loads the Profile, with no Reveal request and no navigation.
- **iOS Instagram UA.**
  - The Fixture Profile shows no overlay on open.
  - The inheriting Link navigates plainly, with no `x-safari` navigation.
  - From `/fixture/TC`, the Escape Mode Link records `x-safari-https://{host}/fixture/TC?link={id}`, and the address bar becomes `/fixture/TC?link={id}`. The overlay shows "Open in browser" with that `href`, and "Try another way" with `instagram://extbrowser/?url=` plus the encoded target. "Copy link" puts the https target on the clipboard. "Close" hides the overlay and puts the address back to `/fixture/TC`.
  - From `/fixture` with a code already in storage, the Escape Mode Link's tap puts that code into both the recorded target and the address bar.
  - `/fixture/TC?link={Escape Mode Link Id}` shows the overlay aimed at that URL, with "Close", no Reveal request and no recorded `x-safari` navigation.
  - The Adult Escape Mode Link shows the Age Gate. "Continue (18+)" records the `x-safari` escape, and no Reveal request is ever made.
  - The Deeplink Link navigates plainly to its https Destination.
  - The address bar keeps `/fixture/TC` until a Link is tapped.
  - Variants:
    - The inheriting Link given an unrecognised Mode navigates plainly, with no `x-safari` navigation.
    - `profile.mode` set to an unrecognised value, or to `escape_ig`, shows the overlay on open with "Close", because the Deeplink Link does not escape. After "Close", the Deeplink Link navigates plainly.
    - `profile.mode` set to `deeplink` shows no overlay on open.
    - The Adult Link set to Direct shows the Age Gate. "Continue (18+)" Reveals and navigates plainly, with no `x-safari` navigation.
- **Android Instagram UA.**
  - The Escape Mode Link records `intent://{host}/fixture/TC?link={id}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url={encoded target};end`. The overlay's "Open in browser" carries the same `href`, and there is no "Try another way".
  - The Deeplink Link records `intent://example.com/…#Intent;scheme=https;S.browser_fallback_url=…;end`, with no package.
  - Variant: the Adult Link set to Deeplink shows the Age Gate. "Continue (18+)" Reveals, then records a package-less `intent://` for the revealed Destination.
- **Instagram, FBAN and TikTok UAs** (parametrised): `fixture_v1/TC` shows the Escape Overlay on open, without "Close". This guards that Mode-less Profiles resolve to Escape Mode with v1's uncloseable overlay, and that the plan's broader detection is in force. FBAN and TikTok are a deliberate change from v1, which checks for Instagram only.
- **iOS Safari UA**: no overlay, and the Escape Mode Link navigates plainly.

The n8n Form has no local seam, because it runs live on the VPS. Its export is checked as a static contract in Acceptance (`jq`), and its live behaviour is a manual step.

Prior art:

- `tests/e2e/00-smoke.spec.ts` sets a fake Instagram UA through `test.use` and fulfils Reveal through `page.route`. It must stay green, and it doubles as the guard that `juliafilippo_`, which has no Mode, still shows the overlay in Instagram.
- `tests/dev-server.mjs` is the server under test.

## Acceptance

```sh
# Run from the repo root (/Users/jakabasej/oflinkv2) after Phase 0 has landed.
set -e   # any failing check fails the block; a later ./check.sh must not mask it

# n8n Form export: three-way Mode radio at Profile and Link level, carried into the Profile file
jq -e '[.nodes[] | select(.name=="Form")  | .parameters.formFields.values[] | select(.fieldType=="radio") | [.fieldOptions.values[].option] | sort] == [["deeplink","direct","escape_ig"]]' n8n_oflink_Feb18.json
jq -e '[.nodes[] | select(.name=="Form2") | .parameters.formFields.values[] | select(.fieldType=="radio") | [.fieldOptions.values[].option] | sort] == [["deeplink","direct","escape_ig"]]' n8n_oflink_Feb18.json
jq -e 'any(.nodes[] | select(.name=="Json") | .parameters.assignments.assignments[]; .name=="mode")' n8n_oflink_Feb18.json
jq -e '.nodes[] | select(.name=="Edit Fields3") | .parameters.jsonOutput | test("\"mode\"")' n8n_oflink_Feb18.json
jq -e 'any(.nodes[] | select(.name=="Edit Fields8") | .parameters.assignments.assignments[]; .name=="mode")' n8n_oflink_Feb18.json
jq -e '.nodes[] | select(.name=="Edit Fields") | .parameters.jsonOutput | test("\"mode\"")' n8n_oflink_Feb18.json
# both radios open on the existing Mode (story 8)
jq -e '[.nodes[] | select(.name=="Form")  | .parameters.formFields.values[] | select(.fieldType=="radio") | .defaultValue // "" | test("mode")] == [true]' n8n_oflink_Feb18.json
jq -e '[.nodes[] | select(.name=="Form2") | .parameters.formFields.values[] | select(.fieldType=="radio") | .defaultValue // "" | test("mode")] == [true]' n8n_oflink_Feb18.json

# Fixtures parse
node -e 'for (const f of process.argv.slice(1)) JSON.parse(require("fs").readFileSync(f, "utf8"))' tests/fixtures/profiles/fixture.json tests/fixtures/profiles/fixture_v1.json

# This Phase's spec, then its screenshot for the human
npx playwright test tests/e2e/01-link-modes-and-escape.spec.ts
test -s .scratch/goal_ai/shots/01-link-modes-and-escape.png

# manual: import n8n_oflink_Feb18.json into the live n8n on the VPS. Edit one throwaway Profile through the n8n Form, picking a different Mode at the profile step and on one Link. Confirm the Profile file in GitHub now carries profile.mode and links[].mode, that a Link left on the Profile's Mode is saved without links[].mode, and that re-opening the Form pre-selects both.
# manual: publish this Phase to a Netlify deploy preview of v1, not ofl.ink production. The preview must have a test Profile holding one Direct, one Escape, one Deeplink and one Adult Escape Mode Link.
# manual: real-device matrix on that preview: iOS and Android x Instagram, Facebook, Threads and TikTok in-app, plus Safari and Chrome, for each Mode. Each row names the device, OS version and app version.
#   - Direct opens in place.
#   - Escape lands in the System Browser on /{username}/{code}?link=..., the Link opens there, and the final OnlyFans address ends in /c{code}. When it does not, the overlay's menu instruction (whose address now carries ?link=) and "Copy link" still get out.
#   - Escape on one Android phone with Chrome disabled lands in the fallback browser, not on a dead Link.
#   - Deeplink, once with the Destination's app installed and once without: the app opens, or the web page does.
#   Record one pass/fail row per cell in RUN.md.
# manual: only after every row passes, push the v1 repo so that ofl.ink production gets this Phase.
./check.sh
```

## Depends on

- **Phase 0.** It provides v1's final published-directory layout (the site moved into `public/`, plan section 2), which this Phase's page edits sit in, and the dev-server stand-in that serves it, in front of which this Phase adds its fixture lookup. It also provides the corrected Profile files, regenerated 12-digit Link Ids, a secrets.json holding every Link's Destination, and a smoke spec that reads the Adult Link Id from the served Profile (Phase 0 spec). It leaves non-Adult `url`s public, which this Phase relies on unless the needs-human line in the Review is answered the other way. Both Phases edit the same n8n export (Phase 0 fixes the prefix bug and the Link Id rule), so Phase 1 applies its edits on top of Phase 0's.

## Out of Scope

- **Mode storage in v2.** The links collection's `mode` field and the v1 Import mapping are Phase 2's. This Phase only defines the field they read.
- **Per-link Mode and 18+ toggles in the Editor.** These are Phase 3's.
- **Per-Profile scoping of the Tracking Code.** Replacing the global stored code is D5 / Phase 4. Here the escape target only carries the code the page already uses.
- **Counting Clicks across the Escape hop.** This is Phase 4's. This Phase adds no Event.
- **Any change to Reveal**, including CORS, rate limit and Link Id format. That is D8: Phase 0 applies the Link Id format, and Phase 2's Click guard adds the rate limit and same-origin check in v2.
- **Stamping an explicit Mode onto the live Profile files.** Not needed: a missing Mode resolves to Escape Mode, which keeps today's overlay. YAGNI.
- **An Age Gate on Link Shortcuts.** It is existing v1 behaviour that Phase 1 does not alter. Not asked for.
- **Starting Reveal when the Age Gate opens**, so that Adult Deeplink Links keep user activation. YAGNI until the real-device matrix shows a dead Link.
- **Detecting In-App Browsers beyond the plan's pattern**, such as Snapchat or LinkedIn. Not in the plan.
- **Translating the overlay copy, or giving it per-app artwork.** Not asked for.
- **Auto-escaping on page open, with no tap.** Plan section 4 says Escapes fire from a tap.
- **Importing the n8n export into the live n8n, deploying the preview, and promoting to ofl.ink.** These are human steps under floor 2, listed as `# manual:` in Acceptance.

## Further Notes

- **Where real devices are tested.** The real-device matrix needs a public https host, because the dev server is plain http on localhost and every Escape link is forced to https.

  ASSUMPTION: the matrix runs on a Netlify deploy preview of v1, not on ofl.ink production, so a failing Mode never reaches live Visitors (rung 4). Overturned if the Operator would rather test on production with a throwaway Profile.
- **Smoke spec Link Ids.** The smoke spec names a v1 Link Id that Phase 0 regenerates. Phase 0's spec already changes the smoke spec to read that id from the served Profile. This Phase's Acceptance ends with `./check.sh`, which runs the smoke spec, so this Phase cannot finish while the smoke spec is red.

  ASSUMPTION: if Phase 0 lands without that change, this Phase updates that one constant to the regenerated id, so that `./check.sh` passes. Nothing else in the smoke spec changes (rung 5). Overturned if Phase 0 has already updated it.
- **Dev-server root.** The dev server's site root has to follow wherever Phase 0 leaves the published directory. This Phase changes only the fixture lookup in front of that root.
- **Shared n8n export file.** This Phase and Phase 0 both edit the n8n export. The Acceptance `jq` checks select nodes by name, so they hold as long as Phase 0 keeps node names. Phase 0 is not expected to rename them, since the plan leaves n8n untouched apart from the prefix bug.

## Review

codex, 2026-10-02. There were two calls in a workspace blind to docs/spec/: a blind call (B: plan, glossary, ADRs, harness) and a draft call (D: this spec). Both exited 0 within the 900 s bound, with fresh, non-empty output. Each line gives a finding, a verdict and the reason. Where a finding was accepted, the decision is rewritten in its own section above.

**Draft call**

- **D1 (non-Adult Links read a public `url`, against ADR 0004's "no Destination in any published file"). needs-human.**
  - Settled by observation: after Phase 0, Reveal can answer every Link, because secrets.json gets one entry per Link that has a Destination, non-Adult ones included (Phase 0 spec, regenerate-link-ids steps 3 and 4). So the old claim that Reveal "cannot answer for non-Adult Links" was false and is rewritten (Link Shortcut). The Depends on section is rewritten too.
  - Position A (codex): ADR 0004 and the glossary's Destination ("held only on the server") cover every Link. Phase 0 deferred hiding non-Adult Destinations to "Phase 1 and Phase 2" (Phase 0 spec, Out of Scope). So this Phase should send every Link through Reveal and blank every `url`.
  - Position B (this spec): the plan's Phase 1 list (goal_ai.txt:129-133) does not ask for it. D8's "real URL" is the plan's word for the OnlyFans URL behind a secret link (goal_ai.txt:38, 53). Phase 2 moves every Destination server-side anyway (goal_ai.txt:142).
  - Both positions need the same script: a Link without a `url` already goes through Reveal. Reveal adds `/c{code}` only when the script passes a code, which it does only for Links with tracking on (linkme_clone3/script.js:235, netlify/functions/reveal.js:13-36). Position A therefore costs only a data and n8n field-set change.
  - What settles it: the Operator's ruling on whether ADR 0004 and D8 cover non-Adult Destinations (for example, a Link to the Creator's Instagram) in v1 before Cutover. Until then, the spec keeps B as a flagged ASSUMPTION (Taps by Mode).
- **D2 (on an Escape-default Profile, the uncloseable on-open overlay makes Direct and Deeplink overrides unreachable). accept.**
  - Confirmed: v1's overlay is uncloseable by design (linkme_clone3/index.html:15-25). The spec's own Fixture Profile avoided this case.
  - Rewritten in "When the Escape Overlay shows": every overlay has Close except the on-open one on a Profile whose Links all escape. This keeps v1 for Mode-less Profiles. Stories 38 and 21 and the Interfaces Close line follow.
  - Tested by the `escape_ig` and invalid-default variants.
- **D3 (the app-menu fallback loses `?link=` and a code that came only from storage). accept.**
  - Confirmed: the address bar rule kept only the current URL.
  - Rewritten in Address bar: an Escape Mode tap replaces the address with the escape target's path and query, and Close restores it. Story 25 follows.
  - Tested in the iOS Instagram block, from both a path code and a stored code.
- **D4 (saving through n8n turns inheritance into a permanent override). accept.**
  - Rewritten in n8n Form: the link builder leaves `mode` out when it equals the profile step's pick. This keeps the plan's three-way radio. ASSUMPTION flagged; story 37 added.
  - Checked by a manual Acceptance step.
- **D5 (the Acceptance `jq` checks prove little, and nothing fails fast). partial.**
  - Accepted `set -e`. Reproduced: `sh -c 'jq -en false; true'` exits 0, and the same with `set -e` exits 1.
  - Accepted two `jq` checks that each radio's `defaultValue` reads the existing Mode. House precedent: every field in Form and Form2 carries a `defaultValue` expression (`jq '.nodes[]|select(.name=="Form2")|.parameters.formFields.values[].defaultValue' n8n_oflink_Feb18.json`).
  - Rejected static checks of expression semantics and node connections: n8n has no local seam (it runs live on the VPS, floor 2). The manual import round trip, which now includes the inheritance check, is the proof.
- **D6 (missing seam tests: invalid Mode, explicit Escape and Deeplink defaults, Adult Direct and Adult Deeplink, non-Adult Link Shortcut, Escape Link Shortcut in an In-App Browser). accept.**
  - All are added to Testing Decisions as browser-seam cases.
  - Profile variants are served by `page.route`, following the smoke spec's Reveal precedent (tests/e2e/00-smoke.spec.ts:35), rather than by new fixture files.
- **D7 ("Mode-less Profiles keep today's behaviour" is false). accept.**
  - v1 detects Instagram only (linkme_clone3/index.html:15). The plan's pattern adds FBAN and TikTok, and the Escape changes.
  - The promise is rewritten in Solution, story 4, the Schema ASSUMPTION, the parametrised test's label and Out of Scope.

**Blind call**

- **B1 (what triggers the on-open overlay: Profile default, any Escape Link, or none; trouble on mixed Profiles). partial.**
  - Kept the Profile-default trigger that CONTEXT.md's Mode entry records.
  - Accepted the mixed-Profile consequence through D2's Close rule.
- **B2 (Escape to the Profile or to the Destination). reject.**
  - Already decided and flagged under Escape target.
  - The reviewer itself notes that a Destination handoff needs the Destination before the tap, against goal_ai.txt:110-111.
- **B3 (other launch sequences: an opaque handoff, a second tap after Reveal, a `/r/` redirect). reject.**
  - The spec already takes the opaque Profile and Link Shortcut handoff, with no Reveal in the In-App Browser.
  - `/r/:linkId` is Phase 2 (goal_ai.txt:138).
  - A second tap for Adult Deeplink is the flagged Taps by Mode ASSUMPTION and an Out of Scope item until the matrix shows a dead Link.
- **B4 (the plan sets no priority between `x-safari` and `extbrowser`). reject.**
  - Specified already: the tap fires `x-safari`, and "Try another way" is a separate button for iOS Instagram only (Solution; Escape link, per platform).
- **B5 (exact schema and compatibility policy). partial.**
  - The schema and its fallback (`valid links[].mode ?? valid profile.mode ?? "escape_ig"`) were already specified.
  - Invalid values are now tested (D6), and the compatibility promise is corrected (D7).
- **B6 (full behaviour table, including unsupported platforms and mixed Modes). partial.**
  - Unsupported platforms were covered (the "anything else" row), and the Age Gate's independence was covered (Taps by Mode).
  - The mixed Escape-default gap is fixed by D2.
- **B7 (Deeplink may be indistinguishable from Direct). partial.**
  - True on iOS and computers by construction, and the spec now says so.
  - The matrix gains app-installed and app-absent rows.
  - The mechanism stays, because D3's "via its https app link" is a plan constraint.
- **B8 (failure sequence: failed Reveal, repeated taps, pending state). reject.**
  - Reveal handling is v1's and unchanged: Continue is disabled while loading and restored on failure (linkme_clone3/script.js:228-230, 264-267).
  - An Escape is synchronous, so it has no pending state to specify.
- **B9 (Link Shortcuts with invalid or rotated ids, and with Adult Links). partial.**
  - The Adult Shortcut was already decided (flagged ASSUMPTION).
  - Accepted a rule for an id that is not on the Profile: it is ignored. ASSUMPTION flagged; story 39 added.
- **B10 (Tracking Code precedence across URL, Geo Rule, Link default and storage; `/c` added twice; per-Profile scoping). reject.**
  - Geo Rule and Link-default resolution stay in Reveal and the existing script (linkme_clone3/script.js:235-247; reveal.js:15-21). The escape target carries the code in the Profile path, never in the Destination, so `/c` is appended once, by Reveal (reveal.js:31-36).
  - Per-Profile scoping is D5 / Phase 4 (goal_ai.txt:93, 156).
  - The new address-bar rule rewrites only on a tap, so a foreign stored code is not stamped on page open.
- **B11 (n8n round trip and the Phase 0 entry condition; the smoke spec pins a prefixed id). partial.**
  - The inheritance round trip is accepted through D4, and preselection through D5.
  - The Phase 0 entry condition was already in Depends on.
  - Observed: the Phase 0 spec already makes the smoke spec read the id from the served Profile, so Further Notes and Depends on are updated.
- **B12 (the device matrix needs versions, Chrome absent, app installed and absent, and an attribution outcome; the plan's seed has no Deeplink Link). accept.**
  - Matrix rows now record device, OS and app versions. They add an Android phone with Chrome disabled and Deeplink with the app installed and absent. They check that the final OnlyFans address ends in `/c{code}`, which is also the reviewer's attribution falsifier.
  - The Deeplink fixture Link was already in the spec.
- **B13 (seam: the Visitor journey across data, controls, Age Gate, Reveal and navigation, plus an n8n-to-file-to-page check). partial.**
  - The page seam matches the reviewer's choice.
  - The n8n leg has no local seam (it runs live on the VPS, floor 2). It stays a static `jq` contract plus the manual round trip.
- **B14 (the smoke Adult test fulfils Reveal with `/landing.html`, so the returned Destination and its `/c` suffix go unverified). reject.**
  - This Phase does not touch Reveal (Out of Scope). It asserts that the code reaches Reveal's request.
  - The suffix is verified by Phase 0's Acceptance (Phase 0 spec, item 8).
- **B15 (a spoofed UA on Desktop Chrome does not prove an iOS or Android handoff). reject.**
  - The spec claims only that the attempt is recorded (Navigation recorder). Real handoffs are the manual matrix.
- **B16 (the dev server is a stand-in for `netlify dev`, ignores `public/`, and `check.sh` is Playwright only). reject.**
  - The stand-in's publish folder and redirects are Phase 0's (Phase 0 spec, Dev server stand-in).
  - This Phase only adds a fixture lookup in front of them (Further Notes, Dev-server root).
  - The plan's "unit tests (if any)" allows Playwright-only.
- **B17a (falsifier: Reveal followed by an Escape from one tap may lose user activation). reject.**
  - An Escape here never waits on Reveal.
  - The one Reveal-then-launch path, Adult Deeplink, is already a flagged ASSUMPTION with the matrix as its falsifier.
- **B17b (falsifier: hiding Destinations does not prevent Flagging). reject.**
  - This spec makes no such claim. ADR 0004 already denies it.

### Six hats

Six thinking hats on the whole Phase set, 2026-10-02, reconciled in the plan review. Labels follow docs/spec/plan-review.md (W white, R red, K black, Y yellow, G green, U blue). "Owner" is the one Phase that holds the decision.

- **W3** (fixture location is settled: `tests/fixtures/profiles/`, which Phase 2's seed imports with `--profiles`) **accept**. No edit.
- **K1 / G4** (the Android Deeplink test expects `intent://example.com…`, while v2 serves a non-Adult `url` as `{origin}/r/{id}`, which hands the phone an ofl.ink address) **accept**, owner Phase 2. Phase 2 now sends an empty `url` for a Link in Deeplink Mode, so this spec's script reveals it and deeplinks the real Destination ("a Link without a `url` goes through Reveal", Taps by Mode), with no script change. Here the Network bullet is rewritten: the Reveal stub answers a non-Adult fixture Link with its own `url`, so the Deeplink assertions hold on v1 and v2. The user-activation risk this spec flags for Adult Deeplink Links now covers every Deeplink Link on v2, with the same real-device falsifier.
- **K3** (the Fixture Profile's Adult Link has no Destination for the seed) **accept**, owner Phase 2, which adds `tests/fixtures/secrets.json`. No change here: this spec's tests stub Reveal.
- **G8** (move the per-Profile Tracking Code key into this Phase, since it is a live v1 bug and this Phase already edits that code) **reject**, rung 2: plan §5 gives D5 to Phase 4, and D5 holds "Replace the global localStorage trackId". The Escape target ASSUMPTION already points there. Its cost, v1 keeping the global key until Cutover, is written in Phase 4's "Public page copy".
