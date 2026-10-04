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

        // Clean URL: Remove the tracking ID from the address bar
        // Changes /username/123 -> /username
        // Clean URL: Remove the tracking ID from the address bar
        // Changes /username/123 -> /username
        const cleanUrl = `/${username}`;
        window.history.replaceState({}, '', cleanUrl);
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
            const urlParams = new URLSearchParams(window.location.search);
            const deepLinkParam = urlParams.get('link');

            if (deepLinkParam) {
                console.log('Deep link detected, fetching secure URL...');
                let fetchUrl = `/.netlify/functions/reveal?id=${deepLinkParam}&user=${username}`;

                // Get link object to check if tracking is enabled
                const link = linksData.find(l => l.id === deepLinkParam);

                if (link && link.tracking) {
                    let trackingIdToUse = localStorage.getItem('linkme_tracking_id');

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

                fetch(fetchUrl)
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
                } else {
                    window.location.href = link.url;
                }
            });

            linksContainer.appendChild(card);
        });
    }

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

        continueBtn.textContent = 'loading...';
        continueBtn.disabled = true;

        const link = linksData.find(l => l.id === currentLinkId);
        // Pass username here too
        let fetchUrl = `/.netlify/functions/reveal?id=${currentLinkId}&user=${username}`;

        if (link && link.tracking) {
            let trackingIdToUse = localStorage.getItem('linkme_tracking_id');

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

        fetch(fetchUrl)
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                if (data.realUrl) {
                    performBounce(data.realUrl);
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
