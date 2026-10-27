import { Clipboard } from '@angular/cdk/clipboard';
import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
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
  BridgeKey,
  CredentialSealingError,
  InvalidCredentialError,
  canSealCredentials,
  groupedFingerprint,
  importBridgeKey,
  prepareCredential,
  sealCredential,
  shortFingerprint,
} from 'src/app/core/crypto/credential-sealing';
import {
  Bridge,
  BridgePrinter,
  BridgePrinterSecret,
  BridgesService,
} from 'src/app/core/services/bridges.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  appPrinterSnippet,
  bridgeErrorCode,
  bridgeErrorMessage,
  bridgeLabel,
  credentialFieldHint,
  credentialFieldLabel,
  credentialIssueMessage,
  credentialProblemMessage,
  isKeyErrorCode,
} from '../bridge-utils';

/**
 * What the app can seal to: `ready` with the imported key, or why not. `none` is a bridge that
 * reported no key (too old, or without the `cryptography` package), `pending_only` one whose only
 * key waits for the owner's confirmation.
 */
export type SealingKeyState =
  | { status: 'loading' }
  | { status: 'ready'; key: BridgeKey }
  | { status: 'none' }
  | { status: 'pending_only' }
  | { status: 'invalid' }
  | { status: 'unavailable' };

/** One field's state for the template. */
interface FieldRow {
  field: string;
  label: string;
  hint: string | null;
  secret: BridgePrinterSecret | null;
  /**
   * `current`: sealed to the key this page computed. `other_key`: the API says it was sealed to
   * some other key that isn't marked stale; either way the user should enter it again.
   */
  state: 'unset' | 'current' | 'stale' | 'other_key';
  issue: string | null;
  /** A username isn't secret; everything else is a password input. */
  secretInput: boolean;
}

/**
 * Imports a bridge's key for sealing, or says why it can't. Shared by the editor and the card, so
 * both compute the fingerprint from the key bytes themselves.
 */
export function sealingKeyState(
  bridge: Pick<Bridge, 'publicKey' | 'pendingPublicKey'>
): Observable<SealingKeyState> {
  const publicKey = bridge.publicKey ?? null;
  if (!publicKey) {
    return of(
      bridge.pendingPublicKey
        ? { status: 'pending_only' as const }
        : { status: 'none' as const }
    );
  }
  if (!canSealCredentials()) {
    return of({ status: 'unavailable' as const });
  }
  return from(importBridgeKey(publicKey)).pipe(
    map((key) => ({ status: 'ready' as const, key })),
    catchError((error: unknown) =>
      of(
        error instanceof CredentialSealingError &&
          error.reason === 'unavailable'
          ? { status: 'unavailable' as const }
          : { status: 'invalid' as const }
      )
    )
  );
}

/**
 * The LAN credentials of one printer connected to a bridge: each of its `secretFields`, sealed in
 * the browser to the bridge's key (printlog-bridge#100, story 14c). Shows the fingerprint it
 * computed from that key, each field's state and what the bridge reported, and never keeps what
 * was typed once it is sealed. Without a key it can seal to, it shows the `[app_printer N]`
 * section for the bridge's config file instead.
 */
@Component({
  selector: 'app-bridge-credentials',
  templateUrl: './bridge-credentials.component.html',
  styleUrl: './bridge-credentials.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    RouterLink,
  ],
})
export class BridgeCredentialsComponent {
  private readonly service = inject(BridgesService);
  private readonly logging = inject(LoggingService);
  private readonly toastr = inject(ToastrService);
  private readonly clipboard = inject(Clipboard);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly bridge = input.required<Bridge>();
  readonly entry = input.required<BridgePrinter>();
  /** Where it is shown, for analytics and wording. */
  readonly context = input<'bridges' | 'connect'>('bridges');

  /** The entry after a credential was set or cleared. */
  readonly entryChange = output<BridgePrinter>();
  /** The bridge's key isn't what was sealed to (it changed, or waits for confirmation): reload it. */
  readonly reloadBridge = output<void>();

  protected readonly keyState = toSignal(
    toObservable(
      computed(() => ({
        publicKey: this.bridge().publicKey ?? null,
        pendingPublicKey: this.bridge().pendingPublicKey ?? null,
      }))
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

  protected readonly key = computed(() => {
    const state = this.keyState();
    return state.status === 'ready' ? state.key : null;
  });
  protected readonly shortFingerprint = computed(() => {
    const key = this.key();
    return key ? shortFingerprint(key.fingerprint) : '';
  });
  protected readonly fullFingerprint = computed(() => {
    const key = this.key();
    return key ? groupedFingerprint(key.fingerprint) : '';
  });
  protected readonly bridgeName = computed(() => bridgeLabel(this.bridge()));
  protected readonly hasPendingKey = computed(
    () => !!this.bridge().pendingPublicKey
  );
  protected readonly snippet = computed(() =>
    appPrinterSnippet(this.entry().kind, this.entry().id)
  );

  protected readonly rows = computed<FieldRow[]>(() => {
    const entry = this.entry();
    const key = this.key();
    return (entry.secretFields ?? []).map((field) => {
      const secret = entry.secrets?.find((s) => s.field === field) ?? null;
      const issue =
        entry.credentialIssues?.find((i) => i.field === field) ?? null;
      let state: FieldRow['state'] = 'unset';
      if (secret) {
        if (secret.stale) {
          state = 'stale';
        } else if (key && secret.keyFingerprint !== key.fingerprint) {
          state = 'other_key';
        } else {
          state = 'current';
        }
      }
      return {
        field,
        label: credentialFieldLabel(field),
        hint: credentialFieldHint(entry.kind, field),
        secret,
        state,
        issue: issue
          ? credentialIssueMessage(entry.kind, field, issue.code)
          : null,
        secretInput: field !== 'username',
      };
    });
  });

  /** The field being sealed and saved, if any. */
  protected readonly busy = signal<string | null>(null);
  protected readonly errors = signal<Readonly<Record<string, string>>>({});
  /** "Saved" lines, with the fingerprint the value was sealed to. */
  protected readonly notes = signal<Readonly<Record<string, string>>>({});

  private readonly controls = new Map<string, FormControl<string>>();

  protected controlFor(field: string): FormControl<string> {
    let control = this.controls.get(field);
    if (!control) {
      control = new FormControl('', { nonNullable: true });
      this.controls.set(field, control);
    }
    return control;
  }

  protected inputId(field: string): string {
    return `credential-${this.bridge().id}-${this.entry().id}-${field}`;
  }

  /** A plain form (no form directive), so the browser must not submit it itself. */
  protected submit(event: Event, field: string): void {
    event.preventDefault();
    this.save(field);
  }

  protected save(field: string): void {
    const key = this.key();
    if (!key || this.busy() !== null) {
      return;
    }
    const control = this.controlFor(field);
    let plaintext: string;
    try {
      plaintext = prepareCredential(field, control.value);
    } catch (error) {
      if (error instanceof InvalidCredentialError) {
        this.setMessage(
          field,
          credentialProblemMessage(error.reason, field),
          null
        );
        this.logging.logEvent('BridgeCredentials_Refused', {
          field,
          reason: error.reason,
        });
        return;
      }
      throw error;
    }
    // From here on the form holds nothing: the plaintext lives only in this call until sealed.
    control.reset('');
    const bridge = this.bridge();
    const entry = this.entry();
    const replaced = entry.secrets?.some((s) => s.field === field) ?? false;
    this.busy.set(field);
    this.setMessage(field, null, null);
    from(
      sealCredential(
        key,
        { bridgeId: bridge.id, entryId: entry.id, field },
        plaintext
      )
    )
      .pipe(
        switchMap(({ sealed, keyFingerprint }) =>
          this.service
            .setSecret(bridge.id, entry.id, field, { sealed, keyFingerprint })
            .pipe(map((updated) => ({ updated, keyFingerprint })))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ updated, keyFingerprint }) => {
          this.busy.set(null);
          this.entryChange.emit(updated);
          const saved = updated.secrets?.find((s) => s.field === field);
          if (!saved || saved.stale) {
            // Stored, but sealed to a key the bridge no longer uses: a key confirmation raced it.
            this.setMessage(
              field,
              `The bridge's encryption key changed while this was saving, so the bridge can't use it. Check the key on ${this.bridgeName()}'s card, then enter the ${credentialFieldLabel(field).toLowerCase()} again.`,
              null
            );
            this.logging.logEvent('BridgeCredentials_StaleOnSave', { field });
            this.reloadBridge.emit();
            return;
          }
          this.setMessage(
            field,
            null,
            `Saved, encrypted to ${shortFingerprint(keyFingerprint)}. The bridge picks it up within a minute.`
          );
          this.logging.logEvent('BridgeCredentials_Saved', {
            kind: updated.kind,
            field,
            replaced,
            context: this.context(),
          });
        },
        error: (error: unknown) => {
          this.busy.set(null);
          const code = bridgeErrorCode(error);
          this.setMessage(field, this.failureMessage(error), null);
          this.logging.logEvent('BridgeCredentials_Failed', {
            field,
            code:
              code ??
              (error instanceof CredentialSealingError
                ? error.reason
                : 'unknown'),
          });
          if (isKeyErrorCode(code)) {
            this.reloadBridge.emit();
          }
        },
      });
  }

  protected clear(field: string): void {
    if (this.busy() !== null) {
      return;
    }
    const bridge = this.bridge();
    const entry = this.entry();
    this.busy.set(field);
    this.setMessage(field, null, null);
    this.service
      .clearSecret(bridge.id, entry.id, field)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(null);
          const current = this.entry();
          this.entryChange.emit({
            ...current,
            secrets: (current.secrets ?? []).filter((s) => s.field !== field),
          });
          this.setMessage(field, null, 'Cleared.');
          this.logging.logEvent('BridgeCredentials_Cleared', {
            kind: entry.kind,
            field,
            context: this.context(),
          });
        },
        error: (error: unknown) => {
          this.busy.set(null);
          this.setMessage(field, this.failureMessage(error), null);
          this.logging.logEvent('BridgeCredentials_Failed', {
            field,
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
    this.logging.logEvent('BridgeCredentials_SnippetCopied', {
      kind: this.entry().kind,
      context: this.context(),
    });
  }

  private failureMessage(error: unknown): string {
    if (error instanceof CredentialSealingError) {
      return error.reason === 'unavailable'
        ? "This browser can't encrypt credentials. Use an up-to-date browser over https."
        : "This bridge's encryption key isn't valid, so nothing was sent. Refresh the page.";
    }
    return bridgeErrorMessage(error, () => null);
  }

  private setMessage(
    field: string,
    error: string | null,
    note: string | null
  ): void {
    this.errors.update((all) => withEntry(all, field, error));
    this.notes.update((all) => withEntry(all, field, note));
  }
}

function withEntry(
  all: Readonly<Record<string, string>>,
  field: string,
  value: string | null
): Readonly<Record<string, string>> {
  const next = { ...all };
  if (value === null) {
    delete next[field];
  } else {
    next[field] = value;
  }
  return next;
}
