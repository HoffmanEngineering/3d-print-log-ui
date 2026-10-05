import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  AchievementCategory,
  AchievementFamily,
  EarnedTier,
} from '../../core/types/achievement';
import { AchievementDetailComponent } from './achievement-detail.component';

const streak: AchievementFamily = {
  key: 'daily-streak',
  category: AchievementCategory.Streaks,
  glyph: 'flame',
  title: 'On a Roll',
  hintOrder: 0,
  tiers: [
    {
      tier: 1,
      threshold: 3,
      description: 'Print 3 days in a row.',
      rarityPercent: 42,
    },
    {
      tier: 2,
      threshold: 5,
      description: 'Print 5 days in a row.',
      rarityPercent: 0.3,
    },
  ],
};

describe('AchievementDetailComponent', () => {
  let fixture: ComponentFixture<AchievementDetailComponent>;

  function render(
    earned: EarnedTier[],
    progress = { best: 4, current: 2, nextThreshold: 5 }
  ): HTMLElement {
    fixture = TestBed.createComponent(AchievementDetailComponent);
    fixture.componentRef.setInput('family', streak);
    fixture.componentRef.setInput('earned', earned);
    fixture.componentRef.setInput('progress', progress);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AchievementDetailComponent],
    }).compileComponents();
  });

  it('rarity under 1% copy', () => {
    const el = render([]);
    expect(el.textContent).toContain('Earned by 42% of makers');
    expect(el.textContent).toContain('Earned by fewer than 1% of makers');
  });

  it('retroactive note', () => {
    const el = render([
      { tier: 1, unlockedAt: '2026-10-04T12:00:00Z', retroactive: true },
    ]);
    expect(el.textContent).toContain('Earned before achievements existed');
  });

  it('shows the tier ladder with descriptions and which tiers are earned', () => {
    const el = render([
      { tier: 1, unlockedAt: '2026-10-04T12:00:00Z', retroactive: false },
    ]);
    const rungs = el.querySelectorAll('li.rung');
    expect(rungs.length).toBe(2);
    expect(rungs[0].classList).toContain('earned');
    expect(rungs[1].classList).not.toContain('earned');
    expect(rungs[0].textContent).toContain('Bronze PLA');
    expect(rungs[1].textContent).toContain('Print 5 days in a row.');
  });

  it('shows current and best streak for streak families', () => {
    const el = render([]);
    expect(el.textContent).toContain('Current streak: 2');
    expect(el.textContent).toContain('Best: 4');
  });
});
