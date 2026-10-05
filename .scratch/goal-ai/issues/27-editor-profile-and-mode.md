# 27: A Creator changes their Profile in the Editor and its default Mode reaches the page

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 22, 23, 24, 25, 31, 39, 41, 50
Seams: the running v2 stack at Playwright's baseURL: the Creator in the browser at 390×844; the Visitor in a fresh context, with an Instagram User-Agent for the Escape Overlay, reading the page and its Profile JSON
Blocked by: 26: A verified Creator goes through Onboarding to a live Profile whose Links act like imported ones
Status: done

**What to build:** The top of the Editor, laid out like the link.me Template's "Edit Profile" screen, phone-first:
- **"Your Bio Link".** The Profile's public address, with a copy button.
- **"Change Profile Picture".** It replaces the avatar through Phase 2's upload endpoint, which stores a 512 px webp.
- **The Profile panel.** Display name, the @Username read-only, and bio. The panel saves on its own Save button, with no autosave, and the last save wins.
- **"Quick Settings".** Where the Template has its "Deeplink Banner" row ("Help visitors switch to Safari/Chrome"), the Profile's default Mode: Direct, Escape or Deeplink. It decides whether the Escape Overlay shows when the page opens. It also moves every Link left on "Profile default", imported Links included, because Phase 2 serves each Link's effective Mode. The Link form's Mode option then reads "Profile default (currently …)" and names the new Mode.

The Editor offers no verified badge control, no Username change and no way to delete the Profile or account. Those stay with the Operator in PocketBase's admin UI. Every save shows on the public Profile at the next page load, with no build and no commit.

- [x] Editing the display name and the bio shows both on the next load of the public Profile.
- [x] Replacing the avatar with a new PNG makes the public Profile serve a new `image/webp` avatar.
- [x] "Your Bio Link" shows the Profile's public address, and its copy button puts that address on the clipboard.
- [x] With an Instagram User-Agent in a fresh context, the Escape Overlay shows when the page opens while the Profile default is Escape Mode. After the Creator switches the default to Direct Mode, it does not.
- [x] With one Link left on "Profile default" and one set to Escape, the public Profile JSON then gives the first Link Direct and keeps the second on Escape.
- [x] After the default changes, a new Link's form starts on "Profile default" and names the new Mode.
- [x] The Editor shows the Username read-only and has no badge control.
- [x] `./check.sh` passes.

## Build notes (implementer)

Files: `app/editor/editor.js` (the Editor's home: "Your Bio Link" with Copy, the Profile panel with "Change Profile Picture" and its own "Save profile", "Quick Settings" with the default Mode and its own "Save default Mode", then "Featured Links" and "Add link"; `upload()` now also returns the stored file's URL), `app/editor/editor.css` (the picture row, the avatar, the read-only field), `tests/e2e/03-auth-and-editor.spec.ts` (new describe "the Editor's Profile and default Mode", two journeys; `phoneContext` takes an optional User-Agent and the stack's origin as its host fence, and `proxy()` has `patch`, both used by ticket 26's tests too).

Observed: nothing server-side changed. `app/src/public-profile.js:19` serves each Link's `mode` as its own or else the Profile's (`profileMode`), and `app/public/script.js:81` opens the Escape Overlay when the served `profile.mode` resolves to `escape_ig` in an In-App Browser, so a saved default reaches both at the next load. The profiles update rule (1791140005_content_rules.js:30) already lets a verified owner set `displayName`, `bio` and `mode`. A token issued before the Operator marks the account verified writes as verified (PocketBase reads `@request.auth.verified` from the record), so the arrange step needs no re-login.

ASSUMPTION: "Your Bio Link" shows the full public address, scheme included (`http://localhost:4173/{username}` locally), so what it shows is what Copy puts on the clipboard (rung 5: one string; the Template shows "link.me/f_wei13" without a scheme, and ticket 26's placeholder showed the host alone). Overturned if the Operator wants the Template's scheme-less look; only the shown text changes.
Decided (rung 2, the spec's Contracts, "Each form saves on its own Save button, with no autosave"): "Change Profile Picture" is a field of the Profile panel, and the picked file goes to the upload endpoint on "Save profile", after display name and bio, as the Profile step does. The step and the panel are one form builder (`profileForm`); only the button label and the after-save action differ. Fix round 1 replaced the earlier ASSUMPTION that it uploaded the moment a file was picked (rung 3: the Template).
ASSUMPTION: the default Mode has its own form and "Save default Mode" button in "Quick Settings" rather than saving when the select changes (rung 2: the spec's Contracts, "Each form saves on its own Save button, with no autosave"). Overturned if the Operator wants the Template's toggle that acts at once.
ASSUMPTION: a save keeps PocketBase's answer in the Editor's in-memory Profile, in one place (`saveProfile`, used by the Profile step, the Profile panel and "Quick Settings"), so "Add link" names the default Mode just saved without a re-read; a reload or Cancel re-reads it through `/edit`'s routing (rung 5). Overturned if two tabs must see each other's saves without a reload (the spec already flags last-save-wins).
ASSUMPTION: the Profile panel refuses an empty display name with "Enter a display name.", as the Profile step does, because a Profile with none sends the Creator back to the Profile step at the next log-in (rung 3: ticket 26's Profile step). Overturned if a Creator may clear their display name.
ASSUMPTION: the @Username is a `readonly` text field labelled "Username" with a decorative `@` (aria-hidden), not a disabled one, so it reads and copies like the others (rung 5). Overturned if it must be plain text.
An empty stored default Mode shows as Escape in "Quick Settings", as PocketBase's field reads it (`pocketbase/pb_migrations/1791140001_profiles.js:22`, rung 1); the select field stores no other value, so the Editor writes no Mode the Creator did not see. Both Mode selects list `MODE_NAMES`'s entries.
ASSUMPTION: the new journeys arrange a verified Creator with a named Profile and its Links through the proxy with the Creator's own token, and only the verification goes to PocketBase as the Operator, so the describe skips off the local test stack (rung 3: ticket 26's `markVerified` and `onLocalStack`). Overturned when 31's mail catcher replaces the Operator step.

Validation: `./check.sh tests/e2e/03-auth-and-editor.spec.ts --project=chromium --reporter=line` 14 passed (red first: both new journeys failed on the Bio Link text and the missing "Quick Settings"); cold `./check.sh --reporter=line` 311 passed, 1 skipped (3.6m); afterwards 0 oflinkv2-e2e containers and volumes, nothing on 4173, `git -C linkme_clone3 status --porcelain` empty, the Destination-host scrub (`git ls-files -co --exclude-standard -z | xargs -0 grep -Il` on the OnlyFans host) empty.

Fix round 1: the picture moved into the Profile panel and uploads on "Save profile" (`profileForm`, shared with the Profile step); `saveProfile` is the one PATCH-and-keep helper; both Mode selects list `MODE_NAMES`'s entries; the test helpers above. `node --check app/editor/editor.js` OK; `./check.sh tests/e2e/03-auth-and-editor.spec.ts --project=chromium --reporter=line` 14 passed; cold `./check.sh --reporter=line` 311 passed, 1 skipped (3.6m); afterwards 0 oflinkv2-e2e containers and volumes, nothing on 4173, `git -C linkme_clone3 status --porcelain` empty, the Destination-host scrub empty.
