import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { lastValueFrom } from 'rxjs';
import {
  createDefaultPrintDetail,
  getTitleFromFileName,
  OTHER_FILAMENT,
} from 'src/app/core/services/file-parsers/core/print-detail-defaults';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintDetail,
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
} from 'src/app/core/services/print.service';
import {
  PrinterDetail,
  PrinterService,
} from 'src/app/core/services/printer.service';
import {
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';

export interface DialogData {
  gcode: string;
  fileName?: string;
}

export enum Actions {
  GCODE_PARSER_INIT = 'GCODE_PARSER_INIT',
  START_LOAD_GCODE = 'START_LOAD_GCODE',
  SET_ANALYZE_PROGRESS = 'SET_ANALYZE_PROGRESS',
  SET_LOAD_PROGRESS = 'SET_LOAD_PROGRESS',
  MODEL_INFO = 'MODEL_INFO',
}

/** What the gcode-viewer worker reports in MODEL_INFO (the fields we read). */
interface ModelInfo {
  printTime?: number | string;
  totalFilament?: number;
  filamentByExtruder?: Record<string, number>;
  layerCnt?: number;
  layerHeight?: number;
  modelSize?: { x: number; y: number; z: number };
  max?: { speed?: number };
  min?: { speed?: number };
}

interface ViewerMessage {
  data: { type: string; progress?: number; data?: ModelInfo };
}

export type ViewerStep = 'reading' | 'analyzing' | 'done';

/**
 * Last-resort parser: runs hudbrog's gCodeViewer in a hidden iframe to
 * estimate a print from the toolpath when no slicer parser recognized the
 * file. Time is a floor (no acceleration model) and settings are geometry only.
 */
@Component({
  selector: 'app-gcode-viewer-modal',
  templateUrl: './gcode-viewer-modal.component.html',
  styleUrls: ['./gcode-viewer-modal.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GcodeViewerModalComponent implements AfterViewInit {
  @ViewChild('iframe') iframe: ElementRef<HTMLIFrameElement>;

  readonly dialogRef =
    inject<MatDialogRef<GcodeViewerModalComponent>>(MatDialogRef);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly userSettingService = inject(UserSettingService);
  private readonly printerService = inject(PrinterService);
  private readonly loggingService = inject(LoggingService);

  readonly loadingProgress = signal(0);
  readonly analyzingProgress = signal(0);
  readonly overallProgress = computed(
    () => this.loadingProgress() / 2 + this.analyzingProgress() / 2
  );
  readonly step = computed<ViewerStep>(() => {
    if (this.analyzingProgress() >= 100) return 'done';
    if (this.analyzingProgress() > 0 || this.loadingProgress() >= 100) {
      return 'analyzing';
    }
    return 'reading';
  });

  private lastSelectedPrinter: PrinterDetail | null = null;

  constructor() {
    this.loggingService.logEvent('GcodeViewerModal_Opened', {
      fileSize: this.data.gcode?.length ?? 0,
    });
  }

  @HostListener('window:message', ['$event'])
  public async onMessage(e: ViewerMessage) {
    switch (e.data.type) {
      case Actions.GCODE_PARSER_INIT: {
        const lastSelectedPrinterId =
          +(await this.getLastSelectedPrinter())?.value || null;
        if (lastSelectedPrinterId) {
          this.lastSelectedPrinter = await lastValueFrom(
            this.printerService.getPrinterDetail(lastSelectedPrinterId)
          );
        }
        this.sendMessage({
          type: Actions.START_LOAD_GCODE,
          gcode: this.data.gcode,
          options: {
            nozzleDiaMm: this.lastSelectedPrinter?.nozzleDiameter ?? 0.4,
            filamentDiaMm: this.lastSelectedPrinter?.filamentDiameter ?? 1.75,
            filamentType: this.lastSelectedPrinter?.loadedFilaments.some(
              (fil) => fil.filament.materialType.includes('ABS')
            )
              ? 'ABS'
              : 'PLA',
          },
        });
        break;
      }
      case Actions.MODEL_INFO: {
        this.analyzingProgress.set(100);
        this.dialogRef.close(
          this.parseModelInfoToPrintDetail(e.data.data ?? {})
        );
        break;
      }
      case Actions.SET_LOAD_PROGRESS:
        this.loadingProgress.set(e.data.progress ?? 0);
        break;
      case Actions.SET_ANALYZE_PROGRESS: {
        const progress = e.data.progress ?? 0;
        if (progress > 0) {
          this.loadingProgress.set(100);
        }
        this.analyzingProgress.set(progress);
        break;
      }
    }
  }

  cancel() {
    this.loggingService.logEvent('GcodeViewerModal_Cancelled');
    this.dialogRef.close(false);
  }

  ngAfterViewInit() {
    const content = `<html>
  <head>
    <script type="text/javascript" src="assets/js/gcode-viewer/ui.js"></script>
    <script type="text/javascript" src="assets/js/gcode-viewer/gCodeReader.js"></script>
    <script type="text/javascript" src="assets/js/gcode-viewer/renderer.js"></script>
    <script type="text/javascript" src="assets/js/gcode-viewer/analyzer.js"></script>
    <script type="text/javascript" src="assets/js/gcode-viewer/adapter.js"></script>
  </head>
  <body>
    <canvas id="canvas" width="650" height="620"></canvas>
    <script>GCODE.ui.initHandlers();</script>
  </body>
</html>`;
    const doc = this.iframe.nativeElement.contentDocument;
    doc.open();
    doc.write(content);
    doc.close();
  }

  private sendMessage(action: unknown) {
    this.iframe.nativeElement.contentWindow.postMessage(action, '*');
  }

  private getLastSelectedPrinter() {
    return this.userSettingService.getCurrentUsersSettingByType(
      UserSettingType.Prints_LastSelectedPrinterId
    );
  }

  private parseModelInfoToPrintDetail(info: ModelInfo): PrintDetail {
    const print = createDefaultPrintDetail();

    if (info.printTime) {
      print.estimatedPrintTimeInSeconds = parseInt(String(info.printTime), 10);
    }

    print.filamentUsage = this.filamentUsageFrom(info);
    print.notes = this.buildNotes(info);

    if (this.lastSelectedPrinter) {
      print.printerId = this.lastSelectedPrinter.id;
    }
    if (this.data.fileName) {
      print.fileName = this.data.fileName;
      print.title = getTitleFromFileName(this.data.fileName);
    }

    return print;
  }

  /**
   * One row per extruder that extruded anything. Slot 1 gets the last used
   * printer's first loaded filament (the common single-extruder case); the
   * rest get "Other" for the user to pick.
   */
  private filamentUsageFrom(info: ModelInfo): PrintFilamentSummaryDto[] {
    const byExtruder = Object.entries(info.filamentByExtruder ?? {})
      .map(([extruder, mm]) => ({ extruder: +extruder, mm }))
      .filter((slot) => slot.mm > 0)
      .sort((a, b) => a.extruder - b.extruder);

    const slots =
      byExtruder.length > 0
        ? byExtruder
        : info.totalFilament > 0
          ? [{ extruder: 0, mm: info.totalFilament }]
          : [];

    const firstLoaded =
      this.lastSelectedPrinter?.loadedFilaments?.[0]?.filament;

    return slots.map((slot, i) => ({
      id: null,
      filament: i === 0 && firstLoaded ? firstLoaded : OTHER_FILAMENT,
      source: PrintFilamentSourceMeasurement.Length,
      estimatedSource: PrintFilamentSourceMeasurement.Length,
      estimatedLengthInM: +(slot.mm / 1000).toFixed(2),
      notes: `Slot ${slot.extruder + 1}`,
    }));
  }

  private buildNotes(info: ModelInfo): string {
    const lines = [
      'Source: G-code toolpath analysis (slicer not recognized)',
      'Estimated time is a floor — actual time is typically 15–40% longer.',
    ];
    if (info.layerCnt) {
      lines.push(`  Layers: ${info.layerCnt.toFixed(0)}`);
    }
    if (info.layerHeight > 0) {
      lines.push(`  Layer Height: ${info.layerHeight.toFixed(2)}mm`);
    }
    if (info.modelSize) {
      const { x, y, z } = info.modelSize;
      lines.push(
        `  Model Size: ${x.toFixed(2)} x ${y.toFixed(2)} x ${z.toFixed(2)}mm`
      );
    }
    // Feedrates are mm/min in gcode; show mm/s.
    if (info.max?.speed > 0) {
      const min = info.min?.speed > 0 ? info.min.speed : info.max.speed;
      lines.push(
        `  Print Speed: ${Math.round(min / 60)}–${Math.round(info.max.speed / 60)} mm/s`
      );
    }
    return lines.join('\n');
  }
}
