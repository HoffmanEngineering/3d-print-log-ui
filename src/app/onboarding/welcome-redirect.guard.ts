import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OnboardingService } from './onboarding.service';

/**
 * Sends a new, eligible user with no printers to /welcome instead of an empty print list.
 * Onboarding never blocks the app: a failed lookup lets the navigation through. It also runs
 * under devAuthBypass so E2E can exercise it.
 */
export const welcomeRedirectGuard: CanActivateFn = async (_route, state) => {
  const onboarding = inject(OnboardingService);
  const router = inject(Router);
  try {
    return (await onboarding.shouldShowWelcome(state.url))
      ? router.createUrlTree(['/welcome'])
      : true;
  } catch {
    return true;
  }
};
