import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import {
  FilamentService,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  Barcode,
  LabelReadRequest,
  LabelReadResponse,
  ScannedLabelRead,
} from 'src/app/core/types/label-reading';
import { FilamentColorSwatchComponent } from 'src/app/shared/filament-color-swatch/filament-color-swatch.component';
import { LabelOcrResult } from 'src/app/shared/label-scanner/label-ocr';
import {
  CameraUnavailableReason,
  LabelScannerComponent,
} from 'src/app/shared/label-scanner/label-scanner.component';
import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';
import {
  LABEL_REASON_LABELS,
  SuggestionRow,
  suggestionRows,
} from '../suggestion-rows';

/** What a label scan ends in: an existing spool, or a new one to fill from the read. */
export type LabelScanOutcome =
  | { kind: 'known'; id: string }
  | { kind: 'label-new'; read: ScannedLabelRead };

type LabelPhase =
  | 'scanning'
  | 'resolving'
  | 'need-photo'
  | 'unread'
  | 'own'
  | 'error';

/** What the API stores per spool; a scan that saw more keeps the first ones. */
const MAX_BARCODES = 4;

/**
 * The camera half of the Materials list's "Scan spool". A barcode a spool of yours already has
 * offers that spool or another like it; a barcode the catalog knows (or a photo of the label)
 * starts a new spool filled from the read; an unknown barcode asks for a photo first.
 */
@Component({
  selector: 'app-scan-label-panel',
  templateUrl: './scan-label-panel.component.html',
  styleUrls: ['./scan-label-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    MatProgressSpinner,
    FilamentColorSwatchComponent,
    LabelScannerComponent,
  ],
})
export class ScanLabelPanelComponent {
  private readonly filamentService = inject(FilamentService);
  private readonly logging = inject(LoggingService);

  /** The spools the list already has, so own matches on that page need no lookup. */
  readonly filaments = input<ReadonlyMap<string, FilamentSummary>>(new Map());

  readonly outcome = output<LabelScanOutcome>();
  readonly unavailable = output<CameraUnavailableReason>();

  protected readonly phase = signal<LabelPhase>('scanning');
  protected readonly rows = signal<SuggestionRow[]>([]);
  private readonly busy = new DeferredSkeletonController();
  protected readonly showSpinner = this.busy.visible;

  private lastRequest: LabelReadRequest | null = null;
  private lastResponse: LabelReadResponse | null = null;
  private resolution: Subscription | null = null;

  constructor() {
    this.logging.logEvent('LabelScan_Opened', { surface: 'add' });
    inject(DestroyRef).onDestroy(() => {
      this.resolution?.unsubscribe();
      this.busy.destroy();
    });
  }

  protected ownLabel(id: string): void {
    this.logging.logEvent('LabelScan_OwnLabel');
    // It names the spool outright, so a lookup still running must not answer after it.
    this.resolution?.unsubscribe();
    this.outcome.emit({ kind: 'known', id });
  }

  protected barcodes(barcodes: Barcode[]): void {
    if (!['scanning', 'need-photo', 'unread'].includes(this.phase())) return;
    this.resolve({ barcodes }, false);
  }

  protected photo(event: { barcodes: Barcode[]; ocr: LabelOcrResult }): void {
    this.logging.logEvent('LabelScan_Photo', {
      ms: event.ocr.ms,
      fieldsFound: Object.keys(event.ocr.fields).length,
    });
    this.resolve(
      {
        barcodes: event.barcodes,
        ocrText: event.ocr.text,
        fields: event.ocr.fields,
      },
      true
    );
  }

  /** The photo gave no words: the user may still continue with the barcodes. */
  protected photoFailed(barcodes: Barcode[]): void {
    this.lastRequest = { barcodes };
    this.setPhase('unread');
  }

  protected retry(): void {
    if (this.lastRequest) {
      this.resolve(this.lastRequest, !!this.lastRequest.ocrText);
    }
  }

  /** The lookup failed: start a new spool from what the phone read on its own. */
  protected continueAnyway(): void {
    const fields = this.lastRequest?.fields ?? {};
    this.newSpool({
      reading: {
        brand: null,
        materialType: fields.materialType ?? null,
        colorName: null,
        netWeightG: fields.weightG ?? null,
        diameterMm: fields.diameterMm ?? null,
        hotendMinC: fields.hotendMinC ?? null,
        hotendMaxC: fields.hotendMaxC ?? null,
        bedMinC: fields.bedMinC ?? null,
        bedMaxC: fields.bedMaxC ?? null,
      },
      catalogMatch: null,
      barcodes: this.lastRequest?.barcodes ?? [],
    });
  }

  protected addAnother(): void {
    this.logging.logEvent('LabelScan_AddAnother');
    if (this.lastResponse) this.newSpool(this.toRead(this.lastResponse));
  }

  protected open(id: string): void {
    this.outcome.emit({ kind: 'known', id });
  }

  private resolve(request: LabelReadRequest, fromPhoto: boolean): void {
    this.lastRequest = request;
    this.setPhase('resolving');
    this.resolution?.unsubscribe();
    this.resolution = this.filamentService.readLabel(request).subscribe({
      next: (response) => this.resolved(response, fromPhoto),
      error: () => {
        this.logging.logEvent('LabelScan_Error', { stage: 'lookup' });
        this.setPhase('error');
      },
    });
  }

  private resolved(response: LabelReadResponse, fromPhoto: boolean): void {
    this.lastResponse = response;
    const sameBarcode = response.ownMatches.filter((m) =>
      m.reasons.includes('same-barcode')
    );
    this.logging.logEvent('LabelScan_Resolved', {
      ownMatches: response.ownMatches.length,
      catalogMatch: response.catalogMatch !== null,
      barcodeKnown: sameBarcode.length > 0,
    });

    if (sameBarcode.length > 0) {
      this.resolution = suggestionRows(
        sameBarcode,
        this.filaments(),
        this.filamentService,
        LABEL_REASON_LABELS
      ).subscribe((rows) => {
        this.rows.set(rows);
        this.setPhase('own');
      });
      return;
    }
    if (response.catalogMatch || fromPhoto) {
      this.newSpool(this.toRead(response));
      return;
    }
    this.setPhase('need-photo');
  }

  private newSpool(read: ScannedLabelRead): void {
    this.logging.logEvent('LabelScan_NewChosen');
    this.outcome.emit({
      kind: 'label-new',
      read: { ...read, barcodes: read.barcodes.slice(0, MAX_BARCODES) },
    });
  }

  private toRead(response: LabelReadResponse): ScannedLabelRead {
    return {
      reading: response.reading,
      catalogMatch: response.catalogMatch,
      barcodes: response.barcodes,
    };
  }

  private setPhase(phase: LabelPhase): void {
    if (phase === 'resolving') this.busy.start();
    else if (this.phase() === 'resolving') this.busy.stop();
    this.phase.set(phase);
  }
}
