import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PushRegistrationService } from './push-registration.service';
import { NativeBridgeService } from './native-bridge.service';
import { NotificationService } from './notification.service';

describe('PushRegistrationService', () => {
  let bridge: MockedObject<NativeBridgeService>;
  let notifications: MockedObject<NotificationService>;
  let router: MockedObject<Router>;
  let service: PushRegistrationService;

  beforeEach(() => {
    bridge = {
      isAvailable: vi.fn().mockName('NativeBridgeService.isAvailable'),
      registerForPush: vi.fn().mockName('NativeBridgeService.registerForPush'),
      unregisterForPush: vi
        .fn()
        .mockName('NativeBridgeService.unregisterForPush'),
      consumePendingTap: vi
        .fn()
        .mockName('NativeBridgeService.consumePendingTap'),
    } as unknown as MockedObject<NativeBridgeService>;
    bridge.consumePendingTap.mockResolvedValue(null);
    notifications = {
      markAsRead: vi.fn().mockName('NotificationService.markAsRead'),
    } as unknown as MockedObject<NotificationService>;
    notifications.markAsRead.mockReturnValue(of(undefined));
    router = {
      navigate: vi.fn().mockName('Router.navigate'),
    } as unknown as MockedObject<Router>;
    router.navigate.mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: NativeBridgeService, useValue: bridge },
        { provide: NotificationService, useValue: notifications },
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(PushRegistrationService);
  });

  it('does nothing when the native bridge is absent', async () => {
    bridge.isAvailable.mockReturnValue(false);
    await service.onAuthenticated('bearer-abc');
    expect(bridge.registerForPush).not.toHaveBeenCalled();
  });

  it('registers once authenticated', async () => {
    bridge.isAvailable.mockReturnValue(true);
    bridge.registerForPush.mockResolvedValue(true);
    await service.onAuthenticated('bearer-abc');
    expect(bridge.registerForPush).toHaveBeenCalledWith('bearer-abc');
  });

  it('does not re-register for the same bearer token', async () => {
    bridge.isAvailable.mockReturnValue(true);
    bridge.registerForPush.mockResolvedValue(true);
    await service.onAuthenticated('bearer-abc');
    await service.onAuthenticated('bearer-abc');
    expect(bridge.registerForPush).toHaveBeenCalledTimes(1);
  });

  it('retries on a later authentication event after a failure', async () => {
    bridge.isAvailable.mockReturnValue(true);
    bridge.registerForPush.mockResolvedValue(false);
    await service.onAuthenticated('bearer-abc');
    bridge.registerForPush.mockResolvedValue(true);
    await service.onAuthenticated('bearer-abc');
    expect(bridge.registerForPush).toHaveBeenCalledTimes(2);
  });

  it('marks a tapped notification read and routes to the print', async () => {
    bridge.isAvailable.mockReturnValue(true);
    bridge.consumePendingTap.mockResolvedValue({
      notificationId: 'abc',
      printId: 42,
    });

    await service.handlePendingTap();

    expect(notifications.markAsRead).toHaveBeenCalledWith('abc');
    expect(router.navigate).toHaveBeenCalledWith(['/prints', 42]);
  });

  it('does not navigate when there is no pending tap', async () => {
    bridge.isAvailable.mockReturnValue(true);

    await service.handlePendingTap();

    expect(notifications.markAsRead).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears registration state on logout so the next login re-registers', async () => {
    bridge.isAvailable.mockReturnValue(true);
    bridge.registerForPush.mockResolvedValue(true);
    bridge.unregisterForPush.mockResolvedValue(true);

    await service.onAuthenticated('bearer-abc');
    await service.onLogout('bearer-abc');
    await service.onAuthenticated('bearer-abc');

    expect(bridge.unregisterForPush).toHaveBeenCalledWith('bearer-abc');
    expect(bridge.registerForPush).toHaveBeenCalledTimes(2);
  });

  /**
   * The tap is claimed destructively — native clears it with getAndSet(null) — so a failure
   * anywhere after that point loses it for good. Marking read is housekeeping; routing the
   * user to the print they tapped is the whole feature, and must not depend on the API leg.
   */
  it('still navigates when marking the notification read fails', async () => {
    bridge.consumePendingTap.mockResolvedValue({
      notificationId: 'abc',
      printId: 42,
    });
    notifications.markAsRead.mockReturnValue(
      throwError(() => new Error('offline'))
    );

    await service.handlePendingTap();

    expect(router.navigate).toHaveBeenCalledWith(['/prints', 42]);
  });
});
