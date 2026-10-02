# 11: The real-device matrix passes for every Mode on v2's first public https deploy

Spec: docs/spec/phase-01-link-modes-and-escape.md
Covers: user stories 8, 9, 12, 14, 15, 16, 17, 18, 19, 22, 26, 35, 36, 45
Seams: real phones on a public https host, outside Playwright: an iPhone and an Android phone × the Instagram, Facebook, Threads and TikTok In-App Browsers, plus Safari (iOS) and Chrome (Android). The throwaway Profile on v2's first public https deploy, with results recorded as RUN.md rows (spec, Acceptance, manual lines)
Blocked by: 10: The escaped Link opens by itself in the System Browser credited to the same Tracking Code, 23: v2 serves every v1 Profile identically on its public https host on the VPS
Status: parked — needs-human: who holds ports 80/443 on the VPS

**What to build:** Nothing new in code. This ticket closes Phase 1. The plan's DONE for this Phase is "test matrix passes for every mode on real devices" (plan section 5), so Phase 1 stays open until this ticket passes, even though 05–10 land offline.

Once v2 answers on its first public https deploy (Phase 2), the Operator creates the throwaway Profile there that 10 describes in RUN.md, opens it as `/{username}/{code}` in every cell, and fills each RUN.md row with device, OS version, app version and pass or fail. Every row must pass:
- **On open:** the Escape Overlay shows, with "Close", in every In-App Browser, and never in Safari or Chrome.
- **Direct:** the Link opens in place.
- **Escape:** the Visitor lands in the System Browser on `/{username}/{code}?link={Link Id}`, and the Link opens there by itself. The Adult Link's final address ends in `/c{code}`. Where the automatic Escape is blocked, "Open in browser", "Try another way" (iOS Instagram), the app-menu instruction and "Copy link" each still get the Visitor out.
- **Escape on an Android phone with Chrome disabled:** the Visitor lands in the fallback browser, not on a dead Link.
- **Deeplink, once with the Destination's app installed and once without:** the app opens, or the web page does.

When a row fails, this ticket stays open with the observation pasted in (plan section 7, step 3). The spec's overturn clauses say what changes:
- A dead Deeplink Link: Reveal starts when the tap lands, or when the Age Gate opens.
- A confusing overlay flash: the overlay waits on a timer or a page-visibility check.
- "Try another way" escaping correctly from the other apps: it is offered there too.
- A Threads detection miss: park it for the Operator with the observed User-Agent. Once the Operator widens the plan's pattern, adding the observed word is this Phase's one-line fix.

**Why parked.** The matrix needs a public https host, since every escape link is https and the stand-in is plain http on localhost. That host is Phase 2's first public deploy. That deploy waits on who holds ports 80 and 443 on the VPS (docs/spec/plan-review.md, Needs the human, item 1). The human settles that with:

```sh
ssh root@srv1395798.hstgr.cloud 'docker ps --format "{{.Names}}\t{{.Image}}\t{{.Ports}}"; ss -ltnp "( sport = :80 or sport = :443 )"'
```

Real phones, the deploy and the throwaway Profile are the human's too.

ASSUMPTION: Phase 2's first public https deploy is not ticketed yet, so Blocked by names only this Phase's gate. The Phase 2 Tickets pass appends its deploy ticket here as `NN: Title` (rung 5). Overturned if Phase 2's tickets land without that edit. Then this ticket must be checked by hand against Phase 2's deploy ticket before it is unparked.

- [ ] RUN.md holds one row per matrix cell, each with device, OS version, app version and pass or fail, and every row passes.
- [ ] The Threads rows pass. Or the observed Threads User-Agent is parked for the Operator, and Phase 1 stays not Done until the pattern decision lands and the rows pass.
- [ ] The automated Acceptance from 10 still passes on the commit the matrix ran against.
