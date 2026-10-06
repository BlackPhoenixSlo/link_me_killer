exports.handler = async function (event, context) {
    // 1. Get the Link ID and optional Tracking ID from the query parameters
    let { id, trackingId, user } = event.queryStringParameters;
    const { getGeoTrackingId } = require('./geo_utils');

    // 2. Load secrets from external JSON file
    const secrets = require('./secrets.json');

    // 3. Look up the URL
    let realUrl = secrets[id];

    // 4. Handle Tracking ID Logic
    if (realUrl && trackingId) {
        // CASE A: Geo-Targeting
        if (trackingId === 'geo' && user) {
            console.log(`Geo-targeting requested for user: ${user}`);
            const geoId = getGeoTrackingId(user, id, event.headers);
            if (geoId) {
                trackingId = geoId;
            } else {
                trackingId = null; // Fallback to no tracking if no rule matches
            }
        }
        // CASE B: Numeric Validation (Security/Cleanliness)
        else if (!/^\d+$/.test(trackingId)) {
            // If it's not "geo" and not a pure number, ignore it.
            trackingId = null;
        }

        // Apply Valid Tracking ID
        if (trackingId) {
            // Remove trailing slash if present to avoid double slashes
            if (realUrl.endsWith('/')) {
                realUrl = realUrl.slice(0, -1);
            }
            realUrl += `/c${trackingId}`;
        }
    }

    // 5. Return the result
    if (realUrl) {
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                // Allow CORS if needed (e.g. for local testing specific ports)
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ realUrl: realUrl })
        };
    } else {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: "Link not found" })
        };
    }
};
