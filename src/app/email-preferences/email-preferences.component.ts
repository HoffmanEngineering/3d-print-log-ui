import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { LoggingService } from '../core/services/logging.service';
import { DeferredSkeletonController } from '../shared/skeleton/deferred-skeleton';
import {
  EmailPreferences,
  EmailPreferencesApiService,
} from './email-preferences-api.service';
import {
  decodeUnsubscribeCategory,
  readEmailTokenFragment,
} from './email-token';

export type EmailPreferencesPhase =
  | 'loading'
  | 'invalid'
  | 'confirm-unsubscribe'
  | 'unsubscribed'
  | 'preferences'
  | 'error';

/** UserSettingType ids the API reports, as the reader knows them. */
const CATEGORY_LABELS: Record<number, string> = {
  22: 'all emails',
  23: 'onboarding tips',
  24: 'monthly recaps',
  25: 'printer alerts',
};

const CATEGORIES = ['onboarding', 'monthlyRecap', 'printerSilent'] as const;

/**
 * `/email-preferences`: where unsubscribe and manage links from emails land. Public and
 * token-authenticated. The token arrives in the fragment (never sent to a server by the
 * browser), is removed from the address bar before anything else happens, and then travels
 * only in the `X-Email-Token` header.
 */
@Component({
  selector: 'app-email-preferences',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './email-preferences.component.html',
  styleUrl: './email-preferences.component.scss',
})
export class EmailPreferencesComponent implements OnInit {
  private readonly api = inject(EmailPreferencesApiService);
  private readonly logging = inject(LoggingService);
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly loading = new DeferredSkeletonController();

  private token = '';

  readonly phase = signal<EmailPreferencesPhase>('loading');
  readonly showSpinner = this.loading.visible;
  /** "monthly recaps", or null when the token's category could not be read. */
  readonly pendingCategory = signal<string | null>(null);
  readonly unsubscribedFrom = signal('');
  readonly maskedEmail = signal('');
  readonly busy = signal(false);
  readonly saved = signal(false);
  readonly saveFailed = signal(false);

  readonly form = new FormGroup({
    all: new FormControl(true, { nonNullable: true }),
    onboarding: new FormControl(true, { nonNullable: true }),
    monthlyRecap: new FormControl(true, { nonNullable: true }),
    printerSilent: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    this.title.setTitle('Email preferences | 3D Print Log');
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
    inject(DestroyRef).onDestroy(() => {
      this.meta.removeTag('name="robots"');
      this.loading.destroy();
    });

    this.form.controls.all.valueChanges.subscribe((on) => this.applyMaster(on));
    this.form.valueChanges.subscribe(() => this.saved.set(false));
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    const location = this.document.location;
    const fragment = readEmailTokenFragment(location.hash);

    // Out of the address bar, history and any later telemetry before anything else runs.
    this.document.defaultView?.history.replaceState(
      null,
      '',
      location.pathname + location.search
    );

    if (!fragment) {
      this.phase.set('invalid');
      return;
    }

    this.token = fragment.token;
    if (fragment.kind === 'unsubscribe') {
      const category = decodeUnsubscribeCategory(fragment.token);
      this.pendingCategory.set(
        category === null ? null : (CATEGORY_LABELS[category] ?? null)
      );
      this.phase.set('confirm-unsubscribe');
      return;
    }

    this.loading.start();
    this.api.read(this.token).subscribe({
      next: (prefs) => {
        this.loading.stop();
        this.maskedEmail.set(prefs.maskedEmail);
        this.form.setValue(
          {
            all: prefs.all,
            onboarding: prefs.onboarding,
            monthlyRecap: prefs.monthlyRecap,
            printerSilent: prefs.printerSilent,
          },
          { emitEvent: false }
        );
        this.applyMaster(prefs.all);
        this.phase.set('preferences');
      },
      error: (e: unknown) => {
        this.loading.stop();
        this.fail(e);
      },
    });
  }

  confirmUnsubscribe(): void {
    this.busy.set(true);
    this.api.confirmUnsubscribe(this.token).subscribe({
      next: ({ category }) => {
        this.busy.set(false);
        this.unsubscribedFrom.set(CATEGORY_LABELS[category] ?? 'these emails');
        this.phase.set('unsubscribed');
        this.logging.logEvent('EmailPreferences_Unsubscribed', { category });
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.fail(e);
      },
    });
  }

  save(): void {
    this.busy.set(true);
    this.saved.set(false);
    this.saveFailed.set(false);
    const preferences: EmailPreferences = this.form.getRawValue();
    this.api.update(this.token, preferences).subscribe({
      next: () => {
        this.busy.set(false);
        this.saved.set(true);
        this.logging.logEvent('EmailPreferences_Saved', { ...preferences });
      },
      error: (e: unknown) => {
        this.busy.set(false);
        if (e instanceof HttpErrorResponse && e.status === 400) {
          this.phase.set('invalid');
          return;
        }
        this.saveFailed.set(true);
        this.logging.logException(e as Error);
      },
    });
  }

  /** The categories keep their values while the master switch is off; they just can't change. */
  private applyMaster(on: boolean): void {
    for (const key of CATEGORIES) {
      if (on) {
        this.form.controls[key].enable({ emitEvent: false });
      } else {
        this.form.controls[key].disable({ emitEvent: false });
      }
    }
  }

  /** A 400 is a bad, expired or replaced token; anything else is worth retrying later. */
  private fail(e: unknown): void {
    if (e instanceof HttpErrorResponse && e.status === 400) {
      this.phase.set('invalid');
      return;
    }
    this.logging.logException(e as Error);
    this.phase.set('error');
  }
}
