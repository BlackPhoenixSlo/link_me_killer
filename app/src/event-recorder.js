'use strict';
// Event Recorder (docs/spec/phase-04-stats.md, Interfaces): one Event per call, a Page View or a Click, written through the
// gateway's superuser access. An Event holds its kind, Profile, Link, the Visitor's country and In-App Browser, and PocketBase's
// created time; no IP address, User-Agent string, referrer or Visitor identifier is stored.
// Write path (spec, Write path; ticket 36): a call waits at most WRITE_WAIT_MS for its write and never throws, so a failing or
// stalled Event store costs a Visitor no Click and at most that wait. A failed write is logged and swallowed; a write still
// pending at the bound is left to finish, and only its outcome is logged. Each log line is fixed text: an error can carry a
// PocketBase answer, and no Event field is logged.
const WRITE_WAIT_MS = 300;

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

// Resolves once `write` settles or WRITE_WAIT_MS has passed, whichever comes first; never rejects.
function bounded(write) {
  let late = false;
  const logged = write.then(
    () => { if (late) console.log(`Event written after the ${WRITE_WAIT_MS} ms wait`); },
    () => console.error(late ? `Event write failed after the ${WRITE_WAIT_MS} ms wait` : 'Event write failed'),
  );
  let timer;
  const waited = new Promise((resolve) => {
    timer = setTimeout(() => { late = true; resolve(); }, WRITE_WAIT_MS);
  });
  return Promise.race([logged, waited]).finally(() => clearTimeout(timer));
}

function createEventRecorder(gateway) {
  const record = (request, kind, profileId, linkId) =>
    bounded(gateway.createEvent({ kind, profile: profileId, link: linkId, country: visitorCountry(request), inAppBrowser: inAppBrowser(request) }));
  return {
    recordPageView: (request, profileId) => record(request, 'page_view', profileId, ''),
    recordClick: (request, profileId, linkId) => record(request, 'click', profileId, linkId),
  };
}

module.exports = { createEventRecorder };
