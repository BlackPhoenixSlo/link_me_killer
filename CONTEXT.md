# ofl.ink

A link-in-bio service for creators who send Instagram and TikTok traffic to OnlyFans. Each Creator gets a public Profile of Links whose Destinations v2 keeps out of every public file, and whose taps can be steered out of the social apps' in-app browsers.

## People

**Creator**:
The person a Profile belongs to, who signs in to edit it.
_Avoid_: user, model, client, account, member

**Operator**:
The person who runs ofl.ink itself: holds the domains, the server and the admin tools, and manages Creators.
_Avoid_: admin, owner, agency
ASSUMPTION: coined name for the plan's "you" / "admin" role; overturned if the plan author already has a name for it.

**Visitor**:
A person viewing a Profile, usually arriving from a Creator's Instagram or TikTok bio.
_Avoid_: fan, user, viewer, traffic, lead

## Profiles and Links

**Profile**:
A Creator's public page at `ofl.ink/{username}`: display name, avatar, bio, verified badge and an ordered list of Links.
_Avoid_: site, page, bio page, linktree, account
ASSUMPTION: the plan's "site" (site creation, per-site default, site option) means Profile, following the code and the planned collections; overturned if one Creator may run several Profiles as one site.

**Username**:
The unique name that forms a Profile's path; a Creator claims it at sign-up.
_Avoid_: handle, slug

**Link**:
One tappable card on a Profile that leads to one Destination; it has a title, icon, background image, Adult flag, Mode and optional Geo Rule.
_Avoid_: button, card, tile, secret link

**Link Id**:
The public identifier of a Link, and the only thing about it a public file may carry; random, never derived from the Username. v2 mints a fresh one for every Link, so v1's Username-based ids mean nothing to v2.
_Avoid_: link key, slug, link number

**Destination**:
The URL a Link finally leads to; for Adult Links usually the Creator's OnlyFans page. In v2 it is held only on the server and handed out one Click at a time.
_Avoid_: real URL, secret URL, target

**Adult Link**:
A Link marked 18+, which puts the Age Gate in front of its Destination; independent of the Link's Mode.
_Avoid_: NSFW link, locked link, mature link, 18+ link

**Age Gate**:
The "Continue (18+)" confirmation a Visitor must pass before an Adult Link opens.
_Avoid_: 18+ overlay, mature content disclaimer, adult overlay

**Reveal**:
The server exchanging a Link Id for its Destination at the moment of a Click, so the Destination never sits in the page. It is obfuscation against casual crawling, not a security boundary.
_Avoid_: unlock, decrypt, resolve, "secret links via JS"

**Link Shortcut**:
A Profile URL carrying `?link={Link Id}`, which reveals that Link as soon as the page loads; in an In-App Browser an Escape or Deeplink Link then pops out to its Destination, on every load, as v1's `?link=` did.
_Avoid_: deep link, direct link
ASSUMPTION: coined name for the `?link=` behaviour of v1's script.js, whose comments call it "deep link"; renamed so it cannot be confused with Deeplink Mode. Overturned if the Operator already calls these something else.

## Escaping in-app browsers

**In-App Browser**:
The browser built into an app, that a Visitor lands in after tapping a link there. Escape Mode and Link Shortcuts recognise Instagram's, Facebook's, Threads' and TikTok's, as the plan names them; Deeplink Mode recognises any app's, by more apps' names in the User-Agent or by a webview's own shape when it names no app.
_Avoid_: webview, IG browser, embedded browser

**System Browser**:
The phone's own browser (Safari on iOS, Chrome on Android), outside any In-App Browser.
_Avoid_: external browser, default browser, real browser

**Escape**:
An attempt to move a Visitor from an In-App Browser into the System Browser. In iOS Instagram it goes through `instagram://extbrowser/` (a real iPhone, 2026-10-06, showed Instagram drops `x-safari-https://`, now the alternative); elsewhere on iOS through `x-safari-https://`, on Android through the Chrome intent.
_Avoid_: bounce, breakout, "move out of IG"

**Escape Overlay**:
The full-screen instruction telling a Visitor to open the page in the System Browser from the app's menu; the fallback when an Escape cannot happen by itself.
_Avoid_: IG overlay, Instagram overlay, menu instructions
ASSUMPTION: coined name for v1's `igOverlay`; overturned by any name the Operator already uses for it.

**Mode**:
How a tap on a Link travels to its Destination: Direct Mode, Escape Mode or Deeplink on tap. Every Link has one: its own Direct or Escape Mode, or the default Mode of its Profile, which is the only place a Deeplink Mode is set (ADR 0003).
_Avoid_: site option, link option, deeplink checkbox, escape checkbox
ASSUMPTION: the Profile's default Mode also decides whether the Escape Overlay shows when the page opens, since that happens before any Link is tapped; overturned if the on-load overlay should instead follow whether any Link on the Profile is in Escape Mode.

**Direct Mode**:
Plain navigation to the Destination, with no Escape and no Escape Overlay.
_Avoid_: normal, none, "nothing from above"

**Escape Mode**:
Attempts an Escape on tap, with the Escape Overlay as the fallback. As a Profile's default Mode it also shows the Escape Overlay as soon as the page opens in an In-App Browser, as v1 does in Instagram; the Escape itself waits for the Visitor's tap.
_Avoid_: escape_ig (outside stored data), IG mode, bounce mode

**Deeplink Mode**:
Deeplink on tap or Deeplink at open: both pop the Visitor out of the In-App Browser into the System Browser with no Escape Overlay. A tap pops out from the tap itself, as a real anchor tap to the escape link, never after a Reveal (Instagram dropped an `x-safari-https://` pop-out that waited on one or was set from script). Outside an In-App Browser the Destination is revealed and opened, on Android by handing its https link to the app that owns it.
_Avoid_: app-link mode, deep link (for anything else)

**Deeplink on tap**:
The Deeplink Mode `deeplink`: a tap on the Link in an In-App Browser pops out at once to that Link's Link Shortcut, which the System Browser then reveals; if the page is still showing a moment later, the tap reveals and goes to the Destination in the app instead.
_Avoid_: deeplink (alone, once the two are told apart), bounce

**Deeplink at open**:
The Deeplink Mode `deeplink_open`, a Profile's default only, never a Link's own (ADR 0003): the page pops out to itself as soon as its Profile has loaded in an In-App Browser, once per tab (phone-verified on iPhone Instagram, 2026-10-06); taps there behave as Deeplink on tap.
_Avoid_: Pop Out Timing, at start, auto-bounce

## Attribution and Stats

**Tracking Code**:
A short number naming a traffic source, appended to an OnlyFans Destination as `/c{code}` so OnlyFans credits each subscriber to that source. It arrives in the Profile URL (`/{username}/{code}`), comes from a Geo Rule, or falls back to the Link's default, and belongs only to the Profile it arrived on.
_Avoid_: trackId, tracking id, tracknumber, campaign id
ASSUMPTION: "Tracking Code" chosen over the code's trackId / tracknumber, and the Stats side kept free of the word "tracking"; overturned if the Operator's OnlyFans vocabulary differs.

**Geo Rule**:
A Link's table from Visitor country (and US state) to Tracking Code.
_Avoid_: geo, geo config, geo-targeting

**Page View**:
A Visitor loading a Profile.
_Avoid_: visit, view, impression, hit
Known effect: Deeplink at open's pop-out out of an In-App Browser counts two Page Views for one Visitor, one in the app and one when the System Browser loads the Profile (with no In-App Browser).

**Click**:
A Visitor following a Link to its Destination, whether the Destination came by Reveal or by server redirect.
_Avoid_: tap, hit, conversion
ASSUMPTION: a Reveal counts as a Click; otherwise every Adult Link click, which goes through Reveal rather than the redirect, would be missing from Stats. Overturned if Stats should count redirects only.

**Event**:
One recorded Page View or Click, with its Profile, Link, Visitor country, In-App Browser and time.
_Avoid_: log entry, hit, analytics row

**Stats**:
What a Creator sees of their own traffic: Page Views, Clicks and click-through rate per Link, by day and country.
_Avoid_: analytics, insights, traffic tracking, dashboard

## Domains

**Flagged**:
The state of a domain that Meta blocks or warns on inside its apps; every Profile served from it is hit at once.
_Avoid_: banned, blacklisted, shadowbanned

**Spare Domain**:
A domain the Operator holds in reserve to serve every Profile once ofl.ink is Flagged.
_Avoid_: proxy, backup domain, burner, mirror
ASSUMPTION: the plan's "proxies" (D7) are read as Spare Domain rotation, as D7 itself suggests; overturned if D7 is scoped to something else, such as an HTTP proxy in front of Destinations.

**Custom Domain**:
A domain a Creator owns and points at ofl.ink's server so that it shows their Profile.
_Avoid_: custom URL, vanity domain

## Editing

**Onboarding**:
A new Creator's first run: claim a Username, fill in the Profile, add a first Link, go live.
_Avoid_: site creation, signup flow, wizard

**Editor**:
The signed-in Creator's screen for changing their Profile and its Links, styled after the link.me Template.
_Avoid_: dashboard, admin, builder, CMS

**link.me Template**:
The saved copy of link.me's dashboard in `link.me/`, used only as the look to copy; its scripts do not run.
_Avoid_: mockup, reference app

**n8n Form**:
The Operator's v1 editing tool: a form whose submissions rewrite Profile files in GitHub and redeploy v1. It is left exactly as it is, never gains a Mode, and its edits stop reaching ofl.ink at Cutover.
_Avoid_: workflow, automation, admin panel

## Generations

**v1**:
The ofl.ink running today: a static Netlify site whose Profiles are files in GitHub, written by the n8n Form. Nothing in it is ever edited; it serves ofl.ink as it is until Cutover and stays live on its netlify.app address afterwards, indefinitely.
_Avoid_: Netlify site, old site, legacy

**v1 Snapshot**:
The read-only copy of v1's files in `linkme_clone3/`, kept beside v2's code as the source of the v1 Import and the reference for how v1 looks and behaves; never edited.
_Avoid_: v1 (for the copy), old repo, clone, legacy code

**v2**:
The Docker Compose stack, built entirely in this repo and run on the Operator's Hostinger VPS, that replaces v1.
_Avoid_: VPS version, new site

**v1 Import**:
The re-runnable copy (v1 wins, until Cutover) of the v1 Snapshot's Profiles, Destinations and images into v2, repairing v1's broken data on the way and minting a fresh Link Id for every Link. Imported Profiles take Escape Mode as their default Mode until a Creator changes it in the Editor.
_Avoid_: migration, sync, port
ASSUMPTION: renamed from the plan's "migration script" so that "migration" keeps its database-schema meaning; overturned if the plan author prefers the original word.

**Cutover**:
Pointing ofl.ink's DNS from v1 to v2, done only once v2 shows every v1 Profile identically.
_Avoid_: go-live, switchover, launch

**Fixture Profile**:
The seeded test Profile, Username `fixture`, shaped like `juliafilippo_` but holding none of its data: one Direct Mode Link, one Escape Mode Link, one Link on the Profile default (the "Deeplink Link", Deeplink on tap under a Deeplink default) and one Adult Link, so that every Mode and behaviour is testable.
_Avoid_: seed profile, test profile, demo profile
