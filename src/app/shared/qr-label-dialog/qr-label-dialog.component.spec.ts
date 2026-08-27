import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flushMicrotasks,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import {
  QrLabelDialogComponent,
  QrLabelDialogData,
} from './qr-label-dialog.component';
import { QrCodeService } from 'src/app/core/services/qr-code.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { ToastrService } from 'ngx-toastr';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
  FilamentSummary,
} from 'src/app/core/services/filament.service';

describe('QrLabelDialogComponent', () => {
  let component: QrLabelDialogComponent;
  let fixture: ComponentFixture<QrLabelDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<QrLabelDialogComponent>>;
  let mockQrCodeService: jasmine.SpyObj<QrCodeService>;
  let mockLoggingService: jasmine.SpyObj<LoggingService>;
  let mockToastr: jasmine.SpyObj<ToastrService>;

  const mockFilament: FilamentSummary = {
    id: 'test-id-123',
    displayName: 'Test PLA',
    brand: 'Test Brand',
    materialCategoryNickname: 'filament',
    materialType: 'PLA',
    materialDensityGramPerCubicCm: 1.24,
    colorName: 'Red',
    colorHex: 'FF0000',
    colorPattern: ColorPatternType.Solid,
    colors: ['FF0000'],
    finishType: FilamentFinishType.Standard,
    effects: [] as FilamentEffect[],
    recommendedTemp: 210,
    isActive: true,
    notes: '',
    isFavorite: false,
    createdDate: '2024-01-01',
    filamentRemaining: 500000,
    filamentLengthRemainingInM: null,
    filamentVolumeRemainingInMl: null,
    purchasePriceValue: '25.00',
    initialNominalWeightMg: 1000000,
    diameterMm: 1.75,
    loadedInPrinter: null,
    storageLocation: 'Shelf A',
    materialCategory: null,
  };

  const mockDialogData: QrLabelDialogData = {
    filaments: [mockFilament],
  };

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockQrCodeService = jasmine.createSpyObj('QrCodeService', [
      'generateSvg',
      'generateFilamentUrl',
    ]);
    mockLoggingService = jasmine.createSpyObj('LoggingService', [
      'logEvent',
      'logException',
    ]);
    mockToastr = jasmine.createSpyObj('ToastrService', ['warning']);
    localStorage.removeItem('qr_label_layout');

    mockQrCodeService.generateFilamentUrl.and.callFake(
      (id: string) => `https://example.com/materials/${id}`
    );
    mockQrCodeService.generateSvg.and.returnValue(
      Promise.resolve('<svg><rect /></svg>')
    );

    await TestBed.configureTestingModule({
      imports: [QrLabelDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: QrCodeService, useValue: mockQrCodeService },
        { provide: LoggingService, useValue: mockLoggingService },
        { provide: ToastrService, useValue: mockToastr },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QrLabelDialogComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.removeItem('qr_label_layout');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with a grid that fills the default sheet', () => {
    expect(component.labelSize()).toBe('medium');
    expect(component.paperSize()).toBe('A4');
    // Medium labels on A4: 2 across, 8 down.
    expect(component.columns()).toBe(2);
    expect(component.rows()).toBe(8);
    expect(component.isAutoFit()).toBe(true);
    expect(component.loading()).toBe(true);
  });

  it('should generate QR codes on init', fakeAsync(() => {
    fixture.detectChanges(); // triggers ngOnInit → generateQrCodes()
    flushMicrotasks(); // resolves Promise.resolve() from generateSvg mock
    fixture.detectChanges(); // propagates signal updates (loading, labels) to view

    expect(mockQrCodeService.generateFilamentUrl).toHaveBeenCalledWith(
      'test-id-123'
    );
    expect(mockQrCodeService.generateSvg).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
    expect(component.labels().length).toBe(1);
  }));

  it('should close dialog when close is called', () => {
    component.close();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  function stubPrintWindow() {
    const listeners: Record<string, () => void> = {};
    const mockPrintWindow = {
      document: {
        write: jasmine.createSpy('write'),
        close: jasmine.createSpy('close'),
      },
      focus: jasmine.createSpy('focus'),
      print: jasmine.createSpy('print'),
      close: jasmine.createSpy('close'),
      addEventListener: (event: string, handler: () => void) => {
        listeners[event] = handler;
      },
      fire: (event: string) => listeners[event]?.(),
      hasListener: (event: string) => Boolean(listeners[event]),
    };

    spyOn(window, 'open').and.returnValue(mockPrintWindow as unknown as Window);
    return mockPrintWindow;
  }

  it('prints as soon as the document is written, without waiting on load', async () => {
    const mockPrintWindow = stubPrintWindow();

    fixture.detectChanges();
    await fixture.whenStable();

    component.print();

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockPrintWindow.document.write).toHaveBeenCalled();
    expect(mockPrintWindow.document.close).toHaveBeenCalled();
    expect(mockPrintWindow.focus).toHaveBeenCalled();
    expect(mockPrintWindow.print).toHaveBeenCalled();
  });

  it('leaves the print window open until the print finishes', async () => {
    const mockPrintWindow = stubPrintWindow();

    fixture.detectChanges();
    await fixture.whenStable();

    component.print();

    // Closing during printing cancels the job in browsers where print() does
    // not block, so the window survives until afterprint.
    expect(mockPrintWindow.close).not.toHaveBeenCalled();
    expect(mockPrintWindow.hasListener('afterprint')).toBe(true);

    mockPrintWindow.fire('afterprint');
    expect(mockPrintWindow.close).toHaveBeenCalled();
  });

  it('warns instead of alerting when the print window is blocked', async () => {
    spyOn(window, 'open').and.returnValue(null);

    fixture.detectChanges();
    await fixture.whenStable();

    component.print();

    expect(mockToastr.warning).toHaveBeenCalled();
    expect(mockLoggingService.logEvent).toHaveBeenCalledWith(
      'QrLabelDialog_PrintPopupBlocked'
    );
  });

  it('should compute items per page based on columns and rows', () => {
    component.columnOverride.set(2);
    component.rowOverride.set(5);
    expect(component.itemsPerPage()).toBe(10);

    component.labelSize.set('small');
    component.columnOverride.set(3);
    component.rowOverride.set(4);
    expect(component.itemsPerPage()).toBe(12);
  });

  describe('grid fitting', () => {
    it('re-fits the grid when the paper or label size changes', () => {
      component.labelSize.set('large');
      expect(component.columns()).toBe(2);
      expect(component.rows()).toBe(7);

      component.paperSize.set('A5');
      expect(component.columns()).toBe(1);
      expect(component.rows()).toBe(5);
    });

    it('only offers column and row counts that fit the sheet', () => {
      component.paperSize.set('A5');
      component.labelSize.set('large');

      expect(component.columnOptions()).toEqual([1]);
      expect(component.rowOptions()).toEqual([1, 2, 3, 4, 5]);
    });

    it('caps an override that no longer fits instead of overflowing the page', () => {
      component.labelSize.set('small');
      component.columnOverride.set(3);
      expect(component.columns()).toBe(3);

      // Large labels only fit two across, so the stored 3 has to give way.
      component.labelSize.set('large');
      expect(component.columns()).toBe(2);
    });

    it('returns to auto-fit when the override is cleared', () => {
      component.columnOverride.set(1);
      component.rowOverride.set(2);
      expect(component.isAutoFit()).toBe(false);

      component.resetToAutoFit();

      expect(component.isAutoFit()).toBe(true);
      expect(component.columns()).toBe(2);
      expect(component.rows()).toBe(8);
    });
  });

  describe('remembered layout', () => {
    function createDialog() {
      const created = TestBed.createComponent(QrLabelDialogComponent);
      created.detectChanges();
      return created.componentInstance;
    }

    it('restores the layout chosen last time', () => {
      fixture.detectChanges();
      component.paperSize.set('Letter');
      component.labelSize.set('small');
      component.copies.set(3);
      component.columnOverride.set(2);
      fixture.detectChanges();

      const reopened = createDialog();

      expect(reopened.paperSize()).toBe('Letter');
      expect(reopened.labelSize()).toBe('small');
      expect(reopened.copies()).toBe(3);
      expect(reopened.columnOverride()).toBe(2);
    });

    it('falls back to the defaults when the stored layout is unreadable', () => {
      localStorage.setItem('qr_label_layout', 'not json');

      const reopened = createDialog();

      expect(reopened.paperSize()).toBe('A4');
      expect(reopened.labelSize()).toBe('medium');
    });

    it('ignores a stored paper size the dialog no longer offers', () => {
      localStorage.setItem(
        'qr_label_layout',
        JSON.stringify({ paperSize: 'Legal', labelSize: 'medium', copies: 1 })
      );

      const reopened = createDialog();

      expect(reopened.paperSize()).toBe('A4');
    });

    it('clamps a stored copy count that is out of range', () => {
      localStorage.setItem(
        'qr_label_layout',
        JSON.stringify({ paperSize: 'A4', labelSize: 'medium', copies: 999 })
      );

      const reopened = createDialog();

      expect(reopened.copies()).toBe(10);
    });
  });

  it('should compute pages array based on labels and items per page', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();

    component.columnOverride.set(2);
    component.rowOverride.set(5);

    // With 1 label and 10 items per page, should have 1 page
    expect(component.pages().length).toBe(1);
    expect(component.pages()[0].length).toBe(1);
  }));

  it('should compute grid style based on columns', () => {
    component.labelSize.set('small');
    component.columnOverride.set(3);
    expect(component.gridStyle()).toEqual({
      'grid-template-columns': 'repeat(3, 1fr)',
    });
  });

  it('should compute page style based on paper size', () => {
    component.paperSize.set('A4');
    expect(component.pageStyle()).toEqual({
      width: '210mm',
      height: '297mm',
    });

    component.paperSize.set('Letter');
    expect(component.pageStyle()).toEqual({
      width: '216mm',
      height: '279mm',
    });
  });

  it('should compute label class based on size', () => {
    component.labelSize.set('small');
    expect(component.labelClass()).toBe('label-small');

    component.labelSize.set('large');
    expect(component.labelClass()).toBe('label-large');
  });

  it('should apply correct background color for non-empty colorHex', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();

    const swatch = fixture.nativeElement.querySelector(
      '.color-swatch'
    ) as HTMLElement;
    expect(swatch.style.backgroundColor).toBe('rgb(255, 0, 0)');
  }));

  it('should apply default background color when colorHex is empty', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();

    (component.labels as any).set([
      {
        filament: { ...mockFilament, colorHex: '' },
        qrCodeSvg: '',
        qrCodeSvgString: '',
        url: '',
      },
    ]);
    fixture.detectChanges();

    const swatch = fixture.nativeElement.querySelector(
      '.color-swatch'
    ) as HTMLElement;
    expect(swatch.style.backgroundColor).toBe('rgb(204, 204, 204)');
  }));

  describe('with multiple filaments across pages', () => {
    const multipleFilaments: FilamentSummary[] = Array.from(
      { length: 15 },
      (_, i) => ({
        ...mockFilament,
        id: `test-id-${i}`,
        displayName: `Test Filament ${i}`,
      })
    );

    beforeEach(async () => {
      TestBed.resetTestingModule();

      await TestBed.configureTestingModule({
        imports: [QrLabelDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          {
            provide: MAT_DIALOG_DATA,
            useValue: { filaments: multipleFilaments },
          },
          { provide: QrCodeService, useValue: mockQrCodeService },
          { provide: LoggingService, useValue: mockLoggingService },
          { provide: ToastrService, useValue: mockToastr },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(QrLabelDialogComponent);
      component = fixture.componentInstance;
    });

    it('should generate QR codes for all filaments', fakeAsync(() => {
      fixture.detectChanges();
      flushMicrotasks();
      fixture.detectChanges();

      expect(mockQrCodeService.generateSvg).toHaveBeenCalledTimes(15);
      expect(component.labels().length).toBe(15);
    }));

    it('should split labels into multiple pages', fakeAsync(() => {
      fixture.detectChanges();
      flushMicrotasks();
      fixture.detectChanges();

      // 2 columns x 5 rows = 10 items per page; 15 labels = 2 pages (10 + 5)
      component.columnOverride.set(2);
      component.rowOverride.set(5);

      expect(component.pages().length).toBe(2);
      expect(component.pages()[0].length).toBe(10);
      expect(component.pages()[1].length).toBe(5);
    }));
  });
});
