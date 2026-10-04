import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';

import { TEST_CATALOG } from '../../achievements/testing/achievement-fixtures';
import { AchievementCelebrationService } from '../../core/services/achievement-celebration.service';
import { AchievementService } from '../../core/services/achievement.service';
import { NotificationService } from '../../core/services/notification.service';
import { TimeZoneSyncService } from '../../core/services/time-zone-sync.service';
import {
  NotificationSummaryDto,
  NotificationType,
} from '../../core/types/notification';
import { NotificationBellComponent } from './notification-bell.component';

function note(over: Partial<NotificationSummaryDto>): NotificationSummaryDto {
  return {
    id: 'n1',
    type: NotificationType.Achievement,
    title: 'Achievement unlocked: First Layer',
    message: 'You logged your first print.',
    isRead: false,
    createdDate: new Date(),
    actionUrl: '/achievements?badge=first-print',
    printId: null,
    printTitle: null,
    triggeredByUser: null,
    achievement: { key: 'first-print', tier: 1, summary: false, count: null },
    ...over,
  };
}

describe('NotificationBellComponent', () => {
  let fixture: ComponentFixture<NotificationBellComponent>;
  let component: NotificationBellComponent;
  const celebrations = jasmine.createSpyObj<AchievementCelebrationService>(
    'AchievementCelebrationService',
    ['start', 'stop']
  );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: NotificationService,
          useValue: {
            unreadCount: signal(0),
            hasUnread: signal(false),
            startPolling: () => undefined,
            getNotifications: () => of({ items: [], paging: {} }),
          },
        },
        {
          provide: AchievementService,
          useValue: { catalog: () => of(TEST_CATALOG) },
        },
        { provide: AchievementCelebrationService, useValue: celebrations },
        {
          provide: TimeZoneSyncService,
          useValue: { syncOnce: () => Promise.resolve() },
        },
        { provide: ToastrService, useValue: {} },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts celebrations, and stops them when the bell goes away', () => {
    expect(celebrations.start).toHaveBeenCalled();

    fixture.destroy();

    expect(celebrations.stop).toHaveBeenCalled();
  });

  it('achievement notification renders sm badge from catalog', () => {
    const badge = component.achievementBadge(note({}))!;
    expect(badge.glyph).toBe('layers');
    expect(badge.oneTime).toBeTrue();
    expect(badge.title).toBe('First Layer');
  });

  it('summary renders stack glyph', () => {
    const badge = component.achievementBadge(
      note({ achievement: { key: null, tier: null, summary: true, count: 12 } })
    )!;
    expect(badge.glyph).toBe('stack');
  });

  it('unknown key falls back to generic icon', () => {
    const badge = component.achievementBadge(
      note({
        achievement: { key: 'night-owl', tier: 1, summary: false, count: null },
      })
    )!;
    expect(badge.glyph).toBe('question');
  });

  it('non-achievement notifications keep their material icon', () => {
    expect(
      component.achievementBadge(
        note({ type: NotificationType.PrintFailed, achievement: null })
      )
    ).toBeNull();
  });

  it('splits an action URL query string into query params', () => {
    expect(component.getUrlPath('/achievements?badge=first-print')).toBe(
      '/achievements'
    );
    expect(
      component.getUrlQueryParams('/achievements?badge=first-print')
    ).toEqual({
      badge: 'first-print',
    });
    expect(component.getUrlPath('/prints/4#comment-9')).toBe('/prints/4');
    expect(component.getUrlQueryParams('/prints/4#comment-9')).toBeNull();
  });
});
