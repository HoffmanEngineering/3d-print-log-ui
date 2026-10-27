import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import {
  Bridge,
  BridgePrinter,
  DiscoveredPrinter,
  DiscoveredPrinterState,
} from 'src/app/core/services/bridges.service';
import { ConnectionStatus } from 'src/app/core/services/connection.service';
import { HumanizePipe } from 'src/app/shared/pipes/humanize.pipe';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { externalSourceLabel } from 'src/app/shared/utils/external-source.utils';
import {
  appPrinterSnippet,
  bridgeLabel,
  formatAddress,
  isConnectableKind,
  isScanning,
} from '../bridge-utils';

/** A printer connected from the app, with what the bridge found for it. */
interface ConnectedRow {
  entry: BridgePrinter;
  /** What the bridge reports for it, when it found it. */
  found: DiscoveredPrinter | null;
  /** The bridge's config file has it too, and wins. */
  inConfigToo: boolean;
  address: string;
  snippet: string | null;
}

/** A printer the bridge found, for display. */
interface FoundRow {
  printer: DiscoveredPrinter;
  title: string;
  address: string;
  connectable: boolean;
  /** For a config-file printer: the app entry that matches it too. */
  entry: BridgePrinter | null;
}

export interface BridgeRename {
  name: string;
  location: string;
}

/**
 * One bridge on the Bridges screen: what it is and how it's doing, the printers connected to it
 * from the app, and what it found on its network. It only displays and asks; the page does
 * the requests and passes the new data back in.
 */
@Component({
  selector: 'app-bridge-card',
  templateUrl: './bridge-card.component.html',
  styleUrl: './bridge-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RouterLink,
    HumanizePipe,
    LocaleDatePipe,
  ],
})
export class BridgeCardComponent {
  readonly bridge = input.required<Bridge>();
  /** Null when they couldn't be loaded. */
  readonly discovered = input<DiscoveredPrinter[] | null>([]);
  /** Null when they couldn't be loaded. */
  readonly printers = input<BridgePrinter[] | null>([]);

  readonly rename = output<BridgeRename>();
  readonly scan = output<void>();
  /** A found printer, or null to add one by address. */
  readonly connect = output<DiscoveredPrinter | null>();
  readonly ignore = output<DiscoveredPrinter>();
  readonly unignore = output<DiscoveredPrinter>();
  readonly disconnect = output<BridgePrinter>();
  readonly retry = output<void>();

  protected readonly kindLabel = externalSourceLabel;
  protected readonly ConnectionStatus = ConnectionStatus;

  protected readonly name = computed(() => bridgeLabel(this.bridge()));
  protected readonly stale = computed(
    () => this.bridge().status === ConnectionStatus.Stale
  );
  protected readonly scanning = computed(() => isScanning(this.bridge()));
  protected readonly loadFailed = computed(
    () => this.discovered() === null || this.printers() === null
  );
  protected readonly modeLabel = computed(() => {
    switch (this.bridge().mode) {
      case 'remote':
        return 'Remote mode';
      case 'local':
        return 'Local mode';
      default:
        return this.bridge().mode;
    }
  });

  protected readonly connected = computed<ConnectedRow[]>(() => {
    const found = this.discovered() ?? [];
    return (this.printers() ?? []).map((entry) => {
      const match = found.find((d) => d.printerEntryId === entry.id) ?? null;
      return {
        entry,
        found: match,
        inConfigToo: match?.state === DiscoveredPrinterState.Configured,
        address: formatAddress(entry.host, entry.port),
        snippet: appPrinterSnippet(entry.kind, entry.id),
      };
    });
  });
  protected readonly newOnes = computed(() =>
    this.rows(DiscoveredPrinterState.New)
  );
  protected readonly configured = computed(() =>
    this.rows(DiscoveredPrinterState.Configured)
  );
  protected readonly ignored = computed(() =>
    this.rows(DiscoveredPrinterState.Ignored)
  );

  protected readonly editing = signal(false);
  /** The connected entry whose `[app_printer]` section is showing. */
  protected readonly openSnippet = signal<number | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.maxLength(100)],
    location: ['', Validators.maxLength(100)],
  });

  private rows(state: DiscoveredPrinterState): FoundRow[] {
    const entries = this.printers() ?? [];
    return (this.discovered() ?? [])
      .filter((d) => d.state === state)
      .map((printer) => ({
        printer,
        title: printer.name || printer.model || printer.address,
        address: formatAddress(printer.address, printer.port),
        connectable: isConnectableKind(printer.kind),
        entry:
          printer.printerEntryId === null
            ? null
            : (entries.find((e) => e.id === printer.printerEntryId) ?? null),
      }));
  }

  protected startEdit(): void {
    const b = this.bridge();
    this.form.setValue({ name: b.name ?? '', location: b.location ?? '' });
    this.editing.set(true);
  }

  protected saveEdit(): void {
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    this.rename.emit({ name: v.name.trim(), location: v.location.trim() });
    this.editing.set(false);
  }

  protected toggleSnippet(entryId: number): void {
    this.openSnippet.update((open) => (open === entryId ? null : entryId));
  }
}
