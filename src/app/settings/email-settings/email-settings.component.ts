import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { catchError, concatMap, from, map, of, Subject } from 'rxjs';

import {
  AccountEmail,
  AccountEmailService,
} from '../../core/services/account-email.service';
import { LoggingService } from '../../core/services/logging.service';
import {
  UserSettingService,
  UserSettingType,
} from '../../core/services/user-setting.service';
import { isEmailPreferenceEnabled } from '../../core/utils/email-preference';

interface AccountState extends AccountEmail {
  state: 'loading' | 'ready' | 'error';
}

type EmailSetting = 'all' | 'onboarding' | 'monthlyRecap' | 'printerSilent';

const SETTING_TYPES: Record<EmailSetting, UserSettingType> = {
  all: UserSettingType.Email_All,
  onboarding: UserSettingType.Email_Onboarding,
  monthlyRecap: UserSettingType.Email_MonthlyRecap,
  printerSilent: UserSettingType.Email_PrinterSilent,
};

const CATEGORIES: EmailSetting[] = [
  'onboarding',
  'monthlyRecap',
  'printerSilent',
];

/** The Email section of settings: the address we send to, a master switch and one toggle per kind of email. */
@Component({
  selector: 'app-email-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatSlideToggleModule, RouterLink],
  template: `
    <div id="email" data-testid="email-settings" [formGroup]="form">
      <h2>Email</h2>
      @switch (account().state) {
        @case ('ready') {
          @if (account().email; as email) {
            <p data-testid="email-address">
              We send to <strong>{{ email }}</strong
              >, the address on your sign-in account.
            </p>
            @if (!account().verified) {
              <p class="warning" data-testid="email-unverified">
                This address isn't verified yet, so we won't email it. Check
                your inbox for the verification email from your sign-in
                provider.
              </p>
            }
          } @else {
            <p data-testid="email-missing">
              Your sign-in account has no email address, so we can't email you.
            </p>
          }
        }
        @case ('error') {
          <p>We couldn't load your email address right now.</p>
        }
      }

      <div class="row">
        <mat-slide-toggle formControlName="all" data-testid="email-all">
          Email me about my account activity
        </mat-slide-toggle>
      </div>
      <div class="categories">
        <div class="row">
          <mat-slide-toggle
            formControlName="onboarding"
            data-testid="email-onboarding"
          >
            Onboarding tips
          </mat-slide-toggle>
        </div>
        <div class="row">
          <mat-slide-toggle
            formControlName="monthlyRecap"
            data-testid="email-monthly-recap"
          >
            Monthly recap
          </mat-slide-toggle>
        </div>
        <div class="row">
          <mat-slide-toggle
            formControlName="printerSilent"
            data-testid="email-printer-silent"
          >
            Printer stopped reporting alerts
          </mat-slide-toggle>
        </div>
      </div>
      <p class="help">
        Account and security messages are sent regardless.
        <a routerLink="/docs/email-notifications">What we send and when</a>
      </p>
    </div>
  `,
  styles: `
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 12px 0;
    }
    .categories {
      margin-left: 24px;
    }
    .help {
      font-size: 13px;
      opacity: 0.75;
    }
    .warning {
      font-weight: 500;
    }
  `,
})
export class EmailSettingsComponent implements OnInit {
  private readonly settings = inject(UserSettingService);
  private readonly logging = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly account = toSignal<AccountState, AccountState>(
    inject(AccountEmailService)
      .get()
      .pipe(
        map((a: AccountEmail): AccountState => ({ state: 'ready', ...a })),
        catchError(() =>
          of<AccountState>({ state: 'error', email: null, verified: false })
        )
      ),
    { initialValue: { state: 'loading', email: null, verified: false } }
  );

  readonly form = new FormGroup({
    all: new FormControl(
      { value: true, disabled: true },
      { nonNullable: true }
    ),
    onboarding: new FormControl(
      { value: true, disabled: true },
      { nonNullable: true }
    ),
    monthlyRecap: new FormControl(
      { value: true, disabled: true },
      { nonNullable: true }
    ),
    printerSilent: new FormControl(
      { value: true, disabled: true },
      { nonNullable: true }
    ),
  });

  /** One save at a time, in order: the last value chosen is the last value stored. */
  private readonly saves = new Subject<{
    setting: EmailSetting;
    value: boolean;
  }>();

  async ngOnInit(): Promise<void> {
    this.saves
      .pipe(
        concatMap(({ setting, value }) => from(this.save(setting, value))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    try {
      const keys = Object.keys(SETTING_TYPES) as EmailSetting[];
      const values = await Promise.all(
        keys.map((k) =>
          this.settings.getCurrentUsersSettingByType(SETTING_TYPES[k])
        )
      );
      keys.forEach((k, i) =>
        this.form.controls[k].setValue(
          isEmailPreferenceEnabled(values[i]?.value),
          { emitEvent: false }
        )
      );
    } catch (e) {
      // Leave the controls disabled: enabling them over unknown stored values would let a
      // click overwrite a choice the user never saw.
      this.logging.logException(e as Error);
      return;
    }

    // Enabled only now, so nothing chosen during the load is silently overwritten by it.
    this.form.controls.all.enable({ emitEvent: false });
    this.applyMaster(this.form.controls.all.value);

    for (const key of Object.keys(SETTING_TYPES) as EmailSetting[]) {
      this.form.controls[key].valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((value) => {
          if (key === 'all') {
            this.applyMaster(value);
          }
          this.saves.next({ setting: key, value });
        });
    }
  }

  /** The categories keep their own values while the master switch is off; they just can't be changed. */
  private applyMaster(on: boolean): void {
    for (const key of CATEGORIES) {
      if (on) {
        this.form.controls[key].enable({ emitEvent: false });
      } else {
        this.form.controls[key].disable({ emitEvent: false });
      }
    }
  }

  private async save(setting: EmailSetting, value: boolean): Promise<void> {
    this.logging.logEvent('EmailSettings_Changed', { setting, value });
    try {
      await this.settings.addOrUpdateSetting(
        SETTING_TYPES[setting],
        String(value)
      );
    } catch (e) {
      this.logging.logException(e as Error);
    }
  }
}
