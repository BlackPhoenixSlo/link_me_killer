# 36: Only the owner reads a Profile's Stats and recording never blocks a Click or a deletion

Spec: docs/spec/phase-04-stats.md
Covers: user stories 10, 20, 23, 24, 29, 30, 33
Seams: PocketBase's records API on its loopback port, with each Creator's token and with none, for the rule checks; the same port as a superuser for Operator steps and reads. The running v2 stack at Playwright's baseURL through `./check.sh`: Visitors in fresh browser contexts, both Creators' Stats pages in the browser, and the `request` fixture for pings and `/r`, the rate limit read from the committed test env. The spec's Acceptance block
Blocked by: 34: Reveals and Link Shortcuts count as Clicks and Stats read per Link per day per country, 35: A Tracking Code stays with the Profile it arrived on, 22: Reveal and /r answer only v2's own origin within a per-client limit, 31: Verification and reset emails reach the local mail catcher and their links work
Status: claimed 20261005T084628Z 2026-10-05T13:56:01Z

**What to build:** A Creator's numbers are theirs alone, they keep their history when Links go, and the Event store can neither cost a Visitor a Click nor be flooded. This ticket closes the Phase's local Acceptance.

- **Owner only.** 33's migration wrote the rules: events closed to everyone but superusers, and `dailyStats` readable only by the signed-in owner of its Profile. This ticket proves them through PocketBase itself, because the same-origin proxy would refuse events before PocketBase's rules were reached. Wherever a probe gets through, this ticket closes it in the migration, to the spec's Schema and with no new rule.
- **Deleted link.** A deleted Link's past Clicks stay in the totals. In the Links table and the Link filter they appear as "Deleted link".
- **Deleted Profile.** Its Events go with it, and the delete succeeds.
- **A failing Event store never costs a Click.** The Event Recorder waits at most 300 ms for its write. Past that, `/r` and Reveal answer anyway and the write's outcome is only logged. A failed write is logged and swallowed.
- **The ping is rate-limited.** It uses Reveal's limiter code and threshold, with its own fixed-window counter keyed by the client address and the Username. The client address is found the way Reveal's limiter finds it. Over the limit the ping answers 429, as Reveal does. Its counter is separate, so Page Views never use up a Visitor's Reveals.
- **RUN.md** gains the spec's real-device row as pending: in Instagram on a phone, open a Profile on v2's VPS host; in PocketBase's admin UI the newest Event for that Profile shows In-App Browser instagram. 38 runs it.

ASSUMPTION: the spec's whole local Acceptance block runs on this, the Phase's last ready local ticket, as 22 and 31 close Phases 2 and 3 (rung 3). Test 4 is parked with the country source, so it holds only 34's no-header Visitor until 37 lands. The block's two Cloudflare and real-device `# manual:` lines are 37's and 38's. Overturned if the build run checks each Phase's Acceptance as a separate step. The block then moves there unchanged.

ASSUMPTION (the spec's, evidence blocked): adding a required field to a populated collection through the superuser API makes later inserts without it fail. Overturned if the pinned release refuses the change. The test then narrows the kind select so that the app's values fail.

- [ ] The spec's test 7 passes. Each Creator records a Page View on their own Profile, and the Operator creates a throwaway Profile with no owner, which a Visitor loads once. Then, through PocketBase's loopback port:
  - with the Stats Creator's token, every listed `dailyStats` row belongs to the Stats Profile, and viewing a known Other Profile row by its id answers 404. The same holds the other way round;
  - with either Creator's token, and signed out, listing or viewing events returns no record, and creating, updating or deleting an Event is refused;
  - signed out, listing `dailyStats` returns no items, and viewing the ownerless Profile's row by its id answers 404;
  - signed out and with the Other Creator's token, listing `dailyStats` with `expand=link` returns no Stats Profile row, and no response body holds a `destination` key.
- [ ] After the throwaway Profile is deleted, the Other Creator's Stats page names none of the Stats Profile's Links.
- [ ] The spec's test 9 passes. The Operator adds a Link with a stub Destination to the Stats Profile, a Visitor opens `/r/{its Id}`, and the Operator deletes the Link. The Links table's "Deleted link" row shows +1 Click, and the Clicks card shows the same total as just before the delete.
- [ ] The spec's test 10 passes. A Visitor loads a throwaway Profile and its ping answers 204. The Operator's delete of that Profile succeeds, and no Event for it remains.
- [ ] The spec's test 11 passes. While every Event write fails, the Direct Mode Link's `/r` still answers 302 to its Destination, and the Adult Link's Reveal, after the Age Gate, still answers with its Destination. Both reach the stub. A `finally` step removes the temporary field.
- [ ] The spec's test 12 passes. Pings to a run-unique throwaway Profile reach 429 within the Reveal threshold plus one. Right after, a ping for the Stats Profile answers 204, and `/r` for its Direct Mode Link still redirects. The throwaway Profile is then deleted.
- [ ] RUN.md holds the real-device row, pending.
- [ ] The spec's whole local Acceptance block exits 0 under `set -e`: the Phase 4 spec exists and passes, its screenshot is non-empty, and `./check.sh` passes with every earlier spec.
