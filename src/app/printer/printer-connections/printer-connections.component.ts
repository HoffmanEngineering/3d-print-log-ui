import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { catchError, filter, of, switchMap } from 'rxjs';
import {
  Connection,
  ConnectionService,
  ConnectionStatus,
} from 'src/app/core/services/connection.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { externalSourceLabel } from 'src/app/shared/utils/external-source.utils';

/**
 * The connectors (the bridge, for now) logging prints for one printer (#252): what each one is,
 * whether it is still sending heartbeats, and a way to remove it. Renders nothing for a printer
 * with no connections, which is every printer until the bridge ships.
 */
@Component({
  selector: 'app-printer-connections',
  templateUrl: './printer-connections.component.html',
  styleUrls: ['./printer-connections.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, LocaleDatePipe],
})
export class PrinterConnectionsComponent {
  private readonly connectionService = inject(ConnectionService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);

  printerId = input.required<number>();

  protected readonly connections = signal<Connection[]>([]);
  protected readonly ConnectionStatus = ConnectionStatus;
  protected readonly kindLabel = externalSourceLabel;

  constructor() {
    toObservable(this.printerId)
      .pipe(
        filter((id) => id != null),
        switchMap((id) =>
          this.connectionService.getConnections(id).pipe(
            catchError((error) => {
              // The printer form is what this page is for; a failed lookup just hides the panel.
              this.logging.logException(error);
              return of([] as Connection[]);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe((connections) => this.connections.set(connections));
  }

  protected confirmDelete(connection: Connection): void {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '400px',
      data: {},
    });
    dialogRef.componentInstance.title = 'Remove this connection?';
    // No display name in the body: it is set by the agent and the body is rendered as HTML.
    dialogRef.componentInstance.body =
      '<p>It stops logging prints for this printer.</p>' +
      '<p>The prints it already logged are kept.</p>';
    dialogRef.componentInstance.yesText = 'Remove';
    dialogRef.componentInstance.yesColor = 'warn';
    dialogRef.componentInstance.noText = 'Cancel';

    dialogRef
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() =>
          this.connectionService.deleteConnection(connection.instanceId)
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.connections.update((list) =>
            list.filter((c) => c.instanceId !== connection.instanceId)
          );
          this.toastr.success('Connection removed. Its prints are kept.');
          this.logging.logEvent('PrinterConnections_Deleted', {
            kind: connection.kind,
            status: connection.status,
          });
        },
        error: (error) => {
          this.toastr.error('The connection could not be removed.');
          this.logging.logException(error);
        },
      });
  }
}
