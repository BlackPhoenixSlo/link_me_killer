# 28: A Creator manages their Links in the Editor and a refused save keeps what they typed

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: user stories 26, 28, 30, 34, 35, 36, 37, 38, 39, 40, 48
Seams: the running v2 stack at Playwright's baseURL: the Creator in the browser at 390×844; the Visitor in a fresh context, reading the page and Reveal's real answer with the navigation intercepted
Blocked by: 26: A verified Creator goes through Onboarding to a live Profile whose Links act like imported ones
Status: ready-for-agent

**What to build:** The Editor's "Featured Links", laid out like the link.me Template's: one row per Link in the order Visitors see them, an up and a down button where the Template's drag handle sits, and a delete button.
- **Edit.** Opening a Link fills the Link form with its current values, the Destination included, which the owner may read. Any field can change. A background can be replaced through Phase 2's upload endpoint (1080 px webp) or removed.
- **Move.** Up or down swaps the Link's order with its neighbour's, which is two writes. If either write fails, the Editor shows the reason and reloads the list from PocketBase, so it never shows an order the page does not.
- **Delete.** A Link is deleted only after the Creator confirms.
- **Geo Rule.** A textarea filled with the current rule, pretty-printed. It must parse as a JSON object, or be empty for "no Geo Rule". Anything else blocks the save with a message and leaves the Link unchanged. There is no deeper schema check.
- **Destination.** The Editor does not pre-check the prefix. It shows PocketBase's refusal of a Destination that does not start with `https://`, `http://` or `/`.
- **A failed save** shows its reason and keeps every field as the Creator typed it.

Every save shows on the public Profile at the next page load.

- [ ] Each of these shows on the next load of the public Profile:
  - a Link title edited;
  - a Link's background replaced (a new `image/webp`), then removed;
  - a Link added, which appears last, then moved up, so the page's order follows;
  - a Link deleted: cancelling the confirmation keeps it, and confirming removes it.
- [ ] Reopening a Link shows its current Destination in the form. After the Creator changes it, Reveal answers the new Destination.
- [ ] Invalid Geo Rule JSON shows an error, and the Link read back is unchanged. A valid object saves and fills the textarea after a reload. Emptying the textarea clears the rule.
- [ ] A Link saved with a `javascript:` Destination is refused by PocketBase. The Editor shows the reason and keeps every field as typed.
- [ ] `./check.sh` passes.
