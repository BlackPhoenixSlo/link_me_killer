import { expect, test, type APIRequestContext } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dnsAnswers } from './domains-helpers';
import {
  account, createOwnerlessProfile, ENV, EDITOR, fresh, heading, logIn, only, onLocalStack, operator, phoneContext, proxy, recordIds,
  superuserToken, verifiedCreator,
} from './helpers';

// Phase 6, tickets 4 to 7 (docs/spec/phase-06-sites-and-domains.md, § 3 Option 1): a Creator's own Custom Domain. One seam, the
// local stack at the baseURL: the `customDomains` rules and the check route over HTTP through the proxy, as the Editor calls them,
// and the Domain screen at /edit/domain through Playwright at 375px. The check asks only the fake DNS (tests/fake-dns.mjs), whose
// answers each test sets; ORIGIN_IPV4 and ORIGIN_IPV6 are tests/e2e.env's documentation addresses. Chromium maps `*.test` to
// loopback as in 05-domains, so a live domain's page is opened at its real `{domain}:4173` Host over plain HTTP.
const PORT = 4173; // the baseURL's port (playwright.config.ts)
const at = (host: string) => `http://${host}:${PORT}`;
// Read here, since helpers.ts's ENV takes names without digits.
const E2E_ENV = readFileSync(join(__dirname, '..', 'e2e.env'), 'utf8');
const setting = (name: string) => (new RegExp(`^${name}=(.*)$`, 'm').exec(E2E_ENV) || [])[1] || '';
const IPV4 = setting('ORIGIN_IPV4');
const IPV6 = setting('ORIGIN_IPV6');
const ELSEWHERE = '192.0.2.7'; // another server's address (RFC 5737)
const dns = (zone: Parameters<typeof dnsAnswers>[1]) => dnsAnswers(ENV.FAKE_DNS_PORT, zone);

test.use({ launchOptions: { args: ['--host-resolver-rules=MAP *.test 127.0.0.1 , MAP * ~NOTFOUND , EXCLUDE localhost'] } });
test.skip(!onLocalStack(), 'the fake DNS and the Operator steps need the local stack');

const tlsAsk = async (request: APIRequestContext, domain: string) => (await request.get('/internal/tls-ask', { params: { domain } })).status();
const domainCheck = (request: APIRequestContext, id: string, token?: string) =>
  request.post(`/api/domain-check/${id}`, { headers: token ? { Authorization: token } : {} });
// The record's token, as the Operator reads it.
const tokenOf = async (domain: string) => (await only(await superuserToken(), 'customDomains', `domain='${domain}'`)).token as string;

// Every record the check wants, right: TXT, A, and AAAA to ORIGIN_IPV6.
const pointedHere = (domain: string, token: string) => ({
  [domain]: { A: [IPV4], AAAA: [IPV6] },
  [`_oflink.${domain}`]: { TXT: [`oflink-verify=${token}`] },
});

test('the customDomains rules: the owner adds one for their own Profile and nothing else, never sets it live, and deletes it', async ({ request }) => {
  const owner = await verifiedCreator(request, [['Home card', '']]);
  const as = proxy(request, owner.token);
  const domain = `rules-${randomBytes(3).toString('hex')}.test`;
  for (const [field, value] of [['status', 'live'], ['token', 'a'.repeat(32)], ['checked', '2026-10-06 00:00:00.000Z'], ['id', 'abcdefghijklmno']]) {
    const res = await as.post('customDomains/records', { profile: owner.profileId, domain, [field]: value });
    expect(res.status(), `a create setting ${field}`).toBe(400);
  }
  const other = await verifiedCreator(request, []);
  expect((await proxy(request, other.token).post('customDomains/records', { profile: owner.profileId, domain })).status(), 'a create for another\'s Profile').toBe(400);
  const unverified = await account(request);
  const claimed = await proxy(request, unverified.token).post('profiles/records', { username: unverified.creator.username, owner: unverified.id, mode: 'escape_ig', slot: 1 });
  expect(claimed.status(), 'the unverified account\'s claim').toBe(200);
  // No verified email needed (ADR 0006). A name of its own only keeps it apart from the owner's record below: a pending domain
  // is not unique, the index covers live ones.
  expect((await proxy(request, unverified.token).post('customDomains/records', { profile: (await claimed.json()).id, domain: `unverified-${domain}` })).status(), 'an unverified account\'s create').toBe(200);

  const created = await as.post('customDomains/records', { profile: owner.profileId, domain });
  expect(created.status(), 'the owner\'s create').toBe(200);
  const record = await created.json();
  expect([record.status, /^[a-z0-9]{32}$/.test(record.token), record.checked], 'a new record: pending, a token, never checked').toEqual(['', true, '']);
  expect((await as.post('customDomains/records', { profile: owner.profileId, domain: `two-${domain}` })).status(), 'a second domain for one Profile').toBe(400);
  expect((await as.patch(`customDomains/records/${record.id}`, { status: 'live' })).status(), 'the owner setting it live').toBe(403);
  expect((await proxy(request, other.token).get(`customDomains/records/${record.id}`)).status(), 'another Creator\'s view').toBe(404);
  expect((await (await proxy(request).get('customDomains/records')).json()).items, 'the anonymous list').toEqual([]);
  expect((await proxy(request, other.token).delete(`customDomains/records/${record.id}`)).status(), 'another Creator\'s delete').toBe(404);
  expect((await as.delete(`customDomains/records/${record.id}`)).status(), 'the owner\'s delete').toBe(204);
});

test('the check route: each DNS problem, "taken", then live; the TLS Ask follows it, and jakabasej.test/ shows that Profile', async ({ browser, request }) => {
  test.setTimeout(90_000);
  const DOMAIN = 'jakabasej.test';
  const owner = await verifiedCreator(request, [['Domain card', '']]);
  const as = proxy(request, owner.token);
  const created = await as.post('customDomains/records', { profile: owner.profileId, domain: DOMAIN });
  expect(created.status(), `${DOMAIN} added`).toBe(200);
  const { id, token } = await created.json();
  const check = async (what: string) => {
    const res = await domainCheck(request, id, owner.token);
    expect(res.status(), `the check, ${what}`).toBe(200);
    return res.json();
  };

  expect((await domainCheck(request, id)).status(), 'the check without a token').toBe(401);
  const other = await verifiedCreator(request, []);
  expect((await domainCheck(request, id, other.token)).status(), 'another Creator\'s check').toBe(404);

  await dns({ [DOMAIN]: null, [`_oflink.${DOMAIN}`]: null });
  const nothing = await check('with no records');
  expect(nothing, 'the answer with no records').toEqual({
    status: 'pending',
    problems: [`No TXT record _oflink.${DOMAIN} yet.`, `No A record for ${DOMAIN} yet.`],
    records: [
      { type: 'A', name: '@', value: IPV4 },
      { type: 'AAAA', name: '@', value: IPV6 },
      { type: 'TXT', name: '_oflink', value: `oflink-verify=${token}` },
    ],
  });

  await dns({ ...pointedHere(DOMAIN, token), [DOMAIN]: { A: [ELSEWHERE] } });
  expect((await check('A elsewhere')).problems, 'with A elsewhere').toEqual([`${DOMAIN} points to ${ELSEWHERE}, not ${IPV4}.`]);
  await dns({ ...pointedHere(DOMAIN, token), [DOMAIN]: { A: [IPV4], AAAA: [IPV6, '2001:db8::1'] } });
  expect((await check('an extra AAAA')).problems, 'with an extra AAAA').toEqual(['Delete the AAAA record 2001:db8::1.']);
  await dns({ ...pointedHere(DOMAIN, token), [DOMAIN]: { A: [IPV4], CAA: [{ tag: 'issue', value: 'pki.goog' }] } });
  expect((await check('a refusing CAA')).problems, 'with a CAA for another CA').toEqual([`A CAA record for ${DOMAIN} does not allow letsencrypt.org. Add one that does, or delete it.`]);
  await dns({ ...pointedHere(DOMAIN, token), [`_oflink.${DOMAIN}`]: { TXT: ['oflink-verify=someone-else'] } });
  expect((await check('another TXT')).problems, 'with another token').toEqual([`The TXT record _oflink.${DOMAIN} does not hold oflink-verify=${token} yet.`]);

  // Taken: the Operator has the same domain live on another Profile, so every check passes and the live write clashes.
  const holder = fresh().username;
  await createOwnerlessProfile(holder, 'Holder Profile', { title: 'Holder card', destination: 'https://example.com/domains-holder' });
  const holderId = (await recordIds(holder)).profileId;
  expect(await operator('POST', '/api/collections/customDomains/records', { profile: holderId, domain: DOMAIN, status: 'live' }), `${DOMAIN} live on ${holder}`).toBe(200);
  await dns(pointedHere(DOMAIN, token));
  try {
    expect(await check('taken'), 'the answer while another Profile has it live').toMatchObject({ status: 'pending', problems: [`Another Profile already uses ${DOMAIN}.`] });
  } finally {
    expect(await operator('DELETE', `/api/collections/profiles/records/${holderId}`), `${holder} deleted, its domain with it`).toBe(204);
  }

  expect(await tlsAsk(request, DOMAIN), `the TLS Ask for the pending ${DOMAIN}`).toBe(404);
  expect(await check('every record right'), 'the answer once every record is right').toMatchObject({ status: 'live', problems: [] });
  const stored = await only(await superuserToken(), 'customDomains', `domain='${DOMAIN}'`);
  expect([stored.status, stored.checked !== ''], 'stored live, with the time of the check').toEqual(['live', true]);
  expect(await tlsAsk(request, DOMAIN), `the TLS Ask for the live ${DOMAIN}`).toBe(200);
  expect((await check('when live')).status, 'a live domain stays live').toBe('live');

  const context = await phoneContext(browser, { origin: at(DOMAIN) });
  const visitor = await context.newPage();
  await visitor.goto(`${at(DOMAIN)}/`);
  await expect(visitor.locator('#displayName'), `the display name on ${DOMAIN}/`).toHaveText('Before Name');
  await expect(visitor.locator('.link-card .link-title'), `the Link cards on ${DOMAIN}/`).toHaveText(['Domain card']);
  await context.close();

  expect((await as.delete(`customDomains/records/${id}`)).status(), `${DOMAIN} removed by its Creator`).toBe(204);
  expect(await tlsAsk(request, DOMAIN), `the TLS Ask for ${DOMAIN} once removed`).toBe(404);
});

test('the check route: ofl.ink\'s own hosts and Spare Domains, and names under them, never go live', async ({ request }) => {
  const SPARE = `spare-${randomBytes(3).toString('hex')}.test`;
  expect(await operator('POST', '/api/collections/spareDomains/records', { domain: SPARE }), `the Spare Domain ${SPARE}`).toBe(200);
  const owner = await verifiedCreator(request, []);
  const as = proxy(request, owner.token);
  try {
    for (const domain of [SPARE, `www.${SPARE}`, 'www.localhost']) {
      const created = await as.post('customDomains/records', { profile: owner.profileId, domain });
      expect(created.status(), `${domain} added`).toBe(200);
      const { id, token } = await created.json();
      await dns(pointedHere(domain, token));
      const res = await domainCheck(request, id, owner.token);
      expect(await res.json(), `the check for ${domain}`).toMatchObject({ status: 'pending', problems: [`${domain} is one of ofl.ink's own addresses. Use a domain you own.`] });
      expect((await as.delete(`customDomains/records/${id}`)).status(), `${domain} removed`).toBe(204);
    }
  } finally {
    const spare = await only(await superuserToken(), 'spareDomains', `domain='${SPARE}'`);
    expect(await operator('DELETE', `/api/collections/spareDomains/records/${spare.id}`), `the Spare Domain ${SPARE} removed`).toBe(204);
  }
});

test.describe('the Domain screen at 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('add a domain, see its records, Check now says what is missing, then live; the Bio Link shows it; Remove asks first and undoes it', async ({ page, request, baseURL }) => {
    test.setTimeout(90_000);
    const owner = await verifiedCreator(request, [['Screen card', '']]);
    const domain = `site-${randomBytes(3).toString('hex')}.test`;
    await logIn(page, owner.creator);
    await expect(heading(page, EDITOR)).toBeVisible();

    await page.goto('/edit/domain');
    await expect(heading(page, 'Use your own domain')).toBeVisible();
    await page.getByLabel('Domain').fill(` ${domain.toUpperCase()} `);
    await page.getByRole('button', { name: 'Add domain' }).click();
    await expect(page.getByRole('heading', { name: `Point ${domain} here` })).toBeVisible();
    const token = await tokenOf(domain);
    await expect(page.getByRole('table').getByRole('row'), 'the records to set').toHaveText([
      /^Type\s*Name\s*Value$/, `A@${IPV4}`, `AAAA@${IPV6}`, `TXT_oflinkoflink-verify=${token}`,
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), 'no sideways scroll at 375px').toBeLessThanOrEqual(375);

    await dns({ [domain]: null, [`_oflink.${domain}`]: null });
    await page.getByRole('button', { name: 'Check now' }).click();
    await expect(page.getByRole('status')).toHaveText(`Not yet: No TXT record _oflink.${domain} yet. No A record for ${domain} yet.`);
    await dns({ ...pointedHere(domain, token), [domain]: { A: [ELSEWHERE] } });
    await page.getByRole('button', { name: 'Check now' }).click();
    await expect(page.getByRole('status')).toHaveText(`Not yet: ${domain} points to ${ELSEWHERE}, not ${IPV4}.`);

    await dns(pointedHere(domain, token));
    await page.getByRole('button', { name: 'Check now' }).click();
    await expect(page.getByRole('heading', { name: `${domain} is live` })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open' })).toHaveAttribute('href', `https://${domain}/`);
    expect(await tlsAsk(request, domain), `the TLS Ask for ${domain}`).toBe(200);

    await page.getByRole('navigation', { name: 'Creator' }).getByRole('link', { name: 'Editor' }).click();
    await expect(heading(page, EDITOR)).toBeVisible();
    await expect(page.locator('[data-test="bio-link-value"]'), 'the Bio Link once live').toHaveText(`https://${domain}/`);

    await page.goto('/edit/domain');
    await expect(page.getByRole('heading', { name: `${domain} is live` })).toBeVisible();
    await page.getByRole('button', { name: 'Remove domain' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByRole('heading', { name: `Remove ${domain}?` })).toBeVisible();
    await expect(dialog).toContainText('Visitors on it will stop seeing this Profile.');
    await dialog.getByRole('button', { name: 'Keep it' }).click();
    await expect(dialog).toBeHidden();
    expect(await tlsAsk(request, domain), `the TLS Ask for ${domain} after "Keep it"`).toBe(200);
    await page.getByRole('button', { name: 'Remove domain' }).click();
    await dialog.getByRole('button', { name: 'Remove domain' }).click();
    await expect(heading(page, 'Use your own domain')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText(`${domain} is removed.`);
    await expect(page.getByLabel('Domain')).toBeVisible();
    expect(await tlsAsk(request, domain), `the TLS Ask for ${domain} once removed`).toBe(404);

    await page.getByRole('navigation', { name: 'Creator' }).getByRole('link', { name: 'Editor' }).click();
    await expect(page.locator('[data-test="bio-link-value"]'), 'the Bio Link once removed').toHaveText(`${baseURL}/${owner.creator.username}`);
  });
});
