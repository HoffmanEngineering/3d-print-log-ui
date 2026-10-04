import {
  AchievementCatalog,
  AchievementCategory,
  AchievementFamily,
} from '../../core/types/achievement';

/** Shared test data for the achievements pages. */
export function testFamily(
  key: string,
  category: AchievementCategory,
  thresholds: number[],
  title = key
): AchievementFamily {
  return {
    key,
    category,
    glyph: 'layers',
    title,
    hintOrder: 0,
    tiers: thresholds.map((t, i) => ({
      tier: i + 1,
      threshold: t,
      description: `Do ${t}`,
      rarityPercent: 10,
    })),
  };
}

export const TEST_CATALOG: AchievementCatalog = {
  version: 1,
  hiddenCount: 4,
  families: [
    testFamily('daily-streak', AchievementCategory.Streaks, [3, 5, 10]),
    testFamily(
      'first-print',
      AchievementCategory.GettingStarted,
      [1],
      'First Layer'
    ),
    testFamily(
      'prints-logged',
      AchievementCategory.Milestones,
      [10, 25, 50],
      'Prolific Printer'
    ),
    testFamily('mcp', AchievementCategory.Integrations, [1]),
    testFamily('maintenance', AchievementCategory.Community, [1, 5]),
  ],
};
