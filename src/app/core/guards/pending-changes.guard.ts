import { CanDeactivateFn } from '@angular/router';

export interface ComponentCanDeactivate {
  /** `true` when there is nothing unsaved to lose. */
  canDeactivate: () => boolean;
}

/** Asks before navigating away from a component that has unsaved changes. */
export const pendingChangesGuard: CanDeactivateFn<ComponentCanDeactivate> = (
  component
) =>
  component.canDeactivate() ||
  confirm(
    'You have unsaved changes. Do you want to leave this page and discard your changes?'
  );
