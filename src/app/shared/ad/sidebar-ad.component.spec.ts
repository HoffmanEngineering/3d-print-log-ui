import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';
import { SidebarAdComponent } from './sidebar-ad.component';
import { AdEligibilityService } from './ad-eligibility.service';
import { AdsenseLoaderService } from '../../core/services/adsense-loader.service';
import { AD_SLOTS } from './ad-slots';

describe('SidebarAdComponent', () => {
  let fixture: ComponentFixture<SidebarAdComponent>;
  let matches: BehaviorSubject<BreakpointState>;
  let observe: ReturnType<typeof vi.fn>;

  const ins = () =>
    fixture.nativeElement.querySelector(
      'ins.adsbygoogle'
    ) as HTMLElement | null;

  beforeEach(async () => {
    matches = new BehaviorSubject<BreakpointState>({
      matches: false,
      breakpoints: {},
    });
    observe = vi.fn(() => matches.asObservable());

    await TestBed.configureTestingModule({
      imports: [SidebarAdComponent],
      providers: [
        { provide: BreakpointObserver, useValue: { observe } },
        {
          provide: AdEligibilityService,
          useValue: { canShowAds: signal(true) },
        },
        { provide: AdsenseLoaderService, useValue: { ready: signal(false) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarAdComponent);
  });

  // The rail is display:none on narrow screens; a slot there pushed into zero width.
  it('renders no slot below the breakpoint', () => {
    fixture.detectChanges();

    expect(ins()).toBeNull();
  });

  it('renders the sidebar slot at the breakpoint and above', () => {
    matches.next({ matches: true, breakpoints: {} });
    fixture.detectChanges();

    expect(ins()?.getAttribute('data-ad-slot')).toBe(String(AD_SLOTS.SIDEBAR));
    expect(ins()?.getAttribute('data-full-width-responsive')).toBe('false');
  });

  it('removes the slot when the window narrows', () => {
    matches.next({ matches: true, breakpoints: {} });
    fixture.detectChanges();
    matches.next({ matches: false, breakpoints: {} });
    fixture.detectChanges();

    expect(ins()).toBeNull();
  });

  it('defaults to the 1280px rail breakpoint', () => {
    fixture.detectChanges();

    expect(observe).toHaveBeenCalledWith('(min-width: 1280px)');
  });

  it('follows the minWidth its page hides the rail below', () => {
    fixture.componentRef.setInput('minWidth', 1100);
    fixture.detectChanges();

    expect(observe).toHaveBeenLastCalledWith('(min-width: 1100px)');
  });
});
