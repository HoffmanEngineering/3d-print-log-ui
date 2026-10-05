// Builds the images campaign emails reference from www.3dprintlog.com/assets/email/.
// Sent emails point at these URLs forever, so a file may be regenerated in place but is never
// renamed or deleted (see AGENTS.md, "Email assets"). The badge art is assembled from the same TypeScript
// sources the in-app badge component renders, bundled for Node with esbuild.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(here, '..');
export const EMAIL_ASSET_ROOT = join(REPO_ROOT, 'src', 'assets', 'email');
export const VERSION_DIR = 'v1';
const ACHIEVEMENTS_DIR = join(
  REPO_ROOT,
  'src',
  'app',
  'shared',
  'achievements'
);

/** Mirrors the API's AchievementCategory as serialized on the catalog endpoint. */
const HIDDEN_CATEGORY = 6;

/** Rendered size: the shield's 50x56 canvas at 2.24x, shown at 50px in the email. */
export const BADGE_WIDTH = 112;
export const BADGE_HEIGHT = 125;

/**
 * The badge art and glyph tables, loaded from the app's TypeScript: SHIELD_PATH, BADGE_PALETTE,
 * badgeFillId, badgeFillSuffix, ACHIEVEMENT_GLYPHS, REQUIRED_GLYPHS,
 * INITIALS_PREFIX, plus BADGE_DEFS_SVG from the defs component's template.
 */
export async function loadBadgeArt() {
  const result = await build({
    stdin: {
      contents:
        "export * from './achievement-badge-art';\nexport * from './achievement-glyphs';\n",
      resolveDir: ACHIEVEMENTS_DIR,
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'silent',
  });
  const code = result.outputFiles[0].text;
  const modules = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  );
  return { ...modules, BADGE_DEFS_SVG: readBadgeDefs() };
}

/** The inner markup of the app's one shared <defs>, read from the defs component's template. */
function readBadgeDefs() {
  const html = readFileSync(
    join(ACHIEVEMENTS_DIR, 'achievement-badge-defs.component.html'),
    'utf8'
  );
  const match = html.match(/<defs>([\s\S]*)<\/defs>/);
  if (!match)
    throw new Error('achievement-badge-defs.component.html has no <defs>');
  return match[1];
}

/** `clock` + `t3` -> `clock-t3.png`; `initials:Cu` -> `initials-cu-…`; numerals carry the threshold. */
export function badgeFileName(glyph, fillSuffix, threshold) {
  const name =
    glyph === 'numeral'
      ? `numeral-${threshold}`
      : glyph.replace(/^initials:/, 'initials-').toLowerCase();
  return `${name}-${fillSuffix}.png`;
}

function textFor(glyph, threshold, art) {
  if (glyph.startsWith(art.INITIALS_PREFIX)) {
    return glyph.slice(art.INITIALS_PREFIX.length);
  }
  return glyph === 'numeral' ? String(threshold) : null;
}

/**
 * Every badge image an email can reference: each tier of each public catalog family, with the
 * fill the app gives it, plus every glyph on the Hidden fill (the catalog endpoint never sends
 * hidden families, so all of them are covered this way).
 */
export function planBadges(catalog, art) {
  const plan = new Map();
  const add = (glyph, fillId, threshold) => {
    const file = badgeFileName(glyph, art.badgeFillSuffix(fillId), threshold);
    if (!plan.has(file)) {
      plan.set(file, {
        file,
        glyph,
        fillId,
        text: textFor(glyph, threshold, art),
      });
    }
  };

  for (const family of catalog.families) {
    const oneTime = family.tiers.length === 1;
    family.tiers.forEach((tier, i) =>
      add(
        family.glyph,
        art.badgeFillId(family.category, i + 1, oneTime),
        tier.threshold
      )
    );
  }
  for (const glyph of art.REQUIRED_GLYPHS) {
    if (glyph !== 'numeral') {
      add(glyph, art.badgeFillId(HIDDEN_CATEGORY, 1, true));
    }
  }
  return [...plan.values()];
}

const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

function shapeSvg(s, colors) {
  const paint = (p) =>
    p === undefined ? null : p === 'none' ? 'none' : colors[p];
  const common = {
    fill: paint(s.fill),
    stroke: paint(s.stroke),
    'stroke-width': s.strokeWidth,
  };
  switch (s.kind) {
    case 'path':
      return `<path ${attrs({ d: s.d, ...common, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })}/>`;
    case 'rect':
      return `<rect ${attrs({ x: s.x, y: s.y, width: s.width, height: s.height, rx: s.rx, ...common })}/>`;
    case 'circle':
      return `<circle ${attrs({ cx: s.cx, cy: s.cy, r: s.r, ...common })}/>`;
    case 'line':
      return `<line ${attrs({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, stroke: common.stroke, 'stroke-width': s.strokeWidth, 'stroke-linecap': 'round' })}/>`;
    default:
      throw new Error(`Unknown glyph shape ${s.kind}`);
  }
}

/**
 * One badge as a standalone SVG, mirroring AchievementBadgeComponent's template: shield in the
 * tier fill, layer lines, then the glyph on a 48x48 grid with the component's drop shadow.
 */
export function badgeSvg({ glyph, fillId, text }, art) {
  const colors = art.BADGE_PALETTE[fillId];
  const shapes = art.ACHIEVEMENT_GLYPHS[glyph] ?? [];
  const label = text
    ? // librsvg's dominant-baseline support is partial, so the baseline is placed by hand.
      `<text x="24" y="${text.length > 2 ? 31 : 33.5}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${text.length > 2 ? 17 : 24}" fill="${colors.fg}">${text}</text>`
    : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" viewBox="0 0 50 56">`,
    `<defs>${art.BADGE_DEFS_SVG}<filter id="glyph-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="0.5" flood-color="#000" flood-opacity="0.35"/></filter></defs>`,
    `<path d="${art.SHIELD_PATH}" fill="url(#${fillId})"/>`,
    `<path d="${art.SHIELD_PATH}" fill="url(#ach-layers)"/>`,
    `<svg x="10.5" y="11" width="29" height="29" viewBox="0 0 48 48" overflow="visible">`,
    `<g filter="url(#glyph-shadow)">${shapes.map((s) => shapeSvg(s, colors)).join('')}${label}</g>`,
    `</svg></svg>`,
  ].join('');
}
