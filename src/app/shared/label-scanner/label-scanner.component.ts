import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  InjectionToken,
  afterNextRender,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { LoggingService } from 'src/app/core/services/logging.service';
import { QrScannerService } from 'src/app/core/services/qr-scanner.service';
import { Barcode } from 'src/app/core/types/label-reading';
import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';
import { createLabelOcr, LabelOcr, LabelOcrResult } from './label-ocr';

/** Makes the OCR engine; a test provides a fake. */
export const LABEL_OCR_FACTORY = new InjectionToken<() => LabelOcr>(
  'LABEL_OCR_FACTORY',
  { providedIn: 'root', factory: () => () => createLabelOcr() }
);

export type CameraUnavailableReason = 'denied' | 'no-camera' | 'error';

/** The guide box: this share of the frame's width, at 3:2. */
const GUIDE_WIDTH = 0.85;
const GUIDE_RATIO = 3 / 2;

let nextId = 0;

/**
 * A live camera view for spool labels. It reads barcodes and QR codes continuously and, on the
 * shutter, OCRs the part of the frame inside the guide box. It only reports what it saw; the
 * host decides what to look up.
 */
@Component({
  selector: 'app-label-scanner',
  templateUrl: './label-scanner.component.html',
  styleUrls: ['./label-scanner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatIcon, MatProgressSpinner],
})
export class LabelScannerComponent {
  private readonly scanner = inject(QrScannerService);
  private readonly logging = inject(LoggingService);
  private readonly ocr = inject(LABEL_OCR_FACTORY)();

  /** True while the host is looking something up: decodes are ignored. */
  readonly paused = input(false);

  /** A 3D Print Log QR label: the spool's id. */
  readonly ownLabel = output<string>();
  /** Every product barcode seen so far, each time a new one appears. */
  readonly barcodesChanged = output<Barcode[]>();
  /** A photo of the label was read. */
  readonly photo = output<{ barcodes: Barcode[]; ocr: LabelOcrResult }>();
  /** The camera could not start. */
  readonly unavailable = output<CameraUnavailableReason>();

  protected readonly elementId = `label-reader-${nextId++}`;
  readonly unavailableReason = signal<CameraUnavailableReason | null>(null);
  protected readonly photoError = signal(false);
  protected readonly reading = signal(false);
  private readonly busy = new DeferredSkeletonController();
  protected readonly showSpinner = this.busy.visible;

  private barcodes: Barcode[] = [];

  constructor() {
    afterNextRender(() => void this.start());
    inject(DestroyRef).onDestroy(() => {
      void this.scanner.stopScanning();
      void this.ocr.terminate();
      this.busy.destroy();
    });
  }

  protected async readLabel(): Promise<void> {
    if (this.reading()) return;
    const frame = this.scanner.captureFrame();
    if (!frame) {
      this.photoError.set(true);
      return;
    }
    this.photoError.set(false);
    this.reading.set(true);
    this.busy.start();
    try {
      const ocr = await this.ocr.recognize(cropToGuide(frame));
      this.photo.emit({ barcodes: [...this.barcodes], ocr });
    } catch (err) {
      this.logging.logEvent('LabelScan_Error', { stage: 'ocr' });
      this.logging.logException(err as Error);
      this.photoError.set(true);
    } finally {
      this.reading.set(false);
      this.busy.stop();
    }
  }

  private async start(): Promise<void> {
    try {
      await this.scanner.startLabelScanning(this.elementId, (text, format) =>
        this.decoded(text, format)
      );
    } catch (err) {
      const reason = unavailableReason(err);
      this.unavailableReason.set(reason);
      this.unavailable.emit(reason);
    }
  }

  private decoded(text: string, format: string): void {
    if (this.paused()) return;

    const own = this.scanner.parseFilamentUrl(text);
    if (own.success && own.filamentId) {
      this.ownLabel.emit(own.filamentId);
      return;
    }
    // Other QR codes on labels are marketing links, not product codes.
    if (/^https?:\/\//i.test(text.trim())) return;

    const value = text.trim().toUpperCase();
    if (!value || this.barcodes.some((b) => b.value === value)) return;
    this.barcodes = [
      ...this.barcodes,
      { value, format: format.toLowerCase().replace(/[^a-z0-9]/g, '') },
    ];
    this.logging.logEvent('LabelScan_Barcode', {
      format: this.barcodes.at(-1)!.format,
    });
    this.barcodesChanged.emit(this.barcodes);
  }
}

/** The part of the frame under the guide box, which is centered. */
function cropToGuide(frame: HTMLCanvasElement): HTMLCanvasElement {
  const width = Math.round(frame.width * GUIDE_WIDTH);
  const height = Math.min(frame.height, Math.round(width / GUIDE_RATIO));
  const crop = document.createElement('canvas');
  crop.width = width;
  crop.height = height;
  crop
    .getContext('2d')
    ?.drawImage(
      frame,
      Math.round((frame.width - width) / 2),
      Math.round((frame.height - height) / 2),
      width,
      height,
      0,
      0,
      width,
      height
    );
  return crop;
}

function unavailableReason(err: unknown): CameraUnavailableReason {
  const text = `${(err as Error)?.name ?? ''} ${(err as Error)?.message ?? err}`;
  if (/NotAllowed|Permission/i.test(text)) return 'denied';
  if (/NotFound|DevicesNotFound|no camera/i.test(text)) return 'no-camera';
  return 'error';
}
