import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { AdComponent } from './ad.component';
import { AdEligibilityService } from './ad-eligibility.service';
import { AdsenseLoaderService } from '../../core/services/adsense-loader.service';
import { AD_SLOTS } from './ad-slots';

describe('AdComponent', () => {
  let component: AdComponent;
  let fixture: ComponentFixture<AdComponent>;
  let canShowAds: WritableSignal<boolean>;

  const aside = () =>
    fixture.nativeElement.querySelector('aside[aria-label="Advertisement"]');

  beforeEach(async () => {
    canShowAds = signal(true);

    await TestBed.configureTestingModule({
      imports: [AdComponent],
      providers: [
        { provide: AdEligibilityService, useValue: { canShowAds } },
        // Never ready: these specs check what renders, not what is pushed.
        { provide: AdsenseLoaderService, useValue: { ready: signal(false) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default adSlot to null', () => {
    expect(component.adSlot()).toBeNull();
  });

  it('should default fullWidthResponsive to true', () => {
    expect(component.fullWidthResponsive()).toBe(true);
  });

  it('uses the default display slot when no adSlot is set', () => {
    const ins = fixture.nativeElement.querySelector('ins.adsbygoogle');
    expect(ins.getAttribute('data-ad-slot')).toBe(String(AD_SLOTS.DEFAULT));
    expect(ins.getAttribute('data-full-width-responsive')).toBe('true');
  });

  it('passes adSlot and fullWidthResponsive to the slot', () => {
    fixture.componentRef.setInput('adSlot', 123456789);
    fixture.componentRef.setInput('fullWidthResponsive', false);
    fixture.detectChanges();

    const ins = fixture.nativeElement.querySelector('ins.adsbygoogle');
    expect(ins.getAttribute('data-ad-slot')).toBe('123456789');
    expect(ins.getAttribute('data-full-width-responsive')).toBe('false');
  });

  it('should render an aside with aria-label Advertisement when ads are allowed', () => {
    expect(aside()).toBeTruthy();
  });

  // Pro, the iOS app, and a subscription that has not loaded yet all land here.
  it('renders nothing when ads are not allowed', () => {
    canShowAds.set(false);
    fixture.detectChanges();

    expect(aside()).toBeNull();
    expect(fixture.nativeElement.querySelector('ins')).toBeNull();
  });
});
