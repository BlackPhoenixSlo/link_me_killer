'use strict';
// Destination resolver: v1's Tracking Code and Geo Rule rules (linkme_clone3/netlify/functions/reveal.js:13-38,
// geo_utils.js:48-77), shared by Reveal and /r.
// A Tracking Code of digits appends /c{digits} after dropping one trailing slash. `geo` takes the code from the Link's Geo Rule
// for the Visitor location (geoTrackingCode), appended the same way, as v1 appends it unchecked. Anything else appends nothing.
// `user` plays no part: v1 needed it to find the Link's Profile file, a v2 Link carries its own Geo Rule.

// geo_utils.js getGeoTrackingId, from step 3 on: a string entry for the country is the code; an object entry gives its region
// entry, else its `default`; with no entry for the country, the rule's own `default`; else none.
// ASSUMPTION: entries are looked up as the rule's own keys, where v1 also reads inherited ones (a country or region header
// such as `constructor` would append a function's source in v1). Rung 4: a Visitor-sent header can no longer reach Object's
// prototype. Overturned if a Geo Rule key could legitimately name an inherited property; none in the v1 Snapshot does.
const own = (object, key) => (key && Object.hasOwn(object, key) ? object[key] : undefined);
function geoTrackingCode(geo, { country, region }) {
  if (!geo || typeof geo !== 'object') return null;
  const countryRule = own(geo, country);
  if (countryRule) {
    if (typeof countryRule === 'object') return own(countryRule, region) || own(countryRule, 'default') || null;
    return countryRule;
  }
  return own(geo, 'default') || null;
}

function resolveDestination(link, trackingCode, location) {
  if (!link || !link.destination) return null;
  let url = link.destination;
  let code = null;
  if (trackingCode === 'geo') code = geoTrackingCode(link.geo, location);
  else if (typeof trackingCode === 'string' && /^\d+$/.test(trackingCode)) code = trackingCode;
  if (code) {
    if (url.endsWith('/')) url = url.slice(0, -1);
    url += `/c${code}`;
  }
  return url;
}

module.exports = { resolveDestination };
