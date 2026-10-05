import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concatMap, from, Subject } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';

import { LoggingService } from '../../core/services/logging.service';
import {
  UserSettingService,
  UserSettingType,
} from '../../core/services/user-setting.service';

export type CelebrationLevel = 'on' | 'quiet' | 'off';

/** The Achievements section of settings: profile visibility and how loudly to celebrate. */
@Component({
  selector: 'app-achievement-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    RouterLink,
  ],
  template: `
    <div data-testid="achievement-settings" [formGroup]="form">
      <h2>Achievements</h2>
      <p>
        Badges you earn as you log prints.
        <a routerLink="/docs/achievements">How achievements work</a>
      </p>

      <div class="row">
        <mat-slide-toggle
          formControlName="showOnProfile"
          data-testid="achievements-show-on-profile"
        >
          Show my achievements on my profile
        </mat-slide-toggle>
      </div>

      <div class="row">
        <span id="celebrations-label">Celebrations</span>
        <mat-button-toggle-group
          formControlName="celebrations"
          aria-labelledby="celebrations-label"
          data-testid="achievements-celebrations"
        >
          <mat-button-toggle value="on">Full</mat-button-toggle>
          <mat-button-toggle value="quiet">Quiet</mat-button-toggle>
          <mat-button-toggle value="off">Off</mat-button-toggle>
        </mat-button-toggle-group>
      </div>
      <p class="help">
        Full plays a celebration for big moments. Quiet shows a small card only.
        Off shows nothing, and new badges wait in your collection.
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
    .help {
      font-size: 13px;
      opacity: 0.75;
    }
  `,
})
export class AchievementSettingsComponent implements OnInit {
  private readonly settings = inject(UserSettingService);
  private readonly logging = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormGroup({
    showOnProfile: new FormControl(
      { value: true, disabled: true },
      { nonNullable: true }
    ),
    celebrations: new FormControl<CelebrationLevel>(
      { value: 'on', disabled: true },
      { nonNullable: true }
    ),
  });

  /** One save at a time, in order: the last value chosen is the last value stored. */
  private readonly saves = new Subject<{
    type: UserSettingType;
    value: string;
  }>();

  async ngOnInit(): Promise<void> {
    this.saves
      .pipe(
        concatMap(({ type, value }) => from(this.save(type, value))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    try {
      const [show, celebrations] = await Promise.all([
        this.settings.getCurrentUsersSettingByType(
          UserSettingType.Achievements_ShowOnProfile
        ),
        this.settings.getCurrentUsersSettingByType(
          UserSettingType.Achievements_Celebrations
        ),
      ]);
      this.form.setValue(
        {
          showOnProfile: show?.value !== 'false',
          celebrations:
            celebrations?.value === 'quiet' || celebrations?.value === 'off'
              ? celebrations.value
              : 'on',
        },
        { emitEvent: false }
      );
    } catch (e) {
      // Leave the controls disabled: enabling them over unknown stored values would let a
      // click overwrite a choice the user never saw.
      this.logging.logException(e as Error);
      return;
    }

    // Enabled only now, so nothing chosen during the load is silently overwritten by it.
    this.form.enable({ emitEvent: false });
    this.form.controls.showOnProfile.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) =>
        this.saves.next({
          type: UserSettingType.Achievements_ShowOnProfile,
          value: String(v),
        })
      );
    this.form.controls.celebrations.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) =>
        this.saves.next({
          type: UserSettingType.Achievements_Celebrations,
          value: v,
        })
      );
  }

  private async save(type: UserSettingType, value: string): Promise<void> {
    this.logging.logEvent(
      'AchievementSettings_Changed',
      this.form.getRawValue()
    );
    try {
      await this.settings.addOrUpdateSetting(type, value);
    } catch (e) {
      this.logging.logException(e as Error);
    }
  }
}
