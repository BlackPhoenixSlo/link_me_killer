'use strict';
// Event Recorder (docs/spec/phase-04-stats.md, Interfaces): one Event per call, a Page View or a Click, written through the
// gateway's superuser access. An Event holds its kind, Profile, Link, the Visitor's country and In-App Browser, and PocketBase's
// created time; no IP address, User-Agent string, referrer or Visitor identifier is stored. Nothing here logs.
// Until ticket 36 bounds the write and swallows its failure, a failed write throws, so the request it serves fails too.

// The Visitor's country: `CF-IPCountry` only, uppercased; anything but two letters A–Z, or no header, is `XX`. Never US, and
// never Phase 2's Visitor location lookup, which prefers `x-country` and falls back to US (app/src/visitor-location.js).
function visitorCountry(request) {
  const country = (request.headers.get('cf-ipcountry') || '').toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : 'XX';
}

// The In-App Browser, from the User-Agent with plan section 4's patterns, case-insensitive as the page script reads them
// (app/public/script.js); the first match wins, Threads before Instagram in case Threads' User-Agent also says Instagram.
// Anything else, a load after an Escape included, is empty.
const IN_APP_BROWSERS = [
  [/Threads/i, 'threads'],
  [/Instagram/i, 'instagram'],
  [/FBAN|FBAV/i, 'facebook'],
  [/musical_ly|Bytedance|TikTok/i, 'tiktok'],
];
function inAppBrowser(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const found = IN_APP_BROWSERS.find(([pattern]) => pattern.test(userAgent));
  return found ? found[1] : '';
}

function createEventRecorder(gateway) {
  const record = (request, kind, profileId, linkId) =>
    gateway.createEvent({ kind, profile: profileId, link: linkId, country: visitorCountry(request), inAppBrowser: inAppBrowser(request) });
  return {
    recordPageView: (request, profileId) => record(request, 'page_view', profileId, ''),
    recordClick: (request, profileId, linkId) => record(request, 'click', profileId, linkId),
  };
}

module.exports = { createEventRecorder };
