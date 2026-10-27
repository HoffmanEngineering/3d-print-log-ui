import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  Observable,
  catchError,
  distinctUntilChanged,
  from,
  map,
  of,
  switchMap,
} from 'rxjs';
import {
  canSealCredentials,
  groupedFingerprint,
  importBridgeKey,
  shortFingerprint,
} from 'src/app/core/crypto/credential-sealing';
import { BridgeKeyPinsService } from 'src/app/core/services/bridge-key-pins.service';
import { Bridge } from 'src/app/core/services/bridges.service';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { BridgeKeyChangedComponent } from '../bridge-key-changed/bridge-key-changed.component';
import { bridgeLabel } from '../bridge-utils';

/** A key as this page computed it: the fingerprint of its own bytes, or why there is none. */
type KeyInfo =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'invalid' }
  /** No WebCrypto here: an insecure context or a very old browser. */
  | { status: 'unavailable' }
  | {
      status: 'ready';
      /** The base64 key this was computed from. */
      source: string;
      fingerprint: string;
      short: string;
      full: string;
    };

function keyInfo(publicKey: string | null): Observable<KeyInfo> {
  if (!publicKey) {
    return of({ status: 'none' as const });
  }
  if (!canSealCredentials()) {
    return of({ status: 'unavailable' as const });
  }
  return from(importBridgeKey(publicKey)).pipe(
    map(({ fingerprint }) => ({
      status: 'ready' as const,
      source: publicKey,
      fingerprint,
      short: shortFingerprint(fingerprint),
      full: groupedFingerprint(fingerprint),
    })),
    catchError(() => of({ status: 'invalid' as const }))
  );
}

function ready(info: KeyInfo) {
  return info.status === 'ready' ? info : null;
}

/**
 * A bridge's encryption key on its card (printlog-bridge#100, story 14c): the fingerprint this
 * page computed from the key, or, when the bridge reported a new one, the comparison the owner
 * makes with the bridge before confirming it. Fingerprints are always computed here from the key
 * bytes; the API's own fingerprint fields are never shown or sent. The card's page posts the
 * confirmation.
 */
@Component({
  selector: 'app-bridge-key',
  templateUrl: './bridge-key.component.html',
  styleUrl: './bridge-key.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    RouterLink,
    LocaleDatePipe,
    BridgeKeyChangedComponent,
  ],
})
export class BridgeKeyComponent {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly pins = inject(BridgeKeyPinsService);

  readonly bridge = input.required<Bridge>();
  /** A confirmation is in flight. */
  readonly busy = input(false);
  /**
   * The last confirmation came back with a different key than the one confirmed: the key-changed
   * warning then says so.
   */
  readonly keyMismatch = input(false);
  /** Confirm the pending key: the fingerprint this page computed from `pendingPublicKey`. */
  readonly confirm = output<string>();

  protected readonly name = computed(() => bridgeLabel(this.bridge()));
  protected readonly throttled = computed(
    () => this.bridge().keyChangesThrottled === true
  );

  protected readonly current = this.computedKey(
    () => this.bridge().publicKey ?? null
  );
  protected readonly pending = this.computedKey(
    () => this.bridge().pendingPublicKey ?? null
  );

  /** The computed fingerprints, when the key imported. */
  protected readonly currentPrint = computed(() => ready(this.current()));
  protected readonly pendingPrint = computed(() => ready(this.pending()));

  /**
   * The served key's fingerprint when it isn't the one this browser last confirmed or sealed to
   * (and so didn't change through this browser's confirmation), else null. No pin: nothing to
   * compare.
   */
  protected readonly keyChanged = computed(() => {
    const current = this.currentPrint();
    // Only judge the key in hand once it is imported: right after a confirmation the bridge
    // already carries the new key while the old one's fingerprint is still on screen.
    if (!current || current.source !== (this.bridge().publicKey ?? null)) {
      return null;
    }
    const pinned = this.pins.pinned(this.bridge().id);
    return pinned && current.fingerprint !== pinned
      ? current.fingerprint
      : null;
  });

  protected readonly hasPending = computed(
    () => !!this.bridge().pendingPublicKey
  );

  protected confirmPending(): void {
    const pending = this.pending();
    if (pending.status === 'ready' && !this.busy()) {
      this.confirm.emit(pending.fingerprint);
    }
  }

  private computedKey(key: () => string | null) {
    return toSignal(
      toObservable(computed(key)).pipe(
        distinctUntilChanged(),
        switchMap((k) =>
          this.browser ? keyInfo(k) : of<KeyInfo>({ status: 'loading' })
        )
      ),
      { initialValue: { status: 'loading' } as KeyInfo }
    );
  }
}
