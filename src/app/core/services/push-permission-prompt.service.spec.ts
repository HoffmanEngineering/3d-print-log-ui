import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
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

    await expectAsync(service.promptInContext('reason')).toBeResolvedTo(
      'default'
    );

    expect(dialog.open).not.toHaveBeenCalled();
    expect(bridge.requestPushPermission).not.toHaveBeenCalled();
  });

  it('does not re-prompt when permission is already granted', async () => {
    withPermission('granted');

    await expectAsync(service.promptInContext('reason')).toBeResolvedTo(
      'granted'
    );

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
    expect(result).toBe('default');
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
  it('still prompts when storage is unavailable', async () => {
    spyOn(localStorage, 'getItem').and.throwError('denied');
    spyOn(localStorage, 'setItem').and.throwError('denied');
    userAnswers(true);

    await service.promptInContext('reason');

    expect(dialog.open).toHaveBeenCalled();
  });
});
