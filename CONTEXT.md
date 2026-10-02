# ofl.ink

A link-in-bio service for creators who send Instagram and TikTok traffic to OnlyFans. Each Creator gets a public Profile of Links whose Destinations stay out of every public file, and whose taps can be steered out of the social apps' in-app browsers.

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
The public identifier of a Link, and the only thing about it a public file may carry; random, never derived from the Username.
_Avoid_: link key, slug, link number

**Destination**:
The URL a Link finally leads to; for Adult Links usually the Creator's OnlyFans page. It is held only on the server and handed out one Click at a time.
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
A Profile URL carrying `?link={Link Id}`, which reveals that Link as soon as the page loads.
_Avoid_: deep link, direct link
ASSUMPTION: coined name for script.js's `?link=` behaviour, which its comments call "deep link"; renamed so it cannot be confused with Deeplink Mode. Overturned if the Operator already calls these something else.

## Escaping in-app browsers

**In-App Browser**:
The browser built into Instagram, Facebook, Threads or TikTok that a Visitor lands in after tapping a bio link.
_Avoid_: webview, IG browser, embedded browser

**System Browser**:
The phone's own browser (Safari on iOS, Chrome on Android), outside any In-App Browser.
_Avoid_: external browser, default browser, real browser

**Escape**:
An attempt to move a Visitor from an In-App Browser into the System Browser.
_Avoid_: bounce, breakout, "move out of IG"

**Escape Overlay**:
The full-screen instruction telling a Visitor to open the page in the System Browser from the app's menu; the fallback when an Escape cannot happen by itself.
_Avoid_: IG overlay, Instagram overlay, menu instructions
ASSUMPTION: coined name for v1's `igOverlay`; overturned by any name the Operator already uses for it.

**Mode**:
How a tap on a Link travels to its Destination: Direct Mode, Escape Mode or Deeplink Mode. Every Link has one; a Profile has a default Mode that its Links inherit.
_Avoid_: site option, link option, deeplink checkbox, escape checkbox
ASSUMPTION: the Profile's default Mode also decides whether the Escape Overlay shows when the page opens, since that happens before any Link is tapped; overturned if the on-load overlay should instead follow whether any Link on the Profile is in Escape Mode.

**Direct Mode**:
Plain navigation to the Destination, with no Escape and no Escape Overlay.
_Avoid_: normal, none, "nothing from above"

**Escape Mode**:
Attempts an Escape on tap, with the Escape Overlay as the fallback.
_Avoid_: escape_ig (outside stored data), IG mode, bounce mode

**Deeplink Mode**:
Opens the Destination's own app through its https app link, falling back to the web page.
_Avoid_: app-link mode, deep link (for anything else)

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
The Operator's v1 editing tool: a form whose submissions rewrite Profile files in GitHub and redeploy v1.
_Avoid_: workflow, automation, admin panel

## Generations

**v1**:
The ofl.ink running today: a static Netlify site whose Profiles are files in GitHub, written by the n8n Form.
_Avoid_: Netlify site, old site, legacy

**v2**:
The Docker Compose stack on the Operator's Hostinger VPS that replaces v1.
_Avoid_: VPS version, new site

**v1 Import**:
The one-time copy of v1's Profiles, Destinations and images into v2.
_Avoid_: migration, sync, port
ASSUMPTION: renamed from the plan's "migration script" so that "migration" keeps its database-schema meaning; overturned if the plan author prefers the original word.

**Cutover**:
Pointing ofl.ink's DNS from v1 to v2, done only once v2 shows every v1 Profile identically.
_Avoid_: go-live, switchover, launch

**Fixture Profile**:
The seeded test Profile, a copy of `juliafilippo_`, holding one Direct Mode Link, one Escape Mode Link and one Adult Link so that every behaviour is testable.
_Avoid_: seed profile, test profile, demo profile
