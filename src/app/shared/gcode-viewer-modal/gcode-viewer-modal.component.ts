import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Inject,
  ViewChild,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { capitalize, snakeCase } from 'lodash';
import { Action } from 'rxjs/internal/scheduler/Action';
import { FilamentService } from 'src/app/core/services/filament.service';
import {
  EMPTY_GUID,
  PrintDetail,
  PrintStatus,
} from 'src/app/core/services/print.service';
import {
  PrinterDetail,
  PrinterService,
} from 'src/app/core/services/printer.service';
import {
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';
import { SimpleDialogComponent } from '../simple-dialog/simple-dialog.component';

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

@Component({
  selector: 'app-gcode-viewer-modal',
  templateUrl: './gcode-viewer-modal.component.html',
  styleUrls: ['./gcode-viewer-modal.component.scss'],
})
export class GcodeViewerModalComponent implements AfterViewInit {
  @ViewChild('iframe') iframe: ElementRef;

  public loadingProgress = 0;
  public analyzingProgress = 0;

  public lastSelectedPrinter: PrinterDetail = null;

  @HostListener('window:message', ['$event'])
  public async onMessage(e) {
    const type = e.data.type;

    switch (type) {
      case Actions.GCODE_PARSER_INIT:
        const lastSelectedPrinterId =
          +(await this.getLastSelectedPrinter())?.value || null;

        if (lastSelectedPrinterId) {
          this.lastSelectedPrinter = await this.printerService
            .getPrinterDetail(lastSelectedPrinterId)
            .toPromise();
        }

        const action = {
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
        };

        this.sendMessage(action);
        break;
      case Actions.MODEL_INFO:
        const detail = this.parseModelInfoToPrintDetail(e.data.data);

        if (this.lastSelectedPrinter) {
          detail.printerId = this.lastSelectedPrinter.id;
        }

        if (this.data.fileName) {
          detail.fileName = this.data.fileName;
          detail.title = (snakeCase(this.data.fileName) as string)
            .split('_')
            .filter((segment) => segment.toLocaleLowerCase() !== 'gcode')
            .map((s) => capitalize(s))
            .join(' ');
        }

        this.dialogRef.close(detail);
        break;
      case Actions.SET_LOAD_PROGRESS:
        this.loadingProgress = e.data.progress;
        break;
      case Actions.SET_ANALYZE_PROGRESS:
        const progress = e.data.progress;

        if (progress > 0) {
          this.loadingProgress = 100;
        }
        this.analyzingProgress = progress;
        break;
    }
  }

  constructor(
    public dialogRef: MatDialogRef<SimpleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private readonly userSettingService: UserSettingService,
    private readonly printerService: PrinterService
  ) {}

  ngAfterViewInit() {
    let content = `<html>
         <head>
             <h1>Hello world</h1>
             <script type="text/javascript" src="assets/js/gcode-viewer/ui.js"></script>
             <script type="text/javascript" src="assets/js/gcode-viewer/gCodeReader.js"></script>
             <script type="text/javascript" src="assets/js/gcode-viewer/renderer.js"></script>
             <script type="text/javascript" src="assets/js/gcode-viewer/analyzer.js"></script>
             <script type="text/javascript" src="assets/js/gcode-viewer/adapter.js"></script>
          </head>
            <body>
            <canvas id="canvas" width="650" height="620"></canvas>
             <script>
             GCODE.ui.initHandlers();
            </script>
            <script>
              GCODE.ui.initHandlers();
          </script>
        </body>
      </html>`;
    let doc =
      this.iframe.nativeElement.contentDocument ||
      this.iframe.nativeElement.contentWindow;
    doc.open();
    doc.write(content);
    doc.close();
  }

  private sendMessage(action) {
    (this.iframe.nativeElement as HTMLIFrameElement).contentWindow.postMessage(
      action,
      '*'
    );
  }

  private getLastSelectedPrinter() {
    return this.userSettingService.getCurrentUsersSettingByType(
      UserSettingType.Prints_LastSelectedPrinterId
    );
  }
  private parseModelInfoToPrintDetail(info: any): PrintDetail {
    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

    if (info.printTime) {
      print.estimatedPrintTimeInSeconds = parseInt(info.printTime, 10);
    }

    if (info.totalFilament) {
      const filamentInMeters = +(info.totalFilament / 1000).toFixed(2);

      print.filamentUsage = [
        {
          id: EMPTY_GUID,
          filament: this.lastSelectedPrinter?.loadedFilaments?.[0]?.filament,
          isActualLengthSource: true,
          isEstimatedLengthSource: true,
          estimatedLengthInM: filamentInMeters,
        },
      ];
    }

    print.notes = this.parseNotes(info);

    return print;
  }
  private parseNotes(info: any): string {
    let notes = '';

    if (info.layerCnt) {
      notes += `  Layers: ${info.layerCnt.toFixed(0)}\n`;
    }

    if (info.layerHeight && info.layerHeight > 0) {
      notes += `  Layer Height: ${parseFloat(info.layerHeight).toFixed(2)}mm\n`;
    }

    if (info.modelSize) {
      notes += `  Model Size:\n`;
      notes += `    X: ${info.modelSize.x.toFixed(2)}mm\n`;
      notes += `    Y: ${info.modelSize.y.toFixed(2)}mm\n`;
      notes += `    Z: ${info.modelSize.z.toFixed(2)}mm\n`;
    }

    // Add Header
    if (notes !== '') {
      notes = 'Settings:\n' + notes;
    }

    return notes;
  }

  private getDefaultPrintDetail() {
    const print: PrintDetail = {
      id: null,
      title: '',
      printerId: null,
      startDate: new Date(),
      estimatedPrintTimeInSeconds: null,
      estimatedFilamentUsageMg: null,
      printTimeInSeconds: null,
      filamentUsageMg: null,
      filamentType: '',
      notes: '',
      url: '',
      fileName: '',
      status: PrintStatus.Pending,
      viewStatus: null,
      images: [],
      allowComments: null,
      createdByUserId: null,
      comments: [],
      filamentUsage: [],
    };

    return print;
  }
}
