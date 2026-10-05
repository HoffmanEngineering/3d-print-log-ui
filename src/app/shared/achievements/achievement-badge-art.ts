import { AchievementCategory } from '../../core/types/achievement';

/*
 * The badge art with no Angular in it: the shield, the fills and the rule that picks one. The
 * component renders it, and scripts/generate-email-assets.mjs rasterizes the same sources into
 * the PNGs emails use, so the two can never drift apart. The shared gradients live in
 * achievement-badge-defs.component.html, which the generator reads too.
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
