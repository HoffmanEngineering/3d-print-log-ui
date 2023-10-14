import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { PrintDetail } from 'src/app/core/services/print.service';
import { GcodeViewerModalComponent } from 'src/app/shared/gcode-viewer-modal/gcode-viewer-modal.component';
import { ParserUnavailableDialogComponent } from 'src/app/shared/parser-unavailable-dialog/parser-unavailable-dialog.component';
import { PrusaSlicerFileParserService } from './file-parsers/prusa/prusa-slicer-file-parser.service';
import { LoggingService } from './logging.service';
import { CrealityPrintFileParserService } from './file-parsers/creality-print/creality-print-file-parser.service';
import { capitalize, snakeCase } from 'lodash-es';
import { OrcaFileParserService } from './file-parsers/orca/orca-file-parser.service';

/**
 * Parses Gcode text into a new PrintDetail object
 */
export interface GcodeNewPrintParser {
  /**
   * Parse PrintDetails from gcode
   * @param gcode The contents of a gcode file
   * @param fileName Optional file name of the gcode file
   */
  parse(gcode: string, fileName?: string): Promise<PrintDetail>;
}

export enum SupportedGcodeParserSlicers {
  PrusaSlicer = 'Prusa Slicer',
  CrealityPrint = 'Creality Print',
  Orca = 'Orca',
  BambuStudio = 'Bambu Studio',
}

@Injectable({
  providedIn: 'root',
})
export class GcodeFileParserService implements GcodeNewPrintParser {
  constructor(
    private readonly loggingService: LoggingService,
    private readonly prusaSlicerParser: PrusaSlicerFileParserService,
    private readonly crealityPrintParser: CrealityPrintFileParserService,
    private readonly orcaParser: OrcaFileParserService,
    private readonly dialog: MatDialog,
    private readonly toastrService: ToastrService
  ) {}

  public getSupportedSlicers(): string[] {
    return Object.values(SupportedGcodeParserSlicers);
  }

  public async parse(gcode: string, fileName?: string): Promise<PrintDetail> {
    const slicer: string = this.detectSlicerFromGcode(gcode);

    this.loggingService.logEvent('GcodeAnalyzed', {
      slicer,
    });

    try {
      switch (slicer) {
        case SupportedGcodeParserSlicers.PrusaSlicer:
          const prusaResult = await this.prusaSlicerParser.parse(gcode);
          if (fileName) {
            prusaResult.fileName = fileName;
            prusaResult.title = this.getTitle(fileName);
          }

          return prusaResult;

        case SupportedGcodeParserSlicers.CrealityPrint:
          const creatilyPrintResult = await this.crealityPrintParser.parse(
            gcode
          );
          if (fileName) {
            creatilyPrintResult.fileName = fileName;
            creatilyPrintResult.title = this.getTitle(fileName);
          }

          return creatilyPrintResult;

        case SupportedGcodeParserSlicers.Orca:
          const orcaResult = await this.orcaParser.parse(gcode);
          if (fileName) {
            orcaResult.fileName = fileName;
            orcaResult.title = this.getTitle(fileName);
          }

          return orcaResult;

        case SupportedGcodeParserSlicers.BambuStudio:
          const bamboResult = this.getBamboResult(gcode, fileName);

          return bamboResult || null;

        default:
          const result = this.showGenericGcodeViewerModal(gcode, fileName);

          return result || null;
      }
    } catch (e: unknown) {
      this.toastrService.error(
        'An error occurred while parsing gcode, unable to extract settings.',
        'Error'
      );
      return null;
    }
  }
  async getBamboResult(gcode: string, fileName: any) {
    const printFromGcode = await this.showGenericGcodeViewerModal(
      gcode,
      fileName
    );

    // Orca is a fork of bambu with newer features.
    const printFromOrca = await this.orcaParser.parse(gcode);
    if (fileName) {
      printFromOrca.fileName = fileName;
      printFromOrca.title = this.getTitle(fileName);
    }

    const combinedPrint = { ...printFromGcode, ...printFromOrca };

    if (
      printFromOrca.filamentUsage.length === 0 &&
      printFromGcode.filamentUsage.length > 0
    ) {
      combinedPrint.filamentUsage = printFromGcode.filamentUsage;
    }

    return combinedPrint;
  }
  GcodeViewerModalComponent;

  async showGenericGcodeViewerModal(
    gcode: string,
    fileName?: string
  ): Promise<PrintDetail> {
    return new Promise((resolve, reject) => {
      const dialogRef = this.dialog.open(GcodeViewerModalComponent, {
        disableClose: true,
        minWidth: 300,
        maxWidth: 450,
        data: { gcode: gcode, fileName: fileName },
      });

      dialogRef.afterClosed().subscribe((result) => {
        resolve(result);
      });
    });
  }

  showParserUnavailableDialog() {
    const dialogRef = this.dialog.open(ParserUnavailableDialogComponent, {
      minWidth: 300,
      maxWidth: 450,
      data: { supportedSlicers: this.getSupportedSlicers().join(', ') },
    });

    dialogRef.afterClosed().subscribe((result) => {});
  }
  private detectSlicerFromGcode(gcode: string): string {
    if (gcode.match(/generated by PrusaSlicer/)) {
      return SupportedGcodeParserSlicers.PrusaSlicer;
    }

    if (gcode.match(/generated by OrcaSlicer/)) {
      return SupportedGcodeParserSlicers.Orca;
    }

    if (gcode.match(/BambuStudio/)) {
      return SupportedGcodeParserSlicers.BambuStudio;
    }

    if (gcode.match(/Creality Print GCode/)) {
      return SupportedGcodeParserSlicers.CrealityPrint;
    }
    return 'unknown';
  }

  private getTitle(filename: string) {
    return (snakeCase(filename) as string)
      .split('_')
      .filter((segment) => segment.toLocaleLowerCase() !== 'gcode')
      .map((s) => capitalize(s))
      .join(' ');
  }
}
