import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { PrintDetail } from 'src/app/core/services/print.service';
import { GcodeViewerModalComponent } from 'src/app/shared/gcode-viewer-modal/gcode-viewer-modal.component';
import { ParserUnavailableDialogComponent } from 'src/app/shared/parser-unavailable-dialog/parser-unavailable-dialog.component';
import { ParsedNewPrint } from './file-parsers/core/gcode-new-print-parser';
import { SlicerRegistry } from './file-parsers/core/slicer-registry';
import { LoggingService } from './logging.service';

export type {
  GcodeNewPrintParser,
  ParsedNewPrint,
} from './file-parsers/core/gcode-new-print-parser';

/**
 * Front door for "Add Print From Gcode": picks a slicer parser through the
 * registry (exact marker, then heuristic) and falls back to the toolpath
 * simulator modal only when the file carries no recognizable settings.
 * Returns null when the user cancels the modal or a parse fails.
 */
@Injectable({
  providedIn: 'root',
})
export class GcodeFileParserService {
  private readonly loggingService = inject(LoggingService);
  private readonly registry = inject(SlicerRegistry);
  private readonly dialog = inject(MatDialog);
  private readonly toastrService = inject(ToastrService);

  public getSupportedSlicers(): string[] {
    return this.registry.getSupportedSlicerNames();
  }

  public async parse(
    gcode: string,
    fileName?: string
  ): Promise<PrintDetail | null> {
    return (await this.parseWithMeta(gcode, fileName))?.print ?? null;
  }

  /**
   * As parse, plus the printer names from the file's header. A file opened in the generic viewer
   * names no printer.
   */
  public async parseWithMeta(
    gcode: string,
    fileName?: string
  ): Promise<ParsedNewPrint | null> {
    const { parser, confidence, score } = this.registry.resolve(gcode);

    this.loggingService.logEvent('GcodeAnalyzed', {
      slicer: parser?.slicerName ?? 'unknown',
      confidence,
      score,
    });

    try {
      if (!parser) {
        const print = await this.showGenericGcodeViewerModal(gcode, fileName);
        return print ? { print, detectedPrinterNames: [] } : null;
      }

      if (confidence === 'heuristic') {
        this.toastrService.info(
          `Slicer not recognized — parsed as ${parser.slicerName}. Some settings may be missing.`
        );
      }

      return await parser.parseWithMeta(gcode, fileName);
    } catch (e: unknown) {
      this.loggingService.logException(e as Error);
      this.toastrService.error(
        'An error occurred while parsing gcode, unable to extract settings.',
        'Error'
      );
      return null;
    }
  }

  async showGenericGcodeViewerModal(
    gcode: string,
    fileName?: string
  ): Promise<PrintDetail> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(GcodeViewerModalComponent, {
        disableClose: true,
        minWidth: 300,
        maxWidth: 450,
        data: { gcode, fileName },
      });

      dialogRef.afterClosed().subscribe((result) => resolve(result));
    });
  }

  showParserUnavailableDialog() {
    this.dialog.open(ParserUnavailableDialogComponent, {
      minWidth: 300,
      maxWidth: 450,
      data: { supportedSlicers: this.getSupportedSlicers().join(', ') },
    });
  }
}
