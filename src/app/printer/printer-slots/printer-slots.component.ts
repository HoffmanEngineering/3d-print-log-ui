import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { FilamentSummary } from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrinterFilamentSummaryDto,
  PrinterService,
} from 'src/app/core/services/printer.service';
import { FilamentColorSwatchComponent } from 'src/app/shared/filament-color-swatch/filament-color-swatch.component';
import { FilamentSearchModalComponent } from 'src/app/shared/filament-search-modal/filament-search-modal.component';

interface SlotRow {
  slot: number;
  label: string;
  loaded: PrinterFilamentSummaryDto | null;
}

/**
 * The spools in each slot of a multi-tool printer (#255). Loading and unloading save at once
 * through the slot endpoints, unlike the single-tool list, which saves with the printer form;
 * `loadedChange` hands the result back so that form's PUT sends the same list.
 */
@Component({
  selector: 'app-printer-slots',
  templateUrl: './printer-slots.component.html',
  styleUrls: ['./printer-slots.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, FilamentColorSwatchComponent],
})
export class PrinterSlotsComponent {
  private readonly printerService = inject(PrinterService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);

  printerId = input.required<number>();
  slotCount = input.required<number>();
  loaded = input<PrinterFilamentSummaryDto[]>([]);

  /** The printer's loaded filament after a load or unload, in slot order. */
  readonly loadedChange = output<PrinterFilamentSummaryDto[]>();

  private readonly current = linkedSignal(() => this.loaded());

  protected readonly rows = computed<SlotRow[]>(() => {
    const loaded = this.current();
    return Array.from({ length: this.slotCount() }, (_, slot) => {
      const inSlot = loaded.find((pf) => pf.slot === slot) ?? null;
      return { slot, label: inSlot?.slotLabel || `T${slot}`, loaded: inSlot };
    });
  });

  /** Loaded before slots existed, or in a slot past the printer's count. */
  protected readonly unslotted = computed(() =>
    this.current().filter(
      (pf) => pf.slot == null || pf.slot >= this.slotCount()
    )
  );

  protected load(row: SlotRow): void {
    const dialogRef = this.dialog.open(FilamentSearchModalComponent, {
      data: { otherFilamentOption: null },
      height: '90svh',
      width: '95vw',
      maxWidth: '100vw',
    });

    dialogRef.componentInstance.dialogRef
      .afterClosed()
      .subscribe((filament: FilamentSummary | null | undefined) => {
        if (filament?.id) {
          this.save(row, filament);
        }
      });
  }

  private save(row: SlotRow, filament: FilamentSummary): void {
    const movedFrom = this.movedFrom(row, filament);

    this.printerService
      .loadSlot(
        this.printerId(),
        row.slot,
        filament.id,
        row.loaded?.slotLabel ?? null
      )
      .subscribe({
        next: (loaded) => {
          this.current.set(loaded);
          this.loadedChange.emit(loaded);
          this.toastr.success(
            movedFrom
              ? `Moved ${filament.displayName} to ${row.label} from ${movedFrom}.`
              : `Loaded ${filament.displayName} into ${row.label}.`
          );
          this.logging.logEvent('PrinterSlots_Loaded', {
            slot: row.slot,
            moved: movedFrom !== null,
          });
        },
        error: (error) => {
          this.logging.logException(error);
          this.toastr.error(`Couldn't load ${row.label}. Please try again.`);
        },
      });
  }

  protected unload(row: SlotRow): void {
    this.printerService.unloadSlot(this.printerId(), row.slot).subscribe({
      next: () => {
        const loaded = this.current().filter((pf) => pf.slot !== row.slot);
        this.current.set(loaded);
        this.loadedChange.emit(loaded);
        this.logging.logEvent('PrinterSlots_Unloaded', { slot: row.slot });
      },
      error: (error) => {
        this.logging.logException(error);
        this.toastr.error(`Couldn't unload ${row.label}. Please try again.`);
      },
    });
  }

  /** Where the spool was before, when loading it here takes it from somewhere else. */
  private movedFrom(row: SlotRow, filament: FilamentSummary): string | null {
    const elsewhereHere = this.rows().find(
      (r) => r.slot !== row.slot && r.loaded?.filament?.id === filament.id
    );
    if (elsewhereHere) {
      return elsewhereHere.label;
    }

    const printer = filament.loadedInPrinter;
    if (printer && printer.id !== this.printerId()) {
      return printer.name;
    }

    return null;
  }
}
