import { HttpErrorResponse } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import {
  BridgesService,
  DiscoveredPrinterState,
} from 'src/app/core/services/bridges.service';
import { ConnectionStatus } from 'src/app/core/services/connection.service';
import {
  BRIDGE_KEY_PINS_STORAGE_KEY,
  BridgeKeyPinsService,
} from 'src/app/core/services/bridge-key-pins.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { By } from '@angular/platform-browser';
import { BridgeCardComponent } from '../bridge-card/bridge-card.component';
import {
  OTHER_BRIDGE_KEY,
  TEST_BRIDGE_KEY,
  bridge,
  bridgePrinter,
  discovered,
} from '../testing/bridge-fixtures';
import {
  BRIDGES_POLLING,
  BridgesPageComponent,
  BridgesPolling,
} from './bridges-page.component';

describe('BridgesPageComponent', () => {
  let service: jasmine.SpyObj<BridgesService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let fixture: ComponentFixture<BridgesPageComponent>;
  let dialogAnswer: unknown;

  const garage = bridge();
  const attic = bridge({
    id: 9,
    name: null,
    displayName: 'printlog-bridge on attic',
    status: ConnectionStatus.Stale,
  });

  function httpError(status: number, code?: string): HttpErrorResponse {
    return new HttpErrorResponse({
      status,
      error: code ? { code } : null,
    });
  }

  afterEach(() => localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY));

  beforeEach(() => {
    localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY);
    service = jasmine.createSpyObj<BridgesService>('BridgesService', [
      'list',
      'discovered',
      'printers',
      'update',
      'scan',
      'ignore',
      'unignore',
      'disconnect',
      'confirmKey',
    ]);
    service.list.and.returnValue(of([garage, attic]));
    service.discovered.and.callFake((id: number) =>
      of(id === 42 ? [discovered()] : [])
    );
    service.printers.and.callFake((id: number) =>
      of(id === 9 ? [bridgePrinter({ printerId: 3 })] : [])
    );
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialogAnswer = true;
    dialog.open.and.callFake(
      () => ({ afterClosed: () => of(dialogAnswer) }) as never
    );
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
  });

  async function configure(
    polling: BridgesPolling = { idleMs: 0, scanningMs: 0 }
  ) {
    await TestBed.configureTestingModule({
      imports: [BridgesPageComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: BridgesService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
        { provide: BRIDGES_POLLING, useValue: polling },
      ],
    }).compileComponents();
  }

  async function create(polling?: BridgesPolling) {
    await configure(polling);
    fixture = TestBed.createComponent(BridgesPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function one(id: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(
      `[data-testid="${id}"]`
    );
  }

  function all(id: string): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        `[data-testid="${id}"]`
      )
    );
  }

  it('lists every bridge with what it found', async () => {
    await create();
    expect(all('bridges-card').length).toBe(2);
    expect(service.discovered).toHaveBeenCalledWith(42);
    expect(service.discovered).toHaveBeenCalledWith(9);
    expect(all('bridge-new-row').length).toBe(1);
    expect(logging.logEvent).toHaveBeenCalledWith('Bridges_Viewed', {
      count: 2,
    });
  });

  it('shows the empty state when no bridge has checked in', async () => {
    service.list.and.returnValue(of([]));
    await create();
    expect(one('bridges-empty')).not.toBeNull();
    expect(service.discovered).not.toHaveBeenCalled();
  });

  for (const status of [404, 503]) {
    it(`says the screen is not available on a ${status}, without logging an error`, async () => {
      service.list.and.returnValue(throwError(() => httpError(status)));
      await create();
      expect(one('bridges-unavailable')).not.toBeNull();
      expect(logging.logException).not.toHaveBeenCalled();
    });
  }

  it('offers a retry when the list fails', async () => {
    service.list.and.returnValue(throwError(() => httpError(500)));
    await create();
    expect(one('bridges-error')).not.toBeNull();

    service.list.and.returnValue(of([garage]));
    (one('bridges-error')!.querySelector('button') as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(all('bridges-card').length).toBe(1);
  });

  it('keeps a bridge whose printers failed to load, with a retry', async () => {
    service.discovered.and.returnValue(throwError(() => httpError(500)));
    await create();
    expect(all('bridges-card').length).toBe(2);
    expect(one('bridge-load-failed')).not.toBeNull();
  });

  it('ignores a printer at once and reloads', async () => {
    service.ignore.and.returnValue(of(undefined));
    await create();
    service.discovered.and.callFake((id: number) =>
      of(
        id === 42 ? [discovered({ state: DiscoveredPrinterState.Ignored })] : []
      )
    );
    one('bridge-ignore')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.ignore).toHaveBeenCalledWith(42, 12);
    expect(one('bridge-new-row')).toBeNull();
    expect(one('bridge-ignored-row')).not.toBeNull();
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('explains a refused ignore', async () => {
    service.ignore.and.returnValue(
      throwError(() => httpError(409, 'ignore_limit'))
    );
    await create();
    one('bridge-ignore')!.click();
    expect(toastr.error).toHaveBeenCalledWith(
      jasmine.stringMatching('200 ignored')
    );
    expect(logging.logEvent).toHaveBeenCalledWith('Bridges_ActionFailed', {
      action: 'ignore',
      code: 'ignore_limit',
    });
  });

  it('shows Scanning right after Scan now', async () => {
    service.scan.and.returnValue(
      of({ scanRequestedAt: '2999-01-01T00:00:00Z' })
    );
    await create();
    one('bridge-scan')!.click();
    fixture.detectChanges();
    expect(service.scan).toHaveBeenCalledWith(42);
    expect(one('bridge-scanning')).not.toBeNull();
  });

  it('opens the connect dialog with the printers other bridges watch', async () => {
    await create();
    one('bridge-connect')!.click();
    const config = dialog.open.calls.mostRecent().args[1] as {
      data: { watchedBy: Map<number, number>; bridge: { id: number } };
    };
    expect(config.data.bridge.id).toBe(42);
    expect(config.data.watchedBy.get(3)).toBe(9);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('disconnects after confirming, and reloads', async () => {
    service.disconnect.and.returnValue(of(undefined));
    await create();
    one('bridge-disconnect')!.click();
    expect(service.disconnect).toHaveBeenCalledWith(9, 7);
    expect(toastr.success).toHaveBeenCalled();
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('does not disconnect when the user cancels', async () => {
    dialogAnswer = undefined;
    await create();
    one('bridge-disconnect')!.click();
    expect(service.disconnect).not.toHaveBeenCalled();
  });

  it('renames a bridge and shows the new name', async () => {
    service.update.and.returnValue(
      of(bridge({ name: 'Garage', displayName: 'Garage', location: null }))
    );
    await create();
    one('bridge-edit')!.click();
    fixture.detectChanges();
    one('bridge-edit-save')!.click();
    fixture.detectChanges();
    expect(service.update).toHaveBeenCalledWith(42, {
      name: 'Garage NAS',
      location: 'Workshop',
    });
    expect(one('bridge-name')!.textContent).toContain('Garage');
  });

  it('refreshes while open', fakeAsync(() => {
    void configure({ idleMs: 1000, scanningMs: 100 });
    tick();
    fixture = TestBed.createComponent(BridgesPageComponent);
    fixture.detectChanges();
    tick();
    expect(service.list).toHaveBeenCalledTimes(1);
    tick(1000);
    expect(service.list).toHaveBeenCalledTimes(2);
    fixture.destroy();
    tick(5000);
    expect(service.list).toHaveBeenCalledTimes(2);
    discardPeriodicTasks();
  }));

  function card(index = 0): BridgeCardComponent {
    return fixture.debugElement.queryAll(By.directive(BridgeCardComponent))[
      index
    ].componentInstance as BridgeCardComponent;
  }

  /** WebCrypto's promises aren't tracked by Angular: render until the condition holds. */
  async function until(condition: () => boolean): Promise<void> {
    for (let i = 0; i < 100; i++) {
      fixture.detectChanges();
      if (condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    fail('timed out');
  }

  it('confirms a pending key with the fingerprint the card computed, checks what came back, pins it and reloads', async () => {
    const pending = bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey });
    service.list.and.returnValue(of([pending]));
    service.confirmKey.and.returnValue(
      of(bridge({ publicKey: OTHER_BRIDGE_KEY.publicKey }))
    );
    await create();
    card().confirmKey.emit(OTHER_BRIDGE_KEY.fingerprint);
    await until(() => toastr.success.calls.count() === 1);
    expect(service.confirmKey).toHaveBeenCalledOnceWith(
      42,
      OTHER_BRIDGE_KEY.fingerprint
    );
    expect(toastr.success).toHaveBeenCalledWith(
      jasmine.stringContaining('credentials again')
    );
    expect(logging.logEvent).toHaveBeenCalledWith('Bridges_KeyConfirmed', {
      hadKey: true,
      throttled: false,
    });
    expect(TestBed.inject(BridgeKeyPinsService).pinned(42)).toBe(
      OTHER_BRIDGE_KEY.fingerprint
    );
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('refuses a confirmation answer that carries a different key than the one confirmed', async () => {
    service.list.and.returnValue(
      of([bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey })])
    );
    service.confirmKey.and.returnValue(
      of(bridge({ publicKey: TEST_BRIDGE_KEY.publicKey }))
    );
    await create();
    card().confirmKey.emit(OTHER_BRIDGE_KEY.fingerprint);
    await until(() => toastr.error.calls.count() === 1);
    expect(toastr.error.calls.mostRecent().args[0]).toContain('different key');
    expect(toastr.success).not.toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith(
      'Bridges_KeyConfirmMismatch',
      {}
    );
    expect(logging.logEvent).not.toHaveBeenCalledWith(
      'Bridges_KeyConfirmed',
      jasmine.anything()
    );
    // The user compared OTHER with the bridge: pin that, so the key served instead is flagged.
    expect(TestBed.inject(BridgeKeyPinsService).pinned(42)).toBe(
      OTHER_BRIDGE_KEY.fingerprint
    );
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  for (const code of ['pending_key_changed', 'no_pending_key']) {
    it(`explains ${code} and reloads to compare again`, async () => {
      service.list.and.returnValue(
        of([bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey })])
      );
      service.confirmKey.and.returnValue(
        throwError(() => httpError(409, code))
      );
      await create();
      card().confirmKey.emit(OTHER_BRIDGE_KEY.fingerprint);
      fixture.detectChanges();
      expect(toastr.error).toHaveBeenCalled();
      expect(toastr.error.calls.mostRecent().args[0]).not.toContain(
        'Something went wrong'
      );
      expect(logging.logEvent).toHaveBeenCalledWith('Bridges_ActionFailed', {
        action: 'confirm-key',
        code,
      });
      expect(service.list).toHaveBeenCalledTimes(2);
    });
  }

  it('shows a credential change in the row before the next refresh', async () => {
    service.list.and.returnValue(of([garage]));
    service.printers.and.returnValue(of([bridgePrinter()]));
    await create();
    expect(one('bridge-credential-summary')!.textContent).toContain(
      'No access code'
    );
    card().entryChange.emit(
      bridgePrinter({
        secrets: [
          {
            field: 'access_code',
            keyFingerprint: 'a'.repeat(64),
            updatedAt: '2026-10-27T18:05:00Z',
            stale: false,
          },
        ],
      })
    );
    fixture.detectChanges();
    expect(one('bridge-credential-summary')!.textContent).toContain(
      'Access code set'
    );
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('reloads when a credential found the key changed', async () => {
    await create();
    card().reloadBridge.emit();
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('keeps a confirmation mismatch on the card, not only in a toast', async () => {
    service.list.and.returnValue(
      of([bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey })])
    );
    service.confirmKey.and.returnValue(
      of(bridge({ publicKey: TEST_BRIDGE_KEY.publicKey }))
    );
    await create();
    expect(card().keyMismatch()).toBeFalse();
    card().confirmKey.emit(OTHER_BRIDGE_KEY.fingerprint);
    await until(() => toastr.error.calls.count() === 1);
    fixture.detectChanges();
    expect(card().keyMismatch()).toBeTrue();
  });
});
