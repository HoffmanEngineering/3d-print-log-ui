import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import {
  CredentialSealingError,
  InvalidCredentialError,
  groupedFingerprint,
  prepareCredential,
  sealCredential,
  shortFingerprint,
} from 'src/app/core/crypto/credential-sealing';
import {
  Bridge,
  BridgePrinter,
  BridgesService,
  DiscoveredPrinter,
  MoveBridgePrinter,
  MovedBridgePrinter,
} from 'src/app/core/services/bridges.service';
import { BridgeKeyPinsService } from 'src/app/core/services/bridge-key-pins.service';
import { ConnectionStatus } from 'src/app/core/services/connection.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';
import { externalSourceLabel } from 'src/app/shared/utils/external-source.utils';
import {
  SealingKeyState,
  sealingKeyState,
} from '../bridge-credentials/bridge-credentials.component';
import { Sighting, stableIdentity } from '../bridge-grouping';
import { BridgeKeyChangedComponent } from '../bridge-key-changed/bridge-key-changed.component';
import {
  bridgeErrorCode,
  bridgeErrorMessage,
  bridgeLabel,
  credentialNoun,
  credentialProblemMessage,
  formatAddress,
  isKeyErrorCode,
  missingMoveCredential,
  moveCredentialPlan,
  problemFields,
} from '../bridge-utils';

export interface BridgeMoveDialogData {
  /** The printer to move, as its current bridge has it. */
  entry: BridgePrinter;
  /** The bridge watching it now. */
  from: Bridge;
  /** All the user's bridges; the others are the targets. */
  bridges: Bridge[];
  /** Where the other bridges found this printer (`crossBridge`'s `entrySightings`). */
  sightings: Sighting[];
  /** The target to start with, such as the bridge a connect conflict came from. */
  toBridgeId?: number | null;
  /** What `toBridgeId` found, from that connect: where it reaches the printer. */
  discovered?: DiscoveredPrinter | null;
}

/**
 * A printer the target found that may be this one: `same` when both have the same serial,
 * mainboard id or MAC; `unconfirmed` when either is known only by its address, so the user has to
 * say it is the same printer before the move takes its address and identity.
 */
interface Candidate {
  printer: DiscoveredPrinter;
  match: 'same' | 'unconfirmed';
}

/** A bridge to move to, for the select. */
interface Target {
  id: number;
  label: string;
  stale: boolean;
}

/**
 * Moves a connected printer to another of the user's bridges (printlog-bridge#103, api#290), in
 * one step with its credentials: values sealed to the old bridge can't be opened by the new one,
 * so the dialog asks for each one that was set and seals it in the browser to the NEW bridge's
 * key, under the same trust rules as the credential editor (computed fingerprint, key pin).
 */
@Component({
  selector: 'app-bridge-move-dialog',
  templateUrl: './bridge-move-dialog.component.html',
  styleUrl: './bridge-move-dialog.component.scss',
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
    MatCheckboxModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    RouterLink,
    LocaleDatePipe,
    BridgeKeyChangedComponent,
  ],
})
export class BridgeMoveDialogComponent {
  private readonly service = inject(BridgesService);
  private readonly dialogRef =
    inject<MatDialogRef<BridgeMoveDialogComponent, MovedBridgePrinter>>(
      MatDialogRef
    );
  private readonly toastr = inject(ToastrService);
  private readonly logging = inject(LoggingService);
  private readonly pins = inject(BridgeKeyPinsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly data = inject<BridgeMoveDialogData>(MAT_DIALOG_DATA);

  protected readonly entry = this.data.entry;
  protected readonly printerName =
    this.entry.printerName || `Printer ${this.entry.printerId}`;
  protected readonly fromName = bridgeLabel(this.data.from);
  protected readonly kindLabel = externalSourceLabel(this.entry.kind);
  protected readonly currentAddress = formatAddress(
    this.entry.host,
    this.entry.port
  );

  /** The bridges, with any reloaded after a key error. */
  private readonly bridges = signal<Bridge[]>(this.data.bridges);
  protected readonly targets = computed<Target[]>(() =>
    this.bridges()
      .filter((b) => b.id !== this.data.from.id)
      .map((b) => ({
        id: b.id,
        label: b.location
          ? `${bridgeLabel(b)} (${b.location})`
          : bridgeLabel(b),
        stale: b.status === ConnectionStatus.Stale,
      }))
  );

  private readonly fb = inject(FormBuilder).nonNullable;
  readonly form = this.fb.group({
    toBridgeId: this.fb.control<number | null>(
      this.initialTarget(),
      Validators.required
    ),
    host: [this.entry.host],
    port: this.fb.control<number | null>(this.entry.port, [
      Validators.min(1),
      Validators.max(65535),
      Validators.pattern(/^\d+$/),
    ]),
  });

  private readonly toBridgeId = toSignal(
    this.form.controls.toBridgeId.valueChanges,
    { initialValue: this.form.controls.toBridgeId.value }
  );
  protected readonly target = computed(
    () => this.bridges().find((b) => b.id === this.toBridgeId()) ?? null
  );
  protected readonly targetName = computed(() => {
    const t = this.target();
    return t ? bridgeLabel(t) : 'the new bridge';
  });
  protected readonly targetStale = computed(
    () => this.target()?.status === ConnectionStatus.Stale
  );
  /** Targets whose found printer the API refused (another kind, or gone): use an address. */
  private readonly refused = signal<ReadonlySet<number>>(new Set());
  /**
   * What the target found that may be this printer. Only the same kind, and never one with
   * another stable identity: `printer_connected_elsewhere` is keyed on the 3D Print Log printer
   * picked, so the printer a connect found can be a different machine, and taking its address
   * would stop the real one being logged.
   */
  protected readonly candidate = computed<Candidate | null>(() => {
    const id = this.toBridgeId();
    if (id === null || this.refused().has(id)) {
      return null;
    }
    const options: DiscoveredPrinter[] = [];
    if (id === this.data.toBridgeId && this.data.discovered) {
      options.push(this.data.discovered);
    }
    for (const s of this.data.sightings) {
      if (s.bridgeId === id) {
        options.push(s.printer);
      }
    }
    for (const printer of options) {
      const match = this.matchOf(printer);
      if (match) {
        return { printer, match };
      }
    }
    return null;
  });
  protected readonly candidateAddress = computed(() => {
    const c = this.candidate();
    return c ? formatAddress(c.printer.address, c.printer.port) : null;
  });
  /** The user's choice between the found address and the current one; null for the default. */
  private readonly choice = signal<'found' | 'keep' | null>(null);
  protected readonly where = computed<'found' | 'keep'>(() => {
    const c = this.candidate();
    if (!c) {
      return 'keep';
    }
    return this.choice() ?? (c.match === 'same' ? 'found' : 'keep');
  });
  /** "This is the same printer", for a found printer known only by its address. */
  protected readonly confirmedSame = signal(false);
  /** The found printer the move uses, if any. */
  private readonly found = computed<DiscoveredPrinter | null>(() => {
    const c = this.candidate();
    if (!c || this.where() !== 'found') {
      return null;
    }
    return c.match === 'same' || this.confirmedSame() ? c.printer : null;
  });
  /** The found address is picked but not yet confirmed as this printer. */
  private readonly unconfirmedPick = computed(
    () =>
      this.where() === 'found' &&
      this.candidate()?.match === 'unconfirmed' &&
      !this.confirmedSame()
  );

  /** Fields the API said the move needs, on top of the ones that were set. */
  private readonly askedFor = signal<string[]>([]);
  protected readonly plan = computed(() =>
    moveCredentialPlan(
      this.entry.kind,
      this.entry.secretFields,
      (this.entry.secrets ?? []).map((s) => s.field),
      this.askedFor()
    )
  );
  protected readonly carriesCredentials = computed(
    () => this.plan().fields.length > 0
  );
  /**
   * The target's key is needed only for a credential the printer can't connect without. Optional
   * ones (a PrusaLink user name) can be left behind, and are then reported as dropped.
   */
  protected readonly requiresKey = computed(
    () => this.plan().groups.length > 0
  );
  protected readonly optionalNouns = computed(() =>
    this.plan()
      .fields.map((f) => credentialNoun(f.field))
      .join(' and the ')
  );

  protected readonly keyState = toSignal(
    toObservable(
      computed(() => {
        const t = this.target();
        return {
          publicKey: t?.publicKey ?? null,
          pendingPublicKey: t?.pendingPublicKey ?? null,
        };
      })
    ).pipe(
      distinctUntilChanged(
        (a, b) =>
          a.publicKey === b.publicKey &&
          a.pendingPublicKey === b.pendingPublicKey
      ),
      switchMap((keys) =>
        this.browser
          ? sealingKeyState(keys)
          : of<SealingKeyState>({ status: 'unavailable' })
      )
    ),
    { initialValue: { status: 'loading' } as SealingKeyState }
  );
  private readonly key = computed(() => {
    const state = this.keyState();
    // Only the key the target serves now (a reloaded bridge is still importing).
    return state.status === 'ready' &&
      state.source === (this.target()?.publicKey ?? null)
      ? state.key
      : null;
  });
  protected readonly shortFingerprint = computed(() => {
    const key = this.key();
    return key ? shortFingerprint(key.fingerprint) : '';
  });
  protected readonly fullFingerprint = computed(() => {
    const key = this.key();
    return key ? groupedFingerprint(key.fingerprint) : '';
  });
  /** The 14c pin gate, for the target: its key changed without confirmation in this browser. */
  protected readonly keyChanged = computed(() => {
    const key = this.key();
    const t = this.target();
    if (!key || !t) {
      return null;
    }
    const pinned = this.pins.pinned(t.id);
    return pinned && pinned !== key.fingerprint ? key.fingerprint : null;
  });

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly fieldErrors = signal<Readonly<Record<string, string>>>({});
  /** Set once moved, when there is something left to say (dropped or stale credentials). */
  protected readonly result = signal<{
    moved: MovedBridgePrinter;
    /** The bridge it moved to, as it was when the move was sent. */
    targetName: string;
    dropped: string;
    stale: string | null;
  } | null>(null);

  protected readonly canSubmit = computed(
    () =>
      !this.busy() &&
      this.target() !== null &&
      !this.unconfirmedPick() &&
      (!this.requiresKey() || (!!this.key() && !this.keyChanged()))
  );

  private readonly controls = new Map<string, FormControl<string>>();

  constructor() {
    // Another target: its own found printer, default choice and confirmation.
    this.form.controls.toBridgeId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.choice.set(null);
        this.confirmedSame.set(false);
      });
    this.logging.logEvent('BridgeMove_Opened', {
      kind: this.entry.kind,
      source: this.data.discovered ? 'conflict' : 'row',
      targets: this.targets().length,
      credentials: (this.entry.secrets ?? []).length,
    });
  }

  protected controlFor(field: string): FormControl<string> {
    let control = this.controls.get(field);
    if (!control) {
      control = new FormControl('', { nonNullable: true });
      this.controls.set(field, control);
    }
    return control;
  }

  protected setWhere(value: 'found' | 'keep'): void {
    this.choice.set(value);
  }

  private matchOf(printer: DiscoveredPrinter): Candidate['match'] | null {
    if (printer.kind !== this.entry.kind) {
      return null;
    }
    const mine = stableIdentity(this.entry.identityKey);
    const theirs = stableIdentity(printer.identityKey);
    if (mine && theirs) {
      return mine === theirs ? 'same' : null;
    }
    return 'unconfirmed';
  }

  protected inputId(field: string): string {
    return `move-${this.entry.id}-${field}`;
  }

  /** The target whose network the printer is on, else the only target, else the first finder. */
  private initialTarget(): number | null {
    const others = this.data.bridges.filter((b) => b.id !== this.data.from.id);
    if (
      this.data.toBridgeId != null &&
      others.some((b) => b.id === this.data.toBridgeId)
    ) {
      return this.data.toBridgeId;
    }
    const sighting =
      this.data.sightings.find((s) => s.onOwnNetwork) ?? this.data.sightings[0];
    if (sighting && others.some((b) => b.id === sighting.bridgeId)) {
      return sighting.bridgeId;
    }
    return others.length === 1 ? others[0].id : null;
  }

  protected submit(): void {
    const target = this.target();
    if (!this.canSubmit() || !target || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.fieldErrors.set({});
    const body: MoveBridgePrinter = { toBridgeId: target.id };
    const found = this.found();
    if (found) {
      body.discoveredPrinterId = found.id;
    } else {
      const v = this.form.getRawValue();
      const host = v.host.trim();
      const port =
        v.port === null || String(v.port) === '' ? null : Number(v.port);
      if (host !== this.entry.host || port !== this.entry.port) {
        body.host = host;
        body.port = port;
      }
    }

    // Check every value before sealing any, and never keep what was typed after this.
    const plaintexts = new Map<string, string>();
    for (const { field } of this.plan().fields) {
      const typed = this.controlFor(field).value;
      if (typed === '') {
        continue;
      }
      try {
        plaintexts.set(field, prepareCredential(field, typed));
      } catch (error) {
        if (error instanceof InvalidCredentialError) {
          this.fieldErrors.set({
            [field]: credentialProblemMessage(error.reason, field),
          });
          this.logging.logEvent('BridgeMove_Refused', {
            field,
            reason: error.reason,
          });
          return;
        }
        throw error;
      }
    }
    const missing = missingMoveCredential(
      this.plan(),
      new Set(plaintexts.keys())
    );
    if (missing) {
      this.error.set(missing);
      return;
    }
    const key = this.key();
    if (plaintexts.size > 0 && (!key || this.keyChanged())) {
      // Only reachable for optional fields typed before the key went away: never send them.
      this.error.set(
        `${bridgeLabel(target)} can't take credentials right now. Leave them empty to move without them.`
      );
      return;
    }
    for (const control of this.controls.values()) {
      control.reset('');
    }

    const pinBefore = this.pins.pinned(target.id);
    const sentCredentials = plaintexts.size > 0;
    this.setBusy(true);
    const sealAll = async () => {
      if (plaintexts.size === 0 || !key) {
        return body;
      }
      const secrets: Record<string, string> = {};
      let keyFingerprint = '';
      for (const [field, plaintext] of plaintexts) {
        const sealed = await sealCredential(
          key,
          { bridgeId: target.id, entryId: this.entry.id, field },
          plaintext
        );
        secrets[field] = sealed.sealed;
        keyFingerprint = sealed.keyFingerprint;
      }
      return { ...body, secrets, keyFingerprint };
    };
    from(sealAll())
      .pipe(
        switchMap((request) =>
          this.service
            .move(this.data.from.id, this.entry.id, request)
            .pipe(map((moved) => ({ moved, request })))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ moved, request }) => {
          this.setBusy(false);
          this.done(target, moved, request, pinBefore);
        },
        error: (error: unknown) => {
          this.setBusy(false);
          this.failed(target, error, sentCredentials);
        },
      });
  }

  /** While moving: the target can't change, and the dialog can't be closed. */
  private setBusy(busy: boolean): void {
    this.busy.set(busy);
    this.dialogRef.disableClose = busy;
    const control = this.form.controls.toBridgeId;
    if (busy) {
      control.disable({ emitEvent: false });
    } else {
      control.enable({ emitEvent: false });
    }
  }

  private done(
    target: Bridge,
    moved: MovedBridgePrinter,
    request: MoveBridgePrinter,
    pinBefore: string | null
  ): void {
    const sent = Object.keys(request.secrets ?? {});
    const fingerprint = request.keyFingerprint;
    const staleFields = sent.filter((field) => {
      const s = moved.printer?.secrets?.find((x) => x.field === field);
      return !s || s.stale;
    });
    if (fingerprint && staleFields.length === 0) {
      // Like a seal: pin what was sealed to, unless the pin moved meanwhile.
      const pinNow = this.pins.pinned(target.id);
      if (pinNow === pinBefore || pinNow === fingerprint) {
        this.pins.pin(target.id, fingerprint);
      }
    }
    const dropped = moved.droppedSecretFields ?? [];
    this.logging.logEvent('BridgeMove_Moved', {
      kind: this.entry.kind,
      fromDiscovery: request.discoveredPrinterId !== undefined,
      newAddress: request.host !== undefined,
      carried: sent.length,
      dropped: dropped.length,
    });
    const name = bridgeLabel(target);
    if (dropped.length === 0 && staleFields.length === 0) {
      this.toastr.success(
        `Moved to ${name}. ${this.fromName} stops watching it within a minute, and ${name} starts.`
      );
      this.dialogRef.close(moved);
      return;
    }
    this.result.set({
      moved,
      targetName: name,
      dropped: dropped.map(credentialNoun).join(' and the '),
      stale: staleFields.length
        ? `${name}'s encryption key changed during the move, so it can't use the ${staleFields.map(credentialNoun).join(' and the ')}. Check its key on its card, then enter it again there.`
        : null,
    });
  }

  private failed(
    target: Bridge,
    error: unknown,
    sentCredentials: boolean
  ): void {
    const message = this.failureMessage(target, error);
    // What was typed isn't kept once it was sealed: say so, rather than an empty form.
    this.error.set(
      sentCredentials && message
        ? `${message} Enter the credentials again: they aren't kept.`
        : message
    );
  }

  private failureMessage(target: Bridge, error: unknown): string {
    const code = bridgeErrorCode(error);
    const name = bridgeLabel(target);
    this.logging.logEvent('BridgeMove_Failed', {
      code:
        code ??
        (error instanceof CredentialSealingError ? error.reason : 'unknown'),
    });
    if (error instanceof CredentialSealingError) {
      return error.reason === 'unavailable'
        ? "This browser can't encrypt credentials. Use an up-to-date browser over https."
        : `${name}'s encryption key isn't valid, so nothing was sent.`;
    }
    switch (code) {
      case 'secrets_required':
        this.askedFor.set(problemFields(error));
        break;
      case 'invalid_kind':
      case 'discovered_printer_not_found':
        // Stop offering what the target found; the address fields take its place.
        this.refused.update((ids) => new Set([...ids, target.id]));
        this.choice.set(null);
        return code === 'invalid_kind'
          ? `${name} found a different kind of printer there, so the move keeps the printer's own address. Check the address below, then move it again.`
          : `${name} no longer sees the printer it found. Check the address below, then move it again.`;
      case 'discovered_printer_already_connected':
        return `${name} already watches a printer at that address. Disconnect that one on ${name}'s card first, or enter another address.`;
    }
    const nameOf = (id: number) => {
      const b = this.bridges().find((x) => x.id === id);
      return b ? bridgeLabel(b) : null;
    };
    const message = bridgeErrorMessage(error, nameOf);
    if (isKeyErrorCode(code)) {
      // Never retry with anything from the answer: read the bridge again and ask again.
      this.reload(target.id);
      return `${name}: ${message}`;
    }
    return message;
  }

  private reload(id: number): void {
    this.service
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bridge) =>
          this.bridges.update((list) =>
            list.map((b) => (b.id === bridge.id ? bridge : b))
          ),
        error: (error: unknown) => this.logging.logException(error as Error),
      });
  }

  protected close(): void {
    this.dialogRef.close(this.result()?.moved);
  }
}

const PHONE_QUERY = '(max-width: 599.98px)';

/** Opens the move dialog, full screen on phones. Closes with the move's answer, if it moved. */
export function openBridgeMoveDialog(
  dialog: MatDialog,
  data: BridgeMoveDialogData
): MatDialogRef<BridgeMoveDialogComponent, MovedBridgePrinter | undefined> {
  const phone =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(PHONE_QUERY).matches;
  return dialog.open(BridgeMoveDialogComponent, {
    data,
    width: phone ? '100vw' : 'min(34rem, 100vw - 2rem)',
    height: phone ? '100svh' : undefined,
    maxWidth: '100vw',
    // The dialog itself: focus moved to the select after the open animation could take keys
    // typed into a credential field right away.
    autoFocus: 'dialog',
    panelClass: phone ? 'app-fullscreen-dialog' : undefined,
  });
}
