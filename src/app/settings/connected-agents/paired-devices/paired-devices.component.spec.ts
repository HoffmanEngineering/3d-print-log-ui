import { HttpErrorResponse } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, throwError } from 'rxjs';
import {
  DeviceGrant,
  DeviceGrantsService,
} from 'src/app/core/services/device-grants.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { PairedDevicesComponent } from './paired-devices.component';

describe('PairedDevicesComponent', () => {
  let service: jasmine.SpyObj<DeviceGrantsService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let fixture: ComponentFixture<PairedDevicesComponent>;
  let dialogAnswer: boolean | undefined;

  const voron: DeviceGrant = {
    id: 2,
    deviceId: '0b6f7f3e-6f0e-4c5b-9a43-0a3a2f7d1e11',
    name: 'printlog-bridge on voron',
    clientId: 'client',
    scopes: ['prints:write', 'printers:slots', 'connections:write'],
    createdAt: '2026-10-20T10:00:00+00:00',
    pairedAt: '2026-10-20T10:00:00+00:00',
    lastUsedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  };
  const ender: DeviceGrant = {
    id: 1,
    deviceId: '9d1c2b3a-1111-4c5b-9a43-0a3a2f7d1e22',
    name: 'printlog-bridge on ender',
    clientId: 'client',
    scopes: ['prints:write'],
    createdAt: '2026-10-01T10:00:00+00:00',
    pairedAt: '2026-10-01T10:00:00+00:00',
    lastUsedAt: null,
  };

  function httpError(status: number): HttpErrorResponse {
    return new HttpErrorResponse({ status, statusText: 'x' });
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<DeviceGrantsService>('DeviceGrantsService', [
      'list',
      'revoke',
      'revokeAll',
    ]);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialogAnswer = true;
    dialog.open.and.callFake(
      () =>
        ({
          afterClosed: () => of(dialogAnswer),
        }) as MatDialogRef<SimpleDialogComponent, boolean>
    );
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'error',
      'success',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);

    await TestBed.configureTestingModule({
      imports: [PairedDevicesComponent],
      providers: [
        provideRouter([]),
        { provide: DeviceGrantsService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
      ],
    }).compileComponents();
  });

  function create(): void {
    fixture = TestBed.createComponent(PairedDevicesComponent);
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function rows(): HTMLElement[] {
    return Array.from(el().querySelectorAll('[data-testid="device-row"]'));
  }

  function clickRevoke(index: number): void {
    const button = rows()[index].querySelector(
      '[data-testid="device-revoke"]'
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }

  it('lists each device with its name, dates and scopes in plain words', () => {
    // Stamped here, not at module load: the suite can take minutes to reach this test.
    const recent = {
      ...voron,
      lastUsedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    };
    service.list.and.returnValue(of([recent, ender]));
    create();

    expect(el().textContent).toContain('Paired devices');
    expect(rows().length).toBe(2);
    const first = rows()[0].textContent ?? '';
    expect(first).toContain('printlog-bridge on voron');
    expect(first).toContain('Paired');
    expect(first).toContain('Last used 5 minutes ago');
    expect(first).toContain(
      'Log prints, update printer slots, send heartbeats'
    );
    expect(rows()[1].textContent).toContain('Not used yet');
  });

  it('shows the exact last-used time on hover', () => {
    service.list.and.returnValue(of([voron]));
    create();

    const time = rows()[0].querySelector(
      'time[data-testid="device-last-used"]'
    ) as HTMLElement;
    expect(time.getAttribute('datetime')).toBe(voron.lastUsedAt as string);
    expect(time.getAttribute('title')).toBeTruthy();
    expect(time.getAttribute('title')).not.toContain('ago');
  });

  it('points to the pairing docs when nothing is paired', () => {
    service.list.and.returnValue(of([]));
    create();

    expect(el().textContent).toContain('No paired devices.');
    expect(el().textContent).toContain('printlog-bridge pair');
    const link = el().querySelector(
      'a[href="/docs/printlog-bridge#account"]'
    ) as HTMLAnchorElement | null;
    expect(link).toBeTruthy();
  });

  for (const status of [404, 503]) {
    it(`hides the whole section when the API answers ${status}`, () => {
      service.list.and.returnValue(throwError(() => httpError(status)));
      create();

      expect(el().textContent?.trim()).toBe('');
      expect(logging.logException).not.toHaveBeenCalled();
    });
  }

  it('offers a retry when loading fails otherwise', () => {
    service.list.and.returnValues(
      throwError(() => httpError(500)),
      of([voron])
    );
    create();

    expect(el().textContent).toContain("We couldn't load your paired devices.");
    (
      el().querySelector('[data-testid="devices-retry"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(rows().length).toBe(1);
  });

  it('renders nothing before the skeleton delay, then skeleton rows', fakeAsync(() => {
    const pending = new Subject<DeviceGrant[]>();
    service.list.and.returnValue(pending);
    create();

    expect(el().querySelector('app-skeleton')).toBeNull();
    expect(el().textContent).not.toContain('No paired devices.');

    tick(200);
    fixture.detectChanges();
    expect(el().querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
    expect(el().querySelector('[aria-busy="true"]')).toBeTruthy();

    pending.next([voron]);
    pending.complete();
    tick(400);
    fixture.detectChanges();
    expect(el().querySelector('app-skeleton')).toBeNull();
    expect(rows().length).toBe(1);
  }));

  it('asks before revoking and says what happens to the bridge', () => {
    service.list.and.returnValue(of([voron]));
    dialogAnswer = false;
    create();

    clickRevoke(0);

    expect(dialog.open).toHaveBeenCalledTimes(1);
    const data = dialog.open.calls.mostRecent().args[1]?.data as {
      title: string;
      body: string;
    };
    expect(data.title).toContain('printlog-bridge on voron');
    expect(data.body).toContain('stops logging');
    expect(data.body).toContain('printlog-bridge pair');
    expect(data.body).not.toContain('voron');
    expect(service.revoke).not.toHaveBeenCalled();
    expect(rows().length).toBe(1);
  });

  it('removes the row at once and logs the revoke', () => {
    service.list.and.returnValue(of([voron, ender]));
    const result = new Subject<void>();
    service.revoke.and.returnValue(result);
    create();

    clickRevoke(0);

    expect(service.revoke).toHaveBeenCalledWith(2);
    expect(rows().length).toBe(1);
    expect(rows()[0].textContent).toContain('printlog-bridge on ender');

    result.next();
    result.complete();
    fixture.detectChanges();

    expect(rows().length).toBe(1);
    expect(logging.logEvent).toHaveBeenCalledWith(
      'ConnectedAgents_DeviceRevoked',
      { scopeCount: 3 }
    );
  });

  it('shows the empty state after the last device is revoked', () => {
    service.list.and.returnValue(of([voron]));
    service.revoke.and.returnValue(of(undefined));
    create();

    clickRevoke(0);

    expect(rows().length).toBe(0);
    expect(el().textContent).toContain('No paired devices.');
  });

  it('treats a 404 on revoke as already gone', () => {
    service.list.and.returnValue(of([voron]));
    service.revoke.and.returnValue(throwError(() => httpError(404)));
    create();

    clickRevoke(0);

    expect(rows().length).toBe(0);
    expect(toastr.error).not.toHaveBeenCalled();
  });

  it('puts the row back in its place with an error when revoking fails', () => {
    service.list.and.returnValue(of([voron, ender]));
    const result = new Subject<void>();
    service.revoke.and.returnValue(result);
    create();

    clickRevoke(0);
    expect(rows().length).toBe(1);

    result.error(httpError(500));
    fixture.detectChanges();

    expect(rows().length).toBe(2);
    expect(rows()[0].textContent).toContain('printlog-bridge on voron');
    expect(toastr.error).toHaveBeenCalled();
    expect(toastr.error.calls.mostRecent().args[0]).toContain(
      'printlog-bridge on voron'
    );
    expect(logging.logEvent).toHaveBeenCalledWith(
      'ConnectedAgents_DeviceRevokeFailed',
      { status: 500 }
    );
  });

  describe('revoke all', () => {
    const prusa: DeviceGrant = {
      ...ender,
      id: 3,
      deviceId: '5e5e5e5e-2222-4c5b-9a43-0a3a2f7d1e33',
      name: 'printlog-bridge on prusa',
    };

    function revokeAllButton(): HTMLButtonElement | null {
      return el().querySelector('[data-testid="devices-revoke-all"]');
    }

    function clickRevokeAll(): void {
      (revokeAllButton() as HTMLButtonElement).click();
      fixture.detectChanges();
    }

    for (const [label, grants] of [
      ['no devices', []],
      ['one device', [voron]],
    ] as [string, DeviceGrant[]][]) {
      it(`is not offered with ${label}`, () => {
        service.list.and.returnValue(of(grants));
        create();

        expect(revokeAllButton()).toBeNull();
      });
    }

    it('is offered with two or more devices', () => {
      service.list.and.returnValue(of([voron, ender, prusa]));
      create();

      expect(revokeAllButton()).toBeTruthy();
      expect(revokeAllButton()?.textContent).toContain('Revoke all devices');
    });

    it('asks first, with the count and what happens, and does nothing on cancel', () => {
      service.list.and.returnValue(of([voron, ender, prusa]));
      dialogAnswer = false;
      create();

      clickRevokeAll();

      expect(dialog.open).toHaveBeenCalledTimes(1);
      const data = dialog.open.calls.mostRecent().args[1]?.data as {
        title: string;
        body: string;
        yesText: string;
        yesColor: string;
      };
      expect(data.title).toContain('3');
      expect(data.body).toContain('3 paired devices');
      expect(data.body).toContain('stops logging');
      expect(data.body).toContain('printlog-bridge pair');
      expect(data.body).toContain('bridges');
      expect(data.body).toContain('printers connected to them');
      expect(data.body).toContain('past prints are kept');
      expect(data.yesColor).toBe('warn');
      expect(service.revokeAll).not.toHaveBeenCalled();
      expect(rows().length).toBe(3);
    });

    it('empties the list, reports the count and logs it', () => {
      service.list.and.returnValue(of([voron, ender, prusa]));
      const result = new Subject<{ revoked: number }>();
      service.revokeAll.and.returnValue(result);
      create();

      clickRevokeAll();

      expect(service.revokeAll).toHaveBeenCalledTimes(1);
      // Not optimistic: the rows stay until the API answers, and the button can't be pressed twice.
      expect(rows().length).toBe(3);
      expect(revokeAllButton()?.disabled).toBeTrue();

      result.next({ revoked: 3 });
      result.complete();
      fixture.detectChanges();

      expect(rows().length).toBe(0);
      expect(el().textContent).toContain('No paired devices.');
      expect(toastr.success).toHaveBeenCalled();
      expect(toastr.success.calls.mostRecent().args[0]).toContain(
        '3 paired devices'
      );
      expect(logging.logEvent).toHaveBeenCalledWith(
        'ConnectedAgents_AllDevicesRevoked',
        { count: 3 }
      );
    });

    for (const status of [404, 405]) {
      it(`says the server can't do it yet on ${status}, and keeps the list`, () => {
        service.list.and.returnValue(of([voron, ender]));
        service.revokeAll.and.returnValue(throwError(() => httpError(status)));
        create();

        clickRevokeAll();

        expect(rows().length).toBe(2);
        expect(revokeAllButton()?.disabled).toBeFalse();
        expect(toastr.error).toHaveBeenCalled();
        expect(toastr.error.calls.mostRecent().args[0]).toContain(
          'doesn’t support'
        );
        expect(logging.logEvent).toHaveBeenCalledWith(
          'ConnectedAgents_AllDevicesRevokeFailed',
          { status }
        );
        expect(logging.logException).not.toHaveBeenCalled();
      });
    }

    it('keeps the list and shows an error when it fails otherwise', () => {
      service.list.and.returnValue(of([voron, ender]));
      service.revokeAll.and.returnValue(throwError(() => httpError(500)));
      create();

      clickRevokeAll();

      expect(rows().length).toBe(2);
      expect(toastr.error).toHaveBeenCalled();
      expect(toastr.error.calls.mostRecent().args[0]).toContain('still paired');
      expect(logging.logEvent).toHaveBeenCalledWith(
        'ConnectedAgents_AllDevicesRevokeFailed',
        { status: 500 }
      );
      expect(logging.logException).toHaveBeenCalled();
    });
  });
});
