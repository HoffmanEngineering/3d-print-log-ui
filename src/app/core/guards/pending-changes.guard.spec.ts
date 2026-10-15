import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import {
  ComponentCanDeactivate,
  pendingChangesGuard,
} from './pending-changes.guard';

describe('pendingChangesGuard', () => {
  let confirm: jasmine.Spy;

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
    confirm = spyOn(window, 'confirm');
  });

  it('lets the user leave a page with nothing unsaved without asking', () => {
    expect(canLeave(true)).toBeTrue();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before leaving unsaved changes and leaves when the user agrees', () => {
    confirm.and.returnValue(true);

    expect(canLeave(false)).toBeTrue();
    expect(confirm).toHaveBeenCalledOnceWith(
      'You have unsaved changes. Do you want to leave this page and discard your changes?'
    );
  });

  it('stays on the page when the user declines', () => {
    confirm.and.returnValue(false);

    expect(canLeave(false)).toBeFalse();
  });
});
