import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { TagReaderService } from 'src/app/core/services/tag-reader.service';
import { TagRead } from 'src/app/core/types/native-bridge';

/** What the Materials list does after a scan. Undefined when the user cancels. */
export type ScanSpoolResult =
  | { kind: 'known'; id: string }
  | { kind: 'link'; uid: string }
  | { kind: 'new'; uid: string };

/**
 * The Materials list's "Scan spool": waits for one tag, then opens its spool, or for a tag no
 * spool has yet, offers to link it to one or start a new material with it.
 */
@Component({
  selector: 'app-scan-spool-sheet',
  templateUrl: './scan-spool-sheet.component.html',
  styleUrls: ['./scan-spool-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatIcon, MatProgressSpinner],
})
export class ScanSpoolSheetComponent {
  private readonly sheetRef =
    inject<MatBottomSheetRef<ScanSpoolSheetComponent, ScanSpoolResult>>(
      MatBottomSheetRef
    );
  private readonly tagReader = inject(TagReaderService);
  private readonly filamentService = inject(FilamentService);
  private readonly loggingService = inject(LoggingService);

  protected readonly status = this.tagReader.status;
  protected readonly phase = signal<'waiting' | 'looking' | 'unknown'>(
    'waiting'
  );
  protected readonly unknownUid = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  private subscription: Subscription | null = this.tagReader
    .listen()
    .subscribe((read) => this.handleTag(read));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopListening());
  }

  protected link(): void {
    this.loggingService.logEvent('MaterialsScan_LinkChosen');
    this.sheetRef.dismiss({ kind: 'link', uid: this.unknownUid()! });
  }

  protected createNew(): void {
    this.loggingService.logEvent('MaterialsScan_NewChosen');
    this.sheetRef.dismiss({ kind: 'new', uid: this.unknownUid()! });
  }

  protected cancel(): void {
    this.sheetRef.dismiss();
  }

  protected openNfcSettings(): void {
    void this.tagReader.openSettings();
  }

  private handleTag(read: TagRead): void {
    if (this.phase() !== 'waiting') {
      return;
    }

    this.phase.set('looking');
    this.error.set(null);
    this.filamentService.getFilamentByTag(read.uid).subscribe({
      next: (spool) => {
        this.loggingService.logEvent('TagReader_Lookup', {
          known: spool !== null,
        });
        if (spool) {
          this.loggingService.logEvent('MaterialsScan_Known');
          this.sheetRef.dismiss({ kind: 'known', id: spool.id });
          return;
        }

        // The sheet stops at the first tag. Letting go of the reader here also leaves it to
        // the picker that "Link to an existing spool" opens next.
        this.loggingService.logEvent('MaterialsScan_Unknown');
        this.stopListening();
        this.unknownUid.set(read.uid);
        this.phase.set('unknown');
      },
      error: (err: { status?: number }) => {
        this.loggingService.logEvent('TagReader_LookupFailed', {
          status: err?.status ?? 0,
        });
        this.tagReader.forget(read.uid);
        this.error.set("Couldn't look up that tag. Check your connection.");
        this.phase.set('waiting');
      },
    });
  }

  private stopListening(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }
}
