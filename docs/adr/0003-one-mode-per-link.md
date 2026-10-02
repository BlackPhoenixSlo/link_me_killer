# One three-way Mode per Link, not two checkboxes

The original request was a "deeplink" checkbox, a "move out of IG" checkbox, and "nothing from above". These are three mutually exclusive ways to handle one tap. So each Link stores a single Mode, `direct`, `escape_ig` or `deeplink` (Direct, Escape and Deeplink Mode in CONTEXT.md), and a Profile carries a default Mode. The Escape Overlay, which v1 shows to every Instagram Visitor, becomes Mode-dependent. The Age Gate stays a separate Adult flag and works with any Mode.

## Considered Options

- **Two booleans, as first asked.** Rejected: that gives four states for three behaviours, and "both on" has no meaning.
- **Making 18+ a fourth Mode.** Rejected by D3: an Adult Link can still be Direct, Escape or Deeplink.
