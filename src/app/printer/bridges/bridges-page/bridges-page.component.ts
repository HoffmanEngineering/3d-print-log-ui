import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  InjectionToken,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  finalize,
  forkJoin,
  from,
  map,
  of,
  switchMap,
} from 'rxjs';
import {
  Bridge,
  BridgePrinter,
  BridgesService,
  DiscoveredPrinter,
  DiscoveredPrinterState,
} from 'src/app/core/services/bridges.service';
import { importBridgeKey } from 'src/app/core/crypto/credential-sealing';
import { BridgeKeyPinsService } from 'src/app/core/services/bridge-key-pins.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { openSimpleDialog } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import {
  BridgeCardComponent,
  BridgeRename,
} from '../bridge-card/bridge-card.component';
import { openBridgeConnectDialog } from '../bridge-connect-dialog/bridge-connect-dialog.component';
import {
  bridgeErrorCode,
  bridgeErrorMessage,
  bridgeLabel,
  isScanning,
} from '../bridge-utils';

/** How often the screen refreshes while open and visible; 0 turns polling off. */
export interface BridgesPolling {
  idleMs: number;
  /** While a bridge is scanning, so its results show soon after the sweep. */
  scanningMs: number;
}

export const BRIDGES_POLLING = new InjectionToken<BridgesPolling>(
  'BRIDGES_POLLING',
  { factory: () => ({ idleMs: 60_000, scanningMs: 10_000 }) }
);

/**
 * `idle` until the first answer, so the empty state never flashes; `unavailable` for an API
 * without the Bridges endpoints (404 or 503).
 */
type Phase = 'idle' | 'ready' | 'error' | 'unavailable';

interface BridgeState {
  bridge: Bridge;
  /** Null when its request failed. */
  discovered: DiscoveredPrinter[] | null;
  printers: BridgePrinter[] | null;
}

/**
 * The Bridges screen (printlog-bridge#100, #103): every paired printlog-bridge, what it found on
 * its network, and the printers connected to it. Nothing found is ever connected by itself.
 */
@Component({
  selector: 'app-bridges-page',
  templateUrl: './bridges-page.component.html',
  styleUrl: './bridges-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    RouterLink,
    SkeletonComponent,
    BridgeCardComponent,
  ],
})
export class BridgesPageComponent {
  private readonly service = inject(BridgesService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly polling = inject(BRIDGES_POLLING);
  private readonly pins = inject(BridgeKeyPinsService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly skeleton = new DeferredSkeletonController();
  private readonly reload$ = new Subject<void>();
  private pollHandle: ReturnType<typeof setTimeout> | null = null;
  private viewed = false;

  protected readonly phase = signal<Phase>('idle');
  protected readonly states = signal<BridgeState[]>([]);
  /** The bridge whose new key is being confirmed. */
  protected readonly confirming = signal<number | null>(null);
  /**
   * Bridges whose last confirmation came back with a different key than the one confirmed. Kept
   * for this page only, so the card says so after the toast is gone.
   */
  protected readonly mismatched = signal<ReadonlySet<number>>(new Set());
  protected readonly showSkeleton = computed(
    () => this.phase() === 'idle' && this.skeleton.visible()
  );
  /** Printers connected from the app on any bridge: printer id to bridge id. */
  private readonly watchedBy = computed(() => {
    const map = new Map<number, number>();
    for (const s of this.states()) {
      for (const p of s.printers ?? []) {
        map.set(p.printerId, s.bridge.id);
      }
    }
    return map;
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.skeleton.destroy();
      this.stopPolling();
    });
    this.reload$
      .pipe(
        switchMap(() =>
          this.fetchAll().pipe(
            map((states) => ({ states, error: null as unknown })),
            catchError((error: unknown) => of({ states: null, error }))
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(({ states, error }) => {
        this.skeleton.stop();
        if (states) {
          this.states.set(states);
          this.phase.set('ready');
          if (!this.viewed) {
            this.viewed = true;
            this.logging.logEvent('Bridges_Viewed', { count: states.length });
          }
        } else if (isUnavailable(error)) {
          this.phase.set('unavailable');
          return;
        } else if (this.phase() !== 'ready') {
          // A failed refresh keeps what is on screen; only a failed first load says so.
          this.phase.set('error');
          this.logging.logException(error as Error);
        }
        this.schedulePoll();
      });
    this.load();
  }

  protected load(): void {
    if (this.phase() !== 'ready') {
      this.phase.set('idle');
      this.skeleton.start();
    }
    this.reload$.next();
  }

  private fetchAll(): Observable<BridgeState[]> {
    return this.service
      .list()
      .pipe(
        switchMap((bridges) =>
          bridges.length === 0
            ? of([])
            : forkJoin(bridges.map((b) => this.fetchOne(b)))
        )
      );
  }

  private fetchOne(bridge: Bridge): Observable<BridgeState> {
    return forkJoin({
      discovered: this.service
        .discovered(bridge.id)
        .pipe(catchError(() => of(null))),
      printers: this.service
        .printers(bridge.id)
        .pipe(catchError(() => of(null))),
    }).pipe(map((parts) => ({ bridge, ...parts })));
  }

  private schedulePoll(): void {
    this.stopPolling();
    const scanning = this.states().some((s) => isScanning(s.bridge));
    const delay = scanning ? this.polling.scanningMs : this.polling.idleMs;
    if (!this.browser || delay <= 0 || this.phase() !== 'ready') {
      return;
    }
    this.pollHandle = setTimeout(() => {
      this.pollHandle = null;
      if (document.visibilityState === 'hidden') {
        this.schedulePoll();
      } else {
        this.reload$.next();
      }
    }, delay);
  }

  private stopPolling(): void {
    if (this.pollHandle !== null) {
      clearTimeout(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private nameOf(bridgeId: number): string | null {
    const s = this.states().find((x) => x.bridge.id === bridgeId);
    return s ? bridgeLabel(s.bridge) : null;
  }

  private replaceBridge(bridge: Bridge): void {
    this.states.update((list) =>
      list.map((s) => (s.bridge.id === bridge.id ? { ...s, bridge } : s))
    );
  }

  private failed(action: string, error: unknown): void {
    this.toastr.error(bridgeErrorMessage(error, (id) => this.nameOf(id)));
    this.logging.logEvent('Bridges_ActionFailed', {
      action,
      code: bridgeErrorCode(error) ?? 'unknown',
    });
  }

  protected rename(bridge: Bridge, change: BridgeRename): void {
    this.service
      .update(bridge.id, { name: change.name, location: change.location })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.replaceBridge(updated);
          this.logging.logEvent('Bridges_Renamed', {
            hasName: change.name !== '',
            hasLocation: change.location !== '',
          });
        },
        error: (error: unknown) => this.failed('rename', error),
      });
  }

  protected scan(bridge: Bridge): void {
    this.service
      .scan(bridge.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ scanRequestedAt }) => {
          this.replaceBridge({ ...this.current(bridge), scanRequestedAt });
          this.logging.logEvent('Bridges_ScanRequested', {});
          this.schedulePoll();
        },
        error: (error: unknown) => this.failed('scan', error),
      });
  }

  protected connect(bridge: Bridge, found: DiscoveredPrinter | null): void {
    openBridgeConnectDialog(this.dialog, {
      bridge: this.current(bridge),
      discovered: found,
      bridges: this.states().map((s) => s.bridge),
      watchedBy: this.watchedBy(),
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  protected ignore(bridge: Bridge, found: DiscoveredPrinter): void {
    this.setState(bridge, found, DiscoveredPrinterState.Ignored);
    this.service
      .ignore(bridge.id, found.id)
      .pipe(
        finalize(() => this.load()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () =>
          this.logging.logEvent('Bridges_PrinterIgnored', { kind: found.kind }),
        error: (error: unknown) => this.failed('ignore', error),
      });
  }

  protected unignore(bridge: Bridge, found: DiscoveredPrinter): void {
    this.setState(bridge, found, DiscoveredPrinterState.New);
    this.service
      .unignore(bridge.id, found.id)
      .pipe(
        finalize(() => this.load()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () =>
          this.logging.logEvent('Bridges_PrinterUnignored', {
            kind: found.kind,
          }),
        error: (error: unknown) => this.failed('unignore', error),
      });
  }

  protected confirmDisconnect(bridge: Bridge, entry: BridgePrinter): void {
    openSimpleDialog(
      this.dialog,
      {
        // The title is text; the body is HTML, so names stay out of it.
        title: `Disconnect ${entry.printerName || 'this printer'}?`,
        body:
          '<p>The bridge stops watching it within a minute.</p>' +
          '<p>The prints it logged are kept. You can connect it again at any time.</p>',
        yesText: 'Disconnect',
        yesColor: 'warn',
        noText: 'Cancel',
      },
      { maxWidth: '420px' }
    )
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.service.disconnect(bridge.id, entry.id)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.toastr.success('Disconnected. Its prints are kept.');
          this.logging.logEvent('Bridges_PrinterDisconnected', {
            kind: entry.kind,
          });
          this.load();
        },
        error: (error: unknown) => {
          const status =
            error instanceof HttpErrorResponse ? error.status : undefined;
          if (status !== 404) {
            this.failed('disconnect', error);
          }
          this.load();
        },
      });
  }

  /**
   * Confirms a bridge's pending key. `fingerprint` is what the card computed from
   * `pendingPublicKey` and showed the user, never the API's `pendingPublicKeyFingerprint`.
   */
  protected confirmKey(bridge: Bridge, fingerprint: string): void {
    if (this.confirming() !== null) {
      return;
    }
    const before = this.current(bridge);
    const hadKey = !!before.publicKey;
    this.confirming.set(bridge.id);
    this.service
      .confirmKey(bridge.id, fingerprint)
      .pipe(
        // Check the key that came back is the one the user compared, from its own bytes.
        switchMap((updated) =>
          from(servedFingerprint(updated)).pipe(
            map((served) => ({ updated, served }))
          )
        ),
        finalize(() => this.confirming.set(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ updated, served }) => {
          // The user compared this fingerprint with the bridge: it is the one to trust here.
          this.pins.pin(bridge.id, fingerprint);
          this.mismatched.update((ids) => {
            const next = new Set(ids);
            if (served === fingerprint) {
              next.delete(bridge.id);
            } else {
              next.add(bridge.id);
            }
            return next;
          });
          if (served !== fingerprint) {
            this.toastr.error(
              "3D Print Log returned a different key than the one you confirmed. Don't enter any credentials: compare the key on the card with printlog-bridge status."
            );
            this.logging.logEvent('Bridges_KeyConfirmMismatch', {});
            this.load();
            return;
          }
          this.replaceBridge(updated);
          this.toastr.success(
            hadKey
              ? "New key confirmed. Enter the printers' credentials again: the bridge can't read the old ones."
              : 'Key confirmed. You can enter printer credentials in the app now.'
          );
          this.logging.logEvent('Bridges_KeyConfirmed', {
            hadKey,
            throttled: before.keyChangesThrottled === true,
          });
          this.load();
        },
        error: (error: unknown) => {
          this.failed('confirm-key', error);
          // The pending key moved or went away: show what the bridge has now, to compare again.
          this.load();
        },
      });
  }

  /** An entry after a credential changed, so its row shows the new state before the next poll. */
  protected replaceEntry(bridge: Bridge, entry: BridgePrinter): void {
    this.states.update((list) =>
      list.map((s) =>
        s.bridge.id !== bridge.id || !s.printers
          ? s
          : {
              ...s,
              printers: s.printers.map((p) => (p.id === entry.id ? entry : p)),
            }
      )
    );
  }

  /** The bridge as it is now, after any local change (a scan request). */
  private current(bridge: Bridge): Bridge {
    return (
      this.states().find((s) => s.bridge.id === bridge.id)?.bridge ?? bridge
    );
  }

  private setState(
    bridge: Bridge,
    found: DiscoveredPrinter,
    state: DiscoveredPrinterState
  ): void {
    this.states.update((list) =>
      list.map((s) =>
        s.bridge.id !== bridge.id || !s.discovered
          ? s
          : {
              ...s,
              discovered: s.discovered.map((d) =>
                d.id === found.id ? { ...d, state } : d
              ),
            }
      )
    );
  }
}

/** The fingerprint of the key a bridge now serves, computed here, or null when it has none. */
async function servedFingerprint(bridge: Bridge): Promise<string | null> {
  if (!bridge.publicKey) {
    return null;
  }
  try {
    return (await importBridgeKey(bridge.publicKey)).fingerprint;
  } catch {
    return null;
  }
}

function isUnavailable(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    (error.status === 404 || error.status === 503)
  );
}
