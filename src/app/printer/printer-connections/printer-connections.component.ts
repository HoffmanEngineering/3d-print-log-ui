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
import { catchError, filter, of, switchMap } from 'rxjs';
import {
  Connection,
  ConnectionService,
  ConnectionStatus,
} from 'src/app/core/services/connection.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterCategory } from 'src/app/core/services/printer-categories.service';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { openSimpleDialog } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { externalSourceLabel } from 'src/app/shared/utils/external-source.utils';
import { isFdmCategory } from '../printer-spoolman/printer-spoolman.component';
import {
  BRIDGE_SETUPS,
  BridgeSetupKind,
  bridgeConfigSnippet,
  bridgeKindForMake,
} from './bridge-setup';
import { connectionSoftware } from './connection-software';

/**
 * The connectors (the bridge, for now) logging prints for one printer (#252): what each one is,
 * whether it is still sending heartbeats, whether a newer release of it is out (printlog-bridge#39),
 * what the printer runs, and a way to remove it.
 *
 * A filament printer with no connections gets a way to set one up instead (printlog-bridge#82):
 * pick the printer type (Klipper, Bambu Lab, PrusaLink), see its steps and a config section with
 * this printer's id. Anything else with no connections renders nothing.
 */
@Component({
  selector: 'app-printer-connections',
  templateUrl: './printer-connections.component.html',
  styleUrls: ['./printer-connections.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, RouterLink, LocaleDatePipe],
})
export class PrinterConnectionsComponent {
  private readonly connectionService = inject(ConnectionService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clipboard = inject(Clipboard);

  readonly printerId = input.required<number>();
  /** The saved printer's category: only filament printers are offered the bridge. */
  readonly category = input<PrinterCategory | null>(null);
  /** The saved printer's make, to start the setup on the matching printer type. */
  readonly make = input<string | null>(null);

  protected readonly connections = signal<Connection[]>([]);
  /** False until the list loads, so the setup offer never flashes before the rows. */
  private readonly loaded = signal(false);
  protected readonly ConnectionStatus = ConnectionStatus;
  protected readonly kindLabel = externalSourceLabel;
  protected readonly software = connectionSoftware;

  protected readonly setups = BRIDGE_SETUPS;
  protected readonly offerSetup = computed(
    () =>
      this.loaded() &&
      this.connections().length === 0 &&
      isFdmCategory(this.category())
  );
  protected readonly setupOpen = signal(false);
  /** The type the user picked, or null to follow the printer's make. */
  private readonly pickedKind = signal<BridgeSetupKind | null>(null);
  protected readonly setupKind = computed(
    () => this.pickedKind() ?? bridgeKindForMake(this.make())
  );
  protected readonly setupGuide = computed(
    () => BRIDGE_SETUPS.find((s) => s.kind === this.setupKind())!.guide
  );
  protected readonly setupSnippet = computed(() =>
    bridgeConfigSnippet(this.setupKind(), this.printerId())
  );

  constructor() {
    toObservable(this.printerId)
      .pipe(
        filter((id) => id != null),
        switchMap((id) =>
          this.connectionService.getConnections(id).pipe(
            catchError((error) => {
              // The printer form is what this page is for; a failed lookup just hides the panel.
              this.logging.logException(error);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe((connections) => {
        this.connections.set(connections ?? []);
        this.loaded.set(connections !== null);
      });
  }

  protected openSetup(): void {
    this.setupOpen.set(true);
    this.logging.logEvent('PrinterConnections_SetupOpened', {
      kind: this.setupKind(),
    });
  }

  protected pickKind(kind: BridgeSetupKind): void {
    this.pickedKind.set(kind);
  }

  protected copySetup(): void {
    if (this.clipboard.copy(this.setupSnippet())) {
      this.toastr.success('Copied to the clipboard.');
    } else {
      this.toastr.error('Could not copy. Select the section and copy it.');
    }
    this.logging.logEvent('PrinterConnections_SetupCopied', {
      kind: this.setupKind(),
    });
  }

  protected confirmDelete(connection: Connection): void {
    const dialogRef = openSimpleDialog(
      this.dialog,
      {
        title: 'Remove this connection?',
        // No display name in the body: it is set by the agent and the body is rendered as HTML.
        body:
          '<p>It stops logging prints for this printer.</p>' +
          '<p>The prints it already logged are kept.</p>',
        yesText: 'Remove',
        yesColor: 'warn',
        noText: 'Cancel',
      },
      { maxWidth: '400px' }
    );

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
