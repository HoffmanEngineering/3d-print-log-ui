import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';

import { FilamentSummary } from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterFilamentSummaryDto } from 'src/app/core/services/printer.service';
import { environment } from 'src/environments/environment';
import { PrinterSlotsComponent } from './printer-slots.component';

describe('PrinterSlotsComponent', () => {
  let fixture: ComponentFixture<PrinterSlotsComponent>;
  let httpMock: HttpTestingController;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let picked: FilamentSummary | null;
  let emitted: PrinterFilamentSummaryDto[][];

  const base = `${environment.printLogApiUrl}/api/Printers/3/slots`;

  const spool = (id: string, overrides: Partial<FilamentSummary> = {}) =>
    ({
      id,
      displayName: `Spool ${id}`,
      colorName: 'Red',
      colors: ['c62828'],
      colorPattern: 1,
      finishType: 1,
      effects: [],
      loadedInPrinter: null,
      ...overrides,
    }) as unknown as FilamentSummary;

  const loadedIn = (
    slot: number | null,
    filament: FilamentSummary,
    slotLabel: string | null = null
  ): PrinterFilamentSummaryDto => ({
    id: `pf-${filament.id}`,
    filament,
    slot,
    slotLabel,
  });

  async function render(
    loaded: PrinterFilamentSummaryDto[] = [],
    slotCount = 4
  ): Promise<void> {
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    const dialog = {
      open: () => ({
        componentInstance: {
          dialogRef: { afterClosed: () => of(picked) },
        },
      }),
    };

    await TestBed.configureTestingModule({
      imports: [PrinterSlotsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PrinterSlotsComponent);
    fixture.componentRef.setInput('printerId', 3);
    fixture.componentRef.setInput('slotCount', slotCount);
    fixture.componentRef.setInput('loaded', loaded);
    emitted = [];
    fixture.componentInstance.loadedChange.subscribe((list) =>
      emitted.push(list)
    );
    fixture.detectChanges();
  }

  function rows(): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '[data-testid="printer-slot"]'
      )
    );
  }

  function click(row: HTMLElement, testId: string): void {
    (
      row.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    picked = null;
  });

  afterEach(() => httpMock.verify());

  it('shows every slot in order, labelled', async () => {
    await render([loadedIn(2, spool('b'), 'Left'), loadedIn(0, spool('a'))]);

    const labels = rows().map((r) =>
      r.querySelector('.slot-label')!.textContent!.trim()
    );
    expect(labels).toEqual(['T0', 'T1', 'Left', 'T3']);
  });

  it('shows the spool in a loaded slot and marks the rest empty', async () => {
    await render([loadedIn(0, spool('a'))]);

    expect(rows()[0].textContent).toContain('Spool a');
    expect(rows()[1].textContent).toContain('Empty');
  });

  it('loads the picked spool into the slot', async () => {
    await render();
    picked = spool('a');

    click(rows()[2], 'slot-load');

    const request = httpMock.expectOne(`${base}/2`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.filamentId).toBe('a');
    request.flush([loadedIn(2, spool('a'))]);
    fixture.detectChanges();

    expect(rows()[2].textContent).toContain('Spool a');
    expect(emitted).toEqual([[loadedIn(2, spool('a'))]]);
    expect(logging.logEvent).toHaveBeenCalledWith(
      'PrinterSlots_Loaded',
      jasmine.objectContaining({ slot: 2 })
    );
  });

  it('keeps the slot label when loading a different spool', async () => {
    await render([loadedIn(1, spool('a'), 'Left')]);
    picked = spool('b');

    click(rows()[1], 'slot-load');

    const request = httpMock.expectOne(`${base}/1`);
    expect(request.request.body.slotLabel).toBe('Left');
    request.flush([loadedIn(1, spool('b'), 'Left')]);
  });

  it('says so when the spool moved from another printer', async () => {
    await render();
    picked = spool('a', {
      loadedInPrinter: { id: 9, name: 'Prusa by the door' } as never,
    });

    click(rows()[0], 'slot-load');
    httpMock.expectOne(`${base}/0`).flush([loadedIn(0, spool('a'))]);

    expect(toastr.success).toHaveBeenCalledWith(
      jasmine.stringContaining('Prusa by the door')
    );
  });

  it('says so when the spool moved from another slot', async () => {
    await render([loadedIn(1, spool('a'))]);
    picked = spool('a', {
      loadedInPrinter: { id: 3, name: 'This printer' } as never,
    });

    click(rows()[3], 'slot-load');
    httpMock.expectOne(`${base}/3`).flush([loadedIn(3, spool('a'))]);
    fixture.detectChanges();

    expect(toastr.success).toHaveBeenCalledWith(jasmine.stringContaining('T1'));
    expect(rows()[1].textContent).toContain('Empty');
  });

  it('asks nothing when the picker is cancelled', async () => {
    await render();
    picked = null;

    click(rows()[0], 'slot-load');

    httpMock.expectNone(`${base}/0`);
    expect(emitted).toEqual([]);
  });

  it('unloads one slot', async () => {
    await render([loadedIn(0, spool('a')), loadedIn(1, spool('b'))]);

    click(rows()[0], 'slot-unload');

    const request = httpMock.expectOne(`${base}/0`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(rows()[0].textContent).toContain('Empty');
    expect(emitted).toEqual([[loadedIn(1, spool('b'))]]);
  });

  it('offers no unload on an empty slot', async () => {
    await render();

    expect(rows()[0].querySelector('[data-testid="slot-unload"]')).toBeNull();
  });

  it('keeps the slot as it was when loading fails', async () => {
    await render([loadedIn(0, spool('a'))]);
    picked = spool('b');

    click(rows()[0], 'slot-load');
    httpMock
      .expectOne(`${base}/0`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(rows()[0].textContent).toContain('Spool a');
    expect(toastr.error).toHaveBeenCalled();
    expect(logging.logException).toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it('lists spools loaded without a slot separately', async () => {
    await render([loadedIn(null, spool('a')), loadedIn(0, spool('b'))]);

    const unslotted = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="unslotted"]'
    );
    expect(unslotted?.textContent).toContain('Spool a');
    expect(rows()[0].textContent).toContain('Spool b');
  });
});
