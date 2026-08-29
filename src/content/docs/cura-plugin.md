---
slug: cura-plugin
title: Cura Plugin | 3D Print Log Docs
description: Install the 3D Print Log plugin for Ultimaker Cura to send print time, filament, and settings straight from Cura to your print log.
navLabel: Cura Plugin
group: integrations
order: 30
mode: how-to
updated: 2026-08-29
related: [prints]
---

## Cura Plugin

---

The **3D Print Log Uploader** plugin for Ultimaker Cura lets you add new prints
directly from Cura. Automatically log print settings, duration, and filament
usage from Cura.

You can install this plugin via the <a
href="https://marketplace.ultimaker.com/app/cura/plugins/3d-print-log/3dPrintLogUploader"

> Ultimaker Cura Marketplace</a >. Alternatively, you can download the <a
> href="https://github.com/ChristopherHoffman/3d-print-log-cura-plugin/releases"
> Latest Release from Github</a > and drag/drop into Cura to install.

<img
class="fade-in"
[ngStyle.lt-md]="{
display: 'block',
'max-width': '90%',
'margin-left': 'auto',
'margin-right': 'auto',
}"
src="./assets/docs-3dprintloguploader-cura-install_2400a87afa5el.png"
/>

### Usage {#usage}

Once installed, a prompt will be displayed asking if you would like to send the
print information to 3D Print Log when you save GCode. Alternatively, you can
send print information through the **Extensions** -> **3D Print Log** -> **Send
to 3D Print Log** menu option.

This will open a browser tab with 3D Print Log's **New Print** form prepopulated
with the information from Cura.

### Customize Settings {#customize-settings}

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <p>
        You can customize the list of logged settings through Cura's
        <strong>Extensions</strong> -> <strong>3D Print Log</strong> ->
        <strong>Configure Settings to Log</strong> menu option.
      </p>
      <p>
        Here you can select if you want to record the Profile Name, the Filament
        Names, and the list of settings you want recorded. Simply search for the
        setting you want to record, and click the Checkbox next to them to start
        uploading them to 3D Print Log.
      </p>
      <p>
        The <strong>Reset to Defaults</strong> will revert any changes you made
        back to the default selection.
      </p>
    </div>
    <div fxFlex>
      <img
        class="fade-in"
        [ngStyle.lt-md]="{
          display: 'block',
          'max-width': '90%',
          'margin-left': 'auto',
          'margin-right': 'auto',
        }"
        alt="The Customize Settings to Log dialog inside of Cura"
        src="./assets/docs-3dprintloguploader-cura-setting-dialog_d85e4adef.png"
      />
    </div>
  </div>
