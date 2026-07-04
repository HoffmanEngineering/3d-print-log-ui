import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import {
  calculateSpoolAdjustment,
  SpoolAdjustmentResult,
} from './spool-weight-adjustment.util';

export interface SpoolWeightCalculatorDialogData {
  /** Empty spool weight in mg (already resolved and > 0 by the caller). */
  spoolWeightMg: number;
  /** Server-computed remaining filament weight in mg. */
  filamentRemainingMg: number;
}

export interface SpoolWeightCalculatorDialogResult {
  /** The adjustment to append, in grams (source = Weight). */
  adjustmentG: number;
  /** The measured total spool weight the user entered, in grams. */
  measuredTotalWeightG: number;
  /** Auto-generated, user-editable note describing the measurement. */
  note: string;
}

@Component({
  selector: 'app-spool-weight-calculator-dialog',
  templateUrl: './spool-weight-calculator-dialog.component.html',
  styleUrls: ['./spool-weight-calculator-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
})
export class SpoolWeightCalculatorDialogComponent {
  readonly data = inject<SpoolWeightCalculatorDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<SpoolWeightCalculatorDialogComponent>>(MatDialogRef);

  readonly spoolWeightG = this.data.spoolWeightMg / 1000;
  readonly filamentRemainingG = this.data.filamentRemainingMg / 1000;

  readonly measuredTotalWeightControl = new FormControl<number | null>(null, {
    validators: [Validators.required, Validators.min(0.001)],
  });

  private readonly measuredValue = toSignal(
    this.measuredTotalWeightControl.valueChanges,
    { initialValue: this.measuredTotalWeightControl.value }
  );

  readonly preview = computed<SpoolAdjustmentResult | null>(() => {
    const measuredG = this.measuredValue();
    if (measuredG == null || measuredG <= 0) {
      return null;
    }
    return calculateSpoolAdjustment(
      measuredG * 1000,
      this.data.spoolWeightMg,
      this.data.filamentRemainingMg
    );
  });

  confirm(): void {
    const result = this.preview();
    const measuredG = this.measuredTotalWeightControl.value;
    if (!result || measuredG == null) {
      return;
    }

    const adjustmentG = result.adjustmentMg / 1000;
    const remainingG = result.measuredRemainingMg / 1000;
    const note = `Measured total ${measuredG} g → ${remainingG} g remaining`;

    this.dialogRef.close({
      adjustmentG,
      measuredTotalWeightG: measuredG,
      note,
    } as SpoolWeightCalculatorDialogResult);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
