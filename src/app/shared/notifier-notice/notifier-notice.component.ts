import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import {
  catchError,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  switchMap,
} from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import {
  Connection,
  ConnectionService,
} from '../../core/services/connection.service';
import { LoggingService } from '../../core/services/logging.service';

/**
 * Suggests removing the Moonraker `[notifier]` section once the bridge logs the same printer
 * (#254). The API drops the notifier's events for such a printer so nothing is logged twice, and
 * raises `showNotifierNotice` on the connection; dismissing it is stored there too, so it stays
 * dismissed on every browser.
 */
@Component({
  selector: 'app-notifier-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, RouterLink],
  templateUrl: './notifier-notice.component.html',
  styleUrl: './notifier-notice.component.scss',
})
export class NotifierNoticeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly connectionService = inject(ConnectionService);
  private readonly logging = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The connections whose printer still has the notifier sending events. */
  protected readonly connections = signal<Connection[]>([]);
  protected readonly names = computed(() =>
    this.connections()
      .map((c) => c.displayName)
      .join(', ')
  );

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.auth.userProfile$
      .pipe(
        map((user) => !!user),
        distinctUntilChanged(),
        switchMap((signedIn) =>
          signedIn
            ? this.connectionService.getConnections().pipe(
                catchError((error) => {
                  // Unknown is not "dropping": better to miss one visit than to nag.
                  this.logging.logException(error);
                  return of([] as Connection[]);
                })
              )
            : of([] as Connection[])
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((connections) =>
        this.connections.set(connections.filter((c) => c.showNotifierNotice))
      );
  }

  dismiss(): void {
    const dismissed = this.connections();
    this.connections.set([]);
    this.logging.logEvent('NotifierNotice_Dismissed', {
      connections: dismissed.length,
    });
    forkJoin(
      dismissed.map((c) =>
        this.connectionService.dismissNotifierNotice(c.instanceId).pipe(
          catchError((error) => {
            this.logging.logException(error);
            return of(undefined);
          })
        )
      )
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
}
