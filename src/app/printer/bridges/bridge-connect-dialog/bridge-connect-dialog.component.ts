import { Clipboard } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import {
  Bridge,
  BridgePrinter,
  BridgesService,
  ConnectBridgePrinter,
  DiscoveredPrinter,
} from 'src/app/core/services/bridges.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterCatalogService } from 'src/app/core/services/printer-catalog.service';
import { PrinterService } from 'src/app/core/services/printer.service';
import { openQuickAddPrinterDialog } from 'src/app/onboarding/quick-add-printer/quick-add-printer-dialog.component';
import { externalSourceLabel } from 'src/app/shared/utils/external-source.utils';
import {
  BRIDGE_KINDS,
  appPrinterSnippet,
  bridgeErrorCode,
  bridgeErrorMessage,
  credentialName,
  formatAddress,
} from '../bridge-utils';

export interface BridgeConnectDialogData {
  /** The bridge to connect the printer to. */
  bridge: Bridge;
  /** The printer it found, or null to add one by address. */
  discovered: DiscoveredPrinter | null;
  /** All the user's bridges, to name the other one in a conflict. */
  bridges: Bridge[];
  /** 3D Print Log printers already connected from the app: printer id to bridge id. */
  watchedBy: ReadonlyMap<number, number>;
}

/** A 3D Print Log printer the user can log to. */
interface PrinterOption {
  id: number;
  label: string;
  /** The bridge that already watches it, by name, or null. */
  watchedBy: string | null;
  catalogModelId: string | null;
}

const SERIAL_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;

/** Bambu Lab needs its serial; other kinds take none. */
const serialWhenBambu: ValidatorFn = (group) => {
  const kind = group.get('kind')?.value;
  const serial = String(group.get('serial')?.value ?? '').trim();
  return kind === 'bambu' && !serial ? { serialRequired: true } : null;
};

/**
 * Connects a printer to a bridge: one it found on the network, or one added by address (Docker
 * Desktop can't discover). The user logs it to one of their printers or creates one, prefilled
 * from the catalog. For a printer that needs a LAN credential, the dialog then shows the
 * `[app_printer N]` section to add on the bridge, until the app can send it (story 14).
 */
@Component({
  selector: 'app-bridge-connect-dialog',
  templateUrl: './bridge-connect-dialog.component.html',
  styleUrl: './bridge-connect-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
  ],
})
export class BridgeConnectDialogComponent {
  private readonly bridges = inject(BridgesService);
  private readonly printerService = inject(PrinterService);
  private readonly catalog = inject(PrinterCatalogService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef =
    inject<MatDialogRef<BridgeConnectDialogComponent, BridgePrinter>>(
      MatDialogRef
    );
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);
  private readonly clipboard = inject(Clipboard);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly data = inject<BridgeConnectDialogData>(MAT_DIALOG_DATA);

  protected readonly kinds = BRIDGE_KINDS;
  protected readonly kindLabel = externalSourceLabel;
  protected readonly discovered = this.data.discovered;
  protected readonly bridgeName = bridgeLabel(this.data.bridge);
  protected readonly discoveredAddress = this.discovered
    ? formatAddress(this.discovered.address, this.discovered.port)
    : null;

  private readonly fb = inject(FormBuilder).nonNullable;
  readonly form = this.fb.group(
    {
      kind: ['moonraker'],
      host: ['', this.discovered ? [] : [Validators.required]],
      port: this.fb.control<number | null>(null, [
        Validators.min(1),
        Validators.max(65535),
        Validators.pattern(/^\d+$/),
      ]),
      serial: ['', Validators.pattern(SERIAL_PATTERN)],
      printerId: this.fb.control<number | null>(null, Validators.required),
    },
    { validators: this.discovered ? [] : [serialWhenBambu] }
  );

  protected readonly kind = toSignal(
    this.form.controls.kind.valueChanges.pipe(
      startWith(this.form.controls.kind.value)
    ),
    { initialValue: this.form.controls.kind.value }
  );

  protected readonly printerOptions = signal<PrinterOption[]>([]);
  protected readonly printersPhase = signal<'loading' | 'ready' | 'error'>(
    'loading'
  );
  /** The catalog model the discovered printer is, for a new printer and the preselect. */
  private readonly matchedModelId = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Set once connected; a printer that needs a credential then shows its snippet. */
  protected readonly connected = signal<BridgePrinter | null>(null);
  private createdPrinter = false;

  protected readonly snippet = computed(() => {
    const entry = this.connected();
    return entry ? appPrinterSnippet(entry.kind, entry.id) : null;
  });
  protected readonly credential = computed(() =>
    credentialName(this.connected()?.kind ?? '')
  );

  constructor() {
    this.logging.logEvent('BridgeConnect_Opened', {
      source: this.discovered ? 'discovery' : 'address',
      kind: this.discovered?.kind ?? null,
    });
    this.loadPrinters();
  }

  private loadPrinters(): void {
    const query = this.discovered?.model || this.discovered?.name || null;
    const match$ = query
      ? this.catalog.match(query).pipe(map((m) => m?.id ?? null))
      : of(null);
    this.printerService
      .getCurrentUserPrinterSummaries(1, 100, '', false)
      .pipe(
        map((page) => page.items),
        catchError((error: unknown) => {
          this.logging.logException(error as Error);
          return of(null);
        }),
        switchMap((printers) =>
          match$.pipe(map((modelId) => ({ printers, modelId })))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ printers, modelId }) => {
        this.matchedModelId.set(modelId);
        if (printers === null) {
          this.printersPhase.set('error');
          return;
        }
        const options = printers.map((p) => this.toOption(p));
        options.sort(
          (a, b) =>
            Number(a.watchedBy !== null) - Number(b.watchedBy !== null) ||
            a.label.localeCompare(b.label)
        );
        this.printerOptions.set(options);
        this.printersPhase.set('ready');
        this.preselect(modelId);
      });
  }

  private toOption(p: {
    id: number;
    name: string;
    make?: string | null;
    model?: string | null;
    catalogModelId?: string | null;
  }): PrinterOption {
    const watcher = this.data.watchedBy.get(p.id);
    const makeModel = [p.make, p.model].filter((s) => !!s?.trim()).join(' ');
    return {
      id: p.id,
      label:
        makeModel && makeModel !== p.name ? `${p.name} (${makeModel})` : p.name,
      watchedBy:
        watcher === undefined ? null : this.nameOf(watcher) || 'a bridge',
      catalogModelId: p.catalogModelId ?? null,
    };
  }

  /** The user's one free printer of the discovered model, when there is exactly one. */
  private preselect(modelId: string | null): void {
    const control = this.form.controls.printerId;
    if (!modelId || control.value !== null) {
      return;
    }
    const candidates = this.printerOptions().filter(
      (o) => o.catalogModelId === modelId && o.watchedBy === null
    );
    if (candidates.length === 1) {
      control.setValue(candidates[0].id);
    }
  }

  protected newPrinter(): void {
    const d = this.discovered;
    const modelId = this.matchedModelId();
    openQuickAddPrinterDialog(this.dialog, {
      source: 'bridges',
      showEmailNotice: false,
      ...(modelId ? { initialModelId: modelId } : {}),
      ...(d?.name ? { initialName: d.name } : {}),
      ...(!modelId && d?.model ? { initialSearch: d.model } : {}),
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((printer) => {
        if (!printer) {
          return;
        }
        this.createdPrinter = true;
        this.printerOptions.update((list) => [
          this.toOption(printer),
          ...list.filter((o) => o.id !== printer.id),
        ]);
        this.form.controls.printerId.setValue(printer.id);
      });
  }

  protected connect(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: ConnectBridgePrinter = { printerId: v.printerId! };
    if (this.discovered) {
      body.discoveredPrinterId = this.discovered.id;
    } else {
      body.kind = v.kind;
      body.host = v.host.trim();
      if (v.port !== null && String(v.port) !== '') {
        body.port = Number(v.port);
      }
      if (v.kind === 'bambu') {
        body.serial = v.serial.trim();
      }
    }
    this.submitting.set(true);
    this.error.set(null);
    this.bridges
      .connect(this.data.bridge.id, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entry) => {
          this.submitting.set(false);
          this.logging.logEvent('BridgeConnect_Connected', {
            kind: entry.kind,
            fromDiscovery: this.discovered !== null,
            newPrinter: this.createdPrinter,
          });
          if (appPrinterSnippet(entry.kind, entry.id)) {
            this.connected.set(entry);
            return;
          }
          this.toastr.success(
            'Connected. The bridge starts watching it within a minute.'
          );
          this.dialogRef.close(entry);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.error.set(bridgeErrorMessage(error, (id) => this.nameOf(id)));
          this.logging.logEvent('BridgeConnect_Failed', {
            code: bridgeErrorCode(error) ?? 'unknown',
          });
        },
      });
  }

  protected copySnippet(): void {
    const text = this.snippet();
    if (text && this.clipboard.copy(text)) {
      this.toastr.success('Copied to the clipboard.');
    } else {
      this.toastr.error('Could not copy. Select the section and copy it.');
    }
    this.logging.logEvent('BridgeConnect_SnippetCopied', {
      kind: this.connected()?.kind ?? null,
    });
  }

  protected done(): void {
    this.dialogRef.close(this.connected() ?? undefined);
  }

  private nameOf(bridgeId: number): string | null {
    const bridge = this.data.bridges.find((b) => b.id === bridgeId);
    return bridge ? bridgeLabel(bridge) : null;
  }
}

/** What a bridge is called on screen. */
export function bridgeLabel(bridge: Bridge): string {
  return (
    bridge.displayName?.trim() ||
    bridge.deviceName?.trim() ||
    bridge.hostName?.trim() ||
    'printlog-bridge'
  );
}

const PHONE_QUERY = '(max-width: 599.98px)';

/** Opens the connect dialog, full screen on phones. Closes with the new entry, if any. */
export function openBridgeConnectDialog(
  dialog: MatDialog,
  data: BridgeConnectDialogData
): MatDialogRef<BridgeConnectDialogComponent, BridgePrinter | undefined> {
  const phone =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(PHONE_QUERY).matches;
  return dialog.open(BridgeConnectDialogComponent, {
    data,
    width: phone ? '100vw' : 'min(32rem, 100vw - 2rem)',
    height: phone ? '100svh' : undefined,
    maxWidth: '100vw',
    autoFocus: 'first-tabbable',
    panelClass: phone ? 'app-fullscreen-dialog' : undefined,
  });
}
