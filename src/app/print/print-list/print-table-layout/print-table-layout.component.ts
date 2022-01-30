import { Component, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ColumnDefinition } from '../print-list.component';
import { Subject } from 'rxjs';
import { MediaMatcher } from '@angular/cdk/layout';

export interface DialogData {
  allPossibleColumns: ColumnDefinition[];
  currentColumns: string[];
  changeEvent: Subject<string[]>;
}

@Component({
  selector: 'app-print-table-layout',
  templateUrl: './print-table-layout.component.html',
  styleUrls: ['./print-table-layout.component.scss'],
})
export class PrintTableLayoutComponent implements OnInit {
  public selectedColumns: string[];
  public initialSelectedColumns: string[];
  public allColumns: ColumnDefinition[];
  public changeEvent: Subject<string[]>;

  constructor(
    public dialogRef: MatDialogRef<PrintTableLayoutComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,

    private toastrService: ToastrService,
    private media: MediaMatcher,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  ngOnInit(): void {
    this.allColumns = [...this.data.allPossibleColumns];
    this.initialSelectedColumns = [...this.data.currentColumns];
    this.selectedColumns = [...this.data.currentColumns];
    this.changeEvent = this.data.changeEvent;
  }

  resetSelection() {
    this.changeEvent.next(this.initialSelectedColumns);
    this.dialogRef.close();
  }

  resetToDefaults() {
    const mobileQuery = this.media.matchMedia('(max-width: 800px)');

    let defaultColumns: string[];

    // Initialize with defaults for size;
    if (mobileQuery.matches) {
      defaultColumns = [
        'image',
        'title',
        'printer',
        'start-date',
        'status',
        'more',
      ];
    } else {
      defaultColumns = [
        'image',
        'title',
        'printer',
        'start-date',
        'status',
        'printTime',
        'commentCount',
        'more',
      ];
    }

    this.selectedColumns = defaultColumns;

    this.changeEvent.next(this.selectedColumns);
  }
}
