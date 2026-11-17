import type { MockedObject } from 'vitest';
import { Clipboard } from '@angular/cdk/clipboard';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, throwError } from 'rxjs';
import {
  associatedData,
  importBridgeKey,
} from 'src/app/core/crypto/credential-sealing';
import {
  fromHex,
  openCredential,
} from 'src/app/core/crypto/credential-sealing.testing';
import {
  Bridge,
  BridgePrinter,
  BridgesService,
} from 'src/app/core/services/bridges.service';
import {
  BRIDGE_KEY_PINS_STORAGE_KEY,
  BridgeKeyPinsService,
} from 'src/app/core/services/bridge-key-pins.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  OTHER_BRIDGE_KEY,
  TEST_BRIDGE_KEY,
  bridge,
  bridgePrinter,
} from '../testing/bridge-fixtures';
import { BridgeCredentialsComponent } from './bridge-credentials.component';

describe('BridgeCredentialsComponent', () => {
  let service: MockedObject<BridgesService>;
  let logging: MockedObject<LoggingService>;
  let fixture: ComponentFixture<BridgeCredentialsComponent>;
  let changes: BridgePrinter[];
  let reloads: number;

  async function create(
    b: Bridge = bridge(),
    entry: BridgePrinter = bridgePrinter(),
    keyWarningAbove = false
  ) {
    await TestBed.configureTestingModule({
      imports: [BridgeCredentialsComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: BridgesService, useValue: service },
        { provide: LoggingService, useValue: logging },
        {
          provide: ToastrService,
          useValue: {
            success: vi.fn().mockName('ToastrService.success'),
            error: vi.fn().mockName('ToastrService.error'),
          },
        },
        {
          provide: Clipboard,
          useValue: { copy: vi.fn().mockReturnValue(true) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BridgeCredentialsComponent);
    fixture.componentRef.setInput('bridge', b);
    fixture.componentRef.setInput('entry', entry);
    fixture.componentRef.setInput('keyWarningAbove', keyWarningAbove);
    changes = [];
    reloads = 0;
    fixture.componentInstance.entryChange.subscribe((e) => changes.push(e));
    fixture.componentInstance.reloadBridge.subscribe(() => reloads++);
    fixture.detectChanges();
    await until(
      () =>
        !!byTestId('credentials-key') || !!byTestId('credentials-unavailable')
    );
  }

  /** A pin from an earlier visit, for bridge 42. */
  function pinBefore(fingerprint: string): void {
    localStorage.setItem(
      BRIDGE_KEY_PINS_STORAGE_KEY,
      JSON.stringify({ '42': fingerprint })
    );
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

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function byTestId(id: string, root: ParentNode = el()): HTMLElement | null {
    return root.querySelector(`[data-testid="${id}"]`);
  }

  function field(name: string): HTMLElement {
    return byTestId(`credential-${name}`)!;
  }

  function input(name: string): HTMLInputElement {
    return byTestId('credential-input', field(name)) as HTMLInputElement;
  }

  function type(name: string, value: string): void {
    const i = input(name);
    i.value = value;
    i.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function save(name: string): void {
    byTestId('credential-save', field(name))!.click();
    fixture.detectChanges();
  }

  function stored(
    entry: BridgePrinter,
    fieldName: string,
    stale = false
  ): BridgePrinter {
    return {
      ...entry,
      secrets: [
        {
          field: fieldName,
          keyFingerprint: TEST_BRIDGE_KEY.fingerprint,
          updatedAt: '2026-10-27T18:05:00Z',
          stale,
        },
      ],
      credentialIssues: [],
    };
  }

  beforeEach(() => {
    localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY);
    service = {
      setSecret: vi.fn().mockName('BridgesService.setSecret'),
      clearSecret: vi.fn().mockName('BridgesService.clearSecret'),
    } as unknown as MockedObject<BridgesService>;
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;
  });

  it('shows the fingerprint it computed from the key, never the API copy', async () => {
    await create({
      ...bridge(),
      publicKeyFingerprint: 'dead'.repeat(16),
    } as Bridge);
    expect(byTestId('credentials-fingerprint')!.textContent).toContain(
      TEST_BRIDGE_KEY.short
    );
    expect(byTestId('credentials-full-fingerprint')!.textContent).toContain(
      '2e64 b38c'
    );
    expect(el().textContent).not.toContain('dead');
  });

  it('keeps secrets away from password managers, a text input for the username', async () => {
    await create(
      bridge(),
      bridgePrinter({
        kind: 'prusalink',
        secretFields: ['password', 'username', 'api_key'],
      })
    );
    expect(input('password').type).toBe('password');
    expect(input('api_key').type).toBe('password');
    expect(input('username').type).toBe('text');
    expect(input('password').getAttribute('autocomplete')).toBe('new-password');
    expect(input('api_key').getAttribute('autocomplete')).toBe('new-password');
    expect(input('username').getAttribute('autocomplete')).toBe('off');
    // No <form>: a submitted form with a password field is what prompts "save password".
    expect(el().querySelector('form')).toBeNull();
  });

  it('uses a one-time-code input for a Bambu access code', async () => {
    await create();
    expect(input('access_code').type).toBe('password');
    expect(input('access_code').getAttribute('autocomplete')).toBe(
      'one-time-code'
    );
  });

  it('saves on Enter in the input', async () => {
    service.setSecret.mockReturnValue(
      of(stored(bridgePrinter(), 'access_code'))
    );
    await create();
    type('access_code', '12345678');
    input('access_code').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    await until(() => vi.mocked(service.setSecret).mock.calls.length === 1);
    expect(input('access_code').value).toBe('');
  });

  it('pins the fingerprint it sealed to', async () => {
    service.setSecret.mockReturnValue(
      of(stored(bridgePrinter(), 'access_code'))
    );
    await create();
    type('access_code', '12345678');
    save('access_code');
    await until(() => !!byTestId('credential-saved'));
    expect(TestBed.inject(BridgeKeyPinsService).pinned(42)).toBe(
      TEST_BRIDGE_KEY.fingerprint
    );
  });

  it('holds entry back until the user compares a key that changed without confirmation here', async () => {
    pinBefore(OTHER_BRIDGE_KEY.fingerprint);
    await create();
    expect(byTestId('key-changed')).not.toBeNull();
    expect(el().querySelector('[data-testid="credential-input"]')).toBeNull();

    byTestId('key-changed-accept')!.click();
    fixture.detectChanges();
    expect(byTestId('key-changed')).toBeNull();
    expect(input('access_code')).not.toBeNull();
    expect(TestBed.inject(BridgeKeyPinsService).pinned(42)).toBe(
      TEST_BRIDGE_KEY.fingerprint
    );
  });

  it('shows no warning when the pin matches, or there is none', async () => {
    pinBefore(TEST_BRIDGE_KEY.fingerprint);
    await create();
    expect(byTestId('key-changed')).toBeNull();
    expect(input('access_code')).not.toBeNull();
  });

  it('seals what was typed (trimmed) to the bridge key, sends the computed fingerprint and forgets the value', async () => {
    const entry = bridgePrinter();
    const answer = new Subject<BridgePrinter>();
    service.setSecret.mockReturnValue(answer);
    await create(bridge(), entry);

    type('access_code', ' 12345678 ');
    save('access_code');
    // The form is cleared before the seal even finishes.
    expect(input('access_code').value).toBe('');
    await until(() => vi.mocked(service.setSecret).mock.calls.length === 1);

    const [bridgeId, entryId, fieldName, body] = vi.mocked(service.setSecret)
      .mock.lastCall;
    expect([bridgeId, entryId, fieldName]).toEqual([42, 7, 'access_code']);
    expect(body.keyFingerprint).toBe(TEST_BRIDGE_KEY.fingerprint);
    expect(body.sealed).toMatch(/^v1\./);
    expect(JSON.stringify(body)).not.toContain('12345678');
    const opened = await openCredential(
      TEST_BRIDGE_KEY.privateKeyPkcs8Base64,
      fromHex(TEST_BRIDGE_KEY.publicKeyRawHex),
      body.sealed,
      associatedData(42, 7, 'access_code')
    );
    expect(opened).toBe('12345678');

    answer.next(stored(entry, 'access_code'));
    answer.complete();
    fixture.detectChanges();
    expect(changes.length).toBe(1);
    expect(byTestId('credential-saved')!.textContent).toContain(
      TEST_BRIDGE_KEY.short
    );
    expect(logging.logEvent).toHaveBeenCalledWith('BridgeCredentials_Saved', {
      kind: 'bambu',
      field: 'access_code',
      replaced: false,
      context: 'bridges',
    });
    for (const call of vi.mocked(logging.logEvent).mock.calls) {
      expect(JSON.stringify(call)).not.toContain('12345678');
      expect(JSON.stringify(call)).not.toContain('v1.');
    }
  });

  it('refuses a control character before sealing, and keeps the input to fix', async () => {
    await create(
      bridge(),
      bridgePrinter({ kind: 'prusalink', secretFields: ['password'] })
    );
    type('password', 'abc\tdef');
    save('password');
    expect(service.setSecret).not.toHaveBeenCalled();
    expect(byTestId('credential-error')!.textContent).toContain('tab');
    expect(input('password').value).toBe('abc\tdef');
    expect(logging.logEvent).toHaveBeenCalledWith('BridgeCredentials_Refused', {
      field: 'password',
      reason: 'control_character',
    });
  });

  it('asks again when the answer marks the new value stale', async () => {
    const entry = bridgePrinter();
    service.setSecret.mockReturnValue(of(stored(entry, 'access_code', true)));
    await create(bridge(), entry);
    type('access_code', '12345678');
    save('access_code');
    await until(() => !!byTestId('credential-error'));
    expect(byTestId('credential-error')!.textContent).toContain(
      'enter the access code again'
    );
    expect(reloads).toBe(1);
    expect(byTestId('credential-saved')).toBeNull();
  });

  for (const code of [
    'bridge_key_changed',
    'bridge_key_unconfirmed',
    'bridge_key_missing',
  ]) {
    it(`reloads the bridge on ${code}, without retrying`, async () => {
      service.setSecret.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { code, keyFingerprint: OTHER_BRIDGE_KEY.fingerprint },
            })
        )
      );
      await create();
      type('access_code', '12345678');
      save('access_code');
      await until(() => !!byTestId('credential-error'));
      expect(reloads).toBe(1);
      expect(service.setSecret).toHaveBeenCalledTimes(1);
      expect(el().textContent).not.toContain(OTHER_BRIDGE_KEY.short);
      expect(logging.logEvent).toHaveBeenCalledWith(
        'BridgeCredentials_Failed',
        { field: 'access_code', code }
      );
    });
  }

  it('shows set, stale, another key and the issues the bridge reported', async () => {
    await create(
      bridge(),
      bridgePrinter({
        kind: 'prusalink',
        secretFields: ['password', 'username', 'api_key'],
        secrets: [
          {
            field: 'password',
            keyFingerprint: TEST_BRIDGE_KEY.fingerprint,
            updatedAt: '2026-10-27T18:05:00Z',
            stale: false,
          },
          {
            field: 'username',
            keyFingerprint: OTHER_BRIDGE_KEY.fingerprint,
            updatedAt: '2026-10-27T18:05:00Z',
            stale: true,
          },
          {
            field: 'api_key',
            keyFingerprint: OTHER_BRIDGE_KEY.fingerprint,
            updatedAt: '2026-10-27T18:05:00Z',
            stale: false,
          },
        ],
        credentialIssues: [{ field: 'password', code: 'rejected_by_printer' }],
      })
    );
    const state = (name: string) =>
      byTestId('credential-state', field(name))!.textContent!.trim();
    expect(state('password')).toBe('Set');
    expect(state('username')).toContain('old key');
    expect(state('api_key')).toContain('compare the key');
    expect(state('api_key')).not.toContain('enter it again');
    expect(
      byTestId('credential-issue', field('password'))!.textContent
    ).toContain('The printer refused this password');
    expect(el().textContent).not.toContain(OTHER_BRIDGE_KEY.short);
    expect(
      byTestId('credential-save', field('password'))!.textContent
    ).toContain('Replace');
  });

  it('clears a credential and passes the entry on without it', async () => {
    service.clearSecret.mockReturnValue(of(undefined));
    await create(bridge(), stored(bridgePrinter(), 'access_code'));
    byTestId('credential-clear', field('access_code'))!.click();
    fixture.detectChanges();
    expect(service.clearSecret).toHaveBeenCalledTimes(1);
    expect(service.clearSecret).toHaveBeenCalledWith(42, 7, 'access_code');
    expect(changes[0].secrets).toEqual([]);
  });

  it('falls back to the config-file section for a bridge without a key', async () => {
    await create(bridge({ publicKey: null }), bridgePrinter({ id: 7 }));
    expect(byTestId('credentials-unavailable')!.textContent).toContain(
      'update printlog-bridge'
    );
    expect(byTestId('credentials-snippet')!.textContent).toContain(
      '[app_printer 7]'
    );
    expect(el().querySelector('input')).toBeNull();
  });

  it('asks to confirm first when the only key is pending', async () => {
    await create(
      bridge({ publicKey: null, pendingPublicKey: OTHER_BRIDGE_KEY.publicKey })
    );
    expect(byTestId('credentials-unavailable')!.textContent).toContain(
      'waiting for you to confirm'
    );
    expect(el().querySelector('input')).toBeNull();
  });

  it('refuses a malformed key instead of sealing to it', async () => {
    await create(bridge({ publicKey: TEST_BRIDGE_KEY.publicKey.slice(0, -2) }));
    expect(byTestId('credentials-unavailable')!.textContent).toContain(
      "isn't valid"
    );
  });

  it('warns that a pending key will need the value again', async () => {
    await create(bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey }));
    expect(byTestId('credentials-pending')).not.toBeNull();
    expect(input('access_code')).not.toBeNull();
  });

  it('seals to the same key the fixture fingerprint names', async () => {
    const key = await importBridgeKey(TEST_BRIDGE_KEY.publicKey);
    expect(key.fingerprint).toBe(TEST_BRIDGE_KEY.fingerprint);
    const other = await importBridgeKey(OTHER_BRIDGE_KEY.publicKey);
    expect(other.fingerprint).toBe(OTHER_BRIDGE_KEY.fingerprint);
  });
  afterEach(() => localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY));

  it('does not overwrite a pin that changed while the seal was in flight', async () => {
    pinBefore(TEST_BRIDGE_KEY.fingerprint);
    const answer = new Subject<BridgePrinter>();
    service.setSecret.mockReturnValue(answer);
    await create();
    type('access_code', '12345678');
    save('access_code');
    await until(() => vi.mocked(service.setSecret).mock.calls.length === 1);
    // Meanwhile the user confirmed another key (here, or in another tab).
    TestBed.inject(BridgeKeyPinsService).pin(42, OTHER_BRIDGE_KEY.fingerprint);
    answer.next(stored(bridgePrinter(), 'access_code'));
    answer.complete();
    fixture.detectChanges();
    expect(TestBed.inject(BridgeKeyPinsService).pinned(42)).toBe(
      OTHER_BRIDGE_KEY.fingerprint
    );
  });

  it('points at the warning above instead of repeating it on the card', async () => {
    pinBefore(OTHER_BRIDGE_KEY.fingerprint);
    await create(bridge(), bridgePrinter(), true);
    expect(byTestId('key-changed')).toBeNull();
    expect(byTestId('key-changed-pointer')!.textContent).toContain(
      'Confirm the key above first'
    );
    expect(el().querySelector('[data-testid="credential-input"]')).toBeNull();
  });

  it('does not warn while the key in hand is still being imported', async () => {
    pinBefore(OTHER_BRIDGE_KEY.fingerprint);
    await create(bridge({ publicKey: OTHER_BRIDGE_KEY.publicKey }));
    expect(byTestId('key-changed')).toBeNull();
    // The bridge now carries the key the user just confirmed elsewhere; the pin moves first.
    TestBed.inject(BridgeKeyPinsService).pin(42, TEST_BRIDGE_KEY.fingerprint);
    fixture.componentRef.setInput('bridge', bridge());
    fixture.detectChanges();
    expect(byTestId('key-changed')).toBeNull();
    await until(
      () =>
        !!byTestId('credentials-fingerprint')?.textContent?.includes(
          TEST_BRIDGE_KEY.short
        )
    );
    expect(byTestId('key-changed')).toBeNull();
  });
});
