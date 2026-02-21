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
    '1.32.0': {
      title: '1.32.0 - Multi-Image Support & Accessibility',
      body: `<p>
Prints now support <strong>up to 5 images</strong>! Upload multiple photos of your print, browse
between them with the new carousel navigation, reorder with drag-and-drop, and designate a default
image to show in your print list.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.31.0': {
      title: '1.31.0 - QR Code Labels for Filament Spools',
      body: `<p>
Quickly identify and select your filament spools with the new <strong>QR Code Labels</strong> feature!
Print QR code labels for your filament spools and scan them to instantly select the filament when
adding prints.
</p>
<p>
Generate labels from the Materials List by selecting filaments and clicking "Print Labels". When
starting a new print, use the QR scanner to quickly select the correct filament without searching
through your collection.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.30.0': {
      title: '1.30.0 - Notifications are Here!',
      body: `<p>
Stay informed with the new <strong>Notifications</strong> feature! 3D Print Log will now
notify you about important events related to your prints and account.
</p>
<p>
Click the bell icon in the navigation bar to view your notifications. You'll receive
notifications for events like print status updates from your connected printers,
comments on your prints, and system announcements.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.29.0': {
      title: '1.29.0- Slic3r Post-Processing Uploader v1.1.0 Released',
      body: `<p>
The
<a
  href="https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader"
  rel="noreferrer noopener"
  target="_blank"
  >Slic3r Post-Processing Uploader</a
>
has been updated to v1.1.0, which adds better multi-material support.
Download the new version today for the latest features.
</p>
<p>
  See the 
  <a rel="noreferrer noopener" target="_blank" href="/docs/slic3r-uploader">Documentation</a> 
  for how to download and configure the slicer plugin.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.28.0': {
      title:
        '1.28.0- Uploader for Slic3r-based Slicers (OrcaSlicer/PrusaSlicer/Bambu Studio/SuperSlicer)',
      body: `<p>
  Initial release of the <a
    href="https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader"
    rel="noreferrer noopener"
    target="_blank"
    >Slic3r Post-Processing Uploader</a>. This plugin will automatically send print information when gcode files are exported.
</p>
<p>
  Windows/Mac/Linux are supported.
</p>
<p>
  See the 
  <a rel="noreferrer noopener" target="_blank" href="/docs/slic3r-uploader">Documentation</a> 
  for how to download and configure the slicer plugin.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.27.1': {
      redirect: '1.27.0',
    },
    '1.27.0': {
      title: '1.27.0- Anycubic Slicer Gcode Parser',
      body: `<p>
  Added support for the Anycubic Slicer when adding prints from gcode. The
  parser will extract the thumbnail, print time, filament usage, and other settings from
  the gcode file.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.26.3': {
      redirect: '1.26.2',
    },
    '1.26.2': {
      redirect: '1.26.1',
    },
    '1.26.1': {
      redirect: '1.26.0',
    },
    '1.26.0': {
      title: '1.26.0 - Klipper/Moonraker Integration is here!',
      body: `<p>
  3D Print Log now integrates with Klipper/Moonraker. Configure your Klipper
  printer to automatically send print information to 3D Print Log, tracking
  print time and filament usage. It uses moonraker's built in
  <strong>notifier</strong> component, so no additional plugins are required,
  just a small configuration change.
</p>
<p>
  See the 
  <a rel="noreferrer noopener" target="_blank" href="/docs/klipper">Documentation</a> 
  for how to configure the klipper integration
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.25.1': {
      redirect: '1.25.0',
    },
    '1.25.0': {
      title: '1.25.0 - Support Resin and Powder Printers',
      body: `<p>
  3D Print Log now supports all printer and material types. Add your resin printers,
  track your bottles of resin or powder, and do it all with new support for volumetric measurements.
  Weights, lengths, and volumes can be used interchangeably, so you can use whatever units you prefer. 
</p>
<p>
  See the 
  <a rel="noreferrer noopener" target="_blank" href="/docs/release-notes">Full Release Notes</a> 
  for all changes and performance improvements in this version.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.24.0': {
      title: '1.24.0 - New Slicer Support',
      body: `  <p>
  Added support for Bambu Studio, Orca, and Creality Print gcode files.
  Additional settings will be parsed from the gcode file when adding a print
  from gcode for these new slicers.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.23.1': {
      title: '1.23.1 - Delete Printers',
      body: `<p>
  Printers can now be deleted. From the Printer List, click the ... menu and
  select "Delete". That will display a confirmation screen, and once accepted
  the printer and all linked maintenance entries will be deleted. Only
  printers that are not used in any prints can be deleted.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.23.0': {
      title: '1.23.0 - Printer Maintenance Log',
      body: `  <p>
  You can now log maintenance on your printers! This will allow you to track
  when you last cleaned your print heads, changed your nozzles, and any other
  maintenance task you want. You can also keep track of upcoming maintenance
  tasks.
</p>
<p>
  The maintenance log can be found on the
  <a rel="noreferrer noopener" target="_blank" href="/printer-maintenance">Printer Maintenance</a>
  page.
</p>
<p>
  This is the initial release, with more functionality around maintenance
  tasks coming in the future. More analytics, reminders, and task rules are in
  the works. If you have any suggestions, please send in a
  <a rel="noreferrer noopener" target="_blank" href="/feedback">feedback</a>!
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.22.4': {
      redirect: '1.22.3',
    },
    '1.22.3': {
      title: '1.22.3 - Filament Field Autocomplete',
      body: `<p>
  Added autocomplete suggestions to the Filament Detail page. The "Brand",
  "Storage Location", and "Purchase Location" fields will now suggest
  previously used values.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.22.2': {
      redirect: '1.22.1',
    },
    '1.22.1': {
      title: '1.22.1 - Fix for Safari',
      body: `<p>
  Fixed an issue where the filament details page was not navigating correctly
  when using the Safari web browser.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.22.0': {
      title: '1.22.0 - Copy Print Image and Reorder Print List Columns',
      body: `<p>
  When copying a print, the print image will also be copied. You can remove
  the image before saving if you do not want to save the copied image.
</p>
<p>
  Columns on the Print List can now be reordered! From the Print List, click
  the Gear Menu -> Change Table Layout, and then either drag-and-drop or use
  the arrows to reorder the columns.
</p>
<p>
  Styling across the application have been adjusted to be more accessible 
  and easier to read and navigate. See the 
  <a rel="noreferrer noopener" target="_blank" href="/docs/release-notes">Full Release Notes</a> 
  for all changes and bug fixes in this version.
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />Buy me a coffee by
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.21.0': {
      title: '1.21.0 - Filament Defaults and Total Print Costs',
      body: `<p>
  You can now set the <strong>Default Filament Diameter</strong> and
  <strong>Default Filament Price</strong>. The
  <strong>Default Filament Diameter</strong> will automatically populate the
  diameter when creating a new filament, saving you keystrokes. The
  <strong>Default Filament Price</strong> acts as a global price and will be used in all cost
  calculations when the selected filament doesn't have a price specified.
</p>
<p>
  Speaking of cost calculations, the
  <a routerLink="/prints">Print List</a> now has a new
  <strong>Total Cost</strong> column. This will display the sum of all the
  filament costs for that print. The <strong>Filament</strong> column will
  also display the individual costs for each different filament used in a
  print. You can view those new columns on the Print List by clicking the
  <strong>Gear Icon</strong>-><strong>Change table layout</strong>, then
  selecting <strong>Filament</strong> or <strong>Total Cost</strong>.
</p>
<p>
  And theres a few bug fixes related to the Octoprint Integration and account deactivation. See the <a rel="noreferrer noopener" target="_blank" href="/docs/release-notes">Full Release Notes</a> for all changes and bug fixes in this version.
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
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
    },
    '1.20.0': {
      title: '1.20.0 - Cura Plugin 2.0.5',
      body: `<p>
  The <strong>3D Print Log Uploader Plugin for Cura</strong> has been updated
  to version 2.0.5. This version adds a new option "Include Object Details In
  Notes", which is enabled by default. This will add the object name,
  position, and size information directly within the Notes section went sent
  to 3D Print Log.
</p>
<p>
  You can install v2.0.5 of the
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
    '1.19.1': {
      redirect: '1.19.0',
    },
    '1.19.0': {
      title:
        '1.19.0 Release - Filament on Print List and Partial Success Status',
      body: `<img
      class="version-release-note-dialog-image"
      alt="The Print List with the new Filament and Total Filament columns."
      src="./assets/release_1-19-0_FilamentPrintList_684039eab.PNG"
/>
<p>
  The Print List now has two new optional columns: The
  <strong>Filament</strong> column displays detailed information about the
  filament used for the print, including the color, display name, and weight
  used. The <strong>Total Filament (g)</strong> column displays the sum of all
  the weight of filament used. The <strong>Total Filament (g)</strong> column
  is also sortable, so you can sort the list by weight to find a past design
  that uses a specific amount of filament.
</p>
<p>
  You can view those new columns on the Print List by clicking the
  <strong>Gear Icon</strong>-><strong>Change table layout</strong>, then
  selecting <strong>Filament</strong> or <strong>Total Filament (g)</strong>.
</p>
<p>
  There is a new <strong>Print Status</strong> for
  <strong>Partial Success</strong>. This can be handy for prints where some of
  the parts succeeded, but some failed. You can select the new status when
  editing a print, or using the <strong>Change Print Status</strong> menu
  option from the Print List.
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
    '1.18.0': {
      title: '1.18.0 Release - Filament Storage Location and Bed Temperatures',
      body: `<p>
  The Filament edit details page contains two new fields:
  <strong>Recommended Bed Temperature</strong> and
  <strong>Storage Location</strong>. If you keep your filament organized in
  boxes/containers/etc, you can now save where the filament is stored so you
  can find it easier.
</p>
<p>
  The <strong>Storage Location</strong> is also displayed on the filament
  list, to make it easier to search.
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
    '1.17.2': {
      redirect: '1.17.1',
    },
    '1.17.1': {
      redirect: '1.17.0',
    },
    '1.17.0': {
      title: '1.17.0 Release - Preferred Currency and Filament Costs',
      body: `<img
  class="version-release-note-dialog-image"
  alt="The Edit 3D Print page showing the new filament cost."
  src="./assets/release_filament_cost_8b69eeeb49b59.png"
/>
<p>
  The Edit Print page will now display estimated/actual filament costs.
  When you add the weight or length of filament used, the cost for that
  amount of filament will be displayed.
</p>
<p>
  You can now set your <strong>Preferred Currency</strong> in the Settings
  page (click User Picture -> Settings). The selected currency will be
  used throughout the application.
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
    '1.16.4': {
      title: '1.16.4 - Android App Released!',
      body: `<p>
  3D Print Log now has an Android App! Download the
  <a href="https://play.google.com/store/apps/details?id=com.printlog.app"
    >3D Print Log App from the Google Play Store</a
  >, and start logging your prints and filament usage from your mobile device!
</p>
<p>
  Since this is the initial release, we would appreciate it if you left a
  review and provided feedback about the app. Thank you!
</p>
<p>
  The iOS app is still under development and should be available shortly, so
  keep checking back.
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
    '1.16.3': {
      redirect: '1.16.2',
    },
    '1.16.2': {
      title: '1.16.2 - Support Cura 5 Beta',
      body: `<p>
  The <strong>3D Print Log Uploader Plugin for Cura</strong> has been updated
  to version 2.0.2. This version adds support for the new Cura 5 Beta, as well
  as adding in new settings to control the "Would you like to send to 3D Print
  Log" prompt.
</p>
<p>
  You can install v2.0.2 of the
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
    '1.16.1': {
      redirect: '1.16.0',
    },
    '1.16.0': {
      title: '1.16.0 - Customizable Print List',
      body: `<p>
      The Print List has been updated to have <strong>customizable columns</strong>. You can select
      which columns are visible using the new Gear icon on the Print List page. New columns can be selected, including start/end dates and times, and larger print images.
    </p>
    <p><strong>Item Per Page</strong> settings are now saved, and will be used when reloading the lists.</p>
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
    '1.15.2': {
      redirect: '1.15.1',
    },
    '1.15.1': {
      redirect: '1.15.0',
    },
    '1.15.0': {
      title: '1.15.0 Release - Print Start and Completed Times',
      body: `<img
  class="version-release-note-dialog-image"
  alt="The Edit 3D Print page showing the new Start and Completed date and time fields."
  src="./assets/release_1-15-0_PrintDateTimes_e0cb4d1e406944.png"
/>
<p>
  Print times have been overhauled. The Edit Print page can now record the
  <strong>start time</strong> of the print, and the <strong>estimated completed date/time</strong> will be
  displayed based on the estimated print time. The <strong>actual completed
  date/time</strong> can be set, which will automatically calculate the actual
  print time.
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
    '1.14.1': {
      redirect: '1.14.0',
    },
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
      maxWidth: '450px',
    });
    dialogRef.componentInstance.title = releaseNote.title;

    dialogRef.componentInstance.body = releaseNote.body;
    dialogRef.componentInstance.yesText = 'Ok';
    dialogRef.componentInstance.yesColor = 'primary';
    dialogRef.componentInstance.noText = '';

    return dialogRef.afterClosed().toPromise();
  }
}
