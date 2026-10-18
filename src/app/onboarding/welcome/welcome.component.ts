import { BreakpointObserver } from '@angular/cdk/layout';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatStepperModule } from '@angular/material/stepper';
import {
  ActivatedRoute,
  NavigationExtras,
  Router,
  RouterLink,
} from '@angular/router';
import { take, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FilamentDetail } from '../../core/services/filament.service';
import { GoogleAnalyticsService } from '../../core/services/google-analytics.service';
import { LoggingService } from '../../core/services/logging.service';
import {
  PrinterDetail,
  PrinterService,
} from '../../core/services/printer.service';
import { DeferredSkeletonController } from '../../shared/skeleton/deferred-skeleton';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { InlineEmailNoticeComponent } from '../inline-email-notice/inline-email-notice.component';
import {
  ONBOARDING_LOOKUP_TIMEOUT_MS,
  OnboardingService,
} from '../onboarding.service';
import { QuickAddMaterialComponent } from '../quick-add-material/quick-add-material.component';
import { QuickAddPrinterComponent } from '../quick-add-printer/quick-add-printer.component';
import {
  FirstPrintStepComponent,
  PathChoice,
} from './first-print-step/first-print-step.component';

interface SavedPrinter {
  id: number;
  name: string;
}

const ENTRIES = ['callback', 'guard', 'link'];
const STEP_COUNT = 3;
/** Enough to show every printer a brand-new account could have as chips. */
const PRINTER_PAGE_SIZE = 50;

/**
 * The new-user welcome stepper: add a printer, optionally a material, then pick how to log
 * the first print. Any of Skip setup, Log a print now or Done ends it, recording that the
 * welcome flow and the email notice were seen.
 */
@Component({
  selector: 'app-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatChipsModule,
    MatStepperModule,
    QuickAddPrinterComponent,
    QuickAddMaterialComponent,
    InlineEmailNoticeComponent,
    FirstPrintStepComponent,
    SkeletonComponent,
  ],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
})
export class WelcomeComponent implements OnInit {
  private readonly onboarding = inject(OnboardingService);
  private readonly printerService = inject(PrinterService);
  private readonly logging = inject(LoggingService);
  private readonly analytics = inject(GoogleAnalyticsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly printersSkeleton = new DeferredSkeletonController();

  /**
   * Read once: switching orientation re-renders the steps, which would throw away a
   * half-filled form when a phone rotates. BreakpointObserver never matches on the server.
   */
  readonly orientation: 'vertical' | 'horizontal' = inject(
    BreakpointObserver
  ).isMatched('(max-width: 599.98px)')
    ? 'vertical'
    : 'horizontal';

  readonly selectedIndex = signal(this.initialStep());
  readonly printers = signal<SavedPrinter[]>([]);
  readonly showPrinterForm = signal(true);
  readonly savedMaterial = signal<string | null>(null);
  readonly finishing = signal(false);
  /**
   * False until the first printer summary settles. Before that, step 1 must not render the
   * empty quick-add form and a disabled Continue: for a user who already has a printer that
   * reads as "none yet", and a slow summary left exactly that on screen.
   */
  private readonly printersLoaded = signal(false);
  readonly step1Ready = computed(
    () => this.printersLoaded() && !this.printersSkeleton.visible()
  );
  readonly showPrintersSkeleton = this.printersSkeleton.visible;

  readonly hasPrinter = computed(() => this.printers().length > 0);
  /** With exactly one printer, the new spool goes straight into it. */
  readonly loadIntoPrinterId = computed(() => {
    const list = this.printers();
    return list.length === 1 ? list[0].id : null;
  });

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => this.printersSkeleton.destroy());
  }

  ngOnInit(): void {
    this.logging.logEvent('Welcome_Shown', { entry: this.entry() });
    this.analytics.eventEmitter(
      'tutorial_begin',
      'engagement',
      'tutorial_begin'
    );
    this.printersSkeleton.start();
    this.printerService
      .getCurrentUserPrinterSummaries(1, PRINTER_PAGE_SIZE, '', false)
      .pipe(
        take(1),
        // A summary still pending after the cap is treated as a failed lookup.
        timeout({ first: ONBOARDING_LOOKUP_TIMEOUT_MS }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (page) => {
          if (page.items.length > 0) {
            this.addPrinters(
              page.items.map((p) => ({ id: p.id, name: p.name }))
            );
            this.showPrinterForm.set(false);
          }
          this.printersSettled();
        },
        // A failed lookup still shows the form: onboarding never blocks the user.
        error: (error) => {
          this.logging.logException(error);
          this.printersSettled();
        },
      });
  }

  private printersSettled(): void {
    this.printersSkeleton.stop();
    this.printersLoaded.set(true);
  }

  onStepChange(index: number): void {
    this.selectedIndex.set(index);
  }

  onPrinterSaved(printer: PrinterDetail): void {
    if (printer.id !== null) {
      this.addPrinters([{ id: printer.id, name: printer.name }]);
    }
    this.showPrinterForm.set(false);
  }

  /** A new form instance is a reset one. */
  addAnotherPrinter(): void {
    this.showPrinterForm.set(true);
  }

  onMaterialSaved(filament: FilamentDetail): void {
    this.savedMaterial.set(filament.displayName || filament.materialType);
  }

  continueFrom(step: number): void {
    this.logging.logEvent('Welcome_StepCompleted', {
      step,
      printerCount: this.printers().length,
    });
    this.selectedIndex.set(step);
  }

  skipMaterial(): void {
    this.logging.logEvent('Welcome_StepSkipped', { step: 2 });
    this.selectedIndex.set(2);
  }

  async skipSetup(): Promise<void> {
    if (this.finishing()) {
      return;
    }
    this.logging.logEvent('Welcome_Skipped', {
      atStep: this.selectedIndex() + 1,
    });
    await this.finishThenGo(['/prints']);
  }

  async choosePath(choice: PathChoice): Promise<void> {
    if (this.finishing()) {
      return;
    }
    this.logging.logEvent(
      'Welcome_PathChosen',
      choice.target === null
        ? { path: choice.path }
        : { path: choice.path, target: choice.target }
    );
    if (choice.path === 'manual') {
      await this.finishThenGo(['/prints/new/edit'], {
        queryParams: { onboarding: '1' },
      });
    } else {
      await this.finishThenGo(['/prints']);
    }
  }

  /**
   * Records settings 26 and 29, then navigates. A failed write never keeps the user here.
   */
  private async finishThenGo(
    commands: string[],
    extras?: NavigationExtras
  ): Promise<void> {
    this.finishing.set(true);
    try {
      await Promise.allSettled([
        this.onboarding.acknowledgeEmailNotice(),
        this.onboarding.markWelcomeFinished(),
      ]);
      await (extras
        ? this.router.navigate(commands, extras)
        : this.router.navigate(commands));
    } catch (error) {
      this.logging.logException(
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      this.finishing.set(false);
    }
  }

  private addPrinters(added: SavedPrinter[]): void {
    this.printers.update((list) => [
      ...list,
      ...added.filter((p) => !list.some((existing) => existing.id === p.id)),
    ]);
  }

  private initialStep(): number {
    const step = Number(this.route.snapshot.queryParamMap.get('step'));
    return Number.isInteger(step) && step >= 1 && step <= STEP_COUNT
      ? step - 1
      : 0;
  }

  /** How the user got here: set as navigation state by the auth callback or the guard. */
  private entry(): string {
    const state = this.document.defaultView?.history?.state as
      | { entry?: unknown }
      | null
      | undefined;
    const entry = state?.entry;
    return typeof entry === 'string' && ENTRIES.includes(entry)
      ? entry
      : 'link';
  }
}
