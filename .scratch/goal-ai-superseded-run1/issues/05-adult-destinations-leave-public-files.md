# 05: No Adult Link carries its Destination in a public file

Spec: docs/spec/phase-00-security-cleanup.md
Covers: user stories 12, 34
Seams: v1's HTTP surface as the dev server stand-in serves it (Playwright `request`, crawling every file in the published folder), compared against BASE. The regenerate tool is checked by a re-run. Static checks cover secrets.json and git's index.
Blocked by: 04: Every Link gets its own random 12-digit Link Id…
Status: ready-for-agent

**What to build:** The regenerate tool also empties the `url` of every Adult Link. From an Adult Link's card, the Age Gate and Reveal become the only way to its Destination. Every Adult Link still reveals the same Destination as before.

A crawler that fetches every file in the published folder finds no Adult Destination, with one exception: the `url` of a non-Adult Link. Today 6 such Links, in jaka5, jaka6q, jaka7q and motherfucker, carry 2 of the 12 Adult Destinations. The tool lists each of them by Profile file and title, never by Destination, so the Operator can decide whether to mark them Adult. It does not change them.

This is the last agent ticket in the Phase: the spec's whole Acceptance block passes, apart from its `# manual:` lines.

ASSUMPTION: emptying Adult Links' urls is its own ticket, after regeneration. Run again on ticket 04's output, the tool keeps every id and still finds each Adult Destination under its kept id. The split therefore needs no extra data step (rung 5). Overturned if the tool must land whole in one ticket.
ASSUMPTION: this ticket is ready rather than parked, although the Operator has not yet ruled on the six listed Links (Phase 1, D1, under `## Needs the human` in docs/spec/plan-review.md). Emptying Adult urls and listing the six are needed whichever way that ruling goes, and a ruling to mark them Adult is absorbed by running the tool again (rung 4). Overturned if that ruling must land before Phase 0 counts as done.

- [ ] Every file under the published folder is listed from disk and fetched through the server (spec test 5). Each body is searched for every Adult Destination, which is read from secrets.json and held in memory, skipping only the `url` of non-Adult Links. No body contains one.
- [ ] No served Adult Link has a non-empty `url`.
- [ ] Every Adult Link still reveals exactly its BASE Destination. The spec's test 6 and the smoke spec still pass.
- [ ] The tool lists every non-Adult Link whose `url` is also an Adult Link's Destination, by Profile file and title and never by Destination. It leaves those Links unchanged.
- [ ] Running the tool again changes nothing. The secrets equality check still holds. In git's index, each capitalised case twin matches its lower-case twin, empty Adult urls included.
- [ ] Every line of the spec's Acceptance block passes when run from the workspace root, apart from the `# manual:` lines.
- [ ] linkme_clone3 ends with exactly two local commits on top of BASE: code first, then data. The tool change sits in the code commit and its output in the data commit. Nothing is pushed.
- [ ] Playwright: extends `tests/e2e/00-security-cleanup.spec.ts`. `./check.sh` passes.
