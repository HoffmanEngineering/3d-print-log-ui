#!/usr/bin/env node
// Generates the images campaign emails reference (src/assets/email/v1/) and the
// manifest the email-assets test guards. Run by hand after adding an achievement family or glyph,
// then deploy the UI before the API starts referencing the new files:
//
//   npm run email-assets                         # catalog from production
//   npm run email-assets -- --catalog <url|file> # e.g. a local API
//
// Additive only: an existing file is rewritten when its bytes change, and nothing is deleted.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import sharp from 'sharp';

import {
  EMAIL_ASSET_ROOT,
  REPO_ROOT,
  VERSION_DIR,
  badgeSvg,
  loadBadgeArt,
  planBadges,
} from './email-assets-lib.mjs';

const DEFAULT_CATALOG = 'https://api.3dprintlog.com/api/achievements/catalog';
const INDIGO = '#3f51b5';
const ASSETS = join(REPO_ROOT, 'src', 'assets');
const OUT = join(EMAIL_ASSET_ROOT, VERSION_DIR);

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};

async function loadCatalog(source) {
  if (/^https?:/.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`${source} answered ${res.status}`);
    return res.json();
  }
  return JSON.parse(readFileSync(source, 'utf8'));
}

let written = 0;
let unchanged = 0;
function save(file, bytes) {
  const target = join(OUT, file);
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target) && readFileSync(target).equals(bytes)) {
    unchanged++;
    return;
  }
  writeFileSync(target, bytes);
  written++;
}

const png = (img) => img.png({ compressionLevel: 9 }).toBuffer();

/** A round social icon recolored to brand indigo, its cut-out glyph backed with white. */
function socialIcon(svgFile) {
  const svg = readFileSync(join(ASSETS, 'img', 'icons', svgFile), 'utf8')
    .replace(/fill="#[0-9a-fA-F]{3,6}"/g, `fill="${INDIGO}"`)
    .replace(/(<path )/, '<circle cx="16" cy="16" r="14.5" fill="#ffffff"/>$1');
  return png(sharp(Buffer.from(svg), { density: 144 }).resize(48, 48));
}

async function brandImages() {
  const logo = readdirSync(ASSETS).find((f) =>
    /^3d_print_log_logo_large_.*\.png$/.test(f)
  );
  // White wordmark on a baked-in indigo background: clients that invert colors for dark mode
  // leave images alone, so a transparent white logo could vanish into a lightened band.
  save(
    'logo-wordmark.png',
    await png(
      sharp(join(ASSETS, logo))
        .resize(360, 161, { fit: 'contain', background: INDIGO })
        .flatten({ background: INDIGO })
    )
  );
  save(
    'printer-mark.png',
    await png(sharp(join(ASSETS, 'apple-touch-icon.png')).resize(56, 56))
  );
  save('social-youtube.png', await socialIcon('social-1_round-youtube.svg'));
  save('social-github.png', await socialIcon('social-1_round-github.svg'));
  // The blog's logo is a wide wordmark; at 24px only its gear reads, so the icon is that gear,
  // masked to a circle to drop the belt and the logo's faint background box.
  const gear = await sharp(
    join(ASSETS, 'img', 'logos', 'HoffmanSiteLogoSmall.png')
  )
    .extract({ left: 0, top: 0, width: 100, height: 100 })
    .resize(48, 48)
    .toBuffer();
  const circle = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="23" fill="#fff"/></svg>'
  );
  save(
    'social-blog.png',
    await png(sharp(gear).composite([{ input: circle, blend: 'dest-in' }]))
  );
}

async function badges(catalog, art) {
  const plan = planBadges(catalog, art);
  for (const badge of plan) {
    save(
      `badges/${badge.file}`,
      await png(sharp(Buffer.from(badgeSvg(badge, art))))
    );
  }
  return plan.length;
}

function writeManifest() {
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  const files = walk(EMAIL_ASSET_ROOT)
    .map((f) => relative(EMAIL_ASSET_ROOT, f).split(sep).join('/'))
    .filter((f) => f !== 'manifest.json')
    .sort();
  writeFileSync(
    join(EMAIL_ASSET_ROOT, 'manifest.json'),
    JSON.stringify(files, null, 2) + '\n'
  );
  return files.length;
}

const catalog = await loadCatalog(arg('--catalog') ?? DEFAULT_CATALOG);
const art = await loadBadgeArt();
await brandImages();
const badgeCount = await badges(catalog, art);
const total = writeManifest();
console.log(
  `Email assets: ${badgeCount} badges planned, ${written} written, ${unchanged} unchanged, ${total} in manifest.`
);
