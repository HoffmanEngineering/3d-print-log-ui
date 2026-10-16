import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import {
  FilamentDetail,
  FilamentService,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { TagReaderService } from 'src/app/core/services/tag-reader.service';
import { TagRead } from 'src/app/core/types/native-bridge';
import { TagReading } from 'src/app/core/types/tag-reading';
import { escapeHtml } from 'src/app/core/utils/escape-html';
import { ToastrService } from 'ngx-toastr';
import { Observable, finalize, map, of } from 'rxjs';
import {
  readTagUidConflict,
  tagUidConflictMessage,
} from 'src/app/filament/tag-uid';
import { openSimpleDialog } from '../simple-dialog/simple-dialog.component';
import { QrScanResult } from 'src/app/core/services/qr-scanner.service';
import { filamentDetailToSummary } from 'src/app/core/utils/filament-summary';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { FilamentListComponent } from '../filament-list/filament-list.component';
import { QrScannerComponent } from '../qr-scanner/qr-scanner.component';

export interface DialogData {
  otherFilamentOption: any;
  filterByMaterialCategory: string;
  multiSelect?: boolean;
  /**
   * A tag the user wants linked: the picker opens in its unknown-tag state, and the spool they
   * pick is offered the tag. The Materials list's Scan spool sheet uses this.
   */
  pendingTagUid?: string;
  /** What the pending tag says, saved to the spool it is linked to. */
  pendingTagReading?: TagReading | null;
}

export type ViewMode = 'list' | 'scanner';

@Component({
  selector: 'app-filament-search-modal',
  templateUrl: './filament-search-modal.component.html',
  styleUrls: ['./filament-search-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatIconButton,
    MatTooltip,
    MatIcon,
    CdkScrollable,
    MatDialogContent,
    MatProgressSpinner,
    FilamentListComponent,
    MatButton,
    QrScannerComponent,
    MatDialogActions,
  ],
})
export class FilamentSearchModalComponent {
  readonly dialogRef = inject(MatDialogRef<FilamentSearchModalComponent>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly loggingService = inject(LoggingService);
  private readonly filamentService = inject(FilamentService);
  private readonly tagReader = inject(TagReaderService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  /** Whether this app shell can read tags; every NFC control hides without it. */
  readonly tagAvailable = this.tagReader.available;
  readonly nfcStatus = this.tagReader.status;

  /**
   * A tag no spool has yet. While set, the next spool picked is offered the tag. One tag links
   * to one spool, so it clears after that pick either way.
   */
  readonly pendingTagUid = signal<string | null>(
    this.data.pendingTagUid ?? null
  );

  /** What the pending tag says, if the read decoded. Sent with the link. */
  private pendingTagReading: TagReading | null =
    this.data.pendingTagReading ?? null;

  readonly viewMode = signal<ViewMode>('list');
  readonly scanError = signal<string | null>(null);
  readonly loading = signal(false);
  /**
   * A tag is being handled: its lookup, the check or link dialog it opened, or the link save.
   * Reads are dropped until it is done, so one tag never races another's dialog or save.
   */
  readonly tagBusy = signal(false);
  /** Set once the picker has answered; nothing that finishes later may change the answer. */
  private closed = false;
  /** The one multi-select selection. The list renders it; QR and NFC picks add to it. */
  readonly selectedFilaments = signal<FilamentSummary[]>([]);
  readonly selectedIds = computed(
    () => new Set(this.selectedFilaments().map((f) => f.id))
  );

  constructor() {
    // Listening whenever the picker is open, in list and QR mode alike. On the web, and in an
    // app shell that cannot read tags, this never emits.
    this.tagReader
      .listen()
      .pipe(takeUntilDestroyed())
      .subscribe((read) => this.handleTag(read));
  }

  handleFilamentSelected(filament: FilamentSummary) {
    if (this.data.multiSelect) {
      return;
    }
    if (this.pendingTagUid()) {
      this.offerTag(filament);
      return;
    }
    this.loggingService.logEvent('FilamentSearchModal_FilamentSelected');
    this.close(filament);
  }

  /** A multi-select row click: adds the spool, or removes it if it is already selected. */
  toggleFilament(filament: FilamentSummary) {
    if (this.selectedIds().has(filament.id)) {
      this.selectedFilaments.update((current) =>
        current.filter((f) => f.id !== filament.id)
      );
      return;
    }
    if (this.pendingTagUid()) {
      this.offerTag(filament);
      return;
    }
    this.addToSelection(filament);
  }

  dismissPendingTag() {
    this.pendingTagUid.set(null);
    this.pendingTagReading = null;
  }

  openNfcSettings() {
    void this.tagReader.openSettings();
  }

  /** A tag held to the phone: look up its spool, then pick it, or ask which spool it is on. */
  handleTag(read: TagRead) {
    // One tag at a time; a spool tapped meanwhile is dropped, not queued.
    if (this.closed || this.loading() || this.tagBusy()) {
      // Dropped, so it must not hold the repeat window shut for the next tap.
      this.tagReader.forget(read.uid);
      return;
    }

    this.tagBusy.set(true);
    this.loading.set(true);
    this.filamentService
      .resolveTagRead(read)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          const detail =
            response.status === 'linked' ? (response.filament ?? null) : null;
          this.loggingService.logEvent('TagReader_Lookup', {
            known: detail !== null,
          });

          if (detail === null) {
            this.tagBusy.set(false);
            this.pendingTagReading = response.reading ?? null;
            this.pendingTagUid.set(read.uid);
            this.viewMode.set('list');
            return;
          }

          this.confirmTagPick(detail)
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              finalize(() => this.tagBusy.set(false))
            )
            .subscribe((pick) => {
              if (pick) {
                this.loggingService.logEvent('FilamentSearchModal_TagSelected');
                this.select(filamentDetailToSummary(detail));
              } else {
                // Cancelled: tapping the same spool again right away must work.
                this.tagReader.forget(read.uid);
              }
            });
        },
        error: (err: { status?: number }) => {
          this.loading.set(false);
          this.tagBusy.set(false);
          this.loggingService.logEvent('TagReader_LookupFailed', {
            status: err?.status ?? 0,
          });
          // A retry of the same tag right away must not be swallowed as a repeat.
          this.tagReader.forget(read.uid);
          this.toastr.error(
            "Couldn't look up that tag. Check your connection."
          );
        },
      });
  }

  /**
   * A tag's spool is picked without asking, unless the picker would not have shown it: another
   * material category, or inactive (by-tag finds inactive spools; the list hides them).
   */
  private confirmTagPick(detail: FilamentDetail): Observable<boolean> {
    const name = escapeHtml(detail.displayName ?? 'This material');
    const filter = this.data.filterByMaterialCategory;
    const otherCategory =
      !!filter && detail.materialCategoryNickname !== filter;
    const inactive = !detail.isActive;

    if (!otherCategory && !inactive) {
      return of(true);
    }

    const category = escapeHtml(detail.materialCategoryNickname ?? '');
    const body =
      otherCategory && inactive
        ? `That's ${name}, a ${category}, and it is marked inactive. Pick it anyway?`
        : otherCategory
          ? `That's ${name}, a ${category}. Pick it anyway?`
          : `${name} is marked inactive. Pick it anyway?`;

    return openSimpleDialog(this.dialog, {
      title: 'Pick this spool?',
      body,
      yesText: 'Pick it',
      noText: 'Cancel',
    })
      .afterClosed()
      .pipe(map((answer) => answer === true));
  }

  /** The spool picked after an unknown tag: link the tag to it, or just select it. */
  private offerTag(filament: FilamentSummary) {
    const uid = this.pendingTagUid()!;
    const reading = this.pendingTagReading;
    this.tagBusy.set(true);

    openSimpleDialog(
      this.dialog,
      {
        title: 'Link this tag?',
        body: `Add tag <code>${escapeHtml(uid)}</code> to ${escapeHtml(filament.displayName ?? 'this material')}?`,
        yesText: 'Add tag and select',
        noText: 'Just select',
      },
      // Only the two buttons answer, so "no answer" always means Just select.
      { disableClose: true }
    )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((link) => {
        if (this.pendingTagUid() === uid) {
          this.pendingTagUid.set(null);
        }

        if (link !== true) {
          this.tagBusy.set(false);
          this.loggingService.logEvent('FilamentSearchModal_TagLinkSkipped');
          this.select(filament);
          return;
        }

        this.loading.set(true);
        // Not tied to the picker's lifetime: the user confirmed this link, and closing the
        // picker mid-save (Back, Escape, the backdrop) must not abort it. The closed guard
        // keeps a late result from changing the picker's answer.
        this.filamentService
          .addTagToFilament(filament.id, uid, reading)
          .pipe(
            finalize(() => {
              this.loading.set(false);
              this.tagBusy.set(false);
            })
          )
          .subscribe({
            next: () => {
              this.loggingService.logEvent('FilamentSearchModal_TagLinked');
              this.select(filament);
            },
            error: (err: { status?: number }) => {
              // The pick still stands; only the link failed.
              const conflict = readTagUidConflict(err);
              this.loggingService.logEvent(
                'FilamentSearchModal_TagLinkFailed',
                {
                  status: err?.status ?? 0,
                  conflict: conflict !== null,
                }
              );
              this.toastr.warning(
                conflict
                  ? tagUidConflictMessage(uid, conflict)
                  : `The tag wasn't saved to ${filament.displayName}. Try linking it again from the material page.`
              );
              this.select(filament);
            },
          });
      });
  }

  /** Picks a spool: closes single-select, or adds it to the multi-select selection. */
  private select(filament: FilamentSummary) {
    if (this.closed) {
      return;
    }
    if (this.data.multiSelect) {
      this.addToSelection(filament);
      this.viewMode.set('list');
      return;
    }
    this.close(filament);
  }

  /** Answers the picker once; a later answer (a save landing after Close) is ignored. */
  private close(result: unknown) {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.dialogRef.close(result);
  }

  private addToSelection(filament: FilamentSummary) {
    this.selectedFilaments.update((current) =>
      current.some((f) => f.id === filament.id)
        ? current
        : [...current, filament]
    );
  }

  confirmSelection() {
    this.loggingService.logEvent('FilamentSearchModal_MultiSelectConfirmed', {
      count: this.selectedFilaments().length,
    });
    this.close(this.selectedFilaments());
  }

  selectOtherFilament() {
    this.loggingService.logEvent('FilamentSearchModal_OtherSelected');
    this.close(this.data.otherFilamentOption);
  }

  closeSelected() {
    this.loggingService.logEvent('FilamentSearchModal_CloseSelected');
    this.close(null);
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

        // Map FilamentDetail to the FilamentSummary shape the picker expects,
        // including the server-computed remaining values.
        const summary = filamentDetailToSummary(filament);

        if (this.data.multiSelect) {
          // In multi-select mode: add to selection and switch back to list
          // so the user can confirm or add more filaments
          this.selectedFilaments.update((current) => {
            if (current.some((f) => f.id === summary.id)) return current;
            return [...current, summary];
          });
          this.viewMode.set('list');
        } else {
          this.close(summary);
        }
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
