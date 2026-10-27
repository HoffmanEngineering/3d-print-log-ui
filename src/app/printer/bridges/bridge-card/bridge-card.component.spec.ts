import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  Bridge,
  BridgePrinter,
  BridgesService,
  DiscoveredPrinter,
  DiscoveredPrinterState,
} from 'src/app/core/services/bridges.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { ConnectionStatus } from 'src/app/core/services/connection.service';
import {
  OTHER_BRIDGE_KEY,
  bridge,
  bridgePrinter,
  discovered,
} from '../testing/bridge-fixtures';
import { BridgeCardComponent } from './bridge-card.component';

describe('BridgeCardComponent', () => {
  let fixture: ComponentFixture<BridgeCardComponent>;

  const found: DiscoveredPrinter[] = [
    discovered({
      id: 1,
      state: DiscoveredPrinterState.New,
      name: 'Workshop X1C',
    }),
    discovered({
      id: 2,
      kind: 'moonraker',
      name: 'voron',
      model: 'Voron 2.4',
      address: '192.168.1.50',
      port: 7125,
      serial: null,
      state: DiscoveredPrinterState.Configured,
      printerEntryId: null,
    }),
    discovered({
      id: 3,
      kind: 'prusalink',
      name: 'MK4',
      address: '192.168.1.61',
      port: 80,
      serial: null,
      state: DiscoveredPrinterState.Connected,
      printerEntryId: 7,
    }),
    discovered({
      id: 4,
      kind: 'bambu',
      name: "Neighbor's A1",
      state: DiscoveredPrinterState.Ignored,
    }),
    discovered({
      id: 5,
      kind: 'octoprint',
      name: 'OctoPi',
      address: '192.168.1.70',
      port: 80,
      serial: null,
      state: DiscoveredPrinterState.New,
    }),
  ];
  const entries: BridgePrinter[] = [
    bridgePrinter({
      id: 7,
      printerId: 5,
      printerName: 'MK4',
      kind: 'prusalink',
      host: '192.168.1.61',
      port: 80,
      serial: null,
    }),
  ];

  async function create(
    b: Bridge = bridge(),
    d: DiscoveredPrinter[] | null = found,
    p: BridgePrinter[] | null = entries
  ) {
    await TestBed.configureTestingModule({
      imports: [BridgeCardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: BridgesService,
          useValue: jasmine.createSpyObj('BridgesService', [
            'setSecret',
            'clearSecret',
          ]),
        },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
        {
          provide: ToastrService,
          useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']),
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BridgeCardComponent);
    fixture.componentRef.setInput('bridge', b);
    fixture.componentRef.setInput('discovered', d);
    fixture.componentRef.setInput('printers', p);
    fixture.detectChanges();
  }

  function all(id: string): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        `[data-testid="${id}"]`
      )
    );
  }

  function one(id: string): HTMLElement | null {
    return all(id)[0] ?? null;
  }

  it('shows the bridge, its status, version and networks', async () => {
    await create(
      bridge({ updateAvailable: true, latestAgentVersion: '0.3.1' })
    );
    expect(one('bridge-name')!.textContent).toContain('Garage NAS');
    expect(one('bridge-location')!.textContent).toContain('Workshop');
    expect(one('bridge-status')!.textContent).toContain('Online');
    expect(one('bridge-update')!.textContent).toContain('0.3.1 is available');
    expect(one('bridge-networks')!.textContent).toContain('192.168.1.0/24');
    expect(one('bridge-revoke-link')!.getAttribute('href')).toBe(
      '/settings#paired-devices'
    );
  });

  it('says when a bridge is stale and turns Scan now off', async () => {
    await create(bridge({ status: ConnectionStatus.Stale }));
    expect(one('bridge-status')!.textContent).toContain('Stale');
    expect(one('bridge-stale')).not.toBeNull();
    expect((one('bridge-scan') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('groups what it found by state', async () => {
    await create();
    expect(all('bridge-connected-row').length).toBe(1);
    expect(all('bridge-new-row').length).toBe(2);
    expect(all('bridge-configured-row').length).toBe(1);
    expect(all('bridge-ignored-row').length).toBe(1);
  });

  it('offers Connect only for kinds the bridge can watch', async () => {
    await create();
    const rows = all('bridge-new-row');
    expect(rows[0].querySelector('[data-testid="bridge-connect"]')).not.toBe(
      null
    );
    expect(rows[1].querySelector('[data-testid="bridge-connect"]')).toBe(null);
    expect(rows[1].textContent).toContain("can't log this kind");
  });

  it('keeps config-file printers read-only', async () => {
    await create();
    const row = one('bridge-configured-row')!;
    expect(row.textContent).toContain('Managed by the config file');
    expect(row.querySelector('button')).toBeNull();
  });

  it('offers to remove an app entry the config file overrides', async () => {
    const both = found.map((d) =>
      d.id === 3 ? { ...d, state: DiscoveredPrinterState.Configured } : d
    );
    await create(bridge(), both);
    let removed: BridgePrinter | undefined;
    fixture.componentInstance.disconnect.subscribe((e) => (removed = e));
    expect(one('bridge-config-wins')).not.toBeNull();
    one('bridge-remove-app-entry')!.click();
    expect(removed?.id).toBe(7);
  });

  it('emits connect, ignore, unignore, disconnect and add by address', async () => {
    await create();
    const c = fixture.componentInstance;
    const events: string[] = [];
    c.connect.subscribe((d) => events.push(`connect:${d?.id ?? 'address'}`));
    c.ignore.subscribe((d) => events.push(`ignore:${d.id}`));
    c.unignore.subscribe((d) => events.push(`unignore:${d.id}`));
    c.disconnect.subscribe((e) => events.push(`disconnect:${e.id}`));

    one('bridge-connect')!.click();
    one('bridge-ignore')!.click();
    one('bridge-unignore')!.click();
    one('bridge-disconnect')!.click();
    one('bridge-add-by-address')!.click();

    expect(events).toEqual([
      'connect:1',
      'ignore:1',
      'unignore:4',
      'disconnect:7',
      'connect:address',
    ]);
  });

  it('shows the [app_printer] section on demand when the API lists no credential fields', async () => {
    await create(bridge(), found, [
      { ...entries[0], secretFields: undefined, secrets: undefined },
    ]);
    expect(one('bridge-snippet')).toBeNull();
    one('bridge-credentials-toggle')!.click();
    fixture.detectChanges();
    expect(one('bridge-snippet')!.textContent).toContain('[app_printer 7]');
    expect(one('bridge-credentials')).toBeNull();
  });

  it('opens the credentials of a connected printer and says their state in its row', async () => {
    await create(bridge(), found, [
      {
        ...entries[0],
        secretFields: ['password', 'username', 'api_key'],
        secrets: [],
        credentialIssues: [{ field: 'password', code: 'missing' }],
      },
    ]);
    const summary = one('bridge-credential-summary')!;
    expect(summary.textContent).toContain('needs the password');
    expect(summary.classList).toContain('warn');
    const toggle = one('bridge-credentials-toggle')!;
    expect(toggle.textContent).toContain('Credentials');
    toggle.click();
    fixture.detectChanges();
    expect(one('bridge-credentials')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('passes a key confirmation, entry changes and reloads up', async () => {
    await create(bridge({ pendingPublicKey: OTHER_BRIDGE_KEY.publicKey }));
    const events: string[] = [];
    const card = fixture.componentInstance;
    card.confirmKey.subscribe((f) => events.push(`confirm:${f}`));
    card.reloadBridge.subscribe(() => events.push('reload'));
    for (let i = 0; i < 100 && !one('bridge-key-confirm'); i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      fixture.detectChanges();
    }
    one('bridge-key-confirm')!.click();
    expect(events).toEqual([`confirm:${OTHER_BRIDGE_KEY.fingerprint}`]);
  });

  it('shows Scanning while a requested scan is not done', async () => {
    await create(
      bridge({
        scanRequestedAt: '2026-10-27T18:05:00Z',
        lastSweepAt: '2026-10-27T17:00:00Z',
      })
    );
    expect(one('bridge-scanning')).not.toBeNull();
    expect(one('bridge-scan')).toBeNull();
  });

  it('renames with the trimmed name and location', async () => {
    await create();
    let renamed: unknown;
    fixture.componentInstance.rename.subscribe((r) => (renamed = r));
    one('bridge-edit')!.click();
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      name: '  Garage  ',
      location: '',
    });
    one('bridge-edit-save')!.click();
    fixture.detectChanges();
    expect(renamed).toEqual({ name: 'Garage', location: '' });
    expect(one('bridge-edit-form')).toBeNull();
  });

  it('offers a retry when its printers could not be loaded', async () => {
    await create(bridge(), null, null);
    expect(one('bridge-load-failed')).not.toBeNull();
    expect(one('bridge-new-row')).toBeNull();
  });
});
