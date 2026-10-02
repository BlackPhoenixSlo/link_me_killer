# 08: An Adult Escape Mode Link passes the Age Gate then escapes with no Reveal in the app

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 7, 15, 23, 24
Seams: the public page in Chromium under Playwright, served by the Dev-Server Stand-in, with the iOS Instagram User-Agent; observed through the navigation recorder and its same-task mark, the network fence's Reveal watch and Profile variants
Blocked by: 07: An Escape Mode tap in iOS Instagram escapes to Safari from the tap itself
Status: ready-for-agent

**What to build:** A Visitor in an In-App Browser taps an Adult Link in Escape Mode. The Age Gate shows first. "Continue (18+)" is then the tap that fires the Escape: the same escape link and escape target as 07, `?link=` included, fired with no request before it. The Escape Overlay follows, as after any Escape Mode tap. The Destination is never revealed inside the In-App Browser: the System Browser reveals it once the Escape lands (10). If the Visitor closes the Age Gate instead, nothing is fired and nothing is revealed.

This replaces the Page Copy's in-app path for Adult Links, which revealed the Destination inside the app and then bounced to it.

ASSUMPTION: the Adult Escape is its own ticket, apart from 07, so that 07 stays within one context window. Until this ticket lands, an Adult Escape Mode Link in an In-App Browser keeps the Page Copy's reveal-then-bounce (rung 5). Overturned if the build run cannot accept that interim. Then this ticket folds into 07.

- [ ] iOS Instagram: the Adult Link, set to Escape Mode (variant), shows the Age Gate. "Continue (18+)" records the `x-safari-` Escape to its escape target, marked as started in that tap's own task.
- [ ] No Reveal request is made at any point in that flow.
- [ ] Closing the Age Gate instead records no navigation and makes no Reveal request.
- [ ] 05's, 06's and 07's checks still pass. The smoke spec passes. The v1 Snapshot's own git status stays clean.
- [ ] Any dev server already on port 4173 is stopped first. Then `./check.sh` passes.
- [ ] No dependency, build step or module is added. The page stays one plain script that reads only the Profile JSON and Reveal.
