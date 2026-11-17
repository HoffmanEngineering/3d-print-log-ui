import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, Subject, throwError } from 'rxjs';
import {
  ConnectedAgent,
  ConnectedAgentsService,
} from '../../core/services/connected-agents.service';
import { DeviceGrantsService } from '../../core/services/device-grants.service';
import { LoggingService } from '../../core/services/logging.service';
import { ConnectedAgentsComponent } from './connected-agents.component';

describe('ConnectedAgentsComponent', () => {
  let service: MockedObject<ConnectedAgentsService>;
  let logging: MockedObject<LoggingService>;
  let fixture: ComponentFixture<ConnectedAgentsComponent>;

  const sampleAgents: ConnectedAgent[] = [
    { grantId: 'grant-1', clientId: 'Claude', scopes: ['read:printdata'] },
  ];

  beforeEach(async () => {
    service = {
      getConnectedAgents: vi
        .fn()
        .mockName('ConnectedAgentsService.getConnectedAgents'),
      revoke: vi.fn().mockName('ConnectedAgentsService.revoke'),
    } as unknown as MockedObject<ConnectedAgentsService>;
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
    } as unknown as MockedObject<LoggingService>;

    await TestBed.configureTestingModule({
      imports: [ConnectedAgentsComponent, NoopAnimationsModule],
      providers: [
        { provide: ConnectedAgentsService, useValue: service },
        { provide: LoggingService, useValue: logging },
        {
          provide: DeviceGrantsService,
          useValue: { list: () => of([]), revoke: () => of(undefined) },
        },
        provideRouter([]),
        { provide: MatDialog, useValue: {} },
        { provide: ToastrService, useValue: {} },
      ],
    }).compileComponents();
  });

  function create(): void {
    fixture = TestBed.createComponent(ConnectedAgentsComponent);
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  function clickButton(label: string): void {
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ).find((b) =>
      ((b as HTMLButtonElement).textContent ?? '').trim().includes(label)
    ) as HTMLButtonElement | undefined;
    if (!button) {
      throw new Error(`Button "${label}" not found`);
    }
    button.click();
    fixture.detectChanges();
  }

  it('shows a spinner while loading', () => {
    service.getConnectedAgents.mockReturnValue(new Subject<ConnectedAgent[]>());
    create();
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();
  });

  it('heads the two lists so they read as separate', () => {
    service.getConnectedAgents.mockReturnValue(of([]));
    create();
    const headings = Array.from(
      fixture.nativeElement.querySelectorAll('h3') as NodeListOf<HTMLElement>
    ).map((h) => h.textContent?.trim());
    expect(headings).toEqual(['AI assistants', 'Paired devices']);
  });

  it('renders the empty state when there are no agents', () => {
    service.getConnectedAgents.mockReturnValue(of([]));
    create();
    expect(text()).toContain('No AI agents connected.');
  });

  it('renders connected agents and a disconnect-all action', () => {
    service.getConnectedAgents.mockReturnValue(of(sampleAgents));
    create();
    expect(text()).toContain('Claude');
    expect(text()).toContain('Disconnect all AI agents');
  });

  it('shows an error state with retry when loading fails', () => {
    service.getConnectedAgents.mockReturnValue(
      throwError(() => new Error('boom'))
    );
    create();
    expect(text()).toContain("couldn't load");
    expect(text()).toContain('Retry');
  });

  it('confirms inline, revokes each grant, logs, then reloads', () => {
    service.getConnectedAgents.mockReturnValue(of(sampleAgents));
    service.revoke.mockReturnValue(of(undefined));
    create();

    clickButton('Disconnect all AI agents');
    expect(text()).toContain('Yes, disconnect all');

    // After a successful disconnect, the list is reloaded (now empty).
    service.getConnectedAgents.mockReturnValue(of([]));
    clickButton('Yes, disconnect all');

    expect(service.revoke).toHaveBeenCalledWith('grant-1');
    expect(logging.logEvent).toHaveBeenCalledWith(
      'ConnectedAgents_Revoke',
      expect.objectContaining({ count: 1 })
    );
    expect(text()).toContain('No AI agents connected.');
  });

  it('does not submit twice while a revoke is in flight', () => {
    service.getConnectedAgents.mockReturnValue(of(sampleAgents));
    service.revoke.mockReturnValue(new Subject<void>()); // never completes
    create();

    clickButton('Disconnect all AI agents');
    clickButton('Yes, disconnect all');
    // Second click while pending must be ignored.
    clickButton('Yes, disconnect all');

    expect(service.revoke).toHaveBeenCalledTimes(1);
  });

  it('preserves the agents and offers retry when a revoke fails', () => {
    service.getConnectedAgents.mockReturnValue(of(sampleAgents));
    service.revoke.mockReturnValue(throwError(() => new Error('nope')));
    create();

    clickButton('Disconnect all AI agents');
    clickButton('Yes, disconnect all');

    expect(text()).toContain('Claude'); // row preserved
    expect(text()).toContain('Please try again.');
  });
});
