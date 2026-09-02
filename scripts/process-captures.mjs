#!/usr/bin/env node
// Turns the PNGs a capture run produced into committed, content-hashed WebP.
//
//   node scripts/process-captures.mjs home
//   node scripts/process-captures.mjs docs
//
// The two sets differ only in where the assets land and what consumes them. The
// hashing, the device-scale guard, the stale-asset pruning and the two-phase
// (stage in memory, then write) safety are shared verbatim, because every one of
// them exists to stop this pipeline publishing a wrong image quietly.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

import {
  contentHash,
  deviceScale,
  docCapturesIndex,
  homeCapturesIndex,
  MIN_DEVICE_SCALE,
  pairSidecar,
  replaceImgRefExactlyOnce,
} from './process-captures.lib.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const SCREENSHOTS = path.join(REPO, 'cypress', 'screenshots');
const WEBP_QUALITY = 80;

/**
 * @typedef {object} CaptureSetConfig
 * @property {string} assetDir absolute directory the WebP files are written to
 * @property {number} maxWidth intrinsic width cap, ~2x the widest render slot
 * @property {(entry: object) => string} assetBase filename stem, before the hash
 * @property {(file: string) => string} publicPath the URL the app will request
 * @property {(staged: object[]) => void} commit set-specific outputs
 * @property {boolean} [exclusive] the directory holds nothing but this set
 */

/** @type {Record<string, CaptureSetConfig>} */
const SETS = {
  home: {
    assetDir: path.join(REPO, 'src', 'assets'),
    // The home feature grid caps each column at ~676px CSS. Cap the intrinsic
    // width at ~2x that so the images stay crisp on HiDPI without being
    // wastefully huge (which also avoids NgOptimizedImage "oversized image"
    // console warnings). Narrower captures are left untouched.
    maxWidth: 1400,
    assetBase: (entry) => entry.outputBase,
    publicPath: (file) => `/assets/${file}`,
    commit: (staged) => {
      // The four home images are hand-placed in the template, so the template is
      // rewritten. Doc figures deliberately are not — see the docs set below.
      const html = path.join(REPO, 'src', 'app', 'home', 'home.component.html');
      let contents = fs.readFileSync(html, 'utf8');
      for (const s of staged) {
        contents = replaceImgRefExactlyOnce(contents, s.assetBase, {
          src: s.publicPath,
          width: s.width,
          height: s.height,
        });
      }
      fs.writeFileSync(html, contents);

      // Also publish the map, for consumers that cannot read the template —
      // today that is the OG image URL in home.component.ts.
      fs.writeFileSync(
        path.join(REPO, 'src', 'content', 'home-captures.json'),
        `${JSON.stringify(homeCapturesIndex(staged), null, 2)}\n`
      );
    },
  },
  docs: {
    assetDir: path.join(REPO, 'src', 'assets', 'docs', 'captures'),
    // Nothing but generated doc figures lives here, so a file this run did not
    // write belongs to a figure that no longer exists.
    exclusive: true,
    // The docs prose column is ~820px CSS at its widest.
    maxWidth: 1700,
    // Named for the figure, not the PNG: `<doc-figure name="print-list">` and
    // the published asset have to agree, and the intermediate PNG name is an
    // implementation detail of the Cypress run.
    assetBase: (entry) =>
      entry.theme === 'dark' ? `${entry.name}_dark` : entry.name,
    publicPath: (file) => `/assets/docs/captures/${file}`,
    commit: (staged) => {
      // No template is rewritten. The map is the contract: adding a figure is a
      // capture plus one `<doc-figure name="...">`, never an asset path an
      // author has to keep in sync with a hash.
      fs.writeFileSync(
        path.join(REPO, 'src', 'content', 'docs-captures.json'),
        `${JSON.stringify(docCapturesIndex(staged), null, 2)}\n`
      );
    },
  },
};

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Cypress nests screenshots by spec path, which varies by environment — find the
// PNG by filename anywhere under cypress/screenshots.
function findPng(name, dir = SCREENSHOTS) {
  if (!fs.existsSync(dir)) return null;
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
  const setId = process.argv[2];
  const config = SETS[setId];
  if (!config) {
    throw new Error(
      `Unknown capture set "${setId ?? ''}". Expected one of: ${Object.keys(SETS).join(', ')}.`
    );
  }

  const sidecarPath = path.join(REPO, 'cypress', 'captures', `${setId}.json`);
  if (!fs.existsSync(sidecarPath)) {
    throw new Error(
      `No capture sidecar at ${sidecarPath}. Run the capture step first.`
    );
  }
  const entries = pairSidecar(JSON.parse(fs.readFileSync(sidecarPath, 'utf8')));

  // ---- Phase A: pure/in-memory. Any failure here leaves the repo untouched. --
  const staged = [];
  for (const entry of entries) {
    const png = findPng(`${entry.outputBase}.png`);
    if (!png) {
      throw new Error(
        `Missing capture: ${entry.outputBase}.png under ${SCREENSHOTS}`
      );
    }

    const source = await sharp(png).metadata();
    const scale = deviceScale(source.width, entry.cssWidth);
    if (scale < MIN_DEVICE_SCALE) {
      throw new Error(
        `${entry.outputBase} was captured at device-scale-factor ${scale.toFixed(2)} ` +
          `(${source.width}px for a ${entry.cssWidth}px element). Captures below ` +
          `${MIN_DEVICE_SCALE} publish at half resolution — re-run the capture ` +
          `through cypress.config.capture.ts, which sets the 2x factor.`
      );
    }

    const webp = await sharp(png)
      .resize({ width: config.maxWidth, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    const meta = await sharp(webp).metadata();

    const assetBase = config.assetBase(entry);
    const hash = contentHash(webp);
    const file = `${assetBase}_${hash}.webp`;
    staged.push({
      ...entry,
      assetBase,
      file,
      hash,
      webp,
      width: meta.width,
      height: meta.height,
      publicPath: config.publicPath(file),
    });
  }

  // ---- Phase B: commit. Only now do we touch the filesystem. ----------------
  fs.mkdirSync(config.assetDir, { recursive: true });
  for (const s of staged) {
    fs.writeFileSync(path.join(config.assetDir, s.file), s.webp);
  }
  config.commit(staged);

  // ---- Phase C: delete superseded assets. -----------------------------------
  // `exclusive` sets own their directory outright, so anything not in this run
  // is stale — including a figure that was deleted from the manifest, which the
  // per-base sweep below can never see. src/assets is shared with the rest of
  // the app, so the home set may only sweep the bases it just wrote.
  //
  // The token pattern excludes `_`, so `print-list` does not match
  // `print-list_dark_<hash>.webp` and delete the other theme's asset.
  const keep = new Set(staged.map((s) => s.file));
  for (const f of fs.readdirSync(config.assetDir)) {
    if (keep.has(f) || !f.endsWith('.webp')) continue;
    const superseded = staged.some((s) =>
      // Escaped: this sweep DELETES files, and an unescaped `.` in a future
      // base (`Homepage_v2.0`) would match any character and take an unrelated
      // asset with it.
      new RegExp(`^${escapeRegExp(s.assetBase)}_[A-Za-z0-9]+\\.webp$`).test(f)
    );
    if (config.exclusive || superseded) {
      fs.unlinkSync(path.join(config.assetDir, f));
    }
  }

  console.log(
    `Processed ${staged.length} ${setId} captures:`,
    staged.map((s) => s.file).join(', ')
  );
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
