import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  DOCUMENT,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import {
  PrintDetail,
  PrintService,
  PrintViewStatus,
} from '../../core/services/print.service';

import { Clipboard } from '@angular/cdk/clipboard';

import { ToastrService } from 'ngx-toastr';
import { NavigatorShareService } from 'src/app/core/services/navigator-share.service';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import {
  DefaultLayoutDirective,
  DefaultLayoutAlignDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

export interface DialogData {
  printId: number;
}

@Component({
  selector: 'app-print-share-dialog',
  templateUrl: './print-share-dialog.component.html',
  styleUrls: ['./print-share-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatFormField,
    MatLabel,
    MatSelect,
    FormsModule,
    MatOption,
    MatInput,
    MatDialogActions,
    DefaultLayoutDirective,
    DefaultLayoutAlignDirective,
    MatButton,
    MatIcon,
    MatDialogClose,
  ],
})
export class PrintShareDialogComponent implements OnInit {
  dialogRef = inject<MatDialogRef<PrintShareDialogComponent>>(MatDialogRef);
  data = inject<DialogData>(MAT_DIALOG_DATA);
  private printService = inject(PrintService);
  private clipboard = inject(Clipboard);
  private toastrService = inject(ToastrService);
  navigatorShareService = inject(NavigatorShareService);
  private readonly document = inject<Document>(DOCUMENT);

  readonly print = signal<PrintDetail | null>(null);

  readonly printLink = computed(() => {
    const print = this.print();
    return print ? `${this.document.location.origin}/prints/${print.id}` : '';
  });

  printViewStatusTypes = PrintViewStatus;

  ngOnInit(): void {
    this.printService.getPrintDetail(this.data.printId).subscribe((print) => {
      this.handlePrintChange(print);
    });
  }

  handlePrintChange(newPrint: PrintDetail) {
    this.print.set(newPrint);
  }

  public updatePrint(newViewStatus: PrintViewStatus) {
    const newPrint: PrintDetail = {
      ...this.print(),
      viewStatus: newViewStatus,
    };
    // Only the view status: sending the whole print loaded when the dialog opened would revert
    // anything a connector recorded since (#263).
    this.printService
      .patchPrint(newPrint.id, { viewStatus: newViewStatus })
      .subscribe((_) => {
        this.handlePrintChange(newPrint);
      });
  }

  public copyToClipboard() {
    this.clipboard.copy(this.printLink());
    this.toastrService.success('Link Copied to Clipboard', 'Success');

    this.dialogRef.close();
  }

  public share() {
    if (this.navigatorShareService.canShare()) {
      this.navigatorShareService
        .share({
          title: `${this.print().title} | 3D Print Log`,
          url: `https://www.3dprintlog.com/prints/${this.print().id}`,
        })
        .then((response) => {
          this.dialogRef.close();
        })
        .catch((error) => {});
    }
  }
}
