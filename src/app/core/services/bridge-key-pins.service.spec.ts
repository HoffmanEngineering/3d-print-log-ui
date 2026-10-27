import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BRIDGE_KEY_PINS_STORAGE_KEY,
  BridgeKeyPinsService,
} from './bridge-key-pins.service';

describe('BridgeKeyPinsService', () => {
  const a = 'a'.repeat(64);
  const b = 'b'.repeat(64);

  function create(platform = 'browser'): BridgeKeyPinsService {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: platform }],
    });
    return TestBed.inject(BridgeKeyPinsService);
  }

  beforeEach(() => localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY));
  afterEach(() => localStorage.removeItem(BRIDGE_KEY_PINS_STORAGE_KEY));

  it('has no pin for a bridge it never saw', () => {
    expect(create().pinned(42)).toBeNull();
  });

  it('keeps a pin per bridge, across instances', () => {
    const pins = create();
    pins.pin(42, a);
    pins.pin(9, b);
    expect(pins.pinned(42)).toBe(a);
    expect(pins.pinned(9)).toBe(b);
    const stored = JSON.parse(
      localStorage.getItem(BRIDGE_KEY_PINS_STORAGE_KEY)!
    ) as Record<string, string>;
    expect(stored).toEqual({ '42': a, '9': b });
  });

  it('reads pins stored earlier', () => {
    localStorage.setItem(
      BRIDGE_KEY_PINS_STORAGE_KEY,
      JSON.stringify({ '42': a })
    );
    expect(create().pinned(42)).toBe(a);
  });

  it('ignores a corrupt store and anything that is not a fingerprint', () => {
    localStorage.setItem(BRIDGE_KEY_PINS_STORAGE_KEY, '{not json');
    expect(create().pinned(42)).toBeNull();
    TestBed.resetTestingModule();
    localStorage.setItem(
      BRIDGE_KEY_PINS_STORAGE_KEY,
      JSON.stringify({ '42': 'nope', '9': 7 })
    );
    const pins = create();
    expect(pins.pinned(42)).toBeNull();
    expect(pins.pinned(9)).toBeNull();
  });

  it('refuses to pin anything that is not a fingerprint', () => {
    const pins = create();
    pins.pin(42, 'ABC');
    expect(pins.pinned(42)).toBeNull();
  });

  it('keeps working when storage throws', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('blocked');
    spyOn(Storage.prototype, 'setItem').and.throwError('blocked');
    const pins = create();
    expect(pins.pinned(42)).toBeNull();
    pins.pin(42, a);
    expect(pins.pinned(42)).toBe(a);
  });

  it('touches no storage on the server', () => {
    const get = spyOn(Storage.prototype, 'getItem').and.callThrough();
    const pins = create('server');
    pins.pin(42, a);
    expect(get).not.toHaveBeenCalled();
    expect(localStorage.getItem(BRIDGE_KEY_PINS_STORAGE_KEY)).toBeNull();
  });

  it("keeps another tab's pin written after this tab loaded", () => {
    const pins = create();
    // Another tab pins bridge 5 after this one loaded {}.
    localStorage.setItem(
      BRIDGE_KEY_PINS_STORAGE_KEY,
      JSON.stringify({ '5': b })
    );
    pins.pin(7, a);
    const stored = JSON.parse(
      localStorage.getItem(BRIDGE_KEY_PINS_STORAGE_KEY)!
    ) as Record<string, string>;
    expect(stored).toEqual({ '5': b, '7': a });
    expect(pins.pinned(5)).toBe(b);
    expect(pins.pinned(7)).toBe(a);
  });

  it('drops invalid entries another tab left when merging', () => {
    const pins = create();
    localStorage.setItem(
      BRIDGE_KEY_PINS_STORAGE_KEY,
      JSON.stringify({ '5': 'junk', x: b })
    );
    pins.pin(7, a);
    expect(
      JSON.parse(localStorage.getItem(BRIDGE_KEY_PINS_STORAGE_KEY)!)
    ).toEqual({ '7': a });
  });

  it('refreshes when another tab changes the pins', () => {
    const pins = create();
    expect(pins.pinned(42)).toBeNull();
    localStorage.setItem(
      BRIDGE_KEY_PINS_STORAGE_KEY,
      JSON.stringify({ '42': b })
    );
    window.dispatchEvent(
      new StorageEvent('storage', { key: BRIDGE_KEY_PINS_STORAGE_KEY })
    );
    expect(pins.pinned(42)).toBe(b);
  });

  it('ignores storage events for other keys and stops listening when destroyed', () => {
    const pins = create();
    localStorage.setItem(
      BRIDGE_KEY_PINS_STORAGE_KEY,
      JSON.stringify({ '42': b })
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme-mode' }));
    expect(pins.pinned(42)).toBeNull();
    TestBed.resetTestingModule();
    window.dispatchEvent(
      new StorageEvent('storage', { key: BRIDGE_KEY_PINS_STORAGE_KEY })
    );
    expect(pins.pinned(42)).toBeNull();
  });
});
