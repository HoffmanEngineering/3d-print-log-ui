import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FilamentSummary } from 'src/app/core/services/filament.service';

export interface DialogData {
  otherFilamentOption: any;
}

@Component({
  selector: 'app-filament-search-modal',
  templateUrl: './filament-search-modal.component.html',
  styleUrls: ['./filament-search-modal.component.scss'],
})
export class FilamentSearchModalComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<FilamentSearchModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit(): void {}

  handleFilamentSelected(filament: FilamentSummary) {
    this.dialogRef.close(filament);
  }

  selectOtherFilament() {
    this.dialogRef.close(this.data.otherFilamentOption);
  }
}
