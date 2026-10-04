import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Ticket 01: apart from Profiles and the Reveal, the stand-in serves only the Page Copy (app/public).
// Bodies are compared as booleans so a failure never prints a body.
const pageCopy = (file: string) => readFileSync(join(__dirname, '..', '..', 'app', 'public', file));

const NOT_SERVED = [
  '/netlify/functions/secrets.json',
  '/linkme_clone3/netlify/functions/secrets.json',
  '/..%2f..%2flinkme_clone3/netlify/functions/secrets.json',
  '/README.md',
  '/images/face.webp', // a Creator photo: v1 Snapshot only
];

for (const path of NOT_SERVED) {
  test(`${path} falls back to the Page Copy index`, async ({ request }) => {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    expect((await res.body()).equals(pageCopy('index.html'))).toBe(true);
  });
}

test('/script.js is served from the Page Copy', async ({ request }) => {
  const res = await request.get('/script.js');
  expect(res.status()).toBe(200);
  expect((await res.body()).equals(pageCopy('script.js'))).toBe(true);
});
