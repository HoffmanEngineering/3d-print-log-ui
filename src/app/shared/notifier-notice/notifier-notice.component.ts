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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import {
  Connection,
  ConnectionService,
} from '../../core/services/connection.service';
import { LoggingService } from '../../core/services/logging.service';

/**
 * The connection kinds with an older integration the API drops events from once the bridge logs
 * the same printer: the Moonraker `[notifier]` (#254) and OctoPrint's Webhooks plugin (#385,
 * api#292). Any other kind has nothing for the user to turn off, so it gets no notice.
 */
const NOTICE_KINDS: ReadonlySet<string> = new Set(['moonraker', 'octoprint']);

/**
 * Suggests turning off the older integration once the bridge logs the same printer: the Moonraker
 * `[notifier]` section, or the 3D Print Log hook in OctoPrint's Webhooks plugin. The API drops
 * that integration's events for such a printer so nothing is logged twice, and raises
 * `showNotifierNotice` on the bridge's connection; dismissing it is stored there too, so it stays
 * dismissed on every browser. Each kind is worded for its own printers, under one dismiss button.
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
  private readonly signedIn$ = toObservable(
    computed(() => !!this.auth.userProfile())
  );

  /** The connections whose printer still has the notifier or the webhook sending events. */
  protected readonly connections = signal<Connection[]>([]);
  protected readonly moonrakerNames = computed(() => this.namesOf('moonraker'));
  protected readonly octoprintNames = computed(() => this.namesOf('octoprint'));

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.signedIn$
      .pipe(
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
        this.connections.set(
          connections.filter(
            (c) => c.showNotifierNotice && NOTICE_KINDS.has(c.kind)
          )
        )
      );
  }

  private namesOf(kind: string): string {
    return this.connections()
      .filter((c) => c.kind === kind)
      .map((c) => c.displayName)
      .join(', ');
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
