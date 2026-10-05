import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SubscriptionService, SubscriptionDto } from './subscription.service';
import { environment } from 'src/environments/environment';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.printLogApiUrl}/api/Subscription`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SubscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default isPro to false', () => {
    expect(service.isPro()).toBeFalse();
  });

  it('should default maxImages to the free cap, not the pro one', () => {
    // Defaulting to 20 here would let the UI accept uploads the API rejects.
    expect(service.maxImages()).toBe(5);
  });

  it('exposes the image cap from the /me response', () => {
    service.loadSubscription();

    httpMock.expectOne(`${baseUrl}/me`).flush({
      status: 'active',
      plan: 'pro_monthly',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isPro: true,
      maxImages: 20,
      maxImagesPerPrint: 20,
      maxFilesPerPrint: 5,
      maxFileStorageBytes: 1,
      usedFileStorageBytes: 0,
    } as SubscriptionDto);

    expect(service.maxImages()).toBe(20);
  });

  it('should default maxImagesPerPrint to 5', () => {
    expect(service.maxImagesPerPrint()).toBe(5);
  });

  it('should default maxFilesPerPrint to 0', () => {
    expect(service.maxFilesPerPrint()).toBe(0);
  });

  it('should default maxFileStorageBytes to 0', () => {
    expect(service.maxFileStorageBytes()).toBe(0);
  });

  it('should default usedFileStorageBytes to 0', () => {
    expect(service.usedFileStorageBytes()).toBe(0);
  });

  it('should default status to none', () => {
    expect(service.status()).toBe('none');
  });

  describe('loadSubscription', () => {
    it('should fetch subscription and update signals', () => {
      const mockDto: SubscriptionDto = {
        status: 'active',
        plan: 'pro_monthly',
        currentPeriodEnd: '2026-03-27T00:00:00Z',
        cancelAtPeriodEnd: false,
        isPro: true,
        maxImages: 20,
        maxImagesPerPrint: 20,
        maxFilesPerPrint: 5,
        maxFileStorageBytes: 53687091200,
        usedFileStorageBytes: 1048576,
      };

      service.loadSubscription();

      const req = httpMock.expectOne(`${baseUrl}/me`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDto);

      expect(service.isPro()).toBeTrue();
      expect(service.status()).toBe('active');
      expect(service.plan()).toBe('pro_monthly');
    });
  });

  describe('createCheckoutSession', () => {
    it('should POST plan and return url', () => {
      service.createCheckoutSession('pro_monthly').subscribe((result) => {
        expect(result.url).toBe('https://checkout.stripe.com/test');
      });

      const req = httpMock.expectOne(`${baseUrl}/checkout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ planId: 'pro_monthly' });
      req.flush({ url: 'https://checkout.stripe.com/test' });
    });
  });

  describe('createPortalSession', () => {
    it('should POST and return url', () => {
      service.createPortalSession().subscribe((result) => {
        expect(result.url).toBe('https://billing.stripe.com/test');
      });

      const req = httpMock.expectOne(`${baseUrl}/portal`);
      expect(req.request.method).toBe('POST');
      req.flush({ url: 'https://billing.stripe.com/test' });
    });
  });
});
