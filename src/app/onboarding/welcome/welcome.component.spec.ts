import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, input, output } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatStepper } from '@angular/material/stepper';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { of, Subject } from 'rxjs';
import { GoogleAnalyticsService } from '../../core/services/google-analytics.service';
import { LoggingService } from '../../core/services/logging.service';
import {
  PrinterDetail,
  PrinterService,
  PrinterSummarySimple,
} from '../../core/services/printer.service';
import { PagedList } from '../../core/types/paging';
import { IS_CORDOVA } from '../../core/utils/platform';
import { OnboardingApiService } from '../onboarding-api.service';
import { OnboardingService } from '../onboarding.service';
import { QuickAddMaterialComponent } from '../quick-add-material/quick-add-material.component';
import {
  QuickAddMode,
  QuickAddPrinterComponent,
  QuickAddSource,
} from '../quick-add-printer/quick-add-printer.component';
import { WelcomeComponent } from './welcome.component';

@Component({ selector: 'app-quick-add-printer', template: '' })
class StubQuickAddPrinterComponent {
  readonly source = input.required<QuickAddSource>();
  readonly showEmailNotice = input(false);
  readonly mode = input<QuickAddMode>('dialog');
  readonly hasSavedPrinters = input(false);
  readonly saved = output<PrinterDetail>();
  readonly continued = output<void>();
}

@Component({ selector: 'app-quick-add-material', template: '' })
class StubQuickAddMaterialComponent {
  readonly loadIntoPrinterId = input<number | null>(null);
  readonly saved = output<unknown>();
}

function summary(id: number, name: string): PrinterSummarySimple {
  return {
    id,
    name,
    make: 'Bambu',
    model: 'X1',
    isActive: true,
    category: { id: 1, name: 'FFF', nickname: 'FFF' },
    loadedFilaments: [],
  } as unknown as PrinterSummarySimple;
}

function page(items: PrinterSummarySimple[]): PagedList<PrinterSummarySimple> {
  return {
    items,
    paging: { totalCount: items.length },
  } as unknown as PagedList<PrinterSummarySimple>;
}

describe('WelcomeComponent', () => {
  let fixture: ComponentFixture<WelcomeComponent>;
  let component: WelcomeComponent;
  let onboarding: jasmine.SpyObj<OnboardingService>;
  let printers: jasmine.SpyObj<PrinterService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let analytics: jasmine.SpyObj<GoogleAnalyticsService>;
  let router: Router;
  let navigate: jasmine.Spy;
  let breakpoints: jasmine.SpyObj<BreakpointObserver>;

  function configure(
    existing: PrinterSummarySimple[] = [],
    query: Record<string, string> = {},
    narrow = false
  ) {
    breakpoints = jasmine.createSpyObj<BreakpointObserver>(
      'BreakpointObserver',
      ['isMatched', 'observe']
    );
    breakpoints.isMatched.and.returnValue(narrow);
    onboarding = jasmine.createSpyObj<OnboardingService>('OnboardingService', [
      'status',
      'markWelcomeFinished',
      'acknowledgeEmailNotice',
    ]);
    onboarding.status.and.resolveTo({
      onboardingEligible: true,
      createdDate: null,
      emailVerified: true,
    });
    onboarding.markWelcomeFinished.and.resolveTo();
    onboarding.acknowledgeEmailNotice.and.resolveTo();
    printers = jasmine.createSpyObj<PrinterService>('PrinterService', [
      'getCurrentUserPrinterSummaries',
    ]);
    printers.getCurrentUserPrinterSummaries.and.returnValue(of(page(existing)));
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    analytics = jasmine.createSpyObj<GoogleAnalyticsService>(
      'GoogleAnalyticsService',
      ['eventEmitter']
    );
    TestBed.configureTestingModule({
      imports: [WelcomeComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
        },
        { provide: OnboardingService, useValue: onboarding },
        { provide: PrinterService, useValue: printers },
        { provide: LoggingService, useValue: logging },
        { provide: GoogleAnalyticsService, useValue: analytics },
        {
          provide: OnboardingApiService,
          useValue: jasmine.createSpyObj('OnboardingApiService', [
            'resendVerificationEmail',
          ]),
        },
        { provide: IS_CORDOVA, useValue: false },
        { provide: BreakpointObserver, useValue: breakpoints },
      ],
    });
    TestBed.overrideComponent(WelcomeComponent, {
      remove: {
        imports: [QuickAddPrinterComponent, QuickAddMaterialComponent],
      },
      add: {
        imports: [StubQuickAddPrinterComponent, StubQuickAddMaterialComponent],
      },
    });
    router = TestBed.inject(Router);
    navigate = spyOn(router, 'navigate').and.resolveTo(true);
  }

  async function render() {
    fixture = TestBed.createComponent(WelcomeComponent);
    component = fixture.componentInstance;
    await settle();
  }

  async function settle() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function el(testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  }

  function stepper(): MatStepper {
    return fixture.debugElement.query(By.directive(MatStepper))
      .componentInstance;
  }

  function printerForm(): StubQuickAddPrinterComponent {
    return fixture.debugElement.query(
      By.directive(StubQuickAddPrinterComponent)
    ).componentInstance;
  }

  function materialForm(): StubQuickAddMaterialComponent {
    return fixture.debugElement.query(
      By.directive(StubQuickAddMaterialComponent)
    ).componentInstance;
  }

  async function goToStep(index: number) {
    stepper().selectedIndex = index;
    await settle();
  }

  it('logs Welcome_Shown and the GA tutorial_begin event on init', async () => {
    configure();
    await render();

    expect(logging.logEvent).toHaveBeenCalledWith('Welcome_Shown', {
      entry: 'link',
    });
    expect(analytics.eventEmitter).toHaveBeenCalledWith(
      'tutorial_begin',
      'engagement',
      'tutorial_begin'
    );
  });

  it('uses the welcome source and no email notice for the inline printer form', async () => {
    configure();
    await render();

    expect(printerForm().source()).toBe('welcome');
    expect(printerForm().mode()).toBe('welcome');
    expect(printerForm().showEmailNotice()).toBeFalse();
  });

  it('leads step 1 with "Step 1 of 3" and the printer question', async () => {
    configure();
    await render();

    const header = fixture.nativeElement.querySelector(
      '.welcome__step-header'
    ) as HTMLElement;
    expect(header.querySelector('p')!.textContent!.trim()).toBe('Step 1 of 3');
    expect(header.querySelector('h2')!.textContent!.trim()).toBe(
      'Which printer do you have?'
    );
    expect(el('step1-continue')).toBeNull();
  });

  it('adds a check chip under "Added" after a save and keeps the same form', async () => {
    configure();
    await render();
    const form = printerForm();
    expect(form.hasSavedPrinters()).toBeFalse();
    expect(el('printer-chips')).toBeNull();

    form.saved.emit({ id: 7, name: 'Voron' } as PrinterDetail);
    await settle();

    const chips = el('printer-chips')!;
    expect(chips.textContent).toContain('Voron');
    expect(chips.querySelector('mat-icon')!.textContent!.trim()).toBe('check');
    expect(
      fixture.nativeElement.querySelector('.welcome__added').textContent
    ).toContain('Added');
    expect(printerForm()).toBe(form);
    expect(form.hasSavedPrinters()).toBeTrue();

    form.saved.emit({ id: 8, name: 'MK4' } as PrinterDetail);
    await settle();
    expect(el('printer-chips')!.querySelectorAll('mat-chip').length).toBe(2);
  });

  it('shows the existing printer when the summary resolves after the first render', async () => {
    configure();
    const response = new Subject<PagedList<PrinterSummarySimple>>();
    printers.getCurrentUserPrinterSummaries.and.returnValue(response);
    await render();

    // While the summary is out, step 1 must not look like "no printers yet".
    expect(
      fixture.debugElement.query(By.directive(StubQuickAddPrinterComponent))
    )
      .withContext('no empty quick-add form before the summary lands')
      .toBeNull();
    expect(el('printer-chips')).toBeNull();

    response.next(page([summary(3, 'MK4S')]));
    response.complete();
    await settle();

    expect(el('printer-chips')!.textContent).toContain('MK4S');
    expect(printerForm().hasSavedPrinters()).toBeTrue();
  });

  it('shows the quick-add form once an empty summary resolves', async () => {
    configure();
    const response = new Subject<PagedList<PrinterSummarySimple>>();
    printers.getCurrentUserPrinterSummaries.and.returnValue(response);
    await render();

    response.next(page([]));
    response.complete();
    await settle();

    expect(printerForm()).toBeTruthy();
    expect(printerForm().hasSavedPrinters()).toBeFalse();
  });

  it('falls back to the quick-add form when the summary fails', async () => {
    configure();
    const response = new Subject<PagedList<PrinterSummarySimple>>();
    printers.getCurrentUserPrinterSummaries.and.returnValue(response);
    await render();

    response.error(new Error('offline'));
    await settle();

    expect(printerForm()).toBeTruthy();
    expect(logging.logException).toHaveBeenCalled();
  });

  it('shows the quick-add form when the summary never settles within 3 s', fakeAsync(() => {
    configure();
    printers.getCurrentUserPrinterSummaries.and.returnValue(
      new Subject<PagedList<PrinterSummarySimple>>()
    );
    fixture = TestBed.createComponent(WelcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick(3000);
    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    expect(printerForm()).toBeTruthy();
    expect(component.step1Ready()).toBeTrue();
  }));

  it('tells the form about a printer that already exists', async () => {
    configure([summary(3, 'Prusa MK4')]);
    await render();

    expect(printerForm().hasSavedPrinters()).toBeTrue();
    expect(el('printer-chips')!.textContent).toContain('Prusa MK4');
  });

  it('links to the full printer form with a return URL', async () => {
    configure();
    await render();

    const link = el('full-printer-form')!;
    expect(link.getAttribute('href')).toBe(
      '/printers/new?returnUrl=%2Fwelcome'
    );
  });

  it('logs Welcome_StepCompleted and moves on when the form continues', async () => {
    configure([summary(3, 'Prusa MK4')]);
    await render();

    printerForm().continued.emit();
    await settle();

    expect(logging.logEvent).toHaveBeenCalledWith('Welcome_StepCompleted', {
      step: 1,
      printerCount: 1,
    });
    expect(stepper().selectedIndex).toBe(1);
  });

  it('loads the material into the only printer', async () => {
    configure([summary(3, 'Prusa MK4')]);
    await render();
    await goToStep(1);

    expect(materialForm().loadIntoPrinterId()).toBe(3);
  });

  it('does not pick a printer for the material when there are two', async () => {
    configure([summary(3, 'Prusa MK4'), summary(4, 'Voron')]);
    await render();
    await goToStep(1);

    expect(materialForm().loadIntoPrinterId()).toBeNull();
  });

  it('"Skip for now" logs Welcome_StepSkipped and goes to step 3', async () => {
    configure([summary(3, 'Prusa MK4')]);
    await render();
    await goToStep(1);

    el('step2-skip')!.click();
    await settle();

    expect(logging.logEvent).toHaveBeenCalledWith('Welcome_StepSkipped', {
      step: 2,
    });
    expect(stepper().selectedIndex).toBe(2);
  });

  it('opens step 3 for ?step=3', async () => {
    configure([], { step: '3' });
    await render();

    expect(stepper().selectedIndex).toBe(2);
  });

  it('Skip setup writes settings 26 and 29, logs, and goes to /prints', async () => {
    configure();
    await render();

    el('skip-setup')!.click();
    await settle();

    expect(onboarding.acknowledgeEmailNotice).toHaveBeenCalled();
    expect(onboarding.markWelcomeFinished).toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith('Welcome_Skipped', {
      atStep: 1,
    });
    expect(navigate).toHaveBeenCalledWith(['/prints']);
  });

  it('Skip setup waits for both writes before navigating', async () => {
    configure();
    let finishWrite!: () => void;
    onboarding.markWelcomeFinished.and.returnValue(
      new Promise<void>((resolve) => (finishWrite = resolve))
    );
    await render();

    const done = component.skipSetup();
    await Promise.resolve();
    expect(navigate).not.toHaveBeenCalled();

    finishWrite();
    await done;
    expect(navigate).toHaveBeenCalledWith(['/prints']);
  });

  it('Skip setup still navigates when markWelcomeFinished rejects', async () => {
    configure();
    onboarding.markWelcomeFinished.and.rejectWith(new Error('offline'));
    await render();

    await component.skipSetup();

    expect(navigate).toHaveBeenCalledWith(['/prints']);
  });

  it('"Log a print now" finishes and opens the onboarding print form', async () => {
    configure([summary(3, 'Prusa MK4')], { step: '3' });
    await render();

    el('path-manual-action')!.click();
    await settle();

    expect(onboarding.markWelcomeFinished).toHaveBeenCalled();
    expect(onboarding.acknowledgeEmailNotice).toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith('Welcome_PathChosen', {
      path: 'manual',
    });
    expect(navigate).toHaveBeenCalledWith(['/prints/new/edit'], {
      queryParams: { onboarding: '1' },
    });
  });

  it('Done on the slicer card finishes and goes to /prints', async () => {
    configure([summary(3, 'Prusa MK4')], { step: '3' });
    await render();

    await component.choosePath({ path: 'slicer', target: 'cura' });

    expect(onboarding.markWelcomeFinished).toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith('Welcome_PathChosen', {
      path: 'slicer',
      target: 'cura',
    });
    expect(navigate).toHaveBeenCalledWith(['/prints']);
  });

  it('logs the entry passed as navigation state', async () => {
    configure();
    const previous = history.state;
    history.replaceState({ entry: 'callback' }, '');
    try {
      await render();
    } finally {
      history.replaceState(previous, '');
    }

    expect(logging.logEvent).toHaveBeenCalledWith('Welcome_Shown', {
      entry: 'callback',
    });
  });

  it('picks a vertical stepper once, below 600px, without watching for changes', async () => {
    configure([], {}, true);
    await render();

    expect(breakpoints.isMatched).toHaveBeenCalledWith('(max-width: 599.98px)');
    expect(breakpoints.observe).not.toHaveBeenCalled();
    expect(stepper().orientation).toBe('vertical');
  });

  it('picks a horizontal stepper at 600px and above', async () => {
    configure([], {}, false);
    await render();

    expect(stepper().orientation).toBe('horizontal');
  });

  it('logs a failed navigation instead of rejecting', async () => {
    configure();
    const failure = new Error('navigation failed');
    navigate.and.rejectWith(failure);
    await render();

    await expectAsync(component.skipSetup()).toBeResolved();

    expect(logging.logException).toHaveBeenCalledWith(failure);
    expect((el('skip-setup') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('shows the email notice in the footer', async () => {
    configure();
    await render();

    expect(el('inline-email-notice')).not.toBeNull();
  });
});
