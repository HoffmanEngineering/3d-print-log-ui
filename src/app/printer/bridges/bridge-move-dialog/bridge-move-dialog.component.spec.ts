import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, throwError } from 'rxjs';
import { associatedData } from 'src/app/core/crypto/credential-sealing';
import {
  fromHex,
  openCredential,
} from 'src/app/core/crypto/credential-sealing.testing';
import {
  BridgePrinter,
  BridgesService,
  MovedBridgePrinter,
} from 'src/app/core/services/bridges.service';
import {
  BRIDGE_KEY_PINS_STORAGE_KEY,
  BridgeKeyPinsService,
} from 'src/app/core/services/bridge-key-pins.service';
import { ConnectionStatus } from 'src/app/core/services/connection.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  OTHER_BRIDGE_KEY,
  TEST_BRIDGE_KEY,
  bridge,
  bridgePrinter,
  discovered,
} from '../testing/bridge-fixtures';
import {
  BridgeMoveDialogComponent,
  BridgeMoveDialogData,
} from './bridge-move-dialog.component';

describe('BridgeMoveDialogComponent', () => {
  let service: MockedObject<BridgesService>;
  let dialogRef: MockedObject<MatDialogRef<BridgeMoveDialogComponent>>;
  let toastr: MockedObject<ToastrService>;
  let logging: MockedObject<LoggingService>;
  let fixture: ComponentFixture<BridgeMoveDialogComponent>;

  /** The bridge it leaves: its key is the other one, so a seal to it couldn't open below. */
  const garage = bridge({
    id: 42,
    publicKey: OTHER_BRIDGE_KEY.publicKey,
  });
  /** The usual target, with the test key whose private half the spec has. */
  const attic = bridge({
    id: 9,
    name: 'Attic Pi',
    displayName: 'Attic Pi',
    location: 'Second house',
    networks: ['192.168.2.0/24'],
  });
  const old = bridge({
    id: 5,
    name: 'Old Pi',
    displayName: 'Old Pi',
    publicKey: null,
  });
  const x1c = bridgePrinter({
    id: 7,
    printerName: 'X1C',
    secretFields: ['access_code'],
    secrets: [
      {
        field: 'access_code',
        keyFingerprint: OTHER_BRIDGE_KEY.fingerprint,
        updatedAt: '2026-10-27T18:00:00Z',
        stale: false,
      },
    ],
  });
  const atticFound = discovered({
    id: 118,
    address: '192.168.2.61',
    lastSeenAt: '2026-10-27T18:05:00Z',
  });

  function moved(
    overrides: Partial<MovedBridgePrinter> = {}
  ): MovedBridgePrinter {
    return {
      printer: {
        ...x1c,
        host: '192.168.2.61',
        secrets: [
          {
            field: 'access_code',
            keyFingerprint: TEST_BRIDGE_KEY.fingerprint,
            updatedAt: '2026-10-27T18:10:00Z',
            stale: false,
          },
        ],
      },
      fromBridgeId: 42,
      toBridgeId: 9,
      droppedSecretFields: [],
      ...overrides,
    };
  }

  function problem(
    status: number,
    code: string,
    extra: Record<string, unknown> = {}
  ) {
    return new HttpErrorResponse({ status, error: { code, ...extra } });
  }

  beforeEach(() => {
    localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY);
    service = {
      move: vi.fn().mockName('BridgesService.move'),
      get: vi.fn().mockName('BridgesService.get'),
    } as unknown as MockedObject<BridgesService>;
    service.move.mockReturnValue(of(moved()));
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close'),
    } as unknown as MockedObject<MatDialogRef<BridgeMoveDialogComponent, any>>;
    toastr = {
      success: vi.fn().mockName('ToastrService.success'),
      error: vi.fn().mockName('ToastrService.error'),
    } as unknown as MockedObject<ToastrService>;
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;
  });

  afterEach(() => localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY));

  async function create(data: Partial<BridgeMoveDialogData> = {}) {
    await TestBed.configureTestingModule({
      imports: [BridgeMoveDialogComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: BridgesService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            entry: x1c,
            from: garage,
            bridges: [garage, attic, old],
            sightings: [
              {
                bridgeId: 9,
                bridgeName: 'Attic Pi',
                printer: atticFound,
                onOwnNetwork: true,
              },
            ],
            ...data,
          } satisfies BridgeMoveDialogData,
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BridgeMoveDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

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

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function byTestId(id: string): HTMLElement | null {
    return el().querySelector(`[data-testid="${id}"]`);
  }

  function input(field: string): HTMLInputElement {
    return el().querySelector(
      `[data-testid="move-credential-${field}"] input`
    ) as HTMLInputElement;
  }

  function type(field: string, value: string): void {
    const i = input(field);
    i.value = value;
    i.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function moveButton(): HTMLButtonElement {
    return byTestId('move-submit') as HTMLButtonElement;
  }

  /** Clicks a radio button by its test id. */
  function choose(id: string): void {
    (byTestId(id)!.querySelector('input') as HTMLInputElement).click();
    fixture.detectChanges();
  }

  function pickTarget(id: number): void {
    fixture.componentInstance.form.controls.toBridgeId.setValue(id);
    fixture.detectChanges();
  }

  /** Waits until the target's key is imported and its fingerprint shows. */
  async function keyReady(): Promise<void> {
    await until(() => !!byTestId('move-fingerprint'));
  }

  it('offers only the other bridges, and preselects the one that found the printer on its network', async () => {
    await create();
    const options = fixture.componentInstance['targets']().map(
      (t: { id: number }) => t.id
    );
    expect(options).toEqual([9, 5]);
    expect(fixture.componentInstance.form.controls.toBridgeId.value).toBe(9);
    expect(byTestId('move-found')!.textContent).toContain('192.168.2.61');
    expect(logging.logEvent).toHaveBeenCalledWith(
      'BridgeMove_Opened',
      expect.objectContaining({ kind: 'bambu' })
    );
  });

  it('preselects the bridge a connect conflict came from', async () => {
    await create({
      toBridgeId: 5,
      sightings: [],
      discovered: discovered({ id: 300 }),
    });
    expect(fixture.componentInstance.form.controls.toBridgeId.value).toBe(5);
  });

  it('seals the access code to the new bridge with its id in the AD, and sends it with the move', async () => {
    const answer = new Subject<MovedBridgePrinter>();
    service.move.mockReturnValue(answer);
    await create();
    await keyReady();
    expect(byTestId('move-fingerprint')!.textContent).toContain(
      TEST_BRIDGE_KEY.short
    );

    type('access_code', ' 12345678 ');
    moveButton().click();
    // The typed value is gone before the seal finishes.
    expect(input('access_code').value).toBe('');
    await until(() => vi.mocked(service.move).mock.calls.length === 1);

    const [fromId, entryId, body] = vi.mocked(service.move).mock.lastCall;
    expect([fromId, entryId]).toEqual([42, 7]);
    expect(body.toBridgeId).toBe(9);
    expect(body.discoveredPrinterId).toBe(118);
    expect(body.host).toBeUndefined();
    expect(body.keyFingerprint).toBe(TEST_BRIDGE_KEY.fingerprint);
    expect(JSON.stringify(body)).not.toContain('12345678');
    const opened = await openCredential(
      TEST_BRIDGE_KEY.privateKeyPkcs8Base64,
      fromHex(TEST_BRIDGE_KEY.publicKeyRawHex),
      body.secrets!['access_code'],
      associatedData(9, 7, 'access_code')
    );
    expect(opened).toBe('12345678');

    answer.next(moved());
    answer.complete();
    fixture.detectChanges();
    expect(dialogRef.close).toHaveBeenCalledWith(moved());
    expect(toastr.success).toHaveBeenCalled();
    expect(TestBed.inject(BridgeKeyPinsService).pinned(9)).toBe(
      TEST_BRIDGE_KEY.fingerprint
    );
    expect(logging.logEvent).toHaveBeenCalledWith(
      'BridgeMove_Moved',
      expect.objectContaining({ carried: 1, dropped: 0 })
    );
  });

  it("refuses to move without a credential the printer can't connect without", async () => {
    await create();
    await keyReady();
    moveButton().click();
    fixture.detectChanges();
    expect(service.move).not.toHaveBeenCalled();
    expect(byTestId('move-error')!.textContent).toContain('access code');
  });

  it("blocks sealing when the new bridge's key changed without confirmation in this browser", async () => {
    localStorage.setItem(
      BRIDGE_KEY_PINS_STORAGE_KEY,
      JSON.stringify({ '9': OTHER_BRIDGE_KEY.fingerprint })
    );
    await create();
    await until(() => !!byTestId('key-changed'));
    expect(input('access_code')).toBeNull();
    expect(moveButton().disabled).toBe(true);

    // "It matches" pins the served key, and entry opens.
    (byTestId('key-changed-accept') as HTMLButtonElement).click();
    await until(() => !!input('access_code'));
    expect(moveButton().disabled).toBe(false);
  });

  it("can't carry credentials to a bridge without a key, and says why", async () => {
    await create({ sightings: [] });
    pickTarget(5);
    await until(() => !!byTestId('move-key-unavailable'));
    expect(byTestId('move-key-unavailable')!.textContent).toContain('Old Pi');
    expect(moveButton().disabled).toBe(true);
  });

  it('moves a printer without credentials to a bridge without a key, keeping its address', async () => {
    const moonraker = bridgePrinter({
      id: 8,
      kind: 'moonraker',
      host: '192.168.1.50',
      port: 7125,
      secretFields: ['moonraker_api_key'],
      secrets: [],
    });
    await create({ entry: moonraker, sightings: [] });
    pickTarget(5);
    expect(byTestId('move-address')).not.toBeNull();
    moveButton().click();
    await until(() => vi.mocked(service.move).mock.calls.length === 1);
    const body = vi.mocked(service.move).mock.lastCall[2];
    expect(body).toEqual({ toBridgeId: 5 });
  });

  it('sends a new address when it was changed', async () => {
    const moonraker = bridgePrinter({
      id: 8,
      kind: 'moonraker',
      host: '192.168.1.50',
      port: 7125,
      secretFields: ['moonraker_api_key'],
      secrets: [],
    });
    await create({ entry: moonraker, sightings: [] });
    pickTarget(5);
    const form = fixture.componentInstance.form;
    form.controls.host.setValue(' 10.0.0.50 ');
    form.controls.port.setValue(7126);
    fixture.detectChanges();
    moveButton().click();
    await until(() => vi.mocked(service.move).mock.calls.length === 1);
    expect(vi.mocked(service.move).mock.lastCall[2]).toEqual({
      toBridgeId: 5,
      host: '10.0.0.50',
      port: 7126,
    });
  });

  it('shows the credentials the move dropped instead of closing', async () => {
    const prusa = bridgePrinter({
      id: 11,
      kind: 'prusalink',
      printerName: 'MK4',
      secretFields: ['password', 'username', 'api_key'],
      secrets: ['password', 'username'].map((field) => ({
        field,
        keyFingerprint: OTHER_BRIDGE_KEY.fingerprint,
        updatedAt: '2026-10-27T18:00:00Z',
        stale: false,
      })),
    });
    service.move.mockReturnValue(
      of(moved({ printer: prusa, droppedSecretFields: ['username'] }))
    );
    await create({ entry: prusa, sightings: [] });
    // Two other bridges and no sighting: nothing is preselected.
    expect(moveButton().disabled).toBe(true);
    pickTarget(9);
    await keyReady();
    // The user name is optional: the password is enough.
    type('password', 'secret');
    moveButton().click();
    await until(() => !!byTestId('move-dropped'));
    expect(byTestId('move-dropped')!.textContent).toContain('username');
    expect(dialogRef.close).not.toHaveBeenCalled();
    (byTestId('move-done') as HTMLButtonElement).click();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('asks for the fields the API says it needs on secrets_required', async () => {
    const bare = bridgePrinter({ id: 7, secrets: [] });
    service.move.mockReturnValue(
      throwError(() =>
        problem(400, 'secrets_required', { fields: ['access_code'] })
      )
    );
    await create({ entry: bare });
    moveButton().click();
    await until(() => !!byTestId('move-error'));
    expect(byTestId('move-error')!.textContent).toContain('access code');
    await keyReady();
    expect(input('access_code')).not.toBeNull();
  });

  it("reloads the new bridge once on a key error, and doesn't retry", async () => {
    service.move.mockReturnValue(
      throwError(() =>
        problem(409, 'bridge_key_changed', { keyFingerprint: 'f'.repeat(64) })
      )
    );
    service.get.mockReturnValue(of(attic));
    await create();
    await keyReady();
    type('access_code', '12345678');
    moveButton().click();
    await until(() => !!byTestId('move-error'));
    expect(service.move).toHaveBeenCalledTimes(1);
    expect(service.get).toHaveBeenCalledTimes(1);
    expect(service.get).toHaveBeenCalledWith(9);
    expect(byTestId('move-error')!.textContent).toContain('key');
    expect(byTestId('move-error')!.textContent).not.toContain('f'.repeat(16));
    expect(logging.logEvent).toHaveBeenCalledWith('BridgeMove_Failed', {
      code: 'bridge_key_changed',
    });
  });

  it('names the bridge for printer_moved', async () => {
    service.move.mockReturnValue(
      throwError(() => problem(409, 'printer_moved', { bridgeId: 5 }))
    );
    const bare = bridgePrinter({ id: 7, secrets: [] });
    await create({ entry: bare });
    moveButton().click();
    await until(() => !!byTestId('move-error'));
    expect(byTestId('move-error')!.textContent).toContain('Old Pi');
  });

  it('warns that a stale bridge picks the printer up only when it is back', async () => {
    await create({
      bridges: [garage, { ...attic, status: ConnectionStatus.Stale }, old],
    });
    expect(byTestId('move-target-stale')).not.toBeNull();
  });

  describe('where the new bridge reaches the printer', () => {
    const moonraker = bridgePrinter({
      id: 8,
      kind: 'moonraker',
      printerName: 'Voron',
      host: '192.168.1.50',
      port: 7125,
      serial: null,
      identityKey: 'moonraker:ip:192.168.1.50:7125',
      secretFields: ['moonraker_api_key'],
      secrets: [],
    });

    it('ignores what a connect conflict found when it is another printer (another serial)', async () => {
      const bare = bridgePrinter({ id: 7, secrets: [] });
      await create({
        entry: bare,
        toBridgeId: 9,
        sightings: [],
        discovered: discovered({
          id: 300,
          serial: '01P00A999999999',
          identityKey: 'bambu:sn:01P00A999999999',
        }),
      });
      expect(byTestId('move-found')).toBeNull();
      expect(byTestId('move-address')).not.toBeNull();
      moveButton().click();
      await until(() => vi.mocked(service.move).mock.calls.length === 1);
      expect(vi.mocked(service.move).mock.lastCall[2]).toEqual({
        toBridgeId: 9,
      });
    });

    it('ignores a found printer of another kind', async () => {
      await create({
        entry: moonraker,
        toBridgeId: 9,
        sightings: [],
        discovered: discovered({ id: 300 }),
      });
      expect(byTestId('move-found')).toBeNull();
    });

    it('asks to confirm a printer known only by its address before using it', async () => {
      await create({
        entry: moonraker,
        toBridgeId: 9,
        sightings: [],
        discovered: discovered({
          id: 301,
          kind: 'moonraker',
          address: '192.168.2.50',
          port: 7125,
          serial: null,
          identityKey: 'moonraker:ip:192.168.2.50:7125',
        }),
      });
      // Both addresses are shown; the current one is the default.
      expect(byTestId('move-found')!.textContent).toContain('192.168.2.50');
      expect(byTestId('move-keep')!.textContent).toContain('192.168.1.50');
      choose('move-choice-found');
      expect(moveButton().disabled).toBe(true);
      (
        byTestId('move-same-printer')!.querySelector(
          'input'
        ) as HTMLInputElement
      ).click();
      fixture.detectChanges();
      expect(moveButton().disabled).toBe(false);
      moveButton().click();
      await until(() => vi.mocked(service.move).mock.calls.length === 1);
      expect(vi.mocked(service.move).mock.lastCall[2]).toEqual({
        toBridgeId: 9,
        discoveredPrinterId: 301,
      });
    });

    it('can keep the current address instead of the one the bridge found', async () => {
      const bare = bridgePrinter({ id: 7, secrets: [] });
      await create({ entry: bare });
      expect(byTestId('move-found')).not.toBeNull();
      choose('move-choice-keep');
      moveButton().click();
      await until(() => vi.mocked(service.move).mock.calls.length === 1);
      expect(vi.mocked(service.move).mock.lastCall[2]).toEqual({
        toBridgeId: 9,
      });
    });

    for (const code of ['invalid_kind', 'discovered_printer_not_found']) {
      it(`falls back to the address fields on ${code}`, async () => {
        const bare = bridgePrinter({ id: 7, secrets: [] });
        service.move
          .mockReturnValueOnce(throwError(() => problem(400, code)))
          .mockReturnValueOnce(of(moved()));
        await create({ entry: bare });
        moveButton().click();
        await until(() => !!byTestId('move-error'));
        expect(byTestId('move-error')!.textContent).toContain('Attic Pi');
        expect(byTestId('move-error')!.textContent).not.toContain(
          'Pick the kind'
        );
        expect(byTestId('move-found')).toBeNull();
        expect(byTestId('move-address')).not.toBeNull();
        moveButton().click();
        await until(() => vi.mocked(service.move).mock.calls.length === 2);
        expect(vi.mocked(service.move).mock.lastCall[2]).toEqual({
          toBridgeId: 9,
        });
      });
    }

    it('names the new bridge for discovered_printer_already_connected', async () => {
      const bare = bridgePrinter({ id: 7, secrets: [] });
      service.move.mockReturnValue(
        throwError(() => problem(409, 'discovered_printer_already_connected'))
      );
      await create({ entry: bare });
      moveButton().click();
      await until(() => !!byTestId('move-error'));
      expect(byTestId('move-error')!.textContent).toContain('Attic Pi');
    });
  });

  it('says the credentials have to be entered again after a failed move', async () => {
    service.move.mockReturnValue(
      throwError(() => problem(409, 'bridge_printer_limit'))
    );
    await create();
    await keyReady();
    type('access_code', '12345678');
    moveButton().click();
    await until(() => !!byTestId('move-error'));
    expect(byTestId('move-error')!.textContent).toContain('again');
    expect(input('access_code').value).toBe('');
  });

  it('locks the target, Cancel and Esc while moving, and names the bridge it moved to afterwards', async () => {
    const answer = new Subject<MovedBridgePrinter>();
    service.move.mockReturnValue(answer);
    const prusa = bridgePrinter({
      id: 11,
      kind: 'prusalink',
      secretFields: ['password', 'username', 'api_key'],
      secrets: [],
    });
    await create({ entry: prusa });
    moveButton().click();
    await until(() => vi.mocked(service.move).mock.calls.length === 1);
    expect(fixture.componentInstance.form.controls.toBridgeId.disabled).toBe(
      true
    );
    expect((byTestId('move-cancel') as HTMLButtonElement).disabled).toBe(true);
    expect(dialogRef.disableClose).toBe(true);

    answer.next(moved({ droppedSecretFields: ['username'] }));
    answer.complete();
    await until(() => !!byTestId('move-dropped'));
    expect(dialogRef.disableClose).toBe(false);
    expect(el().querySelector('h2')!.textContent).toContain('Attic Pi');
  });

  it('moves a printer whose only credential is optional to a bridge without a key, and drops it', async () => {
    const prusa = bridgePrinter({
      id: 11,
      kind: 'prusalink',
      secretFields: ['password', 'username', 'api_key'],
      secrets: [
        {
          field: 'username',
          keyFingerprint: OTHER_BRIDGE_KEY.fingerprint,
          updatedAt: '2026-10-27T18:00:00Z',
          stale: false,
        },
      ],
    });
    service.move.mockReturnValue(
      of(moved({ printer: prusa, droppedSecretFields: ['username'] }))
    );
    await create({ entry: prusa, sightings: [] });
    pickTarget(5);
    await until(() => !!byTestId('move-optional-dropped'));
    expect(moveButton().disabled).toBe(false);
    moveButton().click();
    await until(() => !!byTestId('move-dropped'));
    expect(vi.mocked(service.move).mock.lastCall[2]).toEqual({
      toBridgeId: 5,
    });
  });
});
