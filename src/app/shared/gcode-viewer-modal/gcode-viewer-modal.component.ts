import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Inject,
  ViewChild,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
}

@Component({
  selector: 'app-gcode-viewer-modal',
  templateUrl: './gcode-viewer-modal.component.html',
  styleUrls: ['./gcode-viewer-modal.component.scss'],
})
export class GcodeViewerModalComponent implements AfterViewInit {
  @ViewChild('iframe') iframe: ElementRef;

  public lastSelectedPrinter: PrinterDetail = null;

  @HostListener('window:message', ['$event'])
  public async onMessage(e) {
    console.log('Message Recieved In Angular', e);

    const type = e.data.type;

    switch (type) {
      case 'GCODE_PARSER_INIT':
        const lastSelectedPrinterId =
          +(await this.getLastSelectedPrinter())?.value || null;

        const printer: PrinterDetail = null;
        if (lastSelectedPrinterId) {
          this.lastSelectedPrinter = await this.printerService
            .getPrinterDetail(lastSelectedPrinterId)
            .toPromise();
        }

        const action = {
          type: 'START_LOAD_GCODE',
          gcode: this.data.gcode,
          options: {
            nozzleDiaMm: this.lastSelectedPrinter.nozzleDiameter ?? 0.4,
            filamentDiaMm: this.lastSelectedPrinter.filamentDiameter ?? 1.75,
            filamentType: this.lastSelectedPrinter.loadedFilaments.some((fil) =>
              fil.filament.materialType.includes('ABS')
            )
              ? 'ABS'
              : 'PLA',
          },
        };

        this.sendMessage(action);
        break;
      case 'MODEL_INFO':
        const detail = this.parseModelInfoToPrintDetail(e.data.data);

        if (this.lastSelectedPrinter) {
          detail.printerId = this.lastSelectedPrinter.id;
        }

        this.dialogRef.close(detail);
        break;
    }
  }
  getLastSelectedPrinter() {
    return this.userSettingService.getCurrentUsersSettingByType(
      UserSettingType.Prints_LastSelectedPrinterId
    );
  }
  parseModelInfoToPrintDetail(info: any): PrintDetail {
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

    return print;
  }

  constructor(
    public dialogRef: MatDialogRef<SimpleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private readonly userSettingService: UserSettingService,
    private readonly printerService: PrinterService,
    private readonly filamentService: FilamentService
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

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

  sendMessage(action) {
    (this.iframe.nativeElement as HTMLIFrameElement).contentWindow.postMessage(
      action,
      '*'
    );
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
