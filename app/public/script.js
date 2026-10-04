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

    // Helper: Perform Bounce
    function performBounce(targetUrl) {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        const isInstagram = ua.indexOf('Instagram') > -1;
        const isIOS = /iPhone|iPad|iPod/.test(ua);
        const isAndroid = /Android/.test(ua);

        console.log(`Attempting bounce to: ${targetUrl}`);

        if (isInstagram) {
            if (isIOS) {
                const bounceUrl = "x-safari-https://" + targetUrl.replace(/^https?:\/\//, "");
                window.location.href = bounceUrl;
                return true;
            } else if (isAndroid) {
                const intentUrl = "intent://" + targetUrl.replace(/^https?:\/\//, "") + "#Intent;scheme=https;package=com.android.chrome;end";
                window.location.href = intentUrl;
                return true;
            }
        }

        // Fallback / Standard Redirect
        window.location.href = targetUrl;
        return false;
    }

    // In-App Browser: the plan's pattern, verbatim and case-insensitive (performBounce keeps v1's own Instagram check for the Link Shortcut until ticket 10)
    const IN_APP_BROWSER = /Instagram|FBAN|FBAV|Threads|musical_ly|Bytedance|TikTok/i;
    const isInAppBrowser = IN_APP_BROWSER.test(navigator.userAgent || '');
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent || '');
    const isIOSInstagram = isIOS && /Instagram/i.test(navigator.userAgent || '');

    // Routing Logic: Get username and optional ID from URL path
    // Format: /username/id or /username
    const pathSegments = window.location.pathname.replace(/^\/|\/$/g, '').split('/');
    let username = pathSegments[0];
    const trackingId = pathSegments[1]; // The number after the username

    if (!username || username === 'index.html') username = 'juliafilippo_'; // Default

    // Store the ID if present
    if (trackingId) {
        console.log(`Captured tracking ID: ${trackingId}`);
        localStorage.setItem('linkme_tracking_id', trackingId);

        // Clean URL: Remove the tracking ID from the address bar, outside In-App Browsers only,
        // so the app's own "Open in browser" menu item carries the Tracking Code
        // Changes /username/123 -> /username
        if (!isInAppBrowser) {
            const cleanUrl = `/${username}`;
            window.history.replaceState({}, '', cleanUrl);
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
            linksData = data.links;
            renderLinks(linksData);

            // Check for Deep Link Query Param logic (existing)...
            // Example: /?link=1 (where 1 is the link ID)
            // Read before the Escape Overlay below rewrites the address
            const urlParams = new URLSearchParams(window.location.search);
            const deepLinkParam = urlParams.get('link');

            // Escape Overlay on open: In-App Browser and a Profile default that resolves to Escape Mode
            if (isInAppBrowser && defaultMode() === 'escape_ig') {
                const target = escapeTarget(null);
                pointAddressAt(target);
                openEscapeOverlay(target, !linksData.every(link => effectiveMode(link) === 'escape_ig'));
            }

            if (deepLinkParam) {
                console.log('Deep link detected, fetching secure URL...');
                fetch(revealUrl(deepLinkParam))
                    .then(res => res.json())
                    .then(data => {
                        if (data.realUrl) {
                            performBounce(data.realUrl);
                        }
                    })
                    .catch(err => console.error('Deep link fetch error:', err));
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
                } else if (effectiveMode(link) === 'deeplink' || !link.url) {
                    // Deeplink Mode always, and any Link without a url, gets its Destination from Reveal
                    revealAndGo(link);
                } else {
                    window.location.href = link.url;
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

    // Stored Tracking Code: the path code the page keeps, read by Reveal and by the escape target
    function storedTrackingCode() {
        return localStorage.getItem('linkme_tracking_id');
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

    function revealAndGo(link) {
        fetch(revealUrl(link.id))
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                if (data.realUrl) {
                    travel(link, data.realUrl);
                }
            })
            .catch(err => console.error('Error revealing link:', err));
    }

    // Escape target: https on the host that served the page, with the stored Tracking Code
    function escapeTarget(linkId) {
        const code = storedTrackingCode();
        let path = `/${username}` + (code ? `/${code}` : '');
        if (linkId) path += `?link=${linkId}`;
        return { path, url: `https://${window.location.host}${path}` };
    }

    // Escape link, per platform: iOS hands the target to Safari; anything else has none (Android lands in 09)
    function escapeLink(targetUrl) {
        return isIOS ? 'x-safari-' + targetUrl : null;
    }

    // An Escape Mode tap in an In-App Browser: fired from the tap itself, with no request before it
    function escapeOnTap(link) {
        const target = escapeTarget(link.id);
        pointAddressAt(target);
        const href = escapeLink(target.url);
        if (href) window.location.href = href;
        openEscapeOverlay(target, true);
    }

    // After a Reveal, every Link navigates plainly: Escape Mode outside an In-App Browser behaves as Direct Mode
    function travel(link, url) {
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
