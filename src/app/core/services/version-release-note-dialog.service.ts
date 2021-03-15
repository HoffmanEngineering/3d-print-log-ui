import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from './local-storage.service';

export interface RedirectRelease {
  /**
   * Tells the version release notes to look and display another version's release notes
   */
  redirect: string;
}

export interface ReleaseNote {
  title: string;
  body: string;
}

export interface ReleaseNoteHistory {
  [x: string]: ReleaseNote | RedirectRelease;
}

@Injectable({
  providedIn: 'root',
})
export class VersionReleaseNoteDialogService {
  private readonly LOCAL_STORAGE_KEY = 'LastLoggedInVersion';

  private releaseNotes: ReleaseNoteHistory = {
    '1.10.0': {
      title: '1.10.0 Release - Copy Filament',
      body: `<p>
  You can now duplicate an existing filament roll. Click the ... menu on the
  <a href="/filament">Filament List</a> and select "Duplicate".
</p>
  
<p>
  Support development of 3D Print Log:<br />Buy me a coffee by
  <a
    href="https://paypal.me/hoffmanengineering"
    rel="noreferrer noopener"
    target="_blank"
    >donating via PayPal</a
  >, or by becoming a
  <a
    href="https://www.patreon.com/HoffmanEngineering"
    rel="noreferrer noopener"
    target="_blank"
  >
    Patron of Hoffman Engineering</a
  >
  on Patreon.com
  </p><p>Happy Printing!
</p>`,
    },
    '1.9.0': {
      title: '1.9.0 Release - OctoPrint Integration',
      body: `  <p>
  3D Print Log now has an <strong>OctoPrint Integration</strong>! 3D Print Log can receive
  information from Octoprint in order to create and update print status, print
  time, and filament usage. It will also save pictures from the camera on success/failure.
  <br />
  Visit the
  <a href="/docs/octoprint-webhook">3D Print Log OctoPrint Docs</a> for
  information on how to set up the integration.
</p>
  
<p>
  Support development of 3D Print Log:<br />Buy me a coffee by
  <a
    href="https://paypal.me/hoffmanengineering"
    rel="noreferrer noopener"
    target="_blank"
    >donating via PayPal</a
  >, or by becoming a
  <a
    href="https://www.patreon.com/HoffmanEngineering"
    rel="noreferrer noopener"
    target="_blank"
  >
    Patron of Hoffman Engineering</a
  >
  on Patreon.com
  </p><p>Happy Printing!
</p>`,
    },
    '1.8.0': {
      title:
        '1.8.0 Release - Filament Measurement by Length, Record File Names 🎉',
      body: `<p>
Many slicers only report filament used in length, so now Filament Usage can be recorded by <strong>Weight (in grams)</strong> or by <strong>Length (in meters)</strong>.
</p>
<p>A <strong>File Name</strong> field has been added to the Print, so you can
record the name of the gcode file generated. This will also be useful in the
upcoming <strong>Octoprint Integration</strong> (coming soon).</p>
<p>Full list of changes:</p>
<ul>
  <li>
    Filament Usage can be recorded by <strong>Weight (in grams)</strong> or by <strong>Length (in meters)</strong>.
  </li>
  <li>
    File Name field added to the Print Details.
  </li>
  <li>
    Multiple "Other" Filament Usage now allowed.
  </li>
</ul>
<p>
  Support development of 3D Print Log:<br />Buy me a coffee by
  <a
    href="https://paypal.me/hoffmanengineering"
    rel="noreferrer noopener"
    target="_blank"
    >donating via PayPal</a
  >, or by becoming a
  <a
    href="https://www.patreon.com/HoffmanEngineering"
    rel="noreferrer noopener"
    target="_blank"
  >
    Patron of Hoffman Engineering</a
  >
  on Patreon.com
  <br />Happy Printing!
</p>`,
    },
    '1.7.3': {
      redirect: '1.7.2',
    },
    '1.7.2': {
      redirect: '1.7.1',
    },
    '1.7.1': {
      title: '1.7.1 Release - Delete Filament and Filament Search Dialog 🎉',
      body: `<p>
  Selecting a roll of filament for a print has now gotten easier. The Print's
  Filament Usage now has a <strong>Select Filament</strong> button which will
  open a filament search dialog. This lets you search for a specific roll of
  filament. In addition, you can now delete a filament if it has not been used
  in a Print from the Filament List.
</p>
<p>Full list of changes:</p>
<ul>
  <li>
    Added a new Search Filament dialog in the Edit Print page to make
    selecting filament for a print easier.
  </li>
  <li>
    Added the ability to delete a filament from the Filaments list page.
  </li>
  <li>
    Fixed a bug where the Filament Color was not being saved until it was
    interacted with.
  </li>
  <li>
    Various enhancements to accessibility and keyboard navigation on the
    Filament pages.
  </li>
</ul>
<p>
  Support development of 3D Print Log by becoming a
  <a
    href="https://www.patreon.com/HoffmanEngineering"
    rel="noreferrer noopener"
    target="_blank"
  >
    Patron of Hoffman Engineering</a
  >
  on Patreon.com
  <br />Happy Printing!
</p>`,
    },
    '1.7.0': {
      title: 'New Release - Filament Tracking is Here 🎉',
      body: `<p>
      Filament tracking is here! Now you can add rolls of filament, and 3D Print
      Log will automatically keep track of how much filament is remaining on the
      roll. See colors, print temperatures, and record brand and purchasing
      information for all your rolls of filament.
    </p>
    <ul>
      <li>
        Added new <a href="/filament">Filament</a> page, where you can
        manage your rolls of filament
      </li>
      <li>
        Updated the <a href="/prints">Print Details</a> page to have a <strong>Filament Usage</strong> section
        for assigning a roll of filament to a print.
      </li>
    </ul>
    <p>
      See the <a href="/docs/filaments">Filament Documentation</a> and
      <a href="/docs/prints">Prints Documentation</a> pages for more info. 
      Please send <a href="/docs/prints">Feedback</a> with questions, comments, and suggestions.
      <br />Happy Printing!
    </p>
    <p>
      Support development of 3D Print Log by becoming a
      <a
        href="https://www.patreon.com/HoffmanEngineering"
        rel="noreferrer noopener"
        target="_blank"
      >
        Patron of Hoffman Engineering</a
      >
      on Patreon.com
    </p>`,
    },
  };

  constructor(
    private readonly dialog: MatDialog,
    private readonly localStorageService: LocalStorageService
  ) {}

  public async checkLastLoggedInVersion() {
    const version = this.localStorageService.getItem(this.LOCAL_STORAGE_KEY);

    if (version === null || version !== environment.version) {
      await this.displayReleaseNotes(environment.version, version);
    }
  }

  private setLastLoggedInVersion(version: string) {
    this.localStorageService.setItem(this.LOCAL_STORAGE_KEY, version);
  }

  private async displayReleaseNotes(
    newVersion: string,
    lastDisplayedVersion: string
  ) {
    let release = this.releaseNotes[newVersion];

    if (release) {
      // Account for redirected release notes
      if (this.isRedirect(release)) {
        release = this.getRedirectedReleaseNotes(release, lastDisplayedVersion);
      }
      if (release) {
        await this.showReleaseNote(release);
      }

      this.setLastLoggedInVersion(newVersion);
    }
  }

  /**
   * Recursively loop through all redirects until you find one that is a release note
   */
  getRedirectedReleaseNotes(
    release: RedirectRelease | ReleaseNote,
    lastDisplayedVersionKey: string
  ): ReleaseNote | null {
    if (this.isReleaseNote(release)) {
      return release;
    } else if (this.isRedirect(release)) {
      const redirectedKey = release.redirect;
      const redirectedNote = this.releaseNotes[redirectedKey];

      // If we've already seen the release that was redirected, stop here
      if (redirectedKey === lastDisplayedVersionKey) {
        return null;
      }

      if (!redirectedNote) {
        return null;
      }

      return this.getRedirectedReleaseNotes(
        redirectedNote,
        lastDisplayedVersionKey
      );
    }
  }

  private isReleaseNote(obj: any): obj is ReleaseNote {
    return obj.title && obj.body;
  }

  private isRedirect(obj: any): obj is RedirectRelease {
    return obj.redirect !== undefined;
  }

  private showReleaseNote(releaseNote: ReleaseNote) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '400px',
    });
    dialogRef.componentInstance.title = releaseNote.title;

    dialogRef.componentInstance.body = releaseNote.body;
    dialogRef.componentInstance.yesText = 'Ok';
    dialogRef.componentInstance.yesColor = 'primary';
    dialogRef.componentInstance.noText = '';

    return dialogRef.afterClosed().toPromise();
  }
}
