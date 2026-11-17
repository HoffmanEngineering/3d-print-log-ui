import type { MockedObject } from 'vitest';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Routes } from '@angular/router';
import { Subject } from 'rxjs';
import { LoggingService } from '../../core/services/logging.service';
import { PrinterDetail } from '../../core/services/printer.service';
import { MyAchievements } from '../../core/types/achievement';
import { OnboardingService } from '../onboarding.service';
import { QuickAddPrinterDialogComponent } from '../quick-add-printer/quick-add-printer-dialog.component';
import { GettingStartedChecklistComponent } from './getting-started-checklist.component';

// These specs navigate (a link click, a save), and a route the TestBed doesn't know
// fails with an unhandled 'Cannot match any routes', which fails the run.
const ANYWHERE: Routes = [{ path: '**', children: [] }];

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
  let onboarding: MockedObject<OnboardingService>;
  let logging: MockedObject<LoggingService>;
  let dialog: MockedObject<MatDialog>;
  let closed: Subject<PrinterDetail | undefined>;
  let noticeAcknowledged: WritableSignal<boolean>;
  let noticePending: boolean;

  async function renderSettled(earned: string[]): Promise<HTMLElement> {
    const el = render(earned);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    return el;
  }

  const notice = () =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="inline-email-notice"]'
    );

  function render(earned: string[]): HTMLElement {
    fixture = TestBed.createComponent(GettingStartedChecklistComponent);
    fixture.componentRef.setInput('me', achievementsWith(earned));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const item = (key: string) =>
    fixture.debugElement.query(By.css(`[data-cy="getting-started-${key}"]`));

  beforeEach(() => {
    noticeAcknowledged = signal(false);
    noticePending = true;
    onboarding = {
      dismissChecklist: vi.fn().mockName('OnboardingService.dismissChecklist'),
      acknowledgeEmailNotice: vi
        .fn()
        .mockName('OnboardingService.acknowledgeEmailNotice'),
      emailNoticePending: vi
        .fn()
        .mockName('OnboardingService.emailNoticePending'),
      noticeAcknowledged,
    } as unknown as MockedObject<OnboardingService>;
    onboarding.dismissChecklist.mockResolvedValue(undefined);
    onboarding.acknowledgeEmailNotice.mockImplementation(async () => {
      noticeAcknowledged.set(true);
    });
    onboarding.emailNoticePending.mockImplementation(async () => noticePending);
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;
    closed = new Subject();
    dialog = {
      open: vi.fn().mockName('MatDialog.open'),
    } as unknown as MockedObject<MatDialog>;
    dialog.open.mockReturnValue({ afterClosed: () => closed } as never);

    TestBed.configureTestingModule({
      imports: [GettingStartedChecklistComponent],
      providers: [
        provideRouter(ANYWHERE),
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
    expect(item('printer').nativeElement.classList.contains('done')).toBe(true);
  });

  it('does not count the optional material', () => {
    const el = render(['first-material']);
    expect(el.textContent).toContain('0 of 2 done');
    expect(item('material').nativeElement.classList.contains('done')).toBe(
      true
    );
  });

  it('logs GettingStarted_Shown once', () => {
    render([]);
    fixture.detectChanges();
    expect(
      vi
        .mocked(logging.logEvent)
        .mock.calls.filter(([name]) => name === 'GettingStarted_Shown').length
    ).toBe(1);
  });

  it('opens the quick-add dialog from the printer item', () => {
    render([]);
    (item('printer').nativeElement as HTMLButtonElement).click();

    expect(dialog.open).toHaveBeenCalledWith(
      QuickAddPrinterDialogComponent,
      expect.objectContaining({
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
    const added = vi.fn();
    fixture.componentInstance.printerAdded.subscribe(added);

    (item('printer').nativeElement as HTMLButtonElement).click();
    closed.next({ id: 5 } as PrinterDetail);

    expect(added).toHaveBeenCalled();
  });

  it('does not emit printerAdded when the dialog is canceled', () => {
    render([]);
    const added = vi.fn();
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
    const dismissed = vi.fn();
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

  describe('inline email notice', () => {
    it('shows the compact notice while setting 26 is unset', async () => {
      await renderSettled([]);
      expect(notice()).not.toBeNull();
    });

    it('hides the notice when setting 26 is already set', async () => {
      noticePending = false;
      await renderSettled([]);
      expect(notice()).toBeNull();
    });

    const actions: [string, () => void][] = [
      [
        'the printer item',
        () => (item('printer').nativeElement as HTMLElement).click(),
      ],
      [
        'the material link',
        () => (item('material').nativeElement as HTMLElement).click(),
      ],
      [
        'the print link',
        () => (item('print').nativeElement as HTMLElement).click(),
      ],
      [
        'the automatic link',
        () => (item('automatic').nativeElement as HTMLElement).click(),
      ],
      [
        'dismiss',
        () =>
          (
            fixture.debugElement.query(
              By.css('button[aria-label="Dismiss getting started"]')
            ).nativeElement as HTMLButtonElement
          ).click(),
      ],
    ];
    for (const [name, act] of actions) {
      it(`acknowledges the notice on ${name}`, async () => {
        await renderSettled([]);
        act();
        expect(onboarding.acknowledgeEmailNotice).toHaveBeenCalledTimes(1);
      });
    }

    it('hides the notice once acknowledged', async () => {
      await renderSettled([]);
      (item('material').nativeElement as HTMLElement).click();
      fixture.detectChanges();
      expect(notice()).toBeNull();
    });

    it('does not repeat the notice in the dialog once it was acknowledged', async () => {
      await renderSettled([]);
      noticeAcknowledged.set(true);
      fixture.detectChanges();
      (item('printer').nativeElement as HTMLButtonElement).click();

      expect(dialog.open).toHaveBeenCalledWith(
        QuickAddPrinterDialogComponent,
        expect.objectContaining({
          data: { source: 'checklist', showEmailNotice: false },
        })
      );
    });
  });
});
