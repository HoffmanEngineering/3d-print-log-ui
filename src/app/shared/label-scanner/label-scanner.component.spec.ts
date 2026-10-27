import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrScannerService } from 'src/app/core/services/qr-scanner.service';
import { Barcode } from 'src/app/core/types/label-reading';
import { LoggingService } from 'src/app/core/services/logging.service';
import { LabelOcr, LabelOcrResult } from './label-ocr';
import {
  LABEL_OCR_FACTORY,
  LabelScannerComponent,
} from './label-scanner.component';

describe('LabelScannerComponent', () => {
  let fixture: ComponentFixture<LabelScannerComponent>;
  let scanner: jasmine.SpyObj<QrScannerService>;
  let ocr: jasmine.SpyObj<LabelOcr>;
  let decode: (text: string, format: string) => void;
  /** A barcode held in view: decoded on two frames, which is what makes it trusted. */
  const seen = (text: string, format: string) => {
    decode(text, format);
    decode(text, format);
  };

  const ocrResult: LabelOcrResult = {
    text: 'PLA+ Silver',
    fields: { materialType: 'PLA+' },
    ms: 900,
    words: 14,
  };

  async function setup(
    start?: () => Promise<void>,
    beforeRender?: (c: LabelScannerComponent) => void
  ) {
    scanner = jasmine.createSpyObj<QrScannerService>('QrScannerService', [
      'startLabelScanning',
      'stopScanning',
      'captureFrame',
      'parseFilamentUrl',
      'pauseLabelScanning',
      'resumeLabelScanning',
    ]);
    scanner.startLabelScanning.and.callFake(async (_id, onDecoded) => {
      decode = onDecoded;
      if (start) await start();
    });
    scanner.stopScanning.and.resolveTo();
    scanner.captureFrame.and.callFake(() => {
      const c = document.createElement('canvas');
      c.width = 300;
      c.height = 400;
      return c;
    });
    scanner.parseFilamentUrl.and.callFake(
      QrScannerService.prototype.parseFilamentUrl
    );
    ocr = jasmine.createSpyObj<LabelOcr>('LabelOcr', [
      'recognize',
      'terminate',
    ]);
    ocr.recognize.and.resolveTo(ocrResult);
    ocr.terminate.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [LabelScannerComponent],
      providers: [
        { provide: QrScannerService, useValue: scanner },
        { provide: LABEL_OCR_FACTORY, useValue: () => ocr },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', [
            'logEvent',
            'logException',
          ]),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LabelScannerComponent);
    beforeRender?.(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  afterEach(() => fixture?.destroy());

  it('emits ownLabel for a 3D Print Log QR label', async () => {
    await setup();
    const ids: string[] = [];
    fixture.componentInstance.ownLabel.subscribe((id) => ids.push(id));

    decode(
      'https://www.3dprintlog.com/materials/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      'QR_CODE'
    );

    expect(ids).toEqual(['3fa85f64-5717-4562-b3fc-2c963f66afa6']);
  });

  it('emits each new product barcode once, on its second read, with a lowercase format', async () => {
    await setup();
    const emitted: Barcode[][] = [];
    fixture.componentInstance.barcodesChanged.subscribe((b) => emitted.push(b));

    decode('0849344041764', 'EAN_13');
    decode('0849344041764', 'EAN_13');
    decode('0849344041764', 'EAN_13');
    decode('x004n86wd5', 'CODE_128');
    decode('x004n86wd5', 'CODE_128');

    expect(emitted).toEqual([
      [{ value: '0849344041764', format: 'ean13' }],
      [
        { value: '0849344041764', format: 'ean13' },
        { value: 'X004N86WD5', format: 'code128' },
      ],
    ]);
  });

  it('drops a barcode read on only one frame, which is how misreads show up', async () => {
    await setup();
    const emitted: Barcode[][] = [];
    fixture.componentInstance.barcodesChanged.subscribe((b) => emitted.push(b));
    const photos: { barcodes: Barcode[] }[] = [];
    fixture.componentInstance.photo.subscribe((p) => photos.push(p));

    // Seen on a real spool: one barcode held in view, two one-frame misreads of it.
    seen('849344041764', 'UPC_A');
    decode('493400041764', 'UPC_A');
    decode('4779300045764', 'EAN_13');
    (
      fixture.nativeElement.querySelector(
        '[data-testid="label-shutter"]'
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(emitted).toEqual([[{ value: '849344041764', format: 'upca' }]]);
    expect(photos[0].barcodes).toEqual([
      { value: '849344041764', format: 'upca' },
    ]);
  });

  it('ignores marketing links in QR codes', async () => {
    await setup();
    const seen: Barcode[][] = [];
    fixture.componentInstance.barcodesChanged.subscribe((b) => seen.push(b));

    decode('https://snapmaker.com/materials', 'QR_CODE');

    expect(seen).toEqual([]);
  });

  it('ignores decodes while paused', async () => {
    await setup();
    fixture.componentRef.setInput('paused', true);
    fixture.detectChanges();
    const seen: Barcode[][] = [];
    fixture.componentInstance.barcodesChanged.subscribe((b) => seen.push(b));

    decode('0849344041764', 'EAN_13');

    expect(seen).toEqual([]);
  });

  it('still opens your own QR label while paused', async () => {
    await setup();
    fixture.componentRef.setInput('paused', true);
    fixture.detectChanges();
    const ids: string[] = [];
    fixture.componentInstance.ownLabel.subscribe((id) => ids.push(id));

    decode(
      'https://www.3dprintlog.com/materials/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      'QR_CODE'
    );

    expect(ids).toEqual(['3fa85f64-5717-4562-b3fc-2c963f66afa6']);
  });

  it('sends a photo only the barcodes seen lately, not an earlier spool', async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 9, 27, 12));
    try {
      await setup();
      seen('0849344041764', 'EAN_13');
      jasmine.clock().tick(30_000);
      seen('02540924A', 'CODE_128');
      const photos: { barcodes: Barcode[] }[] = [];
      fixture.componentInstance.photo.subscribe((p) => photos.push(p));

      (
        fixture.nativeElement.querySelector(
          '[data-testid="label-shutter"]'
        ) as HTMLButtonElement
      ).click();
      await fixture.whenStable();

      expect(photos[0].barcodes).toEqual([
        { value: '02540924A', format: 'code128' },
      ]);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('keeps the barcodes seen when the shutter was pressed, however long OCR takes', async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 9, 27, 12));
    try {
      await setup();
      let finish!: (r: LabelOcrResult) => void;
      ocr.recognize.and.returnValue(new Promise((r) => (finish = r)));
      seen('849300041739', 'UPC_A');
      jasmine.clock().tick(11_000);
      const photos: { barcodes: Barcode[] }[] = [];
      fixture.componentInstance.photo.subscribe((p) => photos.push(p));

      (
        fixture.nativeElement.querySelector(
          '[data-testid="label-shutter"]'
        ) as HTMLButtonElement
      ).click();
      // A sideways label took 36 seconds on a Pixel 7.
      jasmine.clock().tick(36_000);
      finish(ocrResult);
      await fixture.whenStable();

      expect(photos[0].barcodes).toEqual([
        { value: '849300041739', format: 'upca' },
      ]);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('holds the photo on screen while it is read, then goes back to the live camera', async () => {
    await setup();
    let finish!: (r: LabelOcrResult) => void;
    ocr.recognize.and.returnValue(new Promise((r) => (finish = r)));

    (
      fixture.nativeElement.querySelector(
        '[data-testid="label-shutter"]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    // Frozen on the frame that was taken, and saying so.
    expect(scanner.pauseLabelScanning).toHaveBeenCalled();
    expect(scanner.captureFrame).toHaveBeenCalledBefore(
      scanner.pauseLabelScanning
    );
    expect(scanner.resumeLabelScanning).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('[data-testid="label-reading"]')
        ?.textContent
    ).toContain('Reading the label');

    finish({ ...ocrResult, text: '', words: 0 });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(scanner.resumeLabelScanning).toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('[data-testid="label-reading"]')
    ).toBeNull();
  });

  it('tells you to aim at the barcode or photograph the printed specs', async () => {
    await setup();

    expect(fixture.nativeElement.textContent).toContain(
      'Point at the barcode, or tap Read label on the printed specs'
    );
  });

  it('reports a photo it could not read, with the barcodes seen', async () => {
    await setup();
    ocr.recognize.and.rejectWith(new Error('offline'));
    seen('02540924A', 'CODE_128');
    const failed: Barcode[][] = [];
    fixture.componentInstance.photoFailed.subscribe((b) => failed.push(b));

    (
      fixture.nativeElement.querySelector(
        '[data-testid="label-shutter"]'
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(failed).toEqual([[{ value: '02540924A', format: 'code128' }]]);
  });

  it('treats a photo with no words as unread', async () => {
    await setup();
    ocr.recognize.and.resolveTo({ ...ocrResult, text: '', words: 0 });
    const photos: unknown[] = [];
    const failed: Barcode[][] = [];
    fixture.componentInstance.photo.subscribe((p) => photos.push(p));
    fixture.componentInstance.photoFailed.subscribe((b) => failed.push(b));

    (
      fixture.nativeElement.querySelector(
        '[data-testid="label-shutter"]'
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(photos).toEqual([]);
    expect(failed).toEqual([[]]);
    expect(fixture.nativeElement.textContent).toContain(
      "Couldn't read much from that photo"
    );
  });

  it('reads a photo of the guide box and emits it with the barcodes seen', async () => {
    await setup();
    seen('02540924A', 'CODE_128');
    const photos: { barcodes: Barcode[]; ocr: LabelOcrResult }[] = [];
    fixture.componentInstance.photo.subscribe((p) => photos.push(p));

    const shutter = fixture.nativeElement.querySelector(
      '[data-testid="label-shutter"]'
    ) as HTMLButtonElement;
    shutter.click();
    await fixture.whenStable();

    expect(scanner.captureFrame).toHaveBeenCalled();
    const cropped = ocr.recognize.calls.mostRecent().args[0];
    // The guide box: 85% of the frame's width, 3:2.
    expect(cropped.width).toBe(255);
    expect(cropped.height).toBe(170);
    expect(photos).toEqual([
      {
        barcodes: [{ value: '02540924A', format: 'code128' }],
        ocr: ocrResult,
      },
    ]);
  });

  it('shows an inline error when the photo cannot be read', async () => {
    await setup();
    ocr.recognize.and.rejectWith(new Error('offline'));

    (
      fixture.nativeElement.querySelector(
        '[data-testid="label-shutter"]'
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "Couldn't read much from that photo"
    );
  });

  it('reports a denied camera', async () => {
    const reasons: string[] = [];
    await setup(
      () =>
        Promise.reject(
          Object.assign(new Error('Permission denied'), {
            name: 'NotAllowedError',
          })
        ),
      (c) => c.unavailable.subscribe((r) => reasons.push(r))
    );
    await fixture.whenStable();

    expect(reasons).toEqual(['denied']);
    expect(fixture.componentInstance.unavailableReason()).toBe('denied');
  });

  it('stops the camera and the OCR worker when destroyed', async () => {
    await setup();

    fixture.destroy();

    expect(scanner.stopScanning).toHaveBeenCalled();
    expect(ocr.terminate).toHaveBeenCalled();
  });
});
