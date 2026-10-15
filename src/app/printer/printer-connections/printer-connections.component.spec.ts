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
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import { environment } from 'src/environments/environment';
import { PrinterConnectionsComponent } from './printer-connections.component';

describe('PrinterConnectionsComponent', () => {
  let fixture: ComponentFixture<PrinterConnectionsComponent>;
  let httpMock: HttpTestingController;
  let dialog: jasmine.SpyObj<MatDialog>;
  let confirm: boolean | undefined;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logging: jasmine.SpyObj<LoggingService>;

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
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.callFake(
      () =>
        ({
          afterClosed: () => of(confirm),
        }) as any
    );
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);

    await TestBed.configureTestingModule({
      imports: [PrinterConnectionsComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
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

  it('renders nothing for a printer with no connections', () => {
    const el = render([]);

    expect(el.querySelector('section')).toBeNull();
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
      jasmine.objectContaining({ kind: 'moonraker' })
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
});
