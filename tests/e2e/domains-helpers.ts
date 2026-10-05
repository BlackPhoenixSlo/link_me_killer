// Phase 5 test plumbing that is not itself a test (Playwright's default testMatch skips it): kept apart from tests/e2e/helpers.ts,
// which holds Phase 3's plumbing and the drivers that more than one spec of Phases 1-4 shares.

// A Profile page as the app serves it from ticket 39 on (app/server.js, the Profile page bootstrap) is the Page Copy's index.html
// with one JSON block before its script tag. This is the answer without that block, to compare with the Page Copy; 05-domains
// reads the block itself.
const BOOTSTRAP = /<script type="application\/json" id="profile-bootstrap">.*?<\/script>\n {4}/s;
export const withoutBootstrap = (body: string) => body.replace(BOOTSTRAP, '');
