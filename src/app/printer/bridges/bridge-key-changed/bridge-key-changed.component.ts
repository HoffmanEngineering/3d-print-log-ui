import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  groupedFingerprint,
  shortFingerprint,
} from 'src/app/core/crypto/credential-sealing';
import { BridgeKeyPinsService } from 'src/app/core/services/bridge-key-pins.service';
import { LoggingService } from 'src/app/core/services/logging.service';

/**
 * The warning shown when the key the API serves for a bridge isn't the one this browser last
 * confirmed or sealed to, and it didn't change through this browser's confirmation. "It matches"
 * pins the current key after the user compared it with the bridge. Both fingerprints are computed
 * in the browser: `fingerprint` from the served key, the old one from the pin.
 */
@Component({
  selector: 'app-bridge-key-changed',
  templateUrl: './bridge-key-changed.component.html',
  styleUrl: './bridge-key-changed.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
})
export class BridgeKeyChangedComponent {
  private readonly pins = inject(BridgeKeyPinsService);
  private readonly logging = inject(LoggingService);

  readonly bridgeId = input.required<number>();
  /** The served key's fingerprint, computed from its bytes. */
  readonly fingerprint = input.required<string>();
  /** Where it is shown, for analytics. */
  readonly context = input.required<'card' | 'bridges' | 'connect'>();

  protected readonly short = computed(() =>
    shortFingerprint(this.fingerprint())
  );
  protected readonly full = computed(() =>
    groupedFingerprint(this.fingerprint())
  );
  protected readonly previous = computed(() => {
    const pin = this.pins.pinned(this.bridgeId());
    return pin ? shortFingerprint(pin) : null;
  });

  protected accept(): void {
    this.pins.pin(this.bridgeId(), this.fingerprint());
    this.logging.logEvent('Bridges_KeyAccepted', { context: this.context() });
  }
}
