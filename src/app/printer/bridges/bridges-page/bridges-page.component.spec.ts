import { HttpErrorResponse } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import {
  BridgesService,
  DiscoveredPrinterState,
} from 'src/app/core/services/bridges.service';
import { ConnectionStatus } from 'src/app/core/services/connection.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { bridge, bridgePrinter, discovered } from '../testing/bridge-fixtures';
import {
  BRIDGES_POLLING,
  BridgesPageComponent,
  BridgesPolling,
} from './bridges-page.component';

describe('BridgesPageComponent', () => {
  let service: jasmine.SpyObj<BridgesService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let fixture: ComponentFixture<BridgesPageComponent>;
  let dialogAnswer: unknown;

  const garage = bridge();
  const attic = bridge({
    id: 9,
    name: null,
    displayName: 'printlog-bridge on attic',
    status: ConnectionStatus.Stale,
  });

  function httpError(status: number, code?: string): HttpErrorResponse {
    return new HttpErrorResponse({
      status,
      error: code ? { code } : null,
    });
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<BridgesService>('BridgesService', [
      'list',
      'discovered',
      'printers',
      'update',
      'scan',
      'ignore',
      'unignore',
      'disconnect',
    ]);
    service.list.and.returnValue(of([garage, attic]));
    service.discovered.and.callFake((id: number) =>
      of(id === 42 ? [discovered()] : [])
    );
    service.printers.and.callFake((id: number) =>
      of(id === 9 ? [bridgePrinter({ printerId: 3 })] : [])
    );
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialogAnswer = true;
    dialog.open.and.callFake(
      () => ({ afterClosed: () => of(dialogAnswer) }) as never
    );
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
  });

  async function configure(
    polling: BridgesPolling = { idleMs: 0, scanningMs: 0 }
  ) {
    await TestBed.configureTestingModule({
      imports: [BridgesPageComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: BridgesService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
        { provide: BRIDGES_POLLING, useValue: polling },
      ],
    }).compileComponents();
  }

  async function create(polling?: BridgesPolling) {
    await configure(polling);
    fixture = TestBed.createComponent(BridgesPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function one(id: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(
      `[data-testid="${id}"]`
    );
  }

  function all(id: string): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        `[data-testid="${id}"]`
      )
    );
  }

  it('lists every bridge with what it found', async () => {
    await create();
    expect(all('bridges-card').length).toBe(2);
    expect(service.discovered).toHaveBeenCalledWith(42);
    expect(service.discovered).toHaveBeenCalledWith(9);
    expect(all('bridge-new-row').length).toBe(1);
    expect(logging.logEvent).toHaveBeenCalledWith('Bridges_Viewed', {
      count: 2,
    });
  });

  it('shows the empty state when no bridge has checked in', async () => {
    service.list.and.returnValue(of([]));
    await create();
    expect(one('bridges-empty')).not.toBeNull();
    expect(service.discovered).not.toHaveBeenCalled();
  });

  for (const status of [404, 503]) {
    it(`says the screen is not available on a ${status}, without logging an error`, async () => {
      service.list.and.returnValue(throwError(() => httpError(status)));
      await create();
      expect(one('bridges-unavailable')).not.toBeNull();
      expect(logging.logException).not.toHaveBeenCalled();
    });
  }

  it('offers a retry when the list fails', async () => {
    service.list.and.returnValue(throwError(() => httpError(500)));
    await create();
    expect(one('bridges-error')).not.toBeNull();

    service.list.and.returnValue(of([garage]));
    (one('bridges-error')!.querySelector('button') as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(all('bridges-card').length).toBe(1);
  });

  it('keeps a bridge whose printers failed to load, with a retry', async () => {
    service.discovered.and.returnValue(throwError(() => httpError(500)));
    await create();
    expect(all('bridges-card').length).toBe(2);
    expect(one('bridge-load-failed')).not.toBeNull();
  });

  it('ignores a printer at once and reloads', async () => {
    service.ignore.and.returnValue(of(undefined));
    await create();
    service.discovered.and.callFake((id: number) =>
      of(
        id === 42 ? [discovered({ state: DiscoveredPrinterState.Ignored })] : []
      )
    );
    one('bridge-ignore')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.ignore).toHaveBeenCalledWith(42, 12);
    expect(one('bridge-new-row')).toBeNull();
    expect(one('bridge-ignored-row')).not.toBeNull();
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('explains a refused ignore', async () => {
    service.ignore.and.returnValue(
      throwError(() => httpError(409, 'ignore_limit'))
    );
    await create();
    one('bridge-ignore')!.click();
    expect(toastr.error).toHaveBeenCalledWith(
      jasmine.stringMatching('200 ignored')
    );
    expect(logging.logEvent).toHaveBeenCalledWith('Bridges_ActionFailed', {
      action: 'ignore',
      code: 'ignore_limit',
    });
  });

  it('shows Scanning right after Scan now', async () => {
    service.scan.and.returnValue(
      of({ scanRequestedAt: '2999-01-01T00:00:00Z' })
    );
    await create();
    one('bridge-scan')!.click();
    fixture.detectChanges();
    expect(service.scan).toHaveBeenCalledWith(42);
    expect(one('bridge-scanning')).not.toBeNull();
  });

  it('opens the connect dialog with the printers other bridges watch', async () => {
    await create();
    one('bridge-connect')!.click();
    const config = dialog.open.calls.mostRecent().args[1] as {
      data: { watchedBy: Map<number, number>; bridge: { id: number } };
    };
    expect(config.data.bridge.id).toBe(42);
    expect(config.data.watchedBy.get(3)).toBe(9);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('disconnects after confirming, and reloads', async () => {
    service.disconnect.and.returnValue(of(undefined));
    await create();
    one('bridge-disconnect')!.click();
    expect(service.disconnect).toHaveBeenCalledWith(9, 7);
    expect(toastr.success).toHaveBeenCalled();
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('does not disconnect when the user cancels', async () => {
    dialogAnswer = undefined;
    await create();
    one('bridge-disconnect')!.click();
    expect(service.disconnect).not.toHaveBeenCalled();
  });

  it('renames a bridge and shows the new name', async () => {
    service.update.and.returnValue(
      of(bridge({ name: 'Garage', displayName: 'Garage', location: null }))
    );
    await create();
    one('bridge-edit')!.click();
    fixture.detectChanges();
    one('bridge-edit-save')!.click();
    fixture.detectChanges();
    expect(service.update).toHaveBeenCalledWith(42, {
      name: 'Garage NAS',
      location: 'Workshop',
    });
    expect(one('bridge-name')!.textContent).toContain('Garage');
  });

  it('refreshes while open', fakeAsync(() => {
    void configure({ idleMs: 1000, scanningMs: 100 });
    tick();
    fixture = TestBed.createComponent(BridgesPageComponent);
    fixture.detectChanges();
    tick();
    expect(service.list).toHaveBeenCalledTimes(1);
    tick(1000);
    expect(service.list).toHaveBeenCalledTimes(2);
    fixture.destroy();
    tick(5000);
    expect(service.list).toHaveBeenCalledTimes(2);
    discardPeriodicTasks();
  }));
});
