import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { AnalyticsFilterControlsComponent } from './analytics-filter-controls.component';
import { AnalyticsFilterStore } from './analytics-filter.store';

/**
 * Phone presentation of the same controls. It writes to the shell-provided store directly,
 * so there is no draft state to apply or discard — closing just dismisses the sheet.
 */
@Component({
  selector: 'app-analytics-filter-sheet',
  imports: [AnalyticsFilterControlsComponent, MatButtonModule],
  template: `
    <div class="analytics-filter-sheet">
      <h2 class="analytics-filter-sheet__title">Filters</h2>
      <div class="analytics-filter-sheet__controls">
        <app-analytics-filter-controls />
      </div>
      <div class="analytics-filter-sheet__actions">
        <button mat-button type="button" (click)="clear()">Clear all</button>
        <button mat-flat-button type="button" (click)="close()">Done</button>
      </div>
    </div>
  `,
  styles: [
    `
      .analytics-filter-sheet {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
      }
      .analytics-filter-sheet__title {
        margin: 0;
        font-size: 1.125rem;
      }
      .analytics-filter-sheet__controls {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .analytics-filter-sheet__actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsFilterSheetComponent {
  private readonly ref = inject(
    MatBottomSheetRef<AnalyticsFilterSheetComponent>
  );
  private readonly store = inject(AnalyticsFilterStore);

  clear(): void {
    this.store.clearAll();
  }

  close(): void {
    this.ref.dismiss();
  }
}
