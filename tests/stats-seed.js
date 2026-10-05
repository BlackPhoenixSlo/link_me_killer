'use strict';
// Phase 4's seed (docs/spec/phase-04-stats.md, Seed): the Stats Creator and the Other Creator, each verified, named and with one
// Profile on the default Profile Mode holding a Direct Mode Link and an Adult Link with no Mode of its own (Tracking on, no Geo
// Rule, no default Tracking Code). Every Destination is on a `.test` host (RFC 6761), which tests/e2e/04-stats.spec.ts stubs.
// Only that spec visits these two Profiles. Their passwords are the test stack's (tests/e2e.env), read by name.
// ASSUMPTION: one module holds the seed's data for both tests/stack.sh, which runs it, and the spec, which imports it, so the
// Usernames, titles and Destinations have one source (rung 5: one file rather than the same literals in two). Overturned if
// the seed must live inline in tests/stack.sh like its mail step; the spec then keeps its own copy of these values.
const CREATORS = {
  stats: {
    email: 'stats-creator@example.com',
    passwordVar: 'STATS_CREATOR_PASSWORD',
    username: 'stats_profile',
    displayName: 'Stats Profile',
    direct: { title: 'Stats Direct', destination: 'https://stats-direct.test/' },
    adult: { title: 'Stats Adult', destination: 'https://stats-adult.test/' },
  },
  other: {
    email: 'other-creator@example.com',
    passwordVar: 'OTHER_CREATOR_PASSWORD',
    username: 'other_profile',
    displayName: 'Other Profile',
    direct: { title: 'Other Direct', destination: 'https://other-direct.test/' },
    adult: { title: 'Other Adult', destination: 'https://other-adult.test/' },
  },
};

// Run by tests/stack.sh (`node --env-file=tests/e2e.env tests/stats-seed.js`): a superuser at PocketBase's loopback port writes
// each Creator verified, then their Profile in slot 1 with Escape Mode as its default Mode as the Editor's claim writes it, then
// its Links.
// Prints one line, which holds no Destination.
async function seed() {
  const { PB_PORT, PB_SUPERUSER_EMAIL: identity, PB_SUPERUSER_PASSWORD: superuserPassword } = process.env;
  const pb = async (path, body, token = '') => {
    const res = await fetch(`http://127.0.0.1:${PB_PORT}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: token },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  };
  const { token } = await pb('/api/collections/_superusers/auth-with-password', { identity, password: superuserPassword });
  for (const c of Object.values(CREATORS)) {
    const password = process.env[c.passwordVar];
    if (!password) throw new Error(`${c.passwordVar} is not set`);
    const user = await pb('/api/collections/users/records', { email: c.email, password, passwordConfirm: password, verified: true }, token);
    const profile = await pb('/api/collections/profiles/records', { username: c.username, displayName: c.displayName, mode: 'escape_ig', owner: user.id, slot: 1 }, token);
    await pb('/api/collections/links/records', { profile: profile.id, order: 0, ...c.direct, mode: 'direct' }, token);
    await pb('/api/collections/links/records', { profile: profile.id, order: 1, ...c.adult, isAdult: true, tracking: true }, token);
  }
  console.log(`Phase 4 seed: ${Object.values(CREATORS).map((c) => c.username).join(', ')}`);
}

if (require.main === module) seed().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

module.exports = { CREATORS };
