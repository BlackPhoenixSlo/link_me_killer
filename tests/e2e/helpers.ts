import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// Plumbing for tests/e2e/03-auth-and-editor.spec.ts that is not itself a test: the Operator step and an in-memory PNG. Not a
// spec file (Playwright's default testMatch skips it), so the Phase 3 suite stays one spec (docs/spec/phase-03-auth-and-editor.md,
// Testing Decisions).
// ASSUMPTION: a helper module beside the spec rather than more lines in it, though every other spec keeps its own plumbing
// (rung 5: the one spec file stays under 1000 lines without dropping a test). Overturned if helpers must live in the spec.
const ROOT = join(__dirname, '..', '..');

// Is the stack under test the local test stack that tests/stack.sh starts? The same predicate as the 02 specs: the Operator
// step needs PocketBase's loopback port, which only that stack publishes.
export const onLocalStack = () => !process.env.PLAYWRIGHT_BASE_URL || new URL(process.env.PLAYWRIGHT_BASE_URL).origin === 'http://localhost:4173';
const ENV: Record<string, string> = Object.fromEntries(
  readFileSync(join(ROOT, 'tests', 'e2e.env'), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const PB = `http://127.0.0.1:${ENV.PB_PORT}`;
async function superuserToken() {
  const res = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identity: ENV.PB_SUPERUSER_EMAIL, password: ENV.PB_SUPERUSER_PASSWORD }),
  });
  expect(res.status).toBe(200);
  return (await res.json()).token as string;
}
const asSuperuser = async (token: string, path: string, init: RequestInit = {}) =>
  fetch(PB + path, { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: token } });

// The Operator step: a superuser marks the account verified, as the Operator would in the admin UI.
export async function markVerified(email: string) {
  const token = await superuserToken();
  const found = await (await asSuperuser(token, `/api/collections/users/records?filter=${encodeURIComponent(`email='${email}'`)}`)).json();
  expect(found.items.length).toBe(1);
  const res = await asSuperuser(token, `/api/collections/users/records/${found.items[0].id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ verified: true }),
  });
  expect(res.status).toBe(200);
}

// An in-memory PNG of one colour (spec, Testing Decisions, Images): no fixture file, and proof a non-webp input comes out webp.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function png(width: number, height: number, [r, g, b]: [number, number, number]) {
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const x of buf) c = CRC_TABLE[(c ^ x) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
export const pngFile = (name: string, colour: [number, number, number]) => ({ name, mimeType: 'image/png', buffer: png(600, 400, colour) });
export const isWebp = (b: Buffer) => b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP';
