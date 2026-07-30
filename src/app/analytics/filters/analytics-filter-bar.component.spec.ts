import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';
import { PrinterService } from 'src/app/core/services/printer.service';
import { AnalyticsFilterBarComponent } from './analytics-filter-bar.component';
import { AnalyticsFilterStore } from './analytics-filter.store';

describe('AnalyticsFilterBarComponent', () => {
  let fixture: ComponentFixture<AnalyticsFilterBarComponent>;
  let store: AnalyticsFilterStore;
  let bottomSheet: jasmine.SpyObj<MatBottomSheet>;

  beforeEach(async () => {
    bottomSheet = jasmine.createSpyObj<MatBottomSheet>('MatBottomSheet', [
      'open',
    ]);

    const printerService = jasmine.createSpyObj<PrinterService>(
      'PrinterService',
      ['getCurrentUserPrinterSummaries']
    );
    printerService.getCurrentUserPrinterSummaries.and.returnValue(
      of({
        items: [{ id: 1, name: 'Ender', make: 'Creality', model: '3' }],
      } as never)
    );

    const filamentService = jasmine.createSpyObj<FilamentService>(
      'FilamentService',
      ['getCurrentUserFilamentSummaries']
    );
    filamentService.getCurrentUserFilamentSummaries.and.returnValue(
      of({ items: [] } as never)
    );

    await TestBed.configureTestingModule({
      imports: [AnalyticsFilterBarComponent, NoopAnimationsModule],
      providers: [
        AnalyticsFilterStore,
        provideRouter([]),
        { provide: MatBottomSheet, useValue: bottomSheet },
        { provide: PrinterService, useValue: printerService },
        { provide: FilamentService, useValue: filamentService },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsFilterBarComponent);
    store = TestBed.inject(AnalyticsFilterStore);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('always exposes the date range control', () => {
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="date-range-select"]'
      )
    ).toBeTruthy();
  });

  it('renders a removable chip per active filter', () => {
    store.setPrinterIds([1]);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '[data-testid="active-filter-chip"]'
      ).length
    ).toBe(1);
  });

  it('removing a chip clears that filter', () => {
    store.setPrinterIds([1]);
    fixture.detectChanges();

    (
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="chip-remove"]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(store.printerIds()).toEqual([]);
  });

  it('shows the custom range inputs only for the custom preset', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="custom-range"]')).toBeFalsy();

    store.setPreset('custom');
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="custom-range"]')).toBeTruthy();
  });

  it('actually applies a custom range once both ends are chosen', () => {
    // The previous version of this test only asserted the inputs APPEARED. The handler read
    // `valueAsDate` off a Material text input, which is undefined, so the range silently never
    // applied — visible inputs proved nothing about whether choosing dates did anything.
    store.setPreset('custom');
    fixture.detectChanges();

    const from = new Date(2026, 2, 1);
    const to = new Date(2026, 2, 3);

    fixture.componentInstance.onCustomStart(from);
    fixture.componentInstance.onCustomEnd(to);
    fixture.detectChanges();

    expect(store.preset()).toBe('custom');
    expect(store.customFrom()).toEqual(from);
    expect(store.customTo()).toEqual(to);

    // Half-open: the end is exclusive, so 1-3 March inclusive spans three days.
    const filter = store.filter();
    const days =
      (new Date(filter.toDate!).getTime() -
        new Date(filter.fromDate!).getTime()) /
      86_400_000;
    expect(days).toBe(3);
  });

  it('does not commit an inverted range while the start is being re-picked', () => {
    // With a committed range, choosing a LATER start must not pair it with the OLD end: that
    // commits from > to, which the API rejects, so the user sees an error for the act of
    // editing their own range.
    store.setPreset('custom');
    fixture.componentInstance.onCustomStart(new Date(2026, 2, 1));
    fixture.componentInstance.onCustomEnd(new Date(2026, 2, 3));
    fixture.detectChanges();

    fixture.componentInstance.onCustomStart(new Date(2026, 2, 10));
    fixture.detectChanges();

    // Still the last COMPLETE range; nothing inverted was committed.
    expect(store.customFrom()).toEqual(new Date(2026, 2, 1));
    expect(store.customTo()).toEqual(new Date(2026, 2, 3));

    fixture.componentInstance.onCustomEnd(new Date(2026, 2, 12));
    fixture.detectChanges();

    expect(store.customFrom()).toEqual(new Date(2026, 2, 10));
    expect(store.customTo()).toEqual(new Date(2026, 2, 12));
  });

  it('does not apply a half-specified range', () => {
    store.setPreset('custom');
    fixture.detectChanges();

    fixture.componentInstance.onCustomStart(new Date(2026, 2, 1));
    fixture.detectChanges();

    // A start with no end must not fire a request for a range that is not yet specified.
    expect(store.customTo()).toBeNull();
    expect(store.filter().fromDate).toBeNull();
  });

  it('exposes the compare-to-previous toggle', () => {
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="compare-toggle"] button, [data-testid="compare-toggle"] input'
      ) as HTMLElement
    ).click();
    fixture.detectChanges();

    expect(store.comparePrevious()).toBeTrue();
  });

  it('opens the bottom sheet instead of inline controls on a phone', async () => {
    TestBed.resetTestingModule();

    const printerService = jasmine.createSpyObj<PrinterService>(
      'PrinterService',
      ['getCurrentUserPrinterSummaries']
    );
    printerService.getCurrentUserPrinterSummaries.and.returnValue(
      of({ items: [] } as never)
    );
    const filamentService = jasmine.createSpyObj<FilamentService>(
      'FilamentService',
      ['getCurrentUserFilamentSummaries']
    );
    filamentService.getCurrentUserFilamentSummaries.and.returnValue(
      of({ items: [] } as never)
    );
    const phoneSheet = jasmine.createSpyObj<MatBottomSheet>('MatBottomSheet', [
      'open',
    ]);

    await TestBed.configureTestingModule({
      imports: [AnalyticsFilterBarComponent, NoopAnimationsModule],
      providers: [
        AnalyticsFilterStore,
        provideRouter([]),
        { provide: MatBottomSheet, useValue: phoneSheet },
        { provide: PrinterService, useValue: printerService },
        { provide: FilamentService, useValue: filamentService },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: true, breakpoints: {} }) },
        },
      ],
    }).compileComponents();

    const phoneFixture = TestBed.createComponent(AnalyticsFilterBarComponent);
    phoneFixture.detectChanges();

    const el = phoneFixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="printer-select"]')).toBeFalsy();

    (
      el.querySelector(
        '[data-testid="mobile-filters-button"]'
      ) as HTMLButtonElement
    ).click();
    expect(phoneSheet.open).toHaveBeenCalled();

    // Must pass a viewContainerRef. The sheet renders in the CDK overlay, outside this
    // component's injector tree, and needs it to resolve the shell-provided filter store.
    // Asserting only that open() was called let a sheet that could never construct pass.
    const config = phoneSheet.open.calls.mostRecent().args[1];
    expect(config?.viewContainerRef)
      .withContext('sheet cannot resolve AnalyticsFilterStore without it')
      .toBeTruthy();
  });
});
