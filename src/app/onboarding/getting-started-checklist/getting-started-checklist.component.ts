import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { LoggingService } from '../../core/services/logging.service';
import { MyAchievements } from '../../core/types/achievement';
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
  imports: [MatButtonModule, MatIconModule, RouterLink],
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

  /** The optional material is not counted. */
  protected readonly doneCount = computed(
    () => Number(this.printerDone()) + Number(this.printDone())
  );

  ngOnInit(): void {
    this.logging.logEvent('GettingStarted_Shown');
  }

  protected clicked(item: GettingStartedItem): void {
    this.logging.logEvent('GettingStarted_ItemClicked', { item });
  }

  protected addPrinter(): void {
    this.clicked('printer');
    openQuickAddPrinterDialog(this.dialog, {
      source: 'checklist',
      // Only eligible users see the checklist, and the notice writes setting 26 only if unset.
      showEmailNotice: true,
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
    void this.onboarding.dismissChecklist();
    this.dismissed.emit();
  }
}
