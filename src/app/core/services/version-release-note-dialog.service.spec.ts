import type { MockedObject } from 'vitest';
import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { SimpleDialogData } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { LocalStorageService } from './local-storage.service';
import { LoggingService } from './logging.service';
import { SubscriptionService } from './subscription.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from './user-setting.service';

import {
  IOS_APP_FOOTER,
  PRO_FOOTER,
  RELEASE_NOTE_DATA,
  ReleaseNoteData,
  SUPPORT_FOOTER,
  VersionReleaseNoteDialogService,
} from './version-release-note-dialog.service';

const DIALOG_KEY = 'LastLoggedInVersion';
const PAGE_KEY = 'LastViewedReleaseNotesVersion';
const SHOWN = UserSettingType.ReleaseNotes_LastShownVersion;
const VIEWED = UserSettingType.ReleaseNotes_LastViewedVersion;

function note(version: string) {
  return {
    version,
    title: `${version} - Release ${version}`,
    html: `<p>Highlights of ${version}.</p>`,
  };
}

/**
 * The real history changes every release, so every test runs against this
 * one, with the running version pinned to 2.4.0. 2.3.1 and 2.2.0 are on the
 * page with no dialog note, the way a patch usually is.
 */
const HISTORY: ReleaseNoteData = {
  versions: [
    '2.5.0',
    '2.4.0',
    '2.3.1',
    '2.3.0',
    '2.2.0',
    '2.1.0',
    '2.0.0',
    '1.9.0',
  ],
  // A note ahead of the running version is never shown.
  notes: ['2.5.0', '2.4.0', '2.3.0', '2.1.0', '2.0.0'].map(note),
};

/** Lets the account writes, which callers do not await, finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

import { CAN_PURCHASE_PRO } from '../pricing/pro-purchase';
describe('VersionReleaseNoteDialogService', () => {
  let storage: Map<string, string>;
  let account: Map<UserSettingType, string>;
  let accountWrites: [UserSettingType, string][];
  let accountFails: boolean;
  let dialog: MockedObject<MatDialog>;
  let logging: MockedObject<LoggingService>;
  let isLoggedIn: ReturnType<typeof signal<boolean | null>>;
  let isPro: ReturnType<typeof signal<boolean>>;
  let originalVersion: string;

  beforeEach(() => {
    originalVersion = environment.version;
    environment.version = '2.4.0';

    storage = new Map();
    account = new Map();
    accountWrites = [];
    accountFails = false;

    const localStorage: Partial<LocalStorageService> = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
    };

    const userSettings: Partial<UserSettingService> = {
      getCurrentUsersSettingByType: async (type: UserSettingType) => {
        if (accountFails) {
          throw new Error('offline');
        }
        const value = account.get(type);
        return value === undefined
          ? null
          : ({ userSettingTypeId: type, value } as UserSetting);
      },
      addOrUpdateSetting: async (type: UserSettingType, value: string) => {
        accountWrites.push([type, value]);
        account.set(type, value);
      },
    };

    isLoggedIn = signal<boolean | null>(true);
    isPro = signal(false);

    dialog = {
      open: vi.fn().mockName('MatDialog.open'),
    } as unknown as MockedObject<MatDialog>;
    dialog.open.mockReturnValue({
      afterClosed: () => of(true),
    } as unknown as MatDialogRef<unknown, unknown>);
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;

    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: LocalStorageService, useValue: localStorage },
        { provide: LoggingService, useValue: logging },
        { provide: UserSettingService, useValue: userSettings },
        { provide: AuthService, useValue: { isLoggedIn } },
        { provide: SubscriptionService, useValue: { isPro } },
        { provide: RELEASE_NOTE_DATA, useValue: HISTORY },
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
    return TestBed.inject(VersionReleaseNoteDialogService);
  }

  function shownDialog(): SimpleDialogData {
    expect(dialog.open).toHaveBeenCalledTimes(1);
    return vi.mocked(dialog.open).mock.lastCall[1]!.data as SimpleDialogData;
  }

  it('shows nothing when the stored version is the running one', async () => {
    await create({ [DIALOG_KEY]: '2.4.0' }).checkLastLoggedInVersion();

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('shows nothing on a first visit, and records the running version', async () => {
    await create().checkLastLoggedInVersion();
    await settle();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(storage.get(DIALOG_KEY)).toBe('2.4.0');
    expect(account.get(SHOWN)).toBe('2.4.0');
  });

  it('treats an unreadable stored version as a first visit', async () => {
    await create({ [DIALOG_KEY]: 'not-a-version' }).checkLastLoggedInVersion();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(storage.get(DIALOG_KEY)).toBe('2.4.0');
  });

  it('shows a single missed release under its own title', async () => {
    await create({ [DIALOG_KEY]: '2.3.1' }).checkLastLoggedInVersion();

    const data = shownDialog();
    expect(data.title).toBe('2.4.0 - Release 2.4.0');
    expect(data.body).toBe(`<p>Highlights of 2.4.0.</p>\n${SUPPORT_FOOTER}`);
    expect(storage.get(DIALOG_KEY)).toBe('2.4.0');
  });

  it('rolls every missed dialog note into one dialog, newest first', async () => {
    await create({ [DIALOG_KEY]: '2.2.0' }).checkLastLoggedInVersion();

    const data = shownDialog();
    expect(data.title).toBe("What's new since your last visit");
    const newest = data.body.indexOf('<h2>2.4.0 - Release 2.4.0</h2>');
    const older = data.body.indexOf('<h2>2.3.0 - Release 2.3.0</h2>');
    expect(newest).toBeGreaterThanOrEqual(0);
    expect(older).toBeGreaterThan(newest);
    expect(data.body).not.toContain('Highlights of 2.1.0.');
  });

  it('counts the releases with no dialog note in its link to the page', async () => {
    await create({ [DIALOG_KEY]: '2.2.0' }).checkLastLoggedInVersion();

    // 2.4.0 and 2.3.0 are shown; 2.3.1 is on the page only.
    expect(shownDialog().body).toContain(
      '…and 1 more release since your last visit.'
    );
  });

  it('adds the support footer once, at the end', async () => {
    await create({ [DIALOG_KEY]: '2.2.0' }).checkLastLoggedInVersion();

    const body = shownDialog().body;
    expect(body.split('Support development').length - 1).toBe(1);
    expect(body.endsWith(SUPPORT_FOOTER)).toBe(true);
  });

  it('thanks a Pro member instead of asking for support', async () => {
    isPro.set(true);

    await create({ [DIALOG_KEY]: '2.2.0' }).checkLastLoggedInVersion();

    const body = shownDialog().body;
    expect(body.endsWith(PRO_FOOTER)).toBe(true);
    expect(body).not.toContain('Support development');
  });

  it('offers no Pro or tip links to a free user in the iOS app', async () => {
    TestBed.overrideProvider(CAN_PURCHASE_PRO, { useValue: false });

    await create({ [DIALOG_KEY]: '2.2.0' }).checkLastLoggedInVersion();

    const body = shownDialog().body;
    expect(body.endsWith(IOS_APP_FOOTER)).toBe(true);
    expect(body).not.toContain('/subscription');
    expect(body).not.toContain('paypal');
    expect(body).not.toContain('patreon');
  });

  it('caps the dialog at three notes and links to the oldest missed release', async () => {
    await create({ [DIALOG_KEY]: '1.9.0' }).checkLastLoggedInVersion();

    const body = shownDialog().body;
    expect(body).toContain('Highlights of 2.4.0.');
    expect(body).toContain('Highlights of 2.3.0.');
    expect(body).toContain('Highlights of 2.1.0.');
    expect(body).not.toContain('Highlights of 2.0.0.');
    expect(body).toContain('…and 3 more releases since your last visit.');
    expect(body).toContain('href="/docs/release-notes#v2.0.0"');
  });

  it('never shows a note for a version newer than the running one', async () => {
    await create({ [DIALOG_KEY]: '2.3.1' }).checkLastLoggedInVersion();

    expect(shownDialog().body).not.toContain('2.5.0');
  });

  it('only lights the indicator when the missed releases have no dialog note', async () => {
    environment.version = '2.3.1';
    const service = create({ [DIALOG_KEY]: '2.3.0' });

    await service.checkLastLoggedInVersion();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(storage.get(DIALOG_KEY)).toBe('2.3.1');
    expect(service.unreadReleases()).toEqual(['2.3.1']);
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
      expect.objectContaining({ unseenCount: 6, shownCount: 3, isPro: false })
    );
  });

  describe('the account', () => {
    // The reason it exists: a new device used to look like a first visit.
    it('shows what a user missed on a device that has stored nothing', async () => {
      account.set(SHOWN, '2.2.0');

      await create().checkLastLoggedInVersion();

      expect(shownDialog().title).toBe("What's new since your last visit");
      expect(storage.get(DIALOG_KEY)).toBe('2.4.0');
    });

    it('shows nothing when another device already showed these notes', async () => {
      account.set(SHOWN, '2.4.0');

      await create({ [DIALOG_KEY]: '2.2.0' }).checkLastLoggedInVersion();

      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('is raised to what this browser has seen', async () => {
      account.set(SHOWN, '2.2.0');

      await create({
        [DIALOG_KEY]: '2.4.0',
        [PAGE_KEY]: '2.3.0',
      }).checkLastLoggedInVersion();
      await settle();

      expect(account.get(SHOWN)).toBe('2.4.0');
      expect(account.get(VIEWED)).toBe('2.3.0');
    });

    it('is never lowered by an older deploy', async () => {
      account.set(SHOWN, '2.5.0');
      account.set(VIEWED, '2.5.0');

      await create().checkLastLoggedInVersion();
      await settle();

      expect(accountWrites).toEqual([]);
    });

    it('falls back to this browser when it cannot be read, and writes nothing', async () => {
      accountFails = true;

      await create({ [DIALOG_KEY]: '2.2.0' }).checkLastLoggedInVersion();
      await settle();

      expect(dialog.open).toHaveBeenCalledTimes(1);
      expect(accountWrites).toEqual([]);
      expect(logging.logException).toHaveBeenCalled();
    });
  });

  describe('the unread indicator', () => {
    // The dialog marks its releases shown as it opens. If the indicator read
    // the same value, it would clear before anyone saw it.
    it('stays on after the dialog runs, until the page is opened', async () => {
      const service = create({ [DIALOG_KEY]: '2.2.0' });

      await service.checkLastLoggedInVersion();

      expect(service.hasUnreadReleases()).toBe(true);
      expect(service.firstUnreadAnchor()).toBe('v2.3.0');

      service.markReleaseNotesViewed();
      await settle();

      expect(service.hasUnreadReleases()).toBe(false);
      expect(service.firstUnreadAnchor()).toBeNull();
      expect(storage.get(PAGE_KEY)).toBe('2.4.0');
      expect(account.get(VIEWED)).toBe('2.4.0');
    });

    it('is off for a first visit', async () => {
      const service = create();

      await service.checkLastLoggedInVersion();

      expect(service.hasUnreadReleases()).toBe(false);
    });

    it('follows the page, not the dialog, once the page has been opened', () => {
      const service = create({ [DIALOG_KEY]: '2.4.0', [PAGE_KEY]: '2.1.0' });

      expect(service.unreadReleases()).toEqual([
        '2.4.0',
        '2.3.1',
        '2.3.0',
        '2.2.0',
      ]);
    });

    it('follows the account once it has been read', async () => {
      account.set(VIEWED, '2.4.0');
      const service = create({ [DIALOG_KEY]: '2.4.0', [PAGE_KEY]: '2.1.0' });

      await service.checkLastLoggedInVersion();

      expect(service.hasUnreadReleases()).toBe(false);
    });

    it('saves a page visit to this browser only when signed out', async () => {
      isLoggedIn.set(false);
      const service = create({ [PAGE_KEY]: '2.2.0' });

      service.markReleaseNotesViewed();
      await settle();

      expect(storage.get(PAGE_KEY)).toBe('2.4.0');
      expect(accountWrites).toEqual([]);
    });
  });

  it('reads no storage while prerendering', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const service = create({ [DIALOG_KEY]: '2.2.0', [PAGE_KEY]: '2.2.0' });

    expect(service.hasUnreadReleases()).toBe(false);
    service.markReleaseNotesViewed();
    expect(storage.get(PAGE_KEY)).toBe('2.2.0');
    expect(accountWrites).toEqual([]);
  });
});
