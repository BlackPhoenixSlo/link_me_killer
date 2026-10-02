# 36: In the Editor a Creator adds, edits, reorders and deletes their Links, and no one else can

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 27, 28, 37, 38, 39, 40, 41, 42, 43
Seams: Creator journeys in Playwright's browser at a phone-sized viewport. The Visitor side in a fresh browser context with no Editor session. Rule probes through Playwright `request` at the same origin, as a second verified Creator.
Blocked by: 35: A verified Creator finishes Onboarding… (the Link form, the verified gate and the Link create rule)
Status: ready-for-agent

**What to build:** The Editor's "Featured Links" becomes editable.

- "Add link" opens the same Link form as Onboarding's first-Link step.
- Opening a row shows that Link in the form, so any field can be changed, the Destination included.
- Each row has up and down buttons where the link.me Template has its drag handle. Moving a Link rewrites the Links' order.
- Each row has a delete button, which asks for confirmation first.

PocketBase lets only the Profile's owner, with a verified account, update or delete a Link. An update cannot move a Link to another Profile, and a changed Destination meets the same `https://`, `http://` or `/` rule as a new one.

- [ ] Spec behaviour 4, first part. In the Editor, the Creator does each of these, and the public Profile shows the result at the next load:
  - edits a Link title;
  - adds a second Link and moves it up;
  - deletes a Link after confirming.
- [ ] Cancelling the confirmation keeps the Link.
- [ ] After every change, the Editor's rows are in the order Visitors see.
- [ ] Changing a Link's Destination to a `javascript:` one is refused. The form keeps what was typed, and the Link is unchanged.
- [ ] Spec behaviour 10, over HTTP. Each of these is refused, and the owner reads the record back unchanged:
  - another verified Creator updates or deletes the first Creator's Link;
  - either Creator moves a Link onto the other's Profile.
- [ ] Playwright: extends `tests/e2e/03-auth-and-editor.spec.ts`. `./check.sh` passes.
