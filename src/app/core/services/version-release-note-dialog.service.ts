import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VersionReleaseNoteDialogService {
  private readonly LOCAL_STORAGE_KEY = 'LastLoggedInVersion';

  private releaseNotes = {
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

  constructor(private readonly dialog: MatDialog) {}

  public checkLastLoggedInVersion() {
    const version = localStorage.getItem(this.LOCAL_STORAGE_KEY);

    if (version === null || version !== environment.version) {
      this.displayReleaseNotes(environment.version);
    }
  }

  private setLastLoggedInVersion(version: string) {
    localStorage.setItem(this.LOCAL_STORAGE_KEY, version);
  }

  private displayReleaseNotes(newVersion: string) {
    if (this.releaseNotes[newVersion]) {
      const dialogRef = this.dialog.open(SimpleDialogComponent, {
        maxWidth: '400px',
      });
      (dialogRef.componentInstance as any).title = this.releaseNotes[
        newVersion
      ].title;
      // tslint:disable-next-line: max-line-length
      (dialogRef.componentInstance as any).body = this.releaseNotes[
        newVersion
      ].body;
      (dialogRef.componentInstance as any).yesText = 'Ok';
      (dialogRef.componentInstance as any).yesColor = 'primary';
      (dialogRef.componentInstance as any).noText = '';

      dialogRef.afterClosed().subscribe(() => {
        this.setLastLoggedInVersion(newVersion);
      });
    }
  }
}
