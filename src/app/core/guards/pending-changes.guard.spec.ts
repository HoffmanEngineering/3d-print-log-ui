import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import {
  ComponentCanDeactivate,
  pendingChangesGuard,
} from './pending-changes.guard';

describe('pendingChangesGuard', () => {
  let confirm: Mock;

  const canLeave = (hasNoChanges: boolean) =>
    TestBed.runInInjectionContext(() =>
      pendingChangesGuard(
        { canDeactivate: () => hasNoChanges } as ComponentCanDeactivate,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot
      )
    );

  beforeEach(() => {
    confirm = vi.spyOn(window, 'confirm').mockReturnValue(undefined);
  });

  it('lets the user leave a page with nothing unsaved without asking', () => {
    expect(canLeave(true)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before leaving unsaved changes and leaves when the user agrees', () => {
    confirm.mockReturnValue(true);

    expect(canLeave(false)).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith(
      'You have unsaved changes. Do you want to leave this page and discard your changes?'
    );
  });

  it('stays on the page when the user declines', () => {
    confirm.mockReturnValue(false);

    expect(canLeave(false)).toBe(false);
  });
});
