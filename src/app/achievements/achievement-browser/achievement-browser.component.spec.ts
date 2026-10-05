import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { BehaviorSubject, map, Subject } from 'rxjs';

import { LoggingService } from '../../core/services/logging.service';
import { AchievementProgress, EarnedTier } from '../../core/types/achievement';
import { TEST_CATALOG } from '../testing/achievement-fixtures';
import { AchievementBrowserComponent } from './achievement-browser.component';

@Component({
  imports: [AchievementBrowserComponent],
  template: `
    <app-achievement-browser
      [catalog]="catalog"
      [earned]="earned"
      [progress]="progress"
      [selectedKey]="selectedKey()"
      source="profile"
      (selectedKeyChange)="changes.push($event)"
    >
      <h1 class="projected">Header</h1>
    </app-achievement-browser>
  `,
})
class HostComponent {
  readonly catalog = TEST_CATALOG;
  readonly earned = new Map<string, EarnedTier[]>([
    [
      'mcp',
      [{ tier: 1, unlockedAt: '2026-10-02T00:00:00Z', retroactive: true }],
    ],
  ]);
  readonly progress = new Map<string, AchievementProgress | null>();
  readonly selectedKey = signal<string | null>(null);
  readonly changes: (string | null)[] = [];
}

describe('AchievementBrowserComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;
  let wide$: BehaviorSubject<boolean>;
  let logging: jasmine.SpyObj<LoggingService>;
  let sheetOpen: jasmine.Spy;
  let sheetDismissed: Subject<void>;

  beforeEach(() => {
    wide$ = new BehaviorSubject(true);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);
    sheetDismissed = new Subject<void>();
    sheetOpen = jasmine.createSpy('open').and.returnValue({
      afterDismissed: () => sheetDismissed,
      dismiss: () => undefined,
    });
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: LoggingService, useValue: logging },
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () =>
              wide$.pipe(map((matches) => ({ matches, breakpoints: {} }))),
          },
        },
        { provide: MatBottomSheet, useValue: { open: sheetOpen } },
      ],
    });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('projects the page header above the grid', () => {
    expect(el.querySelector('main .projected')).not.toBeNull();
    expect(el.querySelector('main app-achievement-grid')).not.toBeNull();
  });

  it('emits the key of a clicked badge', () => {
    (el.querySelector('[data-key="mcp"]') as HTMLButtonElement).click();
    expect(host.changes).toEqual(['mcp']);
  });

  it('shows the selection in a side panel on wide screens', () => {
    host.selectedKey.set('mcp');
    fixture.detectChanges();

    expect(el.querySelector('aside app-achievement-detail')).not.toBeNull();
    expect(sheetOpen).not.toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith('AchievementDetail_Opened', {
      key: 'mcp',
      earned: true,
      source: 'profile',
    });
  });

  it('closing the side panel clears the selection', () => {
    host.selectedKey.set('mcp');
    fixture.detectChanges();

    (el.querySelector('aside button.close') as HTMLButtonElement).click();
    expect(host.changes).toEqual([null]);
  });

  it('shows the selection in a bottom sheet on narrow screens', () => {
    wide$.next(false);
    host.selectedKey.set('mcp');
    fixture.detectChanges();

    expect(el.querySelector('aside')).toBeNull();
    expect(sheetOpen).toHaveBeenCalledTimes(1);

    sheetDismissed.next();
    expect(host.changes).toEqual([null]);
  });

  it('logs a detail open once, not again when the layout changes', () => {
    host.selectedKey.set('mcp');
    fixture.detectChanges();
    wide$.next(false);
    fixture.detectChanges();
    wide$.next(true);
    fixture.detectChanges();

    const opens = logging.logEvent.calls
      .allArgs()
      .filter(([name]) => name === 'AchievementDetail_Opened');
    expect(opens.length).toBe(1);
  });

  it('ignores a key that is not in the catalog', () => {
    host.selectedKey.set('no-such-badge');
    fixture.detectChanges();
    expect(el.querySelector('aside')).toBeNull();
  });
});
