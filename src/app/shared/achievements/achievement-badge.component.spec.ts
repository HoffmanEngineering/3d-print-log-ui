import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AchievementCategory } from '../../core/types/achievement';
import {
  AchievementBadgeComponent,
  badgeFillId,
} from './achievement-badge.component';
import { AchievementBadgeDefsComponent } from './achievement-badge-defs.component';
import { ACHIEVEMENT_GLYPHS, REQUIRED_GLYPHS } from './achievement-glyphs';

describe('AchievementBadgeComponent', () => {
  let fixture: ComponentFixture<AchievementBadgeComponent>;
  let el: HTMLElement;

  function render(inputs: Record<string, unknown>): void {
    fixture = TestBed.createComponent(AchievementBadgeComponent);
    fixture.componentRef.setInput('glyph', 'layers');
    fixture.componentRef.setInput('category', AchievementCategory.Milestones);
    fixture.componentRef.setInput('tier', 1);
    fixture.componentRef.setInput('label', 'First Layer');
    for (const [k, v] of Object.entries(inputs)) {
      fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  const shieldFill = () =>
    el.querySelector('path.shield')?.getAttribute('fill') ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AchievementBadgeComponent],
    }).compileComponents();
  });

  it('every REQUIRED_GLYPH has markup', () => {
    for (const glyph of REQUIRED_GLYPHS) {
      expect(ACHIEVEMENT_GLYPHS[glyph]).withContext(glyph).toBeDefined();
      if (glyph !== 'numeral') {
        expect(ACHIEVEMENT_GLYPHS[glyph].length)
          .withContext(glyph)
          .toBeGreaterThan(0);
      }
    }
  });

  it('renders tier fill reference for tier 3', () => {
    render({ tier: 3 });
    expect(shieldFill()).toContain('url(#ach-fill-t3)');
  });

  it('one-time uses category fill', () => {
    render({ category: AchievementCategory.GettingStarted, oneTime: true });
    expect(shieldFill()).toContain('url(#ach-fill-gs)');
    expect(badgeFillId(AchievementCategory.Integrations, 1, true)).toBe(
      'ach-fill-in'
    );
    expect(badgeFillId(AchievementCategory.Hidden, 1, true)).toBe(
      'ach-fill-hi'
    );
  });

  it('locked adds grayscale class', () => {
    render({ locked: true });
    expect(el.classList).toContain('locked');
  });

  it('hidden renders question glyph and no title text', () => {
    render({ hidden: true, label: 'Spaghetti Monster' });
    const svg = el.querySelector('svg[role="img"]')!;
    expect(svg.getAttribute('aria-label')).toBe('Hidden achievement');
    expect(el.textContent ?? '').not.toContain('Spaghetti');
    expect(shieldFill()).toContain('url(#ach-fill-hi)');
    expect(el.querySelectorAll('.glyph > *').length).toBe(
      ACHIEVEMENT_GLYPHS['question'].length
    );
  });

  it('renders initials and numerals as text', () => {
    render({
      glyph: 'initials:Cu',
      category: AchievementCategory.Integrations,
      oneTime: true,
    });
    expect(el.querySelector('.glyph text')?.textContent?.trim()).toBe('Cu');

    render({ glyph: 'numeral', numeral: 250 });
    expect(el.querySelector('.glyph text')?.textContent?.trim()).toBe('250');
  });

  it('renders no element ids', () => {
    render({ tier: 6 });
    expect(el.querySelectorAll('[id]').length).toBe(0);
  });

  it('labels the badge for assistive tech', () => {
    render({ label: 'First Layer' });
    expect(
      el.querySelector('svg[role="img"]')!.getAttribute('aria-label')
    ).toBe('First Layer');
  });
});

describe('AchievementBadgeDefsComponent', () => {
  it('defs renders each id exactly once', async () => {
    await TestBed.configureTestingModule({
      imports: [AchievementBadgeDefsComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(AchievementBadgeDefsComponent);
    fixture.detectChanges();
    const ids = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[id]')
    ).map((n) => n.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
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
      'ach-layers',
    ]) {
      expect(ids).withContext(id).toContain(id);
    }
  });
});
