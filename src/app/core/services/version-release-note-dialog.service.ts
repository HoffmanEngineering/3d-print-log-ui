import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import {
  DIALOG_NOTE_LIMIT,
  DIALOG_RELEASE_NOTES,
  DialogReleaseNote,
  RELEASE_VERSIONS,
} from 'src/app/documentation/generated/release-dialog-notes';
import { openSimpleDialog } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { LocalStorageService } from './local-storage.service';
import { LoggingService } from './logging.service';
import { SubscriptionService } from './subscription.service';
import { UserSettingService, UserSettingType } from './user-setting.service';
import { CAN_PURCHASE_PRO } from '../pricing/pro-purchase';

/**
 * What the dialog and the unread indicator read, generated from
 * `src/content/release-notes/` by `npm run docs:generate`. A token so specs can
 * supply a fixed history instead of the real one, which changes every release.
 */
export interface ReleaseNoteData {
  /** Every release on the release notes page, newest first. */
  versions: readonly string[];
  /** The newest dialog notes, newest first. */
  notes: readonly DialogReleaseNote[];
}

export const RELEASE_NOTE_DATA = new InjectionToken<ReleaseNoteData>(
  'RELEASE_NOTE_DATA',
  {
    providedIn: 'root',
    factory: () => ({
      versions: RELEASE_VERSIONS,
      notes: DIALOG_RELEASE_NOTES,
    }),
  }
);

/**
 * How many missed releases the dialog shows in full. The rest are one link to
 * the release notes page, so a user who skipped ten releases is not handed ten
 * releases' worth of text in a modal. Set by the generator, which ships only
 * this many notes.
 */
export const MAX_RELEASES_IN_DIALOG = DIALOG_NOTE_LIMIT;

/**
 * The closing paragraphs, added once after every release the dialog shows. The
 * notes themselves never carry them (validate-docs refuses one that does), so a
 * roll-up of three releases does not ask three times.
 */
export const SUPPORT_FOOTER = `<p>
<strong>Support development of 3D Print Log:</strong><br />
<a href="/subscription">Subscribe to Pro</a> for an ad-free experience and extra cloud storage,
buy me a coffee by <a href="https://paypal.me/hoffmanengineering" rel="noreferrer noopener" target="_blank">donating via PayPal</a>,
or by becoming a <a href="https://www.patreon.com/HoffmanEngineering" rel="noreferrer noopener" target="_blank">Patron of Hoffman Engineering</a>
on Patreon.com
</p>
<p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!</p>`;

/**
 * For free users in the iOS app: no Pro link and no tip links, because App Store guideline
 * 3.1.1 allows neither outside in-app purchase (#366). Just the closing line.
 */
export const IOS_APP_FOOTER = `<p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!</p>`;

/** For Pro members, who already support development: thanks, not an ask. */
export const PRO_FOOTER = `<p>
Thank you for supporting 3D Print Log with Pro! Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`;

@Injectable({
  providedIn: 'root',
})
export class VersionReleaseNoteDialogService {
  private readonly dialog = inject(MatDialog);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly loggingService = inject(LoggingService);
  private readonly userSettings = inject(UserSettingService);
  private readonly auth = inject(AuthService);
  private readonly subscription = inject(SubscriptionService);
  private readonly data = inject(RELEASE_NOTE_DATA);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly canPurchasePro = inject(CAN_PURCHASE_PRO);

  /** The newest version whose notes the dialog has shown in this browser. */
  private readonly DIALOG_KEY = 'LastLoggedInVersion';
  /** The newest version current when the user last opened the release notes page. */
  private readonly PAGE_KEY = 'LastViewedReleaseNotesVersion';

  /**
   * Read from this browser at once, so the indicator needs no request, then
   * raised to the account's values when the dialog check fetches them. Null
   * when nothing is stored.
   */
  private readonly lastShownVersion = signal<string | null>(
    this.read(this.DIALOG_KEY)
  );
  private readonly lastViewedVersion = signal<string | null>(
    this.read(this.PAGE_KEY)
  );

  /**
   * Releases the user has not read on the release notes page, newest first,
   * patches included. Deliberately not the dialog's list: the dialog runs on
   * sign in and marks its releases shown at once, so an indicator tied to it
   * would clear before anyone could see it. The dialog is the summary, and
   * this is the pointer to everything.
   */
  readonly unreadReleases = computed(() =>
    this.releasesSince(this.lastViewedVersion())
  );

  readonly hasUnreadReleases = computed(() => this.unreadReleases().length > 0);

  /**
   * The release notes page anchor for the oldest unread release, so the user
   * lands on the first one they missed. Null when nothing is unread.
   */
  readonly firstUnreadAnchor = computed(() => {
    const unread = this.unreadReleases();
    return unread.length > 0 ? `v${unread[unread.length - 1]}` : null;
  });

  /**
   * Shows every release the user missed since the dialog last ran, in one
   * dialog. A first visit (nothing stored on this browser or the account)
   * shows nothing: a changelog means nothing to someone who has not used the
   * app yet.
   *
   * The account's values are what make this work across devices: without
   * them, signing in on a new phone looked like a first visit, and switching
   * between two browsers showed nothing on either.
   */
  public async checkLastLoggedInVersion() {
    const account = await this.readAccountVersions();

    const lastShown = newest(this.lastShownVersion(), account?.shown ?? null);
    // Browsers that stored a version before the page was tracked separately
    // start the page from where the dialog was, so the indicator still covers
    // the releases this visit brings.
    const lastViewed =
      newest(this.lastViewedVersion(), account?.viewed ?? null) ?? lastShown;

    if (lastViewed !== null) {
      this.write(this.lastViewedVersion, this.PAGE_KEY, lastViewed);
    }
    if (lastShown !== null) {
      this.write(this.lastShownVersion, this.DIALOG_KEY, lastShown);
    }
    this.advance(this.lastShownVersion, this.DIALOG_KEY);

    // Only after a successful read: a write needs the row the read loads, and
    // a failed read must not be taken to mean the account has nothing stored.
    if (account) {
      this.saveToAccount(
        UserSettingType.ReleaseNotes_LastShownVersion,
        this.lastShownVersion()
      );
      this.saveToAccount(
        UserSettingType.ReleaseNotes_LastViewedVersion,
        this.lastViewedVersion()
      );
    }

    const notes = this.notesSince(lastShown);
    if (lastShown === null || notes.length === 0) {
      return;
    }

    await this.showReleaseNotes(
      notes,
      this.releasesSince(lastShown),
      lastShown
    );
  }

  /** Called by the release notes page: everything up to now has been read. */
  public markReleaseNotesViewed() {
    if (!this.isBrowser) {
      return;
    }
    this.advance(this.lastViewedVersion, this.PAGE_KEY);

    // The page is public, and a signed-out visitor has no account to save to.
    // Opened before sign-in finished, the next dialog check saves it instead.
    if (this.auth.isLoggedIn() === true) {
      this.saveToAccount(
        UserSettingType.ReleaseNotes_LastViewedVersion,
        this.lastViewedVersion()
      );
    }
  }

  /**
   * Both of the account's versions, or null when they could not be read. A
   * signed-out caller reads as nothing stored, which the settings service
   * reports as an empty list rather than an error.
   */
  private async readAccountVersions(): Promise<{
    shown: string | null;
    viewed: string | null;
  } | null> {
    try {
      const [shown, viewed] = await Promise.all([
        this.userSettings.getCurrentUsersSettingByType(
          UserSettingType.ReleaseNotes_LastShownVersion
        ),
        this.userSettings.getCurrentUsersSettingByType(
          UserSettingType.ReleaseNotes_LastViewedVersion
        ),
      ]);
      return { shown: shown?.value ?? null, viewed: viewed?.value ?? null };
    } catch (error) {
      // The dialog still works from this browser's values alone.
      this.loggingService.logException(error as Error);
      return null;
    }
  }

  /**
   * Saves a version to the account when it is newer than what the account
   * has. Never lowers it: another device on a newer deploy, or a rollback,
   * must not bring notes back that were already shown. Not awaited by callers;
   * a failure only means this device's value is not shared yet.
   */
  private saveToAccount(type: UserSettingType, version: string | null) {
    if (version === null || parseVersion(version) === null) {
      return;
    }
    void (async () => {
      try {
        const existing =
          await this.userSettings.getCurrentUsersSettingByType(type);
        if (existing && newest(existing.value, version) === existing.value) {
          return;
        }
        await this.userSettings.addOrUpdateSetting(type, version);
      } catch (error) {
        this.loggingService.logException(error as Error);
      }
    })();
  }

  /**
   * Moves a stored version up to the running one. Never moves it backwards, so
   * a rollback and redeploy does not show the same notes twice.
   */
  private advance(version: WritableSignal<string | null>, key: string) {
    const current = environment.version;
    const stored = version();

    if (stored !== null && newest(stored, current) === stored) {
      return;
    }

    this.write(version, key, current);
  }

  private write(
    version: WritableSignal<string | null>,
    key: string,
    value: string
  ) {
    version.set(value);
    if (!this.isBrowser) {
      return;
    }
    try {
      this.localStorageService.setItem(key, value);
    } catch {
      // Storage blocked or full: the signal still holds for this visit, and
      // the account keeps the value for the next one.
    }
  }

  private read(key: string): string | null {
    // The navbar reads this while prerendering, where there is no storage.
    if (!this.isBrowser) {
      return null;
    }
    try {
      return this.localStorageService.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Versions on the release notes page newer than `lastSeen`, up to the
   * running version, newest first. Nothing when `lastSeen` is null or
   * unreadable, which is treated as a first visit.
   */
  private releasesSince(lastSeen: string | null): string[] {
    return this.data.versions.filter((version) =>
      this.isUnseen(version, lastSeen)
    );
  }

  /** The dialog notes newer than `lastSeen`, newest first. */
  private notesSince(lastSeen: string | null): DialogReleaseNote[] {
    return this.data.notes.filter((note) =>
      this.isUnseen(note.version, lastSeen)
    );
  }

  private isUnseen(version: string, lastSeen: string | null) {
    const current = environment.version;
    return (
      lastSeen !== null &&
      parseVersion(lastSeen) !== null &&
      parseVersion(current) !== null &&
      parseVersion(version) !== null &&
      compareVersions(version, lastSeen) > 0 &&
      compareVersions(version, current) <= 0
    );
  }

  private footer(isPro: boolean): string {
    if (isPro) {
      return PRO_FOOTER;
    }
    return this.canPurchasePro ? SUPPORT_FOOTER : IOS_APP_FOOTER;
  }

  private showReleaseNotes(
    notes: DialogReleaseNote[],
    releases: string[],
    lastSeen: string
  ) {
    const shown = notes.slice(0, MAX_RELEASES_IN_DIALOG);
    const isPro = this.subscription.isPro();

    this.loggingService.logEvent('VersionReleaseNotes_Opened', {
      version: environment.version,
      lastSeenVersion: lastSeen,
      unseenCount: releases.length,
      shownCount: shown.length,
      isPro,
    });

    const dialogRef = openSimpleDialog(
      this.dialog,
      {
        title:
          shown.length === 1
            ? shown[0].title
            : "What's new since your last visit",
        body: dialogBody(shown, releases, this.footer(isPro)),
        yesText: 'Ok',
        yesColor: 'primary',
        noText: '',
      },
      { maxWidth: '450px' }
    );

    return lastValueFrom(dialogRef.afterClosed(), { defaultValue: undefined });
  }
}

/**
 * The notes shown (one as-is, several each under its own heading), a link for
 * the releases that did not fit, and the footer once at the end.
 *
 * `releases` is every unseen release on the page, so the link also counts the
 * patches that have page notes but no dialog note.
 */
function dialogBody(
  shown: DialogReleaseNote[],
  releases: string[],
  footer: string
): string {
  const sections =
    shown.length === 1
      ? [shown[0].html]
      : shown.map((note) => `<h2>${escapeHtml(note.title)}</h2>\n${note.html}`);

  const more = releases.length - shown.length;
  if (more > 0) {
    const oldest = releases[releases.length - 1];
    const noun = more === 1 ? 'release' : 'releases';
    sections.push(
      `<p>…and ${more} more ${noun} since your last visit. <a href="/docs/release-notes#v${oldest}">Read every release you missed</a>.</p>`
    );
  }

  return [...sections, footer].join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** `1.52.0` as numbers, or null for anything that is not a plain x.y.z. */
function parseVersion(version: string): number[] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  return match ? match.slice(1).map(Number) : null;
}

/** Negative, zero or positive as `a` is older than, equal to or newer than `b`. */
function compareVersions(a: string, b: string): number {
  const left = parseVersion(a) ?? [0, 0, 0];
  const right = parseVersion(b) ?? [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) {
      return left[i] - right[i];
    }
  }
  return 0;
}

/**
 * The newer of two stored versions. An unreadable one counts as nothing
 * stored, so a corrupted value on one side never hides a good one.
 */
function newest(a: string | null, b: string | null): string | null {
  const left = a !== null && parseVersion(a) !== null ? a : null;
  const right = b !== null && parseVersion(b) !== null ? b : null;
  if (left === null || right === null) {
    return left ?? right;
  }
  return compareVersions(left, right) >= 0 ? left : right;
}
