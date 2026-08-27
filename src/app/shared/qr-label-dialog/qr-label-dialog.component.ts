import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { FilamentSummary } from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { QrCodeService } from 'src/app/core/services/qr-code.service';
import { MatInputModule } from '@angular/material/input';
import { ToastrService } from 'ngx-toastr';
import {
  LABEL_DIMENSIONS,
  LabelSize,
  PAPER_DIMENSIONS,
  PaperSize,
  fitGrid,
} from './qr-label-layout';

export interface QrLabelDialogData {
  filaments: FilamentSummary[];
}

interface LabelData {
  filament: FilamentSummary;
  qrCodeSvg: SafeHtml;
  qrCodeSvgString: string;
  url: string;
}

/**
 * The layout choices remembered between visits. Printing labels is repetitive -
 * the same paper, the same label stock - so re-picking every control on every
 * open is pure friction.
 */
interface StoredLayout {
  paperSize: PaperSize;
  labelSize: LabelSize;
  copies: number;
  columnOverride: number | null;
  rowOverride: number | null;
}

const LAYOUT_STORAGE_KEY = 'qr_label_layout';

const MIN_COPIES = 1;
const MAX_COPIES = 10;

@Component({
  selector: 'app-qr-label-dialog',
  templateUrl: './qr-label-dialog.component.html',
  styleUrls: ['./qr-label-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatInputModule,
  ],
})
export class QrLabelDialogComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<QrLabelDialogComponent>);
  private readonly data = inject<QrLabelDialogData>(MAT_DIALOG_DATA);
  private readonly qrCodeService = inject(QrCodeService);
  private readonly loggingService = inject(LoggingService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  private readonly toastr = inject(ToastrService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly copies = signal(MIN_COPIES);
  readonly safeCopies = computed(() =>
    Math.max(MIN_COPIES, Math.min(MAX_COPIES, this.copies()))
  );
  readonly labelSize = signal<LabelSize>('medium');
  readonly paperSize = signal<PaperSize>('A4');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly labels = signal<LabelData[]>([]);

  /**
   * Manual grid choices. Null means "however many fit", which is what almost
   * everyone wants; the selects behind Advanced layout set these for the rare
   * sheet of pre-cut labels that does not match the auto-fit.
   */
  readonly columnOverride = signal<number | null>(null);
  readonly rowOverride = signal<number | null>(null);
  readonly showAdvanced = signal(false);

  readonly labelSizeOptions: { value: LabelSize; label: string }[] = [
    { value: 'small', label: 'Small (50x25mm)' },
    { value: 'medium', label: 'Medium (70x30mm)' },
    { value: 'large', label: 'Large (90x35mm)' },
  ];
  readonly paperSizeOptions: { value: PaperSize; label: string }[] = [
    { value: 'A4', label: 'A4 (210x297mm)' },
    { value: 'Letter', label: 'Letter (216x279mm)' },
    { value: 'A5', label: 'A5 (148x210mm)' },
  ];

  /** The most labels of the chosen size that fit the chosen sheet. */
  readonly autoFitGrid = computed(() =>
    fitGrid(this.paperDimensions(), this.labelDimensions())
  );

  // An override is capped by what fits, so shrinking the paper (or growing the
  // label) can never leave a stale choice that overflows the page.
  readonly columns = computed(() =>
    Math.min(this.columnOverride() ?? Infinity, this.autoFitGrid().columns)
  );
  readonly rows = computed(() =>
    Math.min(this.rowOverride() ?? Infinity, this.autoFitGrid().rows)
  );

  readonly columnOptions = computed(() => range(this.autoFitGrid().columns));
  readonly rowOptions = computed(() => range(this.autoFitGrid().rows));

  readonly isAutoFit = computed(
    () => this.columnOverride() === null && this.rowOverride() === null
  );

  readonly itemsPerPage = computed(() => this.columns() * this.rows());

  readonly displayLabels = computed(() =>
    this.labels().flatMap((label) => Array(this.safeCopies()).fill(label))
  );

  readonly pages = computed(() => {
    const allLabels = this.displayLabels();
    const perPage = this.itemsPerPage();
    const pageArray: LabelData[][] = [];

    for (let i = 0; i < allLabels.length; i += perPage) {
      pageArray.push(allLabels.slice(i, i + perPage));
    }

    return pageArray;
  });

  readonly paperDimensions = computed(() => PAPER_DIMENSIONS[this.paperSize()]);
  readonly labelDimensions = computed(() => LABEL_DIMENSIONS[this.labelSize()]);

  readonly labelClass = computed(() => `label-${this.labelSize()}`);

  readonly pageStyle = computed(() => ({
    width: `${this.paperDimensions().width}mm`,
    height: `${this.paperDimensions().height}mm`,
  }));

  readonly gridStyle = computed(() => ({
    'grid-template-columns': `repeat(${this.columns()}, 1fr)`,
  }));

  constructor() {
    this.restoreLayout();

    // Remembered as they change rather than on print, so a layout picked and
    // then abandoned is still there next time.
    effect(() => this.persistLayout());
  }

  ngOnInit(): void {
    this.loggingService.logEvent('QrLabelDialog_Opened', {
      materialCount: this.data.filaments.length,
    });
    this.generateQrCodes();
  }

  ngOnDestroy(): void {
    // Clean up any print container that might be left
    const existing = this.document.getElementById('qr-label-print-container');
    if (existing) {
      existing.remove();
    }
  }

  private async generateQrCodes(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const labelPromises = this.data.filaments.map(async (filament) => {
      const url = this.qrCodeService.generateFilamentUrl(filament.id);
      const svgString = await this.qrCodeService.generateSvg(url, {
        width: 150,
        margin: 0,
      });
      const qrCodeSvg = this.sanitizer.bypassSecurityTrustHtml(svgString);

      return {
        filament,
        qrCodeSvg,
        qrCodeSvgString: svgString,
        url,
      };
    });

    try {
      const labels = await Promise.all(labelPromises);
      this.labels.set(labels);
    } catch (error) {
      // Never leave the dialog stuck on the spinner: surface the failure so the
      // user can retry or close instead of waiting forever.
      this.loggingService.logException(error as Error);
      this.error.set(
        'Something went wrong generating the QR codes. Please try again.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    this.generateQrCodes();
  }

  print(): void {
    this.loggingService.logEvent('QrLabelDialog_Print', {
      materialCount: this.labels().length,
      copies: this.safeCopies(),
      totalLabels: this.displayLabels().length,
      paperSize: this.paperSize(),
      columns: this.columns(),
      rows: this.rows(),
      labelSize: this.labelSize(),
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.loggingService.logEvent('QrLabelDialog_PrintPopupBlocked');
      this.toastr.warning(
        'Your browser blocked the print window. Allow popups for this site, then print again.',
        'Popup blocked'
      );
      return;
    }

    printWindow.document.write(this.generatePrintHtml());
    printWindow.document.close();

    // Print as soon as the document is written instead of waiting on `onload`.
    // Everything the sheet needs is inline - the QR codes are SVG markup and the
    // styles are a <style> block - so there is nothing left to load, and a load
    // event that has already gone by would never reach a handler attached here.
    printWindow.focus();
    // Closing straight after `print()` races browsers that do not block on the
    // print dialog, which cancels the job. A window left open is recoverable;
    // a cancelled print is not.
    printWindow.addEventListener('afterprint', () => printWindow.close());
    printWindow.print();
  }

  private generatePrintHtml(): string {
    const pages = this.pages();
    const paperDims = this.paperDimensions();
    const cols = this.columns();
    const rows = this.rows();
    const size = this.labelSize();

    const pagesHtml = pages
      .map((pageLabels) => {
        const labelsHtml = pageLabels
          .map((label) => this.generateLabelHtml(label, size))
          .join('');

        return `
          <div class="print-page" style="width: ${paperDims.width}mm;">
            <div class="print-grid" style="grid-template-columns: repeat(${cols}, 1fr);">
              ${labelsHtml}
            </div>
          </div>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Labels</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          @page {
            size: auto;
            margin: 0;
          }

          html, body {
            width: 100%;
            height: 100%;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: white;
          }

          .print-page {
            background: white;
            padding: 10mm;
            page-break-after: always;
            page-break-inside: avoid;
          }

          .print-page:last-child {
            page-break-after: auto;
          }

          .print-grid {
            display: grid;
            gap: 3mm;
            justify-items: center;
            align-items: start;
          }

          .print-label {
            display: flex;
            align-items: center;
            border: 1px dashed #666;
            border-radius: 2mm;
            padding: 2mm;
            gap: 2mm;
            width: 100%;
            height: 100%;
          }

          .print-label-small {
            max-width: 50mm;
            max-height: 25mm;
          }

          .print-label-small .qr-code {
            width: 18mm;
            height: 18mm;
            min-width: 18mm;
          }

          .print-label-small .label-info {
            font-size: 7px;
          }

          .print-label-small .label-name {
            font-size: 8px;
          }

          .print-label-medium {
            max-width: 70mm;
            max-height: 30mm;
          }

          .print-label-medium .qr-code {
            width: 22mm;
            height: 22mm;
            min-width: 22mm;
          }

          .print-label-medium .label-info {
            font-size: 8px;
          }

          .print-label-medium .label-name {
            font-size: 9px;
          }

          .print-label-large {
            max-width: 90mm;
            max-height: 35mm;
          }

          .print-label-large .qr-code {
            width: 28mm;
            height: 28mm;
            min-width: 28mm;
          }

          .print-label-large .label-info {
            font-size: 9px;
          }

          .print-label-large .label-name {
            font-size: 10px;
          }

          .qr-code {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .qr-code svg {
            display: block;
            width: 100%;
            height: 100%;
          }

          .label-info {
            display: flex;
            flex-direction: column;
            gap: 1px;
            overflow: hidden;
            flex: 1;
            justify-content: center;
            min-width: 0;
          }

          .label-name {
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .label-brand,
          .label-material {
            color: rgba(0, 0, 0, 0.7);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .label-color {
            display: flex;
            align-items: center;
            gap: 2px;
          }

          .color-swatch {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1px solid rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .label-temp {
            color: rgba(0, 0, 0, 0.6);
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;
  }

  private generateLabelHtml(label: LabelData, size: LabelSize): string {
    const brandHtml = label.filament.brand
      ? `<div class="label-brand">${this.escapeHtml(label.filament.brand)}</div>`
      : '';

    const tempHtml = label.filament.recommendedTemp
      ? `<div class="label-temp">Nozzle: ${label.filament.recommendedTemp}°C</div>`
      : '';

    const colorHex = label.filament.colorHex
      ? `#${label.filament.colorHex}`
      : '#cccccc';

    return `
      <div class="print-label print-label-${size}">
        <div class="qr-code">${label.qrCodeSvgString}</div>
        <div class="label-info">
          <div class="label-name">${this.escapeHtml(label.filament.displayName)}</div>
          ${brandHtml}
          <div class="label-material">${this.escapeHtml(label.filament.materialType)}</div>
          <div class="label-color">
            <span class="color-swatch" style="background-color: ${colorHex};"></span>
            <span>${this.escapeHtml(label.filament.colorName || 'Unknown')}</span>
          </div>
          ${tempHtml}
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = this.document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  clampCopies(): void {
    this.copies.set(this.safeCopies());
  }

  toggleAdvanced(): void {
    this.showAdvanced.update((shown) => !shown);
  }

  resetToAutoFit(): void {
    this.columnOverride.set(null);
    this.rowOverride.set(null);
  }

  private restoreLayout(): void {
    const stored = this.readStoredLayout();
    if (!stored) {
      return;
    }

    this.paperSize.set(stored.paperSize);
    this.labelSize.set(stored.labelSize);
    this.copies.set(stored.copies);
    this.columnOverride.set(stored.columnOverride);
    this.rowOverride.set(stored.rowOverride);
  }

  /**
   * Reads the remembered layout, ignoring anything that is not a value this
   * dialog currently offers. Storage is shared with older and newer builds of
   * the app and is editable by hand, so a stored paper size that no longer
   * exists has to fall back to the defaults rather than render an empty select.
   */
  private readStoredLayout(): StoredLayout | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<StoredLayout>;
      const paperSize = parsed.paperSize;
      const labelSize = parsed.labelSize;

      if (
        !paperSize ||
        !(paperSize in PAPER_DIMENSIONS) ||
        !labelSize ||
        !(labelSize in LABEL_DIMENSIONS)
      ) {
        return null;
      }

      return {
        paperSize,
        labelSize,
        copies: clampCopiesValue(parsed.copies),
        columnOverride: readOverride(parsed.columnOverride),
        rowOverride: readOverride(parsed.rowOverride),
      };
    } catch {
      // Corrupt, or storage is unavailable (private mode): defaults are fine.
      return null;
    }
  }

  private persistLayout(): void {
    if (!this.isBrowser) {
      return;
    }

    const layout: StoredLayout = {
      paperSize: this.paperSize(),
      labelSize: this.labelSize(),
      copies: this.safeCopies(),
      columnOverride: this.columnOverride(),
      rowOverride: this.rowOverride(),
    };

    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Storage full or blocked - failing to remember a layout is not an error
      // worth showing anyone.
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function clampCopiesValue(value: unknown): number {
  const copies = Math.floor(Number(value));
  if (!Number.isFinite(copies)) {
    return MIN_COPIES;
  }
  return Math.max(MIN_COPIES, Math.min(MAX_COPIES, copies));
}

function readOverride(value: unknown): number | null {
  const override = Math.floor(Number(value));
  return Number.isFinite(override) && override >= 1 ? override : null;
}
