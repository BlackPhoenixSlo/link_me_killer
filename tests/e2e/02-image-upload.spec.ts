import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// Ticket 21 (spec, Testing Decisions, 02-image-upload; Upload (D4); Contracts, `POST /api/upload/…`): a photo sent to the
// upload endpoint comes back upright, resized and stripped, as WebP, and every refusal leaves the record unchanged.
// The spec arranges a throwaway Profile and Link of its own through PocketBase's REST API on its loopback port and deletes
// them (and its plain users record) in afterAll, so it is safe beside the other specs of the chromium project.
// The committed fixtures sit in tests/images/ (made by tests/images/make-fixtures.mjs), not under tests/fixtures/, whose
// exact file list Phase 0 pins.
// ASSUMPTION: the happy-path caller is a superuser token from PocketBase's REST API, because in Phase 2 PocketBase's rules are
// superuser-only and "only a superuser token gets past PocketBase's rules" (rung 2: spec, Further Notes, Who can upload in
// Phase 2). The refusals use no token, a malformed token, and a plain users record's token. Overturned by Phase 3's owner
// rules; a Creator's token then joins the happy path.
// ASSUMPTION: the v1 Import's PNG-avatar case lives here, not in 02-v1-import's stack block, because it proves this ticket's
// pipeline and needs only its own throwaway Profile, which is deleted before the stack-import project counts stale Profiles
// (rung 5: no ordering change). Overturned if the import case must sit with the other import checks.
const ROOT = join(__dirname, '..', '..');
const IMAGES = join(ROOT, 'tests', 'images');
const PNG_TREE = join(ROOT, 'tests', 'v1-png-avatar');

// Is the stack under test the local test stack that tests/stack.sh starts? The same predicate, by the same name, in
// 02-v1-import, 02-profile-parity and 02-live-edit.
const onLocalStack = () => !process.env.PLAYWRIGHT_BASE_URL || new URL(process.env.PLAYWRIGHT_BASE_URL).origin === 'http://localhost:4173';

const ENV: Record<string, string> = Object.fromEntries(
  readFileSync(join(ROOT, 'tests', 'e2e.env'), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const PB = `http://127.0.0.1:${ENV.PB_PORT}`;
const pb = (pathname: string, { token, ...init }: RequestInit & { token?: string } = {}) =>
  fetch(PB + pathname, { ...init, headers: { ...(init.headers as Record<string, string>), ...(token ? { Authorization: token } : {}) } });
const send = (method: string, body: object) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

// The HEIC case waits for heic-convert: sharp's prebuilt libvips in the app image cannot decode HEVC-coded HEIC (observed for
// this ticket with the committed fixture). The fixme comes off with the pipeline change that decodes HEIC through it.
const HEIC_REASON =
  'sharp alone cannot decode HEVC-coded HEIC in the app image: "heif: Error while loading plugin: Support for this compression ' +
  'format has not been built in: HEVC (a suitable decoder plugin is libde265) (11.6003)". Parked network command: ' +
  'pnpm --dir app add heic-convert && docker compose --env-file tests/e2e.env build';

const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', txt: 'text/plain' };
const fixture = (name: string) => ({ name, mimeType: MIME[name.split('.').pop()!], buffer: readFileSync(join(IMAGES, name)) });

const isWebp = (b: Buffer) => b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP';
// The RIFF chunk names of a WebP file, in order.
const chunks = (b: Buffer) => {
  const names: string[] = [];
  for (let i = 12; i + 8 <= b.length; ) {
    const size = b.readUInt32LE(i + 4);
    names.push(b.toString('latin1', i, i + 4));
    i += 8 + size + (size & 1);
  }
  return names;
};

test.describe('image upload', () => {
  test.skip(!onLocalStack(), 'the stack under test is not the local test stack');

  let token: string;
  let usersToken: string;
  let usersId = '';
  let profileId = '';
  let linkId = '';
  const username = `upload_${randomBytes(4).toString('hex')}`;

  test.beforeAll(async () => {
    const auth = await pb('/api/collections/_superusers/auth-with-password', send('POST', { identity: ENV.PB_SUPERUSER_EMAIL, password: ENV.PB_SUPERUSER_PASSWORD }));
    expect(auth.status).toBe(200);
    token = (await auth.json()).token;
    const profile = await pb('/api/collections/profiles/records', { ...send('POST', { username, displayName: 'Upload Check', bio: 'throwaway' }), token });
    expect(profile.status).toBe(200);
    profileId = (await profile.json()).id;
    const link = await pb('/api/collections/links/records', { ...send('POST', { profile: profileId, title: 'Upload Link', order: 0, destination: `https://example.com/${username}` }), token });
    expect(link.status).toBe(200);
    linkId = (await link.json()).id;
    // A plain users record, made through the superuser API, and its own token.
    const email = `${username}@example.com`;
    const password = `pw-${randomBytes(8).toString('hex')}`;
    const user = await pb('/api/collections/users/records', { ...send('POST', { email, password, passwordConfirm: password }), token });
    expect(user.status).toBe(200);
    usersId = (await user.json()).id;
    const signIn = await pb('/api/collections/users/auth-with-password', send('POST', { identity: email, password }));
    expect(signIn.status).toBe(200);
    usersToken = (await signIn.json()).token;
  });
  test.afterAll(async () => {
    // Even after a failure: the Profile goes, and its Link with it (cascade delete), and so does the users record.
    if (profileId) await pb(`/api/collections/profiles/records/${profileId}`, { method: 'DELETE', token });
    if (usersId) await pb(`/api/collections/users/records/${usersId}`, { method: 'DELETE', token });
  });

  const target = (field: 'avatar' | 'icon' | 'backgroundImage') => (field === 'avatar' ? `profiles/${profileId}/avatar` : `links/${linkId}/${field}`);
  const upload = (request: APIRequestContext, to: string, file: { name: string; mimeType: string; buffer: Buffer }, auth?: string) =>
    request.post(`/api/upload/${to}`, { headers: auth === undefined ? {} : { Authorization: auth }, multipart: { file } });
  // Uploads with the superuser's token and answers the returned URL.
  const uploaded = async (request: APIRequestContext, to: string, name: string) => {
    const res = await upload(request, to, fixture(name), token);
    expect(res.status(), name).toBe(200);
    const { url } = await res.json();
    expect(url.startsWith(`/api/files/${to.split('/').slice(0, 2).join('/')}/`), name).toBe(true);
    return url as string;
  };
  const bytes = async (request: APIRequestContext, url: string) => {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    return Buffer.from(await res.body());
  };
  const served = async (request: APIRequestContext) => {
    const res = await request.get(`/api/profiles/${username}.json`);
    expect(res.status()).toBe(200);
    return (await res.json()) as { profile: { avatarUrl: string }; links: { icon: string; backgroundImage: string }[] };
  };
  // The image as the browser decodes it: natural size, and the RGBA of a few pixels, read on a same-origin page.
  const decoded = async (page: Page, url: string) => {
    if (!page.url().endsWith('/landing.html')) await page.goto('/landing.html');
    return page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const at = (x: number, y: number) => Array.from(ctx.getImageData(Math.floor(x * img.naturalWidth), Math.floor(y * img.naturalHeight), 1, 1).data);
      return { width: img.naturalWidth, height: img.naturalHeight, center: at(0.5, 0.5), left: at(0.2, 0.5), right: at(0.8, 0.5) };
    }, url);
  };
  // The record's current file name, read through the superuser API.
  const current = async (collection: string, id: string, field: string) => (await (await pb(`/api/collections/${collection}/records/${id}`, { token })).json())[field] as string;

  for (const format of ['jpg', 'png', 'gif', 'webp', 'heic']) {
    test(`a ${format.toUpperCase()} photo comes back as WebP, from the returned URL and from the Profile JSON, not enlarged`, async ({ page, request }) => {
      test.fixme(format === 'heic', HEIC_REASON);
      const url = await uploaded(request, target('avatar'), `photo.${format}`);
      expect(isWebp(await bytes(request, url))).toBe(true);
      const fromJson = (await served(request)).profile.avatarUrl;
      expect(fromJson).toBe(url);
      expect(isWebp(await bytes(request, fromJson))).toBe(true);
      const image = await decoded(page, url);
      expect([image.width, image.height]).toEqual([64, 48]); // the 64x48 source, not enlarged to 512
      if (format === 'png') {
        // The PNG's right half is transparent: the WebP keeps it.
        expect(image.left[3]).toBeGreaterThan(245);
        expect(image.right[3]).toBeLessThan(10);
      }
      if (format === 'gif') {
        // Frame 1 is red, frame 2 blue: a still WebP of the first frame.
        expect(chunks(await bytes(request, url))).not.toContain('ANIM');
        const [r, g, b] = image.center;
        expect(r > 180 && g < 80 && b < 80, `first-frame red, got ${[r, g, b]}`).toBe(true);
      }
    });
  }

  test('a 3000x2000 background comes back at 1080x720, a 2000x2000 avatar and icon at 512x512', async ({ page, request }) => {
    const background = await uploaded(request, target('backgroundImage'), 'background-3000x2000.gif');
    const avatar = await uploaded(request, target('avatar'), 'avatar-2000x2000.gif');
    const icon = await uploaded(request, target('icon'), 'avatar-2000x2000.gif');
    const json = await served(request);
    expect([json.links[0].backgroundImage, json.profile.avatarUrl, json.links[0].icon]).toEqual([background, avatar, icon]);
    for (const url of [background, avatar, icon]) expect(isWebp(await bytes(request, url))).toBe(true);
    const sizes = [];
    for (const url of [background, avatar, icon]) {
      const { width, height } = await decoded(page, url);
      sizes.push([width, height]);
    }
    expect(sizes).toEqual([[1080, 720], [512, 512], [512, 512]]);
  });

  test('a JPEG tagged with EXIF orientation 6 comes back upright, its sides swapped', async ({ page, request }) => {
    const url = await uploaded(request, target('avatar'), 'orientation-6.jpg');
    const { width, height } = await decoded(page, url);
    expect([width, height]).toEqual([48, 64]); // stored 64x48
  });

  test('a JPEG carrying GPS and camera tags comes back with no EXIF or XMP chunk', async ({ request }) => {
    const source = fixture('gps-camera.jpg').buffer;
    expect(source.includes('Exif\0\0') && source.includes('FixtureCam') && source.includes('http://ns.adobe.com/xap/1.0/\0')).toBe(true);
    const webp = await bytes(request, await uploaded(request, target('avatar'), 'gps-camera.jpg'));
    expect(isWebp(webp)).toBe(true);
    const names = chunks(webp);
    expect(names.includes('EXIF') || names.includes('XMP ')).toBe(false);
    expect(webp.includes('FixtureCam')).toBe(false);
  });

  test('after a replacement the old file\'s URL answers 404 and the new one carries the immutable cache header', async ({ request }) => {
    const old = await uploaded(request, target('avatar'), 'photo.jpg');
    const replacement = await uploaded(request, target('avatar'), 'photo.webp');
    expect(replacement).not.toBe(old);
    expect((await request.get(old)).status()).toBe(404);
    const res = await request.get(replacement);
    expect(res.status()).toBe(200);
    expect(res.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  test.describe('refusals leave the record unchanged', () => {
    // The avatar each refusal must leave in place, uploaded once per worker (the request fixture is per test, so not in beforeAll).
    let before = '';
    let beforeUrl = '';
    test.beforeEach(async ({ request }) => {
      if (before) return;
      beforeUrl = await uploaded(request, target('avatar'), 'photo.png');
      before = await current('profiles', profileId, 'avatar');
      expect(before).not.toBe('');
    });
    const unchanged = async (request: APIRequestContext) => {
      expect(await current('profiles', profileId, 'avatar')).toBe(before);
      expect((await request.get(beforeUrl)).status()).toBe(200);
      expect((await served(request)).profile.avatarUrl).toBe(beforeUrl);
    };

    test('no token: 401', async ({ request }) => {
      expect((await upload(request, target('avatar'), fixture('photo.jpg'))).status()).toBe(401);
      await unchanged(request);
    });

    test('a malformed token and a plain users record\'s token: 401, or PocketBase\'s own 403 or 404', async ({ request }) => {
      for (const [name, auth] of [['malformed', 'not-a-token'], ['users record', usersToken]]) {
        const status = (await upload(request, target('avatar'), fixture('photo.jpg'), auth)).status();
        expect([401, 403, 404], name).toContain(status);
        // The token is checked before anything is decoded: a text file meets the same refusal, not 415.
        expect((await upload(request, target('avatar'), fixture('not-an-image.txt'), auth)).status(), `${name}, text file`).toBe(status);
      }
      // The users token on the Link targets too, which keep their files.
      for (const field of ['icon', 'backgroundImage'] as const) {
        const linkBefore = await current('links', linkId, field);
        expect([401, 403, 404], field).toContain((await upload(request, target(field), fixture('photo.jpg'), usersToken)).status());
        expect(await current('links', linkId, field), field).toBe(linkBefore);
      }
      await unchanged(request);
    });

    test('a target not in the list: 404', async ({ request }) => {
      for (const to of [`profiles/${profileId}/bio`, `links/${linkId}/avatar`, `profiles/${profileId}/icon`, `users/${usersId}/avatar`, `events/${profileId}/avatar`]) {
        expect((await upload(request, to, fixture('photo.jpg'), token)).status(), to).toBe(404);
      }
      await unchanged(request);
    });

    test('over 20 MB: 413', async ({ request }) => {
      const big = Buffer.alloc(20 * 1024 * 1024 + 1024);
      fixture('photo.jpg').buffer.copy(big);
      expect((await upload(request, target('avatar'), { name: 'big.jpg', mimeType: 'image/jpeg', buffer: big }, token)).status()).toBe(413);
      await unchanged(request);
    });

    test('a text file, and an image over the decoder\'s default pixel limit: 415', async ({ request }) => {
      expect((await upload(request, target('avatar'), fixture('not-an-image.txt'), token)).status()).toBe(415);
      // A PNG whose header claims 20000x20000 pixels, over sharp's default limit of 16383x16383; made here, never committed.
      const crcTable = Array.from({ length: 256 }, (_, n) => {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        return c >>> 0;
      });
      const crc = (b: Buffer) => {
        let c = 0xffffffff;
        for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8);
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
      ihdr.writeUInt32BE(20000, 0);
      ihdr.writeUInt32BE(20000, 4);
      ihdr[8] = 1; // 1-bit greyscale
      const huge = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.alloc(2501 * 4))), chunk('IEND', Buffer.alloc(0))]);
      expect((await upload(request, target('avatar'), { name: 'huge.png', mimeType: 'image/png', buffer: huge }, token)).status()).toBe(415);
      await unchanged(request);
    });

    test('PocketBase itself refuses a PNG written straight into a file field', async ({ request }) => {
      const form = new FormData();
      form.append('avatar', new Blob([fixture('photo.png').buffer], { type: 'image/png' }), 'photo.png');
      const res = await pb(`/api/collections/profiles/records/${profileId}`, { method: 'PATCH', body: form, token });
      expect(res.status).toBe(400);
      await unchanged(request);
    });
  });

  test('a v1-shaped tree whose avatar is a PNG imports with a WebP avatar at 512 px', async ({ page, request }) => {
    test.setTimeout(120_000);
    const r = spawnSync(
      'docker',
      ['compose', '--env-file', 'tests/e2e.env', 'run', '--rm',
        '-v', `${join(PNG_TREE, 'api')}:/site/api:ro`, '-v', `${join(PNG_TREE, 'netlify')}:/site/netlify:ro`, '-v', `${join(PNG_TREE, 'images')}:/site/images:ro`,
        'app', 'import-v1', '--site', '/site'],
      { cwd: ROOT, encoding: 'utf8' },
    );
    const [imported] = (await (await pb(`/api/collections/profiles/records?filter=${encodeURIComponent("username='pngavatarcheck'")}`, { token })).json()).items;
    try {
      expect(r.status, `${r.stdout}${r.stderr}`.split('\n').filter((l) => /^(invalid v1 file|write failed|imported):/.test(l)).join('\n')).toBe(0);
      const res = await request.get('/api/profiles/pngavatarcheck.json');
      expect(res.status()).toBe(200);
      const { avatarUrl } = (await res.json()).profile;
      expect(avatarUrl.startsWith('/api/files/profiles/')).toBe(true);
      expect(isWebp(await bytes(request, avatarUrl))).toBe(true);
      const { width, height } = await decoded(page, avatarUrl);
      expect([width, height]).toEqual([512, 384]); // the 800x600 PNG, longest side 512
    } finally {
      // The throwaway Profile goes (its Link with it), so the stack-import project's stale counts never see it.
      if (imported) await pb(`/api/collections/profiles/records/${imported.id}`, { method: 'DELETE', token });
    }
  });
});
