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
