import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { LoggingService } from '../../core/services/logging.service';
import { MyAchievements } from '../../core/types/achievement';
import { InlineEmailNoticeComponent } from '../inline-email-notice/inline-email-notice.component';
import { GETTING_STARTED_KEYS } from '../onboarding-api.service';
import { OnboardingService } from '../onboarding.service';
import { openQuickAddPrinterDialog } from '../quick-add-printer/quick-add-printer-dialog.component';

export type GettingStartedItem = 'printer' | 'material' | 'print' | 'automatic';

/**
 * The new user's card above the prints list: add a printer, optionally a material, then log a
 * first print. Progress counts the printer and the print only. The slot decides whether it shows.
 */
@Component({
  selector: 'app-getting-started-checklist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    RouterLink,
    InlineEmailNoticeComponent,
  ],
  templateUrl: './getting-started-checklist.component.html',
  styleUrl: './getting-started-checklist.component.scss',
})
export class GettingStartedChecklistComponent implements OnInit {
  private readonly onboarding = inject(OnboardingService);
  private readonly logging = inject(LoggingService);
  private readonly dialog = inject(MatDialog);

  readonly me = input.required<MyAchievements>();

  /** The user closed the card; the setting is already being written. */
  readonly dismissed = output<void>();
  /** The quick-add dialog saved a printer, so the badges are worth re-reading. */
  readonly printerAdded = output<void>();

  protected readonly printerDone = computed(() =>
    OnboardingService.hasEarned(this.me(), GETTING_STARTED_KEYS.printer)
  );
  protected readonly materialDone = computed(() =>
    OnboardingService.hasEarned(this.me(), GETTING_STARTED_KEYS.material)
  );
  protected readonly printDone = computed(() =>
    OnboardingService.hasEarned(this.me(), GETTING_STARTED_KEYS.print)
  );

  /** Setting 26 was unset when the card opened; the global banner is hidden meanwhile. */
  private readonly noticePending = signal(false);
  protected readonly showEmailNotice = computed(
    () => this.noticePending() && !this.onboarding.noticeAcknowledged()
  );

  /** The optional material is not counted. */
  protected readonly doneCount = computed(
    () => Number(this.printerDone()) + Number(this.printDone())
  );

  ngOnInit(): void {
    this.logging.logEvent('GettingStarted_Shown');
    void this.onboarding
      .emailNoticePending()
      .then((pending) => this.noticePending.set(pending));
  }

  /** Any action on the card counts as having seen its inline email notice. */
  protected clicked(item: GettingStartedItem): void {
    this.logging.logEvent('GettingStarted_ItemClicked', { item });
    void this.onboarding.acknowledgeEmailNotice();
  }

  protected addPrinter(): void {
    // Read before the click acknowledges it, so the dialog repeats a notice only the user
    // has not acknowledged yet.
    const showEmailNotice = !this.onboarding.noticeAcknowledged();
    this.clicked('printer');
    openQuickAddPrinterDialog(this.dialog, {
      source: 'checklist',
      showEmailNotice,
    })
      .afterClosed()
      .subscribe((printer) => {
        if (printer) {
          this.printerAdded.emit();
        }
      });
  }

  protected dismiss(): void {
    this.logging.logEvent('GettingStarted_Dismissed', {
      doneCount: this.doneCount(),
    });
    void this.onboarding.acknowledgeEmailNotice();
    void this.onboarding.dismissChecklist();
    this.dismissed.emit();
  }
}
