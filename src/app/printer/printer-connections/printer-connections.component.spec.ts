import type { MockedObject } from 'vitest';
import { lastSimpleDialogData } from 'src/app/shared/simple-dialog/testing/last-simple-dialog-data';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterCategory } from 'src/app/core/services/printer-categories.service';
import { environment } from 'src/environments/environment';
import { PrinterConnectionsComponent } from './printer-connections.component';

describe('PrinterConnectionsComponent', () => {
  let fixture: ComponentFixture<PrinterConnectionsComponent>;
  let httpMock: HttpTestingController;
  let dialog: MockedObject<MatDialog>;
  let confirm: boolean | undefined;
  let toastr: MockedObject<ToastrService>;
  let logging: MockedObject<LoggingService>;
  let clipboard: MockedObject<Clipboard>;

  const fff = { nickname: 'FFF' } as PrinterCategory;
  const sla = { nickname: 'SLA' } as PrinterCategory;

  const base = `${environment.printLogApiUrl}/api/Connections`;

  const connection = (overrides: Record<string, unknown> = {}) => ({
    id: '0d6c7a52-6a8e-4f52-9e1e-3f0c9b0b2a11',
    kind: 'moonraker',
    instanceId: 'voron-1',
    displayName: 'Voron in the garage',
    agentVersion: '0.1.0',
    latestAgentVersion: '0.1.0',
    updateAvailable: false,
    printerId: 3,
    createdDate: '2026-10-01T12:00:00+00:00',
    lastSeenAt: '2026-10-10T08:30:00+00:00',
    status: 1,
    droppedNotifierEventCount: 0,
    lastDroppedNotifierEventAt: null,
    notifierNoticeDismissedAt: null,
    showNotifierNotice: false,
    ...overrides,
  });

  beforeEach(async () => {
    confirm = true;
    dialog = {
      open: vi.fn().mockName('MatDialog.open'),
    } as unknown as MockedObject<MatDialog>;
    dialog.open.mockImplementation(
      () =>
        ({
          afterClosed: () => of(confirm),
        }) as any
    );
    toastr = {
      success: vi.fn().mockName('ToastrService.success'),
      error: vi.fn().mockName('ToastrService.error'),
    } as unknown as MockedObject<ToastrService>;
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;

    clipboard = {
      copy: vi.fn().mockName('Clipboard.copy'),
    } as unknown as MockedObject<Clipboard>;
    clipboard.copy.mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [PrinterConnectionsComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
        { provide: Clipboard, useValue: clipboard },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PrinterConnectionsComponent);
    fixture.componentRef.setInput('printerId', 3);
  });

  afterEach(() => httpMock.verify());

  /** Renders with the API answering GET /api/Connections?printerId=3 with `body`. */
  const render = (body: unknown[]) => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === base && r.params.get('printerId') === '3')
      .flush(body);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const rows = () =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '[data-testid="connection-row"]'
      )
    );

  const squash = (el: Element | null | undefined) =>
    el?.textContent?.replace(/\s+/g, ' ').trim();

  it('shows each connection’s name, kind, agent version and last seen time', () => {
    render([connection()]);

    expect(rows().length).toBe(1);
    const row = rows()[0];
    expect(squash(row)).toContain('Voron in the garage');
    expect(squash(row)).toContain('Klipper (Moonraker)');
    expect(squash(row)).toContain('0.1.0');
    expect(
      row.querySelector('[data-testid="connection-last-seen"]')?.textContent
    ).toContain('2026');
    expect(row.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-10-10T08:30:00.000Z'
    );
  });

  // printlog-bridge#39: the API compares the agent's version with its latest release.
  it('says when a newer bridge is available, and links to how to update', () => {
    render([
      connection({ latestAgentVersion: '0.2.0', updateAvailable: true }),
    ]);

    const notice = rows()[0].querySelector('[data-testid="connection-update"]');
    expect(squash(notice)).toBe('printlog-bridge 0.2.0 is available');
    expect(notice?.getAttribute('href')).toBe('/docs/printlog-bridge#update');
  });

  it('says nothing about updates for the latest bridge', () => {
    render([connection()]);

    expect(
      rows()[0].querySelector('[data-testid="connection-update"]')
    ).toBeNull();
  });

  // An API from before printlog-bridge#39 sends neither field.
  it('says nothing about updates when the API does not know the latest version', () => {
    const { latestAgentVersion, updateAvailable, ...older } = connection();
    render([older]);

    expect(
      rows()[0].querySelector('[data-testid="connection-update"]')
    ).toBeNull();
  });

  it('marks an online connection as online', () => {
    render([connection()]);

    expect(
      squash(rows()[0].querySelector('[data-testid="connection-status"]'))
    ).toBe('Online');
  });

  // The API computes the status (stale after 15 minutes without a heartbeat); the page shows it.
  it('marks a stale connection as stale', () => {
    render([connection({ status: 2 })]);

    const status = rows()[0].querySelector('[data-testid="connection-status"]');
    expect(squash(status)).toBe('Stale');
    expect(status?.classList).toContain('stale');
  });

  it('renders nothing for a printer with no connections and no category', () => {
    const el = render([]);

    expect(el.querySelector('section')).toBeNull();
  });

  // The bridge logs filament printers only.
  it('renders nothing for a resin printer with no connections', () => {
    fixture.componentRef.setInput('category', sla);
    const el = render([]);

    expect(el.querySelector('section')).toBeNull();
  });

  // printlog-bridge#82: printers other than Klipper ones.
  it('shows the firmware and host software the bridge reported', () => {
    render([
      connection({
        kind: 'prusalink',
        firmwareName: 'Prusa-Firmware-Buddy',
        firmwareVersion: '6.2.1',
        hostSoftwareName: 'PrusaLink',
        hostSoftwareVersion: '2.1.2',
      }),
    ]);

    const software = rows()[0].querySelector(
      '[data-testid="connection-software"]'
    );
    expect(squash(rows()[0])).toContain('PrusaLink');
    expect(squash(software)).toBe(
      'Prusa-Firmware-Buddy 6.2.1 · PrusaLink 2.1.2'
    );
  });

  it('falls back to the Klipper and Moonraker versions of an older bridge', () => {
    render([
      connection({ klipperVersion: 'v0.12.0', moonrakerVersion: 'v0.9.3' }),
    ]);

    expect(
      squash(rows()[0].querySelector('[data-testid="connection-software"]'))
    ).toBe('Klipper v0.12.0 · Moonraker v0.9.3');
  });

  it('shows no software line when the bridge reported none', () => {
    render([connection()]);

    expect(
      rows()[0].querySelector('[data-testid="connection-software"]')
    ).toBeNull();
  });

  describe('connecting a printer', () => {
    const setup = () =>
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="bridge-setup"]'
      );
    const open = () => {
      (
        (fixture.nativeElement as HTMLElement).querySelector(
          '[data-testid="bridge-setup-open"]'
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();
    };
    const snippet = () =>
      setup()?.querySelector('[data-testid="bridge-setup-config"]')
        ?.textContent;
    const choose = (kind: string) => {
      (
        setup()!.querySelector(
          `[data-testid="bridge-setup-kind-${kind}"]`
        ) as HTMLElement
      ).click();
      fixture.detectChanges();
    };

    beforeEach(() => fixture.componentRef.setInput('category', fff));

    it('offers to connect a filament printer that has no connections', () => {
      const el = render([]);

      expect(el.querySelector('section')).not.toBeNull();
      expect(setup()).toBeNull();
      open();
      expect(setup()).not.toBeNull();
    });

    it('does not offer it once the printer has a connection', () => {
      const el = render([connection()]);

      expect(el.querySelector('[data-testid="bridge-setup-open"]')).toBeNull();
    });

    it('starts with Klipper and its guides, as today', () => {
      render([]);
      open();

      expect(snippet()).toContain('printer_id = 3');
      expect(snippet()).toContain('url = http://');
      expect(snippet()).not.toContain('adapter');
      const links = Array.from(setup()!.querySelectorAll('a')).map((a) =>
        a.getAttribute('href')
      );
      expect(links).toContain('/docs/printlog-bridge-install');
      expect(links).toContain('/docs/printlog-bridge-docker');
    });

    it('starts with the type that matches the printer’s make', () => {
      fixture.componentRef.setInput('make', 'Bambu Lab');
      render([]);
      open();

      expect(snippet()).toContain('adapter = bambu');
    });

    it('shows the Bambu steps and config when Bambu Lab is picked', () => {
      render([]);
      open();
      choose('bambu');

      expect(snippet()).toContain('adapter = bambu');
      expect(snippet()).toContain('printer_id = 3');
      expect(snippet()).toContain('serial =');
      expect(snippet()).toContain('access_code =');
      expect(squash(setup())).toContain('Developer Mode');
      expect(
        setup()!
          .querySelector('[data-testid="bridge-setup-guide"]')
          ?.getAttribute('href')
      ).toBe('/docs/printlog-bridge-bambu');
    });

    it('shows the PrusaLink steps and config when PrusaLink is picked', () => {
      render([]);
      open();
      choose('prusalink');

      expect(snippet()).toContain('adapter = prusalink');
      expect(snippet()).toContain('printer_id = 3');
      expect(snippet()).toContain('password =');
      expect(
        setup()!
          .querySelector('[data-testid="bridge-setup-guide"]')
          ?.getAttribute('href')
      ).toBe('/docs/printlog-bridge-prusalink');
    });

    it('shows the OctoPrint steps and config when OctoPrint is picked', () => {
      render([]);
      open();
      choose('octoprint');

      expect(snippet()).toContain('adapter = octoprint');
      expect(snippet()).toContain('printer_id = 3');
      expect(snippet()).toContain('api_key =');
      expect(squash(setup())).toContain('Application Keys');
      expect(squash(setup())).toContain('API key');
      const links = Array.from(setup()!.querySelectorAll('a')).map((a) =>
        a.getAttribute('href')
      );
      expect(links).toContain('/docs/switch-from-octoprint-webhook');
      expect(
        setup()!
          .querySelector('[data-testid="bridge-setup-guide"]')
          ?.getAttribute('href')
      ).toBe('/docs/printlog-bridge-octoprint');
    });

    it('shows the SDCP steps and a config with no credential when Elegoo is picked', () => {
      render([]);
      open();
      choose('sdcp');

      expect(snippet()).toContain('adapter = sdcp');
      expect(snippet()).toContain('printer_id = 3');
      expect(snippet()).not.toContain('password');
      expect(squash(setup())).toContain('no password');
      // Nothing secret in this section, so no warning about where to keep it.
      expect(squash(setup())).not.toContain('Keep the config where');
      expect(
        setup()!
          .querySelector('[data-testid="bridge-setup-guide"]')
          ?.getAttribute('href')
      ).toBe('/docs/printlog-bridge-sdcp');
    });

    it('starts on SDCP for an Elegoo Centauri Carbon', () => {
      fixture.componentRef.setInput('make', 'Elegoo');
      fixture.componentRef.setInput('model', 'Centauri Carbon');
      render([]);
      open();

      expect(snippet()).toContain('adapter = sdcp');
    });

    it('shows the Duet steps, with the password only for a board that has one', () => {
      render([]);
      open();
      choose('duet');

      expect(snippet()).toContain('adapter = duet');
      expect(snippet()).toContain('printer_id = 3');
      expect(snippet()).toContain('# password =');
      expect(squash(setup())).toContain('M551');
      expect(squash(setup())).toContain('Keep the config where');
      expect(
        setup()!
          .querySelector('[data-testid="bridge-setup-guide"]')
          ?.getAttribute('href')
      ).toBe('/docs/printlog-bridge-duet');
    });

    it('shows the FlashForge steps, with the check code and no serial to find', () => {
      render([]);
      open();
      choose('flashforge');

      expect(snippet()).toContain('adapter = flashforge');
      expect(snippet()).toContain('printer_id = 3');
      expect(snippet()).toContain('check_code =');
      expect(snippet()).toContain('# serial =');
      expect(squash(setup())).toContain('LAN-only mode');
      expect(squash(setup())).toContain('check code');
      expect(squash(setup())).toContain('Keep the config where');
      expect(
        setup()!
          .querySelector('[data-testid="bridge-setup-guide"]')
          ?.getAttribute('href')
      ).toBe('/docs/printlog-bridge-flashforge');
    });

    it('shows the Anycubic steps and a config with no credential', () => {
      render([]);
      open();
      choose('anycubic');

      expect(snippet()).toContain('adapter = anycubic');
      expect(snippet()).toContain('printer_id = 3');
      expect(snippet()).not.toContain('password');
      expect(squash(setup())).toContain('LAN mode');
      expect(squash(setup())).not.toContain('Keep the config where');
      expect(
        setup()!
          .querySelector('[data-testid="bridge-setup-guide"]')
          ?.getAttribute('href')
      ).toBe('/docs/printlog-bridge-anycubic');
    });

    it('starts on the matching type for a Duet, a FlashForge and an Anycubic Kobra S1', () => {
      fixture.componentRef.setInput('make', 'Duet3D');
      render([]);
      open();
      expect(snippet()).toContain('adapter = duet');

      fixture.componentRef.setInput('make', 'FlashForge');
      fixture.detectChanges();
      expect(snippet()).toContain('adapter = flashforge');

      fixture.componentRef.setInput('make', 'Anycubic');
      fixture.componentRef.setInput('model', 'Kobra S1');
      fixture.detectChanges();
      expect(snippet()).toContain('adapter = anycubic');
    });

    // The Photon P1 Max is a resin printer: it gets the setup, with Anycubic as its only type.
    it('offers an Anycubic Photon P1 Max, a resin printer, the Anycubic setup only', () => {
      fixture.componentRef.setInput('category', sla);
      fixture.componentRef.setInput('make', 'Anycubic');
      fixture.componentRef.setInput('model', 'Photon P1 Max');
      render([]);
      open();

      expect(snippet()).toContain('adapter = anycubic');
      const kinds = Array.from(
        setup()!.querySelectorAll('[data-testid^="bridge-setup-kind-"]')
      ).map((b) => b.getAttribute('data-testid'));
      expect(kinds).toEqual(['bridge-setup-kind-anycubic']);
      expect(squash(setup())).toContain('Photon Workshop');
    });

    // Any other resin printer has no adapter yet.
    it('offers nothing for another resin printer', () => {
      fixture.componentRef.setInput('category', sla);
      fixture.componentRef.setInput('make', 'Elegoo');
      fixture.componentRef.setInput('model', 'Saturn 4 Ultra');
      const el = render([]);

      expect(el.querySelector('section')).toBeNull();
    });

    it('copies the config section', () => {
      render([]);
      open();
      choose('prusalink');

      (
        setup()!.querySelector(
          '[data-testid="bridge-setup-copy"]'
        ) as HTMLButtonElement
      ).click();

      expect(clipboard.copy).toHaveBeenCalledWith(
        expect.stringContaining('adapter = prusalink')
      );
      expect(toastr.success).toHaveBeenCalled();
      expect(logging.logEvent).toHaveBeenCalledWith(
        'PrinterConnections_SetupCopied',
        { kind: 'prusalink' }
      );
    });

    // The page is a form; a plain <button> inside it would submit the printer.
    it('uses buttons that do not submit the surrounding form', () => {
      render([]);
      open();

      const buttons = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('button')
      );
      expect(buttons.length).toBeGreaterThan(0);
      for (const b of buttons) {
        expect(b.getAttribute('type')).toBe('button');
      }
    });
  });

  // The printer page is a form people come to for other reasons; a failed lookup here must not
  // put an error in their way.
  it('renders nothing when the connections cannot be loaded', () => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === base)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('section')
    ).toBeNull();
    expect(logging.logException).toHaveBeenCalled();
  });

  it('says the prints are kept before deleting, then deletes', () => {
    render([connection(), connection({ instanceId: 'voron-2' })]);

    (
      rows()[0].querySelector(
        '[data-testid="connection-delete"]'
      ) as HTMLButtonElement
    ).click();

    expect(dialog.open).toHaveBeenCalled();
    expect(lastSimpleDialogData(dialog).body).toContain('kept');
    const request = httpMock.expectOne(`${base}/voron-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(rows().length).toBe(1);
    expect(toastr.success).toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith(
      'PrinterConnections_Deleted',
      expect.objectContaining({ kind: 'moonraker' })
    );
  });

  it('keeps the connection when the confirmation is declined', () => {
    render([connection()]);
    confirm = undefined;

    (
      rows()[0].querySelector(
        '[data-testid="connection-delete"]'
      ) as HTMLButtonElement
    ).click();

    httpMock.expectNone((r) => r.method === 'DELETE');
    expect(rows().length).toBe(1);
  });

  it('keeps the row and reports the error when the delete fails', () => {
    render([connection()]);

    (
      rows()[0].querySelector(
        '[data-testid="connection-delete"]'
      ) as HTMLButtonElement
    ).click();
    httpMock
      .expectOne(`${base}/voron-1`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(rows().length).toBe(1);
    expect(toastr.error).toHaveBeenCalled();
  });

  // The page is a form; a plain <button> inside it would submit the printer.
  it('does not submit the surrounding form', () => {
    render([connection()]);

    expect(
      rows()[0]
        .querySelector('[data-testid="connection-delete"]')
        ?.getAttribute('type')
    ).toBe('button');
  });

  describe('which bridge watches it', () => {
    const bridges = `${environment.printLogApiUrl}/api/bridges`;

    it('names the bridge and links to the Bridges screen', () => {
      render([connection({ bridgeId: 42 })]);
      httpMock
        .expectOne(bridges)
        .flush([{ id: 42, displayName: 'Garage NAS', deviceName: 'nas' }]);
      fixture.detectChanges();

      const via = rows()[0].querySelector('[data-testid="connection-bridge"]');
      expect(squash(via)).toContain('Garage NAS');
      expect(via?.getAttribute('href')).toBe('/printers/bridges');
    });

    it('offers to move it when the user has another bridge', () => {
      render([connection({ bridgeId: 42 })]);
      httpMock.expectOne(bridges).flush([
        { id: 42, displayName: 'Garage NAS', deviceName: 'nas' },
        { id: 9, displayName: 'Attic Pi', deviceName: 'attic' },
      ]);
      fixture.detectChanges();

      const move = rows()[0].querySelector('[data-testid="connection-move"]');
      expect(squash(move)).toContain('Move to another bridge');
      expect(move?.getAttribute('href')).toBe(
        `/printers/bridges?move=${fixture.componentInstance.printerId()}`
      );
    });

    it('offers no move with a single bridge', () => {
      render([connection({ bridgeId: 42 })]);
      httpMock
        .expectOne(bridges)
        .flush([{ id: 42, displayName: 'Garage NAS', deviceName: 'nas' }]);
      fixture.detectChanges();
      expect(
        rows()[0].querySelector('[data-testid="connection-move"]')
      ).toBeNull();
    });

    it('says "a bridge" when the bridges cannot be loaded', () => {
      render([connection({ bridgeId: 42 })]);
      httpMock
        .expectOne(bridges)
        .flush('nope', { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      const via = rows()[0].querySelector('[data-testid="connection-bridge"]');
      expect(squash(via)).toContain('a bridge');
    });

    it('does not ask for bridges when no connection has one', () => {
      render([connection({ bridgeId: null }), connection({ instanceId: 'b' })]);
      httpMock.expectNone(bridges);
      expect(
        rows()[0].querySelector('[data-testid="connection-bridge"]')
      ).toBeNull();
    });

    it('points a printer with no connection to the Bridges screen too', () => {
      fixture.componentRef.setInput('category', fff);
      render([]);
      const link = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="bridge-setup-bridges"]'
      );
      expect(link?.getAttribute('href')).toBe('/printers/bridges');
    });
  });
});
