import { Clipboard } from '@angular/cdk/clipboard';
import { HttpErrorResponse } from '@angular/common/http';
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
import { BridgeCredentialsComponent } from '../bridge-credentials/bridge-credentials.component';
import {
  BRIDGE_KINDS,
  appPrinterSnippet,
  bridgeErrorCode,
  bridgeErrorMessage,
  bridgeLabel,
  credentialName,
  credentialNoun,
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

/**
 * What the dialog closes with when the user chose to move the printer here instead, after
 * `printer_connected_elsewhere`: the page opens the move from that bridge to this one.
 */
export interface BridgeConnectMove {
  moveFrom: number;
  printerId: number;
}

export function isConnectMoveRequest(
  value: unknown
): value is BridgeConnectMove {
  const v = value as Partial<BridgeConnectMove> | null | undefined;
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.moveFrom === 'number' &&
    typeof v.printerId === 'number'
  );
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
 * from the catalog. For a printer that needs a LAN credential, the dialog then asks for it and
 * seals it to the bridge's key (story 14c), or, for a bridge the app can't seal to, shows the
 * `[app_printer N]` section to add to its config file.
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
    BridgeCredentialsComponent,
  ],
})
export class BridgeConnectDialogComponent {
  private readonly bridges = inject(BridgesService);
  private readonly printerService = inject(PrinterService);
  private readonly catalog = inject(PrinterCatalogService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef =
    inject<
      MatDialogRef<
        BridgeConnectDialogComponent,
        BridgePrinter | BridgeConnectMove
      >
    >(MatDialogRef);
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);
  private readonly clipboard = inject(Clipboard);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly data = inject<BridgeConnectDialogData>(MAT_DIALOG_DATA);

  protected readonly kinds = BRIDGE_KINDS;
  protected readonly kindLabel = externalSourceLabel;
  protected readonly discovered = this.data.discovered;
  protected readonly bridgeName = bridgeLabel(this.data.bridge);
  /** The bridge, reloaded when its key changed under a credential. */
  protected readonly bridge = signal(this.data.bridge);
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
  /** After `printer_connected_elsewhere`: the bridge watching the printer, to move it here. */
  protected readonly moveFrom = signal<{
    bridgeId: number;
    printerId: number;
  } | null>(null);
  /** Set once connected; a printer that needs a credential then asks for it. */
  protected readonly connected = signal<BridgePrinter | null>(null);
  private createdPrinter = false;

  /** The second step seals credentials; an API that lists no fields gets the old snippet. */
  protected readonly sealsCredentials = computed(
    () => !!this.connected()?.secretFields?.length
  );
  protected readonly snippet = computed(() => {
    const entry = this.connected();
    return entry ? appPrinterSnippet(entry.kind, entry.id) : null;
  });
  protected readonly credentialsTitle = computed(() => {
    const fields = this.connected()?.secretFields ?? [];
    return fields.length === 1 ? credentialNoun(fields[0]) : 'credentials';
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
    this.moveFrom.set(null);
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
          if (needsCredentialStep(entry)) {
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
          const other = conflictBridgeId(error);
          if (
            bridgeErrorCode(error) === 'printer_connected_elsewhere' &&
            other !== null &&
            other !== this.data.bridge.id
          ) {
            this.moveFrom.set({ bridgeId: other, printerId: body.printerId });
          }
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

  /** The bridge's key changed under a credential: read it again, so the step seals to the new one. */
  protected reloadBridge(): void {
    this.bridges
      .get(this.data.bridge.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bridge) => this.bridge.set(bridge),
        error: (error: unknown) => this.logging.logException(error as Error),
      });
  }

  /** Close and let the page open the move from the bridge that watches it. */
  protected moveHere(): void {
    const from = this.moveFrom();
    if (!from) {
      return;
    }
    this.logging.logEvent('BridgeConnect_MoveOffered', {});
    this.dialogRef.close({
      moveFrom: from.bridgeId,
      printerId: from.printerId,
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

function conflictBridgeId(error: unknown): number | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const id = (error.error as { bridgeId?: unknown } | null)?.bridgeId;
  return typeof id === 'number' ? id : null;
}

/**
 * A kind whose credential is optional (a Moonraker API key, only with `[authorization]`) is
 * connected without the second step; its key can be set from the card.
 */
const OPTIONAL_CREDENTIAL_KINDS: ReadonlySet<string> = new Set(['moonraker']);

function needsCredentialStep(entry: BridgePrinter): boolean {
  if (OPTIONAL_CREDENTIAL_KINDS.has(entry.kind)) {
    return false;
  }
  return entry.secretFields
    ? entry.secretFields.length > 0
    : appPrinterSnippet(entry.kind, entry.id) !== null;
}

const PHONE_QUERY = '(max-width: 599.98px)';

/** Opens the connect dialog, full screen on phones. Closes with the new entry, if any. */
export function openBridgeConnectDialog(
  dialog: MatDialog,
  data: BridgeConnectDialogData
): MatDialogRef<
  BridgeConnectDialogComponent,
  BridgePrinter | BridgeConnectMove | undefined
> {
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
