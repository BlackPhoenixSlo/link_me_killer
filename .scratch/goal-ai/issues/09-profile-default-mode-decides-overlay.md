# 09: The Profile's default Mode decides whether the Escape Overlay shows on open, in every In-App Browser the plan names

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 2, 4, 5, 6, 8, 9, 11, 12, 13, 14, 33
Seams: the Profile page under Playwright against the dev server, with Instagram, FBAN, TikTok, iOS Safari and desktop User-Agents. Profile variants are served by `page.route`, each changing one field of the Fixture Profile. The n8n Form export is checked as a static contract by the spec's `jq` checks.
Blocked by: 07: The Fixture Profile and a Mode-less fixture open locally…; 04: Every Link gets its own random 12-digit Link Id that the n8n Form keeps… (Phase 0's last edit to the n8n Form export, which this ticket builds on)
Status: ready-for-agent

**What to build:** The Operator sets a Profile's default Mode in the n8n Form's profile step, and the default decides whether In-App Browser Visitors see the Escape Overlay on open.

- **n8n Form.** The profile step offers a three-way radio. Its options are Direct, Escape and Deeplink, written as their stored values. It opens on the Mode the Profile already has, and the published Profile file carries the Operator's choice.
- **Which browsers count.** The page recognises the In-App Browsers of Instagram, Facebook, Threads and TikTok, using the plan's detection pattern.
- **Overlay on open.** In those browsers the Escape Overlay shows on open only when the Profile's default is Escape Mode.
  - A missing default, or a value the page does not recognise, resolves to Escape Mode. The 27 live Profiles therefore keep today's uncloseable overlay, which now also reaches Facebook, Threads and TikTok Visitors.
  - A Direct or Deeplink default shows no overlay on open.
  - A System Browser never shows the overlay.
- **Wording.** The overlay stops naming Instagram: it says "this app" and shows no brand icon. Its heading stays "Open in System Browser".
- The Mode logic stays in the page script, with no new Netlify-only coupling.

Links do not read their own Mode until ticket 10. Until then every Link follows the Profile's default, and taps behave as they do today.

ASSUMPTION: the app-neutral overlay wording ships here, because this is the ticket where Facebook, Threads and TikTok Visitors first see the overlay (rung 5). Overturned if the wording should change together with the overlay's controls in ticket 12.

- [ ] n8n Form export:
  - the profile step has exactly one radio, offering `direct`, `escape_ig` and `deeplink`;
  - the radio's default value reads the Profile's existing Mode, which the loader now outputs;
  - the profile JSON builder writes the Profile's default Mode into the Profile file.

  The spec's Acceptance `jq` checks for the profile step's radio and default, the loader and the profile JSON builder pass. Node names are unchanged, and nothing else in the export changes.
- [ ] iOS Instagram UA: the Fixture Profile, whose default is Direct, shows no overlay on open.
- [ ] Variant with a Deeplink default: no overlay on open.
- [ ] Variants with an Escape default, and with an unrecognised default: the overlay shows on open.
- [ ] Instagram, FBAN and TikTok UAs, parametrised: `fixture_v1/TC` shows the Escape Overlay on open, without Close.
- [ ] iOS Safari and desktop UAs: no overlay.
- [ ] The smoke spec stays green unchanged. This includes juliafilippo_, which has no Mode and still shows the overlay in Instagram.
- [ ] Reveal is not touched. The page gains no dependency, no build step and no new request.
- [ ] Playwright: extends `tests/e2e/01-link-modes-and-escape.spec.ts`. `./check.sh` passes.
