# 43: Phase 3 runbook: the Operator's handoff for mail, real phones, the n8n Form and handing over imported Profiles

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 7, 9, 10, 16, 18, 49, 50
Seams: the VPS's PocketBase admin UI through the SSH tunnel, the Operator's SMTP credential, a real inbox, real iPhone and Android phones, and the live n8n. Agents can reach none of these. They are the spec's `# manual:` lines in Acceptance.
Blocked by: 31: Phase 2 VPS runbook: the Operator's handoff for the VPS, its DNS and the admin tunnel (v2 running on the VPS); 40: The Link form keeps OnlyFans tracking… and 41: "Forgot password", and the screens that the verification and reset emails open (with their own blockers they cover tickets 32 to 39); and, for step 5 only, 63: Cutover runbook handoff (its final v1 Import step)
Status: parked — needs-human: every step needs the Operator's SMTP credential, a real inbox, real phones, the live n8n or the VPS's PocketBase admin UI, all barred to agents.

**What to build:** Nothing, for an agent. Once tickets 32 to 41 are done and Phase 3 is on the VPS, the Operator proves the parts that need mail, phones and live systems. Do the steps in order.

- [ ] Before anything leaves the machine, the spec's whole Acceptance block passes from the repo root, apart from its `# manual:` lines. That includes `./check.sh`.
- [ ] **1. Mail.** In the VPS's PocketBase admin UI, under Settings → Mail, enter the SMTP sender: host, port, user, password and from-address. It is a human-held credential and is never committed.
- [ ] **2. Email round trip.** Add a real inbox to the invite list and sign up on the v2 host. The verification link opens a screen that says the email is verified. Then use "Forgot password", follow the email's link, set a new password, and log in with it.
- [ ] **3. Real phones.** On an iPhone (Safari) and an Android phone (Chrome), complete Onboarding with a camera photo, HEIC on iOS, as the avatar and as a Link background. The public Profile shows both as webp.
- [ ] **4. n8n becomes the Operator's alone.** Stop sharing the n8n Form's URL with Creators, and turn on Basic Auth on its "On form submission" trigger in n8n on the VPS. Nothing else in n8n changes. Until step 5, v1 Creators' pages are still edited through the n8n Form.
- [ ] **5. Hand-over, only after Cutover's final v1 Import.** For each v1 Creator, set their imported Profile's owner to their new account in PocketBase's admin UI. Their next log-in lands in the Editor on that Profile. Not before: every v1 Import until then overwrites Editor edits, because v1 wins.
