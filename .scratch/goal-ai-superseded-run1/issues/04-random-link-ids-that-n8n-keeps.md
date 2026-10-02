# 04: Every Link gets its own random 12-digit Link Id that the n8n Form keeps, and old ids stop revealing

Spec: docs/spec/phase-00-security-cleanup.md
Covers: user stories 4, 5, 6, 7, 8, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 35
Seams: v1's HTTP surface as the dev server stand-in serves it (Playwright `page` and `request`), compared against BASE. The regenerate tool is checked through its served output, a re-run and a disposable fixture. Static checks cover secrets.json, git's index and the n8n Form export.
Blocked by: 01: The dev server stand-in follows netlify.toml…; 03: Only the site folder is published…
Status: ready-for-agent

**What to build:** The Operator runs a new regenerate tool on the repaired, moved data. It is a dependency-free Node script that sits next to the optimize tool.

- Every Link ends up with a random 12-digit Link Id, unique across ofl.ink, with no trace of the Username. Links that shared an id each get their own.
- secrets.json is rebuilt. It holds one entry per current Link that has a Destination, under that Link's new id.
- Every Link still leads to the same Destination, including through the Age Gate, a Tracking Code and a Geo Rule.
- Every old id, whether leaked or guessed, gets 404 from Reveal.
- Each banner is copied to the name n8n will build from its Link's new id, so the next n8n edit keeps it.

The tool prints what the Operator needs:
- each Link's old and new id, for replacing shared Link Shortcuts;
- every Link with no Destination on record;
- every old id that more than one Link shared.

It refuses to write anything if a Profile file does not parse. A second run changes nothing, so the Operator can re-run it on the data pulled at go-live.

The n8n Form stops undoing this. An edit keeps each Link Id already stored in the Profile's file. A new Link, or one that arrives in an uploaded file, gets a fresh random 12-digit id.

Adult Links keep their `url` in this ticket; ticket 05 empties it. The banner copy has to happen in the same run that changes the ids. A later run keeps the ids, so it copies nothing (spec, regenerate-link-ids step 6).

ASSUMPTION: the n8n Form's Link Id rule goes in this ticket rather than its own. Plan §7 makes every ticket name a Playwright spec, and the n8n Form has no HTTP seam here. The rule is also the writer's half of the same Link Id behaviour (rung 5). Overturned if a ticket may rest on static checks alone; the rule then splits into its own ticket, blocked by 03.

- [ ] Across all served Profiles, every Link Id is 12 digits and no two are the same (spec test 4).
- [ ] Every Link leads where it did at BASE, matched by Profile file and position (spec test 6):
  - an Adult Link's Reveal answers 200 with exactly its BASE Destination;
  - a non-Adult Link's served `url` equals its BASE `url`;
  - asdfasdf's Adult Link, which had no Destination anywhere at BASE, answers 404.
- [ ] Every Link Id in BASE's Profile files, and every key in BASE's secrets.json, gets 404 from Reveal, and none of them is served (spec test 7).
- [ ] A Visitor opening an old Link Shortcut sees the Profile and stays on it after Reveal answers 404 (spec test 12).
- [ ] These pass unchanged against the new ids: the smoke spec (Age Gate, then Reveal), the Geo Rule test and the Tracking Code test.
- [ ] secrets.json holds exactly one entry per current Link that has a Destination (the spec's secrets equality check). That means every Adult Link except asdfasdf's, plus every non-Adult Link with a `url`.
- [ ] Running the tool again changes nothing, image bytes included (the spec's idempotency check).
- [ ] The spec's fixture checks pass on a disposable fixture that holds no real data:
  - given a Profile file that does not parse, the tool exits non-zero, names the file and writes nothing;
  - given a Link with no Destination, the tool reports it.
- [ ] The tool prints each Link's old and new id, every Link with no Destination on record, and every old id that more than one Link shared. Each line names the Profile file and the Link's title, never a Destination.
- [ ] Every Link with a banner whose id changed shows its banner from a copy named after its new id. The original images stay where they are. A Link whose source image is missing keeps its path and is reported. Every banner still loads (spec test 11).
- [ ] In git's index, each capitalised case twin carries the same new content as its lower-case twin (the spec's twin check).
- [ ] Geo Rules, tracking settings, titles, icons, avatars and Link order are unchanged.
- [ ] The n8n Form keeps a Link's id when the Profile's stored file already has it, and gives every other Link a fresh random 12-digit id. The Username is never part of an id. The banner-name expression and every other node stay unchanged. The spec's static n8n checks pass: the workflow is still active, both id nodes exist, and no id is built from the Username or from 1..1000.
- [ ] In linkme_clone3, the tool joins the code commit and its output joins the data commit. Nothing is pushed.
- [ ] Playwright: extends `tests/e2e/00-security-cleanup.spec.ts`. `./check.sh` passes.
