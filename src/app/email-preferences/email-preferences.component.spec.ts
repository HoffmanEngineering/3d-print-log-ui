import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { LoggingService } from '../core/services/logging.service';
import {
  EmailPreferencesApiService,
  EmailPreferencesDto,
} from './email-preferences-api.service';
import { EmailPreferencesComponent } from './email-preferences.component';

/** version 1, purpose 1, user 300, category 24 (monthly recap). */
const RECAP_UNSUB_TOKEN = 'AQGsAhgAGyw9.c2ln';

const PREFS: EmailPreferencesDto = {
  maskedEmail: 'a•••@example.com',
  all: true,
  onboarding: true,
  monthlyRecap: false,
  printerSilent: true,
};

describe('EmailPreferencesComponent', () => {
  let fixture: ComponentFixture<EmailPreferencesComponent>;
  let api: jasmine.SpyObj<EmailPreferencesApiService>;
  let calls: string[];
  let replaceState: jasmine.Spy;
  let originalUrl: string;

  beforeEach(() => {
    originalUrl = location.pathname + location.search;
    calls = [];
    api = jasmine.createSpyObj<EmailPreferencesApiService>(
      'EmailPreferencesApiService',
      ['confirmUnsubscribe', 'read', 'update']
    );
    api.confirmUnsubscribe.and.callFake(() => {
      calls.push('confirm');
      return of({ category: 24 });
    });
    api.read.and.callFake(() => {
      calls.push('read');
      return of(PREFS);
    });
    api.update.and.callFake((_t, p) => of({ ...PREFS, ...p }));
    replaceState = spyOn(history, 'replaceState').and.callFake(
      (...args: Parameters<History['replaceState']>) => {
        calls.push(`replaceState:${String(args[2])}`);
      }
    );
  });

  afterEach(() => {
    replaceState.and.callThrough();
    history.replaceState(null, '', originalUrl);
  });

  async function render(
    hash: string,
    platform: 'browser' | 'server' = 'browser'
  ): Promise<HTMLElement> {
    replaceState.and.callThrough();
    history.replaceState(null, '', originalUrl + hash);
    replaceState.calls.reset();
    replaceState.and.callFake(
      (...args: Parameters<History['replaceState']>) => {
        calls.push(`replaceState:${String(args[2])}`);
      }
    );

    await TestBed.configureTestingModule({
      imports: [EmailPreferencesComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: EmailPreferencesApiService, useValue: api },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', [
            'logEvent',
            'logException',
          ]),
        },
        {
          // The page is for visitors arriving from an email: it must never reach for sign-in.
          provide: AuthService,
          useFactory: () => {
            throw new Error(
              'EmailPreferencesComponent must not inject AuthService'
            );
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(EmailPreferencesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function text(el: HTMLElement): string {
    return el.textContent?.replace(/\s+/g, ' ') ?? '';
  }

  it('asks before unsubscribing, naming the category, and strips the fragment first', async () => {
    const el = await render(`#u=${RECAP_UNSUB_TOKEN}`);

    expect(fixture.componentInstance.phase()).toBe('confirm-unsubscribe');
    expect(text(el)).toContain('Unsubscribe from monthly recaps?');
    expect(replaceState).toHaveBeenCalled();
    expect(String(replaceState.calls.mostRecent().args[2])).not.toContain('#');
    expect(api.confirmUnsubscribe).not.toHaveBeenCalled();
  });

  it('uses generic copy when the token cannot be read', async () => {
    const el = await render('#u=abc.def');

    expect(text(el)).toContain('Unsubscribe from these emails?');
  });

  it('unsubscribes on click', async () => {
    const el = await render(`#u=${RECAP_UNSUB_TOKEN}`);

    (
      el.querySelector(
        '[data-testid="email-unsubscribe-confirm"]'
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.confirmUnsubscribe).toHaveBeenCalledWith(RECAP_UNSUB_TOKEN);
    expect(fixture.componentInstance.phase()).toBe('unsubscribed');
    expect(text(el)).toContain("You're unsubscribed from monthly recaps.");
  });

  it('loads preferences for a manage link, after stripping the fragment', async () => {
    const el = await render('#m=MANAGE');

    expect(calls[0]).toMatch(/^replaceState:/);
    expect(calls).toContain('read');
    expect(api.read).toHaveBeenCalledWith('MANAGE');
    expect(fixture.componentInstance.phase()).toBe('preferences');
    expect(text(el)).toContain('a•••@example.com');
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      all: true,
      onboarding: true,
      monthlyRecap: false,
      printerSilent: true,
    });
  });

  it('saves preferences', async () => {
    const el = await render('#m=MANAGE');
    fixture.componentInstance.form.controls.onboarding.setValue(false);

    (
      el.querySelector(
        '[data-testid="email-preferences-save"]'
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.update).toHaveBeenCalledWith('MANAGE', {
      all: true,
      onboarding: false,
      monthlyRecap: false,
      printerSilent: true,
    });
    expect(
      el.querySelector('[data-testid="email-preferences-saved"]')
    ).not.toBeNull();
  });

  it('shows invalid for a rejected token', async () => {
    api.read.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 400 })
      ) as Observable<EmailPreferencesDto>
    );
    await render('#m=EXPIRED');

    expect(fixture.componentInstance.phase()).toBe('invalid');
  });

  it('shows an error for a network failure', async () => {
    api.read.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 0 })
      ) as Observable<EmailPreferencesDto>
    );
    await render('#m=MANAGE');

    expect(fixture.componentInstance.phase()).toBe('error');
  });

  it('is invalid without a token, and calls nothing', async () => {
    await render('');

    expect(fixture.componentInstance.phase()).toBe('invalid');
    expect(api.read).not.toHaveBeenCalled();
    expect(api.confirmUnsubscribe).not.toHaveBeenCalled();
  });

  it('asks search engines not to index the page', async () => {
    await render('');

    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe(
      'noindex'
    );
  });

  it('does not touch location or history on the server', async () => {
    await render('#m=MANAGE', 'server');

    expect(replaceState).not.toHaveBeenCalled();
    expect(api.read).not.toHaveBeenCalled();
  });
});
