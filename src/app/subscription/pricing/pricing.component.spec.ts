import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { PricingComponent } from './pricing.component';
import { SharedModule } from '../../shared/shared.module';
import { LoggingService } from '../../core/services/logging.service';

describe('PricingComponent', () => {
  let component: PricingComponent;
  let fixture: ComponentFixture<PricingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PricingComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PricingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default isPro to false', () => {
    expect(component.isPro()).toBeFalse();
  });

  /**
   * Regression: `checkoutLoadingPlan` was a plain field on an OnPush component.
   * The failure path set it back to null from inside an HTTP callback, with no
   * template event to mark the component dirty, so nothing re-rendered - a
   * failed checkout left both Subscribe buttons disabled and spinning until the
   * user reloaded the page. Asserted through the rendered button rather than
   * the field, because the field was never the thing that was broken.
   */
  it('re-enables the subscribe buttons after a failed checkout', () => {
    const httpMock = TestBed.inject(HttpTestingController);
    const subscribeButton = () =>
      fixture.nativeElement.querySelector(
        'button[color="primary"]'
      ) as HTMLButtonElement;

    component.checkout('pro_monthly');
    fixture.detectChanges();
    expect(subscribeButton().disabled)
      .withContext('disabled while the request is in flight')
      .toBeTrue();

    httpMock
      .expectOne((req) => req.url.endsWith('/api/Subscription/checkout'))
      .flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(subscribeButton().disabled)
      .withContext('re-enabled so the user can retry')
      .toBeFalse();

    httpMock.verify();
  });
});
