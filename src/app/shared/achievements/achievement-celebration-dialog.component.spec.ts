import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AchievementService } from '../../core/services/achievement.service';
import { CelebrationItem } from '../../core/services/achievement-celebration.service';
import {
  AchievementCategory,
  AchievementFamily,
  MyAchievements,
} from '../../core/types/achievement';
import { AchievementCelebrationDialogComponent } from './achievement-celebration-dialog.component';
import {
  AchievementVisualsService,
  toVisual,
} from './achievement-visuals.service';

const prints: AchievementFamily = {
  key: 'prints-logged',
  category: AchievementCategory.Milestones,
  glyph: 'numeral',
  title: 'Prolific Printer',
  hintOrder: 0,
  tiers: [10, 25, 50].map((t, i) => ({
    tier: i + 1,
    threshold: t,
    description: `Log ${t} prints.`,
    rarityPercent: i === 2 ? 0.4 : 30,
  })),
};

function families(n: number): AchievementFamily[] {
  return Array.from({ length: n }, (_, i) => ({
    ...prints,
    key: `fam-${i}`,
    tiers: [prints.tiers[0]],
  }));
}

describe('AchievementCelebrationDialogComponent', () => {
  let fixture: ComponentFixture<AchievementCelebrationDialogComponent>;
  let router: jasmine.SpyObj<Router>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<unknown>>;

  async function create(
    data: CelebrationItem,
    me?: MyAchievements
  ): Promise<HTMLElement> {
    const catalog = {
      version: 1,
      hiddenCount: 4,
      families: [prints, ...families(12)],
    };
    await TestBed.configureTestingModule({
      imports: [AchievementCelebrationDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: Router, useValue: router },
        {
          provide: AchievementService,
          useValue: { catalog: () => of(catalog), me: () => of(me) },
        },
        {
          provide: AchievementVisualsService,
          useValue: {
            lookup: (key: string) =>
              of(
                toVisual(catalog.families.find((f) => f.key === key) ?? prints)
              ),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AchievementCelebrationDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<unknown>>('MatDialogRef', [
      'close',
    ]);
  });

  it('shows tier name, title, description and rarity for a grant', async () => {
    const el = await create({
      id: 'n1',
      achievement: {
        key: 'prints-logged',
        tier: 3,
        summary: false,
        count: null,
      },
      title: 'Achievement unlocked: Prolific Printer',
      message: "Gold Silk · You've logged 50 prints.",
    });

    expect(el.textContent).toContain('Gold Silk');
    expect(el.textContent).toContain('Prolific Printer');
    expect(el.textContent).toContain("You've logged 50 prints.");
    expect(el.textContent).toContain('Earned by fewer than 1% of makers');
  });

  it('summary shows up to 8 badges plus the rest as +N more', async () => {
    const me: MyAchievements = {
      earnedTierCount: 12,
      totalTierCount: 90,
      families: families(12).map((f) => ({
        key: f.key,
        tiers: [
          { tier: 1, unlockedAt: '2026-10-04T00:00:00Z', retroactive: true },
        ],
        progress: null,
      })),
      revealedHidden: [],
      nextHint: null,
    };
    const el = await create(
      {
        id: 's',
        achievement: { key: null, tier: null, summary: true, count: 12 },
        title: "You've earned 12 achievements",
        message: null,
      },
      me
    );

    expect(
      el.querySelectorAll('.summary-grid app-achievement-badge').length
    ).toBe(8);
    expect(el.textContent).toContain('+4 more');
    expect(el.textContent).toContain("You've earned 12 achievements");
  });

  it('View collection navigates and closes', async () => {
    const el = await create({
      id: 'n1',
      achievement: { key: 'first-print', tier: 1, summary: false, count: null },
      title: 'Achievement unlocked: First Layer',
      message: 'You logged your first print.',
    });

    (el.querySelector('button.view') as HTMLButtonElement).click();

    expect(dialogRef.close).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/achievements'], {
      queryParams: { badge: 'first-print' },
    });
  });
});
