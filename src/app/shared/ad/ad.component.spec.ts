import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal, computed } from '@angular/core';
import { AdsenseModule } from 'ng2-adsense';
import { AdComponent } from './ad.component';
import { SubscriptionService } from '../../core/services/subscription.service';
import { IS_CORDOVA_IOS } from '../../core/utils/platform';

describe('AdComponent', () => {
  let component: AdComponent;
  let fixture: ComponentFixture<AdComponent>;
  let isProSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    isProSignal = signal(false);

    const mockSubscriptionService = {
      isPro: computed(() => isProSignal()),
    };

    await TestBed.configureTestingModule({
      imports: [
        AdComponent,
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
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
    expect(component.fullWidthResponsive()).toBeTrue();
  });

  it('should pass adSlot to ng-adsense', () => {
    fixture.componentRef.setInput('adSlot', 123456789);
    fixture.detectChanges();
    const adsense = fixture.nativeElement.querySelector('ng-adsense');
    expect(adsense).toBeTruthy();
    expect(component.adSlot()).toBe(123456789);
  });

  it('should pass fullWidthResponsive=false when set', () => {
    fixture.componentRef.setInput('fullWidthResponsive', false);
    fixture.detectChanges();
    expect(component.fullWidthResponsive()).toBeFalse();
  });

  it('should render an aside with aria-label Advertisement when not Pro', () => {
    const aside = fixture.nativeElement.querySelector(
      'aside[aria-label="Advertisement"]'
    );
    expect(aside).toBeTruthy();
  });

  it('renders no ad in the iOS app, even for a free user', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        AdComponent,
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: SubscriptionService,
          useValue: { isPro: computed(() => false) },
        },
        { provide: IS_CORDOVA_IOS, useValue: true },
      ],
    });
    const iosFixture = TestBed.createComponent(AdComponent);
    iosFixture.detectChanges();

    expect(
      iosFixture.nativeElement.querySelector(
        'aside[aria-label="Advertisement"]'
      )
    ).toBeNull();
  });

  it('should not render the ad aside when user is Pro', () => {
    isProSignal.set(true);
    fixture.detectChanges();
    const aside = fixture.nativeElement.querySelector(
      'aside[aria-label="Advertisement"]'
    );
    expect(aside).toBeNull();
  });
});
