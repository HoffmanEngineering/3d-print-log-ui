import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Observable, Subscription, catchError, forkJoin, map, of } from 'rxjs';
import {
  FilamentService,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { TagReaderService } from 'src/app/core/services/tag-reader.service';
import { TagRead } from 'src/app/core/types/native-bridge';
import {
  CatalogMatch,
  TagReadResponse,
  TagReading,
  TagSuggestion,
  TagSuggestionReason,
} from 'src/app/core/types/tag-reading';
import { filamentDetailToSummary } from 'src/app/core/utils/filament-summary';
import { FilamentColorSwatchComponent } from 'src/app/shared/filament-color-swatch/filament-color-swatch.component';
import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';
import { formatLabel } from '../../tag-format-label';
import { readTagUidConflict, tagUidConflictMessage } from '../../tag-uid';

/** What the Materials list does after a scan. Undefined when the user cancels. */
export type ScanSpoolResult =
  | { kind: 'known'; id: string }
  | { kind: 'linked'; id: string }
  | { kind: 'link'; uid: string; reading: TagReading | null }
  | {
      kind: 'new';
      uid: string;
      reading: TagReading | null;
      catalogMatch: CatalogMatch | null;
    };

/** What the Materials list hands the sheet. */
export interface ScanSpoolSheetData {
  /**
   * The spools the list already has, so suggestions on that page need no lookup. Spools it
   * does not have (another page, inactive) are fetched.
   */
  filaments?: FilamentSummary[];
}

type Phase = 'waiting' | 'reading' | 'resolving' | 'unknown' | 'error';

interface SuggestionRow {
  filamentId: string;
  /** Null when the spool could not be loaded; the row still links. */
  filament: FilamentSummary | null;
  reasons: string[];
}

const REASON_LABELS: Record<TagSuggestionReason, string> = {
  untagged: 'No tag yet',
  'close-color': 'Close color',
  'same-brand': 'Same brand',
  'same-material': 'Same material',
  'same-weight': 'Same weight',
};

const CLASSIC_HINT_KEY = 'printlog.tagHint.classicUnsupported';

/**
 * How long "Reading tag" may stand with no tag after it. Native can report a tag under the
 * phone and then deliver nothing (a repeat it drops, a read cut short), so the sheet must not
 * wait forever.
 */
const READING_WATCHDOG_MS = 4000;

/**
 * The Materials list's "Scan spool": waits for one tag, resolves it through the API, then
 * opens its spool, or for a tag no spool has yet shows what the tag says and offers spools to
 * link it to, a search of all materials, or a new material.
 */
@Component({
  selector: 'app-scan-spool-sheet',
  templateUrl: './scan-spool-sheet.component.html',
  styleUrls: ['./scan-spool-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    MatIcon,
    MatProgressSpinner,
    FilamentColorSwatchComponent,
  ],
})
export class ScanSpoolSheetComponent {
  private readonly sheetRef =
    inject<MatBottomSheetRef<ScanSpoolSheetComponent, ScanSpoolResult>>(
      MatBottomSheetRef
    );
  private readonly tagReader = inject(TagReaderService);
  private readonly filamentService = inject(FilamentService);
  private readonly loggingService = inject(LoggingService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly knownFilaments = new Map(
    (
      inject<ScanSpoolSheetData | null>(MAT_BOTTOM_SHEET_DATA, {
        optional: true,
      })?.filaments ?? []
    ).map((f) => [f.id, f])
  );

  /** Reading and resolving are waits; the spinner appears only if they run long. */
  private readonly busy = new DeferredSkeletonController();
  protected readonly showSpinner = this.busy.visible;

  protected readonly status = this.tagReader.status;
  /** iOS: nothing is read until a scan() opens the phone's sheet. */
  protected readonly scansOnDemand = this.tagReader.scansOnDemand;
  protected readonly phase = signal<Phase>('waiting');
  protected readonly error = signal<string | null>(null);

  private readonly lastRead = signal<TagRead | null>(null);
  protected readonly unknownUid = computed(() => this.lastRead()?.uid ?? null);
  protected readonly reading = signal<TagReading | null>(null);
  private readonly catalogMatch = signal<CatalogMatch | null>(null);
  protected readonly hint = signal<'hold-still' | null>(null);
  protected readonly showClassicHint = signal(false);
  protected readonly rows = signal<SuggestionRow[]>([]);
  /** The suggestion being linked, and why a link failed. */
  protected readonly linkingId = signal<string | null>(null);
  protected readonly linkError = signal<string | null>(null);

  protected readonly summary = computed(() => {
    const reading = this.reading();
    if (!reading) {
      return null;
    }
    const material = [reading.materialSubtype, reading.materialType]
      .filter((p): p is string => !!p)
      .join(' ');
    return [
      formatLabel(reading.format),
      material,
      reading.netWeightG != null ? `${reading.netWeightG} g` : '',
      reading.diameterMm != null ? `${reading.diameterMm} mm` : '',
    ]
      .filter((p) => p !== '')
      .join(' · ');
  });

  protected readonly swatch = computed(() => {
    const reading = this.reading();
    const hex = reading?.colors?.[0]?.replace('#', '');
    if (!reading || !hex || !/^[0-9a-fA-F]{6}/.test(hex)) {
      return null;
    }
    const alpha = reading.alpha != null ? reading.alpha : 255;
    const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16);
    return {
      color: `rgba(${channel(0)}, ${channel(2)}, ${channel(4)}, ${(alpha / 255).toFixed(3)})`,
      translucent: alpha < 255,
    };
  });

  private subscription: Subscription | null = this.tagReader
    .listen()
    .subscribe((read) => this.handleTag(read));
  private startedSubscription: Subscription | null =
    this.tagReader.readingStarted.subscribe(() => this.readingStarted());
  private resolution: Subscription | null = null;

  /** Where "Reading tag" came from, so the watchdog can go back there. */
  private readingFrom: { phase: Phase; error: string | null } | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // The sheet opens from a tap, so on iOS that tap also opens the phone's scan sheet.
    // Elsewhere this does nothing: the listener above reads on its own.
    void this.tagReader.scan();
    inject(DestroyRef).onDestroy(() => {
      this.stopListening();
      this.resolution?.unsubscribe();
      this.busy.destroy();
    });
  }

  protected scanAgain(): void {
    void this.tagReader.scan();
  }

  protected linkTo(row: SuggestionRow): void {
    const read = this.lastRead();
    if (!read || this.linkingId()) {
      return;
    }

    this.linkError.set(null);
    this.linkingId.set(row.filamentId);
    this.filamentService
      .addTagToFilament(row.filamentId, read.uid, this.reading())
      .subscribe({
        next: () => {
          this.loggingService.logEvent('MaterialsScan_Linked');
          this.sheetRef.dismiss({ kind: 'linked', id: row.filamentId });
        },
        error: (err: { status?: number }) => {
          const conflict = readTagUidConflict(err);
          this.loggingService.logEvent('MaterialsScan_LinkFailed', {
            status: err?.status ?? 0,
            conflict: conflict !== null,
          });
          this.linkingId.set(null);
          this.linkError.set(
            conflict
              ? tagUidConflictMessage(read.uid, conflict)
              : "The tag wasn't saved. Check your connection and try again."
          );
        },
      });
  }

  protected link(): void {
    this.loggingService.logEvent('MaterialsScan_LinkChosen');
    this.sheetRef.dismiss({
      kind: 'link',
      uid: this.unknownUid()!,
      reading: this.reading(),
    });
  }

  protected createNew(): void {
    this.loggingService.logEvent('MaterialsScan_NewChosen');
    this.sheetRef.dismiss({
      kind: 'new',
      uid: this.unknownUid()!,
      reading: this.reading(),
      catalogMatch: this.catalogMatch(),
    });
  }

  /** Posts the same read again: no new tap needed. */
  protected retry(): void {
    const read = this.lastRead();
    if (read) {
      this.resolve(read);
    }
  }

  protected cancel(): void {
    this.sheetRef.dismiss();
  }

  protected openNfcSettings(): void {
    void this.tagReader.openSettings();
  }

  /** True while the sheet shows an unknown tag and asks for it to be read again. */
  private awaitingReread(): boolean {
    return (
      this.phase() === 'unknown' &&
      this.hint() === 'hold-still' &&
      this.linkingId() === null
    );
  }

  private readingStarted(): void {
    const phase = this.phase();
    if (phase === 'reading') {
      this.armWatchdog();
      return;
    }
    if (phase !== 'waiting' && phase !== 'error' && !this.awaitingReread()) {
      return;
    }
    this.readingFrom = { phase, error: this.error() };
    this.error.set(null);
    this.setPhase('reading');
    this.armWatchdog();
  }

  private armWatchdog(): void {
    this.clearWatchdog();
    this.watchdog = setTimeout(() => {
      this.watchdog = null;
      const from = this.readingFrom;
      if (this.phase() !== 'reading' || !from) {
        return;
      }
      this.readingFrom = null;
      this.error.set(from.error);
      this.setPhase(from.phase);
    }, READING_WATCHDOG_MS);
  }

  private clearWatchdog(): void {
    if (this.watchdog !== null) {
      clearTimeout(this.watchdog);
      this.watchdog = null;
    }
  }

  private handleTag(read: TagRead): void {
    const phase = this.phase();
    if (
      phase !== 'waiting' &&
      phase !== 'reading' &&
      phase !== 'error' &&
      !this.awaitingReread()
    ) {
      // Dropped, so a later tap of this tag must not be swallowed as a repeat.
      this.tagReader.forget(read.uid);
      return;
    }
    this.resolve(read);
  }

  private resolve(read: TagRead): void {
    this.clearWatchdog();
    this.readingFrom = null;
    this.lastRead.set(read);
    this.error.set(null);
    this.setPhase('resolving');
    this.resolution?.unsubscribe();
    this.resolution = this.filamentService.resolveTagRead(read).subscribe({
      next: (response) => this.handleResponse(read, response),
      error: (err: { status?: number }) => {
        this.loggingService.logEvent('TagReader_LookupFailed', {
          status: err?.status ?? 0,
        });
        // A new tap of this tag must not be swallowed as a repeat.
        this.tagReader.forget(read.uid);
        this.error.set("Couldn't look up that tag. Check your connection.");
        this.setPhase('error');
      },
    });
  }

  private handleResponse(read: TagRead, response: TagReadResponse): void {
    this.loggingService.logEvent('TagReader_Lookup', {
      known: response.status === 'linked',
    });
    if (response.status === 'linked' && response.filament) {
      this.loggingService.logEvent('MaterialsScan_Known');
      this.sheetRef.dismiss({ kind: 'known', id: response.filament.id });
      return;
    }

    this.loggingService.logEvent('MaterialsScan_Unknown');
    const holdStill = response.hint === 'hold-still';
    if (holdStill) {
      // The read was cut short: keep listening for the same tag again. A phone still resting
      // on it keeps sliding the reader's repeat window, so let the next read through now.
      this.tagReader.forget(read.uid);
    } else {
      // The sheet stops at the first unknown tag. Letting go of the reader here also leaves it
      // to the picker that "Search all materials" opens next.
      this.stopListening();
    }
    this.reading.set(response.reading ?? null);
    this.catalogMatch.set(response.catalogMatch ?? null);
    this.hint.set(holdStill ? 'hold-still' : null);
    this.showClassicHint.set(
      read.classicUnsupported === true && this.firstClassicHint()
    );

    this.resolution = this.rowsFor(response.suggestions ?? []).subscribe(
      (rows) => {
        this.rows.set(rows);
        this.setPhase('unknown');
      }
    );
  }

  /**
   * The suggested spools with what the rows show. The list's own spools cover most; the rest
   * (another page, inactive) are fetched. The API caps suggestions at five.
   */
  private rowsFor(suggestions: TagSuggestion[]): Observable<SuggestionRow[]> {
    if (suggestions.length === 0) {
      return of([]);
    }
    return forkJoin(
      suggestions.map((s) => {
        const known = this.knownFilaments.get(s.filamentId);
        const filament$: Observable<FilamentSummary | null> = known
          ? of(known)
          : this.filamentService.getFilamentDetail(s.filamentId).pipe(
              map(filamentDetailToSummary),
              catchError(() => of(null))
            );
        return filament$.pipe(
          map(
            (filament): SuggestionRow => ({
              filamentId: s.filamentId,
              filament,
              reasons: (s.reasons ?? []).map(
                (r) => REASON_LABELS[r] ?? String(r)
              ),
            })
          )
        );
      })
    );
  }

  /** True the first time only; remembered in localStorage when the browser allows it. */
  private firstClassicHint(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    try {
      if (localStorage.getItem(CLASSIC_HINT_KEY) !== null) {
        return false;
      }
      localStorage.setItem(CLASSIC_HINT_KEY, '1');
    } catch {
      // Storage is blocked: show it, since it can't be remembered.
    }
    return true;
  }

  private setPhase(phase: Phase): void {
    const wasBusy = this.isBusy(this.phase());
    const nowBusy = this.isBusy(phase);
    if (nowBusy && !wasBusy) {
      this.busy.start();
    } else if (!nowBusy && wasBusy) {
      this.busy.stop();
    }
    this.phase.set(phase);
  }

  private isBusy(phase: Phase): boolean {
    return phase === 'reading' || phase === 'resolving';
  }

  private stopListening(): void {
    this.clearWatchdog();
    this.readingFrom = null;
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.startedSubscription?.unsubscribe();
    this.startedSubscription = null;
  }
}
