import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import {
  QrLabelDialogComponent,
  QrLabelDialogData,
} from './qr-label-dialog.component';
import { QrCodeService } from 'src/app/core/services/qr-code.service';
import { FilamentSummary } from 'src/app/core/services/filament.service';

describe('QrLabelDialogComponent', () => {
  let component: QrLabelDialogComponent;
  let fixture: ComponentFixture<QrLabelDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<QrLabelDialogComponent>>;
  let mockQrCodeService: jasmine.SpyObj<QrCodeService>;

  const mockFilament: FilamentSummary = {
    id: 'test-id-123',
    displayName: 'Test PLA',
    brand: 'Test Brand',
    materialCategoryNickname: 'filament',
    materialType: 'PLA',
    materialDensityGramPerCubicCm: 1.24,
    colorName: 'Red',
    colorHex: 'FF0000',
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QrLabelDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default settings', () => {
    expect(component.columns()).toBe(2);
    expect(component.rows()).toBe(5);
    expect(component.labelSize()).toBe('medium');
    expect(component.paperSize()).toBe('A4');
    expect(component.loading()).toBe(true);
  });

  it('should generate QR codes on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockQrCodeService.generateFilamentUrl).toHaveBeenCalledWith(
      'test-id-123'
    );
    expect(mockQrCodeService.generateSvg).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
    expect(component.labels().length).toBe(1);
  });

  it('should close dialog when close is called', () => {
    component.close();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should open print window when print is called', async () => {
    const mockPrintWindow = {
      document: {
        write: jasmine.createSpy('write'),
        close: jasmine.createSpy('close'),
      },
      focus: jasmine.createSpy('focus'),
      print: jasmine.createSpy('print'),
      close: jasmine.createSpy('close'),
      onload: null as (() => void) | null,
    };

    spyOn(window, 'open').and.returnValue(mockPrintWindow as unknown as Window);

    fixture.detectChanges();
    await fixture.whenStable();

    component.print();

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockPrintWindow.document.write).toHaveBeenCalled();
    expect(mockPrintWindow.document.close).toHaveBeenCalled();

    // Simulate onload callback
    if (mockPrintWindow.onload) {
      mockPrintWindow.onload();
      expect(mockPrintWindow.focus).toHaveBeenCalled();
      expect(mockPrintWindow.print).toHaveBeenCalled();
      expect(mockPrintWindow.close).toHaveBeenCalled();
    }
  });

  it('should compute items per page based on columns and rows', () => {
    component.columns.set(2);
    component.rows.set(5);
    expect(component.itemsPerPage()).toBe(10);

    component.columns.set(3);
    component.rows.set(4);
    expect(component.itemsPerPage()).toBe(12);
  });

  it('should compute pages array based on labels and items per page', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.columns.set(2);
    component.rows.set(5);

    // With 1 label and 10 items per page, should have 1 page
    expect(component.pages().length).toBe(1);
    expect(component.pages()[0].length).toBe(1);
  });

  it('should compute grid style based on columns', () => {
    component.columns.set(3);
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

  it('should return correct color style', () => {
    const style = component.getColorStyle('FF0000');
    expect(style['background-color']).toBe('#FF0000');
  });

  it('should return default color when colorHex is empty', () => {
    const style = component.getColorStyle('');
    expect(style['background-color']).toBe('#cccccc');
  });

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
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(QrLabelDialogComponent);
      component = fixture.componentInstance;
    });

    it('should generate QR codes for all filaments', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      expect(mockQrCodeService.generateSvg).toHaveBeenCalledTimes(15);
      expect(component.labels().length).toBe(15);
    });

    it('should split labels into multiple pages', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      // Default: 2 columns x 5 rows = 10 items per page
      // 15 labels = 2 pages (10 + 5)
      component.columns.set(2);
      component.rows.set(5);

      expect(component.pages().length).toBe(2);
      expect(component.pages()[0].length).toBe(10);
      expect(component.pages()[1].length).toBe(5);
    });
  });
});
