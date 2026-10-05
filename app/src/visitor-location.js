'use strict';
// Visitor location (docs/spec/phase-02-vps-foundation.md, Contracts): country and US state from the request headers, v1's names
// first (geo_utils.js:48-49), then Cloudflare's (plan §11's country source); the country falls back to US as v1's does.
// `headers` maps lower-cased header names to values.
function visitorLocation(headers) {
  return {
    country: headers['x-country'] || headers['cf-ipcountry'] || 'US',
    region: headers['x-nf-subdivision-code'] || headers['x-region'] || headers['cf-region-code'] || '',
  };
}

module.exports = { visitorLocation };
