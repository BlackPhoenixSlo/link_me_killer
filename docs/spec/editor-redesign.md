# Editor and landing redesign: design brief

This brief covers the redesign of the Editor (`/edit`, `app/editor/`) and the landing page (`/landing.html`, reached by an unknown Username, `/netlify/*` and a failed Profile fetch; `/` does not reach it today, see section 10). Its sources are `docs/spec/phase-03-auth-and-editor.md` (P3) and `docs/spec/phase-04-stats.md` (P4). Both are binding, and where this brief and a spec disagree, the spec wins. "P3 s22" means story 22 of P3. The vocabulary is CONTEXT.md's. The look takes its cues from the light theme of the link.me Template (`link.me/build/globals-*.css`, `profile/edit.html`, `analytics.html`). It is described here in words, and none of its code or assets is used.

## 1. Principles

1. **One job per screen.** Links answers "what can Visitors tap", Profile "who am I", Modes "how a tap leaves Instagram" and Stats "what happened". Each screen has exactly one primary (filled) button.
2. **The Creator's words, not ours.** Labels are short and verb-first. Every technical field gets a one-line helper. Creator-facing copy never says "PocketBase", "token" or "JSON", except in the Geo Rule helper.
3. **Phone and thumb first.** Design at 375px first. Targets are at least 44px and inputs use 16px text, so iOS does not zoom. The primary action is visible without scrolling, or sits in a sticky foot on long forms.
4. **Nothing is lost.** Every form saves on its own Save button. A refused save keeps every field as typed and shows its reason next to the button (P3 s40). Delete asks first (P3 s38).
5. **Restyle, don't re-plumb.** The same paths, PocketBase calls, onboarding rule and messages stay. Hooks stay stable (section 7).

**"Understands at first sight"** means this. A Creator who has never seen the Editor opens any screen at 375×812. Within 5 seconds, without scrolling, they can say (a) which screen they are on (the h1 plus the highlighted tab), (b) what the one thing to do there is (the single primary button) and (c) on Links, where their page address is and how to copy it. Nothing above the fold needs them to know what Mode, Reveal or Tracking Code mean.

## 2. Design tokens

**One file, one path.** The tokens live in `app/editor/tokens.css`. The existing `/edit/*` static route serves it at `/edit/tokens.css` (`app/server.js:230`, `fileUnder(EDITOR, …)`, `.css` → `text/css`).
- `app/editor/index.html` links `/edit/tokens.css` and then `/edit/editor.css`.
- `app/public/landing.html` links the same two absolute paths, so it reuses the `e-` components, and keeps its own `l-` layout in an inline `<style>`.
- There is no copy and no server change. The public Profile page (`index.html`, `style.css`) loads neither file.
- `editor.css` may style bare elements only in a small base block (box-sizing, body, headings, a and img resets). Everything else is class-based, so the landing can load it safely.

```css
/* app/editor/tokens.css — custom properties only. Light theme, after the link.me Template's light palette. */
:root {
  color-scheme: light;
  --e-color-bg: #fafafa;             --e-color-surface: #ffffff;        --e-color-surface-muted: #f4f4f5;
  --e-color-border: #e4e4e7;         --e-color-border-strong: #8a8a95; /* inputs, switches: 3.4:1 on white */
  --e-color-text: #18181b;           --e-color-text-muted: #6b6b75;    /* 5.3:1 on white, 5.0:1 on bg */
  --e-color-text-inverse: #ffffff;
  --e-color-primary: #3550f0;        /* white on it 5.9:1; as text on white 5.9:1 */
  --e-color-primary-hover: #2a41d1;  --e-color-primary-soft: #eef1ff;
  --e-color-danger: #c8102e;         --e-color-danger-soft: #fdecee;   /* 5.9:1 */
  --e-color-success: #0a7a3a;        --e-color-success-soft: #e8f6ee;  /* 5.4:1 */
  --e-color-focus: #3550f0;          --e-color-scrim: rgb(24 24 27 / 0.5);
  --e-color-views: #3550f0;          --e-color-clicks: #e0457b;        /* Stats bars, decorative only */

  --e-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --e-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;  /* Geo Rule only */
  --e-text-xs: 12px;  --e-leading-xs: 16px;   /* captions, tab labels */
  --e-text-sm: 14px;  --e-leading-sm: 20px;   /* helpers, table cells, buttons */
  --e-text-md: 16px;  --e-leading-md: 24px;   /* body, every input */
  --e-text-lg: 18px;  --e-leading-lg: 28px;   /* lead, h2 */
  --e-text-xl: 20px;  --e-leading-xl: 28px;   /* live address */
  --e-text-2xl: 24px; --e-leading-2xl: 32px;  /* h1 at 375, stat values */
  --e-text-3xl: 30px; --e-leading-3xl: 36px;  /* h1 from 768 */
  --e-text-4xl: 36px; --e-leading-4xl: 40px;  /* landing hero at 375 */
  --e-text-5xl: 48px; --e-leading-5xl: 52px;  /* landing hero from 1024 */
  --e-weight-regular: 400; --e-weight-medium: 500; --e-weight-semibold: 600; --e-weight-bold: 700;

  --e-space-1: 4px;  --e-space-2: 8px;   --e-space-3: 12px;  --e-space-4: 16px;  --e-space-5: 20px;
  --e-space-6: 24px; --e-space-8: 32px;  --e-space-10: 40px; --e-space-12: 48px; --e-space-16: 64px;

  --e-radius-sm: 6px;    /* segmented buttons */     --e-radius-md: 12px;  /* inputs, rows, stat cards */
  --e-radius-lg: 16px;   /* cards */                 --e-radius-xl: 24px;  /* sheet top, dialog, landing shots */
  --e-radius-pill: 999px; /* buttons, nav pill */

  --e-shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);                  /* cards */
  --e-shadow-md: 0 4px 16px rgb(24 24 27 / 0.08);              /* sticky sheet foot, landing shots */
  --e-shadow-lg: 0 12px 40px -12px rgb(24 24 27 / 0.35);       /* nav pill, dialog */

  --e-tap: 44px;  --e-control-h: 48px;  --e-topbar-h: 56px;  --e-tabbar-h: 64px;  --e-sidebar-w: 224px;
  --e-content-max: 640px;  --e-auth-max: 440px;  --e-dialog-max: 400px;  --e-bar-max: 56px;

  --e-dur-fast: 120ms;  --e-dur-base: 200ms;  --e-dur-slow: 280ms;
  --e-ease: cubic-bezier(0.4, 0, 0.2, 1);  --e-ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);
  --e-focus-width: 3px;  --e-focus-offset: 2px;   /* :focus-visible { outline: var(--e-focus-width) solid var(--e-color-focus); outline-offset: var(--e-focus-offset); } */
  --e-z-bar: 10;  --e-z-dialog: 20;
}
@media (prefers-reduced-motion: reduce) { :root { --e-dur-fast: 0ms; --e-dur-base: 0ms; --e-dur-slow: 0ms; } }
/* Breakpoints (literal in @media; custom properties do not work there): base = 375 phone; min-width 768px = sidebar
   replaces the nav pill, wider column; min-width 1024px = Stats tables side by side, landing hero in two columns. */
```

Page padding is `--e-space-4` at 375, `--e-space-8` from 768 and `--e-space-10` from 1024. Card padding is `--e-space-4` at 375 and `--e-space-6` from 768. Fields stack with a 12px gap, and sections are 24px apart. Numbers use `font-variant-numeric: tabular-nums`. `index.html` drops `class="dark"`, and its viewport meta gains `viewport-fit=cover`, so `env(safe-area-inset-bottom)` works.

## 3. Information architecture

**Routing contract.** Routing stays on History API paths with no hash, because tests assert these paths. `/edit`, `/edit/verify?token=` and `/edit/reset?token=` are fixed by P3, and every other path keeps its current name. The two new tabs need two new paths.

| Path | Screen | Chrome | Status |
|---|---|---|---|
| `/edit` | entry: log-in, the first Onboarding step that applies, or `/edit/home` | – | fixed |
| `/edit/signup`, `/edit/login[?next=]`, `/edit/forgot` | Sign up, Log in, Forgot password | top bar | existing |
| `/edit/verify?token=`, `/edit/reset?token=` | Email verified / Set a new password, or "Link invalid or expired" | top bar | fixed |
| `/edit/claim`, `/edit/verify-email`, `/edit/profile`, `/edit/first-link`, `/edit/live` | Onboarding steps 1–5 | top bar + step | existing |
| `/edit/home` | **Links** tab (the Editor's home, where log-in lands) | nav | existing |
| `/edit/add-link`, `/edit/link` | Link editor (sheet screen) | nav hidden below 768 | existing |
| `/edit/me` | **Profile** tab | nav | new |
| `/edit/modes` | **Modes** tab | nav | new |
| `/edit/stats` | **Stats** tab | nav | existing |

**Reload.** Reloading `/edit/me`, `/edit/modes` or `/edit/stats` reopens that tab, after the token refresh and the `onboarded()` gate, the way `/edit/stats` works today. Reloading `/edit/add-link`, `/edit/link` or `/edit/live` lands on `/edit/home`, as today. The Back button closes the Link editor, because `popstate` calls `route()`.

**Navigation.** There is one `<nav class="e-nav" aria-label="Creator">` with four links, in this order: **Links** (`/edit/home`), **Profile** (`/edit/me`), **Modes** (`/edit/modes`) and **Stats** (`/edit/stats`). The current one carries `aria-current="page"`. It replaces today's pill row, "Editor | Stats".
- **Below 768px:** a floating pill fixed `12px + env(safe-area-inset-bottom)` above the bottom edge. It is 64px tall, up to 360px wide, centred, white at 92% with `backdrop-filter: blur(12px)` and `--e-shadow-lg`. The four items share the pill equally (`flex: 1`), each at least 64×56, with a 24px icon over a 12px label, so the pill fits a 320px screen. The active item is in the primary colour with a `--e-color-primary-soft` capsule. Content gets `padding-bottom: calc(64px + 32px + env(safe-area-inset-bottom))`.
- **From 768px:** the same nav becomes a fixed left sidebar, `--e-sidebar-w` wide with a right border. The "ofl.ink" wordmark sits in a 56px row at the top. Below it, items are 44px tall with a 20px icon and a 14px label at weight 500. The active item gets a primary-soft background with primary text, `--e-radius-sm`. Main content is offset by the sidebar width, `--e-content-max` wide and left-aligned with 40px padding.
- **Never shown on:** auth and Onboarding screens, and the Link editor below 768px, where its sticky Save bar takes the nav's place.

**Top bar.** It is 56px tall, white, with a bottom border, and holds the "ofl.ink" wordmark (16px, weight 700). It shows below 768px and on every auth and Onboarding screen. From 768px, signed-in screens show the wordmark in the sidebar instead. `#title` stops showing the screen name, and `document.title` stays `"{heading} · ofl.ink"`.

**Focus.** When a screen changes, focus moves to its h1 (`tabindex="-1"`).

## 4. Screens

**Layout shared by auth and Onboarding.** These screens use a single centred column, `--e-auth-max` wide, holding one `e-card`.
- The card holds an optional step line, then the h1 (24px; 30px from 768), the muted lead (16px), the form, one full-width primary button, and quiet links beneath.
- At 1024 the same card sits 64px from the top on `--e-color-bg`.
- **Step line** (`e-steps`, plain text, never `role="status"`): "Step n of 5", plus a 4px track whose fill shows n/5.
- **Busy:** while a request runs, the form carries `aria-busy="true"` and its controls are disabled. The primary button keeps its label and shows a CSS spinner (`::after`).
- **One `role="status"` per screen** (`e-msg`, an empty line until it has a message). The one exception is the Links tab, which has two: the Bio Link's and the list's.
- Every quoted string below is exact copy. "Kept" means the string is unchanged from `editor.js`.

**4.1 Sign up**, `/edit/signup` (P3 s1–s4, s16). Shows "Step 1 of 5".
1. h1 "Create your page" (kept). Lead: "Your email, a password and the Username your page lives at."
2. Fields:
   - "Email" (`type=email`, `autocomplete=email`)
   - "Password" (`new-password`; helper "At least 8 characters.")
   - "Username", with the prefix "{host}/" shown in muted text inside the field. It lowercases as typed and keeps the caret. Helper: "Lowercase letters, digits and _, 3 to 30 characters."
3. Primary button "Create account". Below it: "Already have an account? **Log in**".
4. Messages:
   - PocketBase's field reasons, e.g. "Email: this address already has an account. Log in instead." (kept)
   - "Sign-up failed. Try again." (kept)
   - "Your account was made, but log-in was refused: {reason}" (kept)
   - A refused claim lands on 4.2 with its reason.

**4.2 Claim your Username**, `/edit/claim` (P3 s3–s5). Shows "Step 1 of 5".
1. h1 "Claim your Username" (kept). Lead: "It becomes your page's address. Lowercase letters, digits and _, 3 to 30 characters."
2. "Username" field with its prefix, as in 4.1. Primary button "Claim".
3. Messages (all kept):
   - "“{name}” is taken. If it is your Username on ofl.ink today, do not claim another one: the Operator hands over Usernames held on v1 at Cutover, when ofl.ink moves to this site."
   - "Too short: a Username has at least 3 characters."
   - "Too long: a Username has at most 30 characters."
   - "Not allowed: a Username has only lowercase letters, digits and underscore (_)."
   - "Enter a Username."
   - "“{name}” is reserved. Pick another Username."
   - "The claim failed. Try again."

**4.3 Verify your email**, `/edit/verify-email` (P3 s6, s7, s9; this is the unverified state). Shows "Step 2 of 5".
1. A 48px mail icon. h1 "Verify your email" (kept).
2. Text: "We sent a link to **{email}**. Open it to verify your email, then press Continue." (kept)
3. Buttons: primary "Continue", secondary "Resend email".
4. Messages:
   - ok: "We asked for a new link to {email}. If none arrives within a few minutes, check your spam folder and try again." (kept)
   - error: "Your email is not verified yet. Open the link in the email we sent you, then press Continue." (kept)
   - error: "The email could not be sent. Try again." (kept)

**4.4 Email verified**, `/edit/verify?token=` (P3 s8). While the token is checked, a skeleton shows.
- **Verified:** a success-tinted check icon, h1 "Email verified", "Your email is verified." and a primary "Continue" button that goes to `/edit`.
- **Bad token:** h1 "Link invalid or expired" with "This verification link is invalid or expired. Enter your email and we will send you a new one." Then "Email", a primary "Resend email" button, and ok: "If an account uses that address, we sent it a link. Check your inbox." All of this copy is kept.

**4.5 Log in**, `/edit/login` (P3 s10–s13, s21, s53).
1. h1 "Log in". Lead: "Edit your ofl.ink Profile."
2. With `?next=`, the lead is replaced by an info banner (`e-msg--info`, no role): "Your session has ended. Log in to carry on." (kept)
3. "Email" and "Password" (`current-password`). Primary button "Log in".
4. Links: "Forgot password?", then "New here? **Sign up**".
5. Messages: "Wrong email or password." and "Log-in failed. Try again." (both kept).
6. After log-in, the Creator lands by the Onboarding rule. A handed-over Profile goes straight to Links (P3 s53).

**4.6 Forgot password**, `/edit/forgot` (P3 s14).
- h1 "Forgot password". Lead: "Enter your email and we will send you a link to set a new password."
- "Email" and a primary "Send reset link" button.
- ok: "If an account uses that address, we sent it a link. Check your inbox." It is the same for a known and an unknown address.
- Link: "Back to log in".

**4.7 Set a new password**, `/edit/reset?token=` (P3 s15).
- h1 "Set a new password". "New password" (`new-password`, "At least 8 characters.") and a primary "Set password" button.
- **Done:** h1 "Password changed", "Log in with your new password." and a primary "Log in" button.
- **Bad token, found on submit:** h1 "Link invalid or expired", "This reset link is invalid or expired. Enter your email and we will send you a new one.", then "Email", a primary "Send a new link" button, ok "If an account uses that address, we sent it a link. Check your inbox." and errors as PocketBase's field reasons or "The email could not be sent. Try again." (all kept).
- **Refused:** the field reasons, or "The password could not be set. Try again."

**4.8 Your Profile**, Onboarding, `/edit/profile` (P3 s17, s20). Shows "Step 3 of 5".
1. h1 "Your Profile". Lead: "What Visitors see at the top of your page. A photo in jpg, png, heic, gif or webp." (kept)
2. "Display name" (required). "Bio" (3-row textarea, helper "Optional. A line or two."). "Profile picture" (`e-file`).
3. Primary button "Continue".
4. Messages:
   - "Enter a display name."
   - "That image is over 20 MB."
   - "That file is not an image we can read (jpg, png, heic, gif or webp)."
   - "The image was refused ({status}). Try again."
   - "The save failed ({status}). Try again."

**4.9 Add your first Link**, `/edit/first-link` (P3 s18). Shows "Step 4 of 5". h1 "Add your first Link". Lead: "Where the card on your page leads." The Link form (4.12) sits inline, with no Cancel, and uses the same sticky foot (status line and "Save link") at 375. Saving goes to 4.10.

**4.10 Your page is live**, `/edit/live` (P3 s19). Shows "Step 5 of 5".
1. h1 "Your page is live". Lead: "Paste this address into your Instagram or TikTok bio."
2. The address, in a muted box: 20px, `word-break: break-all`, exact text `{origin}/{username}`.
3. A primary "Open" link (new tab, `rel=noopener`) and a secondary "Copy" button. Below them, a ghost "Go to the Editor" button.
4. Messages: ok "Copied." and error "Copy did not work here. Press and hold the address to copy it."

**4.11 Links tab**, `/edit/home` (P3 s22, s26–s28, s37–s39). Also the empty, loading and refused-move states.

```
375                                        1024
+-----------------------------------+      +-----------+------------------------------------------+
| ofl.ink                           |      | ofl.ink   | Your Links                               |
| Your Links                        |      |           | Visitors see them in this order. Tap one |
| Visitors see them in this order.  |      | > Links   |  to change it.                           |
| Tap one to change it.             |      |   Profile | +--------------------------------------+ |
| +-------------------------------+ |      |   Modes   | | Your Bio Link  https://ofl.ink/julia | |
| | Your Bio Link                 | |      |   Stats   | |                      [Copy]  [Open]  | |
| | https://ofl.ink/julia         | |      |           | +--------------------------------------+ |
| | [Copy]  [Open]                | |      |           | [ + Add link ]  (auto width, left)       |
| +-------------------------------+ |      |           | | ^ v | Exclusive content        | bin | |
| [ + Add link                    ] |      |           | | ^ v | My Instagram             | bin | |
| | ^ v | Exclusive content | bin | |      |           |                                          |
| | ^ v | My Instagram      | bin | |      +-----------+------------------------------------------+
|  ( Links  Profile  Modes  Stats ) |
+-----------------------------------+
```

1. h1 "Your Links". Lead: "Visitors see them in this order. Tap one to change it."
2. **Bio Link card** (`e-biolink`): the label "Your Bio Link" (kept) and the full address, exact text, cut off with an ellipsis if long. Then a secondary "Copy" button and a ghost "Open" link (new tab). Its status line shows "Copied." or "Copy did not work here. Press and hold the address to copy it."
3. **Add link:** a primary "+ Add link" button (accessible name "Add link"). It is full width at 375 and sits above the list, so it is visible without scrolling. It opens `/edit/add-link`. A new Link appears last (P3 s28).
4. **The list** (`ul`, `aria-label="Links"`) is in Visitor order. Each row is at least 56px tall. From left to right:
   - the reorder pair, placed where the Template has its drag handle: 44×44 icon buttons "Move {title} up" and "Move {title} down". The first row's up and the last row's down are disabled.
   - the title as a full-height text button that opens `/edit/link`
   - a 44×44 trash button, "Delete {title}", in the danger colour

   A row's text content is its title alone. Icons are CSS masks or `aria-hidden` elements, never text nodes.
5. **Empty state.** It shows only after the last Link is deleted here, because Onboarding catches a Creator with no Links. `e-empty` with title "No Links yet" and text "Add one so Visitors have something to tap."
6. **Loading:** three skeleton rows. **During a move or delete,** every row button is disabled.
7. **After a move,** focus returns to the moved Link's button for the same direction, or to its title if that button is now disabled.
8. The list's status line (kept), after which the list reloads from PocketBase:
   - "The move failed: {reason}. The list shows your page's order."
   - "The delete failed: {reason}."
   - "The list could not be read again: {reason}. Reload the page."
9. **Delete confirmation** (`e-dialog`, a `<dialog>` opened with `showModal()`, `role="alertdialog"`, `aria-labelledby` its title and `aria-describedby` its text). This replaces `window.confirm()` (P3 s38 requires only that delete asks first).
   - Title: "Delete “{title}”?" Text: "It goes from your page at once."
   - Buttons: danger "Delete link" and secondary "Keep it". "Keep it" has focus first.
   - Esc or "Keep it" closes the dialog and changes nothing.
   - The dialog is a centred card, `--e-dialog-max` wide, on `--e-color-scrim`, `--e-radius-xl`.

**4.12 Link editor**, `/edit/add-link` and `/edit/link`, with the same form inline in 4.9 (P3 s27–s36, s40).
- **At 375:** a full-screen "sheet screen". It replaces the tab's content, so only one `role="status"` is on the page. It slides up over `--e-dur-slow`. The sticky head holds the h1 "Add link" or "Edit link" and a ghost "Cancel" button. The body scrolls. The sticky foot (white, `--e-shadow-md`) holds the status line and a full-width primary "Save link" button. The nav is hidden.
- **From 768:** the same form in an `e-card` in the main column (up to 560px). The sidebar stays visible, and the foot is not sticky.

Fields, in order:
1. "Title". Helper: "What Visitors read on the card." Error: "Enter a title."
2. "Destination" (`inputmode=url`, placeholder "https://", no autocapitalise). Helper: "Where the Link leads. Starts with https://, http:// or /." For an opened Link it is filled with the current Destination (P3 s36).
3. "Icon" (native select). Options: "None", "OnlyFans", "Link", "Twitch", "Instagram". "Current icon" comes first when the stored icon is not a stock icon.
4. "Background image" (`e-file`). Helper: "Any photo: jpg, png, heic, gif or webp. Shown behind the title."
5. "Remove background" (`e-switch`). Shown only when the Link has a background. Helper: "Picking a new image replaces it instead."
6. "18+ Age Gate" (`e-switch`). Helper: "Visitors who tap it on your page confirm they are 18 or older first. Works with any Mode." (P3 s32; a Link Shortcut skips the Age Gate, as in v1, so the copy says "tap it on your page")
7. "Mode" (native select). Options: "Profile default (currently {Direct|Escape|Deeplink})", "Direct", "Escape", "Deeplink". A new Link starts on Profile default. Helper: "How a tap leaves Instagram or TikTok. Not sure? Keep Profile default."
8. Disclosure "Tracking and Geo Rule" (`e-more`, a native `<details>`). Its summary helper reads "Only for OnlyFans Links." It starts closed. It opens when tracking is on, when a Default Tracking Code or Geo Rule is stored, or when a message names one of these fields.
   1. "OnlyFans tracking" (`e-switch`). Helper: "Adds a Tracking Code to the address so OnlyFans credits each subscriber to its source."
   2. "Default Tracking Code" (`inputmode=numeric`). Helper: "Digits only. Used when no other code applies." Error: "Default Tracking Code: digits only, or leave it empty."
   3. "Geo Rule" (mono textarea, 4 rows, filled with the current rule pretty-printed). Helper: "Advanced: Tracking Codes per country as JSON, e.g. {"US": "5"}. Leave it empty for none." Error (kept): `Geo Rule: write a JSON object, such as {"US": "5"}, or leave it empty for no Geo Rule.`

**Refused save (P3 s35, s40).** The screen stays as it is with every field as typed. The message shows in the foot and is scrolled into view (`block: "nearest"`). Messages:
- "This Link was not saved: a Destination must start with https://, http:// or /." This replaces the "PocketBase refused the Link: …" wording.
- On an update, add: "If it does, the Link may have been deleted in another tab: press Cancel."
- "The Link is saved, but not its background: {reason}"
- "The icon could not be loaded. Try again."
- Any other refusal: PocketBase's field reasons, one per field (e.g. "Title: …"), as `fieldReasons()` gives them today, else "The save failed ({status}). Try again." (kept). The new Destination wording replaces only the two bare-refusal cases in `linkReason()`.

On success the Creator goes to `/edit/home`, or to 4.10 during Onboarding.

**4.13 Profile tab**, `/edit/me` (P3 s12, s23, s24, s45).
- **At 375:** one column.
- **From 768:** the same column. The avatar and its button sit side by side at every width.
1. h1 "Profile". Lead: "What Visitors see at the top of your page."
2. Avatar: a 96px circle, or a muted circle with a person icon when there is none. Beside it, the file input "Change Profile Picture" (kept label). Helper: "jpg, png, heic, gif or webp. It uploads when you press Save profile."
3. "Display name" (required). "Username": read-only, with a muted "@" prefix and the helper "Your page's address. It can't be changed." "Bio" (textarea).
4. Primary button "Save profile". Messages:
   - ok: "Profile saved."
   - errors: "Enter a display name.", the upload messages from 4.8, and the save refusal
5. **Account card:** "Signed in as {email}" and a secondary "Log out" button, which goes to the log-in screen (P3 s12).

There is no badge control, no Username change and no delete (P3 Out of Scope).

**4.14 Modes tab**, `/edit/modes` (P3 s25, s31, s32; CONTEXT Mode, Escape, Reveal).
1. h1 "Modes". Lead: "Instagram and TikTok open links in their own browser. Choose how a tap on your page gets out."
2. h2 "Quick Settings" (P3 s25). Under it, a fieldset with the legend "Default Mode" and three radio cards (`e-choice`). Each radio's accessible name is the Mode name alone. Its sentence is attached with `aria-describedby`:
   - **Direct:** "Opens the Link straight away, in whatever browser the Visitor is in."
   - **Escape:** "Tries to move Visitors out of the Instagram or TikTok browser into Safari or Chrome. If the phone won't switch by itself, your page shows how."
   - **Deeplink:** "Inside Instagram or TikTok, a tap goes straight to Safari or Chrome with no how-to screen. On Android it can open the Link's own app." (`app/public/script.js:332-347`)

   Below the cards: "Every Link left on “Profile default” follows this Mode. With Escape or Deeplink, your page also tries to move Visitors in Instagram or TikTok to their browser as soon as it loads, and Escape shows a how-to if that fails." (`script.js:95-104`) A stored empty Mode shows as Escape.
3. Primary button "Save default Mode". ok: "Default Mode saved." A refused save shows its reason.
4. h2 "Good to know", with three static `e-card`s:
   - **"Profile default":** "A new Link starts on Profile default and follows the Mode above. Pick a Mode on a Link to override it."
   - **"18+ Age Gate":** "Turn it on for a Link and Visitors who tap it on your page confirm they are 18 or older first. It works with every Mode."
   - **"Your Destinations stay hidden (Reveal)":** "Your page never contains the addresses your Links lead to. Each one is handed out only when a Visitor opens that Link, which keeps casual bots from collecting them."

**4.15 Stats tab**, `/edit/stats` (P4 s13–s22). This is a restyle only: the data, filters, roles, labels and text formats stay as they are.
1. h1 "Stats". Lead: "Page Views, Clicks and CTR for your page."
2. **Range:** a segmented control (`e-segmented`, `role="group"`, `aria-label="Range"`). It is a muted track, `--e-radius-md`, holding 44px-tall buttons "Today", "7D" and "30D" with `aria-pressed`. The pressed button is white with `--e-shadow-sm`. Next to it is the span text "{first} – {last} (UTC)", or "{day} (UTC)" for Today (kept).
3. **Filters:** "Link" (All Links, then each Link; P4 also lists "Deleted link", which `stats.js` lacks today, see OPEN in section 10) and "Country" (All countries, then each code seen, with `XX` as "Unknown"). They sit in two columns at every width.
4. **Empty:** an `e-empty` above the cards reading "No Page Views or Clicks in this range yet." (exact)
5. **Cards** (`e-stat`, three across at every width): "Page Views", "Clicks" and "CTR". Each `section` is named by its h3. The value is a `<p>` at 24px (30px from 768), weight 700, tabular. CTR shows "—" when there are no Page Views.
6. **Tables**, each an `e-card` holding an `e-table` named by its h2:
   - "Daily": Day | Page Views | Clicks. The bar is drawn at `width: calc(var(--e-bar-max) * var(--w))` and stays `aria-hidden`. The number stays as text.
   - "Links": Link | Clicks | CTR, including "Deleted link".
   - "Countries": Country | Page Views | Clicks | CTR, including "Unknown".
7. **Layout:** at 390px nothing scrolls sideways (`table-layout: fixed`, `overflow-wrap: anywhere`; P4 test 1). From 1024 the Links and Countries cards sit side by side.
8. **States:**
   - first load: skeleton
   - switching range: the pressed button gets `aria-busy` and shows a spinner; panels stay fully opaque, so text keeps its contrast
   - error: the retry screen (4.16)

**4.16 Retry**, on any screen. h1 "Try again", the reason, and a primary "Try again" button. Its fallback reason "PocketBase did not answer." becomes "The server did not answer. Check your connection, then try again."

## 5. Components

Class names are BEM-ish with the `e-` prefix. The landing's own layout uses `l-`. State lives on HTML and ARIA attributes (`disabled`, `aria-busy`, `aria-pressed`, `aria-current`, `aria-invalid`, `[open]`, `[hidden]`), never on extra state classes.

| Component | Classes | Spec |
|---|---|---|
| Shell | `e-body`, `e-topbar`, `e-topbar__brand`, `e-main` (`#screen`), `e-page`, `e-page__title` (h1), `e-page__lead`, `e-section`, `e-section__title` (h2), `e-steps`, `e-steps__track` | Section 3 |
| Button | `e-btn` plus one of `--primary` (filled primary, white text), `--secondary` (white, strong border), `--ghost` (no fill, primary text), `--danger` (filled danger); size modifiers `--block` (full width) and `--icon` (44×44, `aria-label` required) | Height `--e-control-h` (icon 44), pill radius, 14px/600. Hover darkens; press scales to .98 over `--e-dur-fast`. Disabled: 50% opacity. `a.e-btn` for links. |
| Text link | `e-link` | Primary colour, underline on hover, 44px-tall hit area when standalone |
| Field | `e-field`, `e-field__label` (14px/500), `e-field__hint` (14px, muted; tied to the input by `aria-describedby`), `e-input`, `e-select`, `e-textarea`, `e-textarea--code` (mono) | 48px controls (textareas min 96px), 16px text, 1px `--e-color-border-strong`, `--e-radius-md`. Focus ring as tokens. `aria-invalid` gives a danger border. |
| Prefix field | `e-prefix`, `e-prefix__text` | The muted "{host}/" or "@" inside the field's left edge, as in the Template's "Your Bio Link \| link.me/handle" pill |
| File | `e-file` (a native `input type=file` with `::file-selector-button` styled as a secondary pill) | Keeps the native file-name text. The label wraps the input. |
| Switch | `e-switch` (the row `label`), `e-switch__input` (`input type=checkbox role=switch`), `e-switch__text`, `e-switch__hint` | 44×24 track with a 20px thumb. Off: border-strong; on: primary. `--e-dur-base`. The whole row (≥ 56px) is the hit area, and the name is the label text alone. |
| Radio card | `e-choice`, `e-choice__input`, `e-choice__title`, `e-choice__text` | Bordered card with `--e-radius-lg`. Checked: 2px primary border and primary-soft fill. |
| Card | `e-card`, `e-card--muted` | Surface, 1px border, `--e-radius-lg`, `--e-shadow-sm` |
| List and row | `e-list`, `e-row`, `e-row__handle` (holds `e-row__move` ×2), `e-row__title`, `e-row__delete` | Section 4.11. Rows are cards at `--e-radius-md`, with 8px between rows. |
| Sheet screen | `e-sheet`, `e-sheet__head`, `e-sheet__body`, `e-sheet__foot` | Section 4.12. Slide-up uses `--e-ease-sheet`. |
| Dialog | `e-dialog` (`<dialog>`), `e-dialog__title`, `e-dialog__text`, `e-dialog__actions` | Section 4.11, item 9. `::backdrop` uses `--e-color-scrim`. |
| Disclosure | `e-more` (`<details>`), `e-more__summary` | 56px summary row with a chevron that turns over `--e-dur-base` |
| Message | `e-msg` plus `--error` (danger text), `--ok` (success text), `--info` (primary-soft box, no role) | `role="status"` on form messages. There is no toast: every message sits beside the control that caused it. |
| Empty state | `e-empty`, `e-empty__icon` (48px muted circle), `e-empty__title` (18px/600), `e-empty__text` | Dashed 1px border, `--e-radius-lg`, centred, 32px padding |
| Skeleton | `e-skeleton`, `e-skeleton__line`, `e-skeleton__row` | Muted blocks with a 1.2s shimmer, static under reduced motion. `index.html` ships one inside `#screen`, with `aria-busy="true"` on `main` and a visually hidden "Loading…". |
| Navigation | `e-nav`, `e-nav__item`, `e-nav__icon`, `e-nav__label`, `e-nav__brand` (sidebar only) | Section 3 |
| Bio Link | `e-biolink`, `e-biolink__label`, `e-biolink__address`, `e-biolink__actions` | Section 4.11 |
| Avatar | `e-avatar` (64px), `e-avatar--lg` (96px) | Circle, `object-fit: cover` |
| Stats | `e-segmented`, `e-segmented__btn`, `e-filters`, `e-stats`, `e-stat`, `e-stat__label`, `e-stat__value`, `e-table`, `e-bar`, `e-bar--views`, `e-bar--clicks` | Section 4.15 |
| Icon | `e-icon` plus `--plus`, `--up`, `--down`, `--trash`, `--copy`, `--open`, `--links`, `--profile`, `--modes`, `--stats`, `--check`, `--mail`, `--chevron`, `--person` | 20px (24 in the nav). Hand-written inline-SVG data URIs used as `mask-image` over `background: currentColor`. No icon font, no CDN, no files. Always `aria-hidden`. |
| Utility | `e-visually-hidden` | |

## 6. Landing page

**Where it lives.** `/landing.html` is `app/public/landing.html`. An unknown Username lands there (the Page Copy redirects when its Profile fetch fails), and it is the body of `/netlify/*` 404s. `/` on the primary host does not land there: the resolver returns Username `''` and `script.js:44-46` falls back to `juliafilippo_` (see section 10).
- It stays one static file. It loads `/edit/tokens.css` and `/edit/editor.css` and has an inline `<style>` for its `l-` layout.
- It uses no script, no video, no external link and no CDN icon font.
- Its `<title>` becomes "ofl.ink: one link for your bio".
- Its copy names no adult platform (see Assumptions).

**Sections, in order.**
0. **Header** (`l-header`): the "ofl.ink" wordmark on the left and a ghost "Log in" link (`/edit/login`) on the right. 56px tall.
1. **Hero** (`l-hero`):
   - h1 "One link for your bio". Lead: "Put all your Links on one page, help Visitors get out of the Instagram and TikTok browser, and see what they tap."
   - A primary "Create your page" button (`/edit/signup`) and a secondary "Log in" button.
   - A note (`l-note`, muted, 14px): "Followed a link here? That page may not exist. Check the address in the bio you came from."
   - The shot `editor-links-mobile.webp` in a phone frame (`l-shot`).
   - **Layout:** at 375 everything stacks and the h1 is 36px. From 1024 there are two columns, text left and shot right, and the h1 is 48px.
2. **How it works** (`l-steps`), h2 "Live in three steps":
   - **"Claim your Username":** "Your page lives at ofl.ink/yourname."
   - **"Add your Links":** "A title, where it leads, a picture. Reorder them any time from your phone."
   - **"Paste it in your bio":** "Copy your address into Instagram or TikTok. Every change shows the next time your page loads."
   - Numbered circles. A vertical list at 375, three columns from 768.
3. **Modes and Reveal** (`l-modes`), h2 "Taps that land where you want". Lead: "Instagram and TikTok open links in their own browser. You choose how your Links get out."
   - Five `e-card`s using the exact sentences of 4.14: Direct, Escape, Deeplink, "18+ Age Gate" and "Your Destinations stay hidden".
   - The shot `profile-mobile.webp`.
   - One column at 375, a 2×3 grid from 768.
4. **Stats preview** (`l-stats`), h2 "See what works":
   - Three lines with check icons: "Page Views, Clicks and CTR", "Per Link, per day and per country", "Today, 7 days or 30 days".
   - The shot `editor-stats-mobile.webp`.
5. **Pricing:** none. Neither spec states a price or says "free", so no price claim is made.
6. **Final call to action** (`l-cta`): h2 "Ready when you are" and the line "All you need is an email address." A primary "Create your page" button. From 768, `editor-desktop.webp` shows above it; below 768 it is hidden and lazy-loaded.
7. **Footer** (`l-footer`): "ofl.ink" · "Log in" · "Create your page". The current "Powered by n8n & Git & Netlify" line, the YouTube tutorial link and the lazy `example.webm` video go. `example.webm` is not in `app/public/`, and the tutorial and the "Powered by" line both describe v1's n8n tooling.

**Screenshot slots.** They go in `app/public/images/landing/`, as WebP at q80, each 200 KB or less.
- **Why WebP:** `server.js`'s `TYPES` maps `.webp` but not `.png`.
- **How to make them:** take each with Playwright, then convert it with the repo's own sharp: run from `app/`, where `sharp` is installed (`app/package.json`), not from the repo root: `cd app && node -e "require('sharp')(process.argv[1]).webp({quality:80}).toFile(process.argv[2])" in.png out.webp`.
- **What they show:** a demo Creator on the local stack. Never a real Creator, and never the Link editor, which shows Destinations.
- **Markup:** every `<img>` carries `width`, `height` and `alt`. Only the hero shot is eager; the rest are `loading="lazy"`.

| File | Shows | Capture | File px | Shown at |
|---|---|---|---|---|
| `editor-links-mobile.webp` | Links tab, 3–4 Links | 390×844 @2x | 780×1688 | 260px wide (375), 300px (≥1024) |
| `editor-stats-mobile.webp` | Stats tab, 7D with data | 390×844 @2x | 780×1688 | same |
| `profile-mobile.webp` | the demo Creator's public Profile | 390×844 @2x | 780×1688 | same |
| `editor-desktop.webp` | Links tab with sidebar | 1280×800 @1x | 1280×800 | up to 880px wide |

Alt texts:
- "The Editor's Links tab on a phone: the Bio Link with Copy, Add link and three Links."
- "The Stats tab on a phone: Page Views, Clicks and CTR for 7 days."
- "A Creator's page on a phone: photo, name and Link cards."
- "The Editor on a laptop: sidebar and the Links tab."

## 7. Stable test hooks

None exists yet: `grep -rn data-test app tests/e2e` finds 0, so every `data-test` value below is **new**. "Kept" names the id, class or role and name that tests use today. It stays on the same element, and the test-update agent may switch to the `data-test`.

| Screen | Hooks (`data-test` value: element; Kept) |
|---|---|
| Shell | `app-topbar`: header. `app-main`: main (Kept: `#screen`). `screen-skeleton`. `onboarding-step`. `creator-nav`: nav (Kept: navigation "Creator"). `nav-links`, `nav-profile`, `nav-modes`, `nav-stats` (Kept: link "Stats"). `retry-message`, `retry-button` (Kept: button "Try again"). |
| Sign up | `signup-form`. `signup-email`, `signup-password`, `signup-username` (Kept: labels Email, Password, Username). `signup-submit` (Kept: "Create account"). `signup-message` (Kept: role status). `signup-login-link`. |
| Log in | `login-form`. `login-email`, `login-password`. `login-submit` (Kept: "Log in"). `login-message` (Kept: status). `login-session-ended`. `login-forgot-link` (Kept: link "Forgot password?"). `login-signup-link` (Kept: link "Sign up"). |
| Forgot, and invalid link | `mail-form`. `mail-email`. `mail-submit` (Kept: "Send reset link", "Resend email", "Send a new link"). `mail-message`. `forgot-back-link`. `invalid-link`: the screen's card. |
| Reset | `reset-form`. `reset-password` (Kept: label "New password"). `reset-submit` (Kept: "Set password"). `reset-message`. `reset-login` (Kept: "Log in"). |
| Verify | `verify-email-address`: the strong tag with the email. `verify-continue`, `verify-resend` (Kept: "Continue", "Resend email"). `verify-message`. `verified-continue`. |
| Claim | `claim-form`. `claim-username`. `claim-submit` (Kept: "Claim"). `claim-message` (Kept: status). |
| Profile form (step 3 and the Profile tab) | `profile-form`. `profile-display-name`, `profile-bio` (Kept: labels). `profile-avatar-input` (Kept: labels "Profile picture" and "Change Profile Picture"). `profile-avatar-preview` (Kept: `img.avatar`). `profile-username` (Kept: textbox "Username"). `profile-submit` (Kept: "Continue", "Save profile"). `profile-message`. `account-email`. `logout` (Kept: "Log out"). |
| Live | `live-address`. `live-open` (Kept: link "Open"). `live-copy` (Kept: "Copy"). `live-message`. `live-to-editor` (Kept: "Go to the Editor"). |
| Links tab | `bio-link` (Kept: `.bio-link`). `bio-link-label` (Kept: `.label`). `bio-link-address` (Kept: `.value`). `bio-link-copy` (Kept: "Copy"). `bio-link-open`. `bio-link-message`. `add-link` (Kept: "Add link"). `links-list` (Kept: list "Links"). `link-row` (Kept: listitem). `link-row-title`, `link-row-up`, `link-row-down`, `link-row-delete` (Kept: "{title}", "Move {title} up/down", "Delete {title}"). `links-message`. `links-empty`. |
| Delete dialog | `delete-dialog`. `delete-confirm`: "Delete link". `delete-cancel`: "Keep it". |
| Link editor | `link-form`. `link-title`, `link-destination`, `link-icon`, `link-background`, `link-background-remove`, `link-adult`, `link-mode` (Kept: labels Title, Destination, Icon, Background image, Remove background, 18+ Age Gate, Mode). `link-more`: details. `link-tracking`, `link-tracking-code`, `link-geo` (Kept: labels OnlyFans tracking, Default Tracking Code, Geo Rule). `link-message` (Kept: status). `link-save` (Kept: "Save link"). `link-cancel` (Kept: "Cancel"). |
| Modes tab | `quick-settings` (Kept: heading "Quick Settings"). `default-mode`: fieldset. `default-mode-direct`, `default-mode-escape`, `default-mode-deeplink`: radios. `default-mode-save` (Kept: "Save default Mode"). `default-mode-message`. `modes-explainer`. |
| Stats tab | `stats-range`. `stats-range-today`, `stats-range-7d`, `stats-range-30d` (Kept: buttons with `aria-pressed`). `stats-range-span`. `stats-filter-link`, `stats-filter-country` (Kept: comboboxes Link, Country). `stats-empty`. `stats-card-views`, `stats-card-clicks`, `stats-card-ctr` (Kept: regions). `stats-table-daily`, `stats-table-links`, `stats-table-countries` (Kept: tables). |
| Landing | `landing-header`. `landing-login`. `landing-hero`. `landing-cta-hero`. `landing-note`. `landing-steps`. `landing-modes`. `landing-stats`. `landing-cta-final`. `landing-footer`. `landing-shot-links`, `landing-shot-stats`, `landing-shot-profile`, `landing-shot-desktop`. |

**Hooks renamed or changed (old → new).** The test-update agent needs these:
- **Headings and the editor's landing screen:**
  - heading "Edit Profile" (helper `EDITOR`) → "Your Links"
  - the Editor's Profile fields (`Display name`, `Bio`, `Change Profile Picture`, read-only `Username`, `Save profile`, `Log out`) move from `/edit/home` to `/edit/me`
  - heading "Quick Settings", `Default Mode` and `Save default Mode` move to `/edit/modes`
  - nav link "Editor" → "Links"
- **Controls:**
  - "Default Mode" `<select>` → radio group (legend "Default Mode", radios "Direct", "Escape", "Deeplink")
  - delete `window.confirm()` → in-page alertdialog: assert the text contains the title, then press "Keep it" or "Delete link"
  - OnlyFans tracking, Default Tracking Code and Geo Rule sit inside the closed "Tracking and Geo Rule" disclosure on a Link with none of them set, so open `link-more` first
- **Copy:**
  - "PocketBase refused the Link: …" → "This Link was not saved: …". The tested substrings "Destination" and "https://, http:// or /" stay.
  - landing link "Create Your Own Page" → "Create your page" (`landing-cta-hero`)
  - "Powered by n8n & Git & Netlify" is removed. Suggested replacement assertion: no text on the page contains "n8n".
- **Removed outright:** `#title` (used by `editor.js` only).
- **Kept as unstyled alias classes:** `.bio-link`, `.label`, `.value` and `img.avatar`.

## 8. Checklists

**Accessibility**
- [ ] Landmarks: one `main`, `nav aria-label="Creator"`, header. One h1 per screen, and h2s in order.
- [ ] Every input has a visible `label`. Helpers use `aria-describedby`. A switch's and a radio's accessible name is its label text alone.
- [ ] `:focus-visible` ring on every control (tokens). Focus moves to the h1 on screen change. The dialog traps focus and starts on "Keep it".
- [ ] Contrast: text at least 4.5:1, UI boundaries and the focus ring at least 3:1 (values in section 2). Colour is never the only signal: errors are also text.
- [ ] Messages are `role="status"` text. Stats keeps its labelled regions and tables. Bars and icons are `aria-hidden`.
- [ ] Every tap target is at least 44×44. Neighbouring targets may touch but never overlap.
- [ ] `prefers-reduced-motion`: durations become 0 and the shimmer stops.
- [ ] Zoom to 200% and a 320px width without loss. Nothing depends on hover.

**Mobile**
- [ ] Designed and checked at 375×812 first, then 390×844 (tests), 768 and 1024.
- [ ] No horizontal scroll at 390 on any screen (`scrollWidth ≤ clientWidth`).
- [ ] Inputs are 16px. Each input has the right `type`, `inputmode` and `autocomplete`. Usernames and Destinations have `autocapitalize=none` and `spellcheck=false`.
- [ ] Safe-area padding under the nav pill and the sheet foot. `viewport-fit=cover` is set.
- [ ] The primary action is above the fold on every screen, or in the sticky foot (Link editor, first-Link step). The sticky Save stays clear of the iOS keyboard (sticky, not fixed).
- [ ] File inputs `accept` jpg, png, heic, heif, gif and webp, so the camera roll and HEIC work.

## 9. Out of scope (YAGNI)

- A dark theme or theme switch.
- Drag-and-drop reorder. P3 chose up and down buttons.
- An in-Editor live preview (P3 Out of Scope). "Open" shows the real page.
- Per-Link show or hide switches, and Mode or 18+ badges or thumbnails on rows. They would need more fields read and would change the row text.
- Toasts and undo.
- QR codes, share sheets, search and notifications. These are Template extras.
- Any change to the public Profile page's look. It must match v1 until Cutover, and `style.css` and `index.html` stay untouched.
- Username, email or password changes, account deletion and a badge control inside the Editor (P3).
- Stats extras: charts, comparisons, "Live", custom ranges and CSV (P4 Out of Scope).
- A Geo Rule builder (P3: raw JSON).
- Pricing and Pro upsells, a landing video or tutorial, analytics on the landing page, and i18n.
- New server routes or MIME types. Screenshots are WebP for this reason.

## 10. Assumptions and open points

ASSUMPTION: four tabs (Links, Profile, Modes, Stats) replace the Template's single scrolling "Edit Profile" screen. The run's task asks for exactly these screens and a tab bar. P3's "the layout copies the Template … nothing more" (P3 Implementation Decisions) is read as cutting Template sections and guiding the look, while every field, message and behaviour stays. The Operator should confirm this before the build, because it drives most of the hook moves in section 7. If wrong, the tabs fall: the same sections stack on `/edit/home` in the order Bio Link, Links, Profile, Quick Settings, and the nav becomes "Editor | Stats".
ASSUMPTION: the new screen paths are `/edit/me` and `/edit/modes` (rung 6, like the other screen paths). If wrong, only `route()` and the nav's `href`s change.
ASSUMPTION: a light theme only, from the Template's light palette. If wrong, `tokens.css` alone changes: there are no colour literals in `editor.css`.
ASSUMPTION: an in-page delete dialog replaces `window.confirm()`. P3 s38 asks only that delete confirms first. `confirm()` is `editor.js`'s own ASSUMPTION, which it says is overturned "if the Operator wants the Template's look for it". If wrong, `confirm()` stays and `delete-*` hooks and the dialog component go.
ASSUMPTION: OnlyFans tracking, Default Tracking Code and Geo Rule sit in a disclosure that starts closed on a Link with none of them set. If wrong, the `<details>` wrapper goes and the fields show inline.
ASSUMPTION: "Open" is added beside the Bio Link's Copy. Copy is the binding part (P3 s22), and Open reuses the live screen's link. If wrong, the `bio-link-open` hook goes.
ASSUMPTION: Log out sits only on the Profile tab, not on Onboarding screens, as `editor.js`'s own assumption says. If wrong, Log out also goes in the top bar.
ASSUMPTION: `<dialog>` and `::file-selector-button` are acceptable (iOS Safari 15.4+, current Chrome). If wrong, delete falls back to `confirm()` and file inputs keep their native look.
ASSUMPTION: the landing's copy names no adult platform, to lower the risk of ofl.ink being Flagged. If wrong, only the hero lead changes.
ASSUMPTION: the landing loads `/edit/tokens.css` and `/edit/editor.css` and does not inline its own copy. `/edit/*` is not tied to a host (`app/server.js:231-232`; the Caddyfile has no `/edit` rule), so this also works on Spare and Custom Domains. If wrong, because it must be self-contained, the tokens are pasted into its inline `<style>`.
ASSUMPTION: the landing also serves unknown Usernames, so it carries the "Followed a link here?" note. If wrong because a separate not-found page is added, the note moves there.
ASSUMPTION: screenshots are WebP made with the repo's existing `sharp`. If wrong because PNG is required, `app/server.js` `TYPES` needs `'.png': 'image/png'`, a server change for the coordinator.
OPEN: P4's Link filter lists "Deleted link" as an option, but `stats.js` offers only "All Links" and each Link. This is a gap in behaviour, not style, so this run leaves it for the coordinator to decide.
OPEN: a missing screenshot path falls through to the catch-all, which answers the Profile page as HTML with a 200, so each `<img>` breaks until its file exists. The landing and the screenshots must land together.
OPEN: `/` on the primary host shows `juliafilippo_` (Page Copy default, `script.js:44-46`), not the landing page, whenever that Profile exists, which it does after the v1 Import. Making `/` the landing means removing that default, a Page Copy behaviour change outside this brief. The Operator decides.

## 11. Coordinator rulings (2026-10-05; these override anything above that disagrees)

After the codex, six-hats and devil's-advocate reviews, the run coordinator ruled:

1. **One Editor screen, no new routes.** `/edit/me` and `/edit/modes` are dropped. `/edit/home` keeps everything P3 names on the "Edit Profile" screen, now laid out as stacked cards in this order: Bio Link card, Links card (list + "Add link"), Profile card (Display name, Bio, Profile picture, read-only Username, "Save profile"), Quick Settings card (Default Mode + "Save default Mode"), then "Log out". A row of in-page jump chips (Links · Profile · Modes) under the top bar scrolls to each card; they are plain anchor links, not routes. The Creator nav keeps exactly two entries: "Editor" and "Stats" (nav aria-label "Creator" as today). The onboarding guard, hand-over flow, heading "Edit Profile" and every existing path are unchanged. The "Good to know" cards are cut.
2. **Default Mode stays a native `<select>`** labelled "Default Mode" with options Direct/Escape/Deeplink. Under it, one short helper line explains the currently selected Mode (text swaps on change; `aria-live="polite"`). "Save default Mode" sits directly beneath. Nothing is saved until Save is tapped, and the helper never implies it was.
3. **Delete uses an in-page `<dialog role="alertdialog">`** titled "Delete this link?" with buttons "Delete link" and "Keep it"; `window.confirm` goes. Test 03's delete steps are updated in lockstep.
4. **The Link editor stays its own screen** ("Add link" / "Edit link"), as today. The document scrolls (no inner scroll container); `min-height: 100dvh`; the primary "Save link" button is at the end of the form inside a sticky bottom bar on phones (`position: sticky`, with `scroll-padding-bottom`), and Cancel beside it. Exactly one `role="status"` on the screen.
5. **The landing loads only `/edit/tokens.css`** and carries its own styles inline with the `l-` prefix. It does not load `/edit/editor.css` or `/style.css`.
6. **Copy fixes.** Nowhere "ofl.ink/yourname"; say "your own address". Drop "Every change shows the next time your page loads". The landing's "Followed a link here? That page doesn't exist" note stays near the top, because unknown Usernames land here. No adult platform named on the landing.
7. **Bio Link address wraps** (`overflow-wrap: anywhere`), never an ellipsis; shown whole, once.
8. **Stat cards:** values 20px/600 and 12px padding below 768px; `grid-template-columns: repeat(3, minmax(0, 1fr))`; below 360px the three cards stack 1 + 2. No horizontal scroll at 320px.
9. **`data-test` hooks only where needed:** where a test uses a class today (`bio-link`, `bio-link-label`, `bio-link-value`, `avatar-preview`, `live-address`), on the delete dialog (`delete-dialog`, `delete-confirm`, `delete-cancel`), on the Mode helper (`default-mode-help`), on the jump chips (`jump-links`, `jump-profile`, `jump-modes`) and on the landing sections and screenshot slots. Everything else is selected by role, name and label as today.
10. **Tokens for every colour**, including the white top bar, the sticky bar and the pressed segmented button. Prefix `-webkit-` for `backdrop-filter` and `mask-image`, or avoid them.
11. **Screenshots are taken from `app/`** (sharp lives in app/node_modules), by the screenshot task that owns bringing the stack up; the Bio Link address and live address are rewritten in the DOM to `https://ofl.ink/…` before the shot so no localhost origin ends up in marketing images.
12. **`/` is unchanged this run.** It still shows the default Profile; the landing lives at /landing.html and is reached from unknown Usernames and the sign-up link. Serving the landing at `/` needs an app/server.js change, which is parked for the Operator (RUN.md).
13. **Modes copy** must be re-checked against app/public/script.js once another run's uncommitted Escape/Deeplink pop-out work lands; until then describe Modes at the level of P1 (Direct opens the Destination; Escape leaves the in-app browser first; Deeplink opens the app when installed).
