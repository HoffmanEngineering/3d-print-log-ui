import { Clipboard } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  Observable,
  Subject,
  catchError,
  filter,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterCategory } from 'src/app/core/services/printer-categories.service';
import {
  SpoolmanConnection,
  SpoolmanConnectionCreated,
  SpoolmanConnectionLimit,
  SpoolmanConnectionService,
  spoolmanConnectionLimit,
} from 'src/app/core/services/spoolman-connection.service';
import { HumanizePipe } from 'src/app/shared/pipes/humanize.pipe';
import { openSimpleDialog } from 'src/app/shared/simple-dialog/simple-dialog.component';

/** The two printer categories that extrude filament, which is all Spoolman tracks. */
const FDM_CATEGORIES = new Set(['FFF', 'FDM']);

export function isFdmCategory(
  category: PrinterCategory | null | undefined
): boolean {
  return category != null && FDM_CATEGORIES.has(category.nickname);
}

/** `idle` until the first answer, so nothing flashes; `error` offers a retry. */
type Phase = 'idle' | 'ready' | 'error';

/**
 * Connects one printer's Moonraker to 3D Print Log through its built-in `[spoolman]`
 * component (#282). Sits next to the printlog-bridge connections on the printer page.
 *
 * The secret comes back once, from the POST, and lives only in {@link created}: nothing
 * stores it and the list endpoint never returns it. Once it is dismissed or the page is left
 * it is gone, and the only way to a new one is Reconnect, which revokes the old secret.
 */
@Component({
  selector: 'app-printer-spoolman',
  templateUrl: './printer-spoolman.component.html',
  styleUrls: ['./printer-spoolman.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, RouterLink],
})
export class PrinterSpoolmanComponent {
  private readonly spoolman = inject(SpoolmanConnectionService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);
  private readonly clipboard = inject(Clipboard);
  private readonly destroyRef = inject(DestroyRef);
  private readonly humanize = new HumanizePipe();

  readonly printerId = input.required<number>();
  readonly category = input<PrinterCategory | null>(null);
  readonly make = input<string | null>(null);
  readonly model = input<string | null>(null);

  protected readonly docsLink = '/docs/klipper-spoolman';

  /** Only FDM printers: the panel renders nothing, and asks for nothing, otherwise. */
  protected readonly enabled = computed(() => isFdmCategory(this.category()));

  /** Snapmaker's U1 waits on a hardware test, so it gets a note before the button. */
  protected readonly isSnapmakerU1 = computed(
    () =>
      /snapmaker/i.test(this.make() ?? '') && /\bu1\b/i.test(this.model() ?? '')
  );

  protected readonly phase = signal<Phase>('idle');
  private readonly connections = signal<SpoolmanConnection[]>([]);

  /** This printer's newest connection that works or is paused. Revoked ones are history. */
  protected readonly current = computed(
    () =>
      this.connections().find(
        (c) => c.printerId === this.printerId() && c.state !== 'revoked'
      ) ?? null
  );

  /** The block from the last connect, shown until dismissed and never again. */
  protected readonly created = signal<SpoolmanConnectionCreated | null>(null);
  protected readonly limit = signal<SpoolmanConnectionLimit | null>(null);
  protected readonly busy = signal(false);

  protected readonly status = computed(() => {
    const seen = this.current()?.lastSeenAt;
    return seen
      ? `Connected · last seen ${this.humanize.transform(seen)}`
      : 'Never connected';
  });

  private readonly reload$ = new Subject<void>();

  constructor() {
    toObservable(computed(() => (this.enabled() ? this.printerId() : null)))
      .pipe(
        filter((id): id is number => id != null),
        switchMap(() =>
          this.reload$.pipe(
            startWith(undefined),
            switchMap(() => this.fetch())
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe((list) => {
        if (list === null) {
          this.phase.set('error');
          return;
        }
        this.connections.set(list);
        this.phase.set('ready');
      });
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected connect(): void {
    this.limit.set(null);
    const existing = this.current();
    if (!existing) {
      this.submitConnect(false);
      return;
    }
    this.confirm(
      'Reconnect Spoolman?',
      '<p>This makes a new <code>[spoolman]</code> block and the one on the printer stops ' +
        'working. Paste the new block into <code>moonraker.conf</code> to reconnect.</p>',
      'Reconnect',
      'primary'
    ).subscribe(() => this.submitConnect(true));
  }

  protected disconnect(): void {
    const connection = this.current();
    if (!connection) {
      return;
    }
    this.confirm(
      'Disconnect Spoolman?',
      '<p>The printer stops seeing your spools in Mainsail, Fluidd and KlipperScreen, ' +
        'at once. This can’t be undone, but you can connect it again for a new block.</p>',
      'Disconnect',
      'warn'
    )
      .pipe(
        switchMap(() => this.spoolman.revoke(connection.id)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.created.set(null);
          this.toastr.success('Spoolman disconnected.');
          this.logging.logEvent('PrinterSpoolman_Disconnected', {
            state: connection.state,
          });
          this.reload();
        },
        error: (error) => {
          this.toastr.error('Spoolman could not be disconnected.');
          this.logging.logException(error);
        },
      });
  }

  protected copy(block: string): void {
    if (this.clipboard.copy(block)) {
      this.toastr.success('Copied to the clipboard.');
    } else {
      this.toastr.error('Could not copy. Select the block and copy it.');
    }
    this.logging.logEvent('PrinterSpoolman_Copied', {});
  }

  protected dismissBlock(): void {
    this.created.set(null);
  }

  private submitConnect(reconnect: boolean): void {
    this.busy.set(true);
    this.spoolman
      .connect(this.printerId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.busy.set(false);
          this.created.set(created);
          // The new connection replaces this printer's previous one, which the API revoked.
          const connection = withoutSecret(created);
          this.connections.update((list) => [
            connection,
            ...list.filter((c) => c.printerId !== connection.printerId),
          ]);
          this.logging.logEvent('PrinterSpoolman_Connected', { reconnect });
        },
        error: (error) => {
          this.busy.set(false);
          const limit = spoolmanConnectionLimit(error);
          if (limit) {
            this.limit.set(limit);
            this.logging.logEvent('PrinterSpoolman_LimitReached', {
              limit: limit.limit,
            });
            return;
          }
          this.toastr.error('Spoolman could not be connected.');
          this.logging.logException(error);
        },
      });
  }

  private fetch(): Observable<SpoolmanConnection[] | null> {
    return this.spoolman.getConnections().pipe(
      catchError((error) => {
        this.logging.logException(error);
        return of(null);
      })
    );
  }

  /** Emits once if the user confirms, and completes without emitting otherwise. */
  private confirm(
    title: string,
    body: string,
    yesText: string,
    yesColor: string
  ): Observable<void> {
    const dialogRef = openSimpleDialog(
      this.dialog,
      { title, body, yesText, yesColor, noText: 'Cancel' },
      { maxWidth: '400px' }
    );
    return dialogRef.afterClosed().pipe(
      filter((confirmed) => confirmed === true),
      map(() => undefined)
    );
  }
}

/** The connection as the list would return it: the secret stays only in `created`. */
function withoutSecret(created: SpoolmanConnectionCreated): SpoolmanConnection {
  const {
    id,
    printerId,
    printerName,
    name,
    createdDate,
    lastSeenAt,
    state,
    disabledReason,
    disabledAt,
    revokedAt,
  } = created;
  return {
    id,
    printerId,
    printerName,
    name,
    createdDate,
    lastSeenAt,
    state,
    disabledReason,
    disabledAt,
    revokedAt,
  };
}
