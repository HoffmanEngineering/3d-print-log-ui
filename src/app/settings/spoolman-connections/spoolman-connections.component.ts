import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, catchError, filter, of, startWith, switchMap } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  SpoolmanConnection,
  SpoolmanConnectionService,
} from 'src/app/core/services/spoolman-connection.service';
import { HumanizePipe } from 'src/app/shared/pipes/humanize.pipe';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';

/** `idle` until the first answer, so nothing flashes; `error` offers a retry. */
type Phase = 'idle' | 'ready' | 'error';

/**
 * Every Spoolman connection the user has, across printers, with a way to revoke each (#282):
 * one place to find every token sitting in a `moonraker.conf`. Revoked connections are left
 * out, since their tokens no longer work.
 */
@Component({
  selector: 'app-spoolman-connections',
  templateUrl: './spoolman-connections.component.html',
  styleUrl: './spoolman-connections.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, RouterLink],
})
export class SpoolmanConnectionsComponent {
  private readonly spoolman = inject(SpoolmanConnectionService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly humanize = new HumanizePipe();

  protected readonly phase = signal<Phase>('idle');
  private readonly all = signal<SpoolmanConnection[]>([]);

  protected readonly connections = computed(() =>
    this.all().filter((c) => c.state !== 'revoked')
  );
  protected readonly anyPaused = computed(() =>
    this.connections().some((c) => c.state === 'disabled')
  );

  private readonly reload$ = new Subject<void>();

  constructor() {
    this.reload$
      .pipe(
        startWith(undefined),
        switchMap(() =>
          this.spoolman.getConnections().pipe(
            catchError((error) => {
              this.logging.logException(error);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe((list) => {
        if (list === null) {
          this.phase.set('error');
          return;
        }
        this.all.set(list);
        this.phase.set('ready');
      });
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected lastSeen(connection: SpoolmanConnection): string {
    return connection.lastSeenAt
      ? `Last seen ${this.humanize.transform(connection.lastSeenAt)}`
      : 'Never connected';
  }

  protected confirmRevoke(connection: SpoolmanConnection): void {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '400px',
      data: {},
    });
    dialogRef.componentInstance.title = 'Revoke this Spoolman connection?';
    // No printer name in the body: the body is rendered as HTML.
    dialogRef.componentInstance.body =
      '<p>Its token stops working at once, and the printer stops seeing your spools.</p>' +
      '<p>This can’t be undone. Connect the printer again for a new token.</p>';
    dialogRef.componentInstance.yesText = 'Revoke';
    dialogRef.componentInstance.yesColor = 'warn';
    dialogRef.componentInstance.noText = 'Cancel';

    dialogRef
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.spoolman.revoke(connection.id)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.toastr.success('Spoolman connection revoked.');
          this.logging.logEvent('SpoolmanConnections_Revoked', {
            state: connection.state,
          });
          this.reload();
        },
        error: (error) => {
          this.toastr.error('The connection could not be revoked.');
          this.logging.logException(error);
        },
      });
  }
}
