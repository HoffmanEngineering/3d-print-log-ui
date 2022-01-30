import { Component, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ColumnDefinition } from '../print-list.component';

export interface DialogData {
  allPossibleColumns: ColumnDefinition[];
  currentColumns: string[];
}

@Component({
  selector: 'app-print-table-layout',
  templateUrl: './print-table-layout.component.html',
  styleUrls: ['./print-table-layout.component.scss'],
})
export class PrintTableLayoutComponent implements OnInit {
  public selectedColumns: string[];
  public allColumns: ColumnDefinition[];

  constructor(
    public dialogRef: MatDialogRef<PrintTableLayoutComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,

    private toastrService: ToastrService,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  ngOnInit(): void {
    this.allColumns = [...this.data.allPossibleColumns];
    this.selectedColumns = [...this.data.currentColumns];
  }
}
