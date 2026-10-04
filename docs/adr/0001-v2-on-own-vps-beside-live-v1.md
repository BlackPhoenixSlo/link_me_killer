# v2 runs on our own VPS in Docker Compose, beside a live v1

v1 is a static Netlify site whose only "database" is files in a GitHub repo, written by the n8n Form. It has no auth, no click counting and no Custom Domains; every edit costs about five commits and a Netlify build; and one shared secrets file means concurrent edits overwrite each other. We build v2 in this repo as one Docker Compose stack (Caddy, a Node app and PocketBase) on the Hostinger VPS that already runs n8n; n8n keeps running there as it is, outside the stack. One box gives us a database, server code on every Click, and automatic TLS for any domain pointed at it. v1 is not touched at all (ADR 0005): it keeps serving ofl.ink exactly as it is, and the Phase 1 Mode work lands only in v2's copy of the public page. Cutover happens once v2 shows every v1 Profile identically, and v1 stays live on its netlify.app address afterwards, indefinitely, as the fallback (plan section 10).
ASSUMPTION: section 8's rule that the live n8n workflow is "NOT touched by any Phase" is read as "n8n is not in v2's Compose file", because adopting the running container would restart it under v2's control (rung 4: leaving it alone is the cheaper undo). Overturned if the Operator wants v2's Compose file to own n8n.

## Considered Options

- **Stay on Netlify and add hosted data and auth services.** Not chosen: the plan's call is "move to VPS now".
  ASSUMPTION: this option comes from the word "NOW" in D1, which suggests "stay, move later" was the alternative weighed. The plan does not state why it was rejected. Overturned if the plan author weighed a different option.
- **Switch v1 off as soon as v2 starts.** Rejected by D1: v1 stays the live product until parity.

## Consequences

- Custom Domains and Spare Domains point at this VPS's address, so moving v2 to another host later means every Creator re-points their DNS.
- v2's public page starts as a copy of v1's, taken from the v1 Snapshot, and then diverges: Mode and the Escape fixes exist only in v2 (ADR 0005).
- n8n already answers at its own hostname on this VPS, so whatever fronts it may already hold ports 80 and 443, which v2's Caddy also needs. Only a look at the live VPS can settle this; it is left to the Operator.
