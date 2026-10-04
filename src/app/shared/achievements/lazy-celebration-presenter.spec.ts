import { Overlay } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';

import { CelebrationItem } from '../../core/services/achievement-celebration.service';
import { LazyCelebrationPresenter } from './lazy-celebration-presenter';

const ITEM: CelebrationItem = {
  id: 'n1',
  achievement: { key: 'first-print', tier: 1, summary: false, count: null },
  title: 'Achievement unlocked: First Layer',
  message: 'You logged your first print.',
};

describe('LazyCelebrationPresenter', () => {
  let presenter: LazyCelebrationPresenter;
  let dialog: {
    openDialogs: unknown[];
    afterAllClosed: Subject<void>;
    open: jasmine.Spy;
  };
  let overlayCreate: jasmine.Spy;
  let toastClosed: Subject<void>;

  const flush = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  };

  beforeEach(() => {
    dialog = {
      openDialogs: [],
      afterAllClosed: new Subject<void>(),
      open: jasmine
        .createSpy('open')
        .and.returnValue({ afterClosed: () => of(undefined) }),
    };
    toastClosed = new Subject<void>();
    overlayCreate = jasmine.createSpy('create').and.returnValue({
      attach: () => ({
        setInput: () => undefined,
        instance: { closed: toastClosed },
      }),
      dispose: () => undefined,
    });
    TestBed.configureTestingModule({
      providers: [
        LazyCelebrationPresenter,
        { provide: MatDialog, useValue: dialog },
        {
          provide: Overlay,
          useValue: {
            create: overlayCreate,
            position: () => ({
              global: () => ({ top: () => ({ right: () => ({}) }) }),
            }),
          },
        },
      ],
    });
    presenter = TestBed.inject(LazyCelebrationPresenter);
  });

  it('waits for another open dialog to close before opening its own', async () => {
    dialog.openDialogs = [{}]; // e.g. the version release note
    const shown = presenter.dialog(ITEM);
    await flush();
    expect(dialog.open).not.toHaveBeenCalled();

    dialog.openDialogs = [];
    dialog.afterAllClosed.next();
    await shown;

    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it('does not show a toast over an open dialog', async () => {
    dialog.openDialogs = [{}];
    const shown = presenter.toast([ITEM], { quiet: false });
    await flush();
    expect(overlayCreate).not.toHaveBeenCalled();

    dialog.openDialogs = [];
    dialog.afterAllClosed.next();
    await flush();
    expect(overlayCreate).toHaveBeenCalledTimes(1);

    toastClosed.next();
    await shown;
  });

  it('opens straight away when nothing else is open', async () => {
    await presenter.dialog(ITEM);
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });
});
