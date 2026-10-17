import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { SimpleDialogData } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from './local-storage.service';
import { LoggingService } from './logging.service';

import {
  ReleaseNote,
  ReleaseNoteHistory,
  VersionReleaseNoteDialogService,
} from './version-release-note-dialog.service';

const DIALOG_KEY = 'LastLoggedInVersion';
const PAGE_KEY = 'LastViewedReleaseNotesVersion';

const FOOTER = `<p>
  <strong>Support development of 3D Print Log:</strong><br />
  Subscribe to Pro.
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`;

function note(version: string, withFooter = true): ReleaseNote {
  return {
    title: `${version} - Release ${version}`,
    body: `<p>Highlights of ${version}.</p>\n${withFooter ? FOOTER : ''}`,
  };
}

/**
 * The real dictionary changes every release, so every test runs against this
 * one, with the running version pinned to 2.4.0.
 */
const HISTORY: ReleaseNoteHistory = {
  '2.4.0': note('2.4.0'),
  '2.3.1': { redirect: '2.3.0' },
  '2.3.0': note('2.3.0'),
  '2.2.0': note('2.2.0', false),
  '2.1.0': note('2.1.0'),
  '2.0.0': note('2.0.0'),
  '1.9.0': note('1.9.0'),
  // A note ahead of the running version is never shown.
  '2.5.0': note('2.5.0'),
};

describe('VersionReleaseNoteDialogService', () => {
  let storage: Map<string, string>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let logging: jasmine.SpyObj<LoggingService>;
  let originalVersion: string;

  beforeEach(() => {
    originalVersion = environment.version;
    environment.version = '2.4.0';

    storage = new Map();
    const localStorage: Partial<LocalStorageService> = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
    };

    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({
      afterClosed: () => of(true),
    } as unknown as MatDialogRef<unknown, unknown>);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: LocalStorageService, useValue: localStorage },
        { provide: LoggingService, useValue: logging },
      ],
    });
  });

  afterEach(() => {
    environment.version = originalVersion;
  });

  /** Storage is read when the service is built, so seed it first. */
  function create(stored: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(stored)) {
      storage.set(key, value);
    }
    const service = TestBed.inject(VersionReleaseNoteDialogService);
    (service as unknown as { releaseNotes: ReleaseNoteHistory }).releaseNotes =
      HISTORY;
    return service;
  }

  function shownDialog(): SimpleDialogData {
    expect(dialog.open).toHaveBeenCalledTimes(1);
    return dialog.open.calls.mostRecent().args[1]!.data as SimpleDialogData;
  }

  it('shows nothing when the stored version is the running one', async () => {
    await create({ [DIALOG_KEY]: '2.4.0' }).checkLastLoggedInVersion();

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('shows nothing on a first visit, and records the running version', async () => {
    await create().checkLastLoggedInVersion();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(storage.get(DIALOG_KEY)).toBe('2.4.0');
  });

  it('treats an unreadable stored version as a first visit', async () => {
    await create({ [DIALOG_KEY]: 'not-a-version' }).checkLastLoggedInVersion();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(storage.get(DIALOG_KEY)).toBe('2.4.0');
  });

  it('shows a single missed release exactly as written', async () => {
    await create({ [DIALOG_KEY]: '2.3.1' }).checkLastLoggedInVersion();

    const data = shownDialog();
    const latest = HISTORY['2.4.0'] as ReleaseNote;
    expect(data.title).toBe(latest.title);
    expect(data.body).toBe(latest.body);
    expect(storage.get(DIALOG_KEY)).toBe('2.4.0');
  });

  // The bug this replaced: a user two releases behind saw only the newest.
  it('rolls every missed release into one dialog, newest first', async () => {
    await create({ [DIALOG_KEY]: '2.2.0' }).checkLastLoggedInVersion();

    const data = shownDialog();
    expect(data.title).toBe("What's new since your last visit");
    const newest = data.body.indexOf('<h2>2.4.0 - Release 2.4.0</h2>');
    const older = data.body.indexOf('<h2>2.3.0 - Release 2.3.0</h2>');
    expect(newest).toBeGreaterThanOrEqual(0);
    expect(older).toBeGreaterThan(newest);
    expect(data.body).toContain('Highlights of 2.3.0.');
    expect(data.body).not.toContain('Highlights of 2.2.0.');
  });

  it('shows the support footer once when it rolls releases up', async () => {
    await create({ [DIALOG_KEY]: '2.2.0' }).checkLastLoggedInVersion();

    const body = shownDialog().body;
    expect(body.split('Support development').length - 1).toBe(1);
    expect(body.trim().endsWith(FOOTER.trim())).toBeTrue();
  });

  it('caps the dialog at three releases and links to the oldest missed one', async () => {
    await create({ [DIALOG_KEY]: '1.9.0' }).checkLastLoggedInVersion();

    const body = shownDialog().body;
    expect(body).toContain('Highlights of 2.4.0.');
    expect(body).toContain('Highlights of 2.3.0.');
    expect(body).toContain('Highlights of 2.2.0.');
    expect(body).not.toContain('Highlights of 2.1.0.');
    expect(body).toContain('…and 2 earlier updates.');
    expect(body).toContain('href="/docs/release-notes#v2.0.0"');
  });

  it('never shows a note for a version newer than the running one', async () => {
    await create({ [DIALOG_KEY]: '2.3.1' }).checkLastLoggedInVersion();

    expect(shownDialog().body).not.toContain('2.5.0');
  });

  it('shows nothing when only patches without notes were missed', async () => {
    environment.version = '2.3.1';

    await create({ [DIALOG_KEY]: '2.3.0' }).checkLastLoggedInVersion();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(storage.get(DIALOG_KEY)).toBe('2.3.1');
  });

  it('does not move the stored version backwards after a rollback', async () => {
    await create({ [DIALOG_KEY]: '2.5.0' }).checkLastLoggedInVersion();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(storage.get(DIALOG_KEY)).toBe('2.5.0');
  });

  it('logs how many releases the dialog covered', async () => {
    await create({ [DIALOG_KEY]: '1.9.0' }).checkLastLoggedInVersion();

    expect(logging.logEvent).toHaveBeenCalledWith(
      'VersionReleaseNotes_Opened',
      jasmine.objectContaining({ unseenCount: 5, shownCount: 3 })
    );
  });

  describe('the unread indicator', () => {
    // The dialog marks its releases shown as it opens. If the indicator read
    // the same value, it would clear before anyone saw it.
    it('stays on after the dialog runs, until the page is opened', async () => {
      const service = create({ [DIALOG_KEY]: '2.2.0' });

      await service.checkLastLoggedInVersion();

      expect(service.hasUnreadReleases()).toBeTrue();
      expect(service.firstUnreadAnchor()).toBe('v2.3.0');

      service.markReleaseNotesViewed();

      expect(service.hasUnreadReleases()).toBeFalse();
      expect(service.firstUnreadAnchor()).toBeNull();
      expect(storage.get(PAGE_KEY)).toBe('2.4.0');
    });

    it('is off for a first visit', async () => {
      const service = create();

      await service.checkLastLoggedInVersion();

      expect(service.hasUnreadReleases()).toBeFalse();
    });

    it('follows the page, not the dialog, once the page has been opened', () => {
      const service = create({ [DIALOG_KEY]: '2.4.0', [PAGE_KEY]: '2.1.0' });

      expect(service.unreadReleases().map((r) => r.version)).toEqual([
        '2.4.0',
        '2.3.0',
        '2.2.0',
      ]);
    });
  });

  it('reads no storage while prerendering', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const service = create({ [DIALOG_KEY]: '2.2.0', [PAGE_KEY]: '2.2.0' });

    expect(service.hasUnreadReleases()).toBeFalse();
    service.markReleaseNotesViewed();
    expect(storage.get(PAGE_KEY)).toBe('2.2.0');
  });
});
