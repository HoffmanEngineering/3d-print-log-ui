import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BridgeKeyPinsService } from 'src/app/core/services/bridge-key-pins.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { OTHER_BRIDGE_KEY, TEST_BRIDGE_KEY } from '../testing/bridge-fixtures';
import { BridgeKeyChangedComponent } from './bridge-key-changed.component';

describe('BridgeKeyChangedComponent', () => {
  let fixture: ComponentFixture<BridgeKeyChangedComponent>;
  let pins: MockedObject<BridgeKeyPinsService>;
  let logging: MockedObject<LoggingService>;

  beforeEach(async () => {
    pins = {
      pin: vi.fn().mockName('BridgeKeyPinsService.pin'),
      pinned: vi.fn().mockName('BridgeKeyPinsService.pinned'),
    } as unknown as MockedObject<BridgeKeyPinsService>;
    pins.pinned.mockReturnValue(TEST_BRIDGE_KEY.fingerprint);
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
    } as unknown as MockedObject<LoggingService>;
    await TestBed.configureTestingModule({
      imports: [BridgeKeyChangedComponent],
      providers: [
        { provide: BridgeKeyPinsService, useValue: pins },
        { provide: LoggingService, useValue: logging },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BridgeKeyChangedComponent);
    fixture.componentRef.setInput('bridgeId', 42);
    fixture.componentRef.setInput('fingerprint', OTHER_BRIDGE_KEY.fingerprint);
    fixture.componentRef.setInput('context', 'card');
    fixture.detectChanges();
  });

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('says the key changed without confirmation here, with both fingerprints', () => {
    const text = el().textContent!;
    expect(text).toContain(
      "This bridge's key changed without your confirmation in this browser."
    );
    expect(text).toContain('printlog-bridge status');
    expect(text).toContain(OTHER_BRIDGE_KEY.short);
    expect(text).toContain(TEST_BRIDGE_KEY.short);
  });

  it('pins the current key when the user says it matches', () => {
    (
      el().querySelector('[data-testid="key-changed-accept"]') as HTMLElement
    ).click();
    expect(pins.pin).toHaveBeenCalledTimes(1);
    expect(pins.pin).toHaveBeenCalledWith(42, OTHER_BRIDGE_KEY.fingerprint);
    expect(logging.logEvent).toHaveBeenCalledWith('Bridges_KeyAccepted', {
      context: 'card',
    });
  });
});
