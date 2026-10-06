document.addEventListener('DOMContentLoaded', () => {
    const profileContainer = {
        name: document.getElementById('displayName'),
        bio: document.getElementById('bio'),
        avatar: document.getElementById('avatar'),
        verifiedBadge: document.getElementById('verifiedBadge')
    };
    const linksContainer = document.getElementById('linksContainer');
    const overlay = document.getElementById('overlay');
    const closeOverlayBtn = document.getElementById('closeOverlayBtn');
    const continueBtn = document.getElementById('continueBtn');
    const igOverlay = document.getElementById('igOverlay');
    const igCloseBtn = document.getElementById('igCloseBtn');
    const igOpenBtn = document.getElementById('igOpenBtn');
    const igAltBtn = document.getElementById('igAltBtn');
    const igTarget = document.getElementById('igTarget');
    const igCopyBtn = document.getElementById('igCopyBtn');
    const igIcon = document.getElementById('igIcon');
    const igAppName = document.getElementById('igAppName');

    // Store links data to simulate API fetching
    let linksData = [];
    let currentProfile = null;
    let currentLinkId = null;

    // In-App Browser: the plan's pattern, verbatim and case-insensitive. Escape Mode, Link Shortcuts and the address bar go
    // by it alone, exactly as on the phones where they work today
    const IN_APP_BROWSER = /Instagram|FBAN|FBAV|Threads|musical_ly|Bytedance|TikTok/i;
    const ua = navigator.userAgent || '';
    const isInAppBrowser = IN_APP_BROWSER.test(ua);
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    // Any app's In-App Browser, for Deeplink Mode only (taps, the Age Gate's Continue, Deeplink at open): the plan's pattern,
    // more apps' tokens, or a webview by its shape: on iOS a WKWebView says Mobile/ but not Safari/ (Safari, Chrome and Firefox
    // for iOS all say Safari/); on Android a WebView says `; wv)`
    const MORE_APP_TOKENS = /FB_IAB|Snapchat|Twitter|Line\/|MicroMessenger|Pinterest|LinkedInApp|Reddit/i;
    const isIOSWebView = isIOS && /Mobile\//.test(ua) && !/Safari\//.test(ua);
    const isAndroidWebView = /Android/.test(ua) && /; wv\)/.test(ua);
    const isAnyInAppBrowser = isInAppBrowser || MORE_APP_TOKENS.test(ua) || isIOSWebView || isAndroidWebView;
    const isIOSInstagram = isIOS && /Instagram/i.test(navigator.userAgent || '');
    // v1's own Instagram check (linkme_clone3/index.html): the Escape Overlay then reads exactly as v1's, icon and "Instagram" included
    const isInstagram = (navigator.userAgent || '').indexOf('Instagram') > -1;
    const isAndroid = /Android/.test(navigator.userAgent || '');
    const canPopOut = isIOS || isAndroid; // the platforms with an escape link

    // The Profile this page is for, as the app resolved it from the host and the path (Phase 5): its Username, the Tracking Code
    // the path carried, and the Profile path every URL the page builds for itself starts from (`/{username}`, or `/` on a
    // Custom Domain). Null when no Profile answers the path, which lands on the landing page as an unknown Username does.
    const bootstrap = JSON.parse(document.getElementById('profile-bootstrap').textContent);
    if (!bootstrap) {
        window.location.href = '/landing.html';
        return;
    }
    let { username, profilePath } = bootstrap;
    const trackingId = bootstrap.trackingCode;
    // Link Shortcut: read on page load, before the address bar is touched, so ?link= survives beside the code
    const linkShortcut = new URLSearchParams(window.location.search).get('link');

    if (!username || username === 'index.html') { // Default
        username = 'juliafilippo_';
        profilePath = `/${username}`;
    }

    // A Tracking Code in the path is stored once the Profile JSON names its Profile (below)
    if (trackingId) {
        console.log(`Captured tracking ID: ${trackingId}`);

        // Clean URL: Remove the tracking ID from the address bar, outside In-App Browsers only,
        // so the app's own "Open in browser" menu item carries the Tracking Code
        // Changes /username/123 -> /username, and on a Custom Domain /123 -> /
        if (!isInAppBrowser) {
            window.history.replaceState({}, '', profilePath);
        }
    }

    console.log(`Loading profile: ${username}`);

    fetch(`/api/profiles/${username}.json`)
        .then(response => {
            if (!response.ok) throw new Error('Profile not found');
            return response.json();
        })
        .then(data => {
            renderProfile(data.profile);
            currentProfile = data.profile;
            if (trackingId) localStorage.setItem(trackingKey(), trackingId);
            linksData = data.links;
            renderLinks(linksData);

            // Page View Ping (Phase 4): once per load, after the Profile has rendered, never for an unknown Username (the
            // fetch above failed for one); keepalive lets it finish when the Visitor leaves at once, and nothing waits on it
            fetch(`/v/${username}`, { method: 'POST', keepalive: true }).catch(() => {});

            // A Link Shortcut whose Link Id is not on this Profile is ignored: the page loads as a plain visit
            const shortcutLink = linkShortcut ? linksData.find(link => link.id === linkShortcut) : null;

            const shortcutMode = shortcutLink ? effectiveMode(shortcutLink) : null;

            if (isInAppBrowser && shortcutMode === 'escape_ig') {
                // In an In-App Browser an Escape Mode Link Shortcut is v1's `?link=`: Reveal, then bounce straight to the
                // Destination, on every load as v1 did. The Escape Overlay, aimed at that Link's escape target and with Close,
                // is the fallback
                const target = escapeTarget(shortcutLink.id);
                pointAddressAt(target);
                openEscapeOverlay(target, true);
                if (canPopOut) revealAndGo(shortcutLink, popOut);
                return;
            }

            // Escape Overlay on open: In-App Browser and a Profile default of Escape Mode, as v1 shows it to Instagram; the
            // pop-out waits for the Visitor's tap, "Open in browser" or a Link
            if (isInAppBrowser && defaultMode() === 'escape_ig') {
                const target = escapeTarget(null);
                pointAddressAt(target);
                openEscapeOverlay(target, !linksData.every(link => effectiveMode(link) === 'escape_ig'));
            }

            // Deeplink at open: a Profile default of `deeplink_open` pops out to this Profile once the Profile JSON has
            // answered (the default Mode is known no sooner), in any app's In-App Browser, once per tab. If it does not take,
            // the page stays usable and taps pop out as Deeplink on tap
            if (isAnyInAppBrowser && canPopOut && !shortcutLink && defaultMode() === 'deeplink_open') {
                popOutOnLoad(() => popOut(escapeTarget(null).url));
            }

            // Link Shortcut, with no Age Gate (v1's Link Shortcut has none). A Deeplink Mode one in an In-App Browser is v1's
            // `?link=`: Reveal, then bounce straight to the Destination, on every load. Any other gets the Destination as a tap
            // gets it, then travels by Mode
            if (shortcutLink && isInAppBrowser && canPopOut && isDeeplink(shortcutMode)) {
                revealAndGo(shortcutLink, popOut);
            } else if (shortcutLink) {
                goToDestination(shortcutLink);
            }
        })
        .catch(error => {
            console.error('Error fetching profile:', error);
            window.location.href = '/landing.html';
        });

    function renderProfile(profile) {
        // User Request: Name as Title
        document.title = profile.displayName;

        profileContainer.name.textContent = profile.displayName;
        profileContainer.bio.textContent = profile.bio;
        profileContainer.avatar.src = profile.avatarUrl;

        // User Request: Avatar as Page Icon (Favicon)
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = profile.avatarUrl;

        if (profile.verified) {
            profileContainer.verifiedBadge.style.display = 'inline-block';
        }
    }

    function renderLinks(links) {
        linksContainer.innerHTML = '';
        links.forEach(link => {
            // A Deeplink card in an In-App Browser is an anchor to that Link's escape link, so the tap itself pops out, as the
            // Escape Overlay's "Open in browser" does: a real phone (2026-10-06) dropped the same link set from script. The
            // stored Tracking Code is already in place here (it is stored before the Links render)
            const popOutHref = !link.isAdult && popsOutByAnchor(link) ? escapeLink(escapeTarget(link.id).url) : null;
            const card = document.createElement(popOutHref ? 'a' : 'div');
            card.className = 'link-card';
            if (popOutHref) card.href = popOutHref;



            const content = document.createElement('div');
            content.className = 'link-content';

            const title = document.createElement('span');
            title.className = 'link-title';
            title.textContent = link.title;

            // Add lock icon to title if adult
            if (link.isAdult) {
                const lockIcon = document.createElement('i');
                lockIcon.className = 'fas fa-lock lock-icon-small';
                title.appendChild(lockIcon);
            }

            const subtitle = document.createElement('span');
            subtitle.className = 'link-subtitle';
            subtitle.textContent = link.subtitle || (link.isAdult ? 'Exclusive Content' : 'Social Media');

            if (link.backgroundImage) {
                card.style.backgroundImage = `url('${link.backgroundImage}')`;
                card.classList.add('has-bg-image');

                // User Request: Make container height match the image aspect ratio exactly
                const img = new Image();
                img.src = link.backgroundImage;
                img.onload = function () {
                    const ratio = img.naturalWidth / img.naturalHeight;
                    // Apply aspect ratio to the card so it fits the image perfectly
                    card.style.aspectRatio = `${ratio} / 1`;
                };
            }

            // Top-left Icon (User Request)
            // Only add icon if there is a background image (Banner)
            if (link.icon && link.backgroundImage) {
                const icon = document.createElement('img');
                icon.src = link.icon;
                icon.className = 'link-icon';
                card.appendChild(icon);
            }

            content.appendChild(title);
            content.appendChild(subtitle);
            card.appendChild(content);

            // Click Handler
            card.addEventListener('click', () => {
                if (link.isAdult) {
                    openOverlay(link.id);
                } else if (isInAppBrowser && effectiveMode(link) === 'escape_ig') {
                    escapeOnTap(link);
                } else if (popsOutAsDeeplink(link)) {
                    deeplinkOnTap(link);
                } else {
                    goToDestination(link);
                }
            });

            linksContainer.appendChild(card);
        });
    }

    // Mode: the Link's own if recognised, else the Profile's default if recognised, else Escape Mode. `deeplink_open` is a
    // Profile default only; a Link inheriting it travels as Deeplink on tap. `deeplink_script` is Deeplink on tap by a scripted
    // pop-out instead of an anchor tap, a test variant kept so a phone can compare the two
    const MODES = ['direct', 'escape_ig', 'deeplink', 'deeplink_script', 'deeplink_open'];
    function defaultMode() {
        if (currentProfile && MODES.includes(currentProfile.mode)) return currentProfile.mode;
        return 'escape_ig';
    }

    function effectiveMode(link) {
        return MODES.includes(link.mode) ? link.mode : defaultMode();
    }

    // Deeplink on tap (either variant) and Deeplink at open: a tap travels the same way under any
    function isDeeplink(mode) {
        return mode === 'deeplink' || mode === 'deeplink_script' || mode === 'deeplink_open';
    }

    // A tap on this Link pops out as Deeplink on tap: a Deeplink Mode Link in any app's In-App Browser, on a platform with an
    // escape link
    function popsOutAsDeeplink(link) {
        return isAnyInAppBrowser && canPopOut && isDeeplink(effectiveMode(link));
    }

    // ...as a real anchor tap: every such Link but a `deeplink_script` one, which pops out from script
    function popsOutByAnchor(link) {
        return popsOutAsDeeplink(link) && effectiveMode(link) !== 'deeplink_script';
    }

    // Tracking Code key (Phase 4): one per Profile, by the record id the Profile JSON carries, so a code that arrived on one
    // Profile never reaches another, even one that later holds its Username. v1's global `linkme_tracking_id` is never read
    // or written: at Cutover it may hold another Creator's code.
    function trackingKey() {
        return `linkme_tracking_id:${currentProfile.id}`;
    }

    // Stored Tracking Code: the path code this Profile keeps, read by Reveal and by the escape target
    function storedTrackingCode() {
        return localStorage.getItem(trackingKey());
    }

    // Reveal URL: Link Id, Username, and a Tracking Code when the Link has tracking on
    function revealUrl(linkId) {
        const link = linksData.find(l => l.id === linkId);
        let fetchUrl = `/.netlify/functions/reveal?id=${linkId}&user=${username}`;

        if (link && link.tracking) {
            let trackingIdToUse = storedTrackingCode();

            if (!trackingIdToUse) {
                // Priority 2: Modified - Only use Link Default
                if (link.default_tracknumber) {
                    trackingIdToUse = link.default_tracknumber;
                }
            }

            if (trackingIdToUse) {
                fetchUrl += `&trackingId=${trackingIdToUse}`;
            }
        }
        return fetchUrl;
    }

    // Destination: an Adult Link, Deeplink Mode always, and any Link without a url get it from Reveal; otherwise the url
    function goToDestination(link) {
        if (link.isAdult || isDeeplink(effectiveMode(link)) || !link.url) {
            revealAndGo(link);
        } else {
            window.location.href = link.url;
        }
    }

    // Reveal, then `go` to the answer (by default, travel by the Link's Mode)
    function revealAndGo(link, go = url => travel(link, url)) {
        fetch(revealUrl(link.id))
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                if (data.realUrl) {
                    go(data.realUrl);
                }
            })
            .catch(err => console.error('Error revealing link:', err));
    }

    // Escape target: https on the host that served the page, at the Profile path with the stored Tracking Code
    function escapeTarget(linkId) {
        const code = storedTrackingCode();
        let path = code ? `${profilePath.replace(/\/$/, '')}/${code}` : profilePath;
        if (linkId) path += `?link=${linkId}`;
        return { path, url: `https://${window.location.host}${path}` };
    }

    // An address as https, whatever scheme it had, as v1's performBounce forced it
    const asHttps = url => 'https://' + url.replace(/^https?:\/\//i, '');

    // Android intent for an address: intent://{host}/{path}[?query] opened as https, with `extra` (package, fallback)
    function httpsIntent(url, extra) {
        return 'intent://' + asHttps(url).slice('https://'.length) + '#Intent;scheme=https;' + extra + 'end';
    }
    const instagramExtBrowser = url => 'instagram://extbrowser/?url=' + encodeURIComponent(asHttps(url));
    const fallbackTo = url => 'S.browser_fallback_url=' + encodeURIComponent(asHttps(url)) + ';';

    // Escape link, per platform: in iOS Instagram, Instagram's own open-in-browser link, since a real iPhone (2026-10-06) showed
    // Instagram drops x-safari-https:// while instagram://extbrowser/ goes through; elsewhere v1's performBounce strings
    // (linkme_clone3/script.js), x-safari-https:// on iOS and the Chrome intent with no fallback on Android; anything else has none
    function escapeLink(url) {
        if (isIOSInstagram) return instagramExtBrowser(url);
        if (isIOS) return 'x-safari-' + asHttps(url);
        if (isAndroid) return httpsIntent(url, 'package=com.android.chrome;');
        return null;
    }

    // Pop out of the In-App Browser, where the platform has an escape link
    function popOut(url) {
        const href = escapeLink(url);
        if (href) window.location.href = href;
    }

    // Deeplink at open runs at most once per tab and Profile: if an In-App Browser loads the target in place instead of
    // leaving, the reloaded page does not pop out again. Taps and `?link=` are never held back
    function popOutOnLoad(fire) {
        const key = 'popOut:' + profilePath;
        try {
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, '1');
        } catch (err) {
            return; // no storage, no guard: no load-time pop-out
        }
        fire();
    }

    // An Escape Mode tap in an In-App Browser: fired from the tap itself, with no request before it
    function escapeOnTap(link) {
        const target = escapeTarget(link.id);
        pointAddressAt(target);
        popOut(target.url);
        openEscapeOverlay(target, true);
    }

    // A Deeplink tap in an In-App Browser: the tap is on an anchor whose href is that Link's escape link, so the anchor itself
    // pops out to the escape target, with no request before it (an In-App Browser drops a pop-out that waits on one, and one
    // set from script) and no Escape Overlay; Safari or Chrome loads the Link Shortcut and Reveals there. A `deeplink_script`
    // tap instead sets that escape link from script here. Then the fallback is armed: a dead tap falls back to a Reveal and plain navigation in the app when the page neither blurred, hid nor
    // went away during the wait, and the wait was not stretched by the page being suspended
    const POP_OUT_WAIT_MS = 2500;
    let popOutFallback = null;
    let leftPage = false;
    function deeplinkOnTap(link) {
        leftPage = false;
        if (effectiveMode(link) === 'deeplink_script') popOut(escapeTarget(link.id).url);
        clearTimeout(popOutFallback);
        const start = Date.now();
        popOutFallback = setTimeout(() => {
            if (leftPage || Date.now() - start > POP_OUT_WAIT_MS + 500) return;
            revealAndGo(link, url => { window.location.href = url; });
        }, POP_OUT_WAIT_MS);
    }
    const markLeft = () => {
        leftPage = true;
        clearTimeout(popOutFallback);
    };
    window.addEventListener('blur', markLeft);
    window.addEventListener('pagehide', markLeft);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') markLeft();
    });

    // After a Reveal, a Deeplink Mode Link pops out: in an In-App Browser (a Link Shortcut, or a platform with no escape link
    // for a tap) straight to the Destination in Safari or Chrome, as v1's performBounce did; on Android outside one, an https
    // Destination by a package-less app-link intent, so Android picks the app that owns it. Everything else navigates plainly
    // (Escape Mode outside an In-App Browser behaves as Direct Mode)
    function travel(link, url) {
        if (isDeeplink(effectiveMode(link))) {
            let href = null;
            if (isAnyInAppBrowser && /^https?:\/\//i.test(url)) href = escapeLink(url);
            else if (!isAnyInAppBrowser && isAndroid && /^https:\/\//i.test(url)) href = httpsIntent(url, fallbackTo(url));
            if (href) {
                window.location.href = href;
                return;
            }
        }
        window.location.href = url;
    }

    // Address bar while an Escape Overlay shows: the target's path and query; Close puts back the one it replaced
    let addressBeforeOverlay = null;
    function pointAddressAt(target) {
        addressBeforeOverlay = window.location.pathname + window.location.search + window.location.hash;
        window.history.replaceState({}, '', target.path);
    }

    // Escape Overlay: every way out aimed at the escape target; blocks scrolling while it shows
    function openEscapeOverlay(target, closeable) {
        igIcon.style.display = isInstagram ? '' : 'none';
        igAppName.textContent = isInstagram ? 'Instagram' : 'This app';
        igOpenBtn.href = escapeLink(target.url) || target.url;
        // On iOS Instagram, "Try another way" is the x-safari- link "Open in browser" was before 2026-10-06
        igAltBtn.hidden = !isIOSInstagram;
        if (isIOSInstagram) igAltBtn.href = 'x-safari-' + asHttps(target.url);
        igTarget.textContent = target.url;
        igCloseBtn.hidden = !closeable;
        igOverlay.classList.remove('hidden');
        igOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeEscapeOverlay() {
        window.history.replaceState({}, '', addressBeforeOverlay);
        igOverlay.classList.remove('active');
        igOverlay.classList.add('hidden');
        document.body.style.overflow = '';
    }

    igCloseBtn.addEventListener('click', closeEscapeOverlay);

    igCopyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(igTarget.textContent)
            .catch(err => console.error('Error copying link:', err));
    });

    // Overlay Logic
    function openOverlay(linkId) {
        currentLinkId = linkId;
        // An Adult Deeplink Link in an In-App Browser: Continue is an anchor to its escape link, so that tap pops out as a card's
        // does. Otherwise Continue has no href and Reveals
        const link = linksData.find(l => l.id === linkId);
        if (link && popsOutByAnchor(link)) continueBtn.href = escapeLink(escapeTarget(link.id).url);
        else continueBtn.removeAttribute('href');
        overlay.classList.remove('hidden');
        // Add active class for transition
        setTimeout(() => overlay.classList.add('active'), 10);
    }

    function closeOverlay() {
        overlay.classList.remove('active');
        setTimeout(() => overlay.classList.add('hidden'), 300);
        currentLinkId = null;
    }

    closeOverlayBtn.addEventListener('click', closeOverlay);

    // Deep Linking / Bounce Logic
    continueBtn.addEventListener('click', () => {
        if (!currentLinkId || continueBtn.getAttribute('aria-disabled') === 'true') return;
        // Found at click time, as v1 did: closing the Age Gate mid-Reveal still travels
        const link = linksData.find(l => l.id === currentLinkId);

        // An Adult Escape or Deeplink Mode Link in an In-App Browser: this tap is the pop-out, with no Reveal in the app first
        // (for Deeplink, the anchor's own href, set by openOverlay; for `deeplink_script`, set from script by deeplinkOnTap)
        if (isInAppBrowser && effectiveMode(link) === 'escape_ig') {
            escapeOnTap(link);
            closeOverlay();
            return;
        }
        if (popsOutAsDeeplink(link)) {
            deeplinkOnTap(link);
            closeOverlay();
            return;
        }

        continueBtn.textContent = 'loading...';
        continueBtn.setAttribute('aria-disabled', 'true');

        fetch(revealUrl(currentLinkId))
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                if (data.realUrl) {
                    travel(link, data.realUrl);
                }
                // Reset UI
                continueBtn.textContent = 'Continue (18+)';
                continueBtn.removeAttribute('aria-disabled');
                closeOverlay();
            })
            .catch(err => {
                console.error('Error revealing link:', err);
                continueBtn.textContent = 'Continue (18+)';
                continueBtn.removeAttribute('aria-disabled');
            });
    });

    // Close on click outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeOverlay();
        }
    });
});
