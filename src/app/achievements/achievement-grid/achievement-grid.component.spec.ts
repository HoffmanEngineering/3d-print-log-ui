import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  AchievementCategory,
  AchievementFamily,
  AchievementProgress,
  EarnedTier,
} from '../../core/types/achievement';
import {
  testFamily as family,
  TEST_CATALOG,
} from '../testing/achievement-fixtures';
import { AchievementGridComponent } from './achievement-grid.component';

const earnedTier = (tier: number): EarnedTier => ({
  tier,
  unlockedAt: '2026-10-01T00:00:00Z',
  retroactive: false,
});

describe('AchievementGridComponent', () => {
  let fixture: ComponentFixture<AchievementGridComponent>;
  let el: HTMLElement;

  function render(opts: {
    earned?: Map<string, EarnedTier[]>;
    progress?: Map<string, AchievementProgress | null>;
    revealed?: AchievementFamily[];
  }): void {
    fixture = TestBed.createComponent(AchievementGridComponent);
    fixture.componentRef.setInput('catalog', TEST_CATALOG);
    fixture.componentRef.setInput('earned', opts.earned ?? new Map());
    fixture.componentRef.setInput('progress', opts.progress ?? new Map());
    fixture.componentRef.setInput('revealedHidden', opts.revealed ?? []);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AchievementGridComponent],
    }).compileComponents();
  });

  it('groups by category in order', () => {
    render({});
    const headings = Array.from(el.querySelectorAll('h2')).map((h) =>
      h.textContent?.trim()
    );
    expect(headings).toEqual([
      'Getting started',
      'Milestones',
      'Streaks',
      'Integrations',
      'Community and care',
      'Hidden',
    ]);
  });

  it('renders hiddenCount minus revealed as ??? cells', () => {
    render({
      revealed: [
        family(
          'spaghetti',
          AchievementCategory.Hidden,
          [1],
          'Spaghetti Monster'
        ),
      ],
    });
    const hidden = el.querySelector('section.hidden')!;
    expect(hidden.querySelectorAll('.cell.secret').length).toBe(3);
    expect(hidden.textContent).toContain('Spaghetti Monster');
    expect(hidden.textContent).toContain('???');
  });

  it('locked cell shows progress bar from progress map', () => {
    render({
      earned: new Map([['prints-logged', [earnedTier(1)]]]),
      progress: new Map<string, AchievementProgress | null>([
        ['prints-logged', { best: 15, current: 15, nextThreshold: 25 }],
      ]),
    });
    const cell = el.querySelector('[data-key="prints-logged"]')!;
    expect(cell.querySelector('mat-progress-bar')).not.toBeNull();
    expect(cell.textContent).toContain('15 / 25');
    expect(cell.textContent).toContain('Bronze PLA');
  });

  it('no progress bars when progress map empty (public mode)', () => {
    render({ earned: new Map([['prints-logged', [earnedTier(1)]]]) });
    expect(el.querySelectorAll('mat-progress-bar').length).toBe(0);
  });

  it('marks unearned families as locked', () => {
    render({ earned: new Map([['first-print', [earnedTier(1)]]]) });
    expect(
      el.querySelector('[data-key="first-print"] app-achievement-badge')!
        .classList
    ).not.toContain('locked');
    expect(
      el.querySelector('[data-key="mcp"] app-achievement-badge')!.classList
    ).toContain('locked');
  });

  it('emits selected on click', () => {
    render({});
    let selected: string | undefined;
    fixture.componentInstance.selected.subscribe((k) => (selected = k));

    (el.querySelector('[data-key="mcp"]') as HTMLButtonElement).click();

    expect(selected).toBe('mcp');
  });
});
