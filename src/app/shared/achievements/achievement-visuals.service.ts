import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap } from 'rxjs';

import { AchievementService } from '../../core/services/achievement.service';
import {
  AchievementCategory,
  AchievementFamily,
} from '../../core/types/achievement';

/** Everything needed to draw one badge. */
export interface BadgeVisual {
  key: string;
  title: string;
  glyph: string;
  category: AchievementCategory;
  oneTime: boolean;
  family: AchievementFamily | null;
}

/** What a badge looks like when the key can't be resolved: the hidden "?" badge. */
export const UNKNOWN_BADGE: BadgeVisual = {
  key: '',
  title: 'Achievement',
  glyph: 'question',
  category: AchievementCategory.Hidden,
  oneTime: true,
  family: null,
};

export function toVisual(family: AchievementFamily): BadgeVisual {
  return {
    key: family.key,
    title: family.title,
    glyph: family.glyph,
    category: family.category,
    oneTime: family.tiers.length === 1,
    family,
  };
}

/**
 * Resolves an achievement key to its art. The public catalog covers everything except hidden
 * badges, which only the earner's own `me()` reveals, so that is fetched only when a key misses.
 */
@Injectable({ providedIn: 'root' })
export class AchievementVisualsService {
  private readonly achievements = inject(AchievementService);

  lookup(key: string | null): Observable<BadgeVisual> {
    if (!key) {
      return of(UNKNOWN_BADGE);
    }

    return this.achievements.catalog().pipe(
      switchMap((catalog) => {
        const family = catalog.families.find((f) => f.key === key);
        if (family) {
          return of(toVisual(family));
        }
        return this.revealedHidden().pipe(
          map((hidden) => {
            const match = hidden.find((f) => f.key === key);
            return match ? toVisual(match) : { ...UNKNOWN_BADGE, key };
          })
        );
      }),
      catchError(() => of({ ...UNKNOWN_BADGE, key }))
    );
  }

  /** Not cached: a hidden badge can be earned at any time, and misses are rare. */
  private revealedHidden(): Observable<AchievementFamily[]> {
    return this.achievements.me().pipe(
      map((me) => me.revealedHidden),
      catchError(() => of([]))
    );
  }
}
