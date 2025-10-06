import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FilamentSummary } from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';

export interface DialogData {
  otherFilamentOption: any;
  filterByMaterialCategory: string;
}

@Component({
  selector: 'app-filament-search-modal',
  templateUrl: './filament-search-modal.component.html',
  styleUrls: ['./filament-search-modal.component.scss'],
  standalone: false,
})
export class FilamentSearchModalComponent {
  constructor(
    public dialogRef: MatDialogRef<FilamentSearchModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private readonly loggingService: LoggingService
  ) {}

  handleFilamentSelected(filament: FilamentSummary) {
    this.loggingService.logEvent('FilamentSearchModal_FilamentSelected');
    this.dialogRef.close(filament);
  }

  selectOtherFilament() {
    this.loggingService.logEvent('FilamentSearchModal_OtherSelected');
    this.dialogRef.close(this.data.otherFilamentOption);
  }

  closeSelected() {
    this.loggingService.logEvent('FilamentSearchModal_CloseSelected');
    this.dialogRef.close(null);
  }
}
