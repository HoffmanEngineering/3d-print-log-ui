import type { MockedObject } from 'vitest';
import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { DocsSearchDialogComponent } from './docs-search-dialog.component';
import { DocsSearchOpener } from './docs-search.opener';

describe('DocsSearchOpener', () => {
  let opener: DocsSearchOpener;
  let dialog: MockedObject<MatDialog>;
  let closed: Subject<unknown>;
  let componentInstance: MockedObject<DocsSearchDialogComponent>;

  beforeEach(() => {
    closed = new Subject();
    componentInstance = {
      focusInput: vi.fn().mockName('DocsSearchDialogComponent.focusInput'),
    } as unknown as MockedObject<DocsSearchDialogComponent>;

    const ref = {
      afterClosed: () => closed.asObservable(),
      componentInstance,
    } as unknown as MatDialogRef<DocsSearchDialogComponent>;

    dialog = {
      open: vi.fn().mockName('MatDialog.open'),
    } as unknown as MockedObject<MatDialog>;
    dialog.open.mockReturnValue(ref as never);

    TestBed.configureTestingModule({
      providers: [DocsSearchOpener, { provide: MatDialog, useValue: dialog }],
    });
    opener = TestBed.inject(DocsSearchOpener);
  });

  it('opens the search dialog', () => {
    opener.open();

    expect(dialog.open).toHaveBeenCalledWith(
      DocsSearchDialogComponent,
      expect.any(Object)
    );
    expect(opener.isOpen).toBe(true);
  });

  it('opens the dialog with its own injector, so the palette sees what /docs provides', () => {
    // MatDialog is root's; without this the palette cannot find DocsSearchService,
    // which only the /docs route provides, and opens empty.
    opener.open();

    const config = vi.mocked(dialog.open).mock.lastCall[1]!;
    expect(config.injector).toBe(TestBed.inject(Injector));
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

    expect(vi.mocked(dialog.open).mock.lastCall[1]?.data).toEqual({
      query: 'spool',
    });
  });

  it('passes no data when opened with nothing typed', () => {
    opener.open();

    expect(vi.mocked(dialog.open).mock.lastCall[1]?.data).toBeNull();
  });

  it('puts the caret in the input on open', () => {
    // `cdkFocusInitial` on the input is only consulted on the first-tabbable
    // path; `autoFocus: false` focuses the panel element instead and leaves a
    // palette opened with Ctrl+K with nowhere to type.
    opener.open();

    expect(vi.mocked(dialog.open).mock.lastCall[1]?.autoFocus).toBe(
      'first-tabbable'
    );
  });
});
