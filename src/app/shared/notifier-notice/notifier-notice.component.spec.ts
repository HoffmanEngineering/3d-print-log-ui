import { PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { LoggingService } from '../../core/services/logging.service';
import { environment } from 'src/environments/environment';
import { NotifierNoticeComponent } from './notifier-notice.component';

describe('NotifierNoticeComponent', () => {
  let fixture: ComponentFixture<NotifierNoticeComponent>;
  let httpMock: HttpTestingController;
  let user: WritableSignal<unknown>;
  let logging: jasmine.SpyObj<LoggingService>;

  const base = `${environment.printLogApiUrl}/api/Connections`;

  const connection = (overrides: Record<string, unknown> = {}) => ({
    id: '0d6c7a52-6a8e-4f52-9e1e-3f0c9b0b2a11',
    kind: 'moonraker',
    instanceId: 'voron-1',
    displayName: 'Voron in the garage',
    agentVersion: '0.1.0',
    printerId: 3,
    createdDate: '2026-10-01T12:00:00+00:00',
    lastSeenAt: '2026-10-10T08:30:00+00:00',
    status: 1,
    droppedNotifierEventCount: 0,
    lastDroppedNotifierEventAt: null,
    notifierNoticeDismissedAt: null,
    showNotifierNotice: false,
    ...overrides,
  });

  // The API sets showNotifierNotice only when notifier events were dropped for a printer with
  // a live bridge connection, and clears it for good once dismissed.
  const dropping = (overrides: Record<string, unknown> = {}) =>
    connection({
      droppedNotifierEventCount: 4,
      lastDroppedNotifierEventAt: '2026-10-10T08:00:00+00:00',
      showNotifierNotice: true,
      ...overrides,
    });

  async function render(
    platform: 'browser' | 'server' = 'browser'
  ): Promise<void> {
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    await TestBed.configureTestingModule({
      imports: [NotifierNoticeComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: AuthService, useValue: { userProfile: user } },
        { provide: LoggingService, useValue: logging },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NotifierNoticeComponent);
    fixture.detectChanges();
  }

  function answer(body: unknown[]): void {
    httpMock
      .expectOne((r) => r.url === base && !r.params.has('printerId'))
      .flush(body);
    fixture.detectChanges();
  }

  function banner(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="notifier-notice"]'
    );
  }

  beforeEach(() => {
    user = signal<unknown>({ id: 1 });
  });

  afterEach(() => httpMock.verify());

  it('suggests removing the notifier when the bridge is dropping its events', async () => {
    await render();
    answer([dropping()]);

    expect(banner()).not.toBeNull();
    expect(banner()?.textContent).toContain('Voron in the garage');
    expect(banner()?.textContent).toContain('[notifier');
  });

  it('links to the instructions for switching', async () => {
    await render();
    answer([dropping()]);

    const link = banner()?.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/docs/switch-from-notifier');
  });

  describe('on an OctoPrint connection', () => {
    const octoprint = (overrides: Record<string, unknown> = {}) =>
      dropping({
        kind: 'octoprint',
        instanceId: 'ender-1',
        displayName: 'Ender on the shelf',
        ...overrides,
      });

    it("suggests turning off OctoPrint's Webhooks plugin hook", async () => {
      await render();
      answer([octoprint()]);

      const text = banner()?.textContent ?? '';
      expect(text).toContain('Ender on the shelf');
      expect(text).toContain('Webhooks');
      expect(text).not.toContain('[notifier');
      expect(text).not.toContain('moonraker.conf');
    });

    it('links to the instructions for switching from the webhook', async () => {
      await render();
      answer([octoprint()]);

      const links = Array.from(banner()?.querySelectorAll('a') ?? []).map((a) =>
        a.getAttribute('href')
      );
      expect(links).toEqual(['/docs/switch-from-octoprint-webhook']);
    });

    it('words each kind for its own printers when both are dropping', async () => {
      await render();
      answer([dropping(), octoprint()]);

      const moonraker = banner()!.querySelector(
        '[data-testid="notifier-notice-moonraker"]'
      );
      const webhook = banner()!.querySelector(
        '[data-testid="notifier-notice-octoprint"]'
      );
      expect(moonraker?.textContent).toContain('Voron in the garage');
      expect(moonraker?.textContent).not.toContain('Ender on the shelf');
      expect(webhook?.textContent).toContain('Ender on the shelf');
      expect(webhook?.textContent).not.toContain('Voron in the garage');
    });

    it('dismisses both kinds with one button', async () => {
      await render();
      answer([dropping(), octoprint()]);

      (
        banner()!.querySelector(
          '[data-testid="notifier-notice-dismiss"]'
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();

      expect(banner()).toBeNull();
      for (const id of ['voron-1', 'ender-1']) {
        httpMock
          .expectOne(`${base}/${id}/notifier-notice/dismiss`)
          .flush(null, { status: 204, statusText: 'No Content' });
      }
    });
  });

  it('keeps the Moonraker wording off a Moonraker-only notice', async () => {
    await render();
    answer([dropping()]);

    expect(banner()?.textContent).not.toContain('Webhooks');
    expect(
      banner()!.querySelector('[data-testid="notifier-notice-octoprint"]')
    ).toBeNull();
  });

  // Only the Moonraker notifier and OctoPrint's Webhooks plugin have an older integration the
  // API drops events from; any other kind has nothing to tell the user to turn off.
  it('stays hidden for a kind it has no instructions for', async () => {
    await render();
    answer([
      dropping({ kind: 'prusalink', instanceId: 'mk4', displayName: 'MK4' }),
    ]);

    expect(banner()).toBeNull();
  });

  it('stays hidden without dropped notifier events', async () => {
    await render();
    answer([connection()]);

    expect(banner()).toBeNull();
  });

  it('names only the connections that dropped events', async () => {
    await render();
    answer([
      dropping(),
      connection({ instanceId: 'prusa-1', displayName: 'Prusa by the door' }),
    ]);

    expect(banner()?.textContent).not.toContain('Prusa by the door');
  });

  it('dismisses on the server, for every connection it named', async () => {
    await render();
    answer([
      dropping(),
      dropping({ instanceId: 'voron-2', displayName: 'Second Voron' }),
    ]);

    (
      banner()!.querySelector(
        '[data-testid="notifier-notice-dismiss"]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(banner()).toBeNull();
    for (const id of ['voron-1', 'voron-2']) {
      const request = httpMock.expectOne(
        `${base}/${id}/notifier-notice/dismiss`
      );
      expect(request.request.method).toBe('POST');
      request.flush(null, { status: 204, statusText: 'No Content' });
    }
    expect(logging.logEvent).toHaveBeenCalledWith('NotifierNotice_Dismissed', {
      connections: 2,
    });
  });

  // Unknown is not "dropping": better to miss one visit than to nag over a failed request.
  it('stays hidden when the connections cannot be loaded', async () => {
    await render();
    httpMock
      .expectOne((r) => r.url === base)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(banner()).toBeNull();
    expect(logging.logException).toHaveBeenCalled();
  });

  it('stays hidden and asks nothing when signed out', async () => {
    user.set(null);
    await render();

    httpMock.expectNone(base);
    expect(banner()).toBeNull();
  });

  it('hides on sign-out', async () => {
    await render();
    answer([dropping()]);

    user.set(null);
    fixture.detectChanges();

    expect(banner()).toBeNull();
  });

  it('asks nothing while prerendering', async () => {
    await render('server');

    httpMock.expectNone(base);
    expect(banner()).toBeNull();
  });
});
