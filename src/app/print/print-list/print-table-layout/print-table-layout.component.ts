import {
  Component,
  OnInit,
  DOCUMENT,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';

import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ColumnDefinition } from '../print-list.component';
import { Subject } from 'rxjs';
import {
  CdkDragDrop,
  moveItemInArray,
  CdkDropList,
  CdkDrag,
  CdkDragHandle,
} from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatSelectionList, MatListOption } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import {
  DefaultLayoutDirective,
  DefaultLayoutAlignDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton } from '@angular/material/button';

export interface DialogData {
  title: string;
  allPossibleColumns: ColumnDefinition[];
  currentColumns: string[];
  defaultColumns: string[];
  changeEvent: Subject<string[]>;
}

@Component({
  selector: 'app-print-table-layout',
  templateUrl: './print-table-layout.component.html',
  styleUrls: ['./print-table-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatSelectionList,
    CdkDropList,
    FormsModule,
    CdkDrag,
    MatIcon,
    CdkDragHandle,
    MatListOption,
    MatTooltip,
    MatDialogActions,
    DefaultLayoutDirective,
    DefaultLayoutAlignDirective,
    MatButton,
    MatDialogClose,
  ],
})
export class PrintTableLayoutComponent implements OnInit {
  dialogRef = inject<MatDialogRef<PrintTableLayoutComponent>>(MatDialogRef);
  data = inject<DialogData>(MAT_DIALOG_DATA);
  private toastrService = inject(ToastrService);
  private readonly document = inject<Document>(DOCUMENT);

  public selectedColumns: string[];
  public initialSelectedColumns: string[];
  public initialAllColumns: ColumnDefinition[];
  public allColumns: ColumnDefinition[];
  public changeEvent: Subject<string[]>;

  ngOnInit(): void {
    this.initialSelectedColumns = [...this.data.currentColumns];
    this.selectedColumns = [...this.data.currentColumns];
    this.initialAllColumns = [...this.data.allPossibleColumns];

    // Adjust the all columns based on the order of the selected columns
    const reorderedAllColumns = [...this.data.allPossibleColumns];

    let previousIndex = undefined;
    let currentIndex = 0;

    for (let i = 0; i < this.selectedColumns.length; i++) {
      // Ignore the More column
      if (this.selectedColumns[i] === 'more') {
        continue;
      }

      currentIndex = reorderedAllColumns.findIndex(
        (col) => col.key === this.selectedColumns[i]
      );

      // A saved column the table no longer offers has nothing to move.
      if (currentIndex === -1) {
        continue;
      }

      if (previousIndex === undefined) {
        previousIndex = currentIndex;
        continue;
      }

      if (currentIndex < previousIndex) {
        moveItemInArray(reorderedAllColumns, currentIndex, previousIndex);
      } else {
        previousIndex = currentIndex;
      }
    }

    this.allColumns = [...reorderedAllColumns];

    this.changeEvent = this.data.changeEvent;
  }

  drop({
    previousIndex,
    currentIndex,
  }: CdkDragDrop<string[]> | { previousIndex: number; currentIndex: number }) {
    moveItemInArray(this.allColumns, previousIndex, currentIndex);

    const newOrderedSelectionList = [];
    for (const column of this.allColumns) {
      if (this.selectedColumns.includes(column.key)) {
        newOrderedSelectionList.push(column.key);
      }
    }

    this.selectedColumns = [...newOrderedSelectionList];

    this.data.changeEvent.next([...this.selectedColumns]);
  }

  moveUp(index: number) {
    this.drop({ previousIndex: index, currentIndex: index - 1 });
  }

  moveDown(index: number) {
    this.drop({ previousIndex: index, currentIndex: index + 1 });
  }

  resetSelection() {
    this.changeEvent.next(this.initialSelectedColumns);
    this.dialogRef.close();
  }

  resetToDefaults() {
    this.allColumns = [...this.initialAllColumns];

    this.selectedColumns = [...this.data.defaultColumns];

    this.changeEvent.next(this.selectedColumns);
  }
}
