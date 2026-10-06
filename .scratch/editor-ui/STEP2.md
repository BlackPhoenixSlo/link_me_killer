# Step 2 shared instructions (read after CONSTRAINTS.md)

Read: docs/spec/editor-redesign.md (sections 1, 2, 5, 7, 8 and 11; section 11's rulings override everything above it; plus the
section 4 screens you own), .scratch/editor-ui/test-inventory.md (sections 0–3 and the rows for your screens), and
app/editor/app.js (the shell: its exports are the API every screen uses).

Layout of the code after commit 8e0348e: app/editor/index.html, tokens.css, editor.css, stats.css (empty), app.js (shell,
router, helpers; exports: account, api, upload, signedIn, signOut, refresh, el, render, message, say, usernameInput,
addressField, fieldReasons, claimReason, show, go, link, onboard, onboarded, linksOf, route, creatorNav, submitting,
MODE_NAMES, ICONS, address, fileInput, select, check, copyButton, logOut), screens/auth.js, screens/links.js,
screens/profile.js, stats.js.

Rules for parallel work:
- Own only the files your task names. The signatures and behaviour of app.js's existing exports are frozen; the shell agent may
  add exports but not change or remove any. If you need a shared helper that does not exist, write it privately in your own file.
- Styling is by class names from brief section 5 (prefix `e-`) and the tokens in tokens.css. The shell agent writes editor.css;
  you only put class names on elements. If you need a class the brief does not list, name it `e-<component>__<part>` and list it
  in your report so the shell agent adds it.
- Every test contract in the inventory (headings, labels, button names, option texts, status texts, one role=status per
  screen, one <main>, nav aria-label "Creator", `aria-label="Links"` list with title-only rows, icon-only Up/Down/Delete with
  aria-labels "Move {title} up/down" / "Delete {title}") survives unless brief section 11 says otherwise.
- No stack runs (./check.sh, tests/stack.sh) and no docker: the coordinator runs the suite. Verify your screens with a static
  server + faked PocketBase answers as the split agent did: serve a temp dir with `edit -> app/editor` symlink on YOUR OWN
  port (given in your task), load http://localhost:<port>/edit/<path> with Playwright from node_modules at 390x844 and 1280x800,
  route /api/** to canned JSON, screenshot each state and LOOK at the screenshots with the Read tool. Fix what looks wrong.
  Check `document.documentElement.scrollWidth <= innerWidth` at 320 and 390. Zero pageerrors. Stop your server when done.
- Light theme: tokens.css is the palette; no colour literals in JS or CSS outside tokens.css.
- Copy: the brief's words; keep spec copy word for word; friendly, verb-first, no jargon ("PocketBase" never appears to a Creator
  except where a test pins it; see inventory row 13 for pinned texts).
