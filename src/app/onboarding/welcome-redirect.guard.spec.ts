import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
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
  let onboarding: MockedObject<OnboardingService>;
  let router: Router;

  beforeEach(() => {
    onboarding = {
      shouldShowWelcome: vi
        .fn()
        .mockName('OnboardingService.shouldShowWelcome'),
    } as unknown as MockedObject<OnboardingService>;
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
    onboarding.shouldShowWelcome.mockResolvedValue(true);

    const result = await run();

    expect(onboarding.shouldShowWelcome).toHaveBeenCalledWith('/prints?x=1');
    expect(result instanceof RedirectCommand).toBe(true);
    const command = result as RedirectCommand;
    expect(router.serializeUrl(command.redirectTo as UrlTree)).toBe('/welcome');
    expect(command.navigationBehaviorOptions?.state).toEqual({
      entry: 'guard',
    });
  });

  it('allows navigation when the welcome flow should not show', async () => {
    onboarding.shouldShowWelcome.mockResolvedValue(false);

    expect(await run()).toBe(true);
  });

  it('allows navigation when the lookup rejects', async () => {
    onboarding.shouldShowWelcome.mockRejectedValue(new Error('offline'));

    expect(await run()).toBe(true);
  });

  it('allows navigation when the lookup is still pending after 3 s', async () => {
    vi.useFakeTimers();
    onboarding.shouldShowWelcome.mockReturnValue(new Promise(() => {}));
    let result: boolean | RedirectCommand | undefined;
    void run().then((r) => (result = r));

    await vi.advanceTimersByTimeAsync(2999);
    await vi.advanceTimersByTimeAsync(0);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(result).toBe(true);
  });
});
