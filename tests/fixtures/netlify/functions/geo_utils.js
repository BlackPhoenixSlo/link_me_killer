const fs = require('fs');
const path = require('path');

/**
 * Determines the tracking ID based on the user's geo location.
 * @param {string} username - The profile username (to load the correct JSON).
 * @param {string} linkId - The ID of the link being accessed.
 * @param {object} headers - The request headers containing geo info.
 * @returns {string|null} - The geo-specific tracking ID, or null if logic fails/default applies.
 */
function getGeoTrackingId(username, linkId, headers) {
    try {
        // 1. Resolve Profile JSON Path
        // Function run in /var/task/netlify/functions, so we need to go up to api/profiles
        // Note: In Netlify, we need to ensure this file is included in the bundle.
        // We will try a few paths to be robust.

        // This path works if the file is copied to the function directory or available via relative path
        // Try multiple paths to be robust against Netlify's bundling
        const possiblePaths = [
            path.resolve(__dirname, `../../api/profiles/${username}.json`), // Local dev / typical structure
            path.resolve(process.cwd(), `api/profiles/${username}.json`),   // Lambda root
            path.resolve(__dirname, `api/profiles/${username}.json`)        // If flattened
        ];

        let profilePath = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                profilePath = p;
                break;
            }
        }

        console.log(`Resolved profile path: ${profilePath}`);

        if (!profilePath) {
            console.error(`Profile not found in any checked paths: ${possiblePaths.join(', ')}`);
            return null;
        }

        const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

        // 2. Find the Link
        const link = profileData.links.find(l => l.id === linkId);
        if (!link || !link.geo) return null;

        // 3. Determine User Location from Headers
        const country = headers['x-country'] || 'US'; // Default to US if unknown
        const region = headers['x-nf-subdivision-code'] || headers['x-region'] || ''; // e.g., 'NJ'

        console.log(`Geo Config: Country=${country}, Region=${region}`);

        // 4. Match Rules
        // Structure: "geo": { "US": { "NJ": "11", "default": "10" }, "SI": "53", "default": "10" }

        if (link.geo[country]) {
            const countryRule = link.geo[country];

            // Check if it's an object with regions
            if (typeof countryRule === 'object') {
                if (region && countryRule[region]) {
                    return countryRule[region];
                }
                return countryRule['default'] || null;
            }
            // It's a direct string (e.g. "SI": "53")
            else {
                return countryRule;
            }
        }

        // Fallback: Check if there's a global default in the geo object
        if (link.geo['default']) {
            return link.geo['default'];
        }

        return null;

    } catch (error) {
        console.error('Geo logic error:', error);
        return null;
    }
}

module.exports = { getGeoTrackingId };
