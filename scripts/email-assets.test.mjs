import assert from 'node:assert';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

import {
  EMAIL_ASSET_ROOT,
  badgeFileName,
  badgeSvg,
  loadBadgeArt,
  planBadges,
} from './email-assets-lib.mjs';

const art = await loadBadgeArt();

const FIXTURE_CATALOG = {
  families: [
    {
      key: 'prints-logged',
      category: 2,
      glyph: 'numeral',
      tiers: [{ threshold: 10 }, { threshold: 25 }],
    },
    { key: 'mcp', category: 4, glyph: 'robot', tiers: [{ threshold: 1 }] },
    {
      key: 'slicer-cura',
      category: 4,
      glyph: 'initials:Cu',
      tiers: [{ threshold: 1 }],
    },
  ],
};

test('badgeFileName names plain, initials and numeral badges', () => {
  assert.equal(badgeFileName('clock', 't3'), 'clock-t3.png');
  assert.equal(badgeFileName('initials:Cu', 'in'), 'initials-cu-in.png');
  assert.equal(badgeFileName('numeral', 't2', 25), 'numeral-25-t2.png');
});

test('planBadges renders each catalog tier plus every glyph as a hidden badge', () => {
  const files = planBadges(FIXTURE_CATALOG, art).map((b) => b.file);

  assert.ok(files.includes('numeral-10-t1.png'));
  assert.ok(files.includes('numeral-25-t2.png'));
  assert.ok(files.includes('robot-in.png'));
  assert.ok(files.includes('initials-cu-in.png'));
  for (const glyph of art.REQUIRED_GLYPHS.filter((g) => g !== 'numeral')) {
    assert.ok(files.includes(`${glyph}-hi.png`), glyph);
  }
  assert.ok(!files.includes('numeral-hi.png'));
  assert.equal(new Set(files).size, files.length, 'no duplicates');
});

test('planBadges carries the numeral threshold and the initials as text', () => {
  const plan = planBadges(FIXTURE_CATALOG, art);
  assert.equal(plan.find((b) => b.file === 'numeral-25-t2.png').text, '25');
  assert.equal(plan.find((b) => b.file === 'initials-cu-in.png').text, 'Cu');
  assert.equal(plan.find((b) => b.file === 'robot-in.png').text, null);
});

test('badgeSvg is a standalone SVG with its own defs and no external references', () => {
  const svg = badgeSvg(
    { glyph: 'numeral', fillId: 'ach-fill-t4', text: '100' },
    art
  );
  assert.match(svg, /^<svg [^>]*width="112" height="125"/);
  assert.ok(svg.includes('id="ach-fill-t4"'));
  assert.ok(svg.includes('url(#ach-fill-t4)'));
  assert.ok(svg.includes('>100</text>'));
});

// ---- Guards over the committed assets -------------------------------------------------------

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

const manifestPath = join(EMAIL_ASSET_ROOT, 'manifest.json');

test('the manifest lists exactly the files on disk, all inside a version folder', () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const onDisk = listFiles(EMAIL_ASSET_ROOT)
    .map((f) => relative(EMAIL_ASSET_ROOT, f).split(sep).join('/'))
    .filter((f) => f !== 'manifest.json')
    .sort();

  assert.deepEqual([...manifest].sort(), onDisk);
  for (const f of manifest) assert.match(f, /^v\d+\//, f);
});

const EXPECTED_SIZES = {
  'v1/logo-wordmark.png': [360, 161],
  'v1/printer-mark.png': [56, 56],
  'v1/social-youtube.png': [48, 48],
  'v1/social-github.png': [48, 48],
  'v1/social-blog.png': [48, 48],
};

test('every email image has the pixel size the templates declare', async () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const [file, [w, h]] of Object.entries(EXPECTED_SIZES)) {
    assert.ok(existsSync(join(EMAIL_ASSET_ROOT, file)), file);
    const meta = await sharp(join(EMAIL_ASSET_ROOT, file)).metadata();
    assert.deepEqual([meta.width, meta.height], [w, h], file);
  }
  for (const file of manifest.filter((f) => f.startsWith('v1/badges/'))) {
    const meta = await sharp(join(EMAIL_ASSET_ROOT, file)).metadata();
    assert.deepEqual([meta.width, meta.height], [112, 125], file);
  }
});

// The shield's own gradient already has contrast, so "not blank" means: differs from the same
// shield rendered with no number on it.
const GLYPH_AREA = { left: 25, top: 30, width: 62, height: 50 };
const glyphPixels = (input) =>
  sharp(input).extract(GLYPH_AREA).removeAlpha().raw().toBuffer();

test('numeral badges are not blank: the number is drawn on the shield', async () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const numerals = manifest.filter((f) => /^v1\/badges\/numeral-/.test(f));
  assert.ok(numerals.length >= 6, 'expected the six Prolific Printer tiers');
  for (const file of numerals) {
    const fill = file.match(/-([a-z0-9]+)\.png$/)[1];
    const empty = Buffer.from(
      badgeSvg({ glyph: 'numeral', fillId: `ach-fill-${fill}`, text: '' }, art)
    );
    const [actual, blank] = await Promise.all([
      glyphPixels(join(EMAIL_ASSET_ROOT, file)),
      glyphPixels(empty),
    ]);
    let changed = 0;
    for (let i = 0; i < actual.length; i++) {
      if (Math.abs(actual[i] - blank[i]) > 40) changed++;
    }
    assert.ok(changed > 200, `${file} looks blank (${changed} bytes differ)`);
  }
});
