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
import { Bridge } from 'src/app/core/services/bridges.service';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { bridgeLabel } from '../bridge-utils';

/** A key as this page computed it: the fingerprint of its own bytes, or why there is none. */
type KeyInfo =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'invalid' }
  | { status: 'ready'; fingerprint: string; short: string; full: string };

function keyInfo(publicKey: string | null): Observable<KeyInfo> {
  if (!publicKey) {
    return of({ status: 'none' as const });
  }
  if (!canSealCredentials()) {
    return of({ status: 'invalid' as const });
  }
  return from(importBridgeKey(publicKey)).pipe(
    map(({ fingerprint }) => ({
      status: 'ready' as const,
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
  imports: [MatButtonModule, MatIconModule, RouterLink, LocaleDatePipe],
})
export class BridgeKeyComponent {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly bridge = input.required<Bridge>();
  /** A confirmation is in flight. */
  readonly busy = input(false);
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
