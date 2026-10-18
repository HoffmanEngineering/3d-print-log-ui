import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { OnboardingService } from './onboarding.service';
import { welcomeRedirectGuard } from './welcome-redirect.guard';

describe('welcomeRedirectGuard', () => {
  let onboarding: jasmine.SpyObj<OnboardingService>;
  let router: Router;

  beforeEach(() => {
    onboarding = jasmine.createSpyObj<OnboardingService>('OnboardingService', [
      'shouldShowWelcome',
    ]);
    TestBed.configureTestingModule({
      providers: [{ provide: OnboardingService, useValue: onboarding }],
    });
    router = TestBed.inject(Router);
  });

  const run = () =>
    TestBed.runInInjectionContext(() =>
      welcomeRedirectGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/prints?x=1' } as RouterStateSnapshot
      )
    ) as Promise<boolean | UrlTree>;

  it('redirects to /welcome when the welcome flow should show', async () => {
    onboarding.shouldShowWelcome.and.resolveTo(true);

    const result = await run();

    expect(onboarding.shouldShowWelcome).toHaveBeenCalledWith('/prints?x=1');
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/welcome');
  });

  it('allows navigation when the welcome flow should not show', async () => {
    onboarding.shouldShowWelcome.and.resolveTo(false);

    expect(await run()).toBeTrue();
  });

  it('allows navigation when the lookup rejects', async () => {
    onboarding.shouldShowWelcome.and.rejectWith(new Error('offline'));

    expect(await run()).toBeTrue();
  });
});
