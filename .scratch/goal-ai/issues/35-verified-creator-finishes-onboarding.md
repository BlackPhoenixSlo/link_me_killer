# 35: A verified Creator finishes Onboarding with a display name and a first Link, and their Profile is live

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 18, 19, 20, 21, 40, 41, 43, 44, 45, 51, 52
Seams: Creator journeys in Playwright's browser at a phone-sized viewport. The Visitor side in a fresh browser context with no Editor session, with the navigation intercepted as in `00-smoke.spec.ts`. Rule probes through Playwright `request` at the same origin. The superuser marks the account verified at PocketBase's loopback port, standing in for the email link.
Blocked by: 34: An invited Creator signs up on one screen, claims a Username… (the claim and the verify pause this continues from); 20: A Click on v2 ends at the same Destination as on v1… (the Reveal and redirect a Visitor's tap goes through); 22: An edit made through PocketBase shows on the next page load (the public page reads PocketBase afresh on each load)
Status: ready-for-agent

**What to build:** The rest of Onboarding, as a narrow path from the verify pause to a live Profile.

- Once the account is verified, "Continue" moves on to the Profile step: a display name (required) and a bio. The avatar joins this step in ticket 38.
- The first-Link step uses the Link form that the Editor will reuse. For now it holds a title and a Destination; tickets 37, 38 and 40 add the other fields.
- The last step shows the Profile's address with "Open" and "Copy", then leads into the Editor.
- Progress is derived, not stored. No display name goes to the Profile step, no Link to the first-Link step, and anything further to the Editor. A Creator who leaves halfway resumes at the first unfinished step.
- A save shows on the public Profile at the next page load. A failed save shows PocketBase's reason and keeps every field as typed.

PocketBase gains the verified-email gate. Only the owner, with a verified account, may update a Profile, and the update must leave the Username, the owner and the verified badge unchanged. Only the owner of a Profile, with a verified account, may add a Link to it. A Destination must start with `https://`, `http://` or `/`. The Editor does not pre-check the Destination; it shows PocketBase's refusal.

- [ ] Spec behaviour 2, verify gate. While unverified, the Creator's token can neither update the Profile nor add a Link over HTTP, and the owner reads both back unchanged. The superuser then marks the account verified, and "Continue" moves on to the Profile step.
- [ ] The Profile step will not move on without a display name.
- [ ] Onboarding: a display name and bio, then a first Link with a title and Destination, then the live-address screen. "Open" opens the Profile, "Copy" puts its address on the clipboard, and the Creator then reaches the Editor with the Link listed.
- [ ] In a fresh browser context, `/{username}` shows the display name and the Link title. The Destination string appears nowhere in that page's HTML or its network responses before the Link is tapped. A tap ends at the Destination entered.
- [ ] A Creator who logs out after the Profile step lands on the first-Link step at the next log-in. After the first Link, a log-in lands in the Editor.
- [ ] Spec behaviour 8. A Link saved with a `javascript:` Destination is refused by PocketBase. The form shows the reason, keeps every field as typed, and no Link is created.
- [ ] Spec behaviour 10, over HTTP. Each of these is refused, and the owner reads the record back unchanged:
  - another verified Creator updates the first Creator's Profile, or adds a Link to it;
  - the owner changes their own Username, owner or verified badge;
  - a Link is added with a Destination that does not start with `https://`, `http://` or `/`.
- [ ] Playwright: extends `tests/e2e/03-auth-and-editor.spec.ts`. `./check.sh` passes.
