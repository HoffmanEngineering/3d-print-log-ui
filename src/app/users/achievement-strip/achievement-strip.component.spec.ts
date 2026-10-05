import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { TEST_CATALOG } from '../../achievements/testing/achievement-fixtures';
import { AchievementService } from '../../core/services/achievement.service';
import {
  EMPTY_PUBLIC_ACHIEVEMENTS,
  PublicAchievements,
  PublicFamily,
} from '../../core/types/achievement';
import { AchievementStripComponent } from './achievement-strip.component';

const fam = (key: string, highestTier = 1): PublicFamily => ({
  key,
  highestTier,
  tiers: [
    {
      tier: highestTier,
      unlockedAt: '2026-10-01T00:00:00Z',
      retroactive: false,
    },
  ],
});

describe('AchievementStripComponent', () => {
  let fixture: ComponentFixture<AchievementStripComponent>;

  function render(dto: PublicAchievements): HTMLElement {
    TestBed.configureTestingModule({
      imports: [AchievementStripComponent],
      providers: [
        provideRouter([]),
        {
          provide: AchievementService,
          useValue: { catalog: () => of(TEST_CATALOG), forUser: () => of(dto) },
        },
      ],
    });
    fixture = TestBed.createComponent(AchievementStripComponent);
    fixture.componentRef.setInput('userId', 42);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('hidden when empty', () => {
    const el = render(EMPTY_PUBLIC_ACHIEVEMENTS);
    expect(el.children.length).toBe(0);
  });

  it('renders 4 featured', () => {
    const featured = [
      fam('prints-logged', 2),
      fam('first-print'),
      fam('mcp'),
      fam('maintenance'),
    ];
    const el = render({
      earnedTierCount: 9,
      featured,
      families: featured,
      revealedHidden: [],
    });

    expect(el.querySelectorAll('app-achievement-badge').length).toBe(4);
  });

  it('links to public grid', () => {
    const el = render({
      earnedTierCount: 9,
      featured: [fam('first-print')],
      families: [fam('first-print')],
      revealedHidden: [],
    });

    const link = el.querySelector('a.all') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/users/42/achievements');
    expect(link.textContent).toContain('9 achievements');
  });

  it('names each badge in a tooltip and links it to its detail', () => {
    render({
      earnedTierCount: 9,
      featured: [fam('prints-logged', 2), fam('mcp')],
      families: [fam('prints-logged', 2), fam('mcp')],
      revealedHidden: [],
    });

    const tips = fixture.debugElement
      .queryAll(By.directive(MatTooltip))
      .map((d) => d.injector.get(MatTooltip).message);
    expect(tips).toEqual(['Prolific Printer · Silver PLA: Do 25', 'mcp: Do 1']);

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a.badge')
    ).map((a) => a.getAttribute('href'));
    expect(links).toEqual([
      '/users/42/achievements?badge=prints-logged',
      '/users/42/achievements?badge=mcp',
    ]);
  });
});
