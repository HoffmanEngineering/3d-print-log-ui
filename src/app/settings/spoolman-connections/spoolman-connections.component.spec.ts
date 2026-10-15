import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import { environment } from 'src/environments/environment';
import { SpoolmanConnectionsComponent } from './spoolman-connections.component';

describe('SpoolmanConnectionsComponent', () => {
  let fixture: ComponentFixture<SpoolmanConnectionsComponent>;
  let httpMock: HttpTestingController;
  let dialog: jasmine.SpyObj<MatDialog>;
  let dialogInstance: { title?: string; body?: string; yesText?: string };
  let confirm: boolean | undefined;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logging: jasmine.SpyObj<LoggingService>;

  const listUrl = `${environment.printLogApiUrl}/api/SpoolmanConnections`;

  const connection = (overrides: Record<string, unknown> = {}) => ({
    id: 'c1',
    printerId: 3,
    printerName: 'Voron',
    name: 'Voron',
    createdDate: '2026-10-01T12:00:00',
    lastSeenAt: null,
    state: 'active',
    disabledReason: null,
    disabledAt: null,
    revokedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    confirm = true;
    dialogInstance = {};
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.callFake(
      () =>
        ({
          componentInstance: dialogInstance,
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

    // The real SpoolmanConnectionService, over HttpTestingController.
    await TestBed.configureTestingModule({
      imports: [SpoolmanConnectionsComponent, NoopAnimationsModule],
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
    fixture = TestBed.createComponent(SpoolmanConnectionsComponent);
  });

  afterEach(() => httpMock.verify());

  const el = () => fixture.nativeElement as HTMLElement;
  const rows = () =>
    Array.from(el().querySelectorAll('[data-testid="spoolman-row"]'));
  const squash = (e: Element | null | undefined) =>
    e?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  const render = (body: unknown[]) => {
    expect(() => fixture.detectChanges()).not.toThrow();
    httpMock.expectOne(listUrl).flush(body);
    fixture.detectChanges();
  };

  it('lists every live connection with its printer, and leaves revoked ones out', () => {
    render([
      connection(),
      connection({ id: 'c2', printerId: 4, printerName: 'Ender', name: 'E3' }),
      connection({ id: 'c3', state: 'revoked', revokedAt: '2026-10-02T00:00' }),
    ]);

    expect(rows().length).toBe(2);
    expect(squash(rows()[0])).toContain('Voron');
    expect(rows()[0].querySelector('a[href="/printers/3"]')).not.toBeNull();
    expect(squash(rows()[1])).toContain('Ender');
  });

  it('names a connection whose printer was deleted', () => {
    render([connection({ printerId: null, printerName: null, name: 'Old' })]);
    expect(squash(rows()[0])).toContain('Old');
    expect(squash(rows()[0])).toContain('printer deleted');
  });

  it('says so when there are none', () => {
    render([]);
    expect(rows().length).toBe(0);
    expect(squash(el())).toContain('No Spoolman connections');
  });

  it('shows a disabled connection as paused', () => {
    render([connection({ state: 'disabled', disabledReason: 'tier' })]);
    const status = rows()[0].querySelector('[data-testid="spoolman-state"]');
    expect(squash(status)).toBe('Paused');
    expect(squash(el())).toContain('Free includes 1 Spoolman printer');
  });

  it('asks for confirmation before revoking, and keeps the row when cancelled', () => {
    render([connection()]);
    confirm = false;

    rows()[0]
      .querySelector<HTMLButtonElement>('[data-testid="spoolman-revoke"]')!
      .click();
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    httpMock.expectNone(`${listUrl}/c1`);
    expect(rows().length).toBe(1);
  });

  it('revokes after confirmation and refreshes the list', () => {
    render([connection(), connection({ id: 'c2', printerName: 'Ender' })]);

    rows()[0]
      .querySelector<HTMLButtonElement>('[data-testid="spoolman-revoke"]')!
      .click();
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(dialogInstance.yesText).toBe('Revoke');
    const del = httpMock.expectOne(`${listUrl}/c1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });

    httpMock
      .expectOne(listUrl)
      .flush([
        connection({ state: 'revoked', revokedAt: '2026-10-14T00:00' }),
        connection({ id: 'c2', printerName: 'Ender' }),
      ]);
    fixture.detectChanges();

    expect(rows().length).toBe(1);
    expect(squash(rows()[0])).toContain('Ender');
    expect(toastr.success).toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith(
      'SpoolmanConnections_Revoked',
      jasmine.anything()
    );
  });

  it('keeps the row and says so when the revoke fails', () => {
    render([connection()]);

    rows()[0]
      .querySelector<HTMLButtonElement>('[data-testid="spoolman-revoke"]')!
      .click();
    httpMock
      .expectOne(`${listUrl}/c1`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(toastr.error).toHaveBeenCalled();
    expect(rows().length).toBe(1);
  });

  it('offers a retry when the list cannot load', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(listUrl)
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    el()
      .querySelector<HTMLButtonElement>('[data-testid="spoolman-retry"]')!
      .click();
    httpMock.expectOne(listUrl).flush([connection()]);
    fixture.detectChanges();
    expect(rows().length).toBe(1);
  });
});
