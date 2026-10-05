# RUN

## Phase 1 real-device matrix (docs/spec/phase-01-link-modes-and-escape.md)

**Phase 1 is not Done until every row below passes** (plan section 5: "test matrix passes for every mode on real devices"). The automated Acceptance (`./check.sh`) does not replace these rows. Every row is pending until someone runs it on a real phone and fills in its blanks.

### Throwaway Profile recipe

The matrix needs a public https host, because every escape link is https and the suite now runs on the test stack via `tests/stack.sh`, which is plain http on localhost. Never run `./check.sh` while another Playwright run or the test stack is up: `reuseExistingServer` is false, so it fails fast on the busy port rather than flaking. `./check.sh tests/e2e/02-v1-import.spec.ts` first runs the whole chromium project (it is the last project); add `--no-deps` to skip that in the dev loop. Run it on v2's first public https deploy (Phase 2's first deploy to the VPS):

1. Create a throwaway Profile there. Do not use a Creator's Profile.
2. Give it Escape Mode (`escape_ig`) as its default Mode.
3. Give it these Links, each with a harmless Destination:
   - one Direct Mode Link;
   - one Escape Mode Link;
   - one Deeplink Mode Link, whose Destination is an https page that a phone app owns, so that the app can be installed for one row and removed for the other;
   - one Adult Escape Mode Link with tracking on.
4. Pick a numeric Tracking Code and open the Profile as `/{username}/{code}` in each browser below.

In-App Browser rows: with an Escape Mode default the page now pops out to the System Browser by itself on open (once per tab), so for every row after "On open" switch back to the app, where the Escape Overlay is the fallback, before following the row. Deeplink Mode pops the Visitor out to the System Browser with the Destination (v1's deeplink), so in an In-App Browser the "app installed" and "app absent" rows expect the same result.

### How to fill a row

- **Device model, OS version, App version:** the phone, its OS version, and the version of the app whose browser is under test (the browser's own version for Safari or Chrome).
- **Pass/fail:** `pass` or `fail`, replacing `pending`. A failing row names what happened instead. A Threads row that fails because the page does not see an In-App Browser also records the observed User-Agent, for the Operator (spec, Further Notes, Threads).

### Rows

| # | Phone | Browser | Check | Expected | Device model | OS version | App version | Pass/fail |
|---|---|---|---|---|---|---|---|---|
| 1 | iPhone | Instagram | On open | The page pops out to the System Browser on /{username}/{code} by itself, once per tab. Back in the app, the Escape Overlay shows there, with "Close". Reloading in the app does not pop out again. |  |  |  | pending |
| 2 | iPhone | Instagram | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 3 | iPhone | Instagram | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 4 | iPhone | Instagram | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 5 | iPhone | Instagram | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 6 | iPhone | Instagram | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 7 | iPhone | Facebook | On open | The page pops out to the System Browser on /{username}/{code} by itself, once per tab. Back in the app, the Escape Overlay shows there, with "Close". Reloading in the app does not pop out again. |  |  |  | pending |
| 8 | iPhone | Facebook | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 9 | iPhone | Facebook | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 10 | iPhone | Facebook | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 11 | iPhone | Facebook | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 12 | iPhone | Facebook | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 13 | iPhone | Threads | On open | The page pops out to the System Browser on /{username}/{code} by itself, once per tab. Back in the app, the Escape Overlay shows there, with "Close". Reloading in the app does not pop out again. |  |  |  | pending |
| 14 | iPhone | Threads | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 15 | iPhone | Threads | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 16 | iPhone | Threads | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 17 | iPhone | Threads | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 18 | iPhone | Threads | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 19 | iPhone | TikTok | On open | The page pops out to the System Browser on /{username}/{code} by itself, once per tab. Back in the app, the Escape Overlay shows there, with "Close". Reloading in the app does not pop out again. |  |  |  | pending |
| 20 | iPhone | TikTok | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 21 | iPhone | TikTok | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 22 | iPhone | TikTok | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 23 | iPhone | TikTok | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 24 | iPhone | TikTok | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 25 | iPhone | Safari (iOS) | On open | No Escape Overlay shows. |  |  |  | pending |
| 26 | iPhone | Safari (iOS) | Direct | Tap the Direct Link: it opens in place. |  |  |  | pending |
| 27 | iPhone | Safari (iOS) | Escape | Tap the Escape Mode Link: it opens in place, as a Direct Link does (no Escape, no overlay). |  |  |  | pending |
| 28 | iPhone | Safari (iOS) | Escape, Adult | Tap the Adult Escape Mode Link: the Age Gate shows; "Continue (18+)" opens the Destination in place, and the final address ends in /c{code}. |  |  |  | pending |
| 29 | iPhone | Safari (iOS) | Deeplink, app installed | Tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 30 | iPhone | Safari (iOS) | Deeplink, app absent | Tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |
| 31 | Android phone | Instagram | On open | The page pops out to the System Browser on /{username}/{code} by itself, once per tab. Back in the app, the Escape Overlay shows there, with "Close". Reloading in the app does not pop out again. |  |  |  | pending |
| 32 | Android phone | Instagram | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 33 | Android phone | Instagram | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 34 | Android phone | Instagram | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 35 | Android phone | Instagram | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 36 | Android phone | Instagram | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 37 | Android phone | Instagram | Escape, Chrome disabled | "Close" the overlay shown on open, then tap the Escape Mode Link on a phone with Chrome disabled: the Visitor lands in the fallback browser on /{username}/{code}?link={Link Id}, not on a dead Link. |  |  |  | pending |
| 38 | Android phone | Facebook | On open | The page pops out to the System Browser on /{username}/{code} by itself, once per tab. Back in the app, the Escape Overlay shows there, with "Close". Reloading in the app does not pop out again. |  |  |  | pending |
| 39 | Android phone | Facebook | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 40 | Android phone | Facebook | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 41 | Android phone | Facebook | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 42 | Android phone | Facebook | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 43 | Android phone | Facebook | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 44 | Android phone | Facebook | Escape, Chrome disabled | "Close" the overlay shown on open, then tap the Escape Mode Link on a phone with Chrome disabled: the Visitor lands in the fallback browser on /{username}/{code}?link={Link Id}, not on a dead Link. |  |  |  | pending |
| 45 | Android phone | Threads | On open | The page pops out to the System Browser on /{username}/{code} by itself, once per tab. Back in the app, the Escape Overlay shows there, with "Close". Reloading in the app does not pop out again. |  |  |  | pending |
| 46 | Android phone | Threads | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 47 | Android phone | Threads | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 48 | Android phone | Threads | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 49 | Android phone | Threads | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 50 | Android phone | Threads | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 51 | Android phone | Threads | Escape, Chrome disabled | "Close" the overlay shown on open, then tap the Escape Mode Link on a phone with Chrome disabled: the Visitor lands in the fallback browser on /{username}/{code}?link={Link Id}, not on a dead Link. |  |  |  | pending |
| 52 | Android phone | TikTok | On open | The page pops out to the System Browser on /{username}/{code} by itself, once per tab. Back in the app, the Escape Overlay shows there, with "Close". Reloading in the app does not pop out again. |  |  |  | pending |
| 53 | Android phone | TikTok | Direct | "Close" the overlay shown on open, then tap the Direct Link: it opens in place, with no Escape and no overlay. |  |  |  | pending |
| 54 | Android phone | TikTok | Escape | "Close" the overlay shown on open, then tap the Escape Mode Link: the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, and the Link opens there by itself. Where the automatic Escape is blocked, each of "Open in browser", "Try another way" (iOS Instagram only), the app-menu instruction and "Copy link" still gets out. |  |  |  | pending |
| 55 | Android phone | TikTok | Escape, Adult | "Close" the overlay shown on open, then tap the Adult Escape Mode Link, then "Continue (18+)": the Visitor lands in the System Browser on /{username}/{code}?link={Link Id}, the Link opens there by itself with no second Age Gate, and the final address ends in /c{code}. |  |  |  | pending |
| 56 | Android phone | TikTok | Deeplink, app installed | "Close" the overlay shown on open, then tap the Deeplink Mode Link: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 57 | Android phone | TikTok | Deeplink, app absent | "Close" the overlay shown on open, then tap the Deeplink Mode Link with the Destination's app not installed: the Visitor lands in the System Browser on the Destination. |  |  |  | pending |
| 58 | Android phone | TikTok | Escape, Chrome disabled | "Close" the overlay shown on open, then tap the Escape Mode Link on a phone with Chrome disabled: the Visitor lands in the fallback browser on /{username}/{code}?link={Link Id}, not on a dead Link. |  |  |  | pending |
| 59 | Android phone | Chrome (Android) | On open | No Escape Overlay shows. |  |  |  | pending |
| 60 | Android phone | Chrome (Android) | Direct | Tap the Direct Link: it opens in place. |  |  |  | pending |
| 61 | Android phone | Chrome (Android) | Escape | Tap the Escape Mode Link: it opens in place, as a Direct Link does (no Escape, no overlay). |  |  |  | pending |
| 62 | Android phone | Chrome (Android) | Escape, Adult | Tap the Adult Escape Mode Link: the Age Gate shows; "Continue (18+)" opens the Destination in place, and the final address ends in /c{code}. |  |  |  | pending |
| 63 | Android phone | Chrome (Android) | Deeplink, app installed | Tap the Deeplink Mode Link with the Destination's app installed: the app opens. |  |  |  | pending |
| 64 | Android phone | Chrome (Android) | Deeplink, app absent | Tap the Deeplink Mode Link with the Destination's app not installed: the web page opens. |  |  |  | pending |

## Phase 4 real-device row (docs/spec/phase-04-stats.md, story 33)

The automated Acceptance cannot prove that a real phone inside Instagram is recorded as Instagram, because its User-Agent is faked there. This row is pending until someone runs it (ticket 38) on v2's VPS host, and is filled in as the Phase 1 rows are (How to fill a row, above). Open any Profile there; a throwaway Profile made by the recipe above will do.

| # | Phone | Browser | Check | Expected | Device model | OS version | App version | Pass/fail |
|---|---|---|---|---|---|---|---|---|
| 1 | Any phone | Instagram | In-App Browser recorded | Open a Profile on v2's VPS host. In PocketBase's admin UI the newest Event for that Profile shows inAppBrowser = instagram (and country XX until Cutover). |  |  |  | pending |

## Cutover (docs/spec/phase-05-cutover-and-domains.md, Acceptance, steps 1 to 15)

For the Operator. Run the steps in this order, every command from this repo's root on the Mac (it reaches the VPS over SSH). Steps 1 to 5 prepare: step 3 must be done at least 48 hours before the switch, and step 4 may follow it. Steps 6 to 13 are one sitting. Steps 14 and 15 come later, whenever they are needed.

- **v1 is never touched.** No step changes Netlify, the old GitHub repo or the n8n Form. v1 stays live on its netlify.app address (`linkmeclone3.netlify.app`) indefinitely, as the rollback target (plan section 10). There is no step that switches v1 off, and no irreversible step.
- **The switch is a DNS change only.** Step 8 changes one record in Cloudflare (two if `www` exists), and the rollback (step 13) is the same change reversed. Nothing in Caddy or the app changes on the day: step 1's deploy already serves every hostname the app admits, and ofl.ink's certificate is obtained at the first request after the switch.
- **Lines marked `[country source]`** rest on the production country source, Cloudflare (plan section 11, 2026-10-04). They are listed at the end of this section, so that they can be found and rewritten if that answer ever changes.
- No line here names a Destination, and no command prints one.

**Set once,** in the Mac terminal before step 1 (the values are the Operator's; nothing here is a secret):

```sh
USERNAME=<an imported Username>
VPS=<ssh host>
V2_DIR=<v2's directory on the VPS>
V2_HOST=<Phase 2's v2 host>
VPS_IPV4=<VPS IPv4>
SPARE=<a Spare Domain>
DOMAIN=<a Creator's Custom Domain>
LINK_ID=<a Link Id of $USERNAME's Profile>
LIMIT=<the VPS's REVEAL_LIMIT_PER_MINUTE>
```

### 1. Ports, deploy and the ask

Record who holds ports 80 and 443 under Records below. The expected answer is Traefik (container `n8n-traefik-1`), with v2's two routers to Caddy: a TCP router ``HostSNI(`*`)`` with TLS passthrough to Caddy on 443, below n8n's own rule, and an HTTP router on 80 for every host that is not n8n's (plan section 11; ADR 0001, addendum). Anything else holding them, or those routers missing, stops the Cutover here until the Operator chooses again.

```sh
ssh "$VPS" "sudo ss -ltnp '( sport = :80 or sport = :443 )'"
```

Then set these lines in the VPS `.env` (`$V2_DIR/.env`) and deploy this Phase by Phase 2's deploy procedure:

```sh
SITE_ADDRESS=https://
PRIMARY_HOSTS=ofl.ink,<V2_HOST>    # append ,www.ofl.ink if step 2 shows it exists
CLOUDFLARE_RANGES=<the output of: { curl -s https://www.cloudflare.com/ips-v4; echo; curl -s https://www.cloudflare.com/ips-v6; } | xargs>   # [country source]
```

ASSUMPTION: `SITE_ADDRESS` changes from Phase 2's v2 host to `https://` at this deploy, a line the spec's step 1 does not list (rung 2: the spec's Contracts, Caddy configuration, make the production site address one `https://` catch-all; `tests/caddy-ask.sh` adapts the Caddyfile at that address). Overturned if the spec's production site address changes.

```sh
rsync -a --exclude /node_modules --exclude .scratch ./ "$VPS:$V2_DIR/" && ssh "$VPS" "cd $V2_DIR && docker compose up -d --build --wait"   # keeps vendor/ and app/node_modules (Phase 2 spec, Offline build)
```

Then prove the ask wiring. The first request needs the ask to say yes to Phase 2's v2 host, because Caddy asks again before it uses the certificate it already holds. The endpoint Caddy actually uses must say yes to ofl.ink and no to a stranger:

```sh
test "$(curl -s -o /dev/null -w '%{http_code}' "https://$V2_HOST/$USERNAME")" = 200
E="$(ssh "$VPS" "cd $V2_DIR && docker compose exec -T caddy caddy adapt --config /etc/caddy/Caddyfile" | grep -o '"endpoint":"[^"]*"' | cut -d'"' -f4)"
ssh "$VPS" "cd $V2_DIR && docker compose exec -T caddy wget -q -O /dev/null '$E?domain=ofl.ink'"              # the ask Caddy uses says yes
! ssh "$VPS" "cd $V2_DIR && docker compose exec -T caddy wget -q -O /dev/null '$E?domain=unknown.invalid'"   # and refuses a stranger
```

### 2. v1's DNS on record

Read only. Copy every record of the ofl.ink zone as the DNS host lists it (type, name, value, TTL), NETLIFY and ALIAS records included, under Records below, then the output of:

```sh
dig +short NS ofl.ink; dig +noall +answer ofl.ink A ofl.ink AAAA www.ofl.ink CNAME www.ofl.ink A www.ofl.ink AAAA; dig +noall +answer DS ofl.ink; whois ofl.ink | grep -i registrar
```

### 3. Move the zone to Cloudflare, at least 48 hours before the switch `[country source]`

v1 keeps serving throughout. The whole step rests on the country source:

1. Add ofl.ink to a Cloudflare account.
2. Re-create every record from step 2, DNS-only, with TTL 300 on the apex and `www`. NETLIFY or ALIAS records become an apex CNAME to `linkmeclone3.netlify.app`.
3. SSL/TLS mode Full (strict); Always Use HTTPS off; Network -> IP Geolocation on; Rules -> Transform Rules -> Managed Transforms -> Add visitor location headers on.
4. Write the Cloudflare records under Records below. They are the rollback target.
5. If step 2 printed a DS record (none on 2026-10-04, plan section 11): turn DNSSEC off at the registrar first, and wait until `dig +short DS ofl.ink` prints nothing and that record's TTL has passed.
6. At the registrar (Namecheap), set the NS to the pair Cloudflare names. Nothing in the Netlify site is changed.
7. Once Cloudflare shows the zone Active, and only if a DS record existed: DNSSEC on in Cloudflare, and its DS record at the registrar.

Then:

```sh
dig +short NS ofl.ink                                                                  # Cloudflare's pair
curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'     # v1 still serves
```

### 4. Buy and warm a Spare Domain

Buy at least one Spare Domain (a payment). `[country source]` Add it to Cloudflare with ofl.ink's SSL/TLS settings and A -> `$VPS_IPV4` Proxied, and set its NS at its registrar. List it in Spare Domains (`spareDomains`) in the PocketBase admin UI, through Phase 2's SSH tunnel. Warm and check it:

```sh
test "$(curl -s -o /dev/null -w '%{http_code}' "https://$SPARE/$USERNAME")" = 200     # the first call issues the certificate
```

Then open `https://$SPARE/$USERNAME` inside Instagram on a phone: the Profile opens with no Meta warning.

### 5. Backups

In the PocketBase admin UI -> Settings -> Backups, check that auto backups are on, cron `0 3 * * *`, keep 7 (Phase 3's deploy turned them on). Create one backup now, download it to the Mac and set `B=<the downloaded backup's path>`. Then prove it complete and readable:

```sh
R="${TMPDIR:-/tmp}/pb-restore.db"; unzip -p "$B" data.db > "$R" && test "$(sqlite3 "$R" 'pragma integrity_check;')" = ok
test "$(sqlite3 "$R" 'select count(*) from profiles;')" = <the Profiles count the admin UI shows> && unzip -l "$B" | grep -q ' storage/'   # every Profile, and uploaded files
```

### 6. Freeze and the final v1 Import

From now on nobody submits the n8n Form, with no end date: a rollback stays possible indefinitely. Wait until n8n's Executions list shows no running execution of the Form's workflow, and Netlify's Deploys page shows the newest production deploy Published (read only). Then refresh the v1 Snapshot, which reads the old repo and changes nothing there, and record its commit (it lands under Records below). It must match the commit that Published deploy names. Any difference from live v1 stops the Cutover here:

```sh
git -C linkme_clone3 pull --ff-only && echo "v1 commit: $(git -C linkme_clone3 rev-parse HEAD)" >> RUN.md
bad=0; for f in linkme_clone3/api/profiles/*.json; do curl -sf "https://ofl.ink/api/profiles/${f##*/}" | cmp -s - "$f" || { echo "differs from live v1: ${f##*/}"; bad=1; }; done; test "$bad" = 0
rsync -a --delete --exclude .git linkme_clone3/ "$VPS:$V2_DIR/linkme_clone3/"
```

**The v1 Import is never run again after the switch (step 8).** v1 wins on v1's fields, so a re-run would overwrite Creators' Editor edits. The n8n freeze has no end date, so no re-run is ever needed. Run it now, for the last time, then Phase 2's parity check:

```sh
ssh "$VPS" "cd $V2_DIR && docker compose run --rm -v \"\$PWD/linkme_clone3:/v1:ro\" app import-v1 --site /v1"   # Phase 2's command; never again after step 8
PLAYWRIGHT_BASE_URL="https://$V2_HOST" npx playwright test tests/e2e/02-profile-parity.spec.ts --grep-invert 'Geo Rule'   # must pass; Geo Rule cases run locally only
```

### 7. Readiness

Go on only when steps 1, 4, 5 and 6 are done, and:

```sh
nc -zv "$VPS_IPV4" 80 && nc -zv "$VPS_IPV4" 443
test "$(curl -s -o /dev/null -w '%{http_code}' "https://$V2_HOST/internal/tls-ask?domain=ofl.ink")" = 200
curl -s -o /dev/null --resolve "$V2_HOST:443:$VPS_IPV4" -H 'CF-IPCountry: DE' -H 'X-Country: DE' "https://$V2_HOST/r/$LINK_ID"   # straight to the origin: the newest Click Event for that Link (admin UI) has country XX   # [country source]
curl -s -o /dev/null -H 'CF-IPCountry: DE' -H 'X-Country: DE' "https://$SPARE/r/$LINK_ID"   # through Cloudflare: the newest Click Event has the Mac's own country (DE only if the Mac is in Germany)   # [country source]
for i in $(seq 1 $((LIMIT + 1))); do curl -s -o /dev/null -w '%{http_code}\n' --resolve "$V2_HOST:443:$VPS_IPV4" -H "X-Forwarded-For: 198.51.100.$i" "https://$V2_HOST/r/$LINK_ID"; done | grep -q 429   # a forged address does not dodge the limit
```

### 8. Switch

Record the switch time. The line lands under Records below:

```sh
echo "switch: $(date -u +%FT%TZ)" >> RUN.md
```

`[country source]` Then in Cloudflare replace the ofl.ink apex record with A ofl.ink -> `$VPS_IPV4` Proxied (AAAA -> the VPS's IPv6, Proxied, only if it has one). If `www` existed: CNAME www -> ofl.ink Proxied.

### 9. Verify from the Mac

The first request issues ofl.ink's certificate; retry a Cloudflare 52x once after a few seconds. Only v2 answers the TLS Ask with an empty 200 (Cloudflare replaces the `Server` header):

```sh
test "$(curl -s -o /dev/null -w '%{http_code} %{size_download}' 'https://ofl.ink/internal/tls-ask?domain=ofl.ink')" = "200 0"   # only v2 answers an empty 200
test "$(curl -s -o /dev/null -w '%{http_code}' "https://ofl.ink/$USERNAME")" = 200
S="${TMPDIR:-/tmp}/secrets-path"; curl -s -o "$S" https://ofl.ink/netlify/functions/secrets.json
node -e 'const fs=require("fs"),b=fs.readFileSync(process.argv[1],"utf8").replace(/\\\//g,"/");process.exit(Object.values(JSON.parse(fs.readFileSync("linkme_clone3/netlify/functions/secrets.json","utf8"))).filter(Boolean).some(u=>b.includes(u))?1:0)' "$S"   # no v1 Destination at the old path; prints none
ssh "$VPS" "cd $V2_DIR && docker compose logs caddy" | grep -i 'certificate obtained successfully' | grep -q ofl.ink
```

`[country source]` If no certificate was obtained: set the apex record DNS-only, repeat the first `curl` so that Caddy issues directly, then set the record Proxied again.

### 10. No re-import and no clean-up

From the switch on, the v1 Import is never run again (step 6). Readiness traffic (the parity runs, the readiness checks and the Spare Domain warm-up) stays in Stats; nothing is deleted. The switch time recorded in step 8 tells it apart from real Visitors.

### 11. Real-device matrix

Run the real-device matrix of plan section 4 on `https://ofl.ink/$USERNAME` for every Mode, inside Instagram, Facebook, Threads and TikTok and in Safari and Chrome, on iOS and Android. Record each cell under Records below, as the Phase 1 rows are filled in (How to fill a row, above).

### 12. Tell Creators, and hand over imported Profiles

**Three things break or go stale at the Cutover** (story 10). Tell Creators:

- Link Shortcuts (`?link=` URLs) carrying v1 Link Ids no longer reveal (ADR 0004) and must be re-shared.
- Bio links on `linkmeclone3.netlify.app` keep showing a frozen v1 indefinitely and never get Editor edits, so they should move to ofl.ink.
- n8n Form edits no longer reach ofl.ink.

Invite imported Profiles' Creators to the Editor now.

**Hand-over, never before step 8:** step 6's import must be the last, and a re-run would overwrite the Creator's edits. For each v1 Creator who has signed up, in the PocketBase admin UI:

- (a) If they claimed another Username meanwhile, delete that bare Profile first (Profiles: the record whose owner is their account).
- (b) Then set their imported Profile's owner to their account.

PocketBase refuses the owner while the Creator still owns another Profile (Phase 3's unique index on owner, which binds the admin UI too), so the order cannot be got wrong silently: a refusal means the bare Profile was not deleted first. The Creator's next log-in lands in the Editor on the handed-over Profile. `tests/e2e/05-domains.spec.ts` proves this order on the local stack.

### 13. Rollback, if needed

**When:** step 9 fails, or a Mode that passed on v1 fails step 11. `[country source]` In Cloudflare, restore the records written in step 3 (DNS-only). Then, within one TTL:

```sh
curl -s -D - -o /dev/null "https://ofl.ink/$USERNAME" | grep -qi '^server: netlify'     # within one TTL. v2 and its domains keep running; the n8n freeze still holds.
```

**What a rollback restores** (story 14): ofl.ink alone moves back to v1. v2, its data, Custom Domains and Spare Domains keep running, and the n8n freeze still holds. While rolled back, ofl.ink serves v1's secrets file and v1 Link Ids again, and v2 Link Ids shared since step 8 reveal nothing there. A rollback stays possible at any later time too: v1 stays live on `linkmeclone3.netlify.app`, and nothing in Netlify changes (plan section 10). After a late rollback HTTPS on ofl.ink can fail for a while, until Netlify has re-issued ofl.ink's certificate; if the check above still fails after that, switch back to v2 with step 8's change. Switching back after any rollback is step 8 again.

### 14. Each Custom Domain

**The Creator creates one DNS record:** A `$DOMAIN` -> `$VPS_IPV4`, DNS-only (and AAAA -> the VPS's IPv6 only if it has one). The Operator then sets that Profile's Custom Domain (`customDomain`) in the PocketBase admin UI, live on the next load. Then:

```sh
test "$(dig +short A "$DOMAIN")" = "$VPS_IPV4" && test "$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/")" = 200
```

Open `https://$DOMAIN/` inside Instagram on iOS and on Android, and tap a Link of each Mode the Profile uses: an Escape lands on `$DOMAIN`, not on ofl.ink.

**To remove a Custom Domain later:** clear the field in the PocketBase admin UI, then restart Caddy. From then on the TLS Ask says no, and Caddy asks again before it uses the certificate it holds; until the restart it keeps serving that certificate from memory.

```sh
ssh "$VPS" "cd $V2_DIR && docker compose restart caddy"
```

### 15. When ofl.ink is Flagged

The Operator and Creators replace ofl.ink with a warmed Spare Domain in every bio link; nothing in v2 changes. Links already posted outside bios keep ofl.ink and are not recovered. Then buy and warm the next Spare Domain (step 4).

There is no step after 15. Nothing in Netlify ever changes; v1 stays live on `linkmeclone3.netlify.app` indefinitely as the rollback target (plan section 10).

### Lines that rest on the production country source

Decided 2026-10-04: Cloudflare (plan section 11), and every line below is written for that answer (ticket 42). Any other answer rewrites them; each carries `[country source]` above:

- step 1: the `CLOUDFLARE_RANGES` line (compose.yaml hands it to the Caddyfile's Cloudflare lines, on the production catch-all only; `tests/cloudflare-lines.sh` and `tests/caddy-ask.sh` check them offline);
- step 3: the whole step (the zone move to Cloudflare);
- step 4: the Cloudflare part (adding the Spare Domain to Cloudflare, A Proxied, its NS);
- step 7: the two header probes (`CF-IPCountry` and `X-Country`, at the origin and through the Spare Domain);
- step 8: the record change in Cloudflare;
- step 9: setting the record DNS-only and back if no certificate was obtained;
- step 13: restoring the Cloudflare records.

### Records

Filled in by the Operator as the steps go. Steps 6 and 8 append their lines (`v1 commit:`, `switch:`) at the end of this file, below.

- **Step 1, ports 80 and 443** (`ss -ltnp` output, and Traefik's two routers to v2's Caddy): 2026-10-05, `ss -ltnp` shows 80 and 443 held by `docker-proxy` for `n8n-traefik-1` (Traefik v3.6.12, Docker provider only, no file provider; network `n8n_default` 172.18.0.0/16; the `web` entrypoint redirects every host to HTTPS, so no HTTP router is added). A host-level `caddy.service` holds 8443 for another site, so v2's Caddy publishes 8080/9443. v2's router is the label set in compose.vps.yaml (one TCP router ``HostSNI(`*`)``, TLS passthrough, PROXY protocol v2), loaded through `COMPOSE_FILE` in the VPS `.env`. n8n's own router: ``Host(`n8n.srv1395798.hstgr.cloud`)``. Two more facts, same day: (a) on n8n_default another project's container answers to the name `app`, so Caddy reaches ours as `oflink-app` (APP_UPSTREAM); (b) Traefik's `tlschallenge` resolver answers every acme-tls/1 handshake itself and its port-80 redirect router sits at MaxInt64-1 with user routers capped 1000 below, so the Operator added `--entrypoints.web.http.redirections.entryPoint.priority=1000` to the traefik service in /docker/n8n/docker-compose.yml (backup docker-compose.yml.bak-20261005) and recreated Traefik; v2's ACME HTTP router (priority 2000, `/.well-known/acme-challenge/`, to Caddy :80) then let HTTP-01 through. First certificate for v2.ofl.ink obtained; n8n answered 200 before and after.
- **Step 2, v1's DNS** (every record as the DNS host lists it, then the `dig` and `whois` output): 2026-10-05, Namecheap Advanced DNS, ofl.ink: `ALIAS @ -> apex-loadbalancer.netlify.com. TTL 1 min`; `CNAME www -> linkmeclone3.netlify.app. TTL 30 min`; DNSSEC off. Added the same day for Phase 2's v2 host: `A v2 -> 72.62.92.114 TTL 1 min` (re-create it DNS-only in step 3). `dig` and `whois` from the Mac the same day: NS `dns1.registrar-servers.com` `dns2.registrar-servers.com` (Namecheap); `ofl.ink A 99.83.231.61, 75.2.60.5` (Netlify apex load balancer, TTL 60); `www.ofl.ink CNAME linkmeclone3.netlify.app` (TTL 1800); no AAAA on the apex; 0 DS records; registrar NameCheap, Inc. So step 3 has no DNSSEC sub-step.
- **Step 3, the Cloudflare records** (the rollback target): pending
- **Step 11, the real-device matrix on `https://ofl.ink/$USERNAME`** (one row per Mode and browser, the Phase 1 table's columns): pending
