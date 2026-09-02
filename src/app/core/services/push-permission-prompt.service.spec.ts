import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { PushPermissionPromptService } from './push-permission-prompt.service';
import { NativeBridgeService } from './native-bridge.service';
import { PushPermissionState } from '../types/native-bridge';

describe('PushPermissionPromptService', () => {
  let service: PushPermissionPromptService;
  let bridge: jasmine.SpyObj<NativeBridgeService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let dialogRef: {
    componentInstance: Record<string, string>;
    afterClosed: jasmine.Spy;
  };

  function withPermission(permission: PushPermissionState) {
    Object.defineProperty(bridge, 'permission', {
      value: permission,
      configurable: true,
    });
  }

  function userAnswers(accepted: boolean) {
    dialogRef.afterClosed.and.returnValue(of(accepted));
  }

  beforeEach(() => {
    localStorage.clear();
    bridge = jasmine.createSpyObj<NativeBridgeService>(
      'NativeBridgeService',
      ['isAvailable', 'requestPushPermission'],
      { permission: 'default' }
    );
    bridge.isAvailable.and.returnValue(true);
    bridge.requestPushPermission.and.resolveTo('granted');

    dialogRef = {
      componentInstance: {},
      afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(true)),
    };
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue(dialogRef as unknown as MatDialogRef<unknown>);

    TestBed.configureTestingModule({
      providers: [
        { provide: NativeBridgeService, useValue: bridge },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    service = TestBed.inject(PushPermissionPromptService);
  });

  it('does nothing in an ordinary browser', async () => {
    bridge.isAvailable.and.returnValue(false);

    const result = await service.promptInContext('reason');
    expect(result.permission).toBe('default');
    expect(result.outcome).toBe('unavailable');

    expect(dialog.open).not.toHaveBeenCalled();
    expect(bridge.requestPushPermission).not.toHaveBeenCalled();
  });

  it('does not re-prompt when permission is already granted', async () => {
    withPermission('granted');

    const result = await service.promptInContext('reason');
    expect(result.permission).toBe('granted');
    expect(result.outcome).toBe('already-granted');

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('shows the explainer before touching the OS prompt', async () => {
    userAnswers(true);

    await service.promptInContext('You just connected a printer.');

    expect(dialog.open).toHaveBeenCalled();
    expect(dialogRef.componentInstance['body']).toContain(
      'You just connected a printer.'
    );
    expect(bridge.requestPushPermission).toHaveBeenCalled();
  });

  it('never reaches the OS prompt when the user declines the explainer', async () => {
    userAnswers(false);

    const result = await service.promptInContext('reason');

    // On Android 13+ the system dialog is effectively one-shot. Spending it on someone who
    // just said "not now" is how the permission becomes permanently denied.
    expect(bridge.requestPushPermission).not.toHaveBeenCalled();
    expect(result.permission).toBe('default');
  });

  it('prompts again after an earlier denial', async () => {
    withPermission('denied');
    userAnswers(true);

    await service.promptInContext('reason');

    expect(bridge.requestPushPermission).toHaveBeenCalled();
  });

  /**
   * Without this, adding a trigger that fires often — every in-progress print the user opens
   * — turns a single "Not now" into an explainer on every visit. The suppression is of OUR
   * dialog only; the OS prompt is still only reached via an explicit "Enable notifications".
   */
  it('does not show the explainer again soon after the user declined it', async () => {
    userAnswers(false);
    await service.promptInContext('reason');
    dialog.open.calls.reset();

    await service.promptInContext('reason');

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('suppresses across triggers, not just the one that was declined', async () => {
    userAnswers(false);
    await service.promptInContext('You just created an API key.');
    dialog.open.calls.reset();

    await service.promptInContext('This print is still running.');

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('asks again once the cooldown has passed', async () => {
    userAnswers(false);
    await service.promptInContext('reason');

    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      'printlog.pushPromptDeclinedAt',
      String(thirtyOneDaysAgo)
    );
    dialog.open.calls.reset();
    userAnswers(true);

    await service.promptInContext('reason');

    expect(dialog.open).toHaveBeenCalled();
  });

  it('does not suppress after the user accepted the explainer', async () => {
    userAnswers(true);
    await service.promptInContext('reason');
    dialog.open.calls.reset();

    await service.promptInContext('reason');

    expect(dialog.open).toHaveBeenCalled();
  });

  /** Private browsing and blocked site data both make localStorage throw on access. */
  it('still prompts when storage cannot be read', async () => {
    spyOn(localStorage, 'getItem').and.throwError('denied');
    userAnswers(true);

    await service.promptInContext('reason');

    expect(dialog.open).toHaveBeenCalled();
  });

  /**
   * Declines, so rememberDecline actually runs — an accepted prompt never writes, which
   * made an earlier version of this test pass with the write guard deleted.
   */
  it('survives storage that cannot be written', async () => {
    const setItem = spyOn(localStorage, 'setItem').and.throwError('denied');
    userAnswers(false);

    const result = await service.promptInContext('reason');

    expect(setItem).toHaveBeenCalled();
    expect(result.outcome).toBe('shown');
    expect(bridge.requestPushPermission).not.toHaveBeenCalled();
  });

  describe('explicit user request', () => {
    it('ignores the cooldown, so Settings still works after a decline', async () => {
      userAnswers(false);
      await service.promptInContext('reason');
      dialog.open.calls.reset();
      userAnswers(true);

      const result = await service.promptOnUserRequest('from settings');

      // The Settings button is the documented second chance for someone who declined; the
      // in-context cooldown silently disabling it strands them with no in-app route at all.
      expect(dialog.open).toHaveBeenCalled();
      expect(result.permission).toBe('granted');
    });
  });

  describe('concurrent triggers', () => {
    /**
     * Reachable today: the API-key response can land after the user has navigated to a
     * running print, whose effect calls the same root-provided service.
     */
    it('opens one explainer, not one per caller', async () => {
      const closed = new Subject<boolean>();
      dialogRef.afterClosed.and.returnValue(closed.asObservable());

      const first = service.promptInContext('api key');
      const second = service.promptInContext('running print');

      closed.next(true);
      closed.complete();
      await Promise.all([first, second]);

      expect(dialog.open).toHaveBeenCalledTimes(1);
      expect(bridge.requestPushPermission).toHaveBeenCalledTimes(1);
    });

    it('allows a later prompt once the first has settled', async () => {
      userAnswers(true);
      await service.promptInContext('first');
      withPermission('default');
      dialog.open.calls.reset();

      await service.promptInContext('second');

      expect(dialog.open).toHaveBeenCalled();
    });
  });

  /**
   * The permission can be granted while our explainer is open — the Settings button in
   * another tab, or a concurrent flow. Asking the OS again would spend a second
   * irreversible request on a grant already held.
   */
  it('does not re-ask the OS when permission arrived while the dialog was open', async () => {
    const closed = new Subject<boolean>();
    dialogRef.afterClosed.and.returnValue(closed.asObservable());

    const pending = service.promptInContext('reason');
    withPermission('granted');
    closed.next(true);
    closed.complete();

    const result = await pending;

    expect(bridge.requestPushPermission).not.toHaveBeenCalled();
    expect(result.permission).toBe('granted');
  });

  describe('clock skew', () => {
    /**
     * A device whose clock was ahead when the decline was recorded, then corrected back.
     * Naive subtraction makes the age negative, which reads as "very recent" and suppresses
     * the prompt until the clock catches up again.
     */
    it('ignores a decline recorded far in the future', async () => {
      const nextYear = Date.now() + 365 * 24 * 60 * 60 * 1000;
      localStorage.setItem('printlog.pushPromptDeclinedAt', String(nextYear));
      userAnswers(true);

      await service.promptInContext('reason');

      expect(dialog.open).toHaveBeenCalled();
    });

    it('tolerates a clock that is only slightly ahead', async () => {
      const slightlyAhead = Date.now() + 60 * 1000;
      localStorage.setItem(
        'printlog.pushPromptDeclinedAt',
        String(slightlyAhead)
      );

      await service.promptInContext('reason');

      expect(dialog.open).not.toHaveBeenCalled();
    });
  });
});
