import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { CelebrationItem } from '../../core/services/achievement-celebration.service';
import { LoggingService } from '../../core/services/logging.service';
import { AchievementCategory } from '../../core/types/achievement';
import { AchievementToastComponent } from './achievement-toast.component';
import { AchievementVisualsService } from './achievement-visuals.service';

function item(id: string, key: string, tier = 1): CelebrationItem {
  return {
    id,
    achievement: { key, tier, summary: false, count: null },
    title: `Achievement unlocked: ${key}`,
    message: `Bronze PLA · ${key}`,
  };
}

describe('AchievementToastComponent', () => {
  let fixture: ComponentFixture<AchievementToastComponent>;
  let router: jasmine.SpyObj<Router>;
  let logging: jasmine.SpyObj<LoggingService>;

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);
    await TestBed.configureTestingModule({
      imports: [AchievementToastComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: LoggingService, useValue: logging },
        {
          provide: AchievementVisualsService,
          useValue: {
            lookup: (key: string) =>
              of({
                key,
                title: 'First Layer',
                glyph: 'layers',
                category: AchievementCategory.GettingStarted,
                oneTime: true,
                family: null,
              }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AchievementToastComponent);
  });

  it('renders role=status and navigates on click', () => {
    fixture.componentRef.setInput('items', [item('a', 'first-print')]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const status = el.querySelector('[role="status"]')!;
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('First Layer');

    (el.querySelector('button.toast-body') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith(['/achievements'], {
      queryParams: { badge: 'first-print' },
    });
    expect(logging.logEvent).toHaveBeenCalledWith(
      'AchievementCelebration_Clicked',
      jasmine.objectContaining({ key: 'first-print', variant: 'card' })
    );
  });

  it('merges several items into one count with up to three badges', () => {
    fixture.componentRef.setInput('items', [
      item('a', 'first-print'),
      item('b', 'first-printer'),
      item('c', 'projects'),
      item('d', 'materials-owned'),
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('4 achievements unlocked');
    expect(el.querySelectorAll('app-achievement-badge').length).toBe(3);
  });

  it('closes itself after 6 seconds unless hovered', () => {
    jasmine.clock().install();
    try {
      fixture.componentRef.setInput('items', [item('a', 'first-print')]);
      let closed = 0;
      fixture.componentInstance.closed.subscribe(() => closed++);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      el.querySelector('.toast')!.dispatchEvent(new Event('mouseenter'));
      jasmine.clock().tick(7000);
      expect(closed).toBe(0);

      el.querySelector('.toast')!.dispatchEvent(new Event('mouseleave'));
      jasmine.clock().tick(6001);
      expect(closed).toBe(1);
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
