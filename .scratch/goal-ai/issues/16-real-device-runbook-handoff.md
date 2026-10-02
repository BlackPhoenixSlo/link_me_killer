# 16: Phase 1 real-device runbook: the Operator's handoff for the n8n import, the deploy preview and real phones

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 6, 7, 8, 9, 36, 37
Seams: the live n8n, a Netlify deploy preview of v1, and real iOS and Android phones. Agents can reach none of these. They are the spec's `# manual:` lines in Acceptance and its Further Notes.
Blocked by: 06: Go-live runbook: the Operator's handoff for n8n, GitHub and the live site; 07: The Fixture Profile and a Mode-less fixture open locally…; 08: A Link Shortcut opens its Link with the Tracking Code it arrived with…; 09: The Profile's default Mode decides whether the Escape Overlay shows on open…; 10: Each Link can carry its own Mode…; 11: An Escape Mode tap fires the Escape from the Visitor's own tap…; 12: The Escape Overlay offers every way out…; 13: On Android the Escape opens Chrome…; 14: Deeplink Mode hands the Destination's https link to the phone…
Status: parked — needs-human: every step needs the Operator's own n8n, GitHub, Netlify and phones. Importing into the live n8n, pushing a branch for a deploy preview, running real devices and pushing to production are all barred to agents.

**What to build:** Nothing, for an agent. Once tickets 07–14 are done and Phase 0's go-live runbook (ticket 06) is complete, the Operator signs off Phase 1 on real phones and only then gives it to ofl.ink. Do the steps in order.

Phase 0's runbook re-clones every v1 checkout (ticket 06, step 8). Phase 1's local commits are carried onto that fresh checkout first. If ticket 15 has been unparked and done, its n8n and data changes go out in the same import and push.

- [ ] Before anything leaves the machine, the spec's whole Acceptance block passes from the repo root, apart from its `# manual:` lines. That includes `./check.sh`, which runs `tests/e2e/01-link-modes-and-escape.spec.ts` and the smoke spec.
- [ ] **n8n import.** The n8n Form export is imported into the live n8n and activated. One throwaway Profile is edited through the n8n Form: one Mode at the profile step, and a different Mode on one Link.
  - The Profile file in GitHub carries the Profile's default Mode and that Link's own Mode.
  - A Link left on the Profile's Mode is saved without a Mode of its own.
  - Re-opening the Form pre-selects both radios.

  If the import rejects the radio fields, ticket 09 and ticket 10 reopen with the spec's fallback: a dropdown, as the icon field already uses.
- [ ] **Deploy preview.** Phase 1 is published to a Netlify deploy preview of v1, not to ofl.ink production. The preview holds a test Profile with one Direct Link, one Escape Link, one Deeplink Link and one Adult Escape Mode Link.
- [ ] **Real-device matrix**, run on that preview using the rows in RUN.md: iOS and Android × the Instagram, Facebook, Threads and TikTok In-App Browsers, plus Safari and Chrome, for each Mode. Each row names the device, OS version and app version.
  - Direct opens in place.
  - Escape lands in the System Browser on `/{username}/{code}?link=…`, the Link opens there, and the final OnlyFans address ends in `/c{code}`. When it does not, the overlay's menu instruction and "Copy link" still get the Visitor out.
  - Escape on one Android phone with Chrome disabled lands in the fallback browser, not on a dead Link.
  - Deeplink with the Destination's app installed opens the app. Without the app, it opens the web page.
  - One pass/fail is recorded per cell in RUN.md.
- [ ] The matrix's verdict on each of the spec's flagged ASSUMPTIONs that name it as their falsifier is written next to the rows, so the spec can be revisited:
  - "Try another way" offered on iOS Instagram only;
  - the overlay shown right after the tap;
  - iOS Deeplink relying on Universal Links;
  - an Adult Deeplink Link navigating from the Reveal callback.
- [ ] **Production.** Only after every row passes, the v1 repo is pushed so that ofl.ink production gets this Phase.
