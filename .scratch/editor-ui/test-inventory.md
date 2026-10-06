# Test inventory: Editor (/edit), Stats (/edit/stats), landing page, Profile page

Snapshot: working tree of 2026-10-05, HEAD 43472da. Another run had **uncommitted edits** in app/public/script.js (Escape pop-out), tests/e2e/01-link-modes-and-escape.spec.ts, tests/e2e/05-domains.spec.ts and tests/e2e/helpers.ts (+3 lines at 473-475) while this was written. Line numbers here are the working tree's at write time. Hook strings and ids did not change in those edits; only line numbers may drift.

No suite or stack was run to build this; it is grep and read only. Abbreviations: E = app/editor/editor.js, S = app/editor/stats.js, X = app/editor/index.html, C = app/editor/editor.css, P = app/public/index.html, PJ = app/public/script.js, L = app/public/landing.html, SV = app/server.js, H = tests/e2e/helpers.ts. Contracts: **UI** = a selector or text that must survive unchanged or be updated in lockstep with the test (CONSTRAINTS rule 9: update, never weaken). **B** = spec'd behaviour that must not be weakened.

## 0. Rules an implementer must not break (the findings that matter)

1. **The Editor tests use no ids and no `data-*`.** There are 0 `data-` occurrences in tests/e2e. Every Editor and Stats hook is a role plus accessible name, a label text, a heading text, or exact message text. The only class hooks on the Editor are `.bio-link` / `.label` / `.value` (03:396-398) and `img.avatar` (03:449). Keeping hooks therefore means keeping **label texts, button/link names, h1 texts and message texts**, and keeping labels associated with their controls (today a wrapping `<label>`).
2. **Headings must be unique by name.** `heading(page, name)` = `getByRole('heading', { name, exact: true })` (H:168), used 59 times. `render()` (E:146-150) copies each screen's h1 text into the top bar `#title` (X:13), which is a `<div>`. If the top bar becomes a heading, every `heading()` call matches 2 elements and fails, including inside `logIn`.
3. **One `role=status` per screen (except home).** `getByRole('status')` is used unscoped on these screens: log-in, claim, verify, forgot, Profile step, live and the Link form (03:57,256,284,697,740,741,922,949,961,977). Each has exactly one `p.message[role=status]` (E:152-154). A global toast or live region would break those tests. Home has four status nodes; tests use `getByText` there.
4. **Partial-name matches (strict mode).** These lookups match on part of the name:
   - `getByLabel('Mode')` (link form; 'Default Mode' lives on home only);
   - `getByLabel('Bio')`, `getByLabel('Email')`, `getByLabel('Password')`, `getByLabel('Username')`;
   - `getByRole('button', { name: 'Continue' })`, `getByRole('button', { name: 'Log in' })`, `getByRole('button', { name: 'Copy' })`, `getByRole('link', { name: 'Open' })`.

   Adding a second control on the same screen whose name contains one of these strings causes a strict-mode failure.
5. **Featured Links rows.** `featured()` = `getByRole('list', { name: 'Links' }).getByRole('listitem')` (H:341), and the tests compare each row's **full text** with the Link title (`toHaveText([...titles])`, 10 assertions in 03 plus H:357). So:
   - the row title is a `<button>` named exactly the title, which opens the Link (E:877);
   - Up/Down/Delete are icon-only buttons named `Move {title} up`, `Move {title} down` and `Delete {title}` (E:878-880, glyphs drawn by C:158-161);
   - nothing else may render text inside the `li`;
   - reorder is by those buttons only: no drag and no keyboard reorder is tested.
6. **Delete uses the browser's `confirm()`** (E:868). 03:571-583 handles it with `page.once('dialog')`, dismisses then accepts, and checks that the message contains the title. An in-page dialog requires updating 03:571-583 in lockstep.
7. **Refused save keeps typed text (B).**
   - Geo Rule: 03:676-720 checks the Editor's own message (E:685) and that the textarea keeps the typed value.
   - `javascript:` Destination: 03:722-767 needs the message to contain 'Destination' and 'https://, http:// or /' (E:642-643). Every field must keep its typed value, and 'Save link' must be enabled again.
   - Profile step: 'Enter a display name.' (E:583).
   - No autosave: an unsaved edit is gone after a reload (03:416-420), and picking a picture uploads nothing until 'Save profile' (03:436-441).
   - The claim field must not get `maxlength`, `pattern` or native validation: 31 characters and `bad.name` must reach the server (03:64-74).
8. **No badge on Editor home (B).** `getByRole('main')` must not contain `/badge|verified/i` (03:407). No control in `main` may have a name, id, aria-label or text matching `/badge|verif/i` (03:408-411). The Username field stays read-only and named exactly 'Username' (03:404-406).
9. **Every Editor and Stats test runs at 390x844** (03:24 `test.use({ viewport: PHONE })`; `phoneContext` H:197-212). No test covers the Editor at 768 or 1024+. This is "phone-sized desktop Chrome", not mobile emulation: no touch, no `isMobile`. Stats test 1 asserts no horizontal overflow at 390x844 (04:254).
10. **Stats is read by role (UI+B).** Required structure:
    - h1 'Stats';
    - regions 'Page Views' / 'Clicks' / 'CTR', each holding exactly one paragraph with a bare number (or CTR `n.n%` / `—`);
    - tables 'Daily' / 'Links' / 'Countries' with columnheader, row and rowheader-then-cells;
    - buttons 'Today' / '7D' / '30D' with `aria-pressed`;
    - native selects labelled 'Link' and 'Country', with options 'All Links' / 'All countries' / 'Unknown';
    - texts 'Deleted link', 'No Page Views or Clicks in this range yet.', and the date span `YYYY-MM-DD – YYYY-MM-DD (UTC)` with an en dash.

    Numbers are parsed with `Number()`, so they must have no thousands separators and no text inside the bar spans.
11. **Landing page (UI+B).** 03:109-117 needs:
    - a link named `/Create Your Own Page/` that opens the sign-up screen (L:40-43, href `/edit/signup`);
    - the visible text 'Powered by n8n & Git & Netlify' (L:44): keep it or update 03:113 in lockstep;
    - no `<a href>` containing 'n8n'.

    Other constraints:
    - landing.html must stay at `/landing.html` (5 `toHaveURL` checks; 02-image-upload:121 uses it as a blank same-origin page to decode images, so no CSP that blocks images or canvas).
    - Its body must contain a lowercase `<html` (00-smoke:94; served as the 404 body for `/netlify/*`, SV:252).
    - It loads **/style.css, the Profile page's stylesheet** (L:8). The landing redesign must not edit style.css; put landing styles inline or in a new dotted file.
12. **`/` is not the landing page today.** On a primary host, `/` serves the Profile page. script.js falls back to Username `juliafilippo_` (PJ:44-46) and lands on `/landing.html` only when that Profile is missing (PJ:108). On a Custom Domain, `/` is that Profile (05:105-129). Serving landing.html at `/` would need a server change in SV:262-269 and is out of scope unless the task says so.
13. **New files.**
    - SV:27-32 serves only `.html` `.js` `.css` `.webp` with a real Content-Type. Anything else (svg, png, ico, woff) goes out as `application/octet-stream`. Prefer inline SVG.
    - A new top-level entry in app/public **without a dot** in its name becomes a reserved Username (app/bin/reserved-usernames:25). 03:120-137 then needs a PocketBase migration clause.
    - A file in app/editor named like an Editor route (`home`, `login`, `stats`…) would shadow that route (SV:230-232 serve the file before index.html).
14. **The localStorage key `ofl.token`** (E:32) is read and written by tests 03:308 and 03:901. Keep it.

15. **The Profile page's CDN links are load-bearing for a test.** 01:299-310 asserts `offHost.length > 1`, which passes only because P:9 (cdnjs font-awesome) and P:21 (wikimedia badge) load. The Profile page is not redesigned: leave both. landing.html has no CDN link; its only external URL is the YouTube anchor at L:49.
16. **Exact navigation lists on the Profile page.** 01 asserts the full list of navigations. Any extra replaceState or navigation would break it, which is another reason to keep script.js unchanged.

## 1. Summary table: hook → tests → defined at → recommended stable hook

"App deps" = what in app code (not tests) relies on the hook. Recommendation follows CONSTRAINTS rule 9 (role+name or label first; `data-test` only where a test uses a class).

| # | Hook (as tests use it) | Used by (file:line) | Defined at | Recommended stable hook | App deps |
|---|---|---|---|---|---|
| 1 | `heading(page, X)` exact h1: Log in, Create your page, Claim your Username, Verify your email, Email verified, Your Profile, Add your first Link, Add link, Edit link, Your page is live, Edit Profile, Link invalid or expired, Set a new password, Password changed, Stats | H:168,180,215,354; H:336 (reach 'Add your first Link'); 03 (59 uses); 04:113,132,142 | E:327,367,394,431,473,617,738,763,810,463,503,493; S:146 | keep role=heading + exact text, one per screen | E:146-150 render() also writes X:13 `#title` and document.title |
| 2 | `getByLabel('Email')`, `getByLabel('Password')` | H:172,173,181,182,190; 03:908,909 | E:322,323 (log-in), 362,363 (sign-up), 456 (mailForm) | keep label text | none |
| 3 | `getByLabel('Username')`; `getByRole('textbox', { name: 'Username', exact: true })` | H:174; 03:44,63,116,404 | E:183 addressField (sign-up/claim); E:601-605 home, read-only, `@` aria-hidden | keep label; home name exactly 'Username' | E:162-180 lowercases input |
| 4 | `getByLabel('New password')` | 03:966 | E:500 | keep | none |
| 5 | `getByLabel('Display name')` / `'Bio'` (+exact) / `'Profile picture'` / `'Change Profile Picture'` | H:356; 03:258,259,260,414,415,437,902,913,929 | E:598,599,609 (step), 603 (home) | keep labels | none |
| 6 | Link form `getByLabel`: Title, Destination, Icon, Background image, Remove background, 18+ Age Gate, Mode, OnlyFans tracking, Default Tracking Code, Geo Rule | 03:266-749 | E:726,727,728,729,667,668,732,671,734,735 | keep labels; 'Mode' stays the only label containing "Mode" on that screen | none |
| 7 | `getByLabel('Default Mode')` + `.locator('option')` = Direct/Escape/Deeplink | 03:474-490 | E:796,804; MODE_NAMES E:516 | keep native select + texts | MODE_NAMES feeds E:669-670 |
| 8 | `.locator('option:checked')` texts: 'Profile default (currently X)', 'Current icon', None/OnlyFans/Link/Twitch/Instagram, Direct/Deeplink | 03:268-746 | E:670, 664, 522-528, 516 | keep native `<select>` and option texts | ICONS file names fetched from /images/ (E:704) |
| 9 | Buttons: Create account, Log in, Claim, Continue, Resend email, Send reset link, Send a new link, Set password, Save profile, Save default Mode, Save link, Add link, Cancel, Copy, Go to the Editor, Log out | H:175,183,191,216,217; 03 | E:366, 325/494, 393, 430/474/618, 419, 509, 496, 502, 794, 807, 737, 826, 740, 757, 770, 827 | keep role=button + name | none |
| 10 | Row buttons: `{title}` (exact), `Move {title} up/down`, `Delete {title}` + `confirm()` | 03:527-621, 643-756, 562-564, 577-583, 596 | E:877-880; confirm E:868 | keep names (aria-label for icon buttons); keep confirm() or update 03:571-583 | C:153-161 |
| 11 | `featured()` = list 'Links' > listitem, row text = title only | H:341,357; 03:290,524-598,880 | E:848 `ul.links[aria-label=Links]`, E:876 `li.link-row` | keep `aria-label="Links"` list; no extra text in rows | none |
| 12 | `getByRole('status')` (unscoped) | 03:57,256,284,697,740,741,922,949,961,977 | E:152-154 message(); text via say() E:156 | exactly one role=status on those screens | say() sets class `message ok/error` (C:127-129) |
| 13 | Message texts (B): Profile saved., Default Mode saved., Copied., Your email is not verified yet., Your session has ended. Log in to carry on., /^The move failed: /, Enter a display name., Wrong email or password., inbox text, resend text, Geo Rule text, Destination refusal, claim reasons | 03 (see section 10) | E:794,801,752,427,326,861,583,317,438,405,685,642-643,205-221 | keep text | none |
| 14 | Links: 'Sign up', 'Forgot password?', 'Open' (href = address) | H:189; 03:103,282 | E:329,328,768 | keep role=link + name | link() E:236-245 pushState |
| 15 | `getByRole('navigation', { name: 'Creator' })` > `getByRole('link', { name: 'Stats' })` | 04:112 | E:289-296 creatorNav | keep nav aria-label + link name | S:145 calls creatorNav |
| 16 | `getByRole('heading', { name: 'Quick Settings' })` | 03:473 | E:815 h2 | keep | none |
| 17 | `.locator('.bio-link')` > `.label` 'Your Bio Link' / `.value`; `getByText(${origin}/${username}, exact)` | 03:396-398; H:355 | E:811 | add `data-test="bio-link"` / `"bio-link-label"` / `"bio-link-value"` and update 03:396-398 in lockstep (or keep classes); address shown whole, once | C:134-145 |
| 18 | `getByText(address, { exact: true })` (live screen) | 03:281 | E:765 `p.live-address` | keep exact text; optional `data-test="live-address"` | C:149 |
| 19 | `.locator('img.avatar')` src = /api/files/... | 03:449 | E:573 | add `data-test="avatar-preview"` (update 03:449) or keep class; exactly one on home | C:166 |
| 20 | `getByRole('main')`, `.locator('main')` | 03:31,407,408 | X:15 `main.screen#screen` | keep one `<main>` holding the screen | E:33 getElementById('screen'), E:149 |
| 21 | `#title` (no test) | none | X:13 `div.topbar-title#title` | keep id; never a heading with the h1's text | E:34, E:147 |
| 22 | localStorage `ofl.token` | 03:308,901 | E:32 | keep key | E:42,67,81,86 |
| 23 | Stats `getByRole('button', { name, exact: true })` Today/7D/30D + `aria-pressed` | 04:397,398 | S:40,148-150 | keep buttons + aria-pressed; flip only after rows arrive | C:177-178 |
| 24 | Stats date span `getByText(...(UTC), exact)` | 04:401,411,425 | S:151 | keep text (en dash) | none |
| 25 | Stats `getByRole('combobox', { name: 'Link'/'Country', exact: true })`, `getByRole('option')`; 'All countries', 'Unknown' | 04:166,167,384,385 | S:77-83,153-154 | keep native select + label text | none |
| 26 | Stats `getByRole('region', { name, exact: true })` > `getByRole('paragraph')` | 04:143,156 | S:65-68,156 | keep section aria-labelledby + h3 + one `<p>` with a bare number | C:182-185 |
| 27 | Stats `getByRole('table', { name, exact: true })` > columnheader/row/rowheader/cell; 'Deleted link', 'Unknown' | 04:145-150,381,655 | S:86-95,125,157-159,83 | keep `<table aria-labelledby>`, th scope=col/row | C:186-193 |
| 28 | Stats empty `getByText('No Page Views or Clicks in this range yet.', { exact: true })`; `.locator('body')` text | 04:426,575 | S:155 | keep | none |
| 29 | Landing `getByRole('link', { name: /Create Your Own Page/ })`, `getByText('Powered by n8n & Git & Netlify')`, `.locator('a')` (no n8n href) | 03:111,113,114 | L:40-44 | keep link name + href /edit/signup; subtitle kept or updated with 03:113 | L loads /style.css (Profile's); SV:252 serves L as 404 body |
| 30 | URL `/landing.html` | 02-live-edit:181; 02-profile-parity:321; 02-v1-import:725; 03:849; 05:127; 02-image-upload:121 (goto) | PJ:36,108 redirect | keep path | SV:252; SV:262-264 static |
| 31 | **Profile page (NOT redesigned, keep)**: `#displayName` `#bio` `#avatar` `#verifiedBadge` | 00,01,02-*,03,05 (section 5) | P:20,24,17,22 | keep ids unchanged | PJ:3-6,115-129 |
| 32 | **Profile (keep)**: `.link-card`, `.link-card .link-title`, `.link-title`, `.lock-icon-small`, `.link-icon` | 00,01,02-*,03,04,05,H | PJ:137,145,151,178 | keep classes unchanged | style.css; PJ:136-195 |
| 33 | **Profile (keep)**: `#overlay`, heading 'Mature Content Disclaimer', `#continueBtn` 'Continue (18+)', `#closeOverlayBtn` | 00,01,02-profile-parity,04,05,H | P:39,44,46,47 | keep unchanged | PJ:9-11,355-411 |
| 34 | **Profile (keep)**: `#igOverlay`, 'Open in System Browser', link 'Open in browser', link 'Try another way', `getByText(target)`, 'Copy link', 'Close', 'Open in External Browser' | 00,01,03,04,05,H:514 | P:51,58,59,60,66,67,68,63 | keep unchanged | PJ:12-17,329-353 |
| 35 | `#profile-bootstrap` (`<script type="application/json">`) | 05:224; domains-helpers.ts:7 | SV:260,266, inserted before P:72 `<script src="/script.js"></script>` | keep id, anchor tag and the `\n` + 4 spaces after the block | SV:262-268 writes it; PJ:34 reads it |

## 2. Pinned URL routes and /landing.html landings

Editor routing is by **path** (history.pushState/replaceState, E:226-233), never by hash. route() is at E:276-287 and onboarded() at E:257-269.

| URL asserted / visited | Where | Set by |
|---|---|---|
| `/edit` (goto) → log-in when no session | 03:38,100,304,868; H:179 | E:283 `show('/edit/login')` |
| `toHaveURL(/\/edit\/login$/)` | 03:101,874 | E:283,835 |
| `toHaveURL(/\/edit\/login\?next=%2Fedit%2Fhome$/)` | 03:906 | E:110-115 expired() |
| `toHaveURL(/\/edit\/signup$/)`; goto `/edit/signup` | 03:105,43; H:171 | E:278, link E:329 |
| `toHaveURL(/\/edit\/claim$/)` | 03:56, 03:886 (stages) | E:261,358 |
| `toHaveURL(/\/edit\/verify-email$/)` | H:218; 03:886 | E:262,359 |
| `toHaveURL(/\/edit\/profile$/)` | 03:254, 03:886 | E:263 |
| `toHaveURL(/\/edit\/first-link$/)` | 03:265, 03:886 | E:266 |
| `toHaveURL(/\/edit\/home$/)`; goto `/edit/home` | 03:393,912,876 | E:252 |
| goto mailed `/edit/verify?token=...`, `/edit/verify?token=not-a-token` | 03:248,940,951 | E:280 drawVerified |
| goto mailed `/edit/reset?token=...` | 03:964 | E:281 drawReset |
| goto `/edit/login` | H:188 | E:279 |
| `/edit/stats` (reached by nav click, then `page.reload()`) | 04:112, 04:217,250 | E:284, S:56 |
| other Editor paths not asserted: `/edit/forgot`, `/edit/add-link`, `/edit/link`, `/edit/live` | none | E:282,823,890,722 |
| `toHaveURL(.../landing.html)` | 02-live-edit:181; 02-profile-parity:321; 02-v1-import:725; 03:849; 05:127 | PJ:36,108 |
| goto `/landing.html` | 03:110; 02-image-upload:121 | static file, SV:262-264 |
| GET `/` (status 200 + Caddy Via only) | 02-v1-import:423 | SV:262-269 (Profile page, see rule 12) |
| GET `/netlify/functions/secrets.json` body == landing.html bytes, 404 | 02-profile-parity:298-301; 00-smoke:91-96 (`<html`) | SV:252 |
| GET `/landing.html`, `/style.css`, `/script.js` byte-identical to app/public files | 02-profile-parity:304-309 | SV:262-264 (compares with the file on disk, so edits are fine) |
| GET `/no/such/path` etc. == index.html minus bootstrap | 02-profile-parity:327-331 | SV:262-269 |

## 3. Editor screens: what each screen must expose (from E, current)

| Screen (route) | h1 | Labels | Buttons / links | role=status | Tests |
|---|---|---|---|---|---|
| Log in (`/edit/login`) | Log in (E:327) | Email, Password | button Log in; links Forgot password?, Sign up | 1 (E:309) | H:178-184; 03:99-106,862-914,957-980 |
| Sign up (`/edit/signup`) | Create your page (E:367) | Email, Password, Username (+ host prefix span) | button Create account; link Log in | 1 | H:170-176; 03:27-97,109-117 |
| Claim (`/edit/claim`) | Claim your Username (E:394) | Username | button Claim | 1 | 03:52-80,916-937 |
| Verify (`/edit/verify-email`) | Verify your email (E:431) | none (main contains the email, E:432) | Continue, Resend email | 1 | H:214-219; 03:27-40,939-955 |
| Email verified (`/edit/verify`) | Email verified (E:473) / Link invalid or expired (E:463) | Email (invalid case) | Continue / Resend email | 1 | 03:248-249,939-955 |
| Profile step (`/edit/profile`) | Your Profile (E:617) | Display name, Bio, Profile picture | Continue | 1 | 03:250-262,954 |
| First Link (`/edit/first-link`) | Add your first Link (E:738) | Link form labels (row 6) | Save link (no Cancel) | 1 | 03:264-279 |
| Live (`/edit/live`) | Your page is live (E:763) | none | link Open, button Copy, Go to the Editor; `p.live-address` | 1 | 03:280-288 |
| Home (`/edit/home`) | Edit Profile (E:810) | Change Profile Picture, Display name, Username (read-only), Bio, Default Mode | Copy, Save profile, Save default Mode, row buttons, Add link, Log out; nav Creator; h2 Quick Settings, Featured Links | 4 (copied, panel, mode, list) | most of 03; 04:132; H:351-359 |
| Add / Edit link (`/edit/add-link`, `/edit/link`) | Add link / Edit link (E:738) | Title, Destination, Icon, Background image, [Remove background], 18+ Age Gate, Mode, OnlyFans tracking, Default Tracking Code, Geo Rule | Save link, Cancel | 1 | 03:507-767 |
| Forgot (`/edit/forgot`) | Forgot password (E:507) | Email | Send reset link; link Back to log in | 1 | H:187-192; 03:957-980 |
| Reset (`/edit/reset`) | Set a new password (E:503) / Password changed (E:493) / Link invalid or expired | New password / Email | Set password / Log in / Send a new link | 1 | 03:957-980 |
| Stats (`/edit/stats`) | Stats (S:146) | Link, Country (selects) | Today, 7D, 30D; nav Creator (Editor, Stats) | 0 | 04 (all UI tests) |
| Retry (any) | Try again (E:400) | none | Try again | 1 | none |

## 4. Network calls the Editor and Stats make (pinned by tests via page.on('request') / page.route)

- 04 watches requests: Stats must request only `GET /api/collections/dailyStats/records?perPage=500&page=N&filter=day >= '<first>' && day <= '<last>'` (S:28-37). It must page to the last page, fetch fresh on every tab, and **never** call the events collection (04:102-108 `watchEvents`, 04:217-252). 04:244 rewrites `perPage` via `page.route('**/api/collections/dailyStats/records?*')`.
- 03:436-441 counts `/api/upload/` requests: 0 on pick, 1 after 'Save profile' (E:589 → SV:161).
- 03:330 and H:293 wait for `/api/profiles/{username}.json` (the Profile page's fetch, PJ:63).

## 5. Profile page hooks used by tests (NOT being redesigned in this run, only screenshotted: keep every one unchanged)

| Hook | Tests | Defined at | Read by |
|---|---|---|---|
| `#displayName` (h1; `page.title()` == displayName at 02-profile-parity:431, 02-v1-import:327) | 00:32,49; 01:110; 02-live-edit:94,101; 02-profile-parity:428; 02-v1-import:318,326; 03:333,428,935; 05:78 | P:20 | PJ:3,113,115 |
| `#bio` | 02-profile-parity:432; 03:429 | P:24 | PJ:4,116 |
| `#avatar` (src; '' when no avatar) | 02-profile-parity:437; 02-v1-import:352; 03:335 | P:17 | PJ:5,117 |
| `#verifiedBadge` (computed display) | 02-profile-parity:433 | P:22 | PJ:6,128-130 |
| `.link-card`, `.link-card .link-title`, `.link-title` (exact text), `.lock-icon-small`, `.link-icon` | 00:33,65; 01:112; 02-live-edit:95-127; 02-profile-parity:133-151,426-449,493-495,531,720-735,772; 02-v1-import:306-310,351; 03:334; 04:70; 05:79,241; H:296,311 | PJ:136-178 (created) | style.css; PJ:187 click |
| `#overlay` (Age Gate), h2 'Mature Content Disclaimer', `#continueBtn` / 'Continue (18+)', `#closeOverlayBtn` (no accessible name) | 00:66,67,77; 01:245-714,588; 02-profile-parity:497,739; 04:91,92; 05:258,259; H:312-321 | P:39,44,46,47 | PJ:9-11,355-411 |
| `#igOverlay` (Escape Overlay), h2 'Open in System Browser', `#igOpenBtn` 'Open in browser', `#igAltBtn` 'Try another way', `#igTarget` text, `#igCopyBtn` 'Copy link', `#igCloseBtn` 'Close', strong 'Open in External Browser' | 00:42,43,50; 01:106,196,330,477-482,494,496,519,520,549,560,674,676,798,799; 03:465,494; 04:606,610; 05:351,377; H:514 | P:51,58,59,60,66,67,68,63 | PJ:12-17,329-353 |
| body overflow hidden while the Escape Overlay shows | 01:415,419 | style/PJ | PJ:329-345 |
| `#profile-bootstrap` JSON `{ username, trackingCode, profilePath }` or null | 05:224-232; domains-helpers.ts:7; 02-profile-parity:330 (stripped) | SV:266 | PJ:34 |
| localStorage `linkme_tracking_id` (v1's global key, must not be read) | 04:593 | none | PJ:215-224 |

## 6. Helpers in tests/e2e/helpers.ts that drive the UI

| Helper | Lines | Selectors / actions (verbatim) | Resolves to |
|---|---|---|---|
| UI text constants | H:163-167 | `SIGN_UP = 'Create your page'`, `LOG_IN = 'Log in'`, `CLAIM = 'Claim your Username'`, `VERIFY = 'Verify your email'`, `EDITOR = 'Edit Profile'` | E:367,327,394,431,810 |
| `heading(page, name)` | H:168 | `page.getByRole('heading', { name, exact: true })` | any h1-h6 (rule 2) |
| `signUp(page, creator)` | H:170-176 | goto `/edit/signup`; `getByLabel('Email')` / `getByLabel('Password')` / `getByLabel('Username')`.fill; `getByRole('button', { name: 'Create account' })`.click | E:332-369 |
| `logIn(page, creator)` | H:178-184 | goto `/edit`; `heading(page, LOG_IN)` visible; `getByLabel('Email')`, `getByLabel('Password')`; `getByRole('button', { name: 'Log in' })` | E:283,304-330 |
| `forgotPassword(page, email)` | H:187-192 | goto `/edit/login`; `getByRole('link', { name: 'Forgot password?' })`; `getByLabel('Email')`; `getByRole('button', { name: 'Send reset link' })` | E:328,443-460,506-511 |
| `phoneContext(browser, opts)` | H:197-212 | `browser.newContext({ viewport: PHONE })` (PHONE H:152 = 390x844) + optional UA, headers, timezone, storage; fences other hosts | none |
| `expectVerifyScreen(page)` | H:214-219 | `heading(page, VERIFY)`; buttons 'Resend email', 'Continue'; `toHaveURL(/\/edit\/verify-email$/)` | E:407-434 |
| `openProfile(browser, origin, username, titles, ua?)` | H:290-298 | phoneContext; wait `/api/profiles/${username}.json`; goto `/${username}`; `.locator('.link-card .link-title')` toHaveText(titles) | Profile page |
| `passAgeGate(visitor, title, onward)` | H:310-325 | `.locator('.link-card', { hasText: title })`.click; `#overlay` visible; heading 'Mature Content Disclaimer'; route Reveal; `getByRole('button', { name: 'Continue (18+)' })` | Profile page |
| `reach(request, stage)` | H:329-338 | API only; stage names are h1 texts (CLAIM, VERIFY, 'Your Profile', 'Add your first Link' at H:336) | E:394,431,617,738 |
| `featured(page)` | H:341 | `page.getByRole('list', { name: 'Links' }).getByRole('listitem')` | E:848,876 |
| `visitorSees(...)` | H:344-346 | openProfile then close | Profile page |
| `logInToHandedOver(...)` | H:351-360 | phoneContext; logIn; `heading(editor, EDITOR)`; `editor.getByText(`${origin}/${username}`, { exact: true })`; `getByLabel('Display name')` toHaveValue; `featured(editor)` toHaveText(titles) | E:810,811,598,848 |
| `recordNavigations(page)` | H:492-508 | records navigations from the Profile page (x-safari-, intent:) | PJ |
| `escapeOverlay(page)` | H:514 | `page.locator('#igOverlay')` | P:51 |
| API-only (no page hooks) | H:20-150, 222-288, 301-307, 365-487 | superuserToken, markVerified, mailedLink(s), createOwnerlessProfile, setOwner, ownerOf, pngFile, proxy, upload, account, verifiedCreator, servedProfile, expectServedWebp, furnishedCreator, readBack, probe, refused, operator, recordIds, eventCount, callsTo429, UA | SV /api proxy, PocketBase :18090, Mailpit :18025 |

## 7. Viewports and screenshots

- **Default:** every project is `devices['Desktop Chrome']` (1280x720), playwright.config.ts:24,32,33. `screenshot: 'only-on-failure'` (config line 22) is not an assertion.
- **390x844 for a whole file:** 03 (03:24 `test.use({ viewport: PHONE })`) covers every Editor test, the landing test 03:109-117 and 03's API tests.
- **390x844 through `phoneContext` (H:197-212):**
  - 03:91, 322, 888;
  - `openProfile`, `visitorSees`, `logInToHandedOver`;
  - 04 `creatorOnStats` (04:120-135, every Stats read) and `countedVisit` (04:43-56);
  - 05:70, 95, 200, 220, 342, 372, 412, 445, 485.
- **`setViewportSize` 390x844 for one test:** 00:30, 01:474, 02-profile-parity:770.
- **Desktop layout (1280x720) is used only by Profile-page and landing tests:**
  - 00 (other tests), 01 (user-agent overrides only), 02-live-edit, 02-profile-parity journeys, 02-v1-import Profile checks;
  - 02-image-upload's `/landing.html` decode page.
  - **No Editor or Stats test runs at desktop width.**
- **Mobile emulation:** none. No `isMobile`, `hasTouch` or `devices['iPhone…']`; phone user agents only change the UA string (H:460-487 `UA`).
- **Layout and CSS assertions:**
  - 04:254 no horizontal overflow at 390x844 (Stats);
  - 01:415,419 `getComputedStyle(document.body).overflow` (Profile);
  - 02-profile-parity:433 `#verifiedBadge` computed `display`.
  - There is no toHaveCSS, boundingBox or toHaveScreenshot anywhere.
- **Screenshots** are saved files only, never compared pixel by pixel. All go to `.scratch/goal_ai/shots/`:

  | Spec:line | Surface | Viewport | Output file |
  |---|---|---|---|
  | 00:34 | Profile `/fixture` | 390x844, fullPage | `00-smoke.png` |
  | 01:485 | Escape Overlay on the Profile page | 390x844, animations disabled | `01-link-modes-and-escape.png` |
  | 02-profile-parity:774 | Profile `/juliafilippo_` or `/fixture` | 390x844, fullPage; only checks size > 0 | `02-vps-foundation.png` |
  | 03:302 | **Editor home** after Onboarding | 390x844, fullPage | `03-auth-and-editor.png` |
  | 04:255 | **Stats** | 390x844, fullPage | `04-stats.png` |
  | 05:109 | Profile on a Custom Domain `/` | 390x844, fullPage | `05-domains.png` |

## 8. Stack, timing and the no-parallel rule

- **Start:** `./check.sh` = `npx playwright test "$@"` (check.sh:3).
  - With no `PLAYWRIGHT_BASE_URL`, playwright.config.ts:35-45 runs `tests/stack.sh` as webServer. It waits for `${baseURL}/api/profiles/fixture.json` (timeout 300 s, `reuseExistingServer: false`, SIGTERM shutdown with 120 s grace).
  - With `PLAYWRIGHT_BASE_URL` set, nothing is started and `workers: 1` (config:20).
  - The projects run in order: `chromium` (all but 02-v1-import and 02-reveal-guard), then `stack-import`, then `reveal-guard` (config:23-34).
- **tests/stack.sh:**
  1. `compose() = docker compose --env-file tests/e2e.env --profile mail` (stack.sh:14).
  2. `down -v` first (stack.sh:24).
  3. `up -d --build --wait pocketbase app mailpit` (stack.sh:25). The image is rebuilt from app/ (`COPY . .`, app/Dockerfile:4), so Editor edits reach the run.
  4. Set PocketBase appURL `http://localhost:4173` + SMTP to mailpit (stack.sh:27-38).
  5. `tests/stats-seed.js` (stack.sh:40).
  6. `app import-v1` over the v1 Snapshot (if present) + Fixture site (stack.sh:46-56).
  7. `up -d --wait caddy` (stack.sh:57).
  8. Follow logs until SIGTERM, then `down` (stack.sh:58-63).
- **Ports (tests/e2e.env):** project `oflinkv2-e2e`; HTTP 4173 (baseURL), HTTPS 4443, PocketBase 18090, Mailpit 18025. `PRIMARY_HOSTS=localhost`, `REVEAL_LIMIT_PER_MINUTE=600`, `COMPOSE_FILE=compose.yaml:tests/compose.mail.yaml`.
- **Duration** (.scratch/goal-ai/RUN.md:23, verbatim): `./check.sh --reporter=line                    # the whole suite, ~3.7 min cold; never while another run or an oflinkv2 stack is up`. The last real run was `358 passed (3.8m)` (RUN.md:10-14).
- **Rule:** never run while another run or an oflinkv2 stack is up (RUN.md:23).
  - RUN.md:28: "Each side script refuses to start while any `oflinkv2` container is up and tears its own project down on every exit path (tests/side-stack.sh)."
  - CONSTRAINTS rule 3: check `docker ps --format '{{.Names}}' | grep -i oflink` first.
  - Side scripts: tests/caddy-ask.sh, tests/proxy-protocol.sh, tests/cloudflare-lines.sh.
- **Other scripts:**
  - None of tests/*.sh, tests/*.js or app/bin/* touches /edit, landing.html or Profile-page DOM hooks, or takes screenshots.
  - tests/side-stack.sh:34-40 curls `/api/profiles/fixture.json`.
  - tests/cloudflare-lines.sh:39-42 wgets `/` for headers only.
  - tests/proxy-protocol.sh:37 sends a raw `/r/` request.
  - app/bin/reserved-usernames:22-25 reads SV routes and the **app/public directory listing** (rule 13).
  - app/bin/import-v1 reads v1 Profile JSON and images only.

## 9. Server dependencies: /api allow-list, #profile-bootstrap, static serving

- **/api allow-list:** `PROXIED = /^\/api\/collections\/(users|profiles|links|dailyStats)\/[^/]/` (SV:200). The handler at SV:203-221 also refuses `%2f`, `%5c` and `\`. Every other `/api/*` path answers 404 (SV:226), including `_superusers`, `/api/realtime` and `/api/batch` (03:165-202). Its own routes: `/api/profiles/:file` (SV:67), `/api/files/:collection/:recordId/:filename` (SV:129), `/api/upload/:collection/:recordId/:field` (SV:161).
- **Editor and Stats calls, all inside that allow-list:**
  - `api()` E:40-62 → `fetch('/api/collections/${path}')` E:46, token from localStorage `ofl.token`;
  - `upload()` E:64-78 → `/api/upload/...` E:68 (field `file`, raw token);
  - `sessionEnded()` E:97-106 → `users/auth-refresh` E:101;
  - `refresh()` E:124; `onboarded()` profiles E:258, links E:273;
  - log-in E:315; sign-up `users/records` E:344, E:349, E:356; claim `profiles/records` POST E:373;
  - verification and reset `users/request-verification` / `request-password-reset` / `confirm-verification` / `confirm-password-reset` E:414, 450, 471, 490;
  - Profile PATCH E:551; avatar upload E:589; stock icon `fetch('/images/${file}')` E:704 (static, SV:262-264);
  - Link POST/PATCH E:712; background upload E:719; reorder PATCH E:859-860; DELETE E:870; GET E:888;
  - avatar preview src `/api/files/profiles/...` E:578;
  - Stats `dailyStats/records` S:32.
  - Any new Editor call outside the allow-list (e.g. realtime) needs a server change.
- **`#profile-bootstrap`:** built at SV:262-269 on every Profile-page GET.
  - `BOOTSTRAP_BEFORE = '<script src="/script.js"></script>'` (SV:260) must exist verbatim in P (P:72).
  - The block `<script type="application/json" id="profile-bootstrap">…</script>\n    ` (SV:266) is inserted before it, `<>&` escaped (SV:261).
  - PJ:34 parses it; `null` → `/landing.html` (PJ:35-37).
  - domains-helpers.ts:7 strips the block with a regex that expects exactly `\n` + 4 spaces after it.
  - **No editor.js or stats.js function or id depends on the bootstrap.** It belongs to the Profile page only.
- **Editor serving:** `app.get('/edit')` and `app.get('/edit/*')` → `staticFile(EDITOR, path)` (SV:228-232). A file under app/editor is served if it exists, otherwise X (index.html), with `Cache-Control: public, max-age=0, must-revalidate` (SV:25,57-62).
  - X loads `/edit/editor.css` (X:8), `/edit/stats.js` (X:16) and `/edit/editor.js` (X:17) in that order. stats.js loads first and uses editor.js globals at run time (S:2-7).
  - editor.js needs `#screen` and `#title` (E:33-34).
  - Nothing in the server or tests names editor.js, stats.js or editor.css except X.
- **Landing serving:** `/landing.html` is a static file (SV:262-264). It is also the 404 body for `/netlify/*` (SV:252). `/` is the Profile page (rule 12).
- **MIME map** SV:27-32: `.html .js .css .webp` only.

## 10. Per-file hook lists (generated from the test sources)

Generated by extracting every `getBy*(` call, `.locator(...)`, `#id` token, local selector wrapper (`heading()`, `featured()`, `escapeOverlay()`, `card()` ...), text/value/URL/count assertion and form action from tests/e2e/*.ts, each mapped to the element it resolves to in app/. Kinds: getBy, locator, id, wrapper. Contract column as in the header (UI / B / test-only). Assertions on Profile-page values are test data unless a definition is given.

### tests/e2e/helpers.ts

Hooks (verbatim; Lines = every occurrence; Tests = start line of the enclosing test, '-' = helper/plumbing):

| Hook | Kind | Lines | Tests | Contract | Resolves to |
|---|---|---|---|---|---|
| `getByRole('heading', { name, exact: true })` | getBy | 168 | - | UI | helpers.ts heading(): any h1-h6; Editor h1s are set per screen in app/editor/editor.js/app/editor/stats.js (see section 3) |
| `getByLabel('Email')` | getBy | 172,181,190 | - | UI | app/editor/editor.js:322 (log-in), :362 (sign-up), :456 (mailForm: forgot / invalid link) |
| `getByLabel('Password')` | getBy | 173,182 | - | UI | app/editor/editor.js:323 (log-in), :363 (sign-up) |
| `getByLabel('Username')` | getBy | 174 | - | UI+B | app/editor/editor.js:183 addressField label 'Username' > span host + input[name=username] (app/editor/editor.js:162-180 lowercases); 03:116 on sign-up |
| `getByRole('button', { name: 'Create account' })` | getBy | 175 | - | UI | app/editor/editor.js:366 |
| `heading(page, LOG_IN)` | wrapper | 180 | - | UI | helpers.ts:168 heading() exact h1 -> 'Log in' app/editor/editor.js:327 |
| `getByRole('button', { name: 'Log in' })` | getBy | 183 | - | UI | app/editor/editor.js:325 (log-in submit), :494 (password changed) |
| `getByRole('link', { name: 'Forgot password?' })` | getBy | 189 | - | UI | app/editor/editor.js:328 |
| `getByRole('button', { name: 'Send reset link' })` | getBy | 191 | - | UI | app/editor/editor.js:509 mailForm |
| `heading(page, VERIFY)` | wrapper | 215 | - | UI | helpers.ts:168 heading() exact h1 -> 'Verify your email' app/editor/editor.js:431 |
| `getByRole('button', { name: 'Resend email' })` | getBy | 216 | - | UI+B | app/editor/editor.js:409-419 (verify), :472 via drawInvalidLink |
| `getByRole('button', { name: 'Continue' })` | getBy | 217 | - | UI | app/editor/editor.js:430 (verify), :474 (email verified), :618 (Profile step submit). Substring match |
| `.locator('.link-card .link-title')` | locator | 296 | - | UI+B (Profile, keep) | app/public/script.js:137,145 div.link-card > .link-content > span.link-title |
| `.locator('.link-card', { hasText: title })` | locator | 311 | - | UI (Profile, keep) | app/public/script.js:137 |
| `.locator('#overlay')` | locator | 312 | - | UI (Profile, keep) | app/public/index.html:39 Age Gate; app/public/script.js:9, open app/public/script.js:355-359 |
| `#overlay` | id | 312 | - | UI (Profile, keep) | app/public/index.html:39 Age Gate; app/public/script.js:9, open app/public/script.js:355-359 |
| `getByRole('heading', { name: 'Mature Content Disclaimer' })` | getBy | 313 | - | UI (Profile, keep) | app/public/index.html:44 h2 in #overlay |
| `getByRole('button', { name: 'Continue (18+)' })` | getBy | 321 | - | UI (Profile, keep) | app/public/index.html:46 #continueBtn; app/public/script.js:371 click handler |
| `getByRole('list', { name: 'Links' })` | getBy | 341 | - | UI | app/editor/editor.js:848 ul.links aria-label='Links' |
| `getByRole('listitem')` | getBy | 341 | - | UI | app/editor/editor.js:876 li.link-row (its text must be the Link title only) |
| `heading(editor, EDITOR)` | wrapper | 354 | - | UI | helpers.ts:168 heading() exact h1 -> 'Edit Profile' app/editor/editor.js:810 |
| `` getByText(`${origin}/${username}`, { exact: true }) `` | getBy | 355 | - | UI+B | app/editor/editor.js:811 .bio-link .value = address() app/editor/editor.js:530 |
| `getByLabel('Display name')` | getBy | 356 | - | UI | app/editor/editor.js:598 label > input[name=displayName] (app/editor/editor.js:569) |
| `featured(editor)` | wrapper | 357 | - | UI | helpers.ts featured() = getByRole('list', { name: 'Links' }).getByRole('listitem') -> app/editor/editor.js:848,876 |
| `.locator('#igOverlay')` | locator | 514 | - | UI+B (Profile, keep) | app/public/index.html:51; app/public/script.js:12, class toggles app/public/script.js:335-343 |
| `#igOverlay` | id | 514 | - | UI+B (Profile, keep) | app/public/index.html:51; app/public/script.js:12, class toggles app/public/script.js:335-343 |

Text / value / URL assertions and form actions (verbatim):

| Line | Assertion or action | Matched text defined at |
|---|---|---|
| 171 | `.goto('/edit/signup')` |  |
| 172 | `.fill(creator.email)` |  |
| 173 | `.fill(creator.password)` |  |
| 174 | `.fill(creator.username)` |  |
| 179 | `.goto('/edit')` |  |
| 181 | `.fill(creator.email)` |  |
| 182 | `.fill(creator.password)` |  |
| 188 | `.goto('/edit/login')` |  |
| 190 | `.fill(email)` |  |
| 218 | `.toHaveURL(/\/edit\/verify-email$/)` | app/editor/editor.js:226-233 show()/go() history paths |
| 294 | `` .goto(`/${username}`) `` |  |
| 296 | `.toHaveText(titles)` | test data / Profile JSON value |
| 356 | `.toHaveValue(displayName)` | test data / Profile JSON value |
| 357 | `.toHaveText(titles)` | test data / Profile JSON value |


### tests/e2e/domains-helpers.ts

No page hooks: API, CLI or plumbing only.


### tests/e2e/00-smoke.spec.ts

Tests (line range, title; D = describe, other = skip/fixme guard):

| Lines | Kind | Title |
|---|---|---|
| 29-35 | test | profile page renders the display name and the four link cards |
| 37-45 | D | inside the Instagram in-app browser |
| 40-44 | test | shows the open-in-system-browser overlay |
| 47-51 | test | a normal browser does not see the Instagram overlay |
| 56-87 | test | tapping the adult link shows the age gate, then continue reveals and follows the destination |
| 92-96 | test | ${path} does not hand out the Test Secrets |

Hooks (verbatim; Lines = every occurrence; Tests = start line of the enclosing test, '-' = helper/plumbing):

| Hook | Kind | Lines | Tests | Contract | Resolves to |
|---|---|---|---|---|---|
| `.locator('#displayName')` | locator | 32,49 | 29,47 | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `#displayName` | id | 32,49 | 29,47 | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `.locator('.link-card .link-title')` | locator | 33 | 29 | UI+B (Profile, keep) | app/public/script.js:137,145 div.link-card > .link-content > span.link-title |
| `.locator('#igOverlay')` | locator | 42,50 | 40,47 | UI+B (Profile, keep) | app/public/index.html:51; app/public/script.js:12, class toggles app/public/script.js:335-343 |
| `#igOverlay` | id | 42,50 | 40,47 | UI+B (Profile, keep) | app/public/index.html:51; app/public/script.js:12, class toggles app/public/script.js:335-343 |
| `getByRole('heading', { name: 'Open in System Browser' })` | getBy | 43 | 40 | UI (Profile, keep) | app/public/index.html:58 h2 in #igOverlay |
| `.locator('.link-card', { hasText: 'Adult Link' })` | locator | 65 | 56 | UI (Profile, keep) | app/public/script.js:137 |
| `.locator('#overlay')` | locator | 66 | 56 | UI (Profile, keep) | app/public/index.html:39 Age Gate; app/public/script.js:9, open app/public/script.js:355-359 |
| `#overlay` | id | 66 | 56 | UI (Profile, keep) | app/public/index.html:39 Age Gate; app/public/script.js:9, open app/public/script.js:355-359 |
| `getByRole('heading', { name: 'Mature Content Disclaimer' })` | getBy | 67 | 56 | UI (Profile, keep) | app/public/index.html:44 h2 in #overlay |
| `getByRole('button', { name: 'Continue (18+)' })` | getBy | 77 | 56 | UI (Profile, keep) | app/public/index.html:46 #continueBtn; app/public/script.js:371 click handler |

Text / value / URL assertions and form actions (verbatim):

| Line | Assertion or action | Matched text defined at |
|---|---|---|
| 31 | `.goto(PROFILE)` |  |
| 32 | `.toHaveText('Fixture Profile')` | test data / Profile JSON value |
| 33 | `.toHaveText(LINK_TITLES)` | test data / Profile JSON value |
| 41 | `.goto(PROFILE)` |  |
| 48 | `.goto(PROFILE)` |  |
| 49 | `.toHaveText('Fixture Profile')` | test data / Profile JSON value |
| 58 | `.goto(PROFILE)` |  |


### tests/e2e/01-link-modes-and-escape.spec.ts

Tests (line range, title; D = describe, other = skip/fixme guard):

| Lines | Kind | Title |
|---|---|---|
| 127-311 | D | System Browser (desktop Chrome) |
| 130-144 | test | the Deeplink Link makes a Reveal request even though it carries a url, then lands on the answer |
| 147-155 | test | a tap on the ${mode} Link lands on its url and makes no Reveal request |
| 161-174 | test | with the ${mode} Link's url ${variant}, a tap reveals and lands on exactly what Reveal answered |
| 178-190 | test | a Link with tracking on and no url reveals with the Tracking Code from the path |
| 193-197 | test | a Profile default of ${mode} shows no Escape Overlay |
| 200-209 | test | a Link with its mode removed follows a deeplink default and reveals |
| 211-220 | test | a Link with an unrecognised mode follows a deeplink default and reveals |
| 222-236 | test | with every mode stripped, the Deeplink Link falls back to Escape Mode and lands on its url with no Reveal |
| 239-256 | test | the Adult Link in ${mode} Mode shows the Age Gate, then Continue (18+) reveals and lands on the answer |
| 259-262 | test | /{username}/{code} is cleaned to /{username} |
| 264-276 | test | /{username}/{code}?link={Adult Link Id}, with tracking on, reveals with that id and the code, with no Age Gate, and lands on the answer |
| 278-285 | test | /{username}/{code}?link={Escape Link Id} lands where a tap on that Link would: its url, with no Reveal |
| 287-297 | test | /{username}?link={an id not on the Profile} loads the Profile, with no Reveal request and no navigation |
| 299-310 | test | the network fence answers every host other than localhost |
| 320-334 | D | In-App Browser (${app}) |
| 323-333 | test | with every mode stripped, the Escape Overlay shows on open at /{username}/{code}, with no Close |
| 341-353 | D | System Browser (${browser}) |
| 344-352 | test | no Escape Overlay shows, and a tap on the Escape Link navigates plainly |
| 356-659 | D | In-App Browser (iOS Instagram) |
| 359-370 | test | Direct default: no Escape Overlay on open, the address keeps its code, and the Direct Link navigates plainly |
| 372-385 | test | a tap on the Deeplink Link makes a Reveal request, then pops out to the answer through x-safari-, as v1 did |
| 387-404 | test | the Adult Link set to Direct shows the Age Gate, then Continue (18+) reveals and navigates plainly |
| 407-424 | test | a default of ${profileMode} on a Profile that holds the Direct and Deeplink Links pops out and shows the Escape Overlay on open, with Close |
| 427-435 | test | every Link set to Escape Mode with an escape_ig default shows the Escape Overlay on open, with no Close |
| 437-443 | test | a default of deeplink pops out on open to the Profile, with no Escape Overlay |
| 449-460 | test | Direct default: the Deeplink Link with ${variant} navigates plainly to its url, with no Reveal and nothing x-safari- recorded |
| 463-471 | test | Direct default: from /{username}/{code}, a tap on the Escape Link fires x-safari- to the escape target in the tap's own task |
| 473-486 | test | after the Escape tap, the Escape Overlay shows every way out aimed at the escape target, and no Reveal is made |
| 488-498 | test | tapping "Open in browser", then "Try another way", records each one's href as a navigation |
| 500-507 | test | "Close" hides the Escape Overlay and puts the address back to /{username}/{code} |
| 509-526 | test | /{username}/{code}?link={Escape Link Id} pops out at once to that address, as v1's ?link= did, and shows the Escape Overlay aimed at it, with Close and no Reveal |
| 528-539 | test | after an earlier visit to /{username}/{code}, a tap on the Escape Link from /{username} carries the code in the target and the address |
| 541-553 | test | after an earlier visit to /{username}/{code}, the overlay on open with an escape_ig default points the address and "Open in browser" at the code; Close puts /{username} back |
| 555-563 | D | with clipboard permission on the localhost origin |
| 558-562 | test | "Copy link" puts the https escape target on the clipboard |
| 568-581 | test | the Adult Link set to Escape Mode shows the Age Gate, then Continue (18+) fires x-safari- to the escape target in its own task, with no Reveal |
| 583-594 | test | the Adult Link set to Escape Mode: closing the Age Gate instead records no navigation and makes no Reveal request |
| 612-624 | test | the hop: the target recorded from an Escape Link tap opens in a fresh desktop browser context and lands where a tap on that Link would |
| 626-645 | test | the hop: for the Adult Link set to Escape Mode with tracking on, the fresh desktop browser context reveals with the code and lands on the answer |
| 647-658 | test | Deeplink default: a Link with its mode removed makes a Reveal request, then pops out to the answer |
| 661-720 | D | In-App Browser (Android Instagram) |
| 664-680 | test | from /{username}/{code}, a tap on the Escape Link fires v1's Chrome intent, with no fallback, in the tap's own task; "Open in browser" carries it; no "Try another way" |
| 688-701 | test | a tap on the Deeplink Link makes a Reveal request, then fires v1's Chrome intent for the answer |
| 703-719 | test | the Adult Link set to Deeplink shows the Age Gate, then Continue (18+) reveals and fires v1's Chrome intent for the answer |
| 736-789 | D | Pop-out with v1's links (${platform} ${app}) |
| 739-746 | test | Escape default: the page pops out on open to the Profile with its code, and shows the Escape Overlay |
| 748-759 | test | ?link={Escape Link Id} pops out on open to that Link, with no Reveal |
| 761-767 | test | Direct default: a tap on the Escape Link pops out to that Link from the tap itself |
| 769-779 | test | Direct default: a tap on the Deeplink Link reveals, then pops out to the Destination |
| 781-788 | test | Deeplink default: the page pops out on open to the Profile, with no Escape Overlay |
| 792-806 | D | In-App Browser on neither iOS nor Android (desktop UA carrying "Instagram") |
| 795-805 | test | a tap on the Escape Link records no navigation and shows the Escape Overlay, whose "Open in browser" carries the plain https target; no "Try another way" |

Hooks (verbatim; Lines = every occurrence; Tests = start line of the enclosing test, '-' = helper/plumbing):

| Hook | Kind | Lines | Tests | Contract | Resolves to |
|---|---|---|---|---|---|
| `getByRole('button', { name: 'Close' })` | getBy | 106 | - | UI (Profile, keep) | app/public/index.html:68 #igCloseBtn inside #igOverlay; app/public/script.js:334 hidden toggle |
| `escapeOverlay(page)` | wrapper | 106,329,348,364,412,418,433,442,476,477,478,480,481,482,494,496,505,518,519,520,547,549,560,577,578,590,673,674,676,745,787,797,798,799 | 323,344,359,407,427,437,473,488,500,509,541,558,568,583,664,739,781,795 | UI (Profile, keep) | helpers.ts escapeOverlay() = locator('#igOverlay') -> app/public/index.html:51 |
| `.locator('#displayName')` | locator | 110 | - | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `#displayName` | id | 110 | - | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `.locator('.link-card', { hasText: link.title })` | locator | 112 | - | UI (Profile, keep) | app/public/script.js:137 |
| `card(page, link)` | wrapper | 123,152,168,185,206,217,233,349,367,380,421,456,536,654,696,775 | 147,161,178,200,211,222,344,359,372,407,449,528,647,688,769 | UI (Profile, keep) | local card() = locator('.link-card', { hasText }) -> app/public/script.js:137 |
| `card(page, deeplink)` | wrapper | 138 | 130 | UI (Profile, keep) | local card() = locator('.link-card', { hasText }) -> app/public/script.js:137 |
| `.locator('#igOverlay')` | locator | 196 | 193 | UI+B (Profile, keep) | app/public/index.html:51; app/public/script.js:12, class toggles app/public/script.js:335-343 |
| `#igOverlay` | id | 196 | 193 | UI+B (Profile, keep) | app/public/index.html:51; app/public/script.js:12, class toggles app/public/script.js:335-343 |
| `card(page, adult)` | wrapper | 244,393,709 | 239,387,703 | UI (Profile, keep) | local card() = locator('.link-card', { hasText }) -> app/public/script.js:137 |
| `getByRole('heading', { name: 'Mature Content Disclaimer' })` | getBy | 245,394,566,710 | 239,387,703 | UI (Profile, keep) | app/public/index.html:44 h2 in #overlay |
| `getByRole('button', { name: 'Continue (18+)' })` | getBy | 249,398,574,632,714 | 239,387,568,626,703 | UI (Profile, keep) | app/public/index.html:46 #continueBtn; app/public/script.js:371 click handler |
| `card(page, byMode.direct)` | wrapper | 304 | 299 | UI (Profile, keep) | local card() = locator('.link-card', { hasText }) -> app/public/script.js:137 |
| `getByRole('heading', { name: 'Open in System Browser' })` | getBy | 330 | 323 | UI (Profile, keep) | app/public/index.html:58 h2 in #igOverlay |
| `closeButton(page)` | wrapper | 332,417,434,483,504,521,551 | 323,407,427,473,500,509,541 | UI (Profile, keep) | 01 closeButton() = escapeOverlay(page).getByRole('button', { name: 'Close' }) -> app/public/index.html:68 |
| `getByRole('link', { name: 'Open in browser' })` | getBy | 477,494,519,549,578,674,798 | 473,488,509,541,568,664,795 | UI (Profile, keep) | app/public/index.html:59 #igOpenBtn; href set app/public/script.js:330 |
| `getByRole('link', { name: 'Try another way' })` | getBy | 478,496,676,799 | 473,488,664,795 | UI (Profile, keep) | app/public/index.html:60 #igAltBtn; app/public/script.js:331-332 |
| `getByText(target, { exact: true })` | getBy | 480,520 | 473,509 | UI (Profile, keep) | app/public/index.html:66 #igTarget; app/public/script.js:333 |
| `getByRole('button', { name: 'Copy link' })` | getBy | 481,560 | 473,558 | UI (Profile, keep) | app/public/index.html:67 #igCopyBtn; app/public/script.js:349 |
| `getByText('Open in External Browser')` | getBy | 482 | 473 | UI (Profile, keep) | app/public/index.html:63 strong |
| `ageGate(page)` | wrapper | 570,585,589 | 568,583 | UI (Profile, keep) | 01 ageGate() = getByRole('heading', { name: 'Mature Content Disclaimer' }) -> app/public/index.html:44 |
| `.locator('#closeOverlayBtn')` | locator | 588 | 583 | UI (Profile, keep) | app/public/index.html:47 (icon-only, no accessible name); app/public/script.js:10,368 |
| `#closeOverlayBtn` | id | 588 | 583 | UI (Profile, keep) | app/public/index.html:47 (icon-only, no accessible name); app/public/script.js:10,368 |
| `#Intent` | id | 669,685,727 | 664 | B (Profile, keep) | not a selector: the fragment of an Android intent:// URL the Profile page builds (app/public/script.js appIntent) |

Text / value / URL assertions and form actions (verbatim):

| Line | Assertion or action | Matched text defined at |
|---|---|---|
| 109 | `.goto(path)` |  |
| 110 | `.toHaveText(served.profile.displayName)` | test data / Profile JSON value |
| 140 | `.toHaveURL(destination)` | test data / Profile JSON value |
| 170 | `.toHaveURL(destination)` | test data / Profile JSON value |
| 187 | `.toHaveURL(destination)` | test data / Profile JSON value |
| 207 | `.toHaveURL(await realUrlOf(await reveal))` | test data / Profile JSON value |
| 218 | `.toHaveURL(await realUrlOf(await reveal))` | test data / Profile JSON value |
| 251 | `.toHaveURL(destination)` | test data / Profile JSON value |
| 261 | `` .toHaveURL(`/${username}`) `` | test data / Profile JSON value |
| 268 | `` .goto(`/${username}/${TC}?link=${adult.id}`) `` |  |
| 270 | `.toHaveURL(destination)` | test data / Profile JSON value |
| 282 | `` .goto(`/${username}/${TC}?link=${link.id}`) `` |  |
| 296 | `` .toHaveURL(`/${username}?link=${notOnProfile}`) `` | test data / Profile JSON value |
| 331 | `` .toHaveURL(`/${username}/${TC}`) `` | test data / Profile JSON value |
| 332 | `.toHaveCount(0)` | test data / Profile JSON value |
| 365 | `` .toHaveURL(`/${username}/${TC}`) `` | test data / Profile JSON value |
| 400 | `.toHaveURL(destination)` | test data / Profile JSON value |
| 434 | `.toHaveCount(0)` | test data / Profile JSON value |
| 470 | `` .toHaveURL(`/${username}/${TC}?link=${link.id}`) `` | test data / Profile JSON value |
| 477 | `` .toHaveAttribute('href', `x-safari-${target}`) `` | app/public/script.js escapeLink/igOpenBtn.href |
| 479 | `` .toHaveAttribute('href', `instagram://extbrowser/?url=${encodeURIComponent(target)}`) `` | app/public/script.js:332 |
| 503 | `` .toHaveURL(`/${username}/${TC}?link=${link.id}`) `` | test data / Profile JSON value |
| 506 | `` .toHaveURL(`/${username}/${TC}`) `` | test data / Profile JSON value |
| 519 | `` .toHaveAttribute('href', `x-safari-${target}`) `` | app/public/script.js escapeLink/igOpenBtn.href |
| 522 | `.toHaveURL(address)` | test data / Profile JSON value |
| 538 | `` .toHaveURL(`/${username}/${TC}?link=${link.id}`) `` | test data / Profile JSON value |
| 548 | `` .toHaveURL(`/${username}/${TC}`) `` | test data / Profile JSON value |
| 550 | `` .toHaveAttribute('href', `x-safari-https://${host}/${username}/${TC}`) `` | app/public/script.js escapeLink/igOpenBtn.href |
| 552 | `` .toHaveURL(`/${username}`) `` | test data / Profile JSON value |
| 578 | `.toHaveAttribute('href', escapeLink)` | test data / Profile JSON value |
| 579 | `` .toHaveURL(`/${username}/${TC}?link=${adult.id}`) `` | test data / Profile JSON value |
| 593 | `` .toHaveURL(`/${username}/${TC}`) `` | test data / Profile JSON value |
| 620 | `.goto(fresh.path)` |  |
| 638 | `.goto(fresh.path)` |  |
| 640 | `.toHaveURL(destination)` | test data / Profile JSON value |
| 675 | `.toHaveAttribute('href', intent)` | test data / Profile JSON value |
| 676 | `.toHaveCount(0)` | test data / Profile JSON value |
| 798 | `.toHaveAttribute('href', target)` | test data / Profile JSON value |
| 799 | `.toHaveCount(0)` | test data / Profile JSON value |
| 803 | `.toHaveURL(address)` | test data / Profile JSON value |


### tests/e2e/02-image-upload.spec.ts

Tests (line range, title; D = describe, other = skip/fixme guard):

| Lines | Kind | Title |
|---|---|---|
| 62-317 | D | image upload |
| 63-63 | test.skip | !onLocalStack(), 'the stack under test is not the local test stack'); |
| 139-159 | test | a ${format.toUpperCase()} photo comes back as WebP, from the returned URL and from the Profile JSON, not enlarged |
| 140-140 | test.fixme | format === 'heic', HEIC_REASON); |
| 162-175 | test | a 3000x2000 background comes back at 1080x720, a 2000x2000 avatar and icon at 512x512 |
| 177-181 | test | a JPEG tagged with EXIF orientation 6 comes back upright, its sides swapped |
| 183-191 | test | a JPEG carrying GPS and camera tags comes back with no EXIF or XMP chunk |
| 193-201 | test | after a replacement the old file's URL answers 404 and the new one carries the immutable cache header |
| 203-291 | D | refusals leave the record unchanged |
| 219-222 | test | no token: 401 |
| 224-238 | test | a malformed token and a plain users record's token: 401, or PocketBase's own 403 or 404 |
| 240-245 | test | a target not in the list: 404 |
| 247-252 | test | over 20 MB: 413 |
| 254-282 | test | a text file, and an image over the decoder's default pixel limit: 415 |
| 284-290 | test | PocketBase itself refuses a PNG written straight into a file field |
| 293-316 | test | a v1-shaped tree whose avatar is a PNG imports with a WebP avatar at 512 px |

Text / value / URL assertions and form actions (verbatim):

| Line | Assertion or action | Matched text defined at |
|---|---|---|
| 121 | `.goto('/landing.html')` |  |


### tests/e2e/02-live-edit.spec.ts

Tests (line range, title; D = describe, other = skip/fixme guard):

| Lines | Kind | Title |
|---|---|---|
| 36-184 | D | live edits through PocketBase's API |
| 37-37 | test.skip | !onLocalStack(), 'the stack under test is not the local test stack'); |
| 88-96 | test | a Profile and Link created through the API show on the page |
| 98-102 | test | renaming the Profile shows on the next load |
| 104-108 | test | retitling a Link shows on the next load |
| 110-114 | test | adding a Link shows on the next load |
| 116-121 | test | reordering the Links shows on the next load |
| 123-128 | test | deleting a Link shows on the next load |
| 130-145 | test | the Profile's Mode and a Link's Mode show as the effective Mode; a Deeplink Link's url is empty |
| 151-174 | test | anonymous calls to PocketBase: sign-up succeeds, profiles and links show no record, the rest are refused, and no answer holds a Destination |
| 176-183 | test | deleting the Profile sends its page to the landing page, all with no restart |

Hooks (verbatim; Lines = every occurrence; Tests = start line of the enclosing test, '-' = helper/plumbing):

| Hook | Kind | Lines | Tests | Contract | Resolves to |
|---|---|---|---|---|---|
| `.locator('#displayName')` | locator | 94,101 | 88,98 | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `#displayName` | id | 94,101 | 88,98 | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `.locator('.link-card .link-title')` | locator | 95,107,113,119,127 | 88,104,110,116,123 | UI+B (Profile, keep) | app/public/script.js:137,145 div.link-card > .link-content > span.link-title |

Text / value / URL assertions and form actions (verbatim):

| Line | Assertion or action | Matched text defined at |
|---|---|---|
| 93 | `` .goto(`/${username}`) `` |  |
| 94 | `.toHaveText('Live Edit')` | test data / Profile JSON value |
| 95 | `.toHaveText(['First Link'])` | test data / Profile JSON value |
| 100 | `` .goto(`/${username}`) `` |  |
| 101 | `.toHaveText('Renamed Live Edit')` | test data / Profile JSON value |
| 106 | `` .goto(`/${username}`) `` |  |
| 107 | `.toHaveText(['Retitled Link'])` | test data / Profile JSON value |
| 112 | `` .goto(`/${username}`) `` |  |
| 113 | `.toHaveText(['Retitled Link', 'Second Link'])` | test data / Profile JSON value |
| 118 | `` .goto(`/${username}`) `` |  |
| 119 | `.toHaveText(['Second Link', 'Retitled Link'])` | test data / Profile JSON value |
| 126 | `` .goto(`/${username}`) `` |  |
| 127 | `.toHaveText(['Second Link'])` | test data / Profile JSON value |
| 180 | `` .goto(`/${username}`) `` |  |
| 181 | `` .toHaveURL(`${new URL(page.url()).origin}/landing.html`) `` | app/public/script.js:36,108 window.location.href='/landing.html' |


### tests/e2e/02-profile-parity.spec.ts

Tests (line range, title; D = describe, other = skip/fixme guard):

| Lines | Kind | Title |
|---|---|---|
| 101-168 | D | Fixture Profile journeys (desktop Chrome) |
| 130-141 | test | the Direct Link's Click goes through /r/{Link Id} and ends at its Test Secrets Destination |
| 143-157 | test | the Deeplink Link's Click sends Reveal with its id, never requests /r, then requests its Test Secrets Destination |
| 159-167 | test | /fixture?link={Direct Link's id} ends at the Direct Link's Test Secrets Destination |
| 170-243 | D | Profile JSON |
| 172-199 | test | carries fresh Link Ids, the url rule, effective Modes and nothing private |
| 201-205 | test | the Username is matched lower-cased |
| 207-211 | test | an unknown Username answers 404 with the contract's body |
| 213-229 | test | every image URL returns the Fixture site's bytes with the immutable cache header |
| 231-234 | test | a file name that is not its record's current file answers 404 |
| 236-242 | test | a file path whose record id climbs out of the file route answers 404, not a PocketBase record |
| 245-295 | D | Reveal and /r |
| 250-259 | test | Reveal for the Adult Link with ${trackingId === undefined ? 'no Tracking Code' :  |
| 262-268 | test | Reveal answers for a non-Adult Link too: the Deeplink Link gets its Destination |
| 270-278 | test | Reveal for an unknown Link Id, or the Fixture file's v1 id, answers 404 with no-store and no CORS header |
| 281-287 | test | /r/{${pick} Link Id} answers 302 to its Destination with no-store |
| 290-294 | test | /r for an unknown Link Id answers 404 with no-store |
| 297-333 | D | Other paths |
| 298-302 | test | /netlify/functions/secrets.json answers 404 with the landing page as its body |
| 305-309 | test | /${file} comes back byte-identical to the Page Copy |
| 319-322 | test | an unknown Username lands on the landing page |
| 327-331 | test | ${path} gives the index page with 200 |
| 335-340 | test | no Test Secrets value is in any Profile JSON, page or secrets path |
| 417-765 | D | v1 Snapshot |
| 418-418 | test.skip | !SNAPSHOT_PRESENT, 'v1 Snapshot absent'); |
| 423-507 | D | /${username} |
| 424-452 | test | the page shows the file's title, display name, bio, verified badge, avatar and cards |
| 454-479 | test | the Profile JSON carries fresh Link Ids, the url rule, Escape Mode, the default Tracking Codes and nothing private |
| 487-505 | test | with no Tracking Code in the address, the Age Gate's Reveal carries the card's default Tracking Code |
| 510-518 | D | Paths |
| 512-516 | test | /${twin} serves the same Profile JSON as /${lower} |
| 520-539 | test | no Destination is in any Profile JSON, the twins' pages, /netlify/functions/secrets.json (404) or /secrets.json |
| 545-764 | D | Clicks |
| 579-584 | test | /r for ${at} (non-Adult) answers 302 to the card's v1 url |
| 589-599 | test | Reveal for ${at} (Adult) with no code, digits, geo and junk answers what v1's handler answers |
| 653-661 | test | Geo Rule: Reveal for ${at} with trackingId=geo answers what v1's handler answers for each location header pair |
| 664-676 | test | every derived location case changes v1's answer on some Link once its header is dropped or its precedence swapped |
| 679-685 | test | ${at}, an Adult Link without a secrets entry, answers 404 from Reveal as v1's handler does, and from /r |
| 688-701 | test | every v1 Link Id and every secrets key answers 404 from Reveal and from /r |
| 703-763 | D | Journeys |
| 717-727 | test | ${at} (non-Adult) goes through /r/{Link Id} to its v1 url |
| 732-747 | test | /${file.username}/{digits}, then the Age Gate on card ${i + 1}, sends Reveal with those digits and lands where v1 sends that code |
| 749-761 | test | /${file.username}?link={card ${i + 1}'s Link Id} (Adult) reveals on load and lands where v1 sends it |
| 769-776 | test | a phone-sized screenshot of a Profile page served by v2 is saved |
| 786-794 | test | nothing the test stack has printed holds a Test Secrets value or a v1 Destination |
| 787-787 | test.skip | !onLocalStack(), 'the stack under test is not the local test stack'); |

Hooks (verbatim; Lines = every occurrence; Tests = start line of the enclosing test, '-' = helper/plumbing):

| Hook | Kind | Lines | Tests | Contract | Resolves to |
|---|---|---|---|---|---|
| `.locator('.link-card .link-title')` | locator | 133,147 | 130,143 | UI+B (Profile, keep) | app/public/script.js:137,145 div.link-card > .link-content > span.link-title |
| `.locator('.link-card', { hasText: link.title })` | locator | 136,151 | 130,143 | UI (Profile, keep) | app/public/script.js:137 |
| `.locator('.link-card')` | locator | 426,493,495,531,720,723,734,735,772 | 424,487,520,717,732,769 | UI (Profile, keep) | app/public/script.js:136-137 div.link-card (one per Link, Visitor order) |
| `.locator('#displayName')` | locator | 428 | 424 | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `#displayName` | id | 428 | 424 | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `.locator('#bio')` | locator | 432 | 424 | UI (Profile, keep) | app/public/index.html:24 p#bio; app/public/script.js:4,116 |
| `#bio` | id | 432 | 424 | UI (Profile, keep) | app/public/index.html:24 p#bio; app/public/script.js:4,116 |
| `.locator('#verifiedBadge')` | locator | 433 | 424 | UI+B (Profile, keep) | app/public/index.html:22 (style display:none); app/public/script.js:6,129 |
| `#verifiedBadge` | id | 433 | 424 | UI+B (Profile, keep) | app/public/index.html:22 (style display:none); app/public/script.js:6,129 |
| `.locator('#avatar')` | locator | 437 | 424 | UI (Profile, keep) | app/public/index.html:17 img#avatar.avatar; app/public/script.js:5,117 |
| `#avatar` | id | 437 | 424 | UI (Profile, keep) | app/public/index.html:17 img#avatar.avatar; app/public/script.js:5,117 |
| `.locator('.link-title')` | locator | 442 | 424 | UI (Profile, keep) | app/public/script.js:145 |
| `.locator('.lock-icon-small')` | locator | 443 | 424 | UI+B (Profile, keep) | app/public/script.js:150-151 i.fas.fa-lock.lock-icon-small (Adult Links only) |
| `.locator('.link-icon')` | locator | 447 | 424 | UI (Profile, keep) | app/public/script.js:176-178 img.link-icon |
| `.locator('#continueBtn')` | locator | 497,739 | 487,732 | UI (Profile, keep) | app/public/index.html:46; app/public/script.js:11,371 |
| `#continueBtn` | id | 497,739 | 487,732 | UI (Profile, keep) | app/public/index.html:46; app/public/script.js:11,371 |

Text / value / URL assertions and form actions (verbatim):

| Line | Assertion or action | Matched text defined at |
|---|---|---|
| 132 | `.goto('/fixture')` |  |
| 133 | `.toHaveCount(served!.links.length)` | test data / Profile JSON value |
| 146 | `.goto('/fixture')` |  |
| 147 | `.toHaveCount(served!.links.length)` | test data / Profile JSON value |
| 163 | `` .goto(`/fixture?link=${link.id}`) `` |  |
| 320 | `.goto('/nosuchcreator404')` |  |
| 321 | `` .toHaveURL(`${origin}/landing.html`) `` | app/public/script.js:36,108 window.location.href='/landing.html' |
| 425 | `` .goto(`/${username}`) `` |  |
| 429 | `.toHaveCount(file.links.length)` | test data / Profile JSON value |
| 443 | `.toHaveCount(link.isAdult ? 1 : 0)` | test data / Profile JSON value |
| 449 | `.toHaveCount(backgroundShown && v1ImageExists(link.icon) ? 1 : 0)` | test data / Profile JSON value |
| 492 | `` .goto(`/${username}`) `` |  |
| 493 | `.toHaveCount(file.links.length)` | test data / Profile JSON value |
| 530 | `.goto(path)` |  |
| 719 | `` .goto(`/${file.username}`) `` |  |
| 720 | `.toHaveCount(file.links.length)` | test data / Profile JSON value |
| 733 | `` .goto(`/${file.username}/${DIGITS}`) `` |  |
| 734 | `.toHaveCount(file.links.length)` | test data / Profile JSON value |
| 754 | `` .goto(`/${file.username}?link=${id}`) `` |  |
| 771 | `.goto(SNAPSHOT_PRESENT ? '/juliafilippo_' : '/fixture')` |  |


### tests/e2e/02-reveal-guard.spec.ts

Tests (line range, title; D = describe, other = skip/fixme guard):

| Lines | Kind | Title |
|---|---|---|
| 67-105 | D | Reveal answers only its own origin |
| 68-75 | test | a foreign Origin gets 403 with no Destination |
| 78-81 | test | Sec-Fetch-Site: ${site} gets 403 with no Destination, even with the page's own Origin |
| 84-98 | test | the page's own Origin, Sec-Fetch-Site same-origin or none, and a request with neither header pass |
| 100-104 | test | a 404 Reveal carries no CORS header either |
| 107-131 | D | Reveal and /r share one limit per client |
| 108-118 | test | repeated Reveal and /r calls, half through each, reach 429 within ${LIMIT} + 1, and no 429 holds a Destination |
| 120-130 | test | a client-set first X-Forwarded-For entry neither resets nor escapes the limit |

No page hooks: API, CLI or plumbing only.


### tests/e2e/02-v1-import.spec.ts

Tests (line range, title; D = describe, other = skip/fixme guard):

| Lines | Kind | Title |
|---|---|---|
| 76-86 | test | the broken tree is refused with one line per bad file, before any write |
| 88-112 | test | a bad Username and bad Destinations are refused, one line per problem |
| 126-140 | test | a relative url the URL parser rejects is refused by its fixed reason and never printed |
| 142-154 | test | a root-relative url whose backslash a browser reads as a second slash is refused and never printed |
| 164-176 | test | name, () => { |
| 179-195 | test | a .json entry or an image path that is a directory is refused as unreadable, not a crash |
| 197-209 | test | a Profile file holding JSON null gets its own refusal line next to another bad file |
| 211-221 | test | one Username in two sites refuses the run |
| 223-236 | test | the Fixture site alone plans three dropped entries and stops at its first write |
| 238-269 | test | the v1 Snapshot then the Fixture site: every file repaired or kept, then the first write |
| 239-239 | test.skip | !SNAPSHOT_PRESENT, 'v1 Snapshot absent'); |
| 275-371 | D | repairs, seen over HTTP on the seeded stack |
| 276-276 | test.skip | !SNAPSHOT_PRESENT, 'v1 Snapshot absent'); |
| 315-320 | test | ${path} shows the repaired file's display name and cards |
| 323-328 | test | jaka7q's display name is jaka7q |
| 331-339 | test | ${username} shows every card, each with a distinct Link Id |
| 342-354 | test | the six Profiles whose avatar file is missing serve an empty avatar |
| 356-370 | test | the four non-Adult Links that had a secrets entry reach their file's url through /r |
| 387-819 | D | on the test stack |
| 388-388 | test.skip | !onLocalStack(), 'the stack under test is not the local test stack'); |
| 418-426 | test | caddy, app and pocketbase run, PocketBase is healthy, and the app answers through Caddy |
| 434-498 | test | the schema: fields, patterns, relations, file fields, and every rule superuser-only but the ones Phase 3 opens |
| 500-535 | test | the seed wrote the Fixture Profile: fields, Links in order, fresh Link Ids, Destinations and image bytes |
| 548-602 | test | the import's printed lines: a write error exits 2, the next run completes it with three dropped lines, the stale Profiles named and the summary; no Destination printed |
| 604-626 | test | the app signs in again when PocketBase stops accepting its superuser token |
| 628-648 | test | PocketBase refuses a Destination that is neither absolute http(s) nor root-relative |
| 653-799 | D | re-runs |
| 672-705 | test | v1's git tree, archived and unpacked inside the container: three case twins skipped, counts and served Link Ids unchanged |
| 673-673 | test.skip | !SNAPSHOT_PRESENT, 'v1 Snapshot absent'); |
| 707-726 | test | the broken tree plus a case twin with other bytes is refused, one line per bad file, and nothing is written |
| 728-774 | test | tree A, then Direct Mode set through the API, then tree B: Link Ids kept, a fresh one for the new Link, the dropped one named and served, Mode kept |
| 776-798 | test | pocketbase and app recreated: the re-run Profile still serves in Direct Mode and the Fixture avatar with the same bytes |
| 813-818 | test | after every spec: only a migration created the events collection |

Hooks (verbatim; Lines = every occurrence; Tests = start line of the enclosing test, '-' = helper/plumbing):

| Hook | Kind | Lines | Tests | Contract | Resolves to |
|---|---|---|---|---|---|
| `.locator('.link-card')` | locator | 306,351 | 342 | UI (Profile, keep) | app/public/script.js:136-137 div.link-card (one per Link, Visitor order) |
| `.locator('.link-title')` | locator | 309 | - | UI (Profile, keep) | app/public/script.js:145 |
| `.locator('.lock-icon-small')` | locator | 310 | - | UI+B (Profile, keep) | app/public/script.js:150-151 i.fas.fa-lock.lock-icon-small (Adult Links only) |
| `.locator('#displayName')` | locator | 318,326 | 315,323 | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `#displayName` | id | 318,326 | 315,323 | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `.locator('#avatar')` | locator | 352 | 342 | UI (Profile, keep) | app/public/index.html:17 img#avatar.avatar; app/public/script.js:5,117 |
| `#avatar` | id | 352 | 342 | UI (Profile, keep) | app/public/index.html:17 img#avatar.avatar; app/public/script.js:5,117 |

Text / value / URL assertions and form actions (verbatim):

| Line | Assertion or action | Matched text defined at |
|---|---|---|
| 307 | `.toHaveCount(file.links.length)` | test data / Profile JSON value |
| 310 | `.toHaveCount(link.isAdult ? 1 : 0)` | test data / Profile JSON value |
| 317 | `.goto(path)` |  |
| 325 | `.goto('/jaka7q')` |  |
| 337 | `` .goto(`/${username}`) `` |  |
| 350 | `` .goto(`/${username}`) `` |  |
| 351 | `.toHaveCount(v1File(username).links.length)` | test data / Profile JSON value |
| 724 | `.goto('/importcheck_ok')` |  |
| 725 | `.toHaveURL(/\/landing\.html$/)` | test data / Profile JSON value |


### tests/e2e/03-auth-and-editor.spec.ts

Tests (line range, title; D = describe, other = skip/fixme guard):

| Lines | Kind | Title |
|---|---|---|
| 26-107 | D | sign-up and the claim |
| 27-40 | test | at 390×844 a stranger signs up with no invitation and lands signed in on "verify your email"; Continue keeps them there |
| 42-50 | test | "Julia" typed into the Username field shows as "julia" |
| 52-80 | test | fixture, edit, ab and bad.name are refused with their reason on the claim step, then a valid Username is claimed |
| 82-97 | test | logging in again in a fresh context lands on the verify screen; after a failed claim, on the claim step |
| 99-106 | test | /edit with no session shows log-in, which links to sign-up |
| 109-117 | test | in a fresh context the landing page's "Create Your Own Page" opens the sign-up screen, and no n8n Form link remains |
| 119-203 | D | rules and the proxy, over HTTP at the public origin |
| 120-137 | test | every reserved name is refused as a claim, each top-level route of 3 or more characters the app serves included |
| 139-163 | test | the claim sets only Username, owner and default Mode, for the Creator alone, once |
| 165-202 | test | _superusers and /api/realtime answer 404 at the public origin, while the same Creator's calls through the proxy succeed |
| 207-230 | D | the verified-email gate |
| 208-229 | test | over HTTP an unverified Creator's token cannot update its Profile, add a Link or upload an avatar; the owner reads both back unchanged |
| 232-372 | D | Onboarding after verification |
| 233-233 | test.skip | !onLocalStack(), 'the mail catcher and the Operator's PocketBase port are on the local test stack o |
| 235-371 | test | at 390×844 a verified Creator goes through Onboarding to a live Profile whose Links act like imported ones |
| 376-500 | D | the Editor's Profile and default Mode |
| 377-377 | test.skip | !onLocalStack(), 'the mail catcher and the Operator's PocketBase port are on the local test stack o |
| 379-455 | test | at 390×844 the Creator copies the Bio Link, edits display name and bio, replaces the avatar; Username read-only, no badge control |
| 457-499 | test | the default Mode set in Quick Settings decides the Escape Overlay on open and moves only the Links left on "Profile default" |
| 504-768 | D | the Editor's Links |
| 505-505 | test.skip | !onLocalStack(), 'the mail catcher and the Operator's PocketBase port are on the local test stack o |
| 507-586 | test | at 390×844 a title edit, a background replaced then removed, a Link added then moved up, and a confirmed delete each show on the next load |
| 588-600 | test | a move whose second write fails shows the reason and reloads the list from PocketBase, matching the page's order |
| 602-628 | test | reopening a Link shows its current Destination, and after the Creator changes it Reveal answers the new one |
| 630-674 | test | every field of an opened Link changes: an icon from no stock file stays, then stock icons, Adult flag, Mode, tracking and default Tracking Code reach the page |
| 676-720 | test | invalid Geo Rule JSON is refused and leaves the Link unchanged; a valid object saves and fills the textarea after a reload; emptying clears it |
| 722-767 | test | a Link saved with a javascript: Destination is refused by PocketBase; the Editor shows the reason and keeps every field as typed |
| 776-854 | D | owner rules, over HTTP at the public origin |
| 777-777 | test.skip | !onLocalStack(), 'the mail catcher and the Operator's PocketBase port are on the local test stack o |
| 779-793 | test | another Creator cannot change, delete, add to or take from a Profile, nor replace its images; the owners read all back unchanged |
| 795-817 | test | another Creator and an anonymous caller read nothing of the first Creator's, and nobody reads the ownerless Fixture |
| 819-836 | test | the owner cannot change their Username, owner or badge, delete their Profile, add a second, choose a Link Id, upload a file directly or store a Destination outside https://, http:// and / |
| 838-853 | test | the Operator edits a Creator's Profile, Link and account, then deletes the account and its Profile: the page lands on the landing page and log-in is refused |
| 859-990 | D | the session and where log-in lands |
| 860-860 | test.skip | !onLocalStack(), 'the mail catcher and the Operator's PocketBase port are on the local test stack o |
| 862-881 | test | reopening the Editor in the same context still shows it; Log out shows log-in, and logging in again lands in the Editor |
| 883-895 | test | a Creator who logs in partway through Onboarding resumes at the claim step, the verify screen, the Profile step or the first-Link step |
| 897-914 | test | with the stored token replaced by an invalid one, a save sends the Creator to log-in, and logging in returns them to the Editor |
| 916-937 | test | hand-over: an ownerless Profile's Username is refused with the Cutover message; once the Operator sets its owner, the Creator's next log-in lands in the Editor on it |
| 939-955 | test | a bad verification link says invalid or expired and offers a resend; "Resend email" delivers a verification email, and once its link is followed Continue opens the Profile step |
| 957-980 | test | "Forgot password" says the same for a known and an unknown address; a bad reset link offers a new one; the mailed one sets a password that lands in the Editor, the old one refused |
| 986-989 | test | after the run, the Fixture Profile still has no owner |

Hooks (verbatim; Lines = every occurrence; Tests = start line of the enclosing test, '-' = helper/plumbing):

| Hook | Kind | Lines | Tests | Contract | Resolves to |
|---|---|---|---|---|---|
| `getByRole('main')` | getBy | 31,407 | 27,379 | UI+B | app/editor/index.html:15 main#screen (no 'badge'/'verified' text on home) |
| `getByRole('button', { name: 'Continue' })` | getBy | 34,250,255,261,953 | 27,235,939 | UI | app/editor/editor.js:430 (verify), :474 (email verified), :618 (Profile step submit). Substring match |
| `getByText('Your email is not verified yet.')` | getBy | 35 | 27 | B | app/editor/editor.js:427 (substring of the full message) |
| `getByLabel('Username')` | getBy | 44,63,116 | 42,52,109 | UI+B | app/editor/editor.js:183 addressField label 'Username' > span host + input[name=username] (app/editor/editor.js:162-180 lowercases); 03:116 on sign-up |
| `heading(page, CLAIM)` | wrapper | 55,62,75,88,921,924 | 52,82,916 | UI | helpers.ts:168 heading() exact h1 -> 'Claim your Username' app/editor/editor.js:394 |
| `getByRole('status')` | getBy | 57,256,284,697,740,741,922,949,961,977 | 52,235,676,722,916,939,957 | UI+B | app/editor/editor.js:152-154 message() p.message role=status; text via say() app/editor/editor.js:156. Must be the ONLY role=status on that screen |
| `getByRole('button', { name: 'Claim' })` | getBy | 73,78 | 52 | UI | app/editor/editor.js:393 |
| `heading(second, step)` | wrapper | 94 | 82 | UI | helpers.ts:168 heading() exact h1 -> VERIFY/CLAIM app/editor/editor.js:431,394 |
| `heading(page, LOG_IN)` | wrapper | 102,873,877,905,975 | 99,862,897,957 | UI | helpers.ts:168 heading() exact h1 -> 'Log in' app/editor/editor.js:327 |
| `getByRole('link', { name: 'Sign up' })` | getBy | 103 | 99 | UI | app/editor/editor.js:329 |
| `heading(page, SIGN_UP)` | wrapper | 104,115 | 99,109 | UI | helpers.ts:168 heading() exact h1 -> 'Create your page' app/editor/editor.js:367 |
| `.locator('a')` | locator | 111 | 109 | B (landing) | app/public/landing.html every <a>: no href may contain 'n8n' |
| `getByText('Powered by n8n & Git & Netlify')` | getBy | 113 | 109 | UI (landing) | app/public/landing.html:44 span.link-subtitle |
| `getByRole('link', { name: /Create Your Own Page/ })` | getBy | 114 | 109 | UI+B (landing) | app/public/landing.html:40-43 a.link-card href=/edit/signup |
| `heading(page, 'Email verified')` | wrapper | 249 | 235 | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:473 |
| `heading(page, 'Your Profile')` | wrapper | 253,257,954 | 235,939 | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:617 |
| `getByLabel('Display name')` | getBy | 258,902,913,929 | 235,897,916 | UI | app/editor/editor.js:598 label > input[name=displayName] (app/editor/editor.js:569) |
| `getByLabel('Bio')` | getBy | 259 | 235 | UI | app/editor/editor.js:599 label 'Bio' > textarea[name=bio] (app/editor/editor.js:570) |
| `getByLabel('Profile picture')` | getBy | 260 | 235 | UI | app/editor/editor.js:609 (Onboarding Profile step) label > input[type=file][name=avatar] |
| `heading(page, 'Add your first Link')` | wrapper | 264 | 235 | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:738 |
| `getByLabel('Mode')` | getBy | 266,294,297,484,485,490,646,658,669,733,746 | 235,457,630,722 | UI+B | app/editor/editor.js:732 label > select[name=mode] (link form; options app/editor/editor.js:670 + MODE_NAMES app/editor/editor.js:516). Substring match: must be the only label containing 'Mode' on the link-form screen |
| `.locator('option:checked')` | locator | 268,294,485,490,644,656,658,666,744,746 | 235,457,630,722 | UI+B | app/editor/editor.js:536-540 select(); texts from app/editor/editor.js:516, :522-528, :664, :670 |
| `getByLabel('Title')` | getBy | 269,295,529,530,556,694,704,729,742 | 235,507,676,722 | UI | app/editor/editor.js:726 label > input[name=title] (app/editor/editor.js:658) |
| `getByLabel('Destination')` | getBy | 270,296,557,615,622,730,743 | 235,507,602,722 | UI+B | app/editor/editor.js:727 label > input[name=destination] (app/editor/editor.js:659) |
| `getByLabel('Icon')` | getBy | 271,644,656,661,666,667,731,744 | 235,630,722 | UI | app/editor/editor.js:728 label > select[name=icon] (options ICONS app/editor/editor.js:522-528, 'Current icon' app/editor/editor.js:664) |
| `getByLabel('Background image')` | getBy | 272,539 | 235,507 | UI | app/editor/editor.js:729 label > input[type=file][name=backgroundImage] (app/editor/editor.js:665 fileInput) |
| `getByLabel('18+ Age Gate')` | getBy | 273,298,617,645,657,668,732,745 | 235,602,630,722 | UI+B | app/editor/editor.js:668 check('isAdult','18+ Age Gate') -> label.check app/editor/editor.js:544 |
| `getByLabel('OnlyFans tracking')` | getBy | 275,647,659,734,747 | 235,630,722 | UI+B | app/editor/editor.js:671 check('tracking', ...) label.check |
| `getByLabel('Default Tracking Code')` | getBy | 276,648,660,735,748 | 235,630,722 | UI | app/editor/editor.js:734 label > input[name=defaultTrackingCode] (app/editor/editor.js:672) |
| `getByRole('button', { name: 'Save link' })` | getBy | 277,299,531,540,549,558,619,649,662,670,696,706,715,750,758,765 | 235,507,602,630,676,722 | UI+B | app/editor/editor.js:737 (enabled again after a refused save) |
| `heading(page, 'Your page is live')` | wrapper | 280 | 235 | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:763 |
| `getByText(address, { exact: true })` | getBy | 281 | 235 | UI+B | app/editor/editor.js:765 p.live-address (live screen) |
| `getByRole('link', { name: 'Open' })` | getBy | 282 | 235 | UI+B | app/editor/editor.js:768 a.button href = public address (live screen) |
| `getByRole('button', { name: 'Copy' })` | getBy | 283 | 235 | UI | app/editor/editor.js:745-757 copyButton (live screen) |
| `getByRole('button', { name: 'Go to the Editor' })` | getBy | 288 | 235 | UI | app/editor/editor.js:770 (live screen) |
| `heading(page, 'Edit Profile')` | wrapper | 289,300,305,392,472,487,523,532,541,550,559,620,650,663,671,707,716 | 235,379,457,507,602,630,676 | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:810 |
| `getByRole('list', { name: 'Links' })` | getBy | 290 | 235 | UI | app/editor/editor.js:848 ul.links aria-label='Links' |
| `getByRole('listitem')` | getBy | 290 | 235 | UI | app/editor/editor.js:876 li.link-row (its text must be the Link title only) |
| `getByRole('button', { name: 'Add link' })` | getBy | 292,482,489,555,763 | 235,457,507,722 | UI | app/editor/editor.js:820-826 (home) |
| `heading(page, 'Add link')` | wrapper | 293,483 | 235,457 | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:738 |
| `.locator('#displayName')` | locator | 333,428,935 | 235,379,916 | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `#displayName` | id | 333,428,935 | 235,379,916 | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `.locator('.link-card .link-title')` | locator | 334 | 235 | UI+B (Profile, keep) | app/public/script.js:137,145 div.link-card > .link-content > span.link-title |
| `.locator('#avatar')` | locator | 335 | 235 | UI (Profile, keep) | app/public/index.html:17 img#avatar.avatar; app/public/script.js:5,117 |
| `#avatar` | id | 335 | 235 | UI (Profile, keep) | app/public/index.html:17 img#avatar.avatar; app/public/script.js:5,117 |
| `.locator('.bio-link')` | locator | 396 | 379 | UI | app/editor/editor.js:811 div.bio-link (Editor home) |
| `.locator('.label')` | locator | 397 | 379 | UI | app/editor/editor.js:811 span.label 'Your Bio Link' (inside .bio-link) |
| `.locator('.value')` | locator | 398 | 379 | UI+B | app/editor/editor.js:811 span.value = address() (inside .bio-link) |
| `getByRole('button', { name: 'Copy', exact: true })` | getBy | 399 | 379 | UI | app/editor/editor.js:812 copyButton on home |
| `getByText('Copied.', { exact: true })` | getBy | 400 | 379 | B | app/editor/editor.js:752 say(status,'Copied.','ok') |
| `getByRole('textbox', { name: 'Username', exact: true })` | getBy | 404 | 379 | UI+B | app/editor/editor.js:601-605 read-only input[name=username]; '@' span aria-hidden keeps the name exactly 'Username' |
| `.locator('main')` | locator | 408 | 379 | UI | app/editor/index.html:15 |
| `.locator('input, select, textarea, button')` | locator | 408 | 379 | B | inside main (app/editor/editor.js home): no control whose name/id/aria-label/text matches /badge|verif/i |
| `getByLabel('Display name', { exact: true })` | getBy | 414 | 379 | UI | app/editor/editor.js:598 |
| `getByLabel('Bio', { exact: true })` | getBy | 415 | 379 | UI | app/editor/editor.js:599 (exact: a second label containing 'Bio' must not appear on the home screen) |
| `getByRole('button', { name: 'Save profile' })` | getBy | 423,440,903,930 | 379,897,916 | UI+B | app/editor/editor.js:794 profileForm button |
| `getByText('Profile saved.', { exact: true })` | getBy | 424,448 | 379 | B | app/editor/editor.js:794 |
| `.locator('#bio')` | locator | 429 | 379 | UI (Profile, keep) | app/public/index.html:24 p#bio; app/public/script.js:4,116 |
| `#bio` | id | 429 | 379 | UI (Profile, keep) | app/public/index.html:24 p#bio; app/public/script.js:4,116 |
| `getByLabel('Change Profile Picture')` | getBy | 437 | 379 | UI+B | app/editor/editor.js:603 label > input[type=file][name=avatar] (home; upload only on Save profile) |
| `.locator('img.avatar')` | locator | 449 | 379 | UI+B | app/editor/editor.js:573 img.avatar in profileForm (src = /api/files/... after save) |
| `.locator('#igOverlay')` | locator | 465,494 | 457 | UI+B (Profile, keep) | app/public/index.html:51; app/public/script.js:12, class toggles app/public/script.js:335-343 |
| `#igOverlay` | id | 465,494 | 457 | UI+B (Profile, keep) | app/public/index.html:51; app/public/script.js:12, class toggles app/public/script.js:335-343 |
| `getByRole('heading', { name: 'Quick Settings' })` | getBy | 473 | 457 | UI | app/editor/editor.js:815 h2 |
| `getByLabel('Default Mode')` | getBy | 474,488 | 457 | UI+B | app/editor/editor.js:804 label > select[name=mode] (app/editor/editor.js:796; options MODE_NAMES app/editor/editor.js:516) |
| `.locator('option')` | locator | 476 | 457 | UI+B | app/editor/editor.js:537 select() options of Default Mode: exactly ['Direct','Escape','Deeplink'] (app/editor/editor.js:516) |
| `getByRole('button', { name: 'Save default Mode' })` | getBy | 478 | 457 | UI+B | app/editor/editor.js:807 |
| `getByText('Default Mode saved.', { exact: true })` | getBy | 479 | 457 | B | app/editor/editor.js:801 |
| `getByRole('button', { name: 'Cancel' })` | getBy | 486,762 | 457,722 | UI | app/editor/editor.js:740 (link form, not on first-Link step) |
| `featured(page)` | wrapper | 524,533,560,565,569,580,584,593,598,880 | 507,588,862 | UI | helpers.ts featured() = getByRole('list', { name: 'Links' }).getByRole('listitem') -> app/editor/editor.js:848,876 |
| `getByRole('button', { name: 'First card', exact: true })` | getBy | 527 | 507 | UI | app/editor/editor.js:877 |
| `heading(page, 'Edit link')` | wrapper | 528,538,614,698 | 507,602,676 | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:738 |
| `getByRole('button', { name: 'Edited card', exact: true })` | getBy | 537,547 | 507 | UI | app/editor/editor.js:877 |
| `getByLabel('Remove background')` | getBy | 548 | 507 | UI+B | app/editor/editor.js:667 check('removeBackground', ...) (only when the Link has a background) |
| `getByRole('button', { name: 'Move Edited card up' })` | getBy | 562 | 507 | UI+B | app/editor/editor.js:878 aria-label `Move ${title} up` (disabled on first row) |
| `getByRole('button', { name: 'Move Third card down' })` | getBy | 563 | 507 | UI+B | app/editor/editor.js:879 |
| `getByRole('button', { name: 'Move Third card up' })` | getBy | 564 | 507 | UI+B | app/editor/editor.js:878 |
| `getByRole('button', { name: 'Delete Second card' })` | getBy | 577,583 | 507 | UI+B | app/editor/editor.js:880 aria-label `Delete ${title}`; confirm() app/editor/editor.js:868 |
| `getByRole('button', { name: 'Move A card down' })` | getBy | 596 | 588 | UI+B | app/editor/editor.js:879 aria-label `Move ${title} down` |
| `getByText(/^The move failed: /)` | getBy | 597 | 588 | B | app/editor/editor.js:861 |
| `getByRole('button', { name: 'Adult card', exact: true })` | getBy | 613,621 | 602 | UI | app/editor/editor.js:877 link-row-title button = Link title |
| `getByRole('button', { name: 'Plain card', exact: true })` | getBy | 643,655,665 | 630 | UI | app/editor/editor.js:877 |
| `getByRole('button', { name: 'Geo card', exact: true })` | getBy | 689,710,718 | 676 | UI | app/editor/editor.js:877 |
| `getByLabel('Geo Rule')` | getBy | 690,736,749 | 676,722 | UI+B | app/editor/editor.js:735 label > textarea[name=geo] (app/editor/editor.js:673) |
| `heading(page, what)` | wrapper | 739 | 722 | UI | helpers.ts:168 heading() exact h1 -> 'Edit link' / 'Add link' app/editor/editor.js:738 |
| `getByRole('button', { name: 'Safe card', exact: true })` | getBy | 756 | 722 | UI | app/editor/editor.js:877 |
| `heading(page, EDITOR)` | wrapper | 865,879,900,911,979 | 862,897,957 | UI | helpers.ts:168 heading() exact h1 -> 'Edit Profile' app/editor/editor.js:810 |
| `heading(reopened, EDITOR)` | wrapper | 869 | 862 | UI | helpers.ts:168 heading() exact h1 -> 'Edit Profile' app/editor/editor.js:810 |
| `getByRole('button', { name: 'Log out' })` | getBy | 872 | 862 | UI+B | app/editor/editor.js:827 -> logOut app/editor/editor.js:833 |
| `heading(resumed, stage)` | wrapper | 891 | 883 | UI | helpers.ts:168 heading() exact h1 -> CLAIM/VERIFY/'Your Profile'/'Add your first Link' app/editor/editor.js:394,431,617,738 |
| `getByText('Your session has ended. Log in to carry on.')` | getBy | 907 | 897 | B | app/editor/editor.js:326 hint when ?next= present |
| `getByLabel('Email')` | getBy | 908 | 897 | UI | app/editor/editor.js:322 (log-in), :362 (sign-up), :456 (mailForm: forgot / invalid link) |
| `getByLabel('Password')` | getBy | 909 | 897 | UI | app/editor/editor.js:323 (log-in), :363 (sign-up) |
| `getByRole('button', { name: 'Log in' })` | getBy | 910,974 | 897,957 | UI | app/editor/editor.js:325 (log-in submit), :494 (password changed) |
| `getByText('Profile saved.')` | getBy | 931 | 916 | B | app/editor/editor.js:794 done -> say(status,'Profile saved.','ok') |
| `heading(page, 'Link invalid or expired')` | wrapper | 941,970 | 939,957 | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:463 |
| `getByRole('button', { name: 'Resend email' })` | getBy | 942,948 | 939 | UI+B | app/editor/editor.js:409-419 (verify), :472 via drawInvalidLink |
| `heading(tab, 'Email verified')` | wrapper | 952 | 939 | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:473 |
| `heading(page, 'Set a new password')` | wrapper | 965 | 957 | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:503 |
| `getByLabel('New password')` | getBy | 966 | 957 | UI | app/editor/editor.js:500 (reset screen) |
| `getByRole('button', { name: 'Set password' })` | getBy | 967 | 957 | UI | app/editor/editor.js:502 |
| `getByRole('button', { name: 'Send a new link' })` | getBy | 971 | 957 | UI | app/editor/editor.js:496 drawInvalidLink('reset', ...) |
| `heading(page, 'Password changed')` | wrapper | 973 | 957 | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:493 |

Text / value / URL assertions and form actions (verbatim):

| Line | Assertion or action | Matched text defined at |
|---|---|---|
| 31 | `.toContainText(creator.email)` | test data / Profile JSON value |
| 38 | `.goto('/edit')` |  |
| 43 | `.goto('/edit/signup')` |  |
| 45 | `.fill('Julia')` |  |
| 46 | `.toHaveValue('julia')` | app/editor/editor.js:172-179 lowercasing |
| 47 | `.fill('')` |  |
| 49 | `.toHaveValue('julia_99')` | app/editor/editor.js:172-179 lowercasing |
| 56 | `.toHaveURL(/\/edit\/claim$/)` | app/editor/editor.js:226-233 show()/go() history paths |
| 58 | `.toContainText('“fixture” is taken')` | app/editor/editor.js:209 claimReason |
| 59 | `.toContainText('the Operator hands over Usernames held on v1 at Cutover')` | app/editor/editor.js:209 claimReason |
| 72 | `.fill(name)` |  |
| 74 | `.toContainText(text)` | app/editor/editor.js:205-221 claimReason (reserved :220, Too short :211, Not allowed :215, Too long :213, taken :209) |
| 77 | `.fill(creator.username)` |  |
| 100 | `.goto('/edit')` |  |
| 101 | `.toHaveURL(/\/edit\/login$/)` | app/editor/editor.js:226-233 show()/go() history paths |
| 105 | `.toHaveURL(/\/edit\/signup$/)` | app/editor/editor.js:226-233 show()/go() history paths |
| 110 | `.goto('/landing.html')` |  |
| 248 | `.goto(await mailedLink(creator.email, '/edit/verify'))` |  |
| 254 | `.toHaveURL(/\/edit\/profile$/)` | app/editor/editor.js:226-233 show()/go() history paths |
| 256 | `.toHaveText('Enter a display name.')` | app/editor/editor.js:583 |
| 258 | `.fill('Onboarding Creator')` |  |
| 259 | `.fill('Made in the Editor.')` |  |
| 260 | `.setInputFiles(pngFile('avatar.png', [200, 40, 40]))` |  |
| 265 | `.toHaveURL(/\/edit\/first-link$/)` | app/editor/editor.js:226-233 show()/go() history paths |
| 267 | `.toHaveValue('')` | test data / Profile JSON value |
| 268 | `.toHaveText('Profile default (currently Escape)')` | app/editor/editor.js:670 |
| 269 | `.fill('Adult card')` |  |
| 270 | `.fill(adultDestination)` |  |
| 271 | `.selectOption({ label: 'OnlyFans' })` |  |
| 272 | `.setInputFiles(pngFile('background.png', [40, 40, 200]))` |  |
| 273 | `.check()` |  |
| 274 | `.selectOption({ label: 'Escape' })` |  |
| 275 | `.check()` |  |
| 276 | `.fill('7')` |  |
| 282 | `.toHaveAttribute('href', address)` | app/editor/editor.js:768 |
| 284 | `.toHaveText('Copied.')` | app/editor/editor.js:752 |
| 291 | `.toHaveText(['Adult card'])` | test data / Profile JSON value |
| 294 | `.toHaveText('Profile default (currently Escape)')` | app/editor/editor.js:670 |
| 295 | `.fill('Direct card')` |  |
| 296 | `.fill(directDestination)` |  |
| 297 | `.selectOption({ label: 'Direct' })` |  |
| 301 | `.toHaveText(['Adult card', 'Direct card'])` | test data / Profile JSON value |
| 304 | `.goto('/edit')` |  |
| 331 | `` .goto(`/${creator.username}`) `` |  |
| 333 | `.toHaveText('Onboarding Creator')` | test data / Profile JSON value |
| 334 | `.toHaveText(['Adult card', 'Direct card'])` | test data / Profile JSON value |
| 335 | `.toHaveAttribute('src', served.profile.avatarUrl)` | img src |
| 393 | `.toHaveURL(/\/edit\/home$/)` | app/editor/editor.js:226-233 show()/go() history paths |
| 397 | `.toHaveText('Your Bio Link')` | app/editor/editor.js:811 |
| 398 | `.toHaveText(address)` | test data / Profile JSON value |
| 405 | `.toHaveValue(creator.username)` | test data / Profile JSON value |
| 407 | `.not.toContainText(/badge\|verified/i)` | negative: no such text in main |
| 416 | `.toHaveValue('Before Name')` | test data / Profile JSON value |
| 417 | `.toHaveValue('Before bio.')` | test data / Profile JSON value |
| 418 | `.fill('Not saved')` |  |
| 420 | `.toHaveValue('Before Name')` | test data / Profile JSON value |
| 421 | `.fill('After Name')` |  |
| 422 | `.fill('After bio, from the Editor.')` |  |
| 428 | `.toHaveText('After Name')` | test data / Profile JSON value |
| 429 | `.toHaveText('After bio, from the Editor.')` | test data / Profile JSON value |
| 437 | `.setInputFiles(pngFile('second.png', [40, 200, 40]))` |  |
| 449 | `.toHaveAttribute('src', after)` | img src |
| 452 | `.toHaveValue('After Name')` | test data / Profile JSON value |
| 475 | `.toHaveValue('escape_ig')` | test data / Profile JSON value |
| 476 | `.toHaveText(['Direct', 'Escape', 'Deeplink'])` | app/editor/editor.js:516 MODE_NAMES |
| 477 | `.selectOption({ label: 'Direct' })` |  |
| 484 | `.toHaveValue('')` | test data / Profile JSON value |
| 485 | `.toHaveText('Profile default (currently Direct)')` | app/editor/editor.js:670 |
| 488 | `.toHaveValue('direct')` | test data / Profile JSON value |
| 490 | `.toHaveText('Profile default (currently Direct)')` | app/editor/editor.js:670 |
| 524 | `.toHaveText(['First card', 'Second card'])` | test data / Profile JSON value |
| 529 | `.toHaveValue('First card')` | test data / Profile JSON value |
| 530 | `.fill('Edited card')` |  |
| 533 | `.toHaveText(['Edited card', 'Second card'])` | test data / Profile JSON value |
| 539 | `.setInputFiles(pngFile('second.png', [40, 200, 40]))` |  |
| 548 | `.check()` |  |
| 556 | `.fill('Third card')` |  |
| 557 | `` .fill(`https://example.com/${creator.username}/third`) `` |  |
| 560 | `.toHaveText(['Edited card', 'Second card', 'Third card'])` | test data / Profile JSON value |
| 565 | `.toHaveText(['Edited card', 'Third card', 'Second card'])` | test data / Profile JSON value |
| 569 | `.toHaveText(['Edited card', 'Third card', 'Second card'])` | test data / Profile JSON value |
| 573 | `once('dialog'` |  |
| 580 | `.toHaveText(['Edited card', 'Third card', 'Second card'])` | test data / Profile JSON value |
| 582 | `once('dialog'` |  |
| 584 | `.toHaveText(['Edited card', 'Third card'])` | test data / Profile JSON value |
| 593 | `.toHaveText(['A card', 'B card'])` | test data / Profile JSON value |
| 598 | `.toHaveText(['A card'])` | test data / Profile JSON value |
| 618 | `.fill(changed)` |  |
| 644 | `.toHaveText('Current icon')` | app/editor/editor.js:664 |
| 645 | `.check()` |  |
| 646 | `.selectOption({ label: 'Direct' })` |  |
| 647 | `.check()` |  |
| 648 | `.fill('42')` |  |
| 656 | `.toHaveText('Current icon')` | app/editor/editor.js:664 |
| 658 | `.toHaveText('Direct')` | app/editor/editor.js:516 |
| 660 | `.toHaveValue('42')` | test data / Profile JSON value |
| 661 | `.selectOption({ label: 'Instagram' })` |  |
| 666 | `.toHaveText('Instagram')` | app/editor/editor.js:527 |
| 667 | `.selectOption({ label: 'None' })` |  |
| 668 | `.uncheck()` |  |
| 669 | `.selectOption({ label: 'Profile default (currently Escape)' })` |  |
| 691 | `.toHaveValue('')` | test data / Profile JSON value |
| 694 | `.fill('Not saved')` |  |
| 695 | `.fill(typed)` |  |
| 697 | `.toHaveText('Geo Rule: write a JSON object, such as {"US": "5"}, or leave it empty for no Geo Rule.')` | app/editor/editor.js:685 |
| 699 | `.toHaveValue(typed)` | test data / Profile JSON value |
| 704 | `.fill('Geo card')` |  |
| 705 | `.fill('{"US": {"CA": "3", "default": "4"}, "default": "9"}')` |  |
| 711 | `.toHaveValue('{\n  "US": {\n    "CA": "3",\n    "default": "4"\n  },\n  "default": "9"\n}')` | test data / Profile JSON value |
| 714 | `.fill('')` |  |
| 719 | `.toHaveValue('')` | test data / Profile JSON value |
| 729 | `.fill(typed.title)` |  |
| 730 | `.fill(typed.destination)` |  |
| 731 | `.selectOption({ label: 'Twitch' })` |  |
| 732 | `.check()` |  |
| 733 | `.selectOption({ label: 'Deeplink' })` |  |
| 734 | `.check()` |  |
| 735 | `.fill(typed.code)` |  |
| 736 | `.fill(typed.geo)` |  |
| 740 | `.toContainText('Destination')` | app/editor/editor.js:642-643 linkReason |
| 741 | `.toContainText('https://, http:// or /')` | app/editor/editor.js:642-643 linkReason |
| 742 | `.toHaveValue(typed.title)` | test data / Profile JSON value |
| 743 | `.toHaveValue(typed.destination)` | test data / Profile JSON value |
| 744 | `.toHaveText('Twitch')` | app/editor/editor.js:526 |
| 746 | `.toHaveText('Deeplink')` | app/editor/editor.js:516 |
| 748 | `.toHaveValue(typed.code)` | test data / Profile JSON value |
| 749 | `.toHaveValue(typed.geo)` | test data / Profile JSON value |
| 848 | `` .goto(`/${a.creator.username}`) `` |  |
| 849 | `` .toHaveURL(`${new URL(page.url()).origin}/landing.html`) `` | app/public/script.js:36,108 window.location.href='/landing.html' |
| 868 | `.goto('/edit')` |  |
| 874 | `.toHaveURL(/\/edit\/login$/)` | app/editor/editor.js:226-233 show()/go() history paths |
| 876 | `.goto('/edit/home')` |  |
| 880 | `.toHaveText(['Session card'])` | test data / Profile JSON value |
| 892 | `.toHaveURL(url)` | test data / Profile JSON value |
| 902 | `.fill('Never saved')` |  |
| 906 | `.toHaveURL(/\/edit\/login\?next=%2Fedit%2Fhome$/)` | app/editor/editor.js:226-233 show()/go() history paths |
| 908 | `.fill(creator.email)` |  |
| 909 | `.fill(creator.password)` |  |
| 912 | `.toHaveURL(/\/edit\/home$/)` | app/editor/editor.js:226-233 show()/go() history paths |
| 913 | `.toHaveValue('Before Name')` | test data / Profile JSON value |
| 922 | `.toContainText('the Operator hands over Usernames held on v1 at Cutover')` | app/editor/editor.js:209 claimReason |
| 929 | `.fill('Edited after hand-over')` |  |
| 935 | `.toHaveText('Edited after hand-over')` | test data / Profile JSON value |
| 940 | `.goto('/edit/verify?token=not-a-token')` |  |
| 949 | `` .toContainText(`We asked for a new link to ${creator.email}.`) `` | app/editor/editor.js:405 resendAsked |
| 951 | `.goto(await mailedLink(creator.email, '/edit/verify'))` |  |
| 961 | `.toHaveText('If an account uses that address, we sent it a link. Check your inbox.')` | app/editor/editor.js:438 CHECK_INBOX |
| 964 | `.goto(link)` |  |
| 966 | `.fill('throwaway-renewed')` |  |
| 977 | `.toHaveText('Wrong email or password.')` | app/editor/editor.js:317 |


### tests/e2e/04-stats.spec.ts

Tests (line range, title; D = describe, other = skip/fixme guard):

| Lines | Kind | Title |
|---|---|---|
| 194-194 | test.skip | !onLocalStack(), 'the seeded Creators and the Operator's PocketBase port are on the local test stac |
| 204-258 | test | 1. a Page View and a Click through /r reach the Stats page, paged at any size, with no horizontal overflow at 390×844 |
| 275-328 | test | 2. Adult Link Clicks through the Age Gate count, and the Link and Country filters narrow every panel |
| 330-363 | test | 3. Link Shortcuts count through /r and through Reveal; an unknown Link Id and a refused Reveal count nothing |
| 374-388 | test | 4. the country comes from CF-IPCountry only: no header and T1 count as "Unknown", never US, and x-country never wins |
| 390-433 | test | 5. Today, 7D and 30D read their own UTC days from the browser's clock, and a range with no rows says so |
| 449-464 | test | 6. each load records its In-App Browser, and an Event holds nothing but its seven fields |
| 473-482 | test | the Stats Profile's and the Other Profile's JSON each carry profile.id, their record id, and no private key |
| 495-579 | test | 7. only a Profile's signed-in owner reads its dailyStats rows, and nobody reads or writes an Event, through PocketBase itself |
| 581-630 | test | 8. a Tracking Code stays with the Profile it arrived on: never v1's global code, another Profile's, or a reused Username's |
| 632-662 | test | 9. a deleted Link keeps its Clicks in the totals, under "Deleted link" |
| 664-673 | test | 10. a deleted Profile takes its Events with it, and its delete succeeds |
| 675-697 | test | 11. while every Event write fails, /r still redirects and Reveal still answers, both to their Destinations |
| 699-711 | test | 12. the Page View Ping meets its own limit per client and Username, apart from other Profiles' pings and from /r |
| 713-726 | test | the Page View Ping: an unknown Username is 404 and records nothing, and a GET under /v/ reaches the Profile route |

Hooks (verbatim; Lines = every occurrence; Tests = start line of the enclosing test, '-' = helper/plumbing):

| Hook | Kind | Lines | Tests | Contract | Resolves to |
|---|---|---|---|---|---|
| `getByRole('heading', { name: 'Stub Destination' })` | getBy | 58 | - | test-only | tests' own STUB page (04-stats.spec.ts:57, 05-domains.spec.ts:242), not app markup |
| `landedOnStub(visitor)` | wrapper | 67,82 | - | test-only | 04 STUB page heading 'Stub Destination' |
| `.locator('.link-card', { hasText: title })` | locator | 70 | - | UI (Profile, keep) | app/public/script.js:137 |
| `linkCard(visitor, title)` | wrapper | 72,90 | - | UI (Profile, keep) | 04 linkCard() = locator('.link-card', { hasText }) -> app/public/script.js:137 |
| `getByRole('heading', { name: 'Mature Content Disclaimer' })` | getBy | 91 | - | UI (Profile, keep) | app/public/index.html:44 h2 in #overlay |
| `getByRole('button', { name: 'Continue (18+)' })` | getBy | 92 | - | UI (Profile, keep) | app/public/index.html:46 #continueBtn; app/public/script.js:371 click handler |
| `openStats(page: Page)` | wrapper | 111 | - | UI | 04 openStats(): navigation 'Creator' > link 'Stats', then heading 'Stats' -> app/editor/editor.js:295, app/editor/stats.js:146 |
| `getByRole('navigation', { name: 'Creator' })` | getBy | 112 | - | UI | app/editor/editor.js:295 nav.creator-nav aria-label='Creator' |
| `getByRole('link', { name: 'Stats' })` | getBy | 112 | - | UI | app/editor/editor.js:295 creatorNav entry('Stats','/edit/stats') |
| `heading(page, 'Stats')` | wrapper | 113,142 | - | UI | helpers.ts:168 heading() exact h1 -> app/editor/stats.js:146 |
| `heading(page, 'Edit Profile')` | wrapper | 132 | - | UI | helpers.ts:168 heading() exact h1 -> app/editor/editor.js:810 |
| `openStats(page)` | wrapper | 133 | - | UI | 04 openStats(): navigation 'Creator' > link 'Stats', then heading 'Stats' -> app/editor/editor.js:295, app/editor/stats.js:146 |
| `readStats(page: Page)` | wrapper | 141 | - | UI+B (Stats) | 04 readStats(): regions 'Page Views'/'Clicks'/'CTR' > paragraph; tables 'Daily'/'Links'/'Countries' -> app/editor/stats.js:65-95,156-159 |
| `getByRole('region', { name, exact: true })` | getBy | 143 | - | UI+B (Stats) | app/editor/stats.js:65-68 section.stat-card aria-labelledby -> h3 'Page Views'/'Clicks'/'CTR' |
| `getByRole('paragraph')` | getBy | 143 | - | UI+B (Stats) | app/editor/stats.js:67 the card's single <p> holding the number |
| `getByRole('table', { name, exact: true })` | getBy | 145 | - | UI+B (Stats) | app/editor/stats.js:86-95 table.stats-table aria-labelledby -> h2 'Daily'/'Links'/'Countries' |
| `getByRole('columnheader')` | getBy | 146 | - | UI+B (Stats) | app/editor/stats.js:92 th scope=col |
| `getByRole('row')` | getBy | 148 | - | UI+B (Stats) | app/editor/stats.js:92-93 tr |
| `getByRole('rowheader')` | getBy | 149,150 | - | UI+B (Stats) | app/editor/stats.js:93 th scope=row (day / Link title / 'Deleted link' app/editor/stats.js:125 / country or 'Unknown') |
| `getByRole('cell')` | getBy | 150 | - | UI+B (Stats) | app/editor/stats.js:88 td |
| `card('Page Views')` | wrapper | 156 | - | UI+B (Stats) | 04 readStats card() -> app/editor/stats.js:65-68,156 |
| `card('Clicks')` | wrapper | 156 | - | UI+B (Stats) | 04 readStats card() -> app/editor/stats.js:65-68,156 |
| `card('CTR')` | wrapper | 156 | - | UI+B (Stats) | 04 readStats card() -> app/editor/stats.js:65-68,156 |
| `readFiltered(page: Page, link: string, country: string)` | wrapper | 165 | - | UI+B (Stats) | 04 readFiltered(): comboboxes 'Link'/'Country' selectOption({label}) -> app/editor/stats.js:153-154 |
| `getByRole('combobox', { name: 'Link', exact: true })` | getBy | 166 | - | UI+B (Stats) | app/editor/stats.js:153 filterControl('Link') select[name=link] |
| `getByRole('combobox', { name: 'Country', exact: true })` | getBy | 167,384 | 374 | UI+B (Stats) | app/editor/stats.js:154 filterControl('Country') label.filter > select[name=country] (app/editor/stats.js:77-81) |
| `readStats(page)` | wrapper | 168,207,218,251,279,296,333,354,377,380,399,635,651,654 | 204,275,330,374,390,632 | UI+B (Stats) | 04 readStats(): regions 'Page Views'/'Clicks'/'CTR' > paragraph; tables 'Daily'/'Links'/'Countries' -> app/editor/stats.js:65-95,156-159 |
| `readFiltered(page, stats.adult.title, ALL_COUNTRIES)` | wrapper | 280,297 | 275 | UI+B (Stats) | 04 readFiltered(): comboboxes 'Link'/'Country' selectOption({label}) -> app/editor/stats.js:153-154 |
| `readFiltered(page, stats.adult.title, 'SI')` | wrapper | 282,298 | 275 | UI+B (Stats) | 04 readFiltered(): comboboxes 'Link'/'Country' selectOption({label}) -> app/editor/stats.js:153-154 |
| `getByRole('option')` | getBy | 384 | 374 | UI+B (Stats) | app/editor/stats.js:154 Country options (countryName app/editor/stats.js:83: XX -> 'Unknown') |
| `getByRole('button', { name, exact: true })` | getBy | 397,398 | 390 | UI+B | app/editor/stats.js:148-150 range tabs 'Today'/'7D'/'30D' (RANGES app/editor/stats.js:40), aria-pressed |
| `` getByText(days.length === 1 ? `${days[0]} (UTC)` : `${days[0]} – ${days[days.length - 1]} (UTC)`, { exact: true }) `` | getBy | 401 | 390 | B (Stats) | app/editor/stats.js:151 span.hint date span (en dash) |
| `span(days)` | wrapper | 411 | 390 | B (Stats) | 04 span(): getByText date span -> app/editor/stats.js:151 |
| `span([tomorrow])` | wrapper | 425 | 390 | B (Stats) | 04 span(): getByText date span -> app/editor/stats.js:151 |
| `getByText('No Page Views or Clicks in this range yet.', { exact: true })` | getBy | 426 | 390 | B (Stats) | app/editor/stats.js:155 |
| `.locator('body')` | locator | 575 | 495 | B (Stats) | app/editor/stats.js whole page text: names none of another Creator's Links |
| `.locator('#igOverlay')` | locator | 606,610 | 581 | UI+B (Profile, keep) | app/public/index.html:51; app/public/script.js:12, class toggles app/public/script.js:335-343 |
| `#igOverlay` | id | 606,610 | 581 | UI+B (Profile, keep) | app/public/index.html:51; app/public/script.js:12, class toggles app/public/script.js:335-343 |

Text / value / URL assertions and form actions (verbatim):

| Line | Assertion or action | Matched text defined at |
|---|---|---|
| 50 | `` .goto(`/${username}`) `` |  |
| 166 | `.selectOption({ label: link })` |  |
| 167 | `.selectOption({ label: country })` |  |
| 340 | `` .goto(`/${stats.username}?link=${directId}`, { waitUntil: 'commit' }) `` |  |
| 343 | `` .goto(`/${stats.username}?link=${adultId}`, { waitUntil: 'commit' }) `` |  |
| 398 | `.toHaveAttribute('aria-pressed', 'true')` | app/editor/stats.js:149 |
| 586 | `` .goto(`/${other.username}/123`) `` |  |
| 592 | `` .goto(`/${stats.username}`) `` |  |
| 597 | `` .goto(`/${stats.username}?link=${adultId}`, { waitUntil: 'commit' }) `` |  |
| 605 | `` .goto(`/${other.username}/123`) `` |  |
| 609 | `` .goto(`/${stats.username}`) `` |  |
| 621 | `` .goto(`/${reused}/777`) `` |  |
| 626 | `` .goto(`/${reused}`) `` |  |
| 644 | `` .goto(`/r/${link.linkId}`) `` |  |


### tests/e2e/05-domains.spec.ts

Tests (line range, title; D = describe, other = skip/fixme guard):

| Lines | Kind | Title |
|---|---|---|
| 32-32 | test.skip | !onLocalStack(), 'the domain set-up needs the local stack's PocketBase port'); |
| 57-66 | test | the TLS Ask answers an empty 200 for a Custom Domain, a Spare Domain and a primary host, 404 for an unknown host, 400 without a domain |
| 105-129 | test | on a Custom Domain, / and /{code} show its Profile, ?link= reveals that Link on load as on the baseURL, and a deeper path lands on the landing page |
| 131-144 | test | on a Spare Domain, /{username} shows that Profile and /{username}?link= reveals that Link on load |
| 146-158 | test | a changed Custom Domain serves on the next load with no restart, and the TLS Ask follows it |
| 160-172 | test | a Custom Domain belongs to one Profile, and a Spare Domain outranks a Custom Domain of the same name |
| 178-197 | test | a Creator can neither create a Profile with a Custom Domain nor set one on their own Profile |
| 199-215 | test | the domains stay out of every public answer: the baseURL page and the records API without a token |
| 229-232 | test | the Profile page bootstrap carries the path's segments literally, `$` patterns included |
| 263-282 | test | with Tracking Codes 111 and 222 on every host, the Adult Link's Age Gate sends Reveal to the page's own host, which answers 200 with a Destination ending in /c{code} |
| 297-330 | test | on every host the Direct Mode Link and the Deeplink Mode Link each end at the same Destination, through `/r` and Reveal on the page's own host |
| 356-366 | test | with an iOS Instagram User-Agent, creator.test/ shows the Escape Overlay exactly when localhost/{username} does |
| 385-392 | test | an Escape from creator.test/{code} targets creator.test and /{code}, with no Username segment, on iOS and as the Android intent |
| 394-398 | test | an Escape from spare.test/{username}/{code} keeps /{username}/{code} |
| 404-434 | test | loading creator.test/ adds one Page View Event, and the Adult Link's Reveal on creator.test/{code} one Click Event, both for the Fixture Profile |
| 436-464 | test | on creator.test and spare.test the page requests nothing from another of ofl.ink's hosts, and no request URL names ofl.ink |
| 482-506 | test | a fetch from a page on creator.test to Reveal on spare.test cannot be read by the page |
| 516-527 | test | step 12's hand-over order: setting the owner while the Creator's bare Profile exists is refused; once it is deleted the owner is set, the next log-in lands in the Editor on the handed-over Profile with its Links, and the Creator owns exactly one Profile |

Hooks (verbatim; Lines = every occurrence; Tests = start line of the enclosing test, '-' = helper/plumbing):

| Hook | Kind | Lines | Tests | Contract | Resolves to |
|---|---|---|---|---|---|
| `.locator('#displayName')` | locator | 78 | - | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `#displayName` | id | 78 | - | UI (Profile, keep) | app/public/index.html:20 h1#displayName; app/public/script.js:3,115 |
| `.locator('.link-card .link-title')` | locator | 79 | - | UI+B (Profile, keep) | app/public/script.js:137,145 div.link-card > .link-content > span.link-title |
| `.locator('#profile-bootstrap')` | locator | 224 | - | UI+B (server) | app/server.js:266 (inserted before app/public/index.html:72); read app/public/script.js:34 |
| `#profile-bootstrap` | id | 224 | - | UI+B (server) | app/server.js:266 (inserted before app/public/index.html:72); read app/public/script.js:34 |
| `.locator('.link-card', { hasText: title })` | locator | 241 | - | UI (Profile, keep) | app/public/script.js:137 |
| `card(visitor, 'Adult Link')` | wrapper | 257 | - | UI (Profile, keep) | local card() = locator('.link-card', { hasText }) -> app/public/script.js:137 |
| `getByRole('heading', { name: 'Mature Content Disclaimer' })` | getBy | 258 | - | UI (Profile, keep) | app/public/index.html:44 h2 in #overlay |
| `getByRole('button', { name: 'Continue (18+)' })` | getBy | 259 | - | UI (Profile, keep) | app/public/index.html:46 #continueBtn; app/public/script.js:371 click handler |
| `card(visitor, title)` | wrapper | 313 | 297 | UI (Profile, keep) | local card() = locator('.link-card', { hasText }) -> app/public/script.js:137 |
| `escapeOverlay(visitor)` | wrapper | 351,377 | - | UI (Profile, keep) | helpers.ts escapeOverlay() = locator('#igOverlay') -> app/public/index.html:51 |
| `getByRole('button', { name: 'Close' })` | getBy | 377 | - | UI (Profile, keep) | app/public/index.html:68 #igCloseBtn inside #igOverlay; app/public/script.js:334 hidden toggle |
| `card(visitor, 'Escape Link')` | wrapper | 378 | - | UI (Profile, keep) | local card() = locator('.link-card', { hasText }) -> app/public/script.js:137 |
| `#Intent` | id | 391 | 385 | B (Profile, keep) | not a selector: the fragment of an Android intent:// URL the Profile page builds (app/public/script.js appIntent) |

Text / value / URL assertions and form actions (verbatim):

| Line | Assertion or action | Matched text defined at |
|---|---|---|
| 72 | `.goto(origin + path)` |  |
| 78 | `.toHaveText(FIXTURE_NAME)` | test data / Profile JSON value |
| 79 | `.toHaveText(FIXTURE_TITLES)` | test data / Profile JSON value |
| 99 | `.goto(origin + path)` |  |
| 115 | `` .toHaveURL(`${custom}/`) `` | test data / Profile JSON value |
| 127 | `` .toHaveURL(`${custom}/landing.html`) `` | app/public/script.js:36,108 window.location.href='/landing.html' |
| 204 | `` .goto(`${at('localhost')}/fixture`) `` |  |
| 223 | `.goto(origin + path)` |  |
| 349 | `.goto(origin + path)` |  |
| 375 | `.goto(origin + path)` |  |
| 415 | `.goto(custom + path)` |  |
| 449 | `.goto(origin + path)` |  |
| 487 | `` .goto(`${at(CUSTOM)}/`) `` |  |



## 11. Verification evidence (commands run on the final file)

- `grep -o 'data-' tests/e2e/*.ts | wc -l` → `0`: no test uses a `data-*` hook.
- `#id` tokens in tests/e2e:
  - 36 lines (`cat tests/e2e/*.ts | grep -cE "#[a-zA-Z][a-zA-Z0-9_-]*"`), 10 unique tokens: `#displayName #igOverlay #avatar #overlay #continueBtn #bio #verifiedBadge #profile-bootstrap #closeOverlayBtn #Intent` (the last is an intent:// URL fragment, not a selector).
  - All 10 found in this file with `grep -qF`, none missing. 115 lines of this file mention them.
- `getBy*(`:
  - 235 lines and 241 occurrences in tests/e2e (`grep -ohE 'getBy[A-Za-z]+\(' tests/e2e/*.ts | wc -l` → 241), which is 95 unique verbatim calls.
  - All 95 found verbatim in this file (`grep -qF` for each), 0 missing. 322 lines of this file contain `getBy`.
- `.locator(...)`: 27 unique verbatim calls in tests/e2e, all 27 present, 0 missing.
- The Destination-host grep of CONSTRAINTS rule 2 (`grep -rIl` for the v1 Creator-site host plus '/') on this file → empty (exit 1).

## Appendix A: per-test detail for 03-auth-and-editor.spec.ts (sub-agent part; line numbers as of write time)

### tests/e2e/03-auth-and-editor.spec.ts

Legend: E = app/editor/editor.js, X = app/editor/index.html, C = app/editor/editor.css, S = app/server.js, P = app/public/index.html,
PJ = app/public/script.js, L = app/public/landing.html, H = tests/e2e/helpers.ts. `\|` inside a table cell is Markdown escaping of `|`.

File-level (applies to every test in the file):
- L24 `test.use({ viewport: PHONE })` -> `PHONE = { width: 390, height: 844 }` (H:152). Base project is devices['Desktop Chrome'] (playwright.config.ts:24), so 390x844 viewport with a desktop UA, no touch, isMobile false, DPR 1. Every second context comes from `phoneContext` (H:197-212), also 390x844.
- Screens are found by `heading(page, name)` = `page.getByRole('heading', { name, exact: true })` (H:168). Today every Editor screen heading is an `<h1>` passed to `render()` (E:146-150). The top bar `#title` (X:13) is a `<div>`, not a heading, and only repeats the text. If it became a heading, every `heading()` call would hit two elements and fail Playwright's strict mode.
- Constants (H:163-167): `SIGN_UP = 'Create your page'`, `LOG_IN = 'Log in'`, `CLAIM = 'Claim your Username'`, `VERIFY = 'Verify your email'`, `EDITOR = 'Edit Profile'`.

Helper-resolved hooks this file depends on (another part inventories the helpers themselves; listed here so the per-test rows can point at them):

| Helper | Resolved hooks (verbatim from helper) | Resolves to |
|---|---|---|
| `signUp` H:170-176 | `page.goto('/edit/signup')`; `page.getByLabel('Email')`; `page.getByLabel('Password')`; `page.getByLabel('Username')`; `page.getByRole('button', { name: 'Create account' })` | route E:278; labels E:362, E:363, E:364 via addressField E:183; button E:366 |
| `logIn` H:178-184 | `page.goto('/edit')`; `heading(page, LOG_IN)`; `page.getByLabel('Email')`; `page.getByLabel('Password')`; `page.getByRole('button', { name: 'Log in' })` | E:283 (no session -> /edit/login); h1 E:327; labels E:322, E:323; button E:325 |
| `forgotPassword` H:187-192 | `page.goto('/edit/login')`; `page.getByRole('link', { name: 'Forgot password?' })`; `page.getByLabel('Email')`; `page.getByRole('button', { name: 'Send reset link' })` | link E:328 (an `<a>` from link() E:236-244); mailForm label E:456; button E:458 with text from E:509 |
| `expectVerifyScreen` H:214-219 | `heading(page, VERIFY)`; `page.getByRole('button', { name: 'Resend email' })`; `page.getByRole('button', { name: 'Continue' })`; `expect(page).toHaveURL(/\/edit\/verify-email$/)` | h1 E:431; buttons E:419, E:430; URL E:262, E:359 |
| `featured` H:341 | `page.getByRole('list', { name: 'Links' }).getByRole('listitem')` | `ul.links[aria-label=Links]` E:848; `li.link-row` E:876. A row's text is only the title (E:877); the Up/Down/Delete buttons carry only an aria-label, and their glyphs are CSS `::before` (C:158-161) |
| `openProfile` H:290-298 | `visitor.waitForResponse(... '/api/profiles/${username}.json')`; `visitor.goto('/${username}')`; `visitor.locator('.link-card .link-title')` toHaveText(titles) | S:67-74; S:262-268; PJ:137, PJ:145 |
| `visitorSees` H:344-346 | openProfile(...) then closes the context | as openProfile |
| `passAgeGate` H:310-325 | `visitor.locator('.link-card', { hasText: title })`; `visitor.locator('#overlay')`; `visitor.getByRole('heading', { name: 'Mature Content Disclaimer' })`; `visitor.route('**/.netlify/functions/reveal?*', ...)`; `visitor.getByRole('button', { name: 'Continue (18+)' })` | PJ:137; P:39; P:44; S:112; P:46 |
| `logInToHandedOver` H:351-359 | phoneContext; logIn; `heading(editor, EDITOR)`; `editor.getByText('${origin}/${username}', { exact: true })`; `editor.getByLabel('Display name')` toHaveValue(displayName); `featured(editor)` toHaveText(titles) | h1 E:810; `.bio-link .value` span E:811 (must be the only element with that exact text); label E:598; E:848/E:876 |
| `phoneContext` H:197-212 | `browser.newContext({ viewport: PHONE, ... })`; with `origin`, routes every other host to abort | viewport 390x844 |
| API-only helpers | `account` H:239-248, `proxy` H:222-232, `upload` H:235-236 (POST `/api/upload/${target}`), `readBack` H:374-381, `verifiedCreator` H:258-274 (displayName 'Before Name', bio 'Before bio.' H:265; Destinations `https://example.com/${username}/${order}` H:269), `servedProfile` H:280-286, `expectServedWebp` H:301-306, `reach` H:329-338, `furnishedCreator` H:365-371, `probe` H:385-401, `refused` H:407, `operator` H:413-415, `recordIds` H:418-423, `ownerOf` H:114-116, `setOwner` H:105-109, `markVerified` H:50-54, `createOwnerlessProfile` H:92-102, `mailedLink` H:68-72, `mailedLinks` H:59-65, `fresh` H:157-160, `pngFile` H:147, `isWebp` H:148, `holdsDestination` H:154, `onLocalStack` H:20, `INSTAGRAM_UA` H:251-253; `withoutBootstrap` tests/e2e/domains-helpers.ts:8 | no page hooks |

---

#### 03-auth-and-editor.spec.ts:L27-L40 "at 390×844 a stranger signs up with no invitation and lands signed in on "verify your email"; Continue keeps them there"  (describe: "sign-up and the claim")
- Pages/surfaces: Editor (sign-up, verify-email), API (Profile JSON)
- Viewport: 390x844 (L24)
- Helpers called: fresh (H:157-160), signUp (H:170-176), expectVerifyScreen (H:214-219)
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 29 | `signUp(page, creator)` | helper (sign-up form) | UI+Behaviour | see signUp row; drawSignup E:332-369 |
| 30, 36, 39 | `expectVerifyScreen(page)` | helper (heading, 2 buttons, URL) | UI+Behaviour | E:431, E:419, E:430; URL E:359 / E:262 |
| 31 | `page.getByRole('main')` `.toContainText(creator.email)` | role + text | UI+Behaviour | `<main class="screen" id="screen">` X:15; email in `<strong>` E:432 |
| 33 | ``request.get(`/api/profiles/${creator.username}.json`)`` status 200 | API | Behaviour | S:67-74 (the claim at sign-up E:357 makes the Profile live) |
| 34 | `page.getByRole('button', { name: 'Continue' })` click | role | UI+Behaviour | E:420-430 |
| 35 | `page.getByText('Your email is not verified yet.')` toBeVisible (substring) | text | UI+Behaviour | E:427 (full text "Your email is not verified yet. Open the link in the email we sent you, then press Continue."), into the status `p` E:408 |
| 38 | `page.goto('/edit')` | URL | Behaviour | S:231; route E:276-286 -> onboarded E:262 |

- Behaviour contract: a sign-up with no invitation signs the Creator in, claims the Username and lands on /edit/verify-email (L29-30). The Profile is public at once (L33). Continue while unverified stays put and says "Your email is not verified yet." (L34-36). The session survives a fresh /edit (L38-39).

#### 03-auth-and-editor.spec.ts:L42-L50 ""Julia" typed into the Username field shows as "julia""  (describe: "sign-up and the claim")
- Pages/surfaces: Editor (sign-up)
- Viewport: 390x844 (L24)
- Helpers called: none
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 43 | `page.goto('/edit/signup')` | URL | UI | S:232; E:278 |
| 44 | `page.getByLabel('Username')` | label (substring) | UI | `<label>` E:183 (addressField: text 'Username' + span `${location.host}/` + input), input E:162-171, placed by drawSignup E:364 |
| 45-46 | `field.fill('Julia')` -> `toHaveValue('julia')` | value | Behaviour | lowercasing listener E:172-178 |
| 47-49 | `field.fill('')`; `field.pressSequentially('JuLia_99')` -> `toHaveValue('julia_99')` | keyboard | Behaviour | E:172-178 |

- Behaviour contract: the Username field lowercases what is typed, both on paste/fill and key by key (L45-49).

#### 03-auth-and-editor.spec.ts:L52-L80 "fixture, edit, ab and bad.name are refused with their reason on the claim step, then a valid Username is claimed"  (describe: "sign-up and the claim")
- Pages/surfaces: Editor (sign-up, claim, verify-email)
- Viewport: 390x844 (L24)
- Helpers called: fresh, signUp, heading (H:168), CLAIM (H:165), expectVerifyScreen
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 54 | `signUp(page, { ...creator, username: 'fixture' })` | helper | UI+Behaviour | E:357-358 (refused claim -> show('/edit/claim')) |
| 55, 62, 75 | `heading(page, CLAIM)` -> `getByRole('heading', { name: 'Claim your Username', exact: true })` | role | UI | h1 E:394 |
| 56 | `expect(page).toHaveURL(/\/edit\/claim$/)` | URL | UI+Behaviour | E:358; E:261 |
| 57 | `page.getByRole('status')` (must be the only status on the screen) | role | UI | message() E:152-154, created E:378 |
| 58 | `toContainText('“fixture” is taken')` (curly quotes U+201C/U+201D) | text | UI+Behaviour | E:209 claimReason, for PocketBase `validation_not_unique` |
| 59 | `toContainText('the Operator hands over Usernames held on v1 at Cutover')` | text | UI+Behaviour | E:209 |
| 61 | `page.reload()` -> heading CLAIM | reload | Behaviour | route -> onboarded E:261 (no Profile -> claim) |
| 63 | `page.getByLabel('Username')` | label | UI | addressField E:183 in drawClaim E:391 |
| 65 | `['edit', '“edit” is reserved']` | text | UI+Behaviour | E:220 (inferred from a bare 400) |
| 66 | `['ab', 'Too short']` | text | UI+Behaviour | E:211 (`validation_min_text_constraint` from PocketBase) |
| 67 | `['bad.name', 'Not allowed: a Username has only lowercase letters, digits and underscore']` | text | UI+Behaviour | E:215 (`validation_invalid_format`) |
| 68 | `['a'.repeat(31), 'Too long']` | text | UI+Behaviour | E:213 (`validation_max_text_constraint`) |
| 69 | `['fixture', 'is taken']` | text | UI+Behaviour | E:209 |
| 72, 77 | `field.fill(name)` / `field.fill(creator.username)` | input | Behaviour | input has no maxlength or pattern (E:163-171) |
| 73, 78 | `page.getByRole('button', { name: 'Claim' })` click | role | UI | E:393 |
| 74 | `expect(reason, name).toContainText(text)` | text | Behaviour | say() E:156-159 called E:387 |
| 79 | `expectVerifyScreen(page)` | helper | Behaviour | E:388 onboard -> E:262 |

- Behaviour contract: a refused claim at sign-up lands on /edit/claim with its reason, still signed in, and a reload stays there (L54-62). Each refusal shows the server-derived reason and stays on the claim step (L64-76). A valid claim then lands on verify (L77-79).

#### 03-auth-and-editor.spec.ts:L82-L97 "logging in again in a fresh context lands on the verify screen; after a failed claim, on the claim step"  (describe: "sign-up and the claim")
- Pages/surfaces: Editor (sign-up, claim, log-in, verify)
- Viewport: 390x844 (L24); second contexts by phoneContext 390x844 (L91)
- Helpers called: fresh, signUp, expectVerifyScreen, heading, CLAIM, VERIFY (H:166), phoneContext (H:197-212), logIn (H:178-184)
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 84, 87 | `signUp(page, claimed)`; `signUp(page, { ...unclaimed, username: 'edit' })` | helper | Behaviour | E:340 (a new sign-up signs out the old session) |
| 85 | `expectVerifyScreen(page)` | helper | UI+Behaviour | as above |
| 88 | `heading(page, CLAIM)` | role | UI | E:394 |
| 91 | `phoneContext(browser)` | viewport 390x844 | — | H:197-212 |
| 93 | `logIn(second, creator)` | helper | UI+Behaviour | E:304-330 |
| 94 | `heading(second, step)`, step ∈ `VERIFY` ('Verify your email'), `CLAIM` ('Claim your Username') | role | UI+Behaviour | E:431; E:394; landing chosen by onboard E:250-268 |

- Behaviour contract: log-in lands on the first Onboarding step that applies, worked out from the records: claimed but unverified -> verify; no Profile after a failed claim -> claim (L90-96).

#### 03-auth-and-editor.spec.ts:L99-L106 "/edit with no session shows log-in, which links to sign-up"  (describe: "sign-up and the claim")
- Pages/surfaces: Editor (log-in, sign-up)
- Viewport: 390x844 (L24)
- Helpers called: heading, LOG_IN (H:164), SIGN_UP (H:163)
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 100 | `page.goto('/edit')` | URL | — | S:231 |
| 101 | `expect(page).toHaveURL(/\/edit\/login$/)` | URL | UI+Behaviour | E:283 `show('/edit/login', drawLogin)` (history.replaceState E:227) |
| 102 | `heading(page, LOG_IN)` -> 'Log in' exact | role | UI | E:327 |
| 103 | `page.getByRole('link', { name: 'Sign up' })` click | role (must be a link) | UI | E:329 `link('Sign up', '/edit/signup')`, an `<a>` E:236-244 |
| 104 | `heading(page, SIGN_UP)` -> 'Create your page' | role | UI | E:367 |
| 105 | `expect(page).toHaveURL(/\/edit\/signup$/)` | URL | UI+Behaviour | go() pushState E:231-234 |

- Behaviour contract: no session -> /edit/login (L100-102). Sign up is a link to /edit/signup (L103-105).

#### 03-auth-and-editor.spec.ts:L109-L117 "in a fresh context the landing page's "Create Your Own Page" opens the sign-up screen, and no n8n Form link remains"  (describe: -)
- Pages/surfaces: Landing, Editor (sign-up)
- Viewport: 390x844 (L24)
- Helpers called: heading, SIGN_UP
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 110 | `page.goto('/landing.html')` | URL | UI | S:262-264 (static file under app/public) -> L |
| 111 | `page.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href') \|\| ''))` | DOM read | Behaviour | L:40 (`/edit/signup`), L:49 (YouTube) |
| 112 | `expect(hrefs.some((h) => h.includes('n8n'))).toBe(false)` | negative | Behaviour | no anchor href contains n8n today |
| 113 | `page.getByText('Powered by n8n & Git & Netlify')` toBeVisible | text | UI | L:44 `span.link-subtitle` |
| 114 | `page.getByRole('link', { name: /Create Your Own Page/ })` click | role + case-sensitive regex | UI | `<a href="/edit/signup" class="link-card">` L:40-47; its name comes from `span.link-title` L:43 |
| 115 | `heading(page, SIGN_UP)` | role | UI | E:367 |
| 116 | `page.getByLabel('Username')` toBeVisible | label | UI | E:364/E:183 |

- Behaviour contract: the landing CTA opens /edit/signup (L114-116). No link points at an n8n Form (L111-112). The visible text "Powered by n8n & Git & Netlify" is asserted to stay (L113).

#### 03-auth-and-editor.spec.ts:L120-L137 "every reserved name is refused as a claim, each top-level route of 3 or more characters the app serves included"  (describe: "rules and the proxy, over HTTP at the public origin")
- Pages/surfaces: API-only / no page hooks (spawns `node app/bin/reserved-usernames`)
- Viewport: n/a. Helpers called: account (H:239-248), proxy (H:222-232)
- Behaviour contract: every reserved name -> 400 with `data: {}` (L129-133). That bare 400 is what E:220 reads as "reserved". The same account can still claim (L135-136). Any new top-level route the app serves would join the list.

#### 03-auth-and-editor.spec.ts:L139-L163 "the claim sets only Username, owner and default Mode, for the Creator alone, once"  (describe: "rules and the proxy, over HTTP at the public origin")
- Pages/surfaces: API-only / no page hooks
- Helpers called: account, proxy, fresh
- Behaviour contract: only `{ username, owner, mode }` claims are accepted, once, for oneself (L144-156). This pins the Editor's claim body E:373. A sign-up with anything beyond `email, password, passwordConfirm` is refused (L158-162). This pins the sign-up body E:343.

#### 03-auth-and-editor.spec.ts:L165-L202 "_superusers and /api/realtime answer 404 at the public origin, while the same Creator's calls through the proxy succeed"  (describe: "rules and the proxy, over HTTP at the public origin")
- Pages/surfaces: API-only / no page hooks
- Helpers called: account, proxy, withoutBootstrap (tests/e2e/domains-helpers.ts:8)
- Behaviour contract: the proxy allow-list `PROXIED` S:200, the encoded-slash guard S:205, and every other /api path's `{ error: 'Not found' }` 404 S:226 (L183-199). The Editor's own calls `users/auth-refresh` (E:101, E:124) and `users/request-verification` (E:356, E:414) succeed through it (L172-173). `/_/` must equal app/public/index.html byte for byte, minus the bootstrap block S:259-268 (L201). Any new Editor network call has to stay on the allowed paths.

#### 03-auth-and-editor.spec.ts:L208-L229 "over HTTP an unverified Creator's token cannot update its Profile, add a Link or upload an avatar; the owner reads both back unchanged"  (describe: "the verified-email gate")
- Pages/surfaces: API-only / no page hooks
- Helpers called: account, proxy, readBack (H:374-381), upload (H:235-236)
- Behaviour contract: an unverified owner's PATCH answers 404, a Link create 400, an avatar upload 404, and nothing changes (L218-228). These are the bare refusals the Editor's linkReason E:640-645 interprets.

#### 03-auth-and-editor.spec.ts:L235-L371 "at 390×844 a verified Creator goes through Onboarding to a live Profile whose Links act like imported ones"  (describe: "Onboarding after verification"; `test.skip(!onLocalStack(), ...)` L233)
- Pages/surfaces: Editor (sign-up, verify-email, /edit/verify, Profile step, first-Link, live, home, Add link), Profile (Visitor), Screenshot
- Viewport: 390x844 (L24); the Visitor context comes from phoneContext 390x844 (L322)
- Helpers called: fresh, signUp, expectVerifyScreen, mailedLink (H:68-72), heading, pngFile (H:147), proxy, phoneContext, isWebp (H:148), passAgeGate (H:310-325)
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 244 | `page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin })` | permission | Behaviour | Copy uses `navigator.clipboard.writeText` E:751 |
| 246-247 | `signUp(page, creator)`; `expectVerifyScreen(page)` | helper | UI+Behaviour | as above |
| 248 | ``page.goto(await mailedLink(creator.email, '/edit/verify'))`` | URL (mailed) | Behaviour | template `{APP_URL}/edit/verify?token={TOKEN}` pocketbase/pb_migrations/1791140006_email_links.js:15; route E:280 -> drawVerified E:470-475 |
| 249 | `heading(page, 'Email verified')` | role | UI | E:473 |
| 250 | `page.getByRole('button', { name: 'Continue' })` | role | UI | E:474 (go('/edit')) |
| 253, 257 | `heading(page, 'Your Profile')` | role | UI | E:617 |
| 254 | `expect(page).toHaveURL(/\/edit\/profile$/)` | URL | UI+Behaviour | E:263 |
| 255, 261 | `page.getByRole('button', { name: 'Continue' })` (the Profile step's submit) | role | UI | E:611 with button 'Continue' E:618 |
| 256 | `page.getByRole('status')` `toHaveText('Enter a display name.')` (full text) | role + text | UI+Behaviour | E:583; status E:572 (the only status on the screen) |
| 258 | `page.getByLabel('Display name')` fill | label | UI | E:598 (input E:569) |
| 259 | `page.getByLabel('Bio')` fill | label | UI | E:599 (textarea E:570) |
| 260 | `page.getByLabel('Profile picture').setInputFiles(pngFile('avatar.png', [200, 40, 40]))` | file chooser | UI+Behaviour | E:609, fileInput E:532-534 (accept E:515) |
| 264 | `heading(page, 'Add your first Link')` | role | UI | E:738 (onboarding E:656) |
| 265 | `expect(page).toHaveURL(/\/edit\/first-link$/)` | URL | UI+Behaviour | E:266 |
| 266-267 | `page.getByLabel('Mode')` `toHaveValue('')` | label + value | UI+Behaviour | label E:732; select E:670 (option value '') |
| 268 | `mode.locator('option:checked')` `toHaveText('Profile default (currently Escape)')` | option text | UI+Behaviour | E:670 with MODE_NAMES E:516, profileMode E:669 |
| 269 | `page.getByLabel('Title').fill('Adult card')` | label | UI | E:726 (input E:658) |
| 270 | `page.getByLabel('Destination').fill(adultDestination)` | label | UI | E:727 (input E:659) |
| 271 | `page.getByLabel('Icon').selectOption({ label: 'OnlyFans' })` | label + option label | UI | E:728; ICONS E:522-528 (E:524) |
| 272 | `page.getByLabel('Background image').setInputFiles(pngFile('background.png', [40, 40, 200]))` | file chooser | UI+Behaviour | E:729 (input E:665); uploaded after the save E:719 |
| 273 | `page.getByLabel('18+ Age Gate').check()` | checkbox label | UI | check() E:542-545 used at E:668 (`label.check` wrapping the checkbox) |
| 274 | `mode.selectOption({ label: 'Escape' })` | option label | UI | E:516 |
| 275 | `page.getByLabel('OnlyFans tracking').check()` | checkbox label | UI | E:671 |
| 276 | `page.getByLabel('Default Tracking Code').fill('7')` | label | UI | E:734 (input E:672) |
| 277 | `page.getByRole('button', { name: 'Save link' })` | role | UI | E:737 |
| 280 | `heading(page, 'Your page is live')` | role | UI | E:763 (show('/edit/live') E:722) |
| 281 | `page.getByText(address, { exact: true })` (address = `${origin}/${username}`) | exact text | UI+Behaviour | `p.live-address` E:765; address() E:530 |
| 282 | `page.getByRole('link', { name: 'Open' })` `toHaveAttribute('href', address)` | role + attr | UI+Behaviour | `<a class="button">` E:768 |
| 283 | `page.getByRole('button', { name: 'Copy' })` click | role (substring) | UI | copyButton E:745-758 at E:769 |
| 284 | `page.getByRole('status')` `toHaveText('Copied.')` | role + text | UI+Behaviour | E:752; status E:762 |
| 285 | `page.evaluate(() => navigator.clipboard.readText())` toBe(address) | clipboard | Behaviour | E:751 |
| 288 | `page.getByRole('button', { name: 'Go to the Editor' })` | role | UI | E:770 (onclick route) |
| 289, 300, 305 | `heading(page, 'Edit Profile')` | role | UI | E:810 |
| 290-291 | `page.getByRole('list', { name: 'Links' }).getByRole('listitem')` `toHaveText(['Adult card'])` | role list + items | UI+Behaviour | E:848 / E:876-880 (row text = title only) |
| 292 | `page.getByRole('button', { name: 'Add link' })` | role | UI | E:820-826 (pushState '/edit/add-link' E:823) |
| 293 | `heading(page, 'Add link')` | role | UI | E:738 |
| 294 | `page.getByLabel('Mode').locator('option:checked')` `toHaveText('Profile default (currently Escape)')` | option text | UI+Behaviour | E:670 |
| 295-297 | `getByLabel('Title').fill('Direct card')`; `getByLabel('Destination').fill(directDestination)`; `getByLabel('Mode').selectOption({ label: 'Direct' })` | labels | UI | E:726, E:727, E:732/E:516 |
| 298 | `page.getByLabel('18+ Age Gate')` `not.toBeChecked()` | checkbox state | Behaviour | BLANK_LINK E:654 |
| 299 | `getByRole('button', { name: 'Save link' })` | role | UI | E:737 |
| 301 | `rows` `toHaveText(['Adult card', 'Direct card'])` | list order | UI+Behaviour | new order = max+1, E:675; list sorted by order E:273 |
| 302 | `page.screenshot({ path: join(ROOT, '.scratch', 'goal_ai', 'shots', '03-auth-and-editor.png'), fullPage: true })` | screenshot (artefact, no assertion) | — | whole Editor home at 390 wide |
| 304 | `page.goto('/edit')` -> heading 'Edit Profile' | URL | Behaviour | onboard E:250-253 -> show('/edit/home') |
| 308 | `page.evaluate(() => localStorage.getItem('ofl.token'))` | storage key | UI+Behaviour | `TOKEN = 'ofl.token'` E:32, set E:81 |
| 309-319 | stored Profile/Link values read through the proxy | API | Behaviour | Link FormData E:687-711; Profile PATCH E:584 |
| 330 | ``visitor.waitForResponse((res) => new URL(res.url()).pathname === `/api/profiles/${creator.username}.json`)`` | network | Behaviour | S:67-74 |
| 331 | ``visitor.goto(`/${creator.username}`)`` | URL | — | S:262-268 |
| 333 | `visitor.locator('#displayName')` `toHaveText('Onboarding Creator')` | id | UI | P:20; PJ:115 |
| 334 | `visitor.locator('.link-card .link-title')` `toHaveText(['Adult card', 'Direct card'])` | class | UI | PJ:137, PJ:145 |
| 335 | `visitor.locator('#avatar')` `toHaveAttribute('src', served.profile.avatarUrl)` | id + attr | UI | P:17; PJ:117 |
| 346-347 | stock icon bytes equal `app/public/images/onlyicon.webp` | API | Behaviour | Editor fetches ``/images/${icon.value}`` E:704-709 |
| 357-359 | ``request.get(`/r/${directId}`, { maxRedirects: 0 })`` 302 | API | Behaviour | S:81-89 |
| 365 | `passAgeGate(visitor, 'Adult card', expected)` | helper (Profile overlay) | UI+Behaviour | P:39, P:44, P:46; S:112 |

- Behaviour contract: the verify link shows "Email verified", and Continue goes on to the Profile step at /edit/profile (L248-254). The Profile step refuses an empty display name with exactly "Enter a display name." and stays (L255-257). The avatar picked there is uploaded on Continue (L260-261, L310). The first-Link step at /edit/first-link is the Link form, starting on '' "Profile default (currently Escape)" (L264-268). The live screen shows the address, Open links to it, Copy says "Copied." and puts it on the clipboard (L280-285). "Go to the Editor" shows the Links list in order. "Add link" opens the same form with Mode '' and the Age Gate unchecked (L288-301). Progress is worked out from the records, so /edit lands in the Editor (L304-305). The stored values are pinned exactly: order 0/1, isAdult, mode 'escape_ig'/'direct', tracking, Tracking Code '7'/'', icon and background set vs '' (L310-319). The Visitor sees the display name, the titles in order and the avatar; every image is WebP; no Destination is sent before a press; /r answers 302; Reveal answers the Destination + /c7 (L321-369).

#### 03-auth-and-editor.spec.ts:L379-L455 "at 390×844 the Creator copies the Bio Link, edits display name and bio, replaces the avatar; Username read-only, no badge control"  (describe: "the Editor's Profile and default Mode"; skip off local stack L377)
- Pages/surfaces: Editor (home), Profile (Visitor)
- Viewport: 390x844 (L24); the Visitor comes from openProfile/phoneContext 390x844
- Helpers called: verifiedCreator (H:258-274), upload, pngFile, servedProfile (H:280-286), logIn, heading, openProfile (H:290-298), expectServedWebp (H:301-306)
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 390 | `grantPermissions(['clipboard-read', 'clipboard-write'], { origin })` | permission | Behaviour | E:751 |
| 391 | `logIn(page, creator)` | helper | UI+Behaviour | E:304-330 |
| 392 | `heading(page, 'Edit Profile')` | role | UI | E:810 |
| 393 | `expect(page).toHaveURL(/\/edit\/home$/)` | URL | UI+Behaviour | E:252 |
| 396 | `page.locator('.bio-link')` | class | UI | E:811 |
| 397 | `bioLink.locator('.label')` `toHaveText('Your Bio Link')` | class + text | UI | E:811 `span.label` |
| 398 | `bioLink.locator('.value')` `toHaveText(address)` | class + text | UI+Behaviour | E:811 `span.value` = address() E:530 (full origin + /username) |
| 399 | `page.getByRole('button', { name: 'Copy', exact: true })` click | role exact | UI | E:812 copyButton E:745-758 |
| 400 | `page.getByText('Copied.', { exact: true })` toBeVisible | exact text | UI+Behaviour | E:752 into `copied` E:793 |
| 401 | `page.evaluate(() => navigator.clipboard.readText())` toBe(address) | clipboard | Behaviour | E:751 |
| 404 | `page.getByRole('textbox', { name: 'Username', exact: true })` | role exact | UI | label E:605 ('Username' + aria-hidden '@' span), input E:601 |
| 405 | `toHaveValue(creator.username)` | value | Behaviour | E:601 |
| 406 | `not.toBeEditable()` | state | Behaviour | `readOnly: true` E:601 |
| 407 | `page.getByRole('main')` `not.toContainText(/badge\|verified/i)` | negative text over the whole main | UI+Behaviour | X:15; no such text in drawHome E:792-828 |
| 408-409 | `page.locator('main').locator('input, select, textarea, button').evaluateAll((nodes) => nodes.map((n) => [n.getAttribute('name'), n.id, n.getAttribute('aria-label'), n.textContent].join(' ')))` | DOM read | UI+Behaviour | all controls in X:15 |
| 410 | `expect(controls.length).toBeGreaterThan(0)` | count | — | — |
| 411 | `controls.filter((c) => /badge\|verif/i.test(c))` toEqual([]) | negative | Behaviour | no control named/id'd/labelled/texted badge or verif |
| 414 | `page.getByLabel('Display name', { exact: true })` | label exact | UI | E:598 |
| 415 | `page.getByLabel('Bio', { exact: true })` | label exact | UI | E:599 |
| 416-417 | `toHaveValue('Before Name')`; `toHaveValue('Before bio.')` | value | Behaviour | values from H:265, filled E:569-570 |
| 418-420 | `displayName.fill('Not saved')`; `page.reload()`; `toHaveValue('Before Name')` | reload | Behaviour | no autosave or draft (E:794 saves only on submit) |
| 423, 440 | `page.getByRole('button', { name: 'Save profile' })` | role | UI | E:611 with button 'Save profile' E:794 |
| 424, 448 | `page.getByText('Profile saved.', { exact: true })` toBeVisible | exact text | UI+Behaviour | E:794 done() into the panel status E:572 |
| 427 | `openProfile(browser, origin, creator.username, ['First card'])` | helper (Profile) | UI | PJ:137/145 |
| 428 | `visitor.locator('#displayName')` `toHaveText('After Name')` | id | UI | P:20, PJ:115 |
| 429 | `visitor.locator('#bio')` `toHaveText('After bio, from the Editor.')` | id | UI | P:24, PJ:116 |
| 435-436 | `page.on('request', countUpload)`, counting pathname `startsWith('/api/upload/')` | network | Behaviour | E:68 upload() POSTs ``/api/upload/${collection}/${recordId}/${field}``; S:161 |
| 437 | `page.getByLabel('Change Profile Picture').setInputFiles(pngFile('second.png', [40, 200, 40]))` | file chooser | UI+Behaviour | E:603 label, input E:571 |
| 438-439 | no upload and no avatar change on pick | negative | Behaviour | upload only in onsubmit E:586-594 |
| 441 | `expect.poll(() => uploads, ...).toBe(1)` | network count | Behaviour | exactly one upload per save E:589 |
| 449 | `page.locator('img.avatar')` `toHaveAttribute('src', after)` | tag.class + attr | UI+Behaviour | `img.avatar` E:573, src from showAvatar(res.url) E:593/E:576; S:188 |
| 450 | `expectServedWebp(request, after)` | API | Behaviour | S:129 |
| 452 | `displayName` `toHaveValue('After Name')` | value | Behaviour | E:585 |

- Behaviour contract: "Your Bio Link" shows the full public address, and Copy puts exactly that on the clipboard with "Copied." (L396-401). The Username is shown read-only with its value (L404-406). No badge or "verified" text or control anywhere in `<main>` (L407-411). Only the panel's own "Save profile" button saves; there is no autosave, so an unsaved edit is gone after a reload (L418-420). The public Profile shows the saved name and bio (L427-429). Picking a picture uploads nothing; Save uploads exactly once and updates `img.avatar` (L434-449). The same save also keeps the name and bio (L452-454).

#### 03-auth-and-editor.spec.ts:L457-L499 "the default Mode set in Quick Settings decides the Escape Overlay on open and moves only the Links left on "Profile default""  (describe: "the Editor's Profile and default Mode"; skip off local stack L377)
- Pages/surfaces: Editor (home, Add link), Profile (Visitor, Instagram UA)
- Viewport: 390x844 (L24); the Visitor comes from openProfile/phoneContext 390x844 with `INSTAGRAM_UA` (H:251-253)
- Helpers called: verifiedCreator, openProfile, INSTAGRAM_UA, servedProfile, logIn, heading
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 461 | `openProfile(browser, origin, creator.username, ['Default card', 'Escape card'], INSTAGRAM_UA)` | helper (Profile) | UI | PJ:137/145 |
| 465 | `visitor.locator('#igOverlay')` toBeVisible | id | UI+Behaviour | P:51; shown PJ:335 |
| 471 | `logIn(page, creator)` | helper | — | — |
| 472, 487 | `heading(page, 'Edit Profile')` | role | UI | E:810 |
| 473 | `page.getByRole('heading', { name: 'Quick Settings' })` toBeVisible (not exact) | role | UI | `h2` E:815 |
| 474 | `page.getByLabel('Default Mode')` | label | UI | E:804, select E:796 |
| 475 | `toHaveValue('escape_ig')` | option value | UI+Behaviour | MODE_NAMES keys E:516 |
| 476 | `mode.locator('option')` `toHaveText(['Direct', 'Escape', 'Deeplink'])` (exact set and order) | option texts | UI+Behaviour | E:516 via E:796 |
| 477 | `mode.selectOption({ label: 'Direct' })` | option label | UI | E:516 |
| 478 | `page.getByRole('button', { name: 'Save default Mode' })` | role | UI | E:807 |
| 479 | `page.getByText('Default Mode saved.', { exact: true })` toBeVisible | exact text | UI+Behaviour | E:801 |
| 482, 489 | `page.getByRole('button', { name: 'Add link' })` | role | UI | E:820-826 |
| 483 | `heading(page, 'Add link')` | role | UI | E:738 |
| 484 | `page.getByLabel('Mode')` `toHaveValue('')` | label + value | UI+Behaviour | E:732/E:670 |
| 485, 490 | `page.getByLabel('Mode').locator('option:checked')` `toHaveText('Profile default (currently Direct)')` | option text | UI+Behaviour | E:670 with the in-memory profile updated E:557 (L485), re-read after Cancel (L490) |
| 486 | `page.getByRole('button', { name: 'Cancel' })` | role | UI | E:740 (onclick route = re-read) |
| 488 | `page.getByLabel('Default Mode')` `toHaveValue('direct')` | value | Behaviour | E:796 |
| 494 | `visitor.locator('#igOverlay')` toBeHidden | id | UI+Behaviour | P:51 class `hidden` |

- Behaviour contract: the default Mode is saved only by "Save default Mode", which says "Default Mode saved." (L477-479). A new Link starts on '' and its option names the current default, both from memory and after a re-read (L482-490). With the default on Direct there is no Escape Overlay in Instagram. Only Links left on "Profile default" follow the default; an explicit Escape Link keeps Escape (L493-498).

#### 03-auth-and-editor.spec.ts:L507-L586 "at 390×844 a title edit, a background replaced then removed, a Link added then moved up, and a confirmed delete each show on the next load"  (describe: "the Editor's Links"; skip off local stack L505)
- Pages/surfaces: Editor (home, Edit link, Add link), Profile (Visitor, via visitorSees)
- Viewport: 390x844 (L24)
- Helpers called: verifiedCreator, upload, pngFile, servedProfile, logIn, heading, featured (H:341), visitorSees (H:344-346), expectServedWebp
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 523, 532, 541, 550, 559 | `heading(page, 'Edit Profile')` | role | UI | E:810 |
| 524 | `featured(page)` `toHaveText(['First card', 'Second card'])` | list items | UI+Behaviour | E:848/E:876 |
| 527 | `page.getByRole('button', { name: 'First card', exact: true })` click | role exact (row's title button) | UI | `button.link-row-title` E:877 -> openLink E:887-892 (pushState '/edit/link') |
| 528, 538 | `heading(page, 'Edit link')` | role | UI | E:738 |
| 529 | `page.getByLabel('Title')` `toHaveValue('First card')` | label + value | Behaviour | E:658 (filled from the opened record) |
| 530-531 | `getByLabel('Title').fill('Edited card')`; `getByRole('button', { name: 'Save link' })` | label, role | UI | E:726, E:737 |
| 533 | `featured(page)` `toHaveText(['Edited card', 'Second card'])` | list | UI+Behaviour | E:876 |
| 534, 552, 561, 566, 581, 585 | `visitorSees(browser, origin, creator.username, [...titles])` | helper (Profile `.link-card .link-title`) | UI+Behaviour | PJ:137/145 |
| 537, 547 | `page.getByRole('button', { name: 'Edited card', exact: true })` | role exact | UI | E:877 |
| 539 | `page.getByLabel('Background image').setInputFiles(pngFile('second.png', [40, 200, 40]))` | file chooser | UI+Behaviour | E:729; upload after the PATCH E:719 |
| 548 | `page.getByLabel('Remove background').check()` | checkbox label | UI+Behaviour | E:667 (shown only when the Link has a background), E:730; empty field sent E:696 |
| 555 | `page.getByRole('button', { name: 'Add link' })` | role | UI | E:820-826 |
| 556-558 | `getByLabel('Title').fill('Third card')`; ``getByLabel('Destination').fill(`https://example.com/${creator.username}/third`)``; Save link | labels | UI | E:726, E:727, E:737 |
| 560 | `featured(page)` `toHaveText(['Edited card', 'Second card', 'Third card'])` | list | Behaviour | order = max+1 E:675 |
| 562 | `page.getByRole('button', { name: 'Move Edited card up' })` toBeDisabled | role (aria-label) + disabled | UI+Behaviour | `aria-label` ``Move ${link.title} up`` E:878, `disabled: i === 0` |
| 563 | `page.getByRole('button', { name: 'Move Third card down' })` toBeDisabled | role + disabled | UI+Behaviour | E:879, `disabled: i === items.length - 1` |
| 564 | `page.getByRole('button', { name: 'Move Third card up' })` click | role (mouse click) | UI+Behaviour | E:878 -> move() E:856-863 (two PATCHes, then reload) |
| 565, 569 | `featured(page)` `toHaveText(['Edited card', 'Third card', 'Second card'])` | list | Behaviour | reload from PocketBase E:851-855 |
| 568 | `page.reload()` | reload | Behaviour | route -> home |
| 573-576 | `page.once('dialog', (dialog) => { asked.push(dialog.message()); return dialog.dismiss(); })` | native dialog | UI+Behaviour | `window.confirm(`Delete “${link.title}”? It goes from your page at once.`)` E:868 |
| 577, 583 | `page.getByRole('button', { name: 'Delete Second card' })` click | role (aria-label) | UI | ``aria-label `Delete ${link.title}` `` E:880 |
| 578-579 | `expect.poll(() => asked.length).toBe(1)`; `expect(asked[0]).toContain('Second card')` | dialog message | UI+Behaviour | E:868 |
| 580 | `featured(page)` unchanged after dismiss | list | Behaviour | E:868 returns early |
| 582 | `page.once('dialog', (dialog) => dialog.accept())` | native dialog | Behaviour | E:868-872 |
| 584 | `featured(page)` `toHaveText(['Edited card', 'Third card'])` | list | Behaviour | E:870-872 |

- Behaviour contract: a row's title opens the Link form with the current values (L527-529). The edits, the background replacement (a new WebP) and its removal ('') all reach the public page (L530-552). A new Link goes last (L560). Reordering is by per-row "Move <title> up/down" buttons pressed with a mouse click, never drag or keyboard. The first row's Up and the last row's Down are disabled (L562-563). A move swaps neighbours, and the order persists in PocketBase across a reload (L564-569). Delete asks first in a native `confirm()` naming the Link: dismiss keeps it, accept removes it from the Editor and the page (L571-585).

#### 03-auth-and-editor.spec.ts:L588-L600 "a move whose second write fails shows the reason and reloads the list from PocketBase, matching the page's order"  (describe: "the Editor's Links"; skip off local stack L505)
- Pages/surfaces: Editor (home), Profile (visitorSees)
- Viewport: 390x844 (L24)
- Helpers called: verifiedCreator, logIn, featured, visitorSees
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 593 | `featured(page)` `toHaveText(['A card', 'B card'])` | list | UI | E:848/E:876 |
| 596 | `page.getByRole('button', { name: 'Move A card down' })` click | role (aria-label) | UI+Behaviour | E:879 -> move() E:856-863 |
| 597 | `page.getByText(/^The move failed: /)` toBeVisible | regex text (prefix-anchored) | UI+Behaviour | E:861 `The move failed: ${...}. The list shows your page's order.` into featured.status E:849 |
| 598 | `featured(page)` `toHaveText(['A card'])` | list | Behaviour | reload E:862, E:851-855 |
| 599 | `visitorSees(browser, origin, creator.username, ['A card'])` | helper | Behaviour | PJ:137/145 |

- Behaviour contract: when a move's second write fails, the reason shows, starting with "The move failed: ". The list is then re-read from PocketBase so it matches the public order (L596-599).

#### 03-auth-and-editor.spec.ts:L602-L628 "reopening a Link shows its current Destination, and after the Creator changes it Reveal answers the new one"  (describe: "the Editor's Links"; skip off local stack L505)
- Pages/surfaces: Editor (home, Edit link), Profile (Visitor)
- Viewport: 390x844 (L24)
- Helpers called: verifiedCreator, proxy, logIn, heading, openProfile, passAgeGate
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 613, 621 | `page.getByRole('button', { name: 'Adult card', exact: true })` click | role exact | UI | E:877 -> openLink E:887-892 (full record read E:888) |
| 614 | `heading(page, 'Edit link')` | role | UI | E:738 |
| 615-616 | `page.getByLabel('Destination')`; `destination.inputValue() === current` | label + value (boolean) | Behaviour | E:659 `value: current.destination` |
| 617 | `page.getByLabel('18+ Age Gate')` toBeChecked | checkbox state | Behaviour | E:668 |
| 618-619 | `destination.fill(changed)`; `getByRole('button', { name: 'Save link' })` | label, role | UI | E:727, E:737 |
| 620 | `heading(page, 'Edit Profile')` | role | UI | E:810 (onboard E:723) |
| 622 | `page.getByLabel('Destination').inputValue() === changed` | value | Behaviour | E:659 |
| 625 | `openProfile(browser, origin, creator.username, ['Adult card'])` | helper | UI | PJ |
| 626 | `passAgeGate(visitor, 'Adult card', changed)` | helper | Behaviour | P:39/44/46; S:112 |

- Behaviour contract: an opened Link shows its stored Destination and Age Gate state. A changed Destination is saved, shown on reopening, and returned by Reveal (L613-626).

#### 03-auth-and-editor.spec.ts:L630-L674 "every field of an opened Link changes: an icon from no stock file stays, then stock icons, Adult flag, Mode, tracking and default Tracking Code reach the page"  (describe: "the Editor's Links"; skip off local stack L505)
- Pages/surfaces: Editor (home, Edit link); API (served JSON)
- Viewport: 390x844 (L24)
- Helpers called: verifiedCreator, upload, pngFile, servedProfile, logIn, heading
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 643, 655, 665 | `page.getByRole('button', { name: 'Plain card', exact: true })` click | role exact | UI | E:877 |
| 644, 656 | `page.getByLabel('Icon').locator('option:checked')` `toHaveText('Current icon')` | option text | UI+Behaviour | E:664 (`['current', 'Current icon']` added when the icon was not made from a stock file, E:662-663) |
| 645 | `page.getByLabel('18+ Age Gate').check()` | checkbox | UI | E:668 |
| 646 | `page.getByLabel('Mode').selectOption({ label: 'Direct' })` | option label | UI | E:516/E:670 |
| 647 | `page.getByLabel('OnlyFans tracking').check()` | checkbox | UI | E:671 |
| 648 | `page.getByLabel('Default Tracking Code').fill('42')` | label | UI | E:734 |
| 649, 662, 670 | `page.getByRole('button', { name: 'Save link' })` | role | UI | E:737 |
| 650, 663, 671 | `heading(page, 'Edit Profile')` | role | UI | E:810 |
| 652 | served `[icon, isAdult, mode, tracking, default_tracknumber]` = `[ownIcon, true, 'direct', true, '42']` | API | Behaviour | icon unsent when unchanged E:701 |
| 657 | `page.getByLabel('18+ Age Gate')` toBeChecked | state | Behaviour | E:668 |
| 658 | `page.getByLabel('Mode').locator('option:checked')` `toHaveText('Direct')` | option text | UI+Behaviour | E:670 |
| 659 | `page.getByLabel('OnlyFans tracking')` toBeChecked | state | Behaviour | E:671 |
| 660 | `page.getByLabel('Default Tracking Code')` `toHaveValue('42')` | value | Behaviour | E:672 |
| 661 | `page.getByLabel('Icon').selectOption({ label: 'Instagram' })` | option label | UI | ICONS E:527 |
| 664 | stored icon bytes equal `app/public/images/igicon.webp` | API | Behaviour | E:704-709 (fetch `/images/igicon.webp`, sent as a File) |
| 666 | `page.getByLabel('Icon').locator('option:checked')` `toHaveText('Instagram')` | option text | UI+Behaviour | stock detection from the file-name prefix E:662 |
| 667 | `page.getByLabel('Icon').selectOption({ label: 'None' })` | option label | UI | E:523; sends `icon: ''` E:702 |
| 668 | `page.getByLabel('18+ Age Gate').uncheck()` | checkbox | UI | E:668 |
| 669 | `page.getByLabel('Mode').selectOption({ label: 'Profile default (currently Escape)' })` | option label (full text) | UI+Behaviour | E:670 |
| 673 | served `[icon, isAdult, mode]` = `['', false, 'escape_ig']` | API | Behaviour | E:691 (an empty mode stores no Mode) |

- Behaviour contract: an icon not made from a stock file shows as "Current icon" and survives a save that changes other fields (L644-652). Every other field round-trips into the form and the served JSON (L655-660). A stock icon is stored byte for byte from /images (L661-664) and recognised again on reopening (L666). "None" clears the icon, and "Profile default" stores no Mode, which serves as the Profile's (L667-673).

#### 03-auth-and-editor.spec.ts:L676-L720 "invalid Geo Rule JSON is refused and leaves the Link unchanged; a valid object saves and fills the textarea after a reload; emptying clears it"  (describe: "the Editor's Links"; skip off local stack L505)
- Pages/surfaces: Editor (home, Edit link); API
- Viewport: 390x844 (L24)
- Helpers called: verifiedCreator, proxy, logIn, heading
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 689, 710, 718 | `page.getByRole('button', { name: 'Geo card', exact: true })` click | role exact | UI | E:877 |
| 690 | `page.getByLabel('Geo Rule')` | label | UI | E:735, textarea E:673 |
| 691, 719 | `geo` `toHaveValue('')` | value | Behaviour | E:673 (null -> '') |
| 694, 704 | `page.getByLabel('Title').fill('Not saved')` / `fill('Geo card')` | label | UI | E:726 |
| 695 | `geo.fill(typed)` with `'{"US": "5",'`, `'["US", "5"]'`, `'"5"'` | input | Behaviour | geoRule E:623-631 |
| 696, 706, 715 | `page.getByRole('button', { name: 'Save link' })` | role | UI | E:737 |
| 697 | `page.getByRole('status')` `toHaveText('Geo Rule: write a JSON object, such as {"US": "5"}, or leave it empty for no Geo Rule.')` (full text) | role + text | UI+Behaviour | E:685 (client-side check, before any write); status E:674 |
| 698 | `heading(page, 'Edit link')` | role | UI | E:738 |
| 699 | `geo` `toHaveValue(typed)` | value kept | Behaviour | the form is not redrawn on refusal |
| 700 | `readLink()` unchanged | API | Behaviour | no request is sent |
| 705 | `geo.fill('{"US": {"CA": "3", "default": "4"}, "default": "9"}')` | input | Behaviour | E:694 |
| 707, 716 | `heading(page, 'Edit Profile')` | role | UI | E:810 |
| 709 | `page.reload()` | reload | Behaviour | — |
| 711 | `geo` `toHaveValue('{\n  "US": {\n    "CA": "3",\n    "default": "4"\n  },\n  "default": "9"\n}')` | value (exact 2-space pretty print) | Behaviour | `JSON.stringify(current.geo, null, 2)` E:673 |
| 714 | `geo.fill('')` | input | Behaviour | E:624 -> null, sent as "null" E:694 |

- Behaviour contract: Geo Rule text that is not JSON, or JSON that is not an object, is refused with exactly that message. The Creator stays on Edit link with the typed text kept and the Link unchanged; the typed Title 'Not saved' is not written either (L693-701). A valid object is stored and shown pretty-printed with 2 spaces after a reload (L704-711). An empty textarea clears the rule (L714-719).

#### 03-auth-and-editor.spec.ts:L722-L767 "a Link saved with a javascript: Destination is refused by PocketBase; the Editor shows the reason and keeps every field as typed"  (describe: "the Editor's Links"; skip off local stack L505)
- Pages/surfaces: Editor (home, Edit link, Add link); API
- Viewport: 390x844 (L24)
- Helpers called: verifiedCreator, readBack, logIn, heading
- Hooks (fillAll L728-737 and expectKept L738-752 run twice, for 'Edit link' and 'Add link'):

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 729, 742 | `page.getByLabel('Title')` fill / `toHaveValue(typed.title)` | label + value | UI+Behaviour | E:726 |
| 730, 743 | `page.getByLabel('Destination')` fill('javascript:alert(document.cookie)') / toHaveValue | label + value | UI+Behaviour | E:727 (no client-side prefix check; form `noValidate` E:679) |
| 731, 744 | `page.getByLabel('Icon').selectOption({ label: 'Twitch' })` / `.locator('option:checked')` `toHaveText('Twitch')` | option | UI+Behaviour | E:526 |
| 732, 745 | `page.getByLabel('18+ Age Gate')` check / toBeChecked | checkbox | UI+Behaviour | E:668 |
| 733, 746 | `page.getByLabel('Mode').selectOption({ label: 'Deeplink' })` / `option:checked` `toHaveText('Deeplink')` | option | UI+Behaviour | E:516 |
| 734, 747 | `page.getByLabel('OnlyFans tracking')` check / toBeChecked | checkbox | UI+Behaviour | E:671 |
| 735, 748 | `page.getByLabel('Default Tracking Code')` fill('12') / toHaveValue | label | UI+Behaviour | E:734 |
| 736, 749 | `page.getByLabel('Geo Rule')` fill('{"US": "5"}') / toHaveValue | label | UI+Behaviour | E:735 |
| 739 | `heading(page, what)`, what ∈ 'Edit link', 'Add link' | role | UI+Behaviour | E:738 |
| 740 | `page.getByRole('status')` `toContainText('Destination')` | role + text | UI+Behaviour | linkReason E:642 (create, bare 400) / E:643 (update, bare 404); PocketBase sends no reason |
| 741 | `page.getByRole('status')` `toContainText('https://, http:// or /')` | text | UI+Behaviour | E:642 / E:643 |
| 750 | `page.getByRole('button', { name: 'Save link' })` toBeEnabled | state | Behaviour | `submitting(form, false)` E:714 |
| 751 | `readBack(...)` links unchanged | API | Behaviour | — |
| 756 | `page.getByRole('button', { name: 'Safe card', exact: true })` | role exact | UI | E:877 |
| 758, 765 | `page.getByRole('button', { name: 'Save link' })` click | role | UI | E:737 |
| 762 | `page.getByRole('button', { name: 'Cancel' })` | role | UI | E:740 |
| 763 | `page.getByRole('button', { name: 'Add link' })` | role | UI | E:820-826 |

- Behaviour contract: the refused-save rule. A Destination PocketBase refuses, on both an opened Link and a new one, shows the reason (with "Destination" and "https://, http:// or /") and keeps the form on screen with every field as typed: Title, Destination, Icon, Age Gate, Mode, tracking, Tracking Code and Geo Rule. Save stays enabled, and nothing is stored (L754-766).

#### 03-auth-and-editor.spec.ts:L779-L793 "another Creator cannot change, delete, add to or take from a Profile, nor replace its images; the owners read all back unchanged"  (describe: "owner rules, over HTTP at the public origin"; skip off local stack L777)
- Pages/surfaces: API-only / no page hooks. Helpers called: furnishedCreator (H:365-371), readBack, probe (H:385-401), refused (H:407)
- Behaviour contract: a non-owner's writes and uploads are refused, and both owners read everything back unchanged.

#### 03-auth-and-editor.spec.ts:L795-L817 "another Creator and an anonymous caller read nothing of the first Creator's, and nobody reads the ownerless Fixture"  (describe: "owner rules, over HTTP at the public origin")
- Pages/surfaces: API-only / no page hooks. Helpers called: furnishedCreator, recordIds (H:418-423), proxy, probe
- Behaviour contract: list reads return only the caller's own records; a view of another's record is 404.

#### 03-auth-and-editor.spec.ts:L819-L836 "the owner cannot change their Username, owner or badge, delete their Profile, add a second, choose a Link Id, upload a file directly or store a Destination outside https://, http:// and /"  (describe: "owner rules, over HTTP at the public origin")
- Pages/surfaces: API-only / no page hooks. Helpers called: furnishedCreator, readBack, probe, refused, pngFile
- Behaviour contract: the server-side refusals behind the Editor's read-only Username and the absence of a badge or delete control (L824-825); the Destination prefix rule behind linkReason E:640-645 (L831-834).

#### 03-auth-and-editor.spec.ts:L838-L853 "the Operator edits a Creator's Profile, Link and account, then deletes the account and its Profile: the page lands on the landing page and log-in is refused"  (describe: "owner rules, over HTTP at the public origin")
- Pages/surfaces: Profile (redirect to Landing); otherwise API
- Viewport: 390x844 (L24)
- Helpers called: furnishedCreator, operator (H:413-415), readBack, proxy, holdsDestination (H:154), probe, refused
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 848 | ``page.goto(`/${a.creator.username}`)`` | URL | — | S:262-268 (bootstrap null for an unknown Username) |
| 849 | ``expect(page).toHaveURL(`${new URL(page.url()).origin}/landing.html`)`` | URL | UI+Behaviour | PJ:36 (`window.location.href = '/landing.html'`) or PJ:108 |
| 850-851 | `page.content()` holds no Destination | DOM read | Behaviour | L (landing page) |

- Behaviour contract: a deleted Profile's address lands on /landing.html with no Destination in the page (L848-851). The deleted account's log-in is refused (L852).

#### 03-auth-and-editor.spec.ts:L862-L881 "reopening the Editor in the same context still shows it; Log out shows log-in, and logging in again lands in the Editor"  (describe: "the session and where log-in lands"; skip off local stack L860)
- Pages/surfaces: Editor (home, log-in)
- Viewport: 390x844 (L24)
- Helpers called: verifiedCreator, logIn, heading, EDITOR, LOG_IN, featured
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 865, 869, 879 | `heading(page, EDITOR)` / `heading(reopened, EDITOR)` -> 'Edit Profile' | role | UI | E:810 |
| 867-868 | `page.context().newPage()`; `reopened.goto('/edit')` | new tab, same storage | Behaviour | token in localStorage E:32, refresh E:122-131 |
| 872 | `page.getByRole('button', { name: 'Log out' })` click | role | UI | E:827 -> logOut E:833-836 |
| 873, 877 | `heading(page, LOG_IN)` -> 'Log in' | role | UI | E:327 |
| 874 | `expect(page).toHaveURL(/\/edit\/login$/)` | URL | UI+Behaviour | E:835 `show('/edit/login', drawLogin)` |
| 876 | `page.goto('/edit/home')` -> log-in | URL | Behaviour | E:283 |
| 878 | `logIn(page, creator)` | helper | — | — |
| 880 | `featured(page)` `toHaveText(['Session card'])` | list | UI | E:848/E:876 |

- Behaviour contract: the session lasts across tabs of the same context (L866-870). "Log out" drops the token on this device and shows log-in at /edit/login (L872-874). Deep links need a session (L876-877). Logging in again lands in the Editor (L878-880).

#### 03-auth-and-editor.spec.ts:L883-L895 "a Creator who logs in partway through Onboarding resumes at the claim step, the verify screen, the Profile step or the first-Link step"  (describe: "the session and where log-in lands")
- Pages/surfaces: Editor (log-in, claim, verify, Profile step, first-Link)
- Viewport: phoneContext 390x844 (L888)
- Helpers called: reach (H:329-338), phoneContext, logIn, heading, CLAIM, VERIFY
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 885 | `[CLAIM, /\/edit\/claim$/]` -> 'Claim your Username' | heading + URL | UI+Behaviour | E:394; E:261 |
| 885 | `[VERIFY, /\/edit\/verify-email$/]` -> 'Verify your email' | heading + URL | UI+Behaviour | E:431; E:262 |
| 885 | `['Your Profile', /\/edit\/profile$/]` | heading + URL | UI+Behaviour | E:617; E:263 |
| 885 | `['Add your first Link', /\/edit\/first-link$/]` | heading + URL | UI+Behaviour | E:738; E:266 |
| 887 | `reach(request, stage)` (the heading text is passed as the stage key) | helper | — | H:329-338 |
| 891 | `heading(resumed, stage)` | role | UI | as above |
| 892 | `expect(resumed, stage).toHaveURL(url)` | URL | UI+Behaviour | as above |

- Behaviour contract: log-in resumes at the first Onboarding step that applies, each at its fixed path: claim, verify-email, profile, first-link (L885-893).

#### 03-auth-and-editor.spec.ts:L897-L914 "with the stored token replaced by an invalid one, a save sends the Creator to log-in, and logging in returns them to the Editor"  (describe: "the session and where log-in lands")
- Pages/surfaces: Editor (home, log-in)
- Viewport: 390x844 (L24)
- Helpers called: verifiedCreator, logIn, heading, EDITOR, LOG_IN
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 900, 911 | `heading(page, EDITOR)` | role | UI | E:810 |
| 901 | `page.evaluate(() => localStorage.setItem('ofl.token', 'not-a-token'))` | storage key | UI+Behaviour | E:32, read E:42 |
| 902 | `page.getByLabel('Display name').fill('Never saved')` (substring label) | label | UI | E:598 |
| 903 | `page.getByRole('button', { name: 'Save profile' })` | role | UI | E:794/E:611 |
| 905 | `heading(page, LOG_IN)` | role | UI | E:327 |
| 906 | `expect(page).toHaveURL(/\/edit\/login\?next=%2Fedit%2Fhome$/)` | URL + query | UI+Behaviour | expired() E:110-115 (`next` = encodeURIComponent(location.pathname + location.search)); sessionEnded E:97-106 |
| 907 | `page.getByText('Your session has ended. Log in to carry on.')` toBeVisible | text | UI+Behaviour | E:326 (shown when `?next` is present, E:306) |
| 908-909 | `page.getByLabel('Email')`, `page.getByLabel('Password')` fill | labels | UI | E:322, E:323 |
| 910 | `page.getByRole('button', { name: 'Log in' })` | role | UI | E:325 |
| 912 | `expect(page).toHaveURL(/\/edit\/home$/)` | URL | UI+Behaviour | E:319 onboard -> E:252 |
| 913 | `page.getByLabel('Display name')` `toHaveValue('Before Name')` | value | Behaviour | H:265 value, never saved |

- Behaviour contract: an ended session never shows as a failed save. The Creator goes to /edit/login?next=%2Fedit%2Fhome with "Your session has ended. Log in to carry on." (L903-907). Logging in lands at /edit/home, and nothing was saved (L908-913). This needs the Editor home to live at the path /edit/home when the save happens.

#### 03-auth-and-editor.spec.ts:L916-L937 "hand-over: an ownerless Profile's Username is refused with the Cutover message; once the Operator sets its owner, the Creator's next log-in lands in the Editor on it"  (describe: "the session and where log-in lands")
- Pages/surfaces: Editor (sign-up, claim, home), Profile (Visitor)
- Viewport: 390x844 (L24); logInToHandedOver and openProfile use phoneContext 390x844
- Helpers called: fresh, createOwnerlessProfile (H:92-102), signUp, heading, CLAIM, setOwner (H:105-109), markVerified (H:50-54), logInToHandedOver (H:351-359), openProfile
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 921, 924 | `heading(page, CLAIM)` | role | UI | E:394 |
| 922 | `page.getByRole('status')` `toContainText('the Operator hands over Usernames held on v1 at Cutover')` | role + text | UI+Behaviour | E:209 |
| 923 | `page.reload()` | reload | Behaviour | E:261 |
| 928 | `logInToHandedOver(browser, origin, creator, creator.username, 'Handed Over', ['Imported card'])` (passes displayName 'Handed Over' and titles) | helper | UI+Behaviour | E:810; E:811 `.value`; E:598; E:848/E:876 |
| 929 | `editor.getByLabel('Display name').fill('Edited after hand-over')` | label | UI | E:598 |
| 930 | `editor.getByRole('button', { name: 'Save profile' })` | role | UI | E:794 |
| 931 | `editor.getByText('Profile saved.')` toBeVisible (substring, not exact) | text | UI+Behaviour | E:794 |
| 934 | `openProfile(browser, origin, creator.username, ['Imported card'])` | helper | UI | PJ:137/145 |
| 935 | `visitor.locator('#displayName')` `toHaveText('Edited after hand-over')` | id | UI | P:20; PJ:115 |

- Behaviour contract: an ownerless (v1-held) Username is refused at the claim with the Cutover message, which survives a reload (L920-924). After the Operator sets the owner, log-in lands in the Editor on that Profile, and a save reaches the public page (L926-935).

#### 03-auth-and-editor.spec.ts:L939-L955 "a bad verification link says invalid or expired and offers a resend; "Resend email" delivers a verification email, and once its link is followed Continue opens the Profile step"  (describe: "the session and where log-in lands")
- Pages/surfaces: Editor (/edit/verify, log-in, verify-email, Profile step)
- Viewport: 390x844 (L24)
- Helpers called: heading, reach, VERIFY, logIn, expectVerifyScreen, mailedLinks (H:59-65), mailedLink
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 940 | `page.goto('/edit/verify?token=not-a-token')` | URL | UI+Behaviour | E:280, drawVerified E:470-472 |
| 941 | `heading(page, 'Link invalid or expired')` | role | UI | drawInvalidLink E:463 |
| 942 | `page.getByRole('button', { name: 'Resend email' })` toBeVisible | role | UI | mailForm button E:458 with the label from E:472 |
| 945 | `logIn(page, creator)` | helper | — | — |
| 946 | `expectVerifyScreen(page)` | helper | UI+Behaviour | E:431 |
| 947 | `mailedLinks(creator.email, '/edit/verify')` toHaveLength(0) | mail | Behaviour | log-in asks for no email; only sign-up does, E:356 |
| 948 | `page.getByRole('button', { name: 'Resend email' })` click (verify screen) | role | UI | E:409-419 |
| 949 | ``page.getByRole('status')`` ``toContainText(`We asked for a new link to ${creator.email}.`)`` | role + text | UI+Behaviour | resendAsked E:405 via E:416; status E:408 |
| 950-951 | `page.context().newPage()`; `tab.goto(await mailedLink(creator.email, '/edit/verify'))` | URL (mailed) | Behaviour | pocketbase/pb_migrations/1791140006_email_links.js:15 |
| 952 | `heading(tab, 'Email verified')` | role | UI | E:473 |
| 953 | `page.getByRole('button', { name: 'Continue' })` (original tab) | role | UI | E:420-430 (refresh, then onboard) |
| 954 | `heading(page, 'Your Profile')` | role | UI | E:617 |

- Behaviour contract: a bad verify token shows "Link invalid or expired" with "Resend email" (L940-942). Resend on the verify screen says it asked for a new link (L948-949). Verifying in another tab, then Continue in the first, refreshes and goes on to the Profile step (L950-954).

#### 03-auth-and-editor.spec.ts:L957-L980 ""Forgot password" says the same for a known and an unknown address; a bad reset link offers a new one; the mailed one sets a password that lands in the Editor, the old one refused"  (describe: "the session and where log-in lands")
- Pages/surfaces: Editor (log-in, forgot, reset, home)
- Viewport: 390x844 (L24)
- Helpers called: verifiedCreator, fresh, forgotPassword (H:187-192), heading, mailedLink, logIn, LOG_IN, EDITOR
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 960 | `forgotPassword(page, email)` | helper | UI+Behaviour | E:328 link, E:282 route, drawForgot E:506-511 |
| 961 | `page.getByRole('status')` `toHaveText('If an account uses that address, we sent it a link. Check your inbox.')` (full text) | role + text | UI+Behaviour | CHECK_INBOX E:438 via E:452 |
| 964 | `page.goto(link)` | URL | Behaviour | E:281 route /edit/reset; template `{APP_URL}/edit/reset?token={TOKEN}` pocketbase/pb_migrations/1791140006_email_links.js:16 |
| 965 | `heading(page, 'Set a new password')` | role | UI | E:503 |
| 966 | `page.getByLabel('New password').fill('throwaway-renewed')` | label | UI | E:500 |
| 967 | `page.getByRole('button', { name: 'Set password' })` | role | UI | E:502 |
| 969 | `setPassword('/edit/reset?token=not-a-token')` | URL | Behaviour | the token is checked only on submit, E:479-496 |
| 970 | `heading(page, 'Link invalid or expired')` | role | UI | E:463 via E:496 |
| 971 | `page.getByRole('button', { name: 'Send a new link' })` toBeVisible | role | UI | E:496 -> mailForm E:458 |
| 973 | `heading(page, 'Password changed')` | role | UI | E:493 |
| 974 | `page.getByRole('button', { name: 'Log in' })` (must be a button) | role | UI | E:494 (go('/edit/login')) |
| 975 | `heading(page, LOG_IN)` | role | UI | E:327 |
| 977 | `page.getByRole('status')` `toHaveText('Wrong email or password.')` (full text) | role + text | UI+Behaviour | E:317 (for PocketBase's 400) |
| 979 | `heading(page, EDITOR)` | role | UI | E:810 |

- Behaviour contract: "Forgot password" gives the same answer for a known and an unknown address (L959-962). A bad reset link reveals itself only on submit, then offers "Send a new link" (L969-971). The mailed link sets a new password, shows "Password changed" and a Log in button (L972-975). The old password is refused with "Wrong email or password."; the new one lands in the Editor (L976-979).

#### 03-auth-and-editor.spec.ts:L986-L989 "after the run, the Fixture Profile still has no owner"  (describe: "the session and where log-in lands")
- Pages/surfaces: API-only / no page hooks (Operator loopback). Helpers called: ownerOf (H:114-116)
- Behaviour contract: the Fixture Profile's owner stays '' (L988).

#### Part notes
- **Things that break on any change:**
  - Every heading text above is matched with `exact: true` through `heading()` (H:168).
  - The top bar `#title` (X:13) repeats each heading's text in a `<div>`. If the redesign makes the top bar a heading (h1/h2 or role=heading), every `heading()` call becomes ambiguous and fails strict mode.
  - "Edit Profile" must stay unique as a heading on the home. The same goes for 'Add link', 'Edit link' and 'Your Profile'.
- **One `role=status` per screen:** the claim, verify, Profile step, Link form, live, forgot, reset and log-in screens each have exactly one, and the tests call `page.getByRole('status')` without narrowing (L57, L256, L284, L697, L740-741, L922, L949, L961, L977). A second live region on those screens fails strict mode. That includes a toast container or an always-present empty `role=status`/`aria-live` region that also has role status. The Editor home has four status `p`s, so its tests use `getByText(..., { exact: true })` instead.
- **Exact full-text matches:** a copy change breaks the test. These are 'Enter a display name.' (E:583), 'Copied.' (E:752), 'Profile saved.' (E:794), 'Default Mode saved.' (E:801), the Geo Rule message (E:685), CHECK_INBOX (E:438), 'Wrong email or password.' (E:317), and 'Profile default (currently Escape\|Direct)' (E:670). Option texts must be exactly 'Direct', 'Escape', 'Deeplink' (E:516) in that order (L476), plus 'None', 'OnlyFans', 'Twitch', 'Instagram' and 'Current icon' (E:522-528, E:664). Substring matches: 'Your email is not verified yet.', 'Your session has ended. Log in to carry on.', the claim reasons (E:209-220, curly quotes), 'The move failed: ' (prefix regex), 'Destination' + 'https://, http:// or /', and `We asked for a new link to <email>.`.
- **Featured Links row structure:**
  - `featured()` asserts each `li` has the title as its ONLY text (toHaveText on listitems).
  - Up/Down/Delete must keep text-free content: aria-label only, glyphs from CSS `::before` (C:158-161). Visible "Edit"/"Delete" text or icon fonts with text in the row breaks L291, L301, L524-584, L593-598, L880 and the helper logInToHandedOver.
  - The title button's accessible name must be exactly the title (`exact: true`, L527 etc.), so no "Edit <title>" aria-label on it.
  - Up/Down/Delete names must keep `Move <title> up`, `Move <title> down` and `Delete <title>`, and the list must keep `aria-label="Links"`.
- **Reorder is by button click only:** no drag and no keyboard reorder are tested. Disabled state on the first Up and the last Down is asserted (L562-563).
- **Delete uses the native `window.confirm()`:** the test hooks `page.once('dialog')` and asserts the message contains the title (L573-584). An in-page dialog would need the test updated in lockstep, never removed.
- **Label collisions:** label lookups are mostly substring (`getByLabel('Mode')`, `'Title'`, `'Bio'`, `'Password'`, `'Email'`, `'Display name'`, `'Username'`).
  - The Link form today replaces the whole screen (render E:741). If the redesign shows it as a sheet over the home, `getByLabel('Mode')` would also match 'Default Mode', and `getByRole('button', { name: 'Copy' })` / `'Add link'` could double-match.
  - The sign-up form's 'Password' must not sit beside another label containing "Password".
- **Strict single elements on the home:**
  - Exactly one `img.avatar` in the Editor page (L449). The class is `avatar` on E:573. A phone-preview mock with another `img.avatar` breaks it.
  - `editor.getByText('Profile saved.')` (L931, substring) must be unique.
  - `getByText('${origin}/${username}', { exact: true })` in logInToHandedOver must hit one element: today only `.bio-link .value`.
  - `.bio-link .label` / `.value` classes and the text 'Your Bio Link' are pinned (L396-398), and the shown value must be the full origin + /username.
- **Negative text sweep L407-411:** the whole `<main>` must contain no "badge" or "verified" text (case-insensitive). No control's name, id, aria-label or text may contain "badge" or "verif". A redesign that writes e.g. "Email verified ✓" on the Editor home, or names a control `verifiedBadge`, breaks it. This applies to /edit/home only; the 'Email verified' screen is separate.
- **Claim field:** must not get `maxlength`, `pattern` or HTML `required` validation that pre-empts the server.
  - L68 fills 31 chars and expects the server's 'Too long'; a maxlength of 30 would truncate the input and claim it.
  - L67 needs 'bad.name' submitted; a `pattern` would block the submit with no status text.
  - The claim form has no `noValidate`; the Link and Profile forms do (E:679, E:580).
- **Fixed routes and storage keys pinned by URL assertions:**
  - /edit/login, /edit/signup, /edit/claim, /edit/verify-email, /edit/profile, /edit/first-link, /edit/home, `/edit/login?next=%2Fedit%2Fhome`, /edit/verify?token=, /edit/reset?token=.
  - localStorage key `ofl.token` (L308, L901).
  - No hash routing is used anywhere. /edit/add-link, /edit/link and /edit/live exist but are never asserted.
- **Refused save keeps the typed text:**
  - L693-701 (Geo, client-side) and L722-767 (Destination, server-side).
  - The form must not be redrawn on refusal, every field keeps its value, and Save must be re-enabled (E:713-715).
  - L679 + L722: the Editor must not pre-check the Destination prefix. The test title says "refused by PocketBase", and the status must contain 'Destination' and 'https://, http:// or /' either way.
- **No autosave or drafts:** L418-420 needs an unsaved edit to vanish on reload. L438-439 needs picking a picture to send no /api/upload request; it is uploaded once, on "Save profile".
- **Landing page (being redesigned):**
  - The test needs the visible text 'Powered by n8n & Git & Netlify' (L113, L:44).
  - It needs a link named /Create Your Own Page/ (case-sensitive) that opens /edit/signup (L114, L:40-47).
  - No `<a href>` may contain "n8n" (L112).
  - The first two are UI contracts the redesign must keep or update in lockstep.
- **Viewport:** the whole file runs at 390x844 with Desktop Chrome otherwise (no touch, no mobile UA). One screenshot artefact is written by L302 (fullPage, no comparison).
- **Concurrent edits:** at the time of writing, app/public/script.js and tests/e2e/helpers.ts had uncommitted working-tree edits by another run (script.js: In-App Browser pop-out; helpers.ts: +3 lines at L473-475, after every helper cited here). PJ line numbers are from that working tree. The script.js change adds `popOut()` on open in an In-App Browser with Escape default. That may affect L465 (`#igOverlay` toBeVisible under INSTAGRAM_UA, an iOS UA) if the x-safari- navigation leaves the page. This is outside this inventory's scope, but worth a check by whoever owns that change.

## Appendix B: per-test detail for 04-stats.spec.ts and tests/stats-seed.js (sub-agent part)

### tests/e2e/04-stats.spec.ts

File-level (applies to every test below):
- L193 `test.describe.configure({ mode: 'serial' })`: tests share the seeded Profiles and count by delta, so order matters (test 2 needs test 1's SI traffic for its 'SI' option, test 5 needs earlier Page Views today, test 7 needs test 1's Other Profile Click).
- L194 `test.skip(!onLocalStack(), ...)` (helpers.ts:20): the whole file skips off the local stack (no VPS run).
- Project: chromium (playwright.config.ts:24, Desktop Chrome 1280x720), but every browser context in this file comes from `phoneContext` → `viewport: PHONE` = 390x844 (tests/e2e/helpers.ts:152, :204). Tests that use only `request` have no viewport.
- Stats URL is a path, not a hash: `/edit/stats` (app/editor/editor.js:284 route, app/editor/stats.js:56 `show('/edit/stats', …)`, editor.js:226-229 replaceState; served by app/server.js:230-232 with index.html fallback server.js:65). Opened by clicking the "Stats" link in the Creator nav (openStats helper); every test reloads it with `page.reload()`.
- Default range on open/reload is 7D (stats.js:47 `showRange(done.links, 7, { link: '', country: '' })`); reload resets filters to all.
- Everything the Stats page shows is **Behaviour** (CONSTRAINTS rule 5); rows below mark selectors as UI and the values/semantics as Behaviour.

#### 04-stats.spec.ts:L27-L33 helper `daysEnding`  (describe: "-")
- Pages/surfaces: none (pure). Computes the n UTC "YYYY-MM-DD" days ending on `last`, oldest first; test 5 compares it to the Daily table's row headers (stats.js:21-24 rangeDays must agree).
- Hooks: none.

#### 04-stats.spec.ts:L36-L38 helper `withPassword` / `stats` / `other`  (describe: "-")
- Pages/surfaces: none. `CREATORS.stats` / `CREATORS.other` from tests/stats-seed.js:9-26, password from `ENV[c.passwordVar]` (helpers.ts:21).
- Hooks: none.

#### 04-stats.spec.ts:L43-L53 helper `countedVisit`  (describe: "-")
- Pages/surfaces: Profile
- Viewport: 390x844 via phoneContext (helpers.ts:197-212)
- Helpers called: phoneContext (helpers.ts:197-212)
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 47 | `phoneContext(browser, { origin, userAgent, headers: { ...(country ? { 'CF-IPCountry': country } : {}), ...headers } })` | context/headers | Behaviour | helpers.ts:203-210; country read by app/src/event-recorder.js:13-16 |
| 49 | `visitor.waitForResponse((res) => res.request().method() === 'POST' && new URL(res.url()).pathname === `/v/${username}`)` | network pin (Profile JS) | Behaviour | app/public/script.js:77 (`fetch(`/v/${username}`, { method: 'POST', keepalive: true })`); app/server.js:98-104 |
| 50 | `visitor.goto(`/${username}`)` | URL | Behaviour | Profile catch-all + bootstrap app/server.js:256-266 |
| 51 | `expect((await ping).status(), ...).toBe(204)` | status | Behaviour | app/server.js:98-104 |

#### 04-stats.spec.ts:L57-L72 helpers `STUB` / `landedOnStub` / `throughR` / `linkCard` / `followThroughR`  (describe: "-")
- Pages/surfaces: Profile
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 58 | `visitor.getByRole('heading', { name: 'Stub Destination' })` toBeVisible | role | UI (test-owned) | the test's own STUB body L57, not app source |
| 61 | `visitor.route('**/r/*', async (route) => {...})` | network pin | Behaviour | Link url `${origin}/r/${link.linkId}` app/src/public-profile.js:32; navigation app/public/script.js:246; route app/server.js:81-89 |
| 62 | `route.fetch({ maxRedirects: 0 })` | network | Behaviour | app/server.js:81-89 |
| 68 | `expect(answer, `/r to ${destination}`).toEqual({ status: 302, location: destination })` | status/header | Behaviour | app/server.js:81-89 |
| 70 | `visitor.locator('.link-card', { hasText: title })` | class + text | UI (Profile, not redesigned) | app/public/script.js:132 (`card.className = 'link-card'`), title span script.js:140, click handler script.js:182 |
| 72 | `linkCard(visitor, title).click()` | mouse | UI+Behaviour | app/public/script.js:182 |

#### 04-stats.spec.ts:L77-L93 helpers `throughReveal` / `passGateToStub`  (describe: "-")
- Pages/surfaces: Profile
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 78 | `visitor.route((url) => url.origin !== origin, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: STUB }))` | network | Behaviour | onward navigation after Reveal (app/public/script.js revealAndGo) |
| 79 | `visitor.waitForResponse((res) => new URL(res.url()).pathname === '/.netlify/functions/reveal')` | network pin (Profile JS) | Behaviour | app/public/script.js:222; app/server.js:112-121 |
| 81 | `expect((await reveal).status(), ...).toBe(200)` | status | Behaviour | app/server.js:121 |
| 83 | `expect(visitor.url()).toBe(destination)` | URL | Behaviour | `realUrl` app/server.js:121 |
| 84 | `new URL((await reveal).url()).searchParams.get('trackingId')` | query param | Behaviour | app/public/script.js:234-235 |
| 90 | `linkCard(visitor, title).click()` → `visitor.locator('.link-card', { hasText: title })` | class + text | UI (Profile) | app/public/script.js:132, :182 |
| 91 | `visitor.getByRole('heading', { name: 'Mature Content Disclaimer' })` toBeVisible | role/text | UI (Profile) | app/public/index.html:44 (`<h2>`) |
| 92 | `visitor.getByRole('button', { name: 'Continue (18+)' }).click()` | role/text | UI (Profile) | app/public/index.html:46 (`#continueBtn`); text reset app/public/script.js:379, :385 |

#### 04-stats.spec.ts:L96-L99 helper `servedLinkId`  (describe: "-")
- Pages/surfaces: API-only. `request.get(`/api/profiles/${username}.json`)` → app/server.js:67-74; reads `links[].id`/`links[].title` (app/src/public-profile.js:24). No page hooks.

#### 04-stats.spec.ts:L102-L108 helper `watchEvents`  (describe: "-")
- Pages/surfaces: Stats (network)
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 104-105 | `page.on('request', ...)` collecting `new URL(req.url()).pathname.startsWith('/api/collections/events')` (asserted `toEqual([])` in every Stats test) | network pin | Behaviour | Stats page requests only `dailyStats` (app/editor/stats.js:32) and Editor reads (editor.js:258, :273); proxy allow-list excludes events app/server.js:200 |

#### 04-stats.spec.ts:L111-L114 helper `openStats`  (describe: "-")
- Pages/surfaces: Editor → Stats
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 112 | `page.getByRole('navigation', { name: 'Creator' }).getByRole('link', { name: 'Stats' }).click()` | role + aria-label + link name (non-exact) | UI+Behaviour | app/editor/editor.js:295 (`el('nav', { className: 'creator-nav', 'aria-label': 'Creator' }, entry('Editor', '/edit'), entry('Stats', '/edit/stats'))`); `<a href>` from link() editor.js:236-244; aria-current editor.js:292; click → go() editor.js:231-234 → route editor.js:284 → openStats stats.js:44-48 |
| 113 | `heading(page, 'Stats')` = `page.getByRole('heading', { name: 'Stats', exact: true })` toBeVisible (helpers.ts:168) | role | UI | app/editor/stats.js:146 (`el('h1', {}, 'Stats')`). The topbar `#title` (index.html:13, set by render editor.js:147) is a `div`, not a heading |

#### 04-stats.spec.ts:L120-L135 helper `creatorOnStats`  (describe: "-")
- Pages/surfaces: Editor (log-in, Edit Profile) → Stats
- Viewport: 390x844 via phoneContext L123 (helpers.ts:152, :204); optional `timezoneId` L123 and `page.clock.setFixedTime(time)` L124
- Helpers called: phoneContext (helpers.ts:197-212), watchEvents (L102-108), logIn (helpers.ts:178-184), heading (helpers.ts:168), openStats (L111-114)
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 124 | `page.clock.setFixedTime(time)` | clock | Behaviour | ranges from the browser clock: app/editor/stats.js:21-24 (`Date.now()` → `toISOString().slice(0, 10)`) |
| 127-129 | `page.on('request', ...)` keeping `url.pathname === '/api/collections/dailyStats/records'` | network pin | Behaviour | app/editor/stats.js:32 (`api(`dailyStats/records?perPage=${PAGE_SIZE}&page=${page}&filter=${filter}`)`), api() prefix editor.js:46 |
| 131 | `logIn(page, creator)` → helpers.ts:179 `page.goto('/edit')` | URL | Behaviour | signed out → `show('/edit/login', drawLogin)` editor.js:283 |
| 131 | → helpers.ts:180 `heading(page, LOG_IN)` = `page.getByRole('heading', { name: 'Log in', exact: true })` | role | UI | editor.js:327 (`el('h1', {}, 'Log in')`) |
| 131 | → helpers.ts:181 `page.getByLabel('Email')` fill | label | UI | editor.js:322 (`el('label', {}, 'Email', email)`) |
| 131 | → helpers.ts:182 `page.getByLabel('Password')` fill | label | UI | editor.js:323 |
| 131 | → helpers.ts:183 `page.getByRole('button', { name: 'Log in' })` click | role | UI | editor.js:325 (`el('button', { type: 'submit' }, 'Log in')`) |
| 132 | `heading(page, 'Edit Profile')` = `page.getByRole('heading', { name: 'Edit Profile', exact: true })` toBeVisible | role | UI+Behaviour | editor.js:810 (`el('h1', {}, 'Edit Profile')`), reached by onboard() editor.js:319, :250-253 |
| 133 | `openStats(page)` | helper | UI+Behaviour | see L111-L114 |

#### 04-stats.spec.ts:L141-L161 helper `readStats`  (describe: "-")
- Pages/surfaces: Stats
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 142 | `heading(page, 'Stats')` toBeVisible | role | UI | app/editor/stats.js:146 |
| 143 | `page.getByRole('region', { name, exact: true }).getByRole('paragraph').textContent()` | role region (named) + single paragraph | UI+Behaviour | card() app/editor/stats.js:65-68: `section.stat-card` with `aria-labelledby` → `h3` id, one `p` holding `String(value)` |
| 156 | `card('Page Views')`, `card('Clicks')`, `card('CTR')` (region names, exact) | text | UI+Behaviour | app/editor/stats.js:156 (`card('Page Views', views), card('Clicks', clicks), card('CTR', ctrText(clicks, views))`) |
| 145 | `page.getByRole('table', { name, exact: true })` | role table (named) | UI+Behaviour | table() app/editor/stats.js:86-95: `h2` id (L90) + `table.stats-table` `aria-labelledby` (L91) |
| 157-159 | `table('Daily')`, `table('Links')`, `table('Countries')` | table names | UI+Behaviour | app/editor/stats.js:157, :158, :159 |
| 146 | `shown.getByRole('columnheader').allTextContents()` | role | UI+Behaviour | `th scope="col"` stats.js:92; texts: Daily `['Day', 'Page Views', 'Clicks']` stats.js:157; Links `['Link', 'Clicks', 'CTR']` stats.js:158; Countries `['Country', 'Page Views', 'Clicks', 'CTR']` stats.js:159 |
| 148 | `shown.getByRole('row').all()` | role | UI | `tr` stats.js:92 (thead), :93 (tbody) |
| 149 | `row.getByRole('rowheader').count()` (row with none = header row, skipped) | role | UI | `th scope="row"` stats.js:93; thead row holds only `scope="col"` |
| 150 | `row.getByRole('rowheader').textContent()` | role/text | UI+Behaviour | stats.js:93 (Daily: day "YYYY-MM-DD"; Links: title or 'Deleted link'; Countries: code or 'Unknown') |
| 150 | `row.getByRole('cell').allTextContents()` | role/text | UI+Behaviour | `td` stats.js:88; Daily cells = empty `aria-hidden` bar span + `String(n)` stats.js:71-74; Links/Countries cells `String(n)` / ctrText stats.js:138, :158 |
| 151 | cells zipped positionally with column header texts | DOM order | UI | rowheader first, then `td`s in column order (stats.js:93) |

#### 04-stats.spec.ts:L164-L169 helper `readFiltered` (+ const `ALL_COUNTRIES`)  (describe: "-")
- Pages/surfaces: Stats
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 164 | `const ALL_COUNTRIES = 'All countries'` | option label | UI+Behaviour | app/editor/stats.js:154 (`['', 'All countries']`) |
| 166 | `page.getByRole('combobox', { name: 'Link', exact: true }).selectOption({ label: link })` | role/label, native select | UI+Behaviour | filterControl('Link', …) stats.js:153 → `label.filter` wrapping `select[name=link]` stats.js:77-81 (select() editor.js:536-540); options `'All Links'` + each Link title (stats.js:153); change → synchronous redraw stats.js:79, :142 |
| 167 | `page.getByRole('combobox', { name: 'Country', exact: true }).selectOption({ label: country })` | role/label, native select | UI+Behaviour | stats.js:154; options `'All countries'` + each country seen in range + chosen one (stats.js:141), text via countryName (XX→'Unknown') stats.js:83 |
| 168 | `readStats(page)` | helper | | see L141-L161 |

#### 04-stats.spec.ts:L172-L202 helpers `count` / `rise` / `ctr` / `expectCtrs`  (describe: "-")
- Pages/surfaces: Stats (values only)
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 172 | `const count = (text: string \| undefined) => Number(text \|\| 0)` | number format | Behaviour+UI | every card `p` and number cell must be a bare integer: stats.js:67 `String(value)`, :73 `String(n)`, :138 `String(v), String(c)`, :158 `String(n)`; absent row reads 0 |
| 177 | `const ctr = (clicks: number, views: number) => (views ? `${((clicks / views) * 100).toFixed(1)}%` : '—')` (em dash U+2014) | exact text | Behaviour | ctrText app/editor/stats.js:60 (byte-identical U+2014) |
| 199 | `expect(read.cards.CTR, 'CTR card').toBe(ctr(count(read.cards.Clicks), views))` | exact text | Behaviour | stats.js:156 |
| 200 | `expect(row.CTR, `Links: ${name}`).toBe(ctr(count(row.Clicks), views))` (Link CTR over Profile-wide Page Views card) | exact text | Behaviour | stats.js:158 (`ctrText(n, views)`) |
| 201 | `expect(row.CTR, `Countries: ${name}`).toBe(ctr(count(row.Clicks), count(row['Page Views'])))` | exact text | Behaviour | stats.js:138 (`ctrText(c, v)`) |

#### 04-stats.spec.ts:L182-L191 helpers `newestEvent` / `eventSchemaFields` / `eventFields`  (describe: "-")
- Pages/surfaces: API-only (superuser at PocketBase via helpers.ts asSuperuser/only/superuserToken). No page hooks.

#### 04-stats.spec.ts:L262-L273 helper `dailyRows`  (describe: "-")
- Pages/surfaces: API-only through the app proxy: `users/auth-with-password`, `links/records?fields=id&filter=…`, `dailyStats/records?perPage=500&filter=…` (app/server.js:200 PROXIED). No page hooks.

#### 04-stats.spec.ts:L467-L493 helpers `keysIn` / `v1GlobalCode` / `deleteProfile` / `atPocketBase`  (describe: "-")
- Pages/surfaces: API-only, except `v1GlobalCode` (L486): a Visitor context's starting `localStorage` `linkme_tracking_id` = `'999'` on the stack origin (Profile; app/public/script.js:208-211 never reads it). No Editor/Stats hooks.

#### 04-stats.spec.ts:L204-L258 "1. a Page View and a Click through /r reach the Stats page, paged at any size, with no horizontal overflow at 390×844"  (describe: "-")
- Pages/surfaces: Editor, Stats, Profile, Screenshot
- Viewport: 390x844 (phoneContext, helpers.ts:204)
- Helpers called: creatorOnStats (L120-135), readStats (L141-161), countedVisit (L43-53), followThroughR (L72), expectCtrs (L197-202), count/rise (L172-174), today (L24)
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 206 | `creatorOnStats(browser, origin)` | helper | UI+Behaviour | log-in → Edit Profile → nav "Stats" (see helper) |
| 207 | `readStats(page)` (before, default 7D) | helper | Behaviour | stats.js:47 |
| 210-211 | `countedVisit(browser, origin, other.username, { country: 'SI' })`; `followThroughR(elsewhere, other.direct.title, other.direct.destination)` | Profile | Behaviour | other Profile traffic must not count |
| 213-214 | `countedVisit(browser, origin, stats.username, { country: 'SI' })`; `followThroughR(visitor, stats.direct.title, stats.direct.destination)` | Profile | Behaviour | `.link-card` hasText 'Stats Direct' |
| 217 | `page.reload()` | reload of /edit/stats | Behaviour | stats.js:56 + editor.js:226-229, :284; server.js:230-232 |
| 223-224 | `read.daily[day]?.['Page Views']`, `read.daily[day]?.Clicks` | Daily row by UTC day header | Behaviour+UI | stats.js:109-112, :157 |
| 225 | `read.links[stats.direct.title]?.Clicks` (row header 'Stats Direct') | Links row by title | Behaviour+UI | stats.js:117, :125, :158 |
| 226-227 | `read.countries.SI?.['Page Views']`, `read.countries.SI?.Clicks` | Countries row 'SI' | Behaviour+UI | stats.js:136-138, :159 |
| 229-237 | `expect(rise(tracked(before), tracked(after))).toEqual({ 'Page Views card': 1, 'Clicks card': 1, 'today\'s Page Views': 1, 'today\'s Clicks': 1, 'the Direct Mode Link\'s Clicks': 1, 'SI Page Views': 1, 'SI Clicks': 1 })` | exact deltas | Behaviour | stats.js:103-138 |
| 238-239 | `expectCtrs(before)`, `expectCtrs(after)` | exact CTR text | Behaviour | stats.js:60 |
| 240-241 | `statsRequests.map((url) => url.searchParams.get('perPage'))` every `'500'` | network pin | Behaviour | stats.js:18 (`PAGE_SIZE = 500`), :32 |
| 244 | `page.route('**/api/collections/dailyStats/records?*', (route) => {...url.searchParams.set('perPage', '1')...})` | network rewrite | Behaviour | paging loop stats.js:31-35 (`page` param, stops at `totalPages`) |
| 251 | `expect(await readStats(page)).toEqual(after)` | full read equality | Behaviour | all pages summed (stats.js:34) |
| 252 | `statsRequests.length - asked` `.toBeGreaterThan(1)` | network | Behaviour | stats.js:31-35 |
| 254 | `page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)` toBe true | layout at 390 | UI+Behaviour | app/editor/editor.css:46 (screen max-width 480), :175 (`.range` flex-wrap), :179-181 (filters grid `minmax(0, 1fr)`), :182 (3 cards `minmax(0, 1fr)`), :186-187 (`table-layout: fixed`, `overflow-wrap: anywhere`) |
| 255 | `page.screenshot({ path: SCREENSHOT, fullPage: true })` → `.scratch/goal_ai/shots/04-stats.png` (L23) | screenshot (artifact, no compare) | UI | — |
| 256 | `expect(events, 'requests to the events collection').toEqual([])` | network | Behaviour | watchEvents L102-108 |

- Behaviour contract (must not be weakened): one Page View + one Click raise Page Views card, Clicks card, today's Daily row, the Link's row and the SI Countries row by exactly 1 each, another Profile's traffic excluded (L229-237); CTR card/rows = Clicks ÷ Page Views, 1 decimal + '%' or '—' (L238-239); every dailyStats request asks `perPage=500` (L241); paging reads all pages and totals stay identical (L244-252); no horizontal overflow at 390x844 (L254); no request to the events collection (L256); /edit/stats survives reload (L217, L250).

#### 04-stats.spec.ts:L275-L328 "2. Adult Link Clicks through the Age Gate count, and the Link and Country filters narrow every panel"  (describe: "-")
- Pages/surfaces: Editor, Stats, Profile, API
- Viewport: 390x844 (phoneContext)
- Helpers called: creatorOnStats, readStats, readFiltered (L164-169), dailyRows (L262-273), countedVisit, passGateToStub (L88-93), followThroughR, expectCtrs
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 279 | `readStats(page)` (no filter) | helper | Behaviour | stats.js:47 |
| 280 | `readFiltered(page, stats.adult.title, ALL_COUNTRIES)` → combobox 'Link' label 'Stats Adult', combobox 'Country' label 'All countries' | select | UI+Behaviour | stats.js:153, :154 |
| 282 | `readFiltered(page, stats.adult.title, 'SI')` (option 'SI' must already be offered, from test 1) | select | UI+Behaviour | stats.js:141, :154 |
| 283 | `dailyRows(request, stats.direct.title, 'SI', day)` | API | Behaviour | server.js:200 |
| 285-293 | `countedVisit(... { country: 'SI' })` + `passGateToStub(adultSI, origin, stats.adult.title, stats.adult.destination)`; SI + `followThroughR(directSI, stats.direct.title, ...)`; `{ country: 'DE' }` + `passGateToStub(adultDE, ...)` | Profile | Behaviour | Age Gate index.html:44, :46 |
| 295 | `page.reload()` (filters reset to all) | reload | Behaviour | stats.js:47 |
| 296-298 | `readStats(page)`; `readFiltered(page, stats.adult.title, ALL_COUNTRIES)`; `readFiltered(page, stats.adult.title, 'SI')` | helpers | UI+Behaviour | stats.js:153-154 |
| 300 | `expect(rise(cards(before), cards(after)), 'no filter').toEqual({ 'Page Views': 3, Clicks: 3 })` | exact deltas | Behaviour | stats.js:106-107 |
| 302 | `expect(rise(cards(beforeAdult), cards(afterAdult)), 'Link = Adult Link').toEqual({ 'Page Views': 3, Clicks: 2 })` | Page Views stay Profile-wide under Link filter | Behaviour | stats.js:104-105 (Link filter narrows clickRows only) |
| 305-308 | `read.daily[day]?.Clicks`, `read.links[stats.adult.title]?.Clicks`, `read.countries.SI?.['Page Views']`, `read.countries.SI?.Clicks` | table reads | Behaviour+UI | stats.js:157-159 |
| 310-317 | `toEqual({ 'Page Views': 2, Clicks: 1, 'today\'s Clicks': 1, 'the Adult Link\'s Clicks': 1, 'SI Page Views': 2, 'SI Clicks': 1 })` | exact deltas | Behaviour | stats.js:104-138 |
| 318 | `expect(Object.keys(afterAdultSI.links), ...).toEqual([stats.adult.title])` | only chosen Link listed | Behaviour+UI | stats.js:118 |
| 319 | `expect(Object.keys(afterAdultSI.countries), ...).toEqual(['SI'])` | only chosen country listed | Behaviour+UI | stats.js:104, :129-135 |
| 320 | `expectCtrs(read)` for all six reads | exact CTR text | Behaviour | stats.js:60 |
| 324-325 | `rowsAfter.length` toBe 1; `rowsAfter[0].clicks - (rowsBefore[0]?.clicks \|\| 0)` toBe 1 | API | Behaviour | PocketBase dailyStats view (grouped per Link/country/day) |
| 326 | `expect(events, ...).toEqual([])` | network | Behaviour | L102-108 |

- Behaviour contract: Adult Link Clicks via Age Gate count (L300); Link filter narrows Clicks but not Page Views (L302); Link+Country filter narrows every panel: cards, Daily, Links, Countries (L310-317); filtered Links table lists only that Link, Countries only that country (L318-319); CTR rule under filters (L320); filters chosen by option label (L166-167); Country filter offers countries seen in the 7D range (L282); no events requests (L326).

#### 04-stats.spec.ts:L330-L363 "3. Link Shortcuts count through /r and through Reveal; an unknown Link Id and a refused Reveal count nothing"  (describe: "-")
- Pages/surfaces: Editor, Stats, Profile, API
- Viewport: 390x844 (phoneContext)
- Helpers called: creatorOnStats, readStats, servedLinkId, throughR, throughReveal
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 334-335 | `servedLinkId(request, stats.username, stats.direct.title)` / `(…, stats.adult.title)` | API | Behaviour | server.js:67-74 |
| 340 | `throughR(viaR, stats.direct.destination, () => viaR.goto(`/${stats.username}?link=${directId}`, { waitUntil: 'commit' }))` | Profile Link Shortcut | Behaviour | app/public/script.js:42, :99, :246 |
| 343 | `throughReveal(viaReveal, origin, stats.adult.destination, () => viaReveal.goto(`/${stats.username}?link=${adultId}`, { waitUntil: 'commit' }))` | Profile Link Shortcut | Behaviour | app/public/script.js:42, :99, :243-244 |
| 348 | `request.get(`/r/${unknownId}`, { maxRedirects: 0 })` status 404 | API | Behaviour | app/server.js:86 |
| 349 | `request.get(`/.netlify/functions/reveal?id=${unknownId}&user=${stats.username}`)` status 404 | API | Behaviour | app/server.js:119 |
| 350-351 | `request.get(`/.netlify/functions/reveal?id=${adultId}&user=${stats.username}`, { headers: { Origin: 'https://elsewhere.test' } })` status 403 | API | Behaviour | app/server.js:114 |
| 353-354 | `page.reload()`; `readStats(page)` | Stats | Behaviour | |
| 356-358 | `read.cards.Clicks`, `read.links[stats.direct.title]?.Clicks`, `read.links[stats.adult.title]?.Clicks` | card/table reads | Behaviour+UI | stats.js:156, :158 |
| 360 | `toEqual({ 'Clicks card': 2, 'the Direct Mode Link\'s Clicks': 1, 'the Adult Link\'s Clicks': 1 })` | exact deltas | Behaviour | |
| 361 | `expect(events, ...).toEqual([])` | network | Behaviour | |

- Behaviour contract: Link Shortcut via /r and via Reveal each count one Click on the right Link row (L360); unknown Link Id (404) and foreign-Origin Reveal (403) count nothing (L348-351, L360); no events requests (L361).

#### 04-stats.spec.ts:L374-L388 "4. the country comes from CF-IPCountry only: no header and T1 count as "Unknown", never US, and x-country never wins"  (describe: "-")
- Pages/surfaces: Editor, Stats, Profile
- Viewport: 390x844 (phoneContext)
- Helpers called: creatorOnStats, readStats, countedVisit (with `COUNTRY_VISITORS` L371-373)
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 371-373 | `COUNTRY_VISITORS = [{}, { country: 'T1' }, { country: 'DE', headers: { 'x-country': 'SI' } }, { country: 'US' }]` | request headers | Behaviour | app/src/event-recorder.js:13-16 (`cf-ipcountry` only; not `/^[A-Z]{2}$/` → `'XX'`) |
| 381 | `read.countries[c]?.['Page Views']` for `['Unknown', 'DE', 'US', 'SI', 'T1']` | Countries row headers | UI+Behaviour | countryName stats.js:83 (`code === 'XX' ? 'Unknown' : code`), rows stats.js:136-138, :159 |
| 382 | `toEqual({ Unknown: 2, DE: 1, US: 1, SI: 0, T1: 0 })` | exact deltas | Behaviour | event-recorder.js:13-16 + stats.js:83 |
| 383 | `Object.keys(after.countries).filter((c) => c === 'T1' \|\| c === 'XX')` toEqual `[]` | negative row header | Behaviour+UI | stats.js:83 (no 'XX' row header ever) |
| 384 | `page.getByRole('combobox', { name: 'Country', exact: true }).getByRole('option').allTextContents()` | role/option text | UI+Behaviour | stats.js:154 (option text `countryName(c)`) |
| 385 | `offered.includes('Unknown') && !offered.includes('XX')` | exact option text | Behaviour | stats.js:83, :154 |
| 386 | `expect(events, ...).toEqual([])` | network | Behaviour | |

- Behaviour contract: no header and T1 count under "Unknown" (+2), DE header wins over x-country SI, US only when sent (L382); no 'T1' or 'XX' Countries row (L383); Country filter offers "Unknown", never "XX" (L385); no events requests (L386).

#### 04-stats.spec.ts:L390-L433 "5. Today, 7D and 30D read their own UTC days from the browser's clock, and a range with no rows says so"  (describe: "-")
- Pages/surfaces: Editor, Stats
- Viewport: 390x844 (phoneContext); `timezoneId: 'Pacific/Kiritimati'` (UTC+14) L395; clock `page.clock.setFixedTime(noon)` via creatorOnStats L124, then `page.clock.setFixedTime(noon + DAY_MS)` L421
- Helpers called: creatorOnStats, readStats, daysEnding, count
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 395 | `creatorOnStats(browser, origin, { timezoneId: 'Pacific/Kiritimati', time: noon })` | tz/clock | Behaviour | stats.js:21-24 (UTC days via `toISOString`, browser clock) |
| 397 | `page.getByRole('button', { name, exact: true }).click()` with name `'Today'`, `'7D'`, `'30D'` (L406 `[['Today', 1], ['7D', 7], ['30D', 30]]`, L424, L427) | role/exact name | UI+Behaviour | `button.range-tab` stats.js:148-150 from `RANGES` stats.js:40; onclick `showRange(links, n, filters)` stats.js:149 |
| 398 | `expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')` | attribute | UI+Behaviour | stats.js:149 (`'aria-pressed': String(n === days.length)`); CSS editor.css:178 |
| 401 | `page.getByText(days.length === 1 ? `${days[0]} (UTC)` : `${days[0]} – ${days[days.length - 1]} (UTC)`, { exact: true })` toBeVisible (L411, L425); en dash U+2013 with spaces | exact text | UI+Behaviour | `span.hint` stats.js:151 (byte-identical U+2013) |
| 412 | `expect(Object.keys(read.daily), `${name}: its daily rows`).toEqual(days)` | Daily rows = exactly the n UTC days, oldest first, DOM order | Behaviour | stats.js:109-112, :157 |
| 413-415 | `statsRequests.slice(sent).map((url) => url.searchParams.get('filter') \|\| '')` length > 0; each `toMatch(new RegExp(`day\\s*>=\\s*'${days[0]}'`))` | network pin | Behaviour | stats.js:29 (`` `day >= '${first}' && day <= '${last}'` ``); fresh read per tab stats.js:52-54 |
| 416-418 | `read.cards['Page Views']`, `read.cards.Clicks` (Today); `count(todayShowed['Page Views'])` > 0 | card text | Behaviour | stats.js:156 |
| 421-422 | `page.clock.setFixedTime(noon + DAY_MS)`; `page.reload()` | clock/reload | Behaviour | stats.js:21-24 |
| 425 | `span([tomorrow])` toBeVisible | exact text | UI+Behaviour | stats.js:151 |
| 426 | `page.getByText('No Page Views or Clicks in this range yet.', { exact: true })` toBeVisible | exact text (empty state) | UI+Behaviour | `p.hint` stats.js:155 (shown when the range has 0 rows) |
| 428-429 | `(await tab(name)).daily[day]` → `{ 'Page Views': row?.['Page Views'], Clicks: row?.Clicks }` toEqual the Today card texts | cross-panel exact text | Behaviour+UI | Daily cell text stats.js:73 vs card `p` text stats.js:67 (both `String(n)`) |
| 431 | `expect(events, ...).toEqual([])` | network | Behaviour | |

- Behaviour contract: Today/7D/30D are 1/7/30 UTC days ending on the browser clock's UTC date, not local date (L395, L410-412); each tab shows its span `D (UTC)` / `D1 – Dn (UTC)` (L411); each tab fetches only from its first day (L413-415); pressed tab exposes `aria-pressed="true"` (L398); empty range shows "No Page Views or Clicks in this range yet." (L426); the real today's row under 7D/30D equals Today's cards (L428-429); no events requests (L431).

#### 04-stats.spec.ts:L449-L464 "6. each load records its In-App Browser, and an Event holds nothing but its seven fields"  (describe: "-")
- Pages/surfaces: Profile (ping only), API
- Viewport: 390x844 (phoneContext via countedVisit); User-Agents: `INSTAGRAM_UA` (helpers.ts:251-253), `UA.facebook`/`UA.threads`/`UA.tiktok` (L437-447), `devices['Desktop Chrome'].userAgent`
- Helpers called: countedVisit, newestEvent, eventFields
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 459 | `countedVisit(browser, origin, stats.username, { country: 'SI', userAgent })` (POST `/v/stats_profile` 204) | network pin | Behaviour | app/public/script.js:77; app/server.js:98-104 |
| 461 | `expect({ kind: event.kind, inAppBrowser: event.inAppBrowser }, userAgent).toEqual({ kind: 'page_view', inAppBrowser })` | API | Behaviour | app/src/event-recorder.js (In-App Browser patterns) |
| 463 | `expect((await eventFields()).sort()).toEqual(['country', 'created', 'id', 'inAppBrowser', 'kind', 'link', 'profile'])` | API | Behaviour | PocketBase events schema |

- Behaviour contract: Page View Event records instagram/facebook/threads/tiktok/'' by UA (L461); Event has exactly seven fields (L463). No Editor/Stats hooks.

#### 04-stats.spec.ts:L473-L482 "the Stats Profile's and the Other Profile's JSON each carry profile.id, their record id, and no private key"  (describe: "-")
- Pages/surfaces: API-only / no page hooks (`request.get(`/api/profiles/${username}.json`)` → app/server.js:67-74).
- Behaviour contract: `profile.id` = record id (L479); no `destination`/`geo`/`owner`/`v1Key` key (L480).

#### 04-stats.spec.ts:L495-L579 "7. only a Profile's signed-in owner reads its dailyStats rows, and nobody reads or writes an Event, through PocketBase itself"  (describe: "-")
- Pages/surfaces: API (PocketBase loopback, not the app proxy), Profile (pings), Editor, Stats (as the Other Creator)
- Viewport: 390x844 (phoneContext)
- Helpers called: createOwnerlessProfile (helpers.ts:92), countedVisit, superuserToken/recordIds/asSuperuser (helpers.ts), newestEvent, atPocketBase, proxy (helpers.ts:222-232), refused (helpers.ts:407), eventCount (helpers.ts:429), keysIn, deleteProfile, creatorOnStats
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 500 | `countedVisit(browser, origin, username)` for stats/other/ownerless | Profile ping | Behaviour | script.js:77; server.js:98-104 |
| 514-568 | `proxy(pb …)` calls at PocketBase itself: `users/auth-with-password`, `dailyStats/records?perPage=500`, `dailyStats/records/${…}`, `events/records`, `events/records/${eventId}` (get/patch/delete), `dailyStats/records?perPage=500&expand=link` | API-only | Behaviour | PocketBase rules (no app/editor source) |
| 574 | `creatorOnStats(browser, origin, { creator: other })` | helper | UI+Behaviour | see helper |
| 575 | `page.locator('body').textContent()` | DOM text (whole body, hidden text included) | Behaviour | Stats page body: tables stats.js:157-159, Link options stats.js:153 |
| 576 | `shown.includes(title)` false for `stats.direct.title` ('Stats Direct') and `stats.adult.title` ('Stats Adult') | negative text | Behaviour | Links come only from the Creator's own Profile (editor.js:258, :271-274) and their own dailyStats rows |
| 577 | `expect(events, ...).toEqual([])` | network | Behaviour | |

- Behaviour contract: each Creator lists only own dailyStats rows, cannot view another's by id (L521-527); nobody but the Operator lists/views/creates/updates/deletes Events (L532-543); signed out lists no dailyStats (L548-549); expand=link exposes only the caller's own Links, no destination key outside them (L559-569); the Other Creator's Stats page names none of the Stats Profile's Links (L575-576); no events requests from the Stats page (L577).

#### 04-stats.spec.ts:L581-L630 "8. a Tracking Code stays with the Profile it arrived on: never v1's global code, another Profile's, or a reused Username's"  (describe: "-")
- Pages/surfaces: Profile only (no Editor/Stats)
- Viewport: 390x844 (phoneContext); `userAgent: INSTAGRAM_UA` L603; `storageState: v1GlobalCode(origin)` L583, L603
- Helpers called: phoneContext, passGateToStub, throughReveal, servedLinkId, createOwnerlessProfile, deleteProfile
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 586 | `onOther.goto(`/${other.username}/123`)` | URL (Tracking Code path) | Behaviour | bootstrap app/server.js:256-266; app/public/script.js:40 |
| 588 | `passGateToStub(onOther, origin, other.adult.title, toOther)` toBe `'123'` | Profile | Behaviour | script.js:234-235 |
| 593 | `onStats.evaluate(() => localStorage.getItem('linkme_tracking_id'))` toBe `'999'` | DOM storage | Behaviour | app/public/script.js:208-211 (per-Profile key `linkme_tracking_id:${id}`) |
| 594 | `passGateToStub(onStats, origin, stats.adult.title, stats.adult.destination)` toBeNull | Profile | Behaviour | |
| 597-598 | `viaShortcut.goto(`/${stats.username}?link=${adultId}`, { waitUntil: 'commit' })` via `throughReveal(...)` toBeNull | Profile | Behaviour | script.js:42, :99 |
| 606 | `igOther.locator('#igOverlay')` toBeVisible | id | UI (Profile) | app/public/index.html:51; shown script.js:318-319 |
| 607 | `new URL(igOther.url()).pathname` toBe `/${other.username}/123` | URL | Behaviour | |
| 610 | `igStats.locator('#igOverlay')` toBeVisible | id | UI (Profile) | app/public/index.html:51 |
| 611 | `new URL(igStats.url()).pathname` toBe `/${stats.username}` | URL | Behaviour | |
| 621-627 | `onFirst.goto(`/${reused}/777`)`; `passGateToStub(...)` toBe `'777'`; after delete+recreate `onSecond.goto(`/${reused}`)`; `passGateToStub(...)` toBeNull | Profile | Behaviour | script.js:208-215 |

- Behaviour contract: Tracking Code scoped to the Profile it arrived on; v1's global key untouched and unread; reused Username does not inherit (L588-627). No Editor/Stats hooks.

#### 04-stats.spec.ts:L632-L662 "9. a deleted Link keeps its Clicks in the totals, under "Deleted link""  (describe: "-")
- Pages/surfaces: Editor, Stats, Profile, API
- Viewport: 390x844 (phoneContext)
- Helpers called: creatorOnStats, readStats, recordIds, operator, only, superuserToken, phoneContext, throughR, countedVisit, followThroughR, expectCtrs
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 641 | `operator('POST', '/api/collections/links/records', { ...doomed, profile: profileId, order: 2, mode: 'direct' })` (title 'Stats Doomed') | API | Behaviour | — |
| 644 | `throughR(opener, doomed.destination, () => opener.goto(`/r/${link.linkId}`))` | URL /r | Behaviour | app/server.js:81-89 |
| 646-647 | `countedVisit(... { country: 'SI' })`; `followThroughR(visitor, stats.direct.title, stats.direct.destination)` | Profile | Behaviour | |
| 650-651 | `page.reload()`; `readStats(page)` (beforeDelete; 'Stats Doomed' listed by title) | Stats | Behaviour | stats.js:117-118 |
| 652 | `operator('DELETE', `/api/collections/links/records/${link.id}`)` toBe 204 | API | Behaviour | — |
| 653-654 | `page.reload()`; `readStats(page)` | Stats | Behaviour | |
| 655 | `read.links['Deleted link']?.Clicks` | exact row-header text | UI+Behaviour | app/editor/stats.js:116-126 (Click rows whose `link` is not a current Link, incl. empty, keyed `''` → `'Deleted link'` at :125) |
| 656 | `deleted(after) - deleted(before)` toBe 1 | exact delta | Behaviour | |
| 657 | `expect(after.cards.Clicks, ...).toBe(beforeDelete.cards.Clicks)` | exact card text | Behaviour | stats.js:156 |
| 658 | `Object.keys(after.links).includes(doomed.title)` toBe false | negative row header | Behaviour | stats.js:117, :125 |
| 659 | `expectCtrs(after)` | exact CTR text | Behaviour | stats.js:60 |
| 660 | `expect(events, ...).toEqual([])` | network | Behaviour | |

- Behaviour contract: a deleted Link's Clicks move to a "Deleted link" row (+1), the Clicks total is unchanged by the delete, the deleted title is no longer listed, other Links' Clicks do not move (L655-659); no events requests (L660).

#### 04-stats.spec.ts:L664-L673 "10. a deleted Profile takes its Events with it, and its delete succeeds"  (describe: "-")
- Pages/surfaces: Profile (ping via countedVisit), API. Viewport 390x844 (countedVisit). No Editor/Stats hooks; only hook is countedVisit's POST `/v/${doomed}` 204 (L669; script.js:77, server.js:98-104).
- Behaviour contract: 1 Event before, 0 after the Profile delete (L670-672).

#### 04-stats.spec.ts:L675-L697 "11. while every Event write fails, /r still redirects and Reveal still answers, both to their Destinations"  (describe: "-")
- Pages/surfaces: Profile, API. Viewport 390x844 (phoneContext). No Editor/Stats hooks.
- Hooks:

| Line | Hook (verbatim) | Kind | Contract | Resolves to |
|---|---|---|---|---|
| 686-687 | `countedVisit(... { country: 'SI' })` (ping still 204); `followThroughR(direct, stats.direct.title, stats.direct.destination)` (302) | Profile | Behaviour | server.js:98-104, :81-89 |
| 689-690 | `passGateToStub(adult, origin, stats.adult.title, stats.adult.destination)` (Reveal 200) | Profile | Behaviour | server.js:112-121; index.html:44, :46 |

- Behaviour contract: with Event writes failing, ping answers 204, /r 302 and Reveal 200 to the right Destinations, and no Event is written (L686-692); events fields restored (L694-696).

#### 04-stats.spec.ts:L699-L711 "12. the Page View Ping meets its own limit per client and Username, apart from other Profiles' pings and from /r"  (describe: "-")
- Pages/surfaces: API-only / no page hooks (`request.post(`/v/${flooded}`)`, `request.get(`/r/…`)`; app/server.js:98-104, :81-89).
- Behaviour contract: 429 `{ error: 'Too many requests' }` within limit+1 (L703-705); other Username's ping 204 and /r 302 unaffected (L707-709).

#### 04-stats.spec.ts:L713-L726 "the Page View Ping: an unknown Username is 404 and records nothing, and a GET under /v/ reaches the Profile route"  (describe: "-")
- Pages/surfaces: API-only / no page hooks. Compares GET `/v/${stats.username}` with GET `/${stats.username}` content-type and body after `withoutBootstrap` (tests/e2e/domains-helpers.ts:7-8; app/server.js:98 POST-only ping, bootstrap :256-266).
- Behaviour contract: POST to unknown Username 404 and no Event (L716-718); GET under /v/ serves the Profile page (L722-725).

### tests/stats-seed.js

Script (CommonJS). Run by tests/stack.sh:40 (`node --env-file=tests/e2e.env tests/stats-seed.js`), before the v1 Import; also imported by the spec (04-stats.spec.ts:L3) for `CREATORS`.
- How (L31-52): signs in as PocketBase superuser at `http://127.0.0.1:${PB_PORT}` (`_superusers/auth-with-password`, L42), then for each Creator POSTs directly to PocketBase REST (not the app proxy): a `users` record verified (L46), a `profiles` record with `mode: 'escape_ig'` and `owner` (L47), and two `links` records (L48-49). Prints one line `Phase 4 seed: stats_profile, other_profile` (L51). Throws if a password env var is missing (L45).
- What it seeds (L9-26):

| Creator | email | password env | username | displayName | Link order 0 (Direct Mode, `mode: 'direct'`) | Link order 1 (Adult, `isAdult: true`, `tracking: true`, no Mode, no Geo Rule, no default Tracking Code) |
|---|---|---|---|---|---|---|
| Stats Creator (`CREATORS.stats`) | stats-creator@example.com | STATS_CREATOR_PASSWORD | stats_profile | Stats Profile | 'Stats Direct' → https://stats-direct.test/ | 'Stats Adult' → https://stats-adult.test/ |
| Other Creator (`CREATORS.other`) | other-creator@example.com | OTHER_CREATOR_PASSWORD | other_profile | Other Profile | 'Other Direct' → https://other-direct.test/ | 'Other Adult' → https://other-adult.test/ |

- Events / dailyStats: none seeded. Every Event in 04-stats comes from the spec's own Visitors (pings, /r, Reveal); the spec counts by delta.
- Editor/Stats UI dependency: none. The script uses no selector, page or Editor endpoint. Indirect coupling only: the seeded titles 'Stats Direct' / 'Stats Adult' become the Stats Links-table row headers and Link-filter option labels the spec reads (stats.js:153, :158), and the Creators are seeded fully onboarded (verified, displayName, ≥1 Link) so log-in lands on the Editor's 'Edit Profile' h1 (editor.js:257-267, :810) as creatorOnStats expects (spec L132). displayName is not read by the spec.

#### Part notes
1. Strict-mode uniqueness hazards for the redesign: `heading(page, 'Stats')` and `heading(page, 'Edit Profile')` are exact role=heading lookups; the topbar `#title` (app/editor/index.html:13, text set at editor.js:147) is a `div`. Making it an `h1`/heading, or adding any other heading named exactly "Stats"/"Edit Profile", gives two matches and breaks every Stats test. Same for `getByRole('link', { name: 'Stats' })` inside the 'Creator' nav (non-exact, so another nav link containing "stats" breaks it), and for `getByRole('button', { name: 'Log in' })` (non-exact) on log-in.
2. Each card must stay a named `region` (a `section` with `aria-labelledby`, stats.js:67) holding exactly ONE `paragraph`; adding a second `<p>` (caption or delta) to a card breaks `getByRole('paragraph')` (strict).
3. Numbers are parsed with `Number(text || 0)` (L172): card text and number cells must be bare integers, with no thousands separators, units or compact forms ("1.2k"). The Daily bar `span` must stay text-free (stats.js:73), because the cell's `textContent` is read as the number. Test 5 L428-429 also requires the Daily cell text to equal the card text exactly.
4. Tables must stay real tables with ARIA names 'Daily'/'Links'/'Countries' (exact), a header row of `th scope=col` with exactly the column texts, and data rows with exactly one `th scope=row` first, then `td` cells in column order. Cards or lists in place of tables break readStats. The header row must have no rowheader.
5. Exact copy pinned: the range span `YYYY-MM-DD (UTC)` / `YYYY-MM-DD – YYYY-MM-DD (UTC)` (U+2013 en dash with spaces, stats.js:151); CTR `x.y%` or `—` (U+2014, stats.js:60); 'No Page Views or Clicks in this range yet.' (stats.js:155); 'All countries' (stats.js:154); 'Unknown' (stats.js:83); 'Deleted link' (stats.js:125); column texts 'Page Views'/'Clicks'/'CTR'; button names 'Today'/'7D'/'30D' (exact, role=button with `aria-pressed`; switching to role=tab/aria-selected would need a lockstep test change).
6. Filters must stay native `<select>`s whose accessible names are exactly 'Link' and 'Country' (today from the wrapping `<label>` text, stats.js:80). Extra label text ("Filter by Link") or a custom dropdown breaks `selectOption({ label })`. Option labels must be the full Link titles (no truncated text).
7. Timing coupling: `tab()` (L396-400) waits for `aria-pressed="true"`, then reads at once. Today the whole screen re-renders only after the range's rows arrive (stats.js:54-56), so the pressed state and the data change together. A redesign that flips `aria-pressed` before the data loads would read stale tables (flaky). `readFiltered` likewise relies on the filter redraw being synchronous (stats.js:142).
8. Ordering: only the Daily order is test-pinned (oldest first, exactly n rows, L412). Links/Countries order is not test-pinned (`toEqual` on objects ignores key order; the key arrays in test 2 have one entry). The spec still binds it: Links most-clicked first (docs/spec/phase-04-stats.md:208; stats.js:124-126, stable for ties in Visitor order) and Countries most Page Views first (:209; stats.js:136-137, ties by Clicks). Keep both.
9. Spec vs source gap (no test covers it): phase-04-stats.md:205 says the Link filter offers "Deleted link", but stats.js:153 offers only 'All Links' + current Links. The coordinator should decide; restyle-only keeps the current behaviour.
10. The Stats URL is the path `/edit/stats` (no hash). Tests reach it only through the nav link, then `page.reload()` it, so the path must keep routing to Stats on reload (editor.js:284, server.js:230-232). The Stats nav marks itself with `aria-current="page"` (editor.js:292), which no test asserts.
11. Test 1 checks overflow at 390x844 (`scrollWidth <= clientWidth`) with the 4-column Countries table, 3 cards in one row and two filters side by side. The current CSS relies on `minmax(0, 1fr)` grids and `table-layout: fixed` + `overflow-wrap: anywhere` (editor.css:179-187). The screenshot path `.scratch/goal_ai/shots/04-stats.png` (underscore) is a saved file only, with no visual compare.
12. Test 7 reads `body.textContent` (hidden text included), so the Stats page must not render another Creator's Link titles anywhere, not even in hidden elements.
13. Network pins the redesign must keep: Stats requests only `/api/collections/dailyStats/records` with `perPage=500` (every request) and `page=N` paging to `totalPages`, a `filter` containing `day >= '<first day>'`, a fresh fetch on every tab click, and never `/api/collections/events`.

## Appendix C: definitions map of the current Editor, Stats, landing and Profile files (sub-agent part)

# Part 0: definitions map of every hook in the current pages

Source read at HEAD 43472da (read-only). `E/` = app/editor/, `P/` = app/public/. Lines are 1-based and real.
"JS: fn()" means the element/attribute is created in that function. editor.js builds every element with `el()`
(editor.js:135-144): `on*` props become addEventListener(key.slice(2)), props that exist on the node are set as
properties (className, role, readOnly, inputMode, noValidate, hidden, style, scope, id), everything else (aria-*) via setAttribute.
No file in scope has any `data-*` attribute except landing.html's `data-src`; there is no `data-test` anywhere yet.
editor.js/stats.js have no `for=`/`id` label pairs (every label wraps its control), no keyboard or drag handlers,
no `closest()`, no `dataset`, no hash (`#`) routing; Stats is the path `/edit/stats` (no `#stats`).

### app/editor/index.html

| Hook | Kind | Defined at | Read/used by in app code |
|---|---|---|---|
| `<title>ofl.ink Editor</title>` | title | E/index.html:7 static | overwritten on every screen by editor.js:148 render() (`${heading} · ofl.ink`) |
| `html[lang=en].dark` | class | E/index.html:2 static | no `.dark` rule in editor.css (palette copied into `:root` editor.css:4-17); no JS |
| `meta[name=viewport]` | name attr | E/index.html:6 | - |
| `/edit/editor.css` | URL route | E/index.html:8 | served by app/server.js:229-232 staticFile(EDITOR) |
| `header.topbar` | class | E/index.html:12 static | editor.css:29-41 |
| `.topbar-title` | class | E/index.html:13 static | editor.css:43 |
| `#title` | id | E/index.html:13 static | editor.js:34 getElementById (const `title`); render():147 textContent |
| "Edit Profile" (initial #title text) | static text | E/index.html:13 | replaced by render() before first paint of any screen; same string as drawHome editor.js:810 |
| `main.screen` | class | E/index.html:15 static | editor.css:45-49 |
| `#screen` | id | E/index.html:15 static | editor.js:33 getElementById (const `screen`); render():149 replaceChildren |
| `/edit/stats.js` | URL route / load order | E/index.html:16 (loaded FIRST) | server.js:230; must precede editor.js (editor.js:284 calls openStats) |
| `/edit/editor.js` | URL route | E/index.html:17 | server.js:230 |

### app/editor/editor.js

#### Top-level functions and constants

| Name | Lines | Purpose |
|---|---|---|
| `TOKEN` const `'ofl.token'` | 32 | localStorage key of the auth token (read 42, 67, 123; written 81; removed 86) |
| `screen`, `title`, `account` | 33-35 | #screen, #title, signed-in users record |
| `api(path,{method,body,keepalive})` | 40-60 | fetch wrapper to `/api/collections/${path}`; JSON or FormData; ends session via sessionEnded/expired |
| `upload(collection,recordId,field,file)` | 64-78 | POST raw file to `/api/upload/...`; maps 413/415/other to messages |
| `signedIn({token,record})` | 80-83 | store token, set account |
| `signOut()` | 85-88 | drop token and account |
| `sessionEnded(res,token)` | 97-106 | 401, or 400/403/404 confirmed by an auth-refresh 401 |
| `expired()` | 110-115 | sign out, show log-in with `?next=` return path, never settles |
| `refresh()` | 122-131 | auth-refresh the token; false if none; drawRetry on failure |
| `el(tag,props,...children)` | 135-144 | DOM builder (text nodes only) |
| `render(heading,...children)` | 146-150 | sets #title, document.title, replaces #screen with `section.card` |
| `message()` | 152-154 | `p.message[role=status]` |
| `say(node,text,kind='error')` | 156-159 | sets `.message.<kind>` and text |
| `usernameInput(value)` | 162-180 | Username input that lowercases on input |
| `addressField(input)` | 182-184 | "Username" label with `${location.host}/` prefix |
| `LABELS` const | 187 | field-name to label for refusals |
| `fieldReasons(res,fallback)` | 188-197 | PocketBase per-field errors as one line |
| `claimReason(res,username)` | 205-222 | claim refusal text |
| `show(path,draw)` | 226-229 | history.replaceState(path) if different, then draw |
| `go(path)` | 231-234 | history.pushState + route() |
| `link(text,path)` | 236-244 | `<a href>` that preventDefaults and go()es |
| `onboard()` | 250-253 | onboarded() then show('/edit/home', drawHome) |
| `onboarded()` | 257-268 | first Onboarding step that applies, else {profile, links} |
| `linksOf(profile)` | 271-274 | GET Links in Visitor order (id,title,order) |
| `route()` | 276-286 | path router (see Routes) |
| `creatorNav(current)` | 289-296 | `nav.creator-nav` Editor / Stats |
| `submitting(form,busy)` | 300-302 | disable/enable every form control |
| `drawLogin()` | 304-330 | log-in screen |
| `drawSignup()` | 332-369 | sign-up screen (create user, auth, request verification, claim) |
| `claim(username)` | 372-374 | POST Profile {username, owner, mode:'escape_ig'} |
| `drawClaim({username,error})` | 376-395 | claim screen |
| `drawRetry(reason)` | 397-401 | "Try again" screen |
| `resendAsked(email)` arrow | 405 | resend-verification ok text |
| `drawVerify()` | 407-434 | "Verify your email" screen |
| `CHECK_INBOX` const, `linkToken()` arrow | 438-439 | neutral mail text; `?token=` reader |
| `mailForm(button,endpoint)` | 443-460 | email form that POSTs users/<endpoint> |
| `drawInvalidLink(what,button,endpoint)` | 462-466 | bad/expired email link screen |
| `drawVerified()` | 470-475 | `/edit/verify?token=` screen |
| `drawReset()` | 482-504 | `/edit/reset?token=` new password screen |
| `drawForgot()` | 506-511 | `/edit/forgot` screen |
| `IMAGE_TYPES`, `MODE_NAMES`, `ICONS`, `address()` | 515, 516, 522-528, 530 | accept list; Mode names {direct:'Direct', escape_ig:'Escape', deeplink:'Deeplink'}; stock icons; public address `${location.origin}/${username}` |
| `fileInput(name)` | 532-534 | `input[type=file][accept=IMAGE_TYPES]` |
| `select(name,options,value)` | 536-540 | `<select name>` from [value,text] (also used by stats.js:78) |
| `check(name,text,checked)` | 542-545 | checkbox inside `label.check` -> {box,row} |
| `saveProfile(profile,form,status,fields)` | 549-559 | PATCH Profile, keep answer in `profile` |
| `profileForm(profile,{editor,button,done})` | 568-613 | Profile form (step and Editor panel) |
| `drawProfileStep(profile)` | 616-619 | Onboarding Profile step |
| `geoRule(text)` | 623-631 | parse Geo Rule textarea |
| `linkReason(res,creating)` | 640-645 | Link save refusal text |
| `BLANK_LINK` const | 654 | empty Link values |
| `drawLinkForm(profile,links,link)` | 655-742 | Link form (first-Link step, Add link, Edit link) |
| `copyButton(text,status)` | 745-758 | "Copy" button to clipboard |
| `drawLive(profile)` | 760-771 | "Your page is live" screen |
| `drawHome(profile,links)` | 792-828 | the Editor home (Bio Link, Profile panel, Quick Settings, Featured Links, Add link, Log out) |
| `logOut()` | 833-836 | sign out, show log-in |
| `featuredLinks(profile,initial)` | 846-884 | Links list; inner `buttons` 850, `reload` 851-855, `move` 856-863, `remove` 867-873, `draw` 874-881 |
| `openLink(profile,links,id)` | 887-892 | GET full Link, pushState `/edit/link`, drawLinkForm |
| top-level statements | 894-895 | `window.addEventListener('popstate', route)`; `route()` |

#### fetch calls (all `api()` paths are prefixed `/api/collections/` by editor.js:46)

| Method | Path | Function | Line |
|---|---|---|---|
| any | `/api/collections/${path}` (the one raw fetch behind api()) | api | 46 |
| POST | `/api/upload/${collection}/${recordId}/${field}` | upload | 68 |
| POST | `/api/collections/users/auth-refresh` (raw fetch, probe) | sessionEnded | 101 |
| GET | `/images/${icon.value}` (stock icon WebP) | drawLinkForm onsubmit | 704 |
| POST | users/auth-refresh | refresh | 124 |
| GET | profiles/records?perPage=1 | onboarded | 258 |
| GET | links/records?perPage=500&sort=order&filter=profile='<id>'&fields=id,title,order | linksOf (from onboarded 264, featuredLinks reload 852) | 273 |
| POST | users/auth-with-password {identity,password} | drawLogin onsubmit | 315 |
| POST | users/records {email,password,passwordConfirm} | drawSignup onsubmit | 344 |
| POST | users/auth-with-password | drawSignup onsubmit | 349 |
| POST | users/request-verification {email} keepalive, not awaited | drawSignup onsubmit | 356 |
| POST | profiles/records {username,owner,mode:'escape_ig'} | claim (from drawSignup 357, drawClaim 385) | 373 |
| POST | users/request-verification {email} | drawVerify resend onclick | 414 |
| POST | users/${endpoint} (request-verification or request-password-reset) {email} | mailForm onsubmit | 450 |
| POST | users/confirm-verification {token} | drawVerified | 471 |
| POST | users/confirm-password-reset {token,password,passwordConfirm} | drawReset onsubmit | 490 |
| PATCH | profiles/records/${id} | saveProfile (from profileForm 584, drawHome settings 801) | 551 |
| POST | `/api/upload/profiles/${id}/avatar` via upload() | profileForm onsubmit | 589 |
| POST / PATCH | links/records or links/records/${id} (FormData) | drawLinkForm onsubmit | 712 |
| POST | `/api/upload/links/${id}/backgroundImage` via upload() | drawLinkForm onsubmit | 719 |
| PATCH x2 | links/records/${id}?fields=id {order} (moved Link, then neighbour) | featuredLinks move | 859, 860 |
| DELETE | links/records/${id} | featuredLinks remove | 870 |
| GET | links/records/${id} | openLink | 888 |
| (img src) | `/api/files/profiles/${id}/${avatar}` | profileForm | 578 |

#### Routes, history, URL params

| Hook | Kind | Defined at | Read/used by |
|---|---|---|---|
| `/edit/signup` | route | route():278 -> drawSignup | link editor.js:329; landing.html:40 href |
| `/edit/login` | route | route():279 -> drawLogin | show() 283, 426, 835; link 368, 510; go() 494; expired() 113 |
| `/edit/verify` (email link, `?token=`) | route | route():280 -> drawVerified | email template (server side, not in scope) |
| `/edit/reset` (email link, `?token=`) | route | route():281 -> drawReset | email template |
| `/edit/forgot` | route | route():282 -> drawForgot | link 328 |
| `/edit/stats` | route | route():284 -> openStats (stats.js:44) | creatorNav link 295; stats.js show() 56 |
| any other `/edit*` | route | route():285 -> onboard() after refresh() 283 | trailing slashes stripped 277 |
| `/edit` | route | go('/edit') 474; creatorNav 295 | falls to onboard() |
| `/edit/home` | route (replaceState) | onboard():252 | reload falls to onboard() |
| `/edit/claim` | route (replaceState) | onboarded():261; drawSignup 358 | reload falls to onboard() |
| `/edit/verify-email` | route (replaceState) | onboarded():262; drawSignup 359 | (distinct from `/edit/verify`) |
| `/edit/profile` | route (replaceState) | onboarded():263 | - |
| `/edit/first-link` | route (replaceState) | onboarded():266 | - |
| `/edit/live` | route (replaceState) | drawLinkForm onsubmit 722 | - |
| `/edit/add-link` | route (pushState) | drawHome Add link onclick 823 | - |
| `/edit/link` | route (pushState) | openLink 890 | - |
| `?next=<path>` | URL param | expired():113 (set) | drawLogin 306 `.has('next')` (only switches the hint; not used to navigate) |
| `?token=` | URL param | email links | linkToken() 439, used 471, 489 |
| history.replaceState | history | show() 227 | - |
| history.pushState | history | go() 232; drawHome 823; openLink 890 | - |
| `popstate` | listener on window | editor.js:894 | -> route() |
| `ofl.token` | localStorage key | editor.js:32 | 42, 67, 81, 86, 123 |

#### Hooks: classes, ids, aria, role

| Hook | Kind | Defined at | Read/used by in app code |
|---|---|---|---|
| `#screen`, `#title` | id | E/index.html:15, 13 | editor.js:33, 34 (only getElementById calls in the file) |
| `document.title` = `${heading} · ofl.ink` | title | editor.js:148 render() | - |
| `section.card` | class | JS: render() 149 | editor.css:51-56 |
| `p.message` + `role="status"` | class, role | JS: message() 153 (every status line) | editor.css:127 |
| `.message.error` / `.message.ok` | class (toggled) | JS: say() 157 (`message ${kind}`; kind 'error' default, 'ok' at 416, 452, 752, 794, 801) | editor.css:128, 129 |
| `.hint` | class | JS: p at 327, 367, 394, 432, 464, 473, 493, 508, 617, 739, 764, 805 | editor.css:60 (and .range .hint 176 for stats.js) |
| `.switch` | class | JS: p at 328, 329, 368, 510 | editor.css:131-132 (`.switch a`) |
| `.actions` | class | JS: div at 433, 740, 767, 812, 820, 827 | editor.css:125 |
| `button.secondary` | class | JS: 411 Resend, 740 Cancel, 748 Copy, 770 Go to the Editor, 807 Save default Mode, 827 Log out | editor.css:110 |
| `.address` (div > span + input) | class | JS: addressField() 183 (span `${location.host}/`); profileForm() 605 (span `@`) | editor.css:95-97 |
| `span[aria-hidden="true"]` "@" | aria-* | JS: profileForm() 605 | - |
| `label.check` | class | JS: check() 544 (removeBackground, isAdult, tracking) | editor.css:92-93 |
| `img.avatar` alt="" | class, alt | JS: profileForm() 573; `hidden`/`src` by showAvatar 574-577 | editor.css:166 |
| `div.picture` | class | JS: profileForm() 603 (editor panel only) | editor.css:164-165 |
| `input[readonly]` (username) | attr | JS: profileForm() 601 | editor.css:167 |
| `p.live-address` | class | JS: drawLive() 765 | editor.css:149 |
| `a.button` target=_blank rel=noopener | class | JS: drawLive() 768 | editor.css:111-122 |
| `div.bio-link`, `span.label`, `span.value` | class | JS: drawHome() 811 | editor.css:134-145 |
| `nav.creator-nav` + `aria-label="Creator"` | class, aria-* | JS: creatorNav() 295 (called drawHome 810, stats.js:145) | editor.css:170-171 |
| `a[aria-current="page"]` | aria-* | JS: creatorNav() entry 292 | editor.css:172 |
| `ul.links` + `aria-label="Links"` | class, aria-* | JS: featuredLinks() 848 | editor.css:152; `list.querySelectorAll('button')` 850 (disables all during move/delete 858, 869) |
| `li.link-row` | class | JS: featuredLinks draw() 876 | editor.css:153 |
| `button.link-row-title` (text = Link title) | class | JS: draw() 877 | editor.css:156; click -> openLink |
| `button.link-row-icon.up` + `aria-label="Move ${title} up"`, disabled when i===0 | class, aria-* | JS: draw() 878 | editor.css:157-158 (glyph via ::before content) |
| `button.link-row-icon.down` + `aria-label="Move ${title} down"`, disabled when last | class, aria-* | JS: draw() 879 | editor.css:157, 159 |
| `button.link-row-icon.delete` + `aria-label="Delete ${title}"` | class, aria-* | JS: draw() 880 | editor.css:157, 160-161 |
| `form` (no id/name) | element | JS: 310, 337, 380, 446, 485, 579 (noValidate), 678 (noValidate), 798 | editor.css:62; submitting() iterates `form.elements` 301 |
| disabled state | attr | submitting() 301; 413/415; 423/425; 858; 869; 878-879 | editor.css:123 `button:disabled` |

#### Labels and their controls (all wrapping `<label>`, no `for`/`id` pairs)

| Label text | Kind | Defined at | Control (name / type / autocomplete / other) |
|---|---|---|---|
| Email | label text | 322 login, 362 signup, 456 mailForm | input name=email type=email required autocomplete=email (307, 333, 444) |
| Password | label text | 323 login, 363 signup | input name=password type=password required; autocomplete=current-password (308) / new-password (334) |
| Username (claim/sign-up) | label text | addressField() 183, used 364, 391 | input name=username required autocomplete=off autocapitalize=none spellcheck=false inputMode=text (usernameInput 163-171); label text also contains span `${location.host}/` |
| New password | label text | 500 | input name=password type=password required autocomplete=new-password (483) |
| Display name | label text | 598 | input name=displayName autocomplete=name (569) |
| Bio | label text | 599 | textarea name=bio rows=3 (570) |
| Change Profile Picture | label text | 603 (editor panel) | input type=file name=avatar accept=IMAGE_TYPES (571 via fileInput 533) |
| Username (editor panel) | label text | 605 | input name=username readOnly (601); label also contains aria-hidden `@` |
| Profile picture | label text | 609 (Profile step) | input type=file name=avatar (571) |
| Title | label text | 726 | input name=title autocomplete=off (658) |
| Destination | label text | 727 | input name=destination inputMode=url autocomplete=off autocapitalize=none spellcheck=false placeholder="https://" (659) |
| Icon | label text | 728 | select name=icon (664); options ICONS 522-528: '' None, onlyicon.webp OnlyFans, linkicon.webp Link, twitchicon.webp Twitch, igicon.webp Instagram; plus 'current' "Current icon" for a non-stock icon |
| Background image | label text | 729 | input type=file name=backgroundImage (665) |
| Remove background | label text (label.check) | 667 (only when Link has a background) | checkbox name=removeBackground |
| 18+ Age Gate | label text (label.check) | 668 | checkbox name=isAdult |
| Mode | label text | 732 | select name=mode (670): '' `Profile default (currently ${Mode})`, direct Direct, escape_ig Escape, deeplink Deeplink |
| OnlyFans tracking | label text (label.check) | 671 | checkbox name=tracking |
| Default Tracking Code | label text | 734 | input name=defaultTrackingCode inputMode=numeric autocomplete=off (672) |
| Geo Rule | label text | 735 | textarea name=geo rows=4 spellcheck=false autocapitalize=none (673) |
| Default Mode | label text | 804 (Quick Settings form) | select name=mode (796): direct/escape_ig/deeplink, value profile.mode or escape_ig |
| `placeholder="https://"` | placeholder | 659 | the only placeholder in the Editor |

#### Visible text: headings, buttons, links, hints (render(heading) sets #title and document.title)

| Hook | Kind | Defined at | Read/used by |
|---|---|---|---|
| "Log in" (title + h1) | heading text | drawLogin 327 | - |
| "Your session has ended. Log in to carry on." / "Edit your ofl.ink Profile." | static text (.hint) | drawLogin 326-327 (chosen by `?next=`) | - |
| "Log in" | button text (submit) | drawLogin 325 | - |
| "Forgot password?" -> /edit/forgot | link text | drawLogin 328 | - |
| "New here? " + "Sign up" -> /edit/signup | static + link text | drawLogin 329 | - |
| "Sign up" (title) / "Create your page" (h1) | heading text | drawSignup 367 (title and h1 differ) | - |
| "Your email, a password and the Username your Profile lives at." | static text | drawSignup 367 | - |
| "Create account" | button text | drawSignup 366 | - |
| "Already have an account? " + "Log in" -> /edit/login | static + link text | drawSignup 368 | - |
| "Claim your Username" (title + h1) | heading text | drawClaim 394 | - |
| "It is your Profile's address. Lowercase letters, digits and underscore, 3 to 30 characters." | static text | drawClaim 394 | - |
| "Claim" | button text | drawClaim 393 | - |
| "Try again" (title + h1 + button, onclick route) | heading / button text | drawRetry 400 | - |
| "Verify your email" (title + h1) | heading text | drawVerify 431 | - |
| "We sent a link to " <strong>email</strong> ". Open it to verify your email, then press Continue." | static text | drawVerify 432 | - |
| "Continue" / "Resend email" (.secondary) | button text | drawVerify 430, 419 (order in .actions: Continue, Resend) | - |
| "Link invalid or expired" (title + h1) | heading text | drawInvalidLink 463 | - |
| `This ${what} link is invalid or expired. Enter your email and we will send you a new one.` (what = verification / reset) | static text | drawInvalidLink 464 | - |
| "Resend email" / "Send a new link" / "Send reset link" | button text (mailForm submit 458) | 472 / 496 / 509 | - |
| "Email verified" (title + h1), "Your email is verified.", "Continue" -> go('/edit') | heading / static / button | drawVerified 473-474 | - |
| "Password changed" (title + h1), "Log in with your new password.", "Log in" -> go('/edit/login') | heading / static / button | drawReset 493-494 | - |
| "Set a new password" (title + h1), "Set password" | heading / button | drawReset 503, 502 | - |
| "Forgot password" (title + h1), "Enter your email and we will send you a link to set a new password.", "Back to log in" | heading / static / link | drawForgot 507-510 | - |
| "Your Profile" (title + h1), "What Visitors see at the top of your page. A photo in jpg, png, heic, gif or webp.", "Continue" | heading / static / button | drawProfileStep 617-618 | - |
| "Add your first Link" / "Edit link" / "Add link" (title + h1) | heading text | drawLinkForm 738 | - |
| "Where the card on your page leads." | static text | drawLinkForm 739 | - |
| "Save link" / "Cancel" (.secondary, not on first-Link step) | button text | drawLinkForm 737, 740 | - |
| "Your page is live" (title + h1), "Paste this address into your Instagram or TikTok bio." | heading / static | drawLive 763-764 | - |
| "Open" (a.button) / "Copy" / "Go to the Editor" | link / button text | drawLive 768, 757 (copyButton), 770 | - |
| "Edit Profile" (title + h1) | heading text | drawHome 810 | - |
| "Editor" -> /edit, "Stats" -> /edit/stats | link text (nav) | creatorNav 295 | - |
| "Your Bio Link" + address | static text | drawHome 811 (address() 530) | - |
| "Copy" | button text | drawHome 812 via copyButton | - |
| "Save profile" | button text | drawHome 794 via profileForm 611 | - |
| "Quick Settings", "Featured Links" | heading text (h2) | drawHome 815, 817 | - |
| "Escape helps visitors switch to Safari/Chrome from Instagram or TikTok. Every Link left on “Profile default” follows this Mode." | static text | drawHome 805 | - |
| "Save default Mode" | button text (.secondary submit) | drawHome 807 | - |
| "Add link" | button text | drawHome 826 | - |
| "Log out" | button text (.secondary) | drawHome 827 | - |

#### Status, error and confirm messages (shown with say() in a `p.message[role=status]` unless noted)

| Text | Kind | Defined at | Shown by |
|---|---|---|---|
| "That image is over 20 MB." | error | upload 75 | profileForm 591; drawLinkForm 721 (wrapped) |
| "That file is not an image we can read (jpg, png, heic, gif or webp)." | error | upload 76 | same |
| `The image was refused (${status}). Try again.` | error | upload 77 | same |
| "PocketBase did not answer." | drawRetry fallback | 126, 259, 265, 889; stats.js:55 | drawRetry |
| `${LABELS[name] or name}: ${err.message}` (LABELS: Email, Password, Title, Destination, Geo Rule) | error | fieldReasons 194, LABELS 187 | many |
| "Email: this address already has an account. Log in instead." | error | fieldReasons 193 | sign-up |
| `“${username}” is taken. If it is your Username on ofl.ink today, do not claim another one: the Operator hands over Usernames held on v1 at Cutover, when ofl.ink moves to this site.` | error | claimReason 209 | claim / sign-up |
| "Too short: a Username has at least 3 characters." / "Too long: a Username has at most 30 characters." / "Not allowed: a Username has only lowercase letters, digits and underscore (_)." / "Enter a Username." | error | claimReason 211, 213, 215, 217 | claim |
| `“${username}” is reserved. Pick another Username.` / "The claim failed. Try again." | error | claimReason 220, 221 | claim |
| "Wrong email or password." / server message / "Log-in failed. Try again." | error | drawLogin 317 | log-in |
| "Sign-up failed. Try again." | error fallback | drawSignup 347 | sign-up |
| `Your account was made, but log-in was refused: ${...}` | error | drawSignup 352 | sign-up |
| `We asked for a new link to ${email}. If none arrives within a few minutes, check your spam folder and try again.` | ok | resendAsked 405 | drawVerify 416 |
| "The email could not be sent. Try again." | error | drawVerify 417; mailForm 453 | - |
| "Your email is not verified yet. Open the link in the email we sent you, then press Continue." | error | drawVerify 427 | - |
| "If an account uses that address, we sent it a link. Check your inbox." | ok | CHECK_INBOX 438 | mailForm 452 |
| "The password could not be set. Try again." | error fallback | drawReset 497 | - |
| `The save failed (${status}). Try again.` | error fallback | saveProfile 554; linkReason 644 | - |
| "Enter a display name." | error | profileForm 583 | - |
| "Profile saved." | ok | drawHome 794 (done) | - |
| "Default Mode saved." | ok | drawHome 801 | - |
| "PocketBase refused the Link: a Destination must start with https://, http:// or /." (+ " If it does, the Link may have been deleted elsewhere; press Cancel." on update 404) | error | linkReason 642, 643 | drawLinkForm 715 |
| "Enter a title." | error | drawLinkForm 682 | - |
| "Default Tracking Code: digits only, or leave it empty." | error | drawLinkForm 683 | - |
| `Geo Rule: write a JSON object, such as {"US": "5"}, or leave it empty for no Geo Rule.` | error | drawLinkForm 685 | - |
| "The icon could not be loaded. Try again." | error | drawLinkForm 707 | - |
| `The Link is saved, but not its background: ${failed}` | error | drawLinkForm 721 | - |
| "Copied." | ok | copyButton 752 | - |
| "Copy did not work here. Press and hold the address to copy it." | error | copyButton 754 | - |
| `The list could not be read again: ${...}. Reload the page.` | error | featuredLinks reload 853 | featured.status |
| `The move failed: ${...}. The list shows your page's order.` | error | featuredLinks move 861 | featured.status |
| `Delete “${link.title}”? It goes from your page at once.` | confirm() dialog | featuredLinks remove 868 (window.confirm) | - |
| `The delete failed: ${...}.` | error | featuredLinks remove 871 | featured.status |

#### Event listeners

| Event | Bound to | Defined at | Handler |
|---|---|---|---|
| popstate | window | 894 | route |
| input | username input | usernameInput 172 | lowercase, keep caret |
| click | every `link()` anchor (nav, switch links) | 239 | preventDefault + go(path) |
| submit | log-in form | 311 | auth-with-password |
| submit | sign-up form | 338 | create, auth, verify request, claim |
| submit | claim form | 381 | claim |
| click | "Try again" | 400 | route |
| click | "Resend email" / "Continue" (verify) | 412 / 422 | request-verification / refresh+onboard |
| submit | mailForm form | 447 | users/<endpoint> |
| click | "Continue" (verified) / "Log in" (reset done) | 474 / 494 | go('/edit') / go('/edit/login') |
| submit | reset form | 486 | confirm-password-reset |
| submit | profileForm form | 581 | saveProfile then upload avatar |
| submit | Link form | 680 | create/update Link, icon, background |
| click | "Cancel" / "Go to the Editor" | 740 / 770 | route |
| click | "Copy" | 749 | clipboard.writeText |
| submit | Quick Settings form | 799 | saveProfile {mode} |
| click | "Add link" | 822 | pushState /edit/add-link, drawLinkForm |
| click | "Log out" | 827 | logOut |
| click | `.link-row-title` / `.up` / `.down` / `.delete` | 877 / 878 / 879 / 880 | openLink / move(i,i-1) / move(i,i+1) / remove |
| keyboard, drag | - | none | reorder is up/down buttons only; no keydown/drag handlers exist |

### app/editor/stats.js

#### Top-level functions and constants (share the global scope with editor.js)

| Name | Lines | Purpose |
|---|---|---|
| `DAY_MS`, `PAGE_SIZE` (500) | 17-18 | constants |
| `rangeDays(n)` | 21-24 | n UTC days ending today as YYYY-MM-DD |
| `statsRows(first,last)` | 28-37 | paged read of dailyStats rows in range |
| `RANGES` | 40 | [['Today',1],['7D',7],['30D',30]] |
| `openStats()` | 44-48 | onboarded() then showRange(links, 7, {link:'',country:''}) (called by editor.js:284) |
| `showRange(links,n,filters)` | 52-57 | read rows, show('/edit/stats', drawStats) |
| `ctrText`, `sum`, `labelIds`, `labelId` | 60, 61, 62, 63 | CTR text ('—' with no views, else `x.x%`), sum, id counter, `stats-label-N` |
| `card(name,value)` | 65-68 | `section.stat-card` with labelled h3 |
| `bar(n,max,kind)` | 71-74 | `span.bar.<kind>` width 0-48px + number |
| `filterControl(name,options,value,choose)` | 77-81 | `label.filter` + select name=lowercase(name) |
| `countryName(code)` | 83 | 'XX' -> "Unknown" |
| `table(name,columns,rows)` | 86-95 | h2 + `table.stats-table` |
| `drawStats(days,links,rows,filters)` | 103-160 | the Stats screen |

#### fetch calls

| Method | Path | Function | Line |
|---|---|---|---|
| GET | `/api/collections/dailyStats/records?perPage=500&page=${page}&filter=day >= '<first>' && day <= '<last>'` (via editor.js api) | statsRows (loop until totalPages) | 32 |
| (indirect) | profiles/records + links/records via editor.js onboarded() | openStats | 45 |

#### Hooks and text

| Hook | Kind | Defined at | Read/used by in app code |
|---|---|---|---|
| render('Stats') -> #title "Stats", document.title "Stats · ofl.ink" | title / heading | drawStats 144 | editor.js render() 146-150 |
| `/edit/stats` | route | showRange 56 (show = replaceState) | editor.js route() 284 |
| `nav.creator-nav` (Stats current) | class | drawStats 145 via editor.js creatorNav | editor.css:170-172 |
| h1 "Stats" | heading text | drawStats 146 | - |
| `div.range` | class | drawStats 147 | editor.css:175-176 |
| `button.range-tab` + `aria-pressed` ("true" when n === days.length) | class, aria-* | drawStats 148-150 | editor.css:177-178 (`[aria-pressed="true"]`) |
| "Today", "7D", "30D" | button text | RANGES 40 | drawStats 148 |
| `span.hint` `${day} (UTC)` or `${first} – ${last} (UTC)` | static text | drawStats 151 | editor.css:60, 176 |
| `div.filters` | class | drawStats 152 | editor.css:179 |
| `label.filter` "Link" / "Country" | class, label text | filterControl 80 (called 153, 154) | editor.css:180-181 |
| `select[name=link]`, `select[name=country]` | name attr | filterControl 78 (editor.js select()) | change listener 79 -> redraw 142 |
| "All Links" (+ one option per Link title, value = Link id) | option text | drawStats 153 | - |
| "All countries" (+ one option per country seen, text = countryName) | option text | drawStats 154 | - |
| "No Page Views or Clicks in this range yet." (p.hint) | empty state | drawStats 155 (only when rows is empty) | - |
| `div.stat-cards` | class | drawStats 156 | editor.css:182 |
| `section.stat-card` + `aria-labelledby` | class, aria-* | card 67 | editor.css:183-185 (h3, p) |
| `#stats-label-N` | id (JS) | labelId 63 on card h3 (67) and table h2 (90); counter 62 never resets | aria-labelledby 67, 91 (N changes on every redraw) |
| "Page Views", "Clicks", "CTR" | heading text (h3) | drawStats 156 | - |
| h2 "Daily", "Links", "Countries" | heading text | table 90 (called 157, 158, 159) | editor.css:147 h2 |
| `table.stats-table` + `aria-labelledby` | class, aria-* | table 91 | editor.css:186-190 |
| `th[scope=col]` / `th[scope=row]` | attr | table 92 / 93 | editor.css:187-190 |
| columns Day, Page Views, Clicks / Link, Clicks, CTR / Country, Page Views, Clicks, CTR | static text (th) | drawStats 157, 158, 159 | - |
| `span.bar.views` / `span.bar.clicks` + `aria-hidden="true"` + style width | class, aria-* | bar 73 (Daily table only) | editor.css:191-193 |
| "Unknown" | static text | countryName 83 | country rows 138, filter options 154 |
| "Deleted link" | static text | drawStats 125 | Links table |
| "—" / `${pct.toFixed(1)}%` | static text | ctrText 60 | 138, 156, 158 |
| "PocketBase did not answer." | error | showRange 55 | editor.js drawRetry |

#### Event listeners

| Event | Bound to | Defined at | Handler |
|---|---|---|---|
| change | Link / Country select | filterControl 79 | redraw from rows already read |
| click | each `.range-tab` | drawStats 149 | showRange(links, n, filters) (re-reads rows) |
| keyboard, drag | - | none | - |

### app/editor/editor.css (rule blocks; CSS-only element rules grouped)

| Hook | Kind | Defined at | Element(s) it styles (created at) |
|---|---|---|---|
| `:root` vars (--background, --foreground, --card, --sidebar, --border, --input, --muted-foreground, --primary, --destructive, --success, --topbar-height) | CSS vars | editor.css:4-17 | whole page |
| `*`, `body` | element | 19, 21-27 | system font stack 26 |
| `.topbar`, `.topbar-title` | class | 29-41, 43 | E/index.html:12-13 |
| `.screen` | class | 45-49 (max-width 480px) | E/index.html:15 |
| `.card` | class | 51-56 | editor.js:149 |
| `h1`, `h2` | element | 58, 147 | every screen; stats table titles |
| `.hint` | class | 60 | editor.js hints; stats.js 151, 155 |
| `form`, `label` | element | 62, 64 | every form / label |
| `input, select`, `textarea`, `input[type="file"]` | element/attr | 66-74, 76-85, 87 | all controls (44px height) |
| `input:focus, select:focus, textarea:focus` | pseudo | 89 | controls (no :focus-visible; buttons and links have no focus rule) |
| `.check`, `.check input` | class | 92-93 | editor.js:544 |
| `.address`, `.address span`, `.address input` | class | 95-97 | editor.js:183, 605 |
| `button`, `button.secondary`, `button:disabled` | element/class | 99-108, 110, 123 | every button; .secondary list above |
| `a.button` | class | 111-122 | editor.js:768 |
| `.actions` | class | 125 | editor.js .actions list above |
| `.message`, `.message.error`, `.message.ok` | class | 127, 128, 129 | editor.js:153, 157 |
| `.switch`, `.switch a` | class | 131-132 | editor.js:328, 329, 368, 510 |
| `.bio-link`, `.bio-link .label`, `.bio-link .value` | class | 134-145 | editor.js:811 |
| `.live-address` | class | 149 | editor.js:765 |
| `.links` | class | 152 | editor.js:848 |
| `.link-row` | class | 153 | editor.js:876 |
| `.link-row-title` | class | 156 | editor.js:877 |
| `.link-row-icon` (36x36), `.up::before` "\2191", `.down::before` "\2193", `.delete` + `::before` "\2715" | class | 157-161 | editor.js:878-880 (buttons have no text; name only from aria-label) |
| `.picture`, `.picture label` | class | 164-165 | editor.js:603 |
| `.avatar` | class | 166 | editor.js:573 |
| `input[readonly]` | attr | 167 | editor.js:601 |
| `.creator-nav`, `.creator-nav a`, `.creator-nav a[aria-current="page"]` | class + aria-* | 170-172 | editor.js:292, 295 |
| `.range`, `.range .hint` | class | 175-176 | stats.js:147, 151 |
| `.range-tab`, `.range-tab[aria-pressed="true"]` | class + aria-* | 177-178 | stats.js:149 |
| `.filters`, `.filter`, `.filter select` | class | 179, 180, 181 | stats.js:152, 80 |
| `.stat-cards`, `.stat-card`, `.stat-card h3`, `.stat-card p` | class | 182-185 | stats.js:156, 67 |
| `.stats-table` (+ th/td, th:first-child, thead th, tbody th) | class | 186-190 | stats.js:91-93 |
| `.bar`, `.bar.views`, `.bar.clicks` | class | 191-193 | stats.js:73 |
| (absent) | - | - | no @media query, no prefers-reduced-motion, no :focus-visible, no `.dark` |

### app/public/landing.html

| Hook | Kind | Defined at | Read/used by in app code |
|---|---|---|---|
| `<title>Profile Not Found</title>` | title | landing.html:7 | - |
| `/style.css` | URL route | landing.html:8 | shares P/style.css with the Profile page |
| inline `<style>` body / `.container` / `h1` / `p` | CSS rule | landing.html:9-33 | overrides style.css body 12-21, .container 23-30, h1 61-65 |
| `div.container` | class | landing.html:37 | inline style 19-22; style.css:23-30 |
| "Profile Not Found" (h1) | heading text | landing.html:38 | - |
| "Make your own page." (p) | static text | landing.html:39 | - |
| `a.link-card[href="/edit/signup"]` (inline style) | class, route | landing.html:40-41 | style.css:86-104; route editor.js:278 |
| `div.link-content` | class | landing.html:42 | style.css:114 |
| `span.link-title` "Create Your Own Page" | class, link text | landing.html:43 | style.css:118-123 |
| `span.link-subtitle` "Powered by n8n & Git & Netlify" | class, static text | landing.html:44 | style.css:125-128 |
| `a[href=youtube watch?v=_vneaf1ch0I][target=_blank]` "Watch Tutorial on YouTube" (no rel) | link text | landing.html:49-53 | - |
| `i.fas.fa-external-link-alt` | class | landing.html:51 | Font Awesome is NOT loaded on this page, so it renders nothing |
| `div.video-wrapper` | class | landing.html:55 | no CSS rule (inline style only) |
| `video.lazy-video[data-src="example.webm"]` controls playsinline | class, data-* | landing.html:56 | inline script: querySelectorAll("video.lazy-video") 65; `dataset.src` 71-72; classList.remove("lazy-video") 75. example.webm is not in app/public (only images/), so the src falls to the server catch-all |
| "Your browser does not support the video tag." | static text | landing.html:58 | - |
| DOMContentLoaded listener + IntersectionObserver | event listener | landing.html:64, 68 | lazy-loads the video |

### app/public/index.html (Profile page, served with the bootstrap block injected)

| Hook | Kind | Defined at | Read/used by in app code |
|---|---|---|---|
| `<title>Linkme Clone</title>` | title | P/index.html:7 | overwritten by script.js:113 renderProfile (`profile.displayName`) |
| `/style.css` | URL route | P/index.html:8 | - |
| Font Awesome 6.0.0 CDN link | URL | P/index.html:9 | `fas` icons 42, 47, 54; script.js:151 |
| `div.container` | class | 13 | style.css:23-30 |
| `header.profile-header` | class | 15 | style.css:33-37 |
| `div.avatar-container` | class | 16 | style.css:39-46 |
| `#avatar` (img.avatar alt="") | id, class | 17 | script.js:5 getElementById; src 117; style.css:48-52 |
| `div.profile-info` | class | 19 | style.css:54-59 |
| `#displayName` (h1 "Loading...") | id, heading text | 20 | script.js:3; textContent 115; style.css:61-65 h1 |
| `#verifiedBadge` (img.verified-badge alt="Verified", inline display:none, wikimedia src) | id, class | 21-22 | script.js:6; style.display 129; style.css:67-70 |
| `#bio` (p.bio) | id, class | 24 | script.js:4; textContent 116; style.css:72-76 |
| `#linksContainer` (main.links-container) | id, class | 28 | script.js:8; innerHTML='' 134; appendChild 197; style.css:79-84 |
| `footer.footer` "Powered by " + `a[href="landing.html"]` "ofl.ink" | class, link text | 33-34 | style.css:136-146 |
| `#overlay` (div.overlay.hidden) | id, class | 39 | script.js:9; classList hidden/active 357, 359, 363, 364; click-outside 408; style.css:149-170, 186, 253 |
| `div.overlay-content` | class | 40, 56 | style.css:172-188, 196-206 |
| `div.lock-icon` > `i.fas.fa-lock` | class | 41-42 | style.css:190-194 |
| "Mature Content Disclaimer" (h2) | heading text | 44 | - |
| "This link may contain graphic or adult content." | static text | 45 | - |
| `#continueBtn` (button.continue-btn "Continue (18+)") | id, class, button text | 46 | script.js:11; click 371; text 'loading...' 383, 'Continue (18+)' 396, 402; disabled 384, 397, 403; style.css:208-228 |
| `#closeOverlayBtn` (button.close-btn, icon only, no aria-label) | id, class | 47 | script.js:10; click 368; style.css:242-251 |
| `#igOverlay` (div.overlay.hidden, inline style) | id, class | 51-52 | script.js:12; classList 335-336, 342-343; style.css:231-240 |
| `i.fas.fa-arrow-up.ig-arrow-anim` | class | 54 | `ig-arrow-anim` has no CSS rule anywhere |
| "Open in System Browser" (h2) | heading text | 58 | - |
| `#igOpenBtn` (a.continue-btn href="#") "Open in browser" | id, class, link text | 59 | script.js:14; href 330; style.css:231-236 |
| `#igAltBtn` (a.continue-btn hidden) "Try another way" | id, class, link text | 60 | script.js:15; hidden 331; href 332; style.css:238-240 |
| instructions p ("This app restricts some links. ... "Open in External Browser" or "Open in System Browser" ...") | static text | 61-65 | - |
| `#igTarget` (p) | id | 66 | script.js:16; textContent 333; read 350 |
| `#igCopyBtn` (button.continue-btn) "Copy link" | id, class, button text | 67 | script.js:17; click 349 |
| `#igCloseBtn` (button.continue-btn hidden) "Close" | id, class, button text | 68 | script.js:13; hidden 334; click 347 |
| `<script src="/script.js"></script>` | exact string | 72 | server.js:260 BOOTSTRAP_BEFORE; the bootstrap block is inserted before it (server.js:267) |
| `#profile-bootstrap` (`script[type=application/json]`) | id (server-injected, not in the static file) | server.js:266 | script.js:34 |
| aria-* / role / label / form | - | none | the Profile page has no aria attributes, roles, labels or forms |

### app/public/script.js

Re-read after a concurrent edit landed on disk mid-task (`git diff` shows script.js modified: Escape/Deeplink pop-out). Lines
below are the CURRENT working-tree file (413 lines). All code runs inside one `DOMContentLoaded` listener (script.js:1-413).

#### Functions

| Name | Lines | Purpose |
|---|---|---|
| DOMContentLoaded handler | 1-413 | grabs ids 2-17, reads bootstrap 34, fetches Profile JSON 63-109, binds listeners |
| `IN_APP_BROWSER`, `isInAppBrowser`, `isIOS`, `isIOSInstagram`, `isAndroid` | 25-29 | UA checks |
| `renderProfile(profile)` | 111-131 | title, name, bio, avatar, favicon, verified badge |
| `renderLinks(links)` | 133-199 | build `.link-card`s and their click handlers |
| `MODES`, `defaultMode()` | 202-206 | Profile default Mode or escape_ig |
| `effectiveMode(link)` | 208-210 | Link Mode or default |
| `trackingKey()` | 215-217 | localStorage key `linkme_tracking_id:${profile.id}` |
| `storedTrackingCode()` | 220-222 | read stored Tracking Code |
| `revealUrl(linkId)` | 225-244 | `/.netlify/functions/reveal?id=&user=[&trackingId=]` |
| `goToDestination(link)` | 247-253 | Reveal or navigate to link.url |
| `revealAndGo(link)` | 255-267 | fetch Reveal then travel |
| `escapeTarget(linkId)` | 270-275 | https URL on this host at Profile path (+ code, + ?link=) |
| `escapeLink(url)` | 280-284 | x-safari- (iOS) / Chrome intent without fallback (Android) / null |
| `appIntent(url)` | 288-291 | package-less Android intent with browser fallback (replaces the old `httpsIntent`) |
| `popOut(url)` | 294-297 | navigate to escapeLink(url) when there is one (called 87, 97, 100, 303) |
| `escapeOnTap(link)` | 300-305 | Escape from a tap (popOut), then show Escape Overlay |
| `travel(link,url)` | 310-319 | Deeplink + https: escapeLink in an In-App Browser, appIntent on Android, else plain navigation |
| `addressBeforeOverlay`, `pointAddressAt(target)` | 322-326 | swap address bar while overlay shows |
| `openEscapeOverlay(target,closeable)` | 329-338 | fill and show #igOverlay |
| `closeEscapeOverlay()` | 340-345 | restore address, hide #igOverlay |
| `openOverlay(linkId)` | 355-360 | show Age Gate #overlay |
| `closeOverlay()` | 362-366 | hide Age Gate |

#### fetch calls

| Method | Path | Function | Line |
|---|---|---|---|
| GET | `/api/profiles/${username}.json` | DOMContentLoaded handler | 63 (server.js:67) |
| POST keepalive | `/v/${username}` (Page View Ping) | DOMContentLoaded handler, after render | 77 (server.js:98) |
| GET | revealUrl(link.id) = `/.netlify/functions/reveal?...` | revealAndGo | 256 (server.js:112) |
| GET | revealUrl(currentLinkId) | continueBtn click handler | 386 |

#### Bootstrap, routes and URL handling

| Hook | Kind | Defined at | Read/used by |
|---|---|---|---|
| `#profile-bootstrap` JSON `{username, trackingCode, profilePath}` or null | id | server.js:266 (built by app/src/host-resolver.js resolveProfileRequest 41-50) | script.js:34 `JSON.parse(document.getElementById('profile-bootstrap').textContent)`; null -> `/landing.html` 35-37; `username, profilePath` 39; `trackingCode` 40 |
| `'index.html'` / empty username -> default `juliafilippo_` | static text | script.js:44-47 | so `/` on a primary host (bootstrap username '') loads that Profile, and reaches `/landing.html` only if its fetch fails (108) |
| `/landing.html` | route | script.js:36, 108 (location.href) | P/landing.html |
| `?link=` (Link Shortcut) | URL param | read script.js:42; written into escape target 273 | 80, 85, 104 |
| history.replaceState | history | 57 (profilePath, outside In-App Browsers), 325 (target.path), 341 (restore) | - |
| `window.location.hash` | URL hash | read only in pointAddressAt 324 | - |
| `linkme_tracking_id:${id}` | localStorage key | trackingKey 216 | set 71, read 221 |
| `link[rel~='icon']` | selector | renderProfile 120 (querySelector), created 122-124 | favicon = avatarUrl |
| `x-safari-`, `intent://...package=com.android.chrome`, `instagram://extbrowser/?url=` | URL schemes | escapeLink 281-282; appIntent 289; openEscapeOverlay 332 | popOut 296, travel 312-314, #igOpenBtn 330, #igAltBtn 332 |

#### JS-created hooks and text

| Hook | Kind | Defined at | Read/used by |
|---|---|---|---|
| `div.link-card` | class | renderLinks 136-137 | style.css:86-104 |
| `div.link-content` | class | renderLinks 141-142 | style.css:114-116, 308-318 |
| `span.link-title` (text = link.title) | class | renderLinks 144-146 | style.css:118-123 |
| `i.fas.fa-lock.lock-icon-small` (adult) | class | renderLinks 150-152 | style.css:130-133 |
| `span.link-subtitle` link.subtitle or "Exclusive Content" / "Social Media" | class, static text | renderLinks 155-157 | style.css:125-128 |
| `.has-bg-image` + inline backgroundImage / aspectRatio | class (added) | renderLinks 160-161, 169 | style.css:261-328 |
| `img.link-icon` (only with a background) | class | renderLinks 176-179 | style.css:336-345 |
| `.active` / `.hidden` | class (toggled) | 335-336, 342-343, 357, 359, 363-364 | style.css:167-170, 186-188, 253-258 |
| "loading..." / "Continue (18+)" | button text | continueBtn handler 383, 396, 402 | duplicates P/index.html:46 |

#### Event listeners

| Event | Bound to | Defined at | Handler |
|---|---|---|---|
| DOMContentLoaded | document | 1 | whole script |
| click | each `.link-card` | renderLinks 187 | Age Gate / escapeOnTap / goToDestination |
| load | preloaded background Image | renderLinks 166 (img.onload) | sets aspect-ratio |
| click | #igCloseBtn | 347 | closeEscapeOverlay |
| click | #igCopyBtn | 349 | clipboard.writeText(#igTarget text) |
| click | #closeOverlayBtn | 368 | closeOverlay |
| click | #continueBtn | 371 | Escape or Reveal then travel |
| click | #overlay (target === overlay) | 408 | closeOverlay |
| keyboard | - | none | no Escape-key close for either overlay |

### app/public/style.css (rule blocks)

| Hook | Kind | Defined at | Element(s) it styles |
|---|---|---|---|
| `:root` vars, `body` | CSS vars/element | 1-10, 12-21 | both index.html and landing.html (landing overrides body) |
| `.container` | class | 23-30 | P/index.html:13; landing.html:37 |
| `.profile-header`, `.avatar-container`, `.avatar`, `.profile-info` | class | 33-37, 39-46, 48-52, 54-59 | P/index.html:15-19 |
| `h1` | element | 61-65 | #displayName; landing h1 (overridden inline) |
| `.verified-badge`, `.bio` | class | 67-70, 72-76 | P/index.html:21, 24 |
| `.links-container` | class | 79-84 | P/index.html:28 |
| `.link-card`, `.link-card:hover` | class | 86-104 | script.js:137; landing.html:40 |
| `.link-thumbnail` (+ `.has-bg-image .link-thumbnail` 320) | class | 106-112 | not created anywhere (dead) |
| `.link-content`, `.link-title`, `.link-subtitle`, `.lock-icon-small` | class | 114, 118-123, 125-128, 130-133 | script.js:142, 145, 156, 151; landing.html:42-44 |
| `.footer`, `.footer a` | class | 136-146 | P/index.html:33-34 |
| `.overlay`, `.overlay.active`, `.overlay-content`, `.overlay.active .overlay-content` | class | 149-188 | #overlay, #igOverlay |
| `.lock-icon`, `.overlay-content h2`, `.overlay-content p` | class | 190-206 | P/index.html:41-45 |
| `.continue-btn` (+ :hover, :disabled) | class | 208-228 | #continueBtn, #igOpenBtn, #igAltBtn, #igCopyBtn, #igCloseBtn |
| `#igOverlay .continue-btn`, `#igOverlay .continue-btn[hidden]` | id + class | 231-240 | P/index.html:59-68 |
| `.close-btn` | class | 242-251 | #closeOverlayBtn |
| `.hidden` | class | 253-258 | #overlay, #igOverlay |
| `.link-card.has-bg-image` (+ ::after, :hover::after, .link-content, :hover) | class | 261-328 | script.js:161 |
| `.link-bg-image` | class | 331-333 | not created anywhere (dead) |
| `.link-icon` | class | 336-345 | script.js:178 |

#### Cross-dependencies

1. stats.js <-> editor.js share one global scope (classic scripts, E/index.html:16-17, stats.js loaded first). stats.js calls
   editor.js `api` (32), `onboarded` (45), `drawRetry` (55), `show` (56), `select` (78), `el` (67 and throughout),
   `render` (144), `creatorNav` (145); editor.js:284 calls stats.js `openStats` (44). Renaming any of these breaks the other
   file. A new editor.js top-level `const`/`let` named like a stats.js one (`DAY_MS`, `PAGE_SIZE`, `RANGES`, `ctrText`, `sum`,
   `labelIds`, `labelId`, `countryName`) throws at load; a same-named `function` (`card`, `bar`, `table`, `rangeDays`,
   `statsRows`, `showRange`, `filterControl`, `drawStats`) silently replaces the other.
2. editor.css <-> editor.js/stats.js: every class listed above is JS-created and styled only in editor.css. Attribute-coupled
   rules: `.creator-nav a[aria-current="page"]` (css 172 <- editor.js:292), `.range-tab[aria-pressed="true"]` (178 <-
   stats.js:149), `input[readonly]` (167 <- editor.js:601), `button:disabled` (123 <- submitting() and the list buttons).
   `.message.error/.ok` depend on say()'s `message ${kind}` string (editor.js:157). The up/down/delete glyphs exist only in
   CSS (158-161), so those buttons' accessible names come only from aria-label (editor.js:878-880).
3. E/index.html <-> editor.js/editor.css: `#screen` and `#title` are the only static ids and editor.js:33-34 needs both
   (render() would throw on null). `.topbar`, `.topbar-title`, `.screen` exist only in index.html + editor.css. Asset paths
   `/edit/editor.css`, `/edit/stats.js`, `/edit/editor.js` are served by server.js:229-232; an unknown `/edit/*` path returns
   index.html, so a misspelt asset path fails silently as HTML.
4. P/index.html <-> script.js: ids displayName, bio, avatar, verifiedBadge, linksContainer, overlay, closeOverlayBtn,
   continueBtn, igOverlay, igCloseBtn, igOpenBtn, igAltBtn, igTarget, igCopyBtn are all required (listeners are bound
   unconditionally at 347, 349, 368, 371, 408). `#profile-bootstrap` is defined only by server.js:266 (also read by
   tests/e2e/05-domains.spec.ts:224 and tests/e2e/domains-helpers.ts:7); its injection needs P/index.html:72 to stay
   byte-for-byte `<script src="/script.js"></script>` (server.js:260), else script.js:34 throws on null.
5. P/style.css is shared by index.html and landing.html (landing.html:8). The landing card reuses `.container`, `.link-card`,
   `.link-content`, `.link-title`, `.link-subtitle`; landing.html's inline `<style>` (9-33) overrides body, .container, h1, p.
   Restyling the landing through style.css changes the Profile page too.
6. Routes across files: landing.html:40 `/edit/signup` -> editor.js:278. script.js:36, 108 -> `/landing.html`. index.html:34
   footer `landing.html` (relative). server.js:252 serves landing.html as the 404 body of `/netlify/*`. `/` is not mapped to
   landing.html by server.js or Caddyfile: it serves the Profile page with bootstrap username '' and script.js:44-47 swaps in
   `juliafilippo_`.
7. editor.js ICONS (522-528) <-> files P/images/{onlyicon,linkicon,twitchicon,igicon}.webp fetched at `/images/<file>`
   (editor.js:704) and matched back by file-name prefix (662). editor.js API paths <-> server.js PROXIED (line 200:
   users|profiles|links|dailyStats), `/api/upload` (161), `/api/files` (129).
8. Hooks defined in two places:
   - `.avatar`: editor.css:166 and style.css:48 (separate pages, no conflict). `.container`: style.css:23 and landing inline 19.
     `h1`/`h2`/`body`/`:root`: both stylesheets (separate pages).
   - "Edit Profile": E/index.html:13 (initial) and editor.js:810. "Continue (18+)": P/index.html:46 and script.js:396, 402.
   - Same visible text on several controls: "Continue" (editor.js:430, 474, 618), "Log in" (title/h1 327, button 325, link
     368, button 494), "Try again" (title, h1 and button 400), "Resend email" (419, 472), "Copy" (757 on Live and Home),
     "Add link" (button 826 and heading 738), "Stats" (nav link 295, h1/title stats.js:144-146), "Username" (labels 183 and
     605), "Clicks"/"Page Views"/"CTR" (cards and column headers), "Links" (ul aria-label editor.js:848, Stats h2 158,
     Stats column "Link" 158, filter label "Link" 153, icon option "Link" 525).
   - Same `name` on different screens: `mode` (670 Link form, 796 Quick Settings), `username` (163, 601), `email`
     (307, 333, 444), `password` (308, 334, 483), `link`/`country` (stats.js:78).
   - `hidden` attribute (editor.js:575; P/index.html:60, 68 with style.css:238) vs `.hidden` class (style.css:253).
   - `#stats-label-N` ids are regenerated on every Stats redraw (counter stats.js:62 never resets), so no fixed id exists.
