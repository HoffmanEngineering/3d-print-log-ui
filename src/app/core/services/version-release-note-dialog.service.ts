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
    '1.14.0': {
      title: '1.14.0 - Gcode Parsing for all Slicers',
      body: `<p>
  3D Print Log now has the ability to add prints from any gcode file.
  Previously only a handful of slicers were supported, but now if a supported
  parser is not available, then the gcode is analyzed to determine print
  information.
</p>
<p>
  Find the <strong>Add Print from Gcode</strong> on the
  <strong>Print List</strong>.
</p>
<p>
  Gcode Parsing based on
  <a target="_blank" href="https://github.com/hudbrog/gCodeViewer"
    >hudbrog's gCodeViewer</a
  >, which you can find at
  <a target="_blank" href="https://gcode.ws/">gcode.ws</a>.
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
    '1.13.0': {
      title: '1.13.0 - Favorite Filaments',
      body: `<p>
  As your filament roll collection grows, it can be difficult to find a
  particular roll in your list. Filament can now be marked as a "favorite" by
  clicking on the star in the filament list. The filament list can be filtered
  to only show favorite filament. The filament list can also be filtered to
  only show currently loaded filament.
</p>
<h4>Full List of Changes:</h4>
<ul>
  <li>
    <Strong>Favorite Filaments</Strong> - Click the Star Icon in the Filament
    List to add that roll to your "favorites".
  </li>
  <li>Filament List can now be filtered to show only favorite filaments.</li>
  <li>
    Filament List can now be filtered to show only currently loaded filaments.
  </li>
  <li>
    Filament List More (...) menu includes a "Mark as Empty" option, which
    will automatically set that roll's available filament to 0g and set the
    roll as "inactive".
  </li>
  <li>Loading indicator added to Filament List.</li>
  <li>Improved accessibility on Print List and Filament List pages.</li>
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
  </p><p>Happy Printing!
</p>`,
    },
    '1.12.8': {
      redirect: '1.12.7',
    },
    '1.12.7': {
      redirect: '1.12.6',
    },
    '1.12.6': {
      redirect: '1.12.5',
    },
    '1.12.5': {
      title: '1.12.5 Filter Prints/Analytics by Printers',
      body: `<p>
  The Print List and Analytics pages can now be filtered by one or more
  printers.
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
    '1.12.4': {
      title: '1.12.4 Release - Snapshots from Cura',
      body: `<img
  class="version-release-note-dialog-image"
  alt="The Add 3D Print screen with the cura snapshot as the print image."
  src="./assets/release_curasnapshot_40d0a079b.png"
/>
<p>
  The <strong>3D Print Log Uploader Plugin for Cura</strong> as been
  updated to version 1.2.1. This version adds an "Include Snapshot" option
  which will automatically send a screenshot from Cura as the print's
  image.
</p>
<p>
  You can install v1.2.1 of the
  plugin via the
  <a
    href="https://marketplace.ultimaker.com/app/cura/plugins/3d-print-log/3dPrintLogUploader"
    >Ultimaker Cura Marketplace</a
  >
  . Alternatively, you can download the
  <a
    href="https://github.com/ChristopherHoffman/3d-print-log-cura-plugin/releases"
    >Latest Release from Github</a
  >
  and drag/drop into Cura to install.
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
    '1.12.3': {
      title: '1.12.3 - Printers keep track of Loaded Filament',
      body: `<p>
  Printers now keep track of what filament rolls were last used. These are
  considered the printer's <strong>Loaded Filament</strong>. When you start to
  add a new print, the selected printer's
  <strong>Loaded Filament</strong> will automatically populate. And when the
  new print is saved, it'll automatically add the print's selected filament as
  that printer's currently loaded filament.
</p>
<p>
  A printer's currently loaded filament is displayed on the
  <strong>Printer List</strong>, and the filament's current printer is
  displayed on the <strong>Filament List</strong>.
</p>
<p>
  See the <a rel="noreferrer noopener" target="_blank" href="/docs/printers">Printer Documentation</a> for more
  information on managing loaded filament.
</p>
<h4>Full List of Changes:</h4>
<ul>
  <li>
    New Prints will automatically populate the
    <strong>Filament Usage</strong> section based on the selected printer's
    <strong>Loaded Filament</strong>.
  </li>
  <li>
    Printer List displays the printer's Loaded Filament.
    <ul>
      <li>
        Printer List contains a ...more menu which allows for quick unloading
        of filament.
      </li>
    </ul>
  </li>
  <li>
    Editing a Printer allows you to manager that printer's
    <strong>Loaded Filament</strong>.
  </li>
  <li>
    Filament List display which printer that filament is currently loaded in.
  </li>
  <li>
    Filament List has a new menu option to navigate to the edit page for
    printer it's currently loaded in.
  </li>
  <li>
    Filament List will now display the Inactive badge for inactive filament
    rolls.
  </li>
  <li>
    Searching on the Print List and Filament List has been improved. Search
    will look for words separated by spaces, and search for exact text by
    enclosing words with quotes. Searching for filament material type has been
    added.
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
  </p><p>Happy Printing!
</p>`,
    },
    '1.12.2': {
      redirect: '1.12.1',
    },
    '1.12.1': {
      title: '1.12.1 Release - Ability to Delete Comments',
      body: `<p>
      You can now delete your own comments. The owner of a print can also moderate
      comments on their prints and have the ability to remove comments from other users.
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
    '1.12.0': {
      title:
        '1.12.0 Release - Customize Settings with 3D Print Log Cura Plugin v1.2.0',
      body: `<p>
  The <strong>3D Print Log Uploader</strong> plugin for Ultimaker Cura has
  been updated to v1.2.0. You can now select any combination of Cura settings
  to record, so you can log the information that is important to you.
</p>
<h4>Plugin Changes:</h4>
<ul>
  <li>
    Customize the list of settings recorded. Settings Menu is accessible
    inside of Cura through Extensions -> 3D Print Log -> Configure Settings to
    Log
  </li>
  <li>Added option to log Cura Profile Name.</li>
  <li>Added option to log selected filament names and materials.</li>
  <li>Added support for Cura 4.9.</li>
</ul>
<p>
  You can install v1.2.0 of the
  plugin via the
  <a
    href="https://marketplace.ultimaker.com/app/cura/plugins/3d-print-log/3dPrintLogUploader"
    >Ultimaker Cura Marketplace</a
  >
  . Alternatively, you can download the
  <a
    href="https://github.com/ChristopherHoffman/3d-print-log-cura-plugin/releases"
    >Latest Release from Github</a
  >
  and drag/drop into Cura to install.
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
    '1.11.2': {
      redirect: '1.11.1',
    },
    '1.11.1': {
      redirect: '1.11.0',
    },
    '1.11.0': {
      title: '1.11.0 Release - Delete User Accounts',
      body: `<p>
  You are in control of your data, so now you can choose to delete your 3D
  Print Log account and all associated data. If you wish to delete your
  account, you can find the new options under
  <strong>Delete Account</strong> on your
  <a href="/settings">Settings Page</a>. After a 24 hour waiting period,
  your account and all prints, filament, printers, etc, will be permanently
  deleted from the website.
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
