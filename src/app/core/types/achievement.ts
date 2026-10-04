/** Mirrors the API's AchievementCategory (serialized as numbers). */
export enum AchievementCategory {
  GettingStarted = 1,
  Milestones = 2,
  Streaks = 3,
  Integrations = 4,
  Community = 5,
  Hidden = 6,
}

/** Tier names, lowest first. A family with N thresholds uses the first N. */
export const TIER_NAMES: readonly string[] = [
  'Bronze PLA',
  'Silver PLA',
  'Gold Silk',
  'Rainbow Silk',
  'Carbon Fiber',
  'Glow-in-the-Dark',
];

export interface AchievementTier {
  tier: number;
  threshold: number;
  description: string;
  /** Share of evaluated makers holding this tier, 0–100. */
  rarityPercent: number | null;
}

export interface AchievementFamily {
  key: string;
  category: AchievementCategory;
  glyph: string;
  title: string;
  hintOrder: number;
  tiers: AchievementTier[];
}

export interface AchievementCatalog {
  version: number;
  /** Hidden families exist but are never described until earned. */
  hiddenCount: number;
  families: AchievementFamily[];
}

export interface EarnedTier {
  tier: number;
  unlockedAt: string;
  retroactive: boolean;
}

export interface AchievementProgress {
  best: number;
  current: number;
  nextThreshold: number;
}

export interface MyAchievementFamily {
  key: string;
  tiers: EarnedTier[];
  /** Null when every tier is held. */
  progress: AchievementProgress | null;
}

export interface NextHint {
  key: string;
  tier: number;
  ctaRoute: string;
}

export interface MyAchievements {
  earnedTierCount: number;
  totalTierCount: number;
  families: MyAchievementFamily[];
  revealedHidden: AchievementFamily[];
  nextHint: NextHint | null;
}

export interface PublicFamily {
  key: string;
  highestTier: number;
  tiers: EarnedTier[];
}

export interface PublicAchievements {
  earnedTierCount: number;
  featured: PublicFamily[];
  families: PublicFamily[];
  revealedHidden: AchievementFamily[];
}

/** The typed metadata of an Achievement notification: a single grant, or the launch summary. */
export interface AchievementNotification {
  key: string | null;
  tier: number | null;
  summary: boolean;
  count: number | null;
}

export const EMPTY_PUBLIC_ACHIEVEMENTS: PublicAchievements = {
  earnedTierCount: 0,
  featured: [],
  families: [],
  revealedHidden: [],
};

/**
 * Big moments play as the modal; everything else is a toast: the first print, and anything Gold
 * Silk or above. The launch summary is deliberately not one. It arrives on a user's first visit
 * to a new version, right behind that version's release note, which already announces
 * achievements, so it is a card rather than a second modal.
 */
export function isBigMoment(n: AchievementNotification): boolean {
  return !n.summary && (n.key === 'first-print' || (n.tier ?? 0) >= 3);
}

/** "Earned by 9% of makers", or "fewer than 1%" below that. */
export function rarityText(percent: number | null | undefined): string | null {
  if (percent === null || percent === undefined) return null;
  if (percent < 1) return 'Earned by fewer than 1% of makers';
  return `Earned by ${Math.round(percent)}% of makers`;
}
