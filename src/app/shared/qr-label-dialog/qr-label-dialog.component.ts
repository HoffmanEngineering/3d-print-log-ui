import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
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

export interface QrLabelDialogData {
  filaments: FilamentSummary[];
}

export type LabelSize = 'small' | 'medium' | 'large';
export type PaperSize = 'A4' | 'Letter' | 'A5';

interface LabelData {
  filament: FilamentSummary;
  qrCodeSvg: SafeHtml;
  qrCodeSvgString: string;
  url: string;
}

interface PaperDimensions {
  width: number;
  height: number;
}

const PAPER_DIMENSIONS: Record<PaperSize, PaperDimensions> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
  A5: { width: 148, height: 210 },
};

const LABEL_DIMENSIONS: Record<LabelSize, { width: number; height: number }> = {
  small: { width: 50, height: 25 },
  medium: { width: 70, height: 30 },
  large: { width: 90, height: 35 },
};

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

  readonly columns = signal(2);
  readonly rows = signal(5);
  readonly copies = signal(1);
  readonly safeCopies = computed(() =>
    Math.max(1, Math.min(10, this.copies()))
  );
  readonly labelSize = signal<LabelSize>('medium');
  readonly paperSize = signal<PaperSize>('A4');
  readonly loading = signal(true);
  readonly labels = signal<LabelData[]>([]);

  readonly columnOptions = [1, 2, 3, 4];
  readonly rowOptions = [3, 4, 5, 6, 7, 8, 9, 10];
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

    const labels = await Promise.all(labelPromises);

    this.labels.set(labels);
    this.loading.set(false);
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

    // Open a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print labels');
      return;
    }

    const content = this.generatePrintHtml();
    printWindow.document.write(content);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
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

  close(): void {
    this.dialogRef.close();
  }
}
