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

The Age Gate still guards every Adult Link, whatever its Mode. A Profile whose default Mode is Escape Mode shows the Escape Overlay as soon as it opens in an In-App Browser, as every Profile does today. Profiles that have no Mode yet behave exactly as they do now.

## User Stories

1. As an Operator, I want each Link to carry one Mode, Direct, Escape or Deeplink, so that I choose how each tap travels instead of ticking two checkboxes that could contradict each other.
2. As an Operator, I want a Profile to carry a default Mode that its Links inherit, so that I set the common case once.
3. As an Operator, I want a Link's own Mode to override the Profile's default, so that one OnlyFans Link can escape while an Instagram Link on the same Profile stays Direct.
4. As an Operator, I want Profiles and Links that have no Mode yet to keep today's behaviour, so that the 27 live v1 Profiles change nothing until I edit them.
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
25. As an Operator, I want the Tracking Code to stay in the address bar while the Visitor is in an In-App Browser, so that the app's own "Open in browser" menu item keeps it, even though the System Browser starts with fresh storage.
26. As an Operator, I want the address bar cleaned of the Tracking Code in a System Browser, as it is today, so that nothing changes where no Escape is needed.
27. As a Visitor arriving at `/{username}/{code}?link={Link Id}`, I want that Link to open with that Tracking Code, so that an Escape lands where it was aimed and is credited to the right source.
28. As a Visitor arriving with a Link Shortcut for a non-Adult Link, I want it to open the same Destination a tap would, so that Escape Mode works for Links whose Destination is not held by Reveal.
29. As a Visitor tapping a Deeplink Mode Link on Android, I want the phone to open the app that owns the Destination's https link, falling back to the web page, so that I land in the app when I have it.
30. As a Visitor tapping a Deeplink Mode Link on iOS or a computer, I want the Destination's https address opened directly, so that iOS can hand it to its app and everyone else gets the web page.
31. As a Visitor tapping an Adult Deeplink Mode Link, I want the Age Gate first and then the deeplink, so that the gate behaves the same in every Mode.
32. As an Operator, I want Escapes and Link Shortcuts to use whichever host served the Profile, so that they keep working on a Spare Domain or a Custom Domain.
33. As an Operator, I want the Mode logic to stay in the public page script with no new Netlify-only coupling, so that v2 reuses it in Phase 2.
34. As an Operator, I want the local test loop to hold a Fixture Profile with a Link in every Mode plus an Adult Link, and a second fixture with no Mode at all, so that every behaviour above is checked headlessly with fake User-Agents.
35. As an Operator, I want a screenshot of the Escape Overlay saved in the effort's shots folder, so that I can see the result without running anything.
36. As an Operator, I want the real-device matrix for this Phase listed as manual rows in RUN.md, so that I can sign off that every Mode works on real phones before v1 production gets it.

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
    - button "Close" (only when a Link tap opened the overlay)

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

  ASSUMPTION: a Profile with no valid Mode defaults to Escape Mode, which reproduces today's always-on overlay. That makes the change invisible on the live Profiles until they are edited. (Rung 4: the cheapest default to undo.) Overturned if the Operator wants Mode-less Profiles to fall back to Direct Mode instead.

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
  - **In-App Browser detection.** It uses plan section 4's pattern, verbatim and case-insensitive: `Instagram|FBAN|FBAV|Threads|musical_ly|Bytedance|TikTok`.
  - **n8n Form.**
    - The profile step gains a radio field for the Profile's default Mode, and the per-link step gains a radio field for the Link's Mode.
    - Each radio's options are exactly `direct`, `escape_ig` and `deeplink`, the stored values themselves, because n8n options carry no separate label.
    - The loader outputs the existing Profile's `mode` so that the profile radio opens on it. The per-link radio opens on the Link's existing Mode, otherwise on the Profile's.
    - The link JSON builder writes `mode`, the public-link field set passes `mode` through, and the profile JSON builder writes `profile.mode`.
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
- **When the Escape Overlay shows.** It shows on page open when the visit is in an In-App Browser and the Profile's default Mode is Escape. That overlay blocks scrolling and has no Close button, as in v1. Following CONTEXT.md, the Profile default decides this. Nothing auto-escapes on page open, because Escapes fire only from taps. The overlay also shows after an Escape Mode tap in an In-App Browser, and that one has a Close button.

  ASSUMPTION: the overlay opened by a Link tap is closable, following the Age Gate's close-button precedent. The overlay shown on page open stays uncloseable, following v1 (rung 3). Overturned if the Operator wants either overlay to behave differently.

  ASSUMPTION: the overlay shows right after the tap fires the Escape, not after a timer or a page-visibility check. If the Escape succeeds, the app is left behind anyway (rung 5). Overturned if the real-device matrix shows the overlay flashing in a way that confuses Visitors.
- **Taps by Mode.**
  - A non-Adult Link's Destination comes from the Profile file's `url`. An Adult Link, or a Link without a `url`, goes through Reveal, as v1 does.
  - Direct Mode navigates there plainly, inside or outside an In-App Browser. v1 used to escape every Adult Link in Instagram; that stops.
  - Escape Mode inside an In-App Browser:
    - The tap assigns the Escape link synchronously in the tap handler, with no request before it.
    - For an Adult Link, the Age Gate opens first and "Continue (18+)" is the tap that escapes.
    - No Reveal happens in the In-App Browser.
  - Escape Mode outside an In-App Browser is Direct.
  - Deeplink Mode resolves the Destination as above, then uses the Deeplink link. For an Adult Link, Reveal runs after "Continue (18+)".

  ASSUMPTION: an Adult Escape Mode Link shows the Age Gate in the In-App Browser. The Link Shortcut then reveals without a second gate in the System Browser, which is the existing Link Shortcut behaviour (rung 3). Overturned if the Operator wants the gate shown in the System Browser instead.

  ASSUMPTION: an Adult Deeplink Link navigates from the Reveal callback. That may lose the tap's user activation, and it relies on the fallback URL if Android refuses the hand-off (rung 5). Overturned if the real-device matrix shows dead Links; then Reveal starts when the Age Gate opens.
- **Link Shortcut.** It is read on page load before the address bar is touched, so `/{username}/{code}?link={Link Id}` reveals with that code. It then follows the Link's effective Mode:
  - In an In-App Browser, an Escape Mode Link shows the Escape Overlay aimed at the current URL, with no Reveal.
  - Anywhere else, the Link is resolved the way a tap resolves it, then navigated by its Mode.

  ASSUMPTION: a Link Shortcut resolves its Destination the way a tap does: the Profile file's `url` for a non-Adult Link, and Reveal otherwise. v1 always calls Reveal, which cannot answer for non-Adult Links (rung 3: the tap path). Overturned if Phase 0 removes every `url` from public Profile files; Reveal then serves every Link.
- **Address bar.** In an In-App Browser it keeps `/{username}/{code}` and the query, so the app's own "Open in browser" menu item carries both. In a System Browser it is cleaned to `/{username}` as today.

  ASSUMPTION: the cleaning is kept outside In-App Browsers rather than removed everywhere (rung 4: the smaller change). Overturned if the Operator wants the Tracking Code visible in every browser.
- **No new dependency, build step or service.**
  - The Profile page stays one vanilla script with no modules (house precedent: v1 has no package manifest).
  - Mode handling depends only on the Profile file and the existing Reveal endpoint, so Phase 2 carries it over unchanged.
  - Reveal itself is not touched; its hardening is Phase 0's (D8).

## Testing Decisions

**One seam:** the Profile page running in Chromium under Playwright, against the existing dev server (the existing `webServer`), with fake User-Agents set per `test.describe`. The spec is `tests/e2e/01-link-modes-and-escape.spec.ts`. It asserts what a Visitor sees and where a tap sends them, never script internals.

The spec uses these test-side observers, all inside the seam:

- **Navigation recorder.** An init script records every Navigation API `navigate` event's destination URL.
  - Observed locally on 2026-10-02 with Playwright 1.58 Chromium: it captures custom-scheme navigations in full, fragment included. `intent://example.com/x#Intent;scheme=https;S.browser_fallback_url=…;end` was recorded intact, and the page stayed put.
  - Playwright's `request` event also sees `x-safari-https:`, `intent:` and `instagram:` navigations, but strips the fragment. So assertions on intent links use the recorder or the overlay links' `href`.
- **Network.** `page.route` fulfils Reveal, as the smoke spec already does, and every `example.com` request. No test leaves the machine.
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
- **iOS Instagram UA.**
  - The Fixture Profile shows no overlay on open.
  - The inheriting Link navigates plainly, with no `x-safari` navigation.
  - From `/fixture/TC`, the Escape Mode Link records `x-safari-https://{host}/fixture/TC?link={id}`. The overlay shows "Open in browser" with that `href`, and "Try another way" with `instagram://extbrowser/?url=` plus the encoded target. "Copy link" puts the https target on the clipboard, and "Close" hides the overlay.
  - The Adult Escape Mode Link shows the Age Gate. "Continue (18+)" records the `x-safari` escape, and no Reveal request is ever made.
  - The Deeplink Link navigates plainly to its https Destination.
  - The address bar keeps `/fixture/TC`.
- **Android Instagram UA.**
  - The Escape Mode Link records `intent://{host}/fixture/TC?link={id}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url={encoded target};end`. The overlay's "Open in browser" carries the same `href`, and there is no "Try another way".
  - The Deeplink Link records `intent://example.com/…#Intent;scheme=https;S.browser_fallback_url=…;end`, with no package.
- **Instagram, FBAN and TikTok UAs** (parametrised): `fixture_v1/TC` shows the Escape Overlay on open, without "Close". This guards that Mode-less Profiles keep v1 behaviour, and that the plan's detection pattern is in force.
- **iOS Safari UA**: no overlay, and the Escape Mode Link navigates plainly.

The n8n Form has no local seam, because it runs live on the VPS. Its export is checked as a static contract in Acceptance (`jq`), and its live behaviour is a manual step.

Prior art:

- `tests/e2e/00-smoke.spec.ts` sets a fake Instagram UA through `test.use` and fulfils Reveal through `page.route`. It must stay green, and it doubles as the guard that `juliafilippo_`, which has no Mode, still shows the overlay in Instagram.
- `tests/dev-server.mjs` is the server under test.

## Acceptance

```sh
# Run from the repo root (/Users/jakabasej/oflinkv2) after Phase 0 has landed.

# n8n Form export: three-way Mode radio at Profile and Link level, carried into the Profile file
jq -e '[.nodes[] | select(.name=="Form")  | .parameters.formFields.values[] | select(.fieldType=="radio") | [.fieldOptions.values[].option] | sort] == [["deeplink","direct","escape_ig"]]' n8n_oflink_Feb18.json
jq -e '[.nodes[] | select(.name=="Form2") | .parameters.formFields.values[] | select(.fieldType=="radio") | [.fieldOptions.values[].option] | sort] == [["deeplink","direct","escape_ig"]]' n8n_oflink_Feb18.json
jq -e 'any(.nodes[] | select(.name=="Json") | .parameters.assignments.assignments[]; .name=="mode")' n8n_oflink_Feb18.json
jq -e '.nodes[] | select(.name=="Edit Fields3") | .parameters.jsonOutput | test("\"mode\"")' n8n_oflink_Feb18.json
jq -e 'any(.nodes[] | select(.name=="Edit Fields8") | .parameters.assignments.assignments[]; .name=="mode")' n8n_oflink_Feb18.json
jq -e '.nodes[] | select(.name=="Edit Fields") | .parameters.jsonOutput | test("\"mode\"")' n8n_oflink_Feb18.json

# Fixtures parse
node -e 'for (const f of process.argv.slice(1)) JSON.parse(require("fs").readFileSync(f, "utf8"))' tests/fixtures/profiles/fixture.json tests/fixtures/profiles/fixture_v1.json

# This Phase's spec, then its screenshot for the human
npx playwright test tests/e2e/01-link-modes-and-escape.spec.ts
test -s .scratch/goal_ai/shots/01-link-modes-and-escape.png

# manual: import n8n_oflink_Feb18.json into the live n8n on the VPS. Edit one throwaway Profile through the n8n Form, picking a different Mode at the profile step and on one Link. Confirm the Profile file in GitHub now carries profile.mode and links[].mode, and that re-opening the Form pre-selects both.
# manual: publish this Phase to a Netlify deploy preview of v1, not ofl.ink production. The preview must have a test Profile holding one Direct, one Escape, one Deeplink and one Adult Escape Mode Link.
# manual: real-device matrix on that preview: iOS and Android x Instagram, Facebook, Threads and TikTok in-app, plus Safari and Chrome, for each Mode.
#   - Direct opens in place.
#   - Escape lands in the System Browser on /{username}/{code}?link=..., and the Link opens there with the code. When it does not, the overlay's menu instruction and "Copy link" still get out.
#   - Deeplink opens the Destination's app, or its web page when the app is absent.
#   Record one pass/fail row per cell in RUN.md.
# manual: only after every row passes, push the v1 repo so that ofl.ink production gets this Phase.
./check.sh
```

## Depends on

- **Phase 0.** It provides v1's final published-directory layout (the site moved into `public/`, plan section 2), which this Phase's page edits sit in. It also provides the corrected Profile files and regenerated Link Ids (plan section 5). Phase 1 needs nothing else from Phase 0. Both Phases edit the same n8n export (Phase 0 fixes the prefix bug), so Phase 1 applies its edits on top of Phase 0's.

## Out of Scope

- **Mode storage in v2.** The links collection's `mode` field and the v1 Import mapping are Phase 2's. This Phase only defines the field they read.
- **Per-link Mode and 18+ toggles in the Editor.** These are Phase 3's.
- **Per-Profile scoping of the Tracking Code.** Replacing the global stored code is D5 / Phase 4. Here the escape target only carries the code the page already uses.
- **Counting Clicks across the Escape hop.** This is Phase 4's. This Phase adds no Event.
- **Any change to Reveal**, including CORS, rate limit and Link Id format. That is D8, applied in Phase 0.
- **Stamping an explicit Mode onto the live Profile files.** Not needed: a missing Mode reproduces today's behaviour. YAGNI.
- **An Age Gate on Link Shortcuts.** It is existing v1 behaviour that Phase 1 does not alter. Not asked for.
- **Starting Reveal when the Age Gate opens**, so that Adult Deeplink Links keep user activation. YAGNI until the real-device matrix shows a dead Link.
- **Detecting In-App Browsers beyond the plan's pattern**, such as Snapchat or LinkedIn. Not in the plan.
- **Translating the overlay copy, or giving it per-app artwork.** Not asked for.
- **Auto-escaping on page open, with no tap.** Plan section 4 says Escapes fire from a tap.
- **Importing the n8n export into the live n8n, deploying the preview, and promoting to ofl.ink.** These are human steps under floor 2, listed as `# manual:` in Acceptance.

## Further Notes

- **Where real devices are tested.** The real-device matrix needs a public https host, because the dev server is plain http on localhost and every Escape link is forced to https.

  ASSUMPTION: the matrix runs on a Netlify deploy preview of v1, not on ofl.ink production, so a failing Mode never reaches live Visitors (rung 4). Overturned if the Operator would rather test on production with a throwaway Profile.
- **Smoke spec Link Ids.** The smoke spec names a v1 Link Id that Phase 0 regenerates. This Phase's Acceptance ends with `./check.sh`, which runs the smoke spec, so this Phase cannot finish while the smoke spec is red.

  ASSUMPTION: if Phase 0 leaves the smoke spec naming a stale Link Id, this Phase updates that one constant to the regenerated id, so that `./check.sh` passes. Nothing else in the smoke spec changes (rung 5). Overturned if Phase 0 has already updated it.
- **Dev-server root.** The dev server's site root has to follow wherever Phase 0 leaves the published directory. This Phase changes only the fixture lookup in front of that root.
- **Shared n8n export file.** This Phase and Phase 0 both edit the n8n export. The Acceptance `jq` checks select nodes by name, so they hold as long as Phase 0 keeps node names. Phase 0 is not expected to rename them, since the plan leaves n8n untouched apart from the prefix bug.
