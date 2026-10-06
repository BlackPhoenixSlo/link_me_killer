'use strict';
// Image pipeline (docs/spec/phase-02-vps-foundation.md, Interfaces and Upload (D4)): any image sharp decodes becomes WebP,
// turned upright from its EXIF orientation, its longest side at most maxSide and never enlarged, transparency kept, every
// metadata block dropped (sharp keeps none unless asked), the first frame only of an animation (sharp reads one page unless
// asked), at quality 80. sharp's default pixel limit stands, so an image over it is refused like any undecodable input.

// Upload targets (spec, Contracts, Upload targets): the longest side in px, keyed `collection/field`.
const TARGETS = { 'profiles/avatar': 512, 'links/icon': 512, 'links/backgroundImage': 1080 };

// sharp is loaded on the first conversion, so a caller that converts nothing (a WebP-only v1 Import) needs no image library.
async function toWebp(bytes, maxSide) {
  const sharp = require('sharp');
  try {
    return await sharp(bytes)
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    // sharp's message can name the input; a fixed error carries nothing of it.
    throw new Error('unsupported image');
  }
}

module.exports = { toWebp, TARGETS };
