import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { PushRegistrationService } from './push-registration.service';
import { NativeBridgeService } from './native-bridge.service';
import { NotificationService } from './notification.service';

describe('PushRegistrationService', () => {
  let bridge: jasmine.SpyObj<NativeBridgeService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let router: jasmine.SpyObj<Router>;
  let service: PushRegistrationService;

  beforeEach(() => {
    bridge = jasmine.createSpyObj('NativeBridgeService', [
      'isAvailable',
      'registerForPush',
      'unregisterForPush',
      'consumePendingTap',
    ]);
    bridge.consumePendingTap.and.resolveTo(null);
    notifications = jasmine.createSpyObj('NotificationService', ['markAsRead']);
    notifications.markAsRead.and.returnValue(of(undefined));
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

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
    bridge.isAvailable.and.returnValue(false);
    await service.onAuthenticated('bearer-abc');
    expect(bridge.registerForPush).not.toHaveBeenCalled();
  });

  it('registers once authenticated', async () => {
    bridge.isAvailable.and.returnValue(true);
    bridge.registerForPush.and.resolveTo(true);
    await service.onAuthenticated('bearer-abc');
    expect(bridge.registerForPush).toHaveBeenCalledWith('bearer-abc');
  });

  it('does not re-register for the same bearer token', async () => {
    bridge.isAvailable.and.returnValue(true);
    bridge.registerForPush.and.resolveTo(true);
    await service.onAuthenticated('bearer-abc');
    await service.onAuthenticated('bearer-abc');
    expect(bridge.registerForPush).toHaveBeenCalledTimes(1);
  });

  it('retries on a later authentication event after a failure', async () => {
    bridge.isAvailable.and.returnValue(true);
    bridge.registerForPush.and.resolveTo(false);
    await service.onAuthenticated('bearer-abc');
    bridge.registerForPush.and.resolveTo(true);
    await service.onAuthenticated('bearer-abc');
    expect(bridge.registerForPush).toHaveBeenCalledTimes(2);
  });

  it('marks a tapped notification read and routes to the print', async () => {
    bridge.isAvailable.and.returnValue(true);
    bridge.consumePendingTap.and.resolveTo({
      notificationId: 'abc',
      printId: 42,
    });

    await service.handlePendingTap();

    expect(notifications.markAsRead).toHaveBeenCalledWith('abc');
    expect(router.navigate).toHaveBeenCalledWith(['/prints', 42]);
  });

  it('does not navigate when there is no pending tap', async () => {
    bridge.isAvailable.and.returnValue(true);

    await service.handlePendingTap();

    expect(notifications.markAsRead).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears registration state on logout so the next login re-registers', async () => {
    bridge.isAvailable.and.returnValue(true);
    bridge.registerForPush.and.resolveTo(true);
    bridge.unregisterForPush.and.resolveTo(true);

    await service.onAuthenticated('bearer-abc');
    await service.onLogout('bearer-abc');
    await service.onAuthenticated('bearer-abc');

    expect(bridge.unregisterForPush).toHaveBeenCalledWith('bearer-abc');
    expect(bridge.registerForPush).toHaveBeenCalledTimes(2);
  });
});
