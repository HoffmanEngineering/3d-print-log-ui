import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import {
  NotificationSummaryDto,
  NotificationType,
} from '../types/notification';
import { PagedList } from '../types/paging';
import {
  AchievementCelebrationService,
  CelebrationItem,
  CelebrationPresenter,
  PageVisibility,
  WEB_LOCKS,
} from './achievement-celebration.service';
import { LoggingService } from './logging.service';
import { NotificationService } from './notification.service';
import { UserSettingService, UserSettingType } from './user-setting.service';

function note(
  id: string,
  key: string | null,
  tier: number | null,
  summary = false
): NotificationSummaryDto {
  return {
    id,
    type: NotificationType.Achievement,
    title: `Achievement unlocked: ${key}`,
    message: 'msg',
    isRead: false,
    createdDate: new Date(),
    actionUrl: `/achievements?badge=${key}`,
    printId: null,
    printTitle: null,
    triggeredByUser: null,
    achievement: { key, tier, summary, count: summary ? 5 : null },
  };
}

function page(
  items: NotificationSummaryDto[],
  currentPage = 1,
  totalPages = 1
): PagedList<NotificationSummaryDto> {
  return {
    items,
    paging: { currentPage, totalPages, pageSize: 20, totalCount: items.length },
  };
}

class FakePresenter extends CelebrationPresenter {
  toasts: CelebrationItem[][] = [];
  toastOptions: { quiet: boolean }[] = [];
  dialogs: CelebrationItem[] = [];
  /** When set, toasts stay open until the test calls the resolver. */
  holdToasts = false;
  closeToast: () => void = () => undefined;
  toast(items: CelebrationItem[], options: { quiet: boolean }): Promise<void> {
    this.toasts.push(items);
    this.toastOptions.push(options);
    if (this.holdToasts) {
      return new Promise((resolve) => (this.closeToast = resolve));
    }
    return Promise.resolve();
  }
  dialog(item: CelebrationItem): Promise<void> {
    this.dialogs.push(item);
    return Promise.resolve();
  }
}

describe('AchievementCelebrationService', () => {
  let service: AchievementCelebrationService;
  let presenter: FakePresenter;
  let notifications: {
    unreadAchievementCount: ReturnType<typeof signal<number>>;
    pollTick: ReturnType<typeof signal<number>>;
    getNotifications: jasmine.Spy;
    markMultipleAsRead: jasmine.Spy;
    refreshUnreadCount: jasmine.Spy;
  };
  let celebrations: string | null;
  let locks: { request: jasmine.Spy } | null;
  let visible: boolean;
  let becomeVisible: () => void;

  async function settle(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      TestBed.tick();
      for (let j = 0; j < 20; j++) await Promise.resolve();
    }
  }

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: NotificationService, useValue: notifications },
        {
          provide: UserSettingService,
          useValue: {
            getCurrentUsersSettingByType: (t: UserSettingType) =>
              Promise.resolve(
                t === UserSettingType.Achievements_Celebrations && celebrations
                  ? { value: celebrations }
                  : null
              ),
          },
        },
        { provide: CelebrationPresenter, useValue: presenter },
        { provide: WEB_LOCKS, useFactory: () => locks },
        {
          provide: PageVisibility,
          useValue: {
            isVisible: () => visible,
            whenVisible: () =>
              new Promise<void>((resolve) => (becomeVisible = resolve)),
          },
        },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
    });
    service = TestBed.inject(AchievementCelebrationService);
    service.start();
  }

  beforeEach(() => {
    presenter = new FakePresenter();
    notifications = {
      unreadAchievementCount: signal(0),
      pollTick: signal(0),
      getNotifications: jasmine.createSpy('getNotifications'),
      markMultipleAsRead: jasmine
        .createSpy('markMultipleAsRead')
        .and.returnValue(of(undefined)),
      refreshUnreadCount: jasmine.createSpy('refreshUnreadCount'),
    };
    celebrations = null;
    locks = null;
    visible = true;
  });

  afterEach(() => service?.stop());

  function unread(count: number): void {
    notifications.unreadAchievementCount.set(count);
    notifications.pollTick.update((t) => t + 1);
  }

  it('fetches when unreadAchievementCount > 0 even if total unchanged', async () => {
    notifications.getNotifications.and.returnValue(
      of(page([note('a', 'first-printer', 1)]))
    );
    setup();

    unread(1);
    await settle();

    expect(notifications.getNotifications).toHaveBeenCalledWith(
      1,
      20,
      true,
      NotificationType.Achievement
    );
    expect(presenter.toasts.length).toBe(1);
  });

  it('pages until exhausted', async () => {
    const first = Array.from({ length: 20 }, (_, i) =>
      note(`p1-${i}`, 'materials-owned', 1)
    );
    const second = Array.from({ length: 5 }, (_, i) =>
      note(`p2-${i}`, 'projects', 1)
    );
    notifications.getNotifications.and.callFake((p: number) =>
      of(p === 1 ? page(first, 1, 2) : page(second, 2, 2))
    );
    setup();

    unread(25);
    await settle();

    expect(notifications.getNotifications).toHaveBeenCalledTimes(2);
    expect(presenter.toasts.flat().length).toBe(25);
  });

  it('off does not fetch', async () => {
    celebrations = 'off';
    setup();

    unread(2);
    await settle();

    expect(notifications.getNotifications).not.toHaveBeenCalled();
  });

  it('switching off→on plays backlog', async () => {
    celebrations = 'off';
    notifications.getNotifications.and.returnValue(
      of(page([note('a', 'first-printer', 1)]))
    );
    setup();
    unread(1);
    await settle();
    expect(notifications.getNotifications).not.toHaveBeenCalled();

    celebrations = 'on';
    unread(1);
    await settle();

    expect(notifications.getNotifications).toHaveBeenCalled();
    expect(presenter.toasts.length).toBe(1);
  });

  it('merges items within one cycle into one toast', async () => {
    notifications.getNotifications.and.returnValue(
      of(
        page([
          note('a', 'first-printer', 1),
          note('b', 'first-material', 1),
          note('c', 'projects', 1),
        ])
      )
    );
    setup();

    unread(3);
    await settle();

    expect(presenter.toasts.length).toBe(1);
    // The API lists newest first; a backlog plays in the order it was earned.
    expect(presenter.toasts[0].map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });

  it('big moment opens dialog', async () => {
    notifications.getNotifications.and.returnValue(
      of(page([note('big', 'prints-logged', 3), note('small', 'projects', 1)]))
    );
    setup();

    unread(2);
    await settle();

    expect(presenter.dialogs.map((d) => d.id)).toEqual(['big']);
    expect(presenter.toasts.flat().map((t) => t.id)).toEqual(['small']);
  });

  it('quiet never opens dialog', async () => {
    celebrations = 'quiet';
    notifications.getNotifications.and.returnValue(
      of(page([note('big', 'first-print', 1), note('sum', null, null, true)]))
    );
    setup();

    unread(2);
    await settle();

    expect(presenter.dialogs.length).toBe(0);
    expect(presenter.toasts.flat().length).toBe(2);
  });

  it('plays only in the tab holding the Web Lock', async () => {
    locks = {
      request: jasmine
        .createSpy('request')
        .and.callFake((_n: string, _o: unknown, cb: (l: unknown) => unknown) =>
          cb(null)
        ),
    };
    setup();

    unread(1);
    await settle();

    expect(locks.request).toHaveBeenCalledWith(
      'achievement-celebration',
      { ifAvailable: true },
      jasmine.any(Function)
    );
    expect(notifications.getNotifications).not.toHaveBeenCalled();
  });

  it('retries the lock on the next poll while count unchanged', async () => {
    let attempt = 0;
    locks = {
      request: jasmine
        .createSpy('request')
        .and.callFake((_n: string, _o: unknown, cb: (l: unknown) => unknown) =>
          cb(++attempt === 1 ? null : {})
        ),
    };
    notifications.getNotifications.and.returnValue(
      of(page([note('a', 'first-printer', 1), note('b', 'projects', 1)]))
    );
    setup();

    unread(2);
    await settle();
    expect(notifications.getNotifications).not.toHaveBeenCalled();

    unread(2); // same count, next poll
    await settle();

    expect(locks.request).toHaveBeenCalledTimes(2);
    expect(presenter.toasts.length).toBe(1);
    expect(notifications.markMultipleAsRead).toHaveBeenCalledWith(['b', 'a']);
  });

  it('marks 150 played items read together', async () => {
    const items = Array.from({ length: 150 }, (_, i) =>
      note(`n${i}`, 'projects', 1)
    );
    notifications.getNotifications.and.callFake((p: number) =>
      of(page(items.slice((p - 1) * 20, p * 20), p, 8))
    );
    setup();

    unread(150);
    await settle();

    const ids = notifications.markMultipleAsRead.calls
      .allArgs()
      .flatMap((a) => a[0]);
    expect(ids.length).toBe(150);
  });

  it('marks played notifications read and refreshes the count', async () => {
    notifications.getNotifications.and.returnValue(
      of(page([note('a', 'first-printer', 1)]))
    );
    setup();

    unread(1);
    await settle();

    expect(notifications.markMultipleAsRead).toHaveBeenCalledWith(['a']);
    expect(notifications.refreshUnreadCount).toHaveBeenCalled();
  });

  it('waits while document hidden', async () => {
    visible = false;
    notifications.getNotifications.and.returnValue(
      of(page([note('a', 'first-printer', 1)]))
    );
    setup();

    unread(1);
    await settle();
    expect(notifications.getNotifications).not.toHaveBeenCalled();

    visible = true;
    becomeVisible();
    await settle();

    expect(notifications.getNotifications).toHaveBeenCalled();
  });

  it('quiet toasts are told they are quiet', async () => {
    celebrations = 'quiet';
    notifications.getNotifications.and.returnValue(
      of(page([note('a', 'first-printer', 1)]))
    );
    setup();

    unread(1);
    await settle();

    expect(presenter.toastOptions).toEqual([{ quiet: true }]);
  });

  it('marks a toast read only once it has closed', async () => {
    presenter.holdToasts = true;
    notifications.getNotifications.and.returnValue(
      of(page([note('a', 'first-printer', 1)]))
    );
    setup();

    unread(1);
    await settle();
    expect(presenter.toasts.length).toBe(1);
    expect(notifications.markMultipleAsRead).not.toHaveBeenCalled();

    // A second poll while it is still showing neither replaces it nor re-fetches.
    unread(1);
    await settle();
    expect(presenter.toasts.length).toBe(1);

    presenter.closeToast();
    await settle();
    expect(notifications.markMultipleAsRead).toHaveBeenCalledWith(['a']);
  });

  it('a failed receipt is retried without replaying the celebration', async () => {
    notifications.getNotifications.and.returnValue(
      of(page([note('a', 'first-printer', 1)]))
    );
    notifications.markMultipleAsRead.and.returnValues(
      throwError(() => new Error('503')),
      of(undefined)
    );
    setup();

    unread(1);
    await settle();
    unread(1);
    await settle();

    expect(presenter.toasts.length).toBe(1);
    expect(notifications.markMultipleAsRead).toHaveBeenCalledTimes(2);
    expect(notifications.markMultipleAsRead.calls.mostRecent().args[0]).toEqual(
      ['a']
    );
  });

  it('consumes malformed achievement notifications without showing them', async () => {
    const malformed = { ...note('bad', null, null), achievement: null };
    notifications.getNotifications.and.returnValue(of(page([malformed])));
    setup();

    unread(1);
    await settle();

    expect(presenter.toasts.length).toBe(0);
    expect(presenter.dialogs.length).toBe(0);
    expect(notifications.markMultipleAsRead).toHaveBeenCalledWith(['bad']);
  });

  it('re-reads the celebration level after waiting to become visible', async () => {
    visible = false;
    notifications.getNotifications.and.returnValue(
      of(page([note('a', 'first-printer', 1)]))
    );
    setup();
    unread(1);
    await settle();

    celebrations = 'off';
    visible = true;
    becomeVisible();
    await settle();

    expect(notifications.getNotifications).not.toHaveBeenCalled();
  });

  it('stop abandons a cycle that is waiting to become visible', async () => {
    visible = false;
    notifications.getNotifications.and.returnValue(
      of(page([note('a', 'first-printer', 1)]))
    );
    setup();
    unread(1);
    await settle();

    service.stop();
    visible = true;
    becomeVisible();
    await settle();

    expect(notifications.getNotifications).not.toHaveBeenCalled();
  });

  it('ignores a zero count', async () => {
    setup();

    unread(0);
    await settle();

    expect(notifications.getNotifications).not.toHaveBeenCalled();
  });
});
