import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import {
  FilamentService,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  Barcode,
  LabelReadRequest,
  LabelReadResponse,
} from 'src/app/core/types/label-reading';
import { LabelOcrResult } from 'src/app/shared/label-scanner/label-ocr';
import {
  CameraUnavailableReason,
  LabelScannerComponent,
} from 'src/app/shared/label-scanner/label-scanner.component';
import {
  LabelScanOutcome,
  ScanLabelPanelComponent,
} from './scan-label-panel.component';

@Component({ selector: 'app-label-scanner', template: '' })
class StubScannerComponent {
  readonly paused = input(false);
  readonly ownLabel = output<string>();
  readonly barcodesChanged = output<Barcode[]>();
  readonly photo = output<{ barcodes: Barcode[]; ocr: LabelOcrResult }>();
  readonly unavailable = output<CameraUnavailableReason>();
}

const EMPTY_READING = {
  brand: null,
  materialType: null,
  colorName: null,
  netWeightG: null,
  diameterMm: null,
  hotendMinC: null,
  hotendMaxC: null,
  bedMinC: null,
  bedMaxC: null,
};

function response(over: Partial<LabelReadResponse> = {}): LabelReadResponse {
  return {
    reading: { ...EMPTY_READING, materialType: 'PLA+' },
    catalogMatch: null,
    ownMatches: [],
    barcodes: [{ value: '02540924A', format: 'code128' }],
    ...over,
  };
}

const OCR: LabelOcrResult = {
  text: 'PLA+ Silver 1kg',
  fields: { materialType: 'PLA+', weightG: 1000 },
  ms: 800,
  words: 9,
};

describe('ScanLabelPanelComponent', () => {
  let fixture: ComponentFixture<ScanLabelPanelComponent>;
  let el: HTMLElement;
  let filaments: jasmine.SpyObj<FilamentService>;
  let outcomes: LabelScanOutcome[];
  let unavailable: CameraUnavailableReason[];

  async function setUp(known: FilamentSummary[] = []) {
    filaments = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'readLabel',
      'getFilamentDetail',
    ]);
    await TestBed.configureTestingModule({
      imports: [ScanLabelPanelComponent],
      providers: [
        { provide: FilamentService, useValue: filaments },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', [
            'logEvent',
            'logException',
          ]),
        },
      ],
    })
      .overrideComponent(ScanLabelPanelComponent, {
        remove: { imports: [LabelScannerComponent] },
        add: { imports: [StubScannerComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ScanLabelPanelComponent);
    fixture.componentRef.setInput(
      'filaments',
      new Map(known.map((f) => [f.id, f]))
    );
    outcomes = [];
    unavailable = [];
    fixture.componentInstance.outcome.subscribe((o) => outcomes.push(o));
    fixture.componentInstance.unavailable.subscribe((r) => unavailable.push(r));
    el = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const scanner = () =>
    fixture.debugElement.query(By.directive(StubScannerComponent))
      ?.componentInstance as StubScannerComponent | undefined;

  async function settle() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const click = async (testId: string) => {
    (el.querySelector(`[data-testid="${testId}"]`) as HTMLElement).click();
    await settle();
  };

  const spool = (id: string, name: string) =>
    ({ id, displayName: name, colors: ['C0C0C0'] }) as FilamentSummary;

  it('opens the spool behind a 3D Print Log QR label', async () => {
    await setUp();

    scanner()!.ownLabel.emit('f1');

    expect(outcomes).toEqual([{ kind: 'known', id: 'f1' }]);
  });

  it('looks a barcode up once and pauses the scanner meanwhile', async () => {
    await setUp();
    const pending = new Subject<LabelReadResponse>();
    filaments.readLabel.and.returnValue(pending);

    scanner()!.barcodesChanged.emit([
      { value: '02540924A', format: 'code128' },
    ]);
    await settle();

    expect(filaments.readLabel).toHaveBeenCalledOnceWith({
      barcodes: [{ value: '02540924A', format: 'code128' }],
    });
    expect(scanner()!.paused()).toBeTrue();
  });

  it('offers Add another or Open for a spool that has the barcode', async () => {
    await setUp([spool('f1', 'SUNLU PLA+ Silver')]);
    filaments.readLabel.and.returnValue(
      of(
        response({
          ownMatches: [
            { filamentId: 'f1', score: 1, reasons: ['same-barcode'] },
          ],
        })
      )
    );

    scanner()!.barcodesChanged.emit([
      { value: '02540924A', format: 'code128' },
    ]);
    await settle();

    expect(el.textContent).toContain('You have 1 of these');
    expect(el.textContent).toContain('SUNLU PLA+ Silver');

    await click('label-open');
    expect(outcomes).toEqual([{ kind: 'known', id: 'f1' }]);
  });

  it('Add another starts a new spool from the read', async () => {
    await setUp([spool('f1', 'SUNLU PLA+ Silver')]);
    const read = response({
      ownMatches: [{ filamentId: 'f1', score: 1, reasons: ['same-barcode'] }],
    });
    filaments.readLabel.and.returnValue(of(read));

    scanner()!.barcodesChanged.emit([
      { value: '02540924A', format: 'code128' },
    ]);
    await settle();
    await click('label-add-another');

    expect(outcomes).toEqual([
      {
        kind: 'label-new',
        read: {
          reading: read.reading,
          catalogMatch: null,
          barcodes: read.barcodes,
        },
      },
    ]);
  });

  it('asks for a photo when nobody knows the barcode yet', async () => {
    await setUp();
    filaments.readLabel.and.returnValue(of(response()));

    scanner()!.barcodesChanged.emit([
      { value: '02540924A', format: 'code128' },
    ]);
    await settle();

    expect(el.textContent).toContain('New product: take a photo of the label');
    expect(outcomes).toEqual([]);
    expect(scanner()!.paused()).toBeFalse();
  });

  it('goes straight to a new spool when the barcode has a trusted catalog match', async () => {
    await setUp();
    const match = {
      id: 'e1',
      confidence: 1,
      spoolWeightG: 160,
      colorName: 'PLA+ Silver',
      name: 'PLA+ Silver',
      manufacturer: 'SUNLU',
      source: 'SpoolmanDB' as const,
    };
    filaments.readLabel.and.returnValue(of(response({ catalogMatch: match })));

    scanner()!.barcodesChanged.emit([
      { value: '02540924A', format: 'code128' },
    ]);
    await settle();

    expect(outcomes).toEqual([
      jasmine.objectContaining({
        kind: 'label-new',
      }) as unknown as LabelScanOutcome,
    ]);
    expect(
      (outcomes[0] as { read: { catalogMatch: unknown } }).read.catalogMatch
    ).toEqual(match);
  });

  it('sends a photo with its text and fields, then starts a new spool', async () => {
    await setUp();
    filaments.readLabel.and.returnValue(of(response()));

    scanner()!.photo.emit({
      barcodes: [{ value: '02540924A', format: 'code128' }],
      ocr: OCR,
    });
    await settle();

    const request = filaments.readLabel.calls.mostRecent()
      .args[0] as LabelReadRequest;
    expect(request).toEqual({
      barcodes: [{ value: '02540924A', format: 'code128' }],
      ocrText: OCR.text,
      fields: OCR.fields,
    });
    expect(outcomes.map((o) => o.kind)).toEqual(['label-new']);
  });

  it('offers Retry and Continue anyway when the lookup fails', async () => {
    await setUp();
    filaments.readLabel.and.returnValue(throwError(() => new Error('offline')));

    scanner()!.photo.emit({ barcodes: [], ocr: OCR });
    await settle();

    expect(el.textContent).toContain("Couldn't look up that label");
    filaments.readLabel.and.returnValue(of(response()));
    await click('label-retry');
    expect(filaments.readLabel).toHaveBeenCalledTimes(2);
    expect(outcomes.map((o) => o.kind)).toEqual(['label-new']);
  });

  it('Continue anyway keeps what the phone read', async () => {
    await setUp();
    filaments.readLabel.and.returnValue(throwError(() => new Error('offline')));

    scanner()!.photo.emit({
      barcodes: [{ value: 'X004N86WD5', format: 'code128' }],
      ocr: OCR,
    });
    await settle();
    await click('label-continue');

    expect(outcomes).toEqual([
      {
        kind: 'label-new',
        read: {
          reading: { ...EMPTY_READING, materialType: 'PLA+', netWeightG: 1000 },
          catalogMatch: null,
          barcodes: [{ value: 'X004N86WD5', format: 'code128' }],
        },
      },
    ]);
  });

  it('passes a camera failure on', async () => {
    await setUp();

    scanner()!.unavailable.emit('denied');

    expect(unavailable).toEqual(['denied']);
  });
});
