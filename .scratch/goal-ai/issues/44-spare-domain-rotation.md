# 44: Bio links move to a warmed Spare Domain the day ofl.ink is Flagged

Spec: docs/spec/phase-05-cutover-and-domains.md
Covers: user stories 44
Seams: a phone inside Instagram opening the warmed Spare Domain through a real bio link; `RUN.md`'s `## Cutover`, step 15; PocketBase's admin UI and the Operator's terminal for the next Spare Domain (step 4)
Blocked by: 43: The Operator switches ofl.ink to v2 by one DNS change while v1 stays live
Status: parked — needs-human: whether a Spare Domain survives a Meta Flag

**What to build:** Nothing in v2. The day Meta Flags ofl.ink, the Operator and Creators replace "ofl.ink" with a warmed Spare Domain in every bio link, and Visitors reach the same Profiles at the same paths, Tracking Codes and Link Shortcuts included, because every listed Spare Domain is always live (39, 40). The written procedure is step 15 of `RUN.md`'s `## Cutover` (41). This ticket can start once 43's steps 4 and 8 are ticked.

**Why parked.** Nobody knows yet whether rotation recovers traffic (plan-review, Needs the human, item 3; spec, Further Notes and ## Review, B18 and D11).
- For: a Spare Domain is a different origin, so a Flag on the hostname alone is escaped (D6, plan section 4).
- Against: the same pages, Destinations and server sit behind it, and DNS-only Custom Domains publish the server's address, so a Flag aimed at content or at the address may carry over.
- **Evidence that settles it:** on the first real Flag, open the warmed Spare Domain through the actual bio link in Instagram on a phone and follow a Link onward. A Meta warning there means rotation fails.

ASSUMPTION: one warmed Spare Domain is enough to call Spare Domains ready (the spec's, rung 5). Overturned if the Operator wants several held at once; step 4 then runs once per domain.

- [ ] On the first real Flag of ofl.ink, the evidence check is run on a phone and its result recorded in `RUN.md` with the date and the Spare Domain used.
- [ ] If no warning: the Operator and Creators replace ofl.ink with the warmed Spare Domain in every bio link the same day, and nothing in v2 changes. Links already posted outside bios keep ofl.ink and are not recovered.
- [ ] If no warning: the next Spare Domain is bought and warmed by step 4, ending with `test "$(curl -s -o /dev/null -w '%{http_code}' "https://$SPARE/$USERNAME")" = 200` and the in-Instagram check on a phone.
- [ ] If a warning: rotation is recorded as failed and the Operator chooses another mitigation, outside this Phase. A second server address is a candidate, not a proven cure.
