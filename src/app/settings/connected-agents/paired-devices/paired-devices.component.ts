import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { filter, finalize } from 'rxjs';
import {
  DeviceGrant,
  DeviceGrantsService,
} from 'src/app/core/services/device-grants.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { HumanizePipe } from 'src/app/shared/pipes/humanize.pipe';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { openSimpleDialog } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { describeDeviceScopes } from './device-scopes';

/**
 * `idle` until the first answer, so neither the empty state nor the heading flashes;
 * `unavailable` when the API has no device grants (404 from an older API, 503), which hides
 * the section.
 */
type Phase = 'idle' | 'ready' | 'error' | 'unavailable';

interface DeviceRow {
  grant: DeviceGrant;
  scopes: string;
}

/**
 * Devices paired with the account (printlog-bridge's `pair`, 3d-print-log-api#286), each with
 * a scoped device token. Revoking deletes the grant, and the device's next request fails.
 */
@Component({
  selector: 'app-paired-devices',
  templateUrl: './paired-devices.component.html',
  styleUrl: './paired-devices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    RouterLink,
    HumanizePipe,
    LocaleDatePipe,
    SkeletonComponent,
  ],
})
export class PairedDevicesComponent {
  private readonly deviceGrants = inject(DeviceGrantsService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly skeleton = new DeferredSkeletonController();

  protected readonly phase = signal<Phase>('idle');
  private readonly grants = signal<DeviceGrant[]>([]);

  protected readonly rows = computed<DeviceRow[]>(() =>
    this.grants().map((grant) => ({
      grant,
      scopes: describeDeviceScopes(grant.scopes),
    }))
  );
  protected readonly showSkeleton = computed(
    () => this.phase() === 'idle' && this.skeleton.visible()
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.skeleton.destroy());
    this.load();
  }

  protected load(): void {
    this.phase.set('idle');
    this.skeleton.start();
    this.deviceGrants
      .list()
      .pipe(
        finalize(() => this.skeleton.stop()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (grants) => {
          this.grants.set(grants);
          this.phase.set('ready');
        },
        error: (error: unknown) => {
          if (isUnavailable(error)) {
            // An API without device grants, or with pairing not deployed: nothing to show.
            this.phase.set('unavailable');
            return;
          }
          this.logging.logException(error as Error);
          this.phase.set('error');
        },
      });
  }

  protected confirmRevoke(grant: DeviceGrant): void {
    const dialogRef = openSimpleDialog(
      this.dialog,
      {
        // The title is text; the body is rendered as HTML, so the device's name stays out of it.
        title: `Revoke “${grant.name}”?`,
        body:
          '<p>It stops logging prints right away, and won’t log again until you pair it again ' +
          'with <code>printlog-bridge pair</code>.</p>' +
          '<p>Prints it finishes in the meantime wait on the bridge and are logged once it’s paired again.</p>',
        yesText: 'Revoke',
        yesColor: 'warn',
        noText: 'Cancel',
      },
      { maxWidth: '420px' }
    );

    dialogRef
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.revoke(grant));
  }

  private revoke(grant: DeviceGrant): void {
    // Optimistic: the row goes now and comes back if the API refuses.
    this.grants.update((list) => list.filter((g) => g.id !== grant.id));

    this.deviceGrants
      .revoke(grant.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.revoked(grant),
        error: (error: unknown) => {
          const status =
            error instanceof HttpErrorResponse ? error.status : undefined;
          if (status === 404) {
            // Already gone (revoked in another tab): the outcome the user asked for.
            this.revoked(grant);
            return;
          }
          this.grants.update((list) =>
            // The API lists newest first.
            [...list, grant].sort(
              (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
            )
          );
          this.toastr.error(
            `Couldn’t revoke “${grant.name}”. It is still paired; try again.`
          );
          this.logging.logEvent('ConnectedAgents_DeviceRevokeFailed', {
            status: status ?? 0,
          });
          this.logging.logException(error as Error);
        },
      });
  }

  private revoked(grant: DeviceGrant): void {
    this.logging.logEvent('ConnectedAgents_DeviceRevoked', {
      scopeCount: grant.scopes.length,
    });
  }
}

function isUnavailable(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    (error.status === 404 || error.status === 503)
  );
}
