import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { LoggingService } from '../../../core/services/logging.service';
import { IS_CORDOVA } from '../../../core/utils/platform';
import {
  OnboardingApiService,
  OnboardingStatus,
  ResendResult,
} from '../../onboarding-api.service';
import { OnboardingService } from '../../onboarding.service';
import {
  FirstPrintStepComponent,
  PathChoice,
} from './first-print-step.component';

const UNVERIFIED: OnboardingStatus = {
  onboardingEligible: true,
  createdDate: '2026-10-18T00:00:00Z',
  emailVerified: false,
};

describe('FirstPrintStepComponent', () => {
  let fixture: ComponentFixture<FirstPrintStepComponent>;
  let component: FirstPrintStepComponent;
  let onboarding: jasmine.SpyObj<OnboardingService>;
  let api: jasmine.SpyObj<OnboardingApiService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let choices: PathChoice[];

  function configure(cordova = false, status = UNVERIFIED) {
    onboarding = jasmine.createSpyObj<OnboardingService>('OnboardingService', [
      'status',
    ]);
    onboarding.status.and.resolveTo(status);
    api = jasmine.createSpyObj<OnboardingApiService>('OnboardingApiService', [
      'resendVerificationEmail',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    TestBed.configureTestingModule({
      imports: [FirstPrintStepComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: OnboardingService, useValue: onboarding },
        { provide: OnboardingApiService, useValue: api },
        { provide: LoggingService, useValue: logging },
        { provide: IS_CORDOVA, useValue: cordova },
      ],
    });
  }

  async function render() {
    fixture = TestBed.createComponent(FirstPrintStepComponent);
    component = fixture.componentInstance;
    choices = [];
    component.chosen.subscribe((c) => choices.push(c));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function el(testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  }

  async function settle() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('emits the manual path when "Log a print now" is clicked', async () => {
    configure();
    await render();

    el('path-manual-action')!.click();

    expect(choices).toEqual([{ path: 'manual', target: null }]);
  });

  it('shows all three cards in a browser', async () => {
    configure(false);
    await render();

    expect(el('path-manual')).not.toBeNull();
    expect(el('path-slicer')).not.toBeNull();
    expect(el('path-integration')).not.toBeNull();
  });

  it('hides the slicer and integration cards under Cordova', async () => {
    configure(true);
    await render();

    expect(el('path-manual')).not.toBeNull();
    expect(el('path-slicer')).toBeNull();
    expect(el('path-integration')).toBeNull();
  });

  it('links Cura to the Cura plugin doc', async () => {
    configure();
    await render();

    component.selectSlicer('cura');
    await settle();

    expect(el('slicer-doc-link')!.getAttribute('href')).toBe(
      '/docs/cura-plugin'
    );
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="install-line"]')
        .length
    ).toBe(2);
  });

  it('links every Slic3r-family slicer to the uploader doc', async () => {
    configure();
    await render();

    for (const key of [
      'prusaslicer',
      'orcaslicer',
      'bambu-studio',
      'creality-print',
      'snapmaker-orca',
      'anycubic',
      'elegoo',
      'qidi',
      'orca-flashforge',
    ]) {
      component.selectSlicer(key);
      await settle();
      expect(el('slicer-doc-link')!.getAttribute('href'))
        .withContext(key)
        .toBe('/docs/slic3r-uploader');
    }
  });

  it('emits the slicer path with the chosen slicer on Done', async () => {
    configure();
    await render();
    component.selectSlicer('orcaslicer');
    await settle();

    el('slicer-done')!.click();

    expect(choices).toEqual([{ path: 'slicer', target: 'orcaslicer' }]);
  });

  it('links Klipper and OctoPrint to their docs and to API keys', async () => {
    configure();
    await render();

    component.selectIntegration('klipper');
    await settle();
    expect(el('integration-doc-link')!.getAttribute('href')).toBe(
      '/docs/printlog-bridge'
    );
    expect(el('api-keys-link')!.getAttribute('href')).toBe('/api-keys');

    component.selectIntegration('octoprint');
    await settle();
    expect(el('integration-doc-link')!.getAttribute('href')).toBe(
      '/docs/octoprint-webhook'
    );
  });

  it('emits the integration path with the chosen integration on Done', async () => {
    configure();
    await render();
    component.selectIntegration('octoprint');
    await settle();

    el('integration-done')!.click();

    expect(choices).toEqual([{ path: 'integration', target: 'octoprint' }]);
  });

  describe('confirm-email line', () => {
    it('is shown when the email is unverified', async () => {
      configure();
      await render();

      expect(el('confirm-email')!.textContent).toContain(
        'Check your inbox to confirm your email so we can send you tips.'
      );
    });

    it('is hidden when the email is verified', async () => {
      configure(false, { ...UNVERIFIED, emailVerified: true });
      await render();

      expect(el('confirm-email')).toBeNull();
    });

    const copies: [ResendResult, string][] = [
      ['sent', 'Sent. Check your inbox.'],
      ['rate-limited', 'We just sent one. Check your inbox and spam folder.'],
      ['failed', "Couldn't send right now. Try again in a minute."],
    ];
    for (const [result, copy] of copies) {
      it(`shows "${copy}" for ${result}`, async () => {
        configure();
        api.resendVerificationEmail.and.returnValue(of(result));
        await render();

        el('resend')!.click();
        await settle();

        expect(el('resend-result')!.textContent!.trim()).toBe(copy);
        expect(logging.logEvent).toHaveBeenCalledWith(
          'VerificationEmail_Resent',
          { result }
        );
      });
    }

    it('hides the line when the address is already verified', async () => {
      configure();
      api.resendVerificationEmail.and.returnValue(of('already-verified'));
      await render();

      el('resend')!.click();
      await settle();

      expect(el('confirm-email')).toBeNull();
    });

    it('makes one call for a double click and disables Resend while in flight', async () => {
      configure();
      const response = new Subject<ResendResult>();
      api.resendVerificationEmail.and.returnValue(response);
      await render();

      el('resend')!.click();
      el('resend')!.click();
      fixture.detectChanges();

      expect(api.resendVerificationEmail).toHaveBeenCalledTimes(1);
      expect((el('resend') as HTMLButtonElement).disabled).toBeTrue();

      response.next('sent');
      response.complete();
      await settle();
      expect((el('resend') as HTMLButtonElement).disabled).toBeFalse();
    });
  });
});
