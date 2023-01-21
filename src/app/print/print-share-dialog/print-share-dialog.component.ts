import { Component, Inject, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import {
  PrintDetail,
  PrintService,
  PrintViewStatus,
} from '../../core/services/print.service';

import { Clipboard } from '@angular/cdk/clipboard';
import { DOCUMENT } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { NavigatorShareService } from 'src/app/core/services/navigator-share.service';

export interface DialogData {
  printId: number;
}

@Component({
  selector: 'app-print-share-dialog',
  templateUrl: './print-share-dialog.component.html',
  styleUrls: ['./print-share-dialog.component.scss'],
})
export class PrintShareDialogComponent implements OnInit {
  print: PrintDetail;

  printLink = '';

  printViewStatusTypes = PrintViewStatus;

  constructor(
    public dialogRef: MatDialogRef<PrintShareDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private printService: PrintService,
    private clipboard: Clipboard,
    private toastrService: ToastrService,
    public navigatorShareService: NavigatorShareService,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  ngOnInit(): void {
    this.printService.getPrintDetail(this.data.printId).subscribe((print) => {
      this.handlePrintChange(print);
    });
  }

  handlePrintChange(newPrint: PrintDetail) {
    this.print = newPrint;
    this.printLink = `${this.document.location.origin}/prints/${newPrint.id}`;
  }

  public updatePrint(newViewStatus: PrintViewStatus) {
    const newPrint: PrintDetail = { ...this.print, viewStatus: newViewStatus };
    this.printService.updatePrint(newPrint).subscribe((_) => {
      this.handlePrintChange(newPrint);
    });
  }

  public copyToClipboard() {
    this.clipboard.copy(this.printLink);
    this.toastrService.success('Link Copied to Clipboard', 'Success');

    this.dialogRef.close();
  }

  public share() {
    if (this.navigatorShareService.canShare()) {
      this.navigatorShareService
        .share({
          title: `${this.print.title} | 3D Print Log`,
          url: `https://www.3dprintlog.com/prints/${this.print.id}`,
        })
        .then((response) => {
          this.dialogRef.close();
        })
        .catch((error) => {});
    }
  }
}
