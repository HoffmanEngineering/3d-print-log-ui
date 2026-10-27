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
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  OTHER_BRIDGE_KEY,
  TEST_BRIDGE_KEY,
  bridge,
  bridgePrinter,
} from '../testing/bridge-fixtures';
import { BridgeCredentialsComponent } from './bridge-credentials.component';

describe('BridgeCredentialsComponent', () => {
  let service: jasmine.SpyObj<BridgesService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let fixture: ComponentFixture<BridgeCredentialsComponent>;
  let changes: BridgePrinter[];
  let reloads: number;

  async function create(
    b: Bridge = bridge(),
    entry: BridgePrinter = bridgePrinter()
  ) {
    await TestBed.configureTestingModule({
      imports: [BridgeCredentialsComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: BridgesService, useValue: service },
        { provide: LoggingService, useValue: logging },
        {
          provide: ToastrService,
          useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']),
        },
        {
          provide: Clipboard,
          useValue: { copy: jasmine.createSpy('copy').and.returnValue(true) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BridgeCredentialsComponent);
    fixture.componentRef.setInput('bridge', b);
    fixture.componentRef.setInput('entry', entry);
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
    service = jasmine.createSpyObj<BridgesService>('BridgesService', [
      'setSecret',
      'clearSecret',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
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

  it('uses password inputs with autocomplete off, a text input for the username', async () => {
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
    for (const name of ['password', 'username', 'api_key']) {
      expect(input(name).getAttribute('autocomplete')).toBe('off');
    }
  });

  it('seals what was typed (trimmed) to the bridge key, sends the computed fingerprint and forgets the value', async () => {
    const entry = bridgePrinter();
    const answer = new Subject<BridgePrinter>();
    service.setSecret.and.returnValue(answer);
    await create(bridge(), entry);

    type('access_code', ' 12345678 ');
    save('access_code');
    // The form is cleared before the seal even finishes.
    expect(input('access_code').value).toBe('');
    await until(() => service.setSecret.calls.count() === 1);

    const [bridgeId, entryId, fieldName, body] =
      service.setSecret.calls.mostRecent().args;
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
    for (const call of logging.logEvent.calls.all()) {
      expect(JSON.stringify(call.args)).not.toContain('12345678');
      expect(JSON.stringify(call.args)).not.toContain('v1.');
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
    service.setSecret.and.returnValue(of(stored(entry, 'access_code', true)));
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
      service.setSecret.and.returnValue(
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
    expect(state('api_key')).toContain('another key');
    expect(
      byTestId('credential-issue', field('password'))!.textContent
    ).toContain('The printer refused this password');
    expect(el().textContent).not.toContain(OTHER_BRIDGE_KEY.short);
    expect(
      byTestId('credential-save', field('password'))!.textContent
    ).toContain('Replace');
  });

  it('clears a credential and passes the entry on without it', async () => {
    service.clearSecret.and.returnValue(of(undefined));
    await create(bridge(), stored(bridgePrinter(), 'access_code'));
    byTestId('credential-clear', field('access_code'))!.click();
    fixture.detectChanges();
    expect(service.clearSecret).toHaveBeenCalledOnceWith(42, 7, 'access_code');
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
});
