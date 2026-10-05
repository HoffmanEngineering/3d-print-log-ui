import { AchievementCategory } from '../../core/types/achievement';

/*
 * The badge art with no Angular in it: the shield, the fills and the rule that picks one. The
 * component renders it, and scripts/generate-email-assets.mjs rasterizes the same sources into
 * the PNGs emails use, so the two can never drift apart.
 */

/** The shield, on a 50×56 canvas (spec §9). */
export const SHIELD_PATH =
  'M25 2.5c7.3 4.4 14.5 5.8 21.8 5.8v16.1C46.8 39.3 37.6 47.8 25 52.3 12.4 47.8 3.2 39.3 3.2 24.4V8.3C10.5 8.3 17.7 6.9 25 2.5z';

const CATEGORY_FILL: Partial<Record<AchievementCategory, string>> = {
  [AchievementCategory.GettingStarted]: 'ach-fill-gs',
  [AchievementCategory.Integrations]: 'ach-fill-in',
  [AchievementCategory.Community]: 'ach-fill-co',
  [AchievementCategory.Hidden]: 'ach-fill-hi',
};

/**
 * The shared `<defs>` id a badge paints its shield with: a filament finish per tier, or a matte
 * category color for one-time badges.
 */
export function badgeFillId(
  category: AchievementCategory,
  tier: number,
  oneTime: boolean
): string {
  if (oneTime || category === AchievementCategory.Hidden) {
    return CATEGORY_FILL[category] ?? 'ach-fill-gs';
  }
  return `ach-fill-t${Math.min(6, Math.max(1, tier))}`;
}

/** Glyph color and cut-out accent for each fill: dark cut-outs on the fill's own family. */
export const BADGE_PALETTE: Record<string, { fg: string; cut: string }> = {
  'ach-fill-t1': { fg: '#fff', cut: '#7d4a22' },
  'ach-fill-t2': { fg: '#fff', cut: '#4e5560' },
  'ach-fill-t3': { fg: '#fff', cut: '#8a5e12' },
  'ach-fill-t4': { fg: '#fff', cut: '#3f3a8f' },
  'ach-fill-t5': { fg: '#fff', cut: '#262626' },
  // Glow-in-the-Dark is pale, so its glyph is dark green instead of white.
  'ach-fill-t6': { fg: '#1b5e20', cut: '#d9ffd4' },
  'ach-fill-gs': { fg: '#fff', cut: '#283593' },
  'ach-fill-in': { fg: '#fff', cut: '#00695c' },
  'ach-fill-co': { fg: '#fff', cut: '#bf360c' },
  'ach-fill-hi': { fg: '#fff', cut: '#4a148c' },
};

/** "ach-fill-t3" -> "t3": the suffix email asset file names use. */
export function badgeFillSuffix(fillId: string): string {
  return fillId.replace(/^ach-fill-/, '');
}

/** The inner markup of the one shared <defs>: every gradient and pattern a badge paints with. */
export const BADGE_DEFS_SVG = `
  <!-- Tier finishes -->
  <linearGradient id="ach-fill-t1" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f3c7a0" />
    <stop offset=".5" stop-color="#c47f45" />
    <stop offset="1" stop-color="#7d4a22" />
  </linearGradient>
  <linearGradient id="ach-fill-t2" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fdfdfd" />
    <stop offset=".5" stop-color="#b9c0c8" />
    <stop offset="1" stop-color="#6c7480" />
  </linearGradient>
  <linearGradient id="ach-fill-t3" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff3c4" />
    <stop offset=".3" stop-color="#e9be4f" />
    <stop offset=".45" stop-color="#fff0b8" />
    <stop offset=".65" stop-color="#c8922a" />
    <stop offset="1" stop-color="#a7741a" />
  </linearGradient>
  <linearGradient id="ach-fill-t4" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ff6b6b" />
    <stop offset=".25" stop-color="#ffd166" />
    <stop offset=".5" stop-color="#06d6a0" />
    <stop offset=".75" stop-color="#4d96ff" />
    <stop offset="1" stop-color="#c77dff" />
  </linearGradient>
  <pattern
    id="ach-fill-t5"
    width="6"
    height="6"
    patternUnits="userSpaceOnUse"
    patternTransform="rotate(45)"
  >
    <rect width="6" height="6" fill="#262626" />
    <rect width="3" height="3" fill="#3b3b3b" />
    <rect x="3" y="3" width="3" height="3" fill="#3b3b3b" />
  </pattern>
  <radialGradient id="ach-fill-t6" cx=".5" cy=".4" r=".7">
    <stop offset="0" stop-color="#f4fff0" />
    <stop offset=".55" stop-color="#b8f5b0" />
    <stop offset="1" stop-color="#6fdc8c" />
  </radialGradient>

  <!-- One-time category colors -->
  <linearGradient id="ach-fill-gs" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7986cb" />
    <stop offset="1" stop-color="#3f51b5" />
  </linearGradient>
  <linearGradient id="ach-fill-in" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#4db6ac" />
    <stop offset="1" stop-color="#00796b" />
  </linearGradient>
  <linearGradient id="ach-fill-co" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffb74d" />
    <stop offset="1" stop-color="#e65100" />
  </linearGradient>
  <linearGradient id="ach-fill-hi" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ba68c8" />
    <stop offset="1" stop-color="#6a1b9a" />
  </linearGradient>

  <!-- Layer lines: every badge reads as a printed part. -->
  <pattern
    id="ach-layers"
    width="50"
    height="2.8"
    patternUnits="userSpaceOnUse"
  >
    <rect y="0" width="50" height=".8" fill="rgba(0,0,0,.17)" />
    <rect y=".8" width="50" height=".6" fill="rgba(255,255,255,.2)" />
  </pattern>
`;
