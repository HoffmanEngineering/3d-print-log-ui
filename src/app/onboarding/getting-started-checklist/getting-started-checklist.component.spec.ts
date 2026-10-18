import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { LoggingService } from '../../core/services/logging.service';
import { PrinterDetail } from '../../core/services/printer.service';
import { MyAchievements } from '../../core/types/achievement';
import { OnboardingService } from '../onboarding.service';
import { QuickAddPrinterDialogComponent } from '../quick-add-printer/quick-add-printer-dialog.component';
import { GettingStartedChecklistComponent } from './getting-started-checklist.component';

function achievementsWith(earned: string[]): MyAchievements {
  return {
    earnedTierCount: earned.length,
    totalTierCount: 3,
    families: ['first-printer', 'first-material', 'first-print'].map((key) => ({
      key,
      tiers: earned.includes(key)
        ? [{ tier: 1, unlockedAt: '2026-10-18', retroactive: false }]
        : [],
      progress: null,
    })),
    revealedHidden: [],
    nextHint: null,
  } as unknown as MyAchievements;
}

describe('GettingStartedChecklistComponent', () => {
  let fixture: ComponentFixture<GettingStartedChecklistComponent>;
  let onboarding: jasmine.SpyObj<OnboardingService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let closed: Subject<PrinterDetail | undefined>;

  function render(earned: string[]): HTMLElement {
    fixture = TestBed.createComponent(GettingStartedChecklistComponent);
    fixture.componentRef.setInput('me', achievementsWith(earned));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const item = (key: string) =>
    fixture.debugElement.query(By.css(`[data-cy="getting-started-${key}"]`));

  beforeEach(() => {
    onboarding = jasmine.createSpyObj<OnboardingService>('OnboardingService', [
      'dismissChecklist',
    ]);
    onboarding.dismissChecklist.and.resolveTo();
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    closed = new Subject();
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => closed } as never);

    TestBed.configureTestingModule({
      imports: [GettingStartedChecklistComponent],
      providers: [
        provideRouter([]),
        { provide: OnboardingService, useValue: onboarding },
        { provide: LoggingService, useValue: logging },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  it('lists the three items and the automatic sending link', () => {
    const el = render([]);
    expect(el.textContent).toContain('Add a printer');
    expect(el.textContent).toContain('Add a material (optional)');
    expect(el.textContent).toContain('Log your first print');

    const material = item('material').nativeElement as HTMLAnchorElement;
    expect(material.getAttribute('href')).toBe('/materials/new');
    const print = item('print').nativeElement as HTMLAnchorElement;
    expect(print.getAttribute('href')).toBe('/prints/new/edit?onboarding=1');
    const automatic = item('automatic').nativeElement as HTMLAnchorElement;
    expect(automatic.textContent).toContain('Send prints automatically');
    expect(automatic.getAttribute('href')).toBe('/welcome?step=3');
  });

  it('shows "0 of 2 done" with nothing earned', () => {
    const el = render([]);
    expect(el.textContent).toContain('0 of 2 done');
  });

  it('shows "1 of 2 done" when only first-printer is held', () => {
    const el = render(['first-printer']);
    expect(el.textContent).toContain('1 of 2 done');
    expect(item('printer').nativeElement.classList.contains('done')).toBeTrue();
  });

  it('does not count the optional material', () => {
    const el = render(['first-material']);
    expect(el.textContent).toContain('0 of 2 done');
    expect(
      item('material').nativeElement.classList.contains('done')
    ).toBeTrue();
  });

  it('logs GettingStarted_Shown once', () => {
    render([]);
    fixture.detectChanges();
    expect(
      logging.logEvent.calls
        .allArgs()
        .filter(([name]) => name === 'GettingStarted_Shown').length
    ).toBe(1);
  });

  it('opens the quick-add dialog from the printer item', () => {
    render([]);
    (item('printer').nativeElement as HTMLButtonElement).click();

    expect(dialog.open).toHaveBeenCalledWith(
      QuickAddPrinterDialogComponent,
      jasmine.objectContaining({
        data: { source: 'checklist', showEmailNotice: true },
      })
    );
    expect(logging.logEvent).toHaveBeenCalledWith(
      'GettingStarted_ItemClicked',
      {
        item: 'printer',
      }
    );
  });

  it('emits printerAdded when the dialog closes with a printer', () => {
    render([]);
    const added = jasmine.createSpy('printerAdded');
    fixture.componentInstance.printerAdded.subscribe(added);

    (item('printer').nativeElement as HTMLButtonElement).click();
    closed.next({ id: 5 } as PrinterDetail);

    expect(added).toHaveBeenCalled();
  });

  it('does not emit printerAdded when the dialog is canceled', () => {
    render([]);
    const added = jasmine.createSpy('printerAdded');
    fixture.componentInstance.printerAdded.subscribe(added);

    (item('printer').nativeElement as HTMLButtonElement).click();
    closed.next(undefined);

    expect(added).not.toHaveBeenCalled();
  });

  it('logs the clicked link item', () => {
    render([]);
    (item('material').nativeElement as HTMLAnchorElement).click();
    expect(logging.logEvent).toHaveBeenCalledWith(
      'GettingStarted_ItemClicked',
      {
        item: 'material',
      }
    );
  });

  it('dismiss writes the setting, logs doneCount and emits dismissed', () => {
    render(['first-printer']);
    const dismissed = jasmine.createSpy('dismissed');
    fixture.componentInstance.dismissed.subscribe(dismissed);

    const button = fixture.debugElement.query(
      By.css('button[aria-label="Dismiss getting started"]')
    ).nativeElement as HTMLButtonElement;
    button.click();

    expect(onboarding.dismissChecklist).toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith('GettingStarted_Dismissed', {
      doneCount: 1,
    });
    expect(dismissed).toHaveBeenCalled();
  });
});
