import {
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RedirectCommand,
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
    ) as Promise<boolean | RedirectCommand>;

  it('redirects to /welcome with entry "guard" when the welcome flow should show', async () => {
    onboarding.shouldShowWelcome.and.resolveTo(true);

    const result = await run();

    expect(onboarding.shouldShowWelcome).toHaveBeenCalledWith('/prints?x=1');
    expect(result instanceof RedirectCommand).toBeTrue();
    const command = result as RedirectCommand;
    expect(router.serializeUrl(command.redirectTo as UrlTree)).toBe('/welcome');
    expect(command.navigationBehaviorOptions?.state).toEqual({
      entry: 'guard',
    });
  });

  it('allows navigation when the welcome flow should not show', async () => {
    onboarding.shouldShowWelcome.and.resolveTo(false);

    expect(await run()).toBeTrue();
  });

  it('allows navigation when the lookup rejects', async () => {
    onboarding.shouldShowWelcome.and.rejectWith(new Error('offline'));

    expect(await run()).toBeTrue();
  });

  it('allows navigation when the lookup is still pending after 3 s', fakeAsync(() => {
    onboarding.shouldShowWelcome.and.returnValue(new Promise(() => {}));
    let result: boolean | RedirectCommand | undefined;
    void run().then((r) => (result = r));

    tick(2999);
    flushMicrotasks();
    expect(result).toBeUndefined();
    tick(1);
    flushMicrotasks();
    expect(result).toBeTrue();
  }));
});
