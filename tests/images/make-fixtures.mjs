// Writes the upload spec's image fixtures into this directory (and tests/v1-png-avatar/images/avatar.png), offline and with no new tool or package
// (docs/spec/phase-02-vps-foundation.md, Testing Decisions, 02-image-upload: Fixtures). Run on the Mac: node tests/images/make-fixtures.mjs
// - Node (no package) writes plain source PNGs into a temporary directory.
// - This Mac's `sips` turns them into the JPEG, PNG, GIF and HEIC fixtures.
// - `sips` cannot write an animation, an orientation tag or GPS tags, so Node splices two sips GIF frames into one
//   animated GIF and writes the EXIF (and XMP) blocks into sips JPEGs.
// - Chromium's canvas, through the Playwright already installed for the suite, writes the WebP fixture.
// The large images are flat-colour GIFs, which compress to a few KB.
// ASSUMPTION: the animated GIF is two sips GIFs (a red and a blue frame) spliced into one file by this script, since sips writes
// one frame only (rung 5: sips still encodes every frame; the splice adds only the loop and frame-delay blocks). Overturned
// if the fixture must come out of one tool unchanged.
// ASSUMPTION: the 3000x2000 and 2000x2000 images are flat-colour GIFs, the smallest of sips's outputs for them (observed:
// 4.7 KB and 3.8 KB, against 95 KB as JPEG and 57 KB as PNG) (rung 5). Overturned if the size cases must use a photo format.
// ASSUMPTION: the fixtures live in tests/images/, beside tests/v1-broken/, not under tests/fixtures/, whose exact file list
// Phase 0 pins (rung 3: tests/e2e/02-v1-import.spec.ts, BROKEN). Overturned if Phase 0's list makes room for them.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { chromium } from '@playwright/test';

const OUT = dirname(fileURLToPath(import.meta.url));
const TMP = mkdtempSync(join(tmpdir(), 'upload-fixtures-'));

// --- PNG, written by hand -----------------------------------------------------------------------------------------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const x of buf) c = CRC_TABLE[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const pngChunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
// pixel(x, y) returns [r, g, b, a]; alpha decides RGBA (colour type 6) or RGB (colour type 2).
function png(width, height, pixel, alpha = false) {
  const channels = alpha ? 4 : 3;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = alpha ? 6 : 2;
  const row = width * channels + 1;
  const raw = Buffer.alloc(row * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = pixel(x, y);
      for (let ch = 0; ch < channels; ch++) raw[y * row + 1 + x * channels + ch] = p[ch];
    }
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(raw, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}

const source = (name, buf) => {
  const file = join(TMP, name);
  writeFileSync(file, buf);
  return file;
};
const sips = (format, input, output) => {
  const r = spawnSync('sips', ['-s', 'format', format, input, '--out', output], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`sips failed for ${output}`);
  return output;
};

// A 64x48 gradient: the small image, and the base of every format fixture.
const gradient = (x, y) => [200, x * 3, y * 4, 255];
const small = source('small.png', png(64, 48, gradient));
// Left half opaque, right half transparent: the PNG fixture carries transparency.
const halfClear = source('alpha.png', png(64, 48, (x, y) => [x * 3, 120, y * 4, x < 32 ? 255 : 0], true));

sips('jpeg', small, join(OUT, 'photo.jpg'));
sips('png', halfClear, join(OUT, 'photo.png'));
sips('heic', small, join(OUT, 'photo.heic'));
sips('gif', source('background.png', png(3000, 2000, () => [40, 90, 160, 255])), join(OUT, 'background-3000x2000.gif'));
sips('gif', source('avatar.png', png(2000, 2000, () => [220, 160, 40, 255])), join(OUT, 'avatar-2000x2000.gif'));
// The throwaway v1-shaped tree's avatar, a PNG, which the v1 Import converts (tests/v1-png-avatar/).
sips('png', source('v1-avatar.png', png(800, 600, () => [90, 170, 90, 255])), join(OUT, '..', 'v1-png-avatar', 'images', 'avatar.png'));

// --- Animated GIF: frame 1 red, frame 2 blue, each a sips GIF --------------------------------------------------------
// A GIF's parts: the logical screen (header, descriptor, global colour table) and its image (descriptor and LZW data).
function gifParts(buf) {
  const flags = buf[10];
  const gctSize = flags & 0x80 ? 3 * 2 ** ((flags & 7) + 1) : 0;
  let i = 13 + gctSize;
  const screen = buf.subarray(0, i);
  const table = buf.subarray(13, 13 + gctSize);
  while (buf[i] === 0x21) {
    // skip extensions: introducer, label, then sub-blocks up to a zero length
    i += 2;
    while (buf[i]) i += buf[i] + 1;
    i += 1;
  }
  if (buf[i] !== 0x2c) throw new Error('no image descriptor in the sips GIF');
  const start = i;
  const localFlags = buf[i + 9];
  i += 10 + (localFlags & 0x80 ? 3 * 2 ** ((localFlags & 7) + 1) : 0);
  i += 1; // LZW minimum code size
  while (buf[i]) i += buf[i] + 1;
  i += 1;
  return { screen, table, flags, descriptor: buf.subarray(start, start + 10), data: buf.subarray(start + 10, i) };
}
const frame = (name, rgb) => gifParts(readFileSync(sips('gif', source(`${name}.png`, png(64, 48, () => [...rgb, 255])), join(TMP, `${name}.gif`))));
const red = frame('red', [230, 20, 20]);
const blue = frame('blue', [20, 20, 230]);
if (red.descriptor[9] & 0x80 || blue.descriptor[9] & 0x80) throw new Error('unexpected local colour table in a sips GIF');
const screen = Buffer.from(red.screen);
screen.write('GIF89a', 0, 'latin1'); // extensions need GIF89a; sips writes GIF87a
const loop = Buffer.from([0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0', 'latin1'), 0x03, 0x01, 0x00, 0x00, 0x00]);
const delay = Buffer.from([0x21, 0xf9, 0x04, 0x00, 0x32, 0x00, 0x00, 0x00]); // 0.5 s per frame
// Frame 2 carries blue's colour table as its own local table.
const blueDescriptor = Buffer.from(blue.descriptor);
blueDescriptor[9] = 0x80 | (blue.flags & 7);
writeFileSync(
  join(OUT, 'photo.gif'),
  Buffer.concat([screen, loop, delay, red.descriptor, red.data, delay, blueDescriptor, blue.table, blue.data, Buffer.from([0x3b])]),
);

// --- EXIF and XMP written into sips JPEGs ----------------------------------------------------------------------------
// A little-endian TIFF block: IFD0 entries, with sub-IFDs (Exif, GPS) given as entry lists under their pointer tags.
const TYPES = { BYTE: [1, 1], ASCII: [2, 1], SHORT: [3, 2], LONG: [4, 4], RATIONAL: [5, 8] };
const ascii = (tag, s) => ({ tag, type: 'ASCII', value: Buffer.from(`${s}\0`, 'latin1') });
const short = (tag, n) => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return { tag, type: 'SHORT', value: b };
};
const rationals = (tag, pairs) => {
  const b = Buffer.alloc(8 * pairs.length);
  pairs.forEach(([num, den], k) => {
    b.writeUInt32LE(num, 8 * k);
    b.writeUInt32LE(den, 8 * k + 4);
  });
  return { tag, type: 'RATIONAL', value: b };
};
function tiff(ifd0, subIfds = {}) {
  // Layout: header, IFD0 and its data, then each sub-IFD and its data.
  const ifdSize = (entries) => 2 + 12 * entries.length + 4;
  const dataSize = (entries) => entries.reduce((n, e) => n + (e.value.length > 4 ? e.value.length + (e.value.length & 1) : 0), 0);
  const pointers = Object.keys(subIfds).map((tag) => ({ tag: Number(tag), type: 'LONG', value: Buffer.alloc(4) }));
  const top = [...ifd0, ...pointers].sort((a, b) => a.tag - b.tag);
  let offset = 8 + ifdSize(top) + dataSize(top);
  for (const [tag, entries] of Object.entries(subIfds)) {
    top.find((e) => e.tag === Number(tag)).value.writeUInt32LE(offset);
    offset += ifdSize(entries) + dataSize(entries);
  }
  const out = Buffer.alloc(offset);
  out.write('II', 0, 'latin1');
  out.writeUInt16LE(42, 2);
  out.writeUInt32LE(8, 4);
  const writeIfd = (entries, at) => {
    entries.sort((a, b) => a.tag - b.tag);
    out.writeUInt16LE(entries.length, at);
    let data = at + ifdSize(entries);
    entries.forEach((e, k) => {
      const [type, unit] = TYPES[e.type];
      const p = at + 2 + 12 * k;
      out.writeUInt16LE(e.tag, p);
      out.writeUInt16LE(type, p + 2);
      out.writeUInt32LE(e.value.length / unit, p + 4);
      if (e.value.length <= 4) e.value.copy(out, p + 8);
      else {
        out.writeUInt32LE(data, p + 8);
        e.value.copy(out, data);
        data += e.value.length + (e.value.length & 1);
      }
    });
    out.writeUInt32LE(0, at + 2 + 12 * entries.length);
    return data;
  };
  let at = writeIfd(top, 8);
  for (const entries of Object.values(subIfds)) at = writeIfd(entries, at);
  return out;
}
const app1 = (payload) => {
  const head = Buffer.from([0xff, 0xe1, 0, 0]);
  head.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([head, payload]);
};
// The sips JPEG with its own APP1 blocks (sips writes an Exif block) replaced by the given ones, right after SOI.
function withApp1(jpegFile, blocks) {
  const jpeg = readFileSync(jpegFile);
  const kept = [];
  let i = 2;
  while (jpeg[i] === 0xff && jpeg[i + 1] !== 0xda) {
    const len = jpeg.readUInt16BE(i + 2);
    if (jpeg[i + 1] !== 0xe1) kept.push(jpeg.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return Buffer.concat([jpeg.subarray(0, 2), ...blocks.map(app1), ...kept, jpeg.subarray(i)]);
}
const EXIF = Buffer.from('Exif\0\0', 'latin1');
const base = sips('jpeg', small, join(TMP, 'base.jpg'));

// Orientation 6: stored 64x48, upright 48x64.
writeFileSync(join(OUT, 'orientation-6.jpg'), withApp1(base, [Buffer.concat([EXIF, tiff([short(0x0112, 6)])])]));

// GPS and camera tags, plus an XMP packet naming the camera.
const gps = [
  { tag: 0x0000, type: 'BYTE', value: Buffer.from([2, 3, 0, 0]) },
  ascii(0x0001, 'N'),
  rationals(0x0002, [[46, 1], [3, 1], [1234, 100]]),
  ascii(0x0003, 'E'),
  rationals(0x0004, [[14, 1], [30, 1], [5678, 100]]),
];
const exifIfd = [ascii(0xa434, 'Fixture Lens 4mm')];
const xmp = Buffer.from(
  'http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
    '<rdf:Description xmlns:tiff="http://ns.adobe.com/tiff/1.0/" tiff:Make="FixtureCam" tiff:Model="Fixture One"/></rdf:RDF></x:xmpmeta>',
  'latin1',
);
writeFileSync(
  join(OUT, 'gps-camera.jpg'),
  withApp1(base, [Buffer.concat([EXIF, tiff([ascii(0x010f, 'FixtureCam'), ascii(0x0110, 'Fixture One'), short(0x0112, 1)], { 0x8769: exifIfd, 0x8825: gps })]), xmp]),
);

// --- WebP from Chromium's canvas ------------------------------------------------------------------------------------
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 64, 48);
    g.addColorStop(0, '#c80000');
    g.addColorStop(1, '#c8c0c0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 48);
    return canvas.toDataURL('image/webp', 0.8);
  });
  if (!dataUrl.startsWith('data:image/webp;base64,')) throw new Error('this Chromium wrote no WebP');
  writeFileSync(join(OUT, 'photo.webp'), Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
} finally {
  await browser.close();
}

writeFileSync(join(OUT, 'not-an-image.txt'), 'This is a text file, not an image.\n');
rmSync(TMP, { recursive: true, force: true });
