import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  contentHash,
  replaceImgRefExactlyOnce,
} from './process-home-screenshots.helpers.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const SCREENSHOTS = path.join(REPO, 'cypress', 'screenshots');
const ASSETS = path.join(REPO, 'src', 'assets');
const HTML = path.join(REPO, 'src', 'app', 'home', 'home.component.html');
const WEBP_QUALITY = 80;
// The home feature grid caps each column at ~676px CSS. Cap the intrinsic width
// at ~2x that so the images stay crisp on HiDPI without being wastefully huge
// (which also avoids NgOptimizedImage "oversized image" console warnings).
// Narrower captures (e.g. the portrait analytics) are left untouched.
const MAX_WIDTH = 1400;

// Logical image bases (light + dark) — mirror manifest.ts CAPTURE_TARGETS.
const BASES = [
  'Homepage_PrinterList',
  'Homepage_PrinterList_dark',
  'Homepage_Filament',
  'Homepage_Filament_dark',
  'Homepage_Analytics',
  'Homepage_Analytics_dark',
];

// Cypress nests screenshots by spec path, which varies by environment — find the
// PNG by filename anywhere under cypress/screenshots.
function findPng(name, dir = SCREENSHOTS) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = findPng(name, p);
      if (hit) return hit;
    } else if (entry.name === name) {
      return p;
    }
  }
  return null;
}

async function main() {
  // ---- Phase A: pure/in-memory. Any failure here leaves the repo untouched. ----
  const staged = [];
  for (const base of BASES) {
    const png = findPng(`${base}.png`);
    if (!png) throw new Error(`Missing capture: ${base}.png under ${SCREENSHOTS}`);
    const webp = await sharp(png)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    const meta = await sharp(webp).metadata();
    if (!meta.width || !meta.height || meta.width < 400) {
      throw new Error(
        `Suspicious dimensions for ${base}: ${meta.width}x${meta.height}`
      );
    }
    staged.push({
      base,
      webp,
      hash: contentHash(webp),
      width: meta.width,
      height: meta.height,
    });
  }

  // Build the fully-rewritten HTML in memory (ngSrc + width + height, exactly-once
  // each). Throws before anything is written if a reference or dimension is off.
  let html = fs.readFileSync(HTML, 'utf8');
  for (const s of staged) {
    html = replaceImgRefExactlyOnce(html, s.base, {
      src: `/assets/${s.base}_${s.hash}.webp`,
      width: s.width,
      height: s.height,
    });
  }

  // ---- Phase B: commit. Only now do we touch the filesystem. ----
  for (const s of staged) {
    fs.writeFileSync(path.join(ASSETS, `${s.base}_${s.hash}.webp`), s.webp);
  }
  fs.writeFileSync(HTML, html);

  // ---- Phase C: delete superseded assets (same base, different hash). ----
  for (const s of staged) {
    for (const f of fs.readdirSync(ASSETS)) {
      if (
        new RegExp(`^${s.base}_[A-Za-z0-9]+\\.webp$`).test(f) &&
        f !== `${s.base}_${s.hash}.webp`
      ) {
        fs.unlinkSync(path.join(ASSETS, f));
      }
    }
  }
  console.log(
    'Home screenshots regenerated:',
    staged.map((s) => `${s.base}_${s.hash}.webp`).join(', ')
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
