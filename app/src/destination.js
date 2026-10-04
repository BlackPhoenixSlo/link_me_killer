'use strict';
// Destination resolver: v1's Tracking Code rule (linkme_clone3/netlify/functions/reveal.js:13-38), shared by Reveal and /r.
// A Tracking Code of digits appends /c{digits} after dropping one trailing slash; anything else appends nothing.
// ASSUMPTION: `trackingId=geo` appends nothing until ticket 18 adds Geo Rules and Visitor location (rung 2: ticket 16, first
// ASSUMPTION). Overturned if a Phase 0 or Phase 1 spec asks Reveal for a Geo Rule.
function resolveDestination(link, trackingCode) {
  if (!link || !link.destination) return null;
  let url = link.destination;
  if (typeof trackingCode === 'string' && /^\d+$/.test(trackingCode)) {
    if (url.endsWith('/')) url = url.slice(0, -1);
    url += `/c${trackingCode}`;
  }
  return url;
}

module.exports = { resolveDestination };
