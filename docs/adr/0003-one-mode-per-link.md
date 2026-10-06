# One three-way Mode per Link, not two checkboxes

The original request was a "deeplink" checkbox, a "move out of IG" checkbox, and "nothing from above". These are three mutually exclusive ways to handle one tap. So each Link stores a single Mode, `direct`, `escape_ig` or `deeplink` (Direct, Escape and Deeplink Mode in CONTEXT.md), and a Profile carries a default Mode. The Escape Overlay, which v1 shows to every Instagram Visitor, becomes Mode-dependent in v2. v1 keeps showing it to everyone and the n8n Form never gets a Mode (ADR 0005); v1 Profiles enter v2 with Escape Mode as their default. The Age Gate stays a separate Adult flag and works with any Mode.

## Considered Options

- **Two booleans, as first asked.** Rejected: that gives four states for three behaviours, and "both on" has no meaning.
- **Making 18+ a fourth Mode.** Rejected by D3: an Adult Link can still be Direct, Escape or Deeplink.

## Amended 2026-10-06

Deeplink splits in two: `deeplink` (Deeplink on tap), a Mode for Links and Profiles, and `deeplink_open` (Deeplink at open), a Profile default only, so each Link still stores one of the three Modes above. The Profile's Pop Out Timing setting goes; its "At open" on a Deeplink default becomes `deeplink_open`. A Deeplink tap, or "Continue (18+)", pops out as a real anchor tap with the escape link as href, as the Escape Overlay's "Open in browser" is, to the Profile with the Link's Link Shortcut, with no Reveal before it, and the System Browser reveals: a real phone showed In-App Browsers drop a custom-scheme pop-out made after an async Reveal, as not the Visitor's own, and one set from script even in the click handler. Deeplink at open fires once the Profile JSON has answered, the first moment its default Mode is known, so a request does precede it; on a real phone (2026-10-06) that scripted pop-out at open was dropped, so it is best-effort, and taps on that Profile pop out as Deeplink on tap through the anchor. Link Shortcuts keep v1's Reveal-then-pop-out.

## Amended 2026-10-06 (the Operator's decision)

The Deeplink Modes (`deeplink`, `deeplink_script`, `deeplink_open`) are Profile defaults only, "once for the whole page, two places is messy": a Link chooses Direct, Escape or the Profile default. `links.mode` holds only `direct` and `escape_ig` (`1791140014_link_modes_direct_escape.js` moves Links that held a Deeplink Mode to the default), and the server serves any other Link Mode as the Profile default.

Escape link, 2026-10-06: a real iPhone showed Instagram drops `x-safari-https://` while `instagram://extbrowser/?url=` goes through, so in iOS Instagram every pop-out, whatever the Mode, uses extbrowser, and `x-safari-` is the "Try another way" alternative (spec phase-01, Escape link, per platform).
