import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { DocsSearchDialogComponent } from './docs-search-dialog.component';
import { DocsSearchOpener } from './docs-search.opener';

describe('DocsSearchOpener', () => {
  let opener: DocsSearchOpener;
  let dialog: jasmine.SpyObj<MatDialog>;
  let closed: Subject<unknown>;
  let componentInstance: jasmine.SpyObj<DocsSearchDialogComponent>;

  beforeEach(() => {
    closed = new Subject();
    componentInstance = jasmine.createSpyObj<DocsSearchDialogComponent>(
      'DocsSearchDialogComponent',
      ['focusInput']
    );

    const ref = {
      afterClosed: () => closed.asObservable(),
      componentInstance,
    } as unknown as MatDialogRef<DocsSearchDialogComponent>;

    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue(ref as never);

    TestBed.configureTestingModule({
      providers: [DocsSearchOpener, { provide: MatDialog, useValue: dialog }],
    });
    opener = TestBed.inject(DocsSearchOpener);
  });

  it('opens the search dialog', () => {
    opener.open();

    expect(dialog.open).toHaveBeenCalledWith(
      DocsSearchDialogComponent,
      jasmine.any(Object)
    );
    expect(opener.isOpen).toBe(true);
  });

  it('does not stack a second dialog on the first', () => {
    // Three entry points can fire — toolbar, sidebar, Ctrl+K — and the shortcut
    // still works while the palette has focus.
    opener.open();
    opener.open();

    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it('puts the caret back in the box when asked again while open', () => {
    opener.open();
    opener.open();

    expect(componentInstance.focusInput).toHaveBeenCalled();
  });

  it('can be reopened once closed', () => {
    opener.open();
    closed.next(undefined);

    expect(opener.isOpen).toBe(false);

    opener.open();
    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it('carries a query into the dialog', () => {
    opener.open('spool');

    expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual({
      query: 'spool',
    });
  });

  it('passes no data when opened with nothing typed', () => {
    opener.open();

    expect(dialog.open.calls.mostRecent().args[1]?.data).toBeNull();
  });

  it('puts the caret in the input on open', () => {
    // `cdkFocusInitial` on the input is only consulted on the first-tabbable
    // path; `autoFocus: false` focuses the panel element instead and leaves a
    // palette opened with Ctrl+K with nowhere to type.
    opener.open();

    expect(dialog.open.calls.mostRecent().args[1]?.autoFocus).toBe(
      'first-tabbable'
    );
  });
});
