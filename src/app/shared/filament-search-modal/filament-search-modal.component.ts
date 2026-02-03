import { Component, inject, signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  FilamentDetail,
  FilamentService,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { QrScanResult } from 'src/app/core/services/qr-scanner.service';

export interface DialogData {
  otherFilamentOption: any;
  filterByMaterialCategory: string;
}

export type ViewMode = 'list' | 'scanner';

@Component({
  selector: 'app-filament-search-modal',
  templateUrl: './filament-search-modal.component.html',
  styleUrls: ['./filament-search-modal.component.scss'],
  standalone: false,
})
export class FilamentSearchModalComponent {
  readonly dialogRef = inject(MatDialogRef<FilamentSearchModalComponent>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly loggingService = inject(LoggingService);
  private readonly filamentService = inject(FilamentService);

  readonly viewMode = signal<ViewMode>('list');
  readonly scanError = signal<string | null>(null);
  readonly loading = signal(false);

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

  toggleViewMode() {
    const newMode = this.viewMode() === 'list' ? 'scanner' : 'list';
    this.viewMode.set(newMode);
    this.scanError.set(null);
    this.loggingService.logEvent('FilamentSearchModal_ToggleViewMode', {
      mode: newMode,
    });
    if (newMode === 'scanner') {
      this.loggingService.logEvent('QrScanner_Opened');
    }
  }

  retryScan() {
    this.scanError.set(null);
    this.loggingService.logEvent('FilamentSearchModal_RetryScan');
  }

  handleQrScanned(result: QrScanResult) {
    this.loggingService.logEvent('FilamentSearchModal_QrScanned', {
      success: result.success,
    });

    if (!result.success) {
      this.loggingService.logEvent('QrScanner_Error', {
        errorType: 'invalid_qr',
        error: result.error || 'Not a 3D Print Log filament label',
      });
      this.scanError.set(
        result.error || 'This QR code is not a 3D Print Log filament label'
      );
      return;
    }

    if (!result.filamentId) {
      this.loggingService.logEvent('QrScanner_Error', {
        errorType: 'no_filament_id',
        error: 'Could not extract filament ID',
      });
      this.scanError.set('Could not extract filament ID from QR code');
      return;
    }

    this.loading.set(true);
    this.scanError.set(null);

    this.filamentService.getFilamentDetail(result.filamentId).subscribe({
      next: (filament: FilamentDetail) => {
        this.loading.set(false);
        this.loggingService.logEvent('QrScanner_Success', {
          filamentId: filament.id,
        });
        this.loggingService.logEvent('FilamentSearchModal_QrFilamentSelected', {
          filamentId: filament.id,
        });

        // Map FilamentDetail to FilamentSummary format
        const summary: FilamentSummary = {
          id: filament.id,
          displayName: filament.displayName,
          brand: filament.brand,
          materialCategoryNickname: filament.materialCategoryNickname,
          materialType: filament.materialType,
          materialDensityGramPerCubicCm: filament.materialDensityGramPerCubicCm,
          colorName: filament.colorName,
          colorHex: filament.colorHex,
          recommendedTemp: filament.recommendedTemp,
          isActive: filament.isActive,
          notes: filament.notes,
          isFavorite: filament.isFavorite,
          createdDate: '',
          filamentRemaining: null,
          filamentLengthRemainingInM: null,
          filamentVolumeRemainingInMl: null,
          purchasePriceValue: filament.purchasePriceValue,
          initialNominalWeightMg: filament.initialNominalWeightMg,
          diameterMm: filament.diameterMm ?? 1.75,
          loadedInPrinter: null,
          storageLocation: filament.storageLocation,
          materialCategory: null as any,
        };

        this.dialogRef.close(summary);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.loggingService.logEvent('QrScanner_Error', {
            errorType: 'filament_not_found',
            filamentId: result.filamentId,
          });
          this.scanError.set('Filament not found. It may have been deleted.');
        } else {
          this.loggingService.logEvent('QrScanner_Error', {
            errorType: 'api_error',
            status: err.status,
          });
          this.scanError.set(
            'Unable to look up filament. Please check your connection.'
          );
        }
        this.loggingService.logException(err);
      },
    });
  }
}
