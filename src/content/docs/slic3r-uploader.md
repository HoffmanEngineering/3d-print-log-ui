---
slug: slic3r-uploader
title: OrcaSlicer, PrusaSlicer & Bambu Uploader | 3D Print Log Docs
description: Log prints from OrcaSlicer, PrusaSlicer or Bambu Studio automatically. Run the setup wizard once and every exported G-code opens a pre-filled print.
navLabel: Send prints from your slicer
group: integrations
order: 60
mode: how-to
updated: 2026-09-14
related: [prints, log-your-first-print]
---

## Uploader for OrcaSlicer, PrusaSlicer & Bambu Studio

---

The **Slic3r Post-Processing Uploader** is a small program your slicer runs
every time you export G-code. It reads the file, sends the print details to
3D Print Log, and opens the **New Print** form in your browser with the name,
print time, filament usage, thumbnail and a summary of the slicer settings
already filled in. Check it over, add anything you like, and save.

It works with the whole Slic3r family: **OrcaSlicer**, **PrusaSlicer**
(including binary `.bgcode`), **Bambu Studio**, **FLSun Slicer**,
**Anycubic Slicer Next** and, with partial support, **SuperSlicer**. For
OrcaSlicer and its forks a built-in setup wizard does the slicer configuration
for you; other slicers take a one-line [manual setup](#manual-setup).

---

### Step 1: Download the uploader {#download}

Download the <a
href="https://github.com/HoffmanEngineering/Slic3rPostProcessingUploader/releases/latest"
>latest release</a > for your operating system and save it somewhere permanent,
such as a `3D Print Log` folder in your home directory or under
`Program Files`. The slicer will point at this exact file, so do not leave it in
your Downloads folder.

<table>
  <thead>
    <tr><th>Operating system</th><th>File</th></tr>
  </thead>
  <tbody>
    <tr><td>Windows (x64)</td><td><code>Slic3rPostProcessingUploader-win-x64.exe</code></td></tr>
    <tr><td>macOS (Apple Silicon)</td><td><code>Slic3rPostProcessingUploader-osx-arm64</code></td></tr>
    <tr><td>macOS (Intel)</td><td><code>Slic3rPostProcessingUploader-osx-x64</code></td></tr>
    <tr><td>Linux (x64)</td><td><code>Slic3rPostProcessingUploader-linux-x64</code></td></tr>
  </tbody>
</table>

On macOS and Linux, mark the file executable after downloading:

```
chmod +x Slic3rPostProcessingUploader-osx-arm64
```

No installer and no API key are needed: the uploader hands the print to
3D Print Log through your browser, where you are already signed in.

---

### Step 2: Add your printers in the slicer first {#add-printers}

OrcaSlicer-family slicers only download a printer's process profiles (the
`0.20mm Standard`, `0.12mm Fine` and so on that you pick from the Process
dropdown) when you add that printer through the slicer's own setup wizard. The
3D Print Log wizard in the next step configures every process profile it can
find, so **add all of your printers in the slicer before running it**. A slicer
with no printers yet is skipped with a reminder to come back.

<doc-figure
  src="./assets/docs/slic3r-uploader/printer-selection_1920907b68.webp"
  alt="OrcaSlicer's Printer Selection page, listing Klipper, Marlin, RepRap, Repetier and ToolChanger custom printers followed by vendor sections"
  width="820"
  height="660"
  caption="OrcaSlicer's printer selection. Each printer you tick here brings its process profiles with it."
></doc-figure>

If you add another printer later, just run the wizard again. It picks up the new
profiles and leaves the ones it already configured alone.

---

### Step 3: Run the setup wizard {#setup-wizard}

The wizard is built into the uploader. It finds the OrcaSlicer-family slicers on
your computer, asks a couple of questions, and adds the uploader to every
process profile.

- **Windows:** double-click `Slic3rPostProcessingUploader-win-x64.exe`.
- **macOS / Linux:** run it from a terminal with no arguments, for example `./Slic3rPostProcessingUploader-osx-arm64`.

You will see something like this:

```
3D Print Log Uploader - Setup Wizard
=====================================
Scanning for supported slicers...

  Found: OrcaSlicer           Not installed | 44 process profiles found
  Snapmaker Orca             (not detected - skipped)
  AnycubicSlicer Next        (not detected - skipped)

--- OrcaSlicer ---
Install to OrcaSlicer? [Y/n]:
  Note template:
    1) Default (recommended)
    2) Full
  Choice [1]:
  Opt out of telemetry? [y/N]:
  Additional flags (leave blank for none):
  Done: 44 created, 0 updated, 0 skipped.

Setup complete!
Restart OrcaSlicer and choose a process preset ending in " - 3DPrintLog"
to have each export logged.
```

Pressing **Enter** at each prompt accepts the recommended answer. The two
choices that matter:

- **Note template.** Every logged print gets a note summarizing the slicer settings. _Default_ records a curated list of the settings most people care about (layer height, infill, temperatures, speeds). _Full_ records almost everything the slicer wrote into the G-code, which is thorough but long.
- **Telemetry.** The uploader reports its own version and any errors it hits so problems can be fixed. It never sends personal data or the contents of your prints. Answer `y` to switch it off.

The wizard does not modify the slicer's built-in profiles. For each process
profile it creates a **user preset** named `<profile> - 3DPrintLog` that
inherits everything from the original and adds one post-processing script. Your
existing presets, and any you made yourself, are untouched.

The wizard covers OrcaSlicer, Snapmaker Orca and Anycubic Slicer Next.
PrusaSlicer, Bambu Studio, FLSun Slicer and SuperSlicer are not detected by the
wizard; set those up by hand as described under [Manual setup](#manual-setup).

---

### Step 4: Pick a "- 3DPrintLog" preset {#pick-preset}

Restart the slicer. Open the **Process** dropdown and you will find a
` - 3DPrintLog` version of each profile listed under **User presets**. Choose
one of those instead of the plain system preset whenever you want the export
logged.

<doc-figure
  src="./assets/docs/slic3r-uploader/process-presets_827924cf12.webp"
  alt="OrcaSlicer's Process dropdown open, showing eight user presets from 0.08mm Extra Fine to 0.32mm Standard, each suffixed with - 3DPrintLog, above the unmodified system presets"
  width="470"
  height="510"
  caption="Each system preset gets a matching “- 3DPrintLog” user preset. Pick the user preset to log the print."
></doc-figure>

Everything else about the preset is identical to the original, so your prints
slice exactly as before.

---

### Step 5: Slice and export {#export}

Slice as usual and export the G-code (or send it to the printer). As soon as the
file is written, the uploader runs, a small console window reports its progress,
and your browser opens the **New Print** form with the details filled in.
Adjust anything you like and save; see [Prints](/docs/prints) for everything
the form can record.

```
3D Print Log Uploader v1.2.0
  ✓ Detected OrcaSlicer 2.4.2
  ✓ Parsed benchy.gcode (default template, 12 ms)
  ✓ Uploaded print settings to 3dprintlog.com
  → Opening https://www.3dprintlog.com/prints/new/cura?...
```

If your slicer embeds a thumbnail in the G-code, the largest one (up to
1280x720) becomes the print's image. Multi-color prints get one material entry
per filament slot, labelled with the slot number, color and material so you can
match each one to the right spool.

---

### Manual setup {#manual-setup}

Use this for PrusaSlicer, Bambu Studio, FLSun Slicer and SuperSlicer, or if you
would rather add the uploader to a single profile yourself.

In the slicer's process settings, open the **Post-processing scripts** field
(OrcaSlicer and Bambu Studio: the **Others** tab, visible in Advanced mode;
PrusaSlicer: **Print Settings** -> **Output options**) and enter the full path
to the uploader followed by the options you want. Use an absolute path, and
wrap it in quotes if it contains spaces.

- **Windows:** `"C:\Program Files\3D Print Log\Slic3rPostProcessingUploader-win-x64.exe" --default`
- **macOS:** `/Users/you/3DPrintLog/Slic3rPostProcessingUploader-osx-arm64 --default`
- **Linux:** `/home/you/3DPrintLog/Slic3rPostProcessingUploader-linux-x64 --default`

<doc-figure
  src="./assets/docs/slic3r-uploader/post-processing-script_c6f0e06ecf.webp"
  alt="The Others tab of an OrcaSlicer process preset, with the Post-processing Scripts box containing the path to the uploader followed by --full --opt-out-telemetry"
  width="470"
  height="490"
  caption="The Post-processing Scripts field on OrcaSlicer's Others tab. This is exactly what the wizard fills in for you."
></doc-figure>

Save the preset, and every export made with it is logged.

---

### Options {#options}

The options after the path control what is logged:

- `--default` records the curated settings list (used when nothing is given).
- `--full` records nearly every setting in the G-code.
- `--template <path>` uses your own note template. See [Note Templates in the README](https://github.com/HoffmanEngineering/Slic3rPostProcessingUploader#note-templates) for the syntax.
- `--opt-out-telemetry` stops the uploader from reporting its version and errors.

The complete list, including debugging switches, is on <a
href="https://github.com/HoffmanEngineering/Slic3rPostProcessingUploader#options"
>the project's README</a >.

---

### Changing, moving or removing the uploader {#maintenance}

- **Change the note template or flags:** run the wizard again and answer `y` to _Reinstall with new flags_. Every preset it created is updated in place.
- **Moved the file:** the presets point at the uploader by its full path, so run the wizard again from the new location and it rewrites the path in each preset. Replacing the file in place (a new version with the same name) needs nothing at all.
- **New version available:** the uploader checks for a newer release each time it runs and prints a link at the end of its output when there is one.
- **Remove it:** run `Slic3rPostProcessingUploader uninstall` from a terminal. It deletes only the ` - 3DPrintLog` presets it created and never touches a profile you edited by hand. Add `--dry-run` to either `install` or `uninstall` to preview what would change without writing anything.

---

### Troubleshooting {#troubleshooting}

- **Nothing happens after export.** Make sure you exported with a ` - 3DPrintLog` preset selected (Step 4), not the plain system preset. For a manual setup, check that the path is absolute and, on macOS and Linux, that the file is executable.
- **The slicer reports the script failed.** The uploader keeps its console window open for 30 seconds when something goes wrong and says what to do next. The most common cause is no internet connection at export time.
- **The wizard says "0 process profiles found".** The slicer has no printers yet. Add them in the slicer (Step 2) and run the wizard again.
- **The wizard cannot find your slicer.** It looks for the slicer's configuration folder (`%APPDATA%\OrcaSlicer` on Windows, `~/Library/Application Support/OrcaSlicer` on macOS, `~/.config/OrcaSlicer` on Linux). Start the slicer once so that folder exists, or use the [manual setup](#manual-setup).

Please report bugs either by creating an issue on <a
href="https://github.com/HoffmanEngineering/Slic3rPostProcessingUploader/issues"
>the project's GitHub page</a > or through the [Feedback](/feedback) page. If you
need a hand getting set up, the [Feedback](/feedback) page reaches us too.
