import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BRIDGE_KEY_PINS_STORAGE_KEY } from 'src/app/core/services/bridge-key-pins.service';
import { Bridge } from 'src/app/core/services/bridges.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  OTHER_BRIDGE_KEY,
  TEST_BRIDGE_KEY,
  bridge,
} from '../testing/bridge-fixtures';
import { BridgeKeyComponent } from './bridge-key.component';

describe('BridgeKeyComponent', () => {
  let fixture: ComponentFixture<BridgeKeyComponent>;
  let confirmed: string[];

  async function create(b: Bridge, ready: string) {
    await TestBed.configureTestingModule({
      imports: [BridgeKeyComponent],
      providers: [
        provideRouter([]),
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BridgeKeyComponent);
    fixture.componentRef.setInput('bridge', b);
    confirmed = [];
    fixture.componentInstance.confirm.subscribe((f) => confirmed.push(f));
    await until(() => !!byTestId(ready));
  }

  beforeEach(() => localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY));
  afterEach(() => localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY));

  function pinBefore(fingerprint: string): void {
    localStorage.setItem(
      BRIDGE_KEY_PINS_STORAGE_KEY,
      JSON.stringify({ '42': fingerprint })
    );
  }

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

  function byTestId(id: string): HTMLElement | null {
    return el().querySelector(`[data-testid="${id}"]`);
  }

  /** The API's own fingerprints, which must never reach the screen or the confirmation. */
  function withApiFingerprints(b: Bridge): Bridge {
    return {
      ...b,
      publicKeyFingerprint: 'dead'.repeat(16),
      pendingPublicKeyFingerprint: 'beef'.repeat(16),
    } as Bridge;
  }

  it('shows the fingerprint computed from the current key', async () => {
    await create(withApiFingerprints(bridge()), 'bridge-key-current');
    expect(byTestId('bridge-key-current')!.textContent).toContain(
      TEST_BRIDGE_KEY.short
    );
    expect(el().textContent).not.toContain('dead');
    expect(byTestId('bridge-key-pending')).toBeNull();
  });

  it('says to update a bridge without a key', async () => {
    await create(bridge({ publicKey: null }), 'bridge-key-none');
    expect(byTestId('bridge-key-none')!.textContent).toContain(
      'Update printlog-bridge'
    );
  });

  it('compares both computed fingerprints and confirms with the pending one it computed', async () => {
    await create(
      withApiFingerprints(
        bridge({
          pendingPublicKey: OTHER_BRIDGE_KEY.publicKey,
          pendingPublicKeyAt: '2026-10-27T18:00:00Z',
        })
      ),
      'bridge-key-new'
    );
    await until(() => !!byTestId('bridge-key-current')?.textContent?.trim());
    expect(byTestId('bridge-key-current')!.textContent).toContain(
      TEST_BRIDGE_KEY.short
    );
    expect(byTestId('bridge-key-new')!.textContent).toContain(
      OTHER_BRIDGE_KEY.short
    );
    expect(
      byTestId('bridge-key-new-full')!.textContent!.replace(/\s/g, '')
    ).toBe(OTHER_BRIDGE_KEY.fingerprint);
    expect(el().textContent).toContain('printlog-bridge status');
    expect(el().textContent).not.toContain('dead');
    expect(el().textContent).not.toContain('beef');

    byTestId('bridge-key-confirm')!.click();
    expect(confirmed).toEqual([OTHER_BRIDGE_KEY.fingerprint]);
  });

  it('asks to confirm a first key that arrived after registration', async () => {
    await create(
      bridge({ publicKey: null, pendingPublicKey: TEST_BRIDGE_KEY.publicKey }),
      'bridge-key-new'
    );
    expect(byTestId('bridge-key-pending')!.textContent).toContain(
      'Confirm its encryption key'
    );
    expect(byTestId('bridge-key-current')).toBeNull();
  });

  it('warns when key changes are throttled and links to revoking', async () => {
    await create(
      bridge({
        pendingPublicKey: OTHER_BRIDGE_KEY.publicKey,
        keyChangesThrottled: true,
      }),
      'bridge-key-new'
    );
    const warning = byTestId('bridge-key-throttled')!;
    expect(warning.textContent).toContain('keeps changing');
    expect(warning.textContent).toContain('device token');
    expect(warning.querySelector('a')!.getAttribute('href')).toBe(
      '/settings#paired-devices'
    );
  });

  it('offers no confirmation for an invalid pending key', async () => {
    await create(
      bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey.slice(1) }),
      'bridge-key-invalid'
    );
    expect(byTestId('bridge-key-confirm')).toBeNull();
  });

  it('does not confirm twice while busy', async () => {
    await create(
      bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey }),
      'bridge-key-new'
    );
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    byTestId('bridge-key-confirm')!.click();
    expect(confirmed).toEqual([]);
  });

  it('warns when the key changed without confirmation in this browser', async () => {
    pinBefore(OTHER_BRIDGE_KEY.fingerprint);
    await create(bridge(), 'key-changed');
    expect(byTestId('key-changed-now')!.textContent).toContain(
      TEST_BRIDGE_KEY.short
    );
    byTestId('key-changed-accept')!.click();
    fixture.detectChanges();
    expect(byTestId('key-changed')).toBeNull();
  });

  it('does not warn without a pin, or with a matching one', async () => {
    pinBefore(TEST_BRIDGE_KEY.fingerprint);
    await create(bridge(), 'bridge-key-current');
    expect(byTestId('key-changed')).toBeNull();
  });

  it('keeps warning about a throttled bridge with no key pending', async () => {
    await create(bridge({ keyChangesThrottled: true }), 'bridge-key-throttled');
    expect(byTestId('bridge-key-throttled')!.textContent).toContain(
      'keeps changing'
    );
    expect(byTestId('bridge-key-pending')).toBeNull();
  });

  it('says this browser cannot encrypt here, not that the key is invalid', async () => {
    spyOnProperty(Crypto.prototype, 'subtle', 'get').and.returnValue(
      undefined as unknown as SubtleCrypto
    );
    await create(bridge(), 'bridge-key-unavailable');
    expect(byTestId('bridge-key-unavailable')!.textContent).toContain(
      "can't encrypt here"
    );
    expect(byTestId('bridge-key-invalid')).toBeNull();
  });
});
