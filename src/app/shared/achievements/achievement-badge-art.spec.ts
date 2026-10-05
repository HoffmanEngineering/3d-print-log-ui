import { AchievementCategory } from '../../core/types/achievement';
import {
  BADGE_DEFS_SVG,
  BADGE_PALETTE,
  badgeFillId,
  badgeFillSuffix,
} from './achievement-badge-art';

describe('achievement-badge-art', () => {
  const FILL_IDS = [
    'ach-fill-t1',
    'ach-fill-t2',
    'ach-fill-t3',
    'ach-fill-t4',
    'ach-fill-t5',
    'ach-fill-t6',
    'ach-fill-gs',
    'ach-fill-in',
    'ach-fill-co',
    'ach-fill-hi',
  ];

  it('defines the layer pattern and every fill the badges paint with', () => {
    expect(BADGE_DEFS_SVG).toContain('id="ach-layers"');
    for (const id of FILL_IDS) {
      expect(BADGE_DEFS_SVG).withContext(id).toContain(`id="${id}"`);
      expect(BADGE_PALETTE[id]).withContext(id).toBeDefined();
    }
  });

  it('picks the fill a badge paints with', () => {
    expect(badgeFillId(AchievementCategory.Hidden, 3, false)).toBe(
      'ach-fill-hi'
    );
    expect(badgeFillId(AchievementCategory.Milestones, 9, false)).toBe(
      'ach-fill-t6'
    );
    expect(badgeFillId(AchievementCategory.Integrations, 1, true)).toBe(
      'ach-fill-in'
    );
  });

  it('shortens a fill id to the suffix email asset names use', () => {
    expect(badgeFillSuffix('ach-fill-gs')).toBe('gs');
    expect(badgeFillSuffix('ach-fill-t3')).toBe('t3');
  });
});
