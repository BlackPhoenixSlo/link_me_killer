# No Destination in any public file; Reveal by script is obfuscation, not protection

In v1 the "secret links" hide nothing:

- `publish = "."` serves netlify/functions/secrets.json, which holds every Destination, to anyone.
- The GitHub repo is public and has that file in its history.
- 7 of 25 Adult Links also carry their Destination in public Profile JSON.
- Reveal answers any origin, without a rate limit, for Link Ids that can be guessed from the Username.

We keep Reveal by script only as obfuscation against casual crawling and draw the real line elsewhere. No Destination appears in any published file or in git history. Link Ids are random, at least 10 characters, and unrelated to the Username. Reveal is rate-limited and answers only the page's own origin.

Phase 0 applies these rules to v1 before any feature work:

- publish only `public/`, with functions and secrets outside it
- make the repo private
- purge secrets.json from the git history
- regenerate every Link Id

A Destination that has been published cannot be recalled. It can only be made useless, which is why the Link Ids are regenerated. Hiding Destinations does not stop ofl.ink from being Flagged; Spare Domains are the protection against that.

## Consequences

- Regenerating Link Ids breaks every Link Shortcut (`?link=` URL) that was already shared with an old id.
- "Own origin" means whichever host served the Profile: ofl.ink, a Spare Domain or a Custom Domain. Reveal therefore accepts same-origin calls only, rather than an allow-list that names ofl.ink.
  ASSUMPTION: D8's "CORS locked to own origin" is read as same-origin, because a fixed ofl.ink allow-list would break Reveal on Custom Domains and Spare Domains. Overturned if Profiles on other domains must call Reveal on ofl.ink across origins.
- In v2, a Destination must never be readable through PocketBase's public API (ADR 0002).
