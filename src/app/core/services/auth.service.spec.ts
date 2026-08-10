import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { filter, take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';
import { SubscriptionService } from './subscription.service';

describe('AuthService', () => {
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockSubscriptionService: jasmine.SpyObj<SubscriptionService>;

  beforeEach(() => {
    mockUserService = jasmine.createSpyObj<UserService>('UserService', [
      'getCurrentUserDetail',
    ]);
    mockNotificationService = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['stopPolling', 'startPolling']
    );
    mockSubscriptionService = jasmine.createSpyObj<SubscriptionService>(
      'SubscriptionService',
      ['loadSubscription']
    );

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    });
  });

  describe('when devAuthBypass is true', () => {
    beforeEach(() => {
      (environment as any).devAuthBypass = true;
    });

    afterEach(() => {
      (environment as any).devAuthBypass = false;
    });

    it('should be created', () => {
      const service: AuthService = TestBed.inject(AuthService);
      expect(service).toBeTruthy();
    });

    it('should emit mock user profile and set loggedIn=true when devAuthBypass is true', (done) => {
      const service = TestBed.inject(AuthService);

      service.localAuthSetup();

      service.userProfile$
        .pipe(
          filter((profile) => profile !== null),
          take(1)
        )
        .subscribe((profile) => {
          expect(profile).not.toBeNull();
          expect(service.loggedIn).toBeTrue();
          done();
        });
    });

    it('sets loggedIn=false and emits no profile when the dev anonymous flag is set', () => {
      sessionStorage.setItem('devUserId', 'anonymous');
      const service = TestBed.inject(AuthService);

      let latestProfile: unknown = 'unset';
      service.userProfile$.subscribe((p) => (latestProfile = p));

      service.localAuthSetup();

      expect(service.loggedIn).toBeFalse();
      expect(latestProfile).toBeNull(); // BehaviorSubject initial null, never overwritten

      sessionStorage.removeItem('devUserId');
    });
  });
});
