import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { withTimeout } from '../core/utils/with-timeout';
import {
  ONBOARDING_LOOKUP_TIMEOUT_MS,
  OnboardingService,
} from './onboarding.service';

/**
 * Sends a new, eligible user with no printers to /welcome instead of an empty print list.
 * Onboarding never blocks the app: a failed lookup, or one still pending after
 * ONBOARDING_LOOKUP_TIMEOUT_MS, lets the navigation through. It also runs under
 * devAuthBypass so E2E can exercise it.
 */
export const welcomeRedirectGuard: CanActivateFn = async (_route, state) => {
  const onboarding = inject(OnboardingService);
  const router = inject(Router);
  try {
    const showWelcome = await withTimeout(
      onboarding.shouldShowWelcome(state.url),
      false,
      ONBOARDING_LOOKUP_TIMEOUT_MS
    );
    return showWelcome
      ? new RedirectCommand(router.createUrlTree(['/welcome']), {
          state: { entry: 'guard' },
        })
      : true;
  } catch {
    return true;
  }
};
