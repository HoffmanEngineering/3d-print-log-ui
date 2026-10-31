import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import {
  BridgeConnectDialogComponent,
  BridgeConnectDialogData,
} from '../bridge-connect-dialog/bridge-connect-dialog.component';
import {
  BridgeMoveDialogComponent,
  BridgeMoveDialogData,
} from '../bridge-move-dialog/bridge-move-dialog.component';
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
  let service: MockedObject<BridgesService>;
  let dialog: MockedObject<MatDialog>;
  let toastr: MockedObject<ToastrService>;
  let logging: MockedObject<LoggingService>;
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

  afterEach(() => {
    localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY);
    queryMove = null;
  });

  beforeEach(() => {
    localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY);
    service = {
      list: vi.fn().mockName('BridgesService.list'),
      discovered: vi.fn().mockName('BridgesService.discovered'),
      printers: vi.fn().mockName('BridgesService.printers'),
      update: vi.fn().mockName('BridgesService.update'),
      scan: vi.fn().mockName('BridgesService.scan'),
      ignore: vi.fn().mockName('BridgesService.ignore'),
      unignore: vi.fn().mockName('BridgesService.unignore'),
      disconnect: vi.fn().mockName('BridgesService.disconnect'),
      confirmKey: vi.fn().mockName('BridgesService.confirmKey'),
    } as unknown as MockedObject<BridgesService>;
    service.list.mockReturnValue(of([garage, attic]));
    service.discovered.mockImplementation((id: number) =>
      of(id === 42 ? [discovered()] : [])
    );
    service.printers.mockImplementation((id: number) =>
      of(
        id === 9
          ? [
              bridgePrinter({
                printerId: 3,
                serial: 'OTHER',
                identityKey: 'bambu:sn:OTHER',
              }),
            ]
          : []
      )
    );
    dialog = {
      open: vi.fn().mockName('MatDialog.open'),
    } as unknown as MockedObject<MatDialog>;
    dialogAnswer = true;
    dialog.open.mockImplementation(
      () => ({ afterClosed: () => of(dialogAnswer) }) as never
    );
    toastr = {
      success: vi.fn().mockName('ToastrService.success'),
      error: vi.fn().mockName('ToastrService.error'),
    } as unknown as MockedObject<ToastrService>;
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;
  });

  let queryMove: string | null = null;

  async function configure(
    polling: BridgesPolling = { idleMs: 0, scanningMs: 0 }
  ) {
    const extra = queryMove
      ? [
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: convertToParamMap({ move: queryMove }),
              },
            },
          },
        ]
      : [];
    await TestBed.configureTestingModule({
      imports: [BridgesPageComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: BridgesService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
        { provide: BRIDGES_POLLING, useValue: polling },
        ...extra,
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
    service.list.mockReturnValue(of([]));
    await create();
    expect(one('bridges-empty')).not.toBeNull();
    expect(service.discovered).not.toHaveBeenCalled();
  });

  for (const status of [404, 503]) {
    it(`says the screen is not available on a ${status}, without logging an error`, async () => {
      service.list.mockReturnValue(throwError(() => httpError(status)));
      await create();
      expect(one('bridges-unavailable')).not.toBeNull();
      expect(logging.logException).not.toHaveBeenCalled();
    });
  }

  it('offers a retry when the list fails', async () => {
    service.list.mockReturnValue(throwError(() => httpError(500)));
    await create();
    expect(one('bridges-error')).not.toBeNull();

    service.list.mockReturnValue(of([garage]));
    (one('bridges-error')!.querySelector('button') as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(all('bridges-card').length).toBe(1);
  });

  it('keeps a bridge whose printers failed to load, with a retry', async () => {
    service.discovered.mockReturnValue(throwError(() => httpError(500)));
    await create();
    expect(all('bridges-card').length).toBe(2);
    expect(one('bridge-load-failed')).not.toBeNull();
  });

  it('ignores a printer at once and reloads', async () => {
    service.ignore.mockReturnValue(of(undefined));
    await create();
    service.discovered.mockImplementation((id: number) =>
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
    service.ignore.mockReturnValue(
      throwError(() => httpError(409, 'ignore_limit'))
    );
    await create();
    one('bridge-ignore')!.click();
    expect(toastr.error).toHaveBeenCalledWith(
      expect.stringMatching('200 ignored')
    );
    expect(logging.logEvent).toHaveBeenCalledWith('Bridges_ActionFailed', {
      action: 'ignore',
      code: 'ignore_limit',
    });
  });

  it('shows Scanning right after Scan now', async () => {
    service.scan.mockReturnValue(
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
    const config = vi.mocked(dialog.open).mock.lastCall[1] as {
      data: {
        watchedBy: Map<number, number>;
        bridge: {
          id: number;
        };
      };
    };
    expect(config.data.bridge.id).toBe(42);
    expect(config.data.watchedBy.get(3)).toBe(9);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('disconnects after confirming, and reloads', async () => {
    service.disconnect.mockReturnValue(of(undefined));
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
    service.update.mockReturnValue(
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

  it('refreshes while open', async () => {
    vi.useFakeTimers();
    await configure({ idleMs: 1000, scanningMs: 100 });
    fixture = TestBed.createComponent(BridgesPageComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    expect(service.list).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(service.list).toHaveBeenCalledTimes(2);
    fixture.destroy();
    await vi.advanceTimersByTimeAsync(5000);
    expect(service.list).toHaveBeenCalledTimes(2);
    vi.clearAllTimers();
  });

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
    throw new Error('timed out');
  }

  it('confirms a pending key with the fingerprint the card computed, checks what came back, pins it and reloads', async () => {
    const pending = bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey });
    service.list.mockReturnValue(of([pending]));
    service.confirmKey.mockReturnValue(
      of(bridge({ publicKey: OTHER_BRIDGE_KEY.publicKey }))
    );
    await create();
    card().confirmKey.emit(OTHER_BRIDGE_KEY.fingerprint);
    await until(() => vi.mocked(toastr.success).mock.calls.length === 1);
    expect(service.confirmKey).toHaveBeenCalledTimes(1);
    expect(service.confirmKey).toHaveBeenCalledWith(
      42,
      OTHER_BRIDGE_KEY.fingerprint
    );
    expect(toastr.success).toHaveBeenCalledWith(
      expect.stringContaining('credentials again')
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
    service.list.mockReturnValue(
      of([bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey })])
    );
    service.confirmKey.mockReturnValue(
      of(bridge({ publicKey: TEST_BRIDGE_KEY.publicKey }))
    );
    await create();
    card().confirmKey.emit(OTHER_BRIDGE_KEY.fingerprint);
    await until(() => vi.mocked(toastr.error).mock.calls.length === 1);
    expect(vi.mocked(toastr.error).mock.lastCall[0]).toContain('different key');
    expect(toastr.success).not.toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith(
      'Bridges_KeyConfirmMismatch',
      {}
    );
    expect(logging.logEvent).not.toHaveBeenCalledWith(
      'Bridges_KeyConfirmed',
      expect.anything()
    );
    // The user compared OTHER with the bridge: pin that, so the key served instead is flagged.
    expect(TestBed.inject(BridgeKeyPinsService).pinned(42)).toBe(
      OTHER_BRIDGE_KEY.fingerprint
    );
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  for (const code of ['pending_key_changed', 'no_pending_key']) {
    it(`explains ${code} and reloads to compare again`, async () => {
      service.list.mockReturnValue(
        of([bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey })])
      );
      service.confirmKey.mockReturnValue(
        throwError(() => httpError(409, code))
      );
      await create();
      card().confirmKey.emit(OTHER_BRIDGE_KEY.fingerprint);
      fixture.detectChanges();
      expect(toastr.error).toHaveBeenCalled();
      expect(vi.mocked(toastr.error).mock.lastCall[0]).not.toContain(
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
    service.list.mockReturnValue(of([garage]));
    service.printers.mockReturnValue(of([bridgePrinter()]));
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
    service.list.mockReturnValue(
      of([bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey })])
    );
    service.confirmKey.mockReturnValue(
      of(bridge({ publicKey: TEST_BRIDGE_KEY.publicKey }))
    );
    await create();
    expect(card().keyMismatch()).toBe(false);
    card().confirmKey.emit(OTHER_BRIDGE_KEY.fingerprint);
    await until(() => vi.mocked(toastr.error).mock.calls.length === 1);
    fixture.detectChanges();
    expect(card().keyMismatch()).toBe(true);
  });

  describe('several bridges', () => {
    /** Attic watches the X1C Garage found too (same serial). */
    function atticWatchesTheX1c(): void {
      service.printers.mockImplementation((id: number) =>
        of(id === 9 ? [bridgePrinter({ printerId: 3 })] : [])
      );
    }

    function lastOpened(): {
      component: unknown;
      data: BridgeMoveDialogData & BridgeConnectDialogData;
    } {
      const args = vi.mocked(dialog.open).mock.lastCall;
      return {
        component: args[0],
        data: (
          args[1] as {
            data: BridgeMoveDialogData & BridgeConnectDialogData;
          }
        ).data,
      };
    }

    it('lists a printer another bridge watches only under that bridge, and offers to move it', async () => {
      atticWatchesTheX1c();
      await create();
      expect(all('bridge-new-row').length).toBe(0);
      expect(one('bridge-listed-elsewhere')!.textContent).toContain(
        'printlog-bridge on attic'
      );
      expect(one('bridge-also-found')!.textContent).toContain('Garage NAS');

      dialogAnswer = undefined;
      one('bridge-move')!.click();
      const opened = lastOpened();
      expect(opened.component).toBe(BridgeMoveDialogComponent);
      expect(opened.data.entry.id).toBe(7);
      expect(opened.data.from.id).toBe(9);
      expect(opened.data.bridges.length).toBe(2);
      expect(opened.data.sightings[0].bridgeId).toBe(42);
      expect(service.list).toHaveBeenCalledTimes(2);
    });

    it('offers no Move with a single bridge', async () => {
      service.list.mockReturnValue(of([attic]));
      await create();
      expect(one('bridge-move')).toBeNull();
    });

    it('connects with another bridge that found the printer too', async () => {
      service.discovered.mockImplementation((id: number) =>
        of(
          id === 42
            ? [discovered({ id: 12 })]
            : [discovered({ id: 118, address: '192.168.2.61' })]
        )
      );
      await create();
      // Garage (online, the address on its network) lists it; Attic is the alternative.
      expect(all('bridge-new-row').length).toBe(1);
      one('bridge-connect-via')!.click();
      const opened = lastOpened();
      expect(opened.component).toBe(BridgeConnectDialogComponent);
      expect(opened.data.bridge.id).toBe(9);
      expect(opened.data.discovered!.id).toBe(118);
    });

    it('opens the move from a connect conflict, to the bridge the user was connecting', async () => {
      atticWatchesTheX1c();
      service.discovered.mockImplementation((id: number) =>
        of(id === 42 ? [discovered({ id: 12, identityKey: null })] : [])
      );
      await create();
      dialogAnswer = { moveFrom: 9, printerId: 3 };
      one('bridge-connect')!.click();
      const opened = lastOpened();
      expect(opened.component).toBe(BridgeMoveDialogComponent);
      expect(opened.data.entry.id).toBe(7);
      expect(opened.data.toBridgeId).toBe(42);
      expect(opened.data.discovered!.id).toBe(12);
    });

    it('opens the move for ?move=<printer id>, then drops the parameter', async () => {
      queryMove = '3';
      await configure();
      const router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      dialogAnswer = undefined;
      fixture = TestBed.createComponent(BridgesPageComponent);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const opened = lastOpened();
      expect(opened.component).toBe(BridgeMoveDialogComponent);
      expect(opened.data.entry.printerId).toBe(3);
      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { move: null } })
      );
    });

    it('says when ?move names a printer no app entry has', async () => {
      queryMove = '999';
      await configure();
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      fixture = TestBed.createComponent(BridgesPageComponent);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(dialog.open).not.toHaveBeenCalled();
      expect(toastr.error).toHaveBeenCalled();
    });

    it("keeps ?move when a bridge's printers couldn't load, and opens it once they do", async () => {
      queryMove = '3';
      service.printers.mockImplementation((id: number) =>
        id === 9 ? throwError(() => httpError(500)) : of([])
      );
      await configure();
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      dialogAnswer = undefined;
      fixture = TestBed.createComponent(BridgesPageComponent);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(dialog.open).not.toHaveBeenCalled();
      expect(vi.mocked(toastr.error).mock.lastCall[0]).toContain(
        "couldn't load"
      );

      atticWatchesTheX1c();
      (
        one('bridge-load-failed')!.querySelector('button') as HTMLElement
      ).click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(lastOpened().component).toBe(BridgeMoveDialogComponent);
    });

    it("doesn't move a printer its bridge's config file also has, and says why", async () => {
      queryMove = '3';
      atticWatchesTheX1c();
      service.discovered.mockImplementation((id: number) =>
        of(
          id === 9
            ? [
                discovered({
                  id: 50,
                  state: DiscoveredPrinterState.Configured,
                  printerEntryId: 7,
                }),
              ]
            : []
        )
      );
      await configure();
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      fixture = TestBed.createComponent(BridgesPageComponent);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(dialog.open).not.toHaveBeenCalled();
      expect(vi.mocked(toastr.error).mock.lastCall[0]).toContain('config file');
    });

    it("doesn't open the move from a connect conflict when the other bridge's printers couldn't load", async () => {
      service.printers.mockImplementation((id: number) =>
        id === 9 ? throwError(() => httpError(500)) : of([])
      );
      service.discovered.mockImplementation((id: number) =>
        of(id === 42 ? [discovered({ id: 12, identityKey: null })] : [])
      );
      await create();
      dialogAnswer = { moveFrom: 9, printerId: 3 };
      one('bridge-connect')!.click();
      expect(lastOpened().component).toBe(BridgeConnectDialogComponent);
      expect(vi.mocked(toastr.error).mock.lastCall[0]).toContain(
        "couldn't load"
      );
    });

    it('warns on the bridge that recently reported jobs for a printer another bridge watches', async () => {
      const recent = new Date(Date.now() - 2 * 86400000).toISOString();
      service.list.mockReturnValue(
        of([
          {
            ...garage,
            sharedJobCount: 2,
            lastSharedJobAt: recent,
            lastSharedJobPrinterId: 3,
          },
          attic,
        ])
      );
      await create();
      const notice = one('bridge-shared-jobs')!;
      expect(notice.textContent).toContain('X1C');
      expect(notice.textContent).toContain('printlog-bridge on attic');
    });
  });
});
