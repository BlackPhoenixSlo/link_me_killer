# 27: A Creator changes their Profile in the Editor and its default Mode reaches the page

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 22, 23, 24, 25, 31, 39, 41, 50
Seams: the running v2 stack at Playwright's baseURL: the Creator in the browser at 390×844; the Visitor in a fresh context, with an Instagram User-Agent for the Escape Overlay, reading the page and its Profile JSON
Blocked by: 26: A verified Creator goes through Onboarding to a live Profile whose Links act like imported ones
Status: claimed 20261004T191309Z 2026-10-05T03:29:58Z

**What to build:** The top of the Editor, laid out like the link.me Template's "Edit Profile" screen, phone-first:
- **"Your Bio Link".** The Profile's public address, with a copy button.
- **"Change Profile Picture".** It replaces the avatar through Phase 2's upload endpoint, which stores a 512 px webp.
- **The Profile panel.** Display name, the @Username read-only, and bio. The panel saves on its own Save button, with no autosave, and the last save wins.
- **"Quick Settings".** Where the Template has its "Deeplink Banner" row ("Help visitors switch to Safari/Chrome"), the Profile's default Mode: Direct, Escape or Deeplink. It decides whether the Escape Overlay shows when the page opens. It also moves every Link left on "Profile default", imported Links included, because Phase 2 serves each Link's effective Mode. The Link form's Mode option then reads "Profile default (currently …)" and names the new Mode.

The Editor offers no verified badge control, no Username change and no way to delete the Profile or account. Those stay with the Operator in PocketBase's admin UI. Every save shows on the public Profile at the next page load, with no build and no commit.

- [ ] Editing the display name and the bio shows both on the next load of the public Profile.
- [ ] Replacing the avatar with a new PNG makes the public Profile serve a new `image/webp` avatar.
- [ ] "Your Bio Link" shows the Profile's public address, and its copy button puts that address on the clipboard.
- [ ] With an Instagram User-Agent in a fresh context, the Escape Overlay shows when the page opens while the Profile default is Escape Mode. After the Creator switches the default to Direct Mode, it does not.
- [ ] With one Link left on "Profile default" and one set to Escape, the public Profile JSON then gives the first Link Direct and keeps the second on Escape.
- [ ] After the default changes, a new Link's form starts on "Profile default" and names the new Mode.
- [ ] The Editor shows the Username read-only and has no badge control.
- [ ] `./check.sh` passes.
