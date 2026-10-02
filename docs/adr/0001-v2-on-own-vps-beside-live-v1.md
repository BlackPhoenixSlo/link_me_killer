# v2 runs on our own VPS in Docker Compose, beside a live v1

v1 is a static Netlify site whose only "database" is files in a GitHub repo, written by the n8n Form. It has no auth, no click counting and no Custom Domains; every edit costs about five commits and a Netlify build; and one shared secrets file means concurrent edits overwrite each other. We build v2 as one Docker Compose stack (Caddy, a Node app, PocketBase and the existing n8n) on the Hostinger VPS that already runs n8n. One box gives us a database, server code on every Click, and automatic TLS for any domain pointed at it. v1 is not rebuilt: it keeps serving ofl.ink and gets only the Phase 0 security fix and the Phase 1 Mode work, whose script carries over to v2. Cutover happens once v2 shows every v1 Profile identically, and Netlify stays as cold backup for a month afterwards.

## Considered Options

- **Stay on Netlify and add hosted data and auth services.** Not chosen: the plan's call is "move to VPS now".
  ASSUMPTION: this option comes from the word "NOW" in D1, which suggests "stay, move later" was the alternative weighed. The plan does not state why it was rejected. Overturned if the plan author weighed a different option.
- **Switch v1 off as soon as v2 starts.** Rejected by D1: v1 stays the live product until parity.

## Consequences

- Custom Domains and Spare Domains point at this VPS's address, so moving v2 to another host later means every Creator re-points their DNS.
- Phase 0 and Phase 1 changes land in v1 and are carried into v2, not forked.
