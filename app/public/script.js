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

    // Store links data to simulate API fetching
    let linksData = [];
    let currentProfile = null;
    let currentLinkId = null;

    // In-App Browser: the plan's pattern, verbatim and case-insensitive
    const IN_APP_BROWSER = /Instagram|FBAN|FBAV|Threads|musical_ly|Bytedance|TikTok/i;
    const isInAppBrowser = IN_APP_BROWSER.test(navigator.userAgent || '');
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent || '');
    const isIOSInstagram = isIOS && /Instagram/i.test(navigator.userAgent || '');
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
                // Destination, once per tab. The Escape Overlay, aimed at that Link's escape target and with Close, is the fallback
                const target = escapeTarget(shortcutLink.id);
                pointAddressAt(target);
                openEscapeOverlay(target, true);
                if (canPopOut) popOutOnLoad(() => revealAndGo(shortcutLink, bounceOnLoad));
                return;
            }

            // Pop out on open (v1's "at start"), once per tab: In-App Browser and a Profile default of Escape or Deeplink Mode.
            // Escape Mode also shows the Escape Overlay as the fallback; Deeplink Mode leaves the page usable
            if (isInAppBrowser && defaultMode() === 'escape_ig') {
                const target = escapeTarget(null);
                pointAddressAt(target);
                openEscapeOverlay(target, !linksData.every(link => effectiveMode(link) === 'escape_ig'));
                if (!shortcutLink) popOutOnLoad(() => bounceOnLoad(target.url));
            } else if (isInAppBrowser && defaultMode() === 'deeplink' && !shortcutLink) {
                popOutOnLoad(() => bounceOnLoad(escapeTarget(null).url));
            }

            // Link Shortcut, with no Age Gate (v1's Link Shortcut has none). A Deeplink Mode one in an In-App Browser is v1's
            // `?link=`: Reveal, then bounce straight to the Destination, once per tab. Any other gets the Destination as a tap
            // gets it, then travels by Mode
            if (shortcutLink && isInAppBrowser && canPopOut && shortcutMode === 'deeplink') {
                popOutOnLoad(() => revealAndGo(shortcutLink, bounceOnLoad));
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
            const card = document.createElement('div');
            card.className = 'link-card';



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
                } else {
                    goToDestination(link);
                }
            });

            linksContainer.appendChild(card);
        });
    }

    // Mode: the Link's own if recognised, else the Profile's default if recognised, else Escape Mode
    const MODES = ['direct', 'escape_ig', 'deeplink'];
    function defaultMode() {
        if (currentProfile && MODES.includes(currentProfile.mode)) return currentProfile.mode;
        return 'escape_ig';
    }

    function effectiveMode(link) {
        return MODES.includes(link.mode) ? link.mode : defaultMode();
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
        if (link.isAdult || effectiveMode(link) === 'deeplink' || !link.url) {
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
    const fallbackTo = url => 'S.browser_fallback_url=' + encodeURIComponent(asHttps(url)) + ';';

    // Escape link, per platform: v1's x-safari-https:// on iOS and its Chrome intent on Android; anything else has none.
    // A tap's Android intent falls back to the address itself, for a phone without Chrome. The load-time pop-out's has no
    // fallback, as v1's had none: an In-App Browser that loads the fallback in place would reload this page inside the app
    function escapeLink(url, withFallback = true) {
        if (isIOS) return 'x-safari-' + asHttps(url);
        if (isAndroid) return httpsIntent(url, 'package=com.android.chrome;' + (withFallback ? fallbackTo(url) : ''));
        return null;
    }

    // Pop out of the In-App Browser, where the platform has an escape link
    function popOut(url, withFallback = true) {
        const href = escapeLink(url, withFallback);
        if (href) window.location.href = href;
    }
    const bounceOnLoad = url => popOut(url, false);

    // The load-time pop-out runs at most once per tab: if an In-App Browser loads the target in place instead of leaving,
    // the reloaded page does not pop out again. Taps are never held back
    function popOutOnLoad(fire) {
        try {
            if (sessionStorage.getItem('popOut')) return;
            sessionStorage.setItem('popOut', '1');
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

    // After a Reveal, a Deeplink Mode Link pops out: in an In-App Browser straight to the Destination in Safari or Chrome, as
    // v1's performBounce did after its Reveal; on Android outside one, an https Destination by a package-less app-link intent,
    // so Android picks the app that owns it. Everything else navigates plainly (Escape Mode outside an In-App Browser behaves
    // as Direct Mode)
    function travel(link, url) {
        if (effectiveMode(link) === 'deeplink') {
            let href = null;
            if (isInAppBrowser && /^https?:\/\//i.test(url)) href = escapeLink(url);
            else if (!isInAppBrowser && isAndroid && /^https:\/\//i.test(url)) href = httpsIntent(url, fallbackTo(url));
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
        igOpenBtn.href = escapeLink(target.url) || target.url;
        igAltBtn.hidden = !isIOSInstagram;
        if (isIOSInstagram) igAltBtn.href = 'instagram://extbrowser/?url=' + encodeURIComponent(target.url);
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
        if (!currentLinkId) return;
        // Found at click time, as v1 did: closing the Age Gate mid-Reveal still travels
        const link = linksData.find(l => l.id === currentLinkId);

        // An Adult Escape Mode Link in an In-App Browser: this tap is the Escape, with no Reveal in the app
        if (isInAppBrowser && effectiveMode(link) === 'escape_ig') {
            escapeOnTap(link);
            closeOverlay();
            return;
        }

        continueBtn.textContent = 'loading...';
        continueBtn.disabled = true;

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
                continueBtn.disabled = false;
                closeOverlay();
            })
            .catch(err => {
                console.error('Error revealing link:', err);
                continueBtn.textContent = 'Continue (18+)';
                continueBtn.disabled = false;
            });
    });

    // Close on click outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeOverlay();
        }
    });
});
