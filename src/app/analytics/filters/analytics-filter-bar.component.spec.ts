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
  });
});
