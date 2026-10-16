---
slug: printlog-bridge
title: printlog-bridge for Klipper & Moonraker | 3D Print Log Docs
description: printlog-bridge logs every Klipper and Moonraker print to 3D Print Log by itself, with its outcome, print time, filament per tool, pictures and spools.
navLabel: Log prints from Klipper
group: integrations
order: 42
mode: explanation
updated: 2026-10-15
related: [printlog-bridge-install, klipper-spoolman, printlog-bridge-docker, printlog-bridge-spools, snapmaker-u1, printlog-bridge-troubleshooting, printlog-bridge-privacy, switch-from-notifier]
---

## printlog-bridge

---

printlog-bridge is a small open-source program that watches your Klipper printers through Moonraker and logs every print to 3D Print Log by itself. You don't type anything in, and you don't have to edit the printer's configuration by hand.

It runs either on the printer's own host or in a Docker container on another computer on your network, and one bridge can watch several printers. The source is on GitHub under the MIT license: [HoffmanEngineering/printlog-bridge](https://github.com/HoffmanEngineering/printlog-bridge). For a short overview to share, see [Automatic print logging for Klipper](/klipper).

<doc-callout kind="note" heading="The bridge is new">
  <p>
    If something doesn't work the way this page says,
    <a routerLink="/docs/printlog-bridge-troubleshooting">troubleshooting</a>
    explains how to send a report.
  </p>
</doc-callout>

### In this guide {#pages}

- [Install on the printer (local mode)](/docs/printlog-bridge-install): run the bridge as a service on the printer's own host and connect it to your account.
- [Run it in Docker (remote mode)](/docs/printlog-bridge-docker): one container on a NAS, home server or Pi watches your printers over the network.
- [Assign spools with PRINTLOG_SET_SPOOL](/docs/printlog-bridge-spools): tell 3D Print Log which spool is in each tool from Klipper's console or a macro.
- [Snapmaker U1](/docs/snapmaker-u1): filament per tool on all four tools, with spools assigned from their RFID tags.
- [Troubleshooting](/docs/printlog-bridge-troubleshooting): the `doctor` and `status` commands, logs, traces and common problems.
- [Privacy and security](/docs/printlog-bridge-privacy): every connection the bridge makes, what it sends, and how it keeps your key.
- [Switch from the Moonraker notifier](/docs/switch-from-notifier): move a printer from the notifier to the bridge, and how the two run side by side.
- [Connect Klipper via Spoolman](/docs/klipper-spoolman): your 3D Print Log spools in the Mainsail, Fluidd and KlipperScreen spool pickers, with nothing to install.
- [Moonraker notifier (legacy)](/docs/klipper): the older way to log Klipper prints, for printers that still use it.

---

### What it logs {#what-it-logs}

**When a print starts**, a new print appears on your [Print List](/prints) with the status **Printing**. Its title comes from the file name, and it carries the slicer's estimated print time and filament when the file has them. The largest thumbnail the slicer embedded in the file (OrcaSlicer, PrusaSlicer, Cura and SuperSlicer all embed one) becomes its picture. Shortly after, the print gets the slicer and its version, and the [slicer settings](#slicer-settings) it was sliced with in its notes.

**When the print ends**, the bridge records the outcome, the print time and the filament Klipper actually fed, and adds one frame from the printer's webcam. For a failed print, that frame becomes the picture shown.

| Moonraker ends the job as | The print becomes | Note added to the print |
| --- | --- | --- |
| `completed` | Success | |
| `cancelled` | Cancelled | |
| `error` | Failed | "Klipper error", with Klipper's message when the bridge saw it |
| `klippy_shutdown` | Failed | "Klipper shutdown" |
| `klippy_disconnect` | Failed | "Lost connection to Klipper" |
| `interrupted`, `server_exit` | Failed | "Moonraker stopped during the print" |

**Each tool's filament is linked to a spool.** The bridge links each tool's usage to the material loaded in that tool's slot in 3D Print Log, so your inventory stays current. You can load spools in the app, or assign them from the printer's console with the [spool macros](/docs/printlog-bridge-spools).

**What you change in the app while it prints is kept**: the title, your notes (the bridge adds its note after them), the spool on a usage row, and a status you already chose, such as Partial Success. A print you delete stays deleted.

**Nothing is lost while 3D Print Log is out of reach.** The bridge writes each event to an outbox on disk before sending it, and sends it once the connection is back, oldest first, even if the bridge was restarted in between. When the bridge itself was stopped, it catches up on jobs that started or ended while it was away. On its very first run it picks up a print that is already running, but not older history.

#### Slicer settings {#slicer-settings}

Each print records the settings it was sliced with, as the [Slic3r uploader](/docs/slic3r-uploader) and the [Cura plugin](/docs/cura-plugin) do. Once a print starts, the bridge sends the settings the slicer wrote into the file, along with the summary Moonraker read from it (slicer, layer heights, nozzle, filament name and type, first layer temperatures). In 3D Print Log:

- the print's **Slicer** and slicer version are filled in;
- a **Slicer settings** section is added to the end of its notes, between `--- Slicer settings (…) ---` and `--- End of slicer settings ---`. If the settings are sent again, that section is replaced, not added twice, and the notes you wrote are kept.

It is on by default. To turn it off, set `slicer_settings = false` in `[bridge]` for every printer, or in a printer's section for just that one; the bridge then never reads the G-code file.

Good to know:

- **Only the settings are read, never the toolpaths**, and the file is never uploaded. Hosts, API keys, passwords and other credentials are blanked before anything leaves the printer. [Privacy and security](/docs/printlog-bridge-privacy#sent) lists exactly what is read and sent.
- **OrcaSlicer, PrusaSlicer, Anycubic Slicer Next and their forks** write the full settings block the bridge reads. **Bambu Studio and FLSun Slicer** put their settings near the top of the file, so for their prints only Moonraker's summary is recorded today.
- **The uploader's and the plugin's settings win.** When the bridge logs a job to a print you already made with the Slic3r uploader or the Cura plugin, that print keeps the richer settings they recorded, and the bridge doesn't send its own.

#### Printers with more than one tool {#multi-tool}

On a toolchanger, an IDEX printer or a Snapmaker U1, each tool gets its own usage row, numbered from 0 the way Klipper numbers its extruders (`extruder` is T0, `extruder1` is T1). The bridge follows which extruder is active while Klipper's filament count grows, so the rows add up to the job's total. When the slicer listed a weight per filament (PrusaSlicer, OrcaSlicer, Snapmaker Orca), the print starts with an estimate on each tool's row.

#### With Spoolman {#with-spoolman}

If the printer's `[spoolman]` section points at 3D Print Log (the block from [Connect Spoolman](/docs/klipper-spoolman)), the bridge keeps Moonraker's active spool and the spools in 3D Print Log's slots in sync both ways. A spool picked on the printer is loaded into the active tool's slot. A spool loaded in the app, with `PRINTLOG_SET_SPOOL` or by the U1's RFID reader becomes Moonraker's active spool when that tool is active. The bridge also sets the active spool on each tool change. If `[spoolman]` points at another server, the bridge leaves it alone. While the bridge runs for a printer, the block's notifier is ignored, so prints aren't logged twice.

Not covered yet:

- A multi-material unit feeding one extruder (ERCF, Happy Hare, AFC). Everything is counted on T0.
- IDEX copy or mirror mode, where Klipper counts what two heads print only once.

---

### Local mode and remote mode {#modes}

The bridge talks to Moonraker, so it can run anywhere Moonraker can be reached.

| | Local mode | Remote mode |
| --- | --- | --- |
| Runs on | The printer's own host (MainsailOS, FluiddPi, any Klipper install with Moonraker) | Any computer on your network: a NAS, a home server, a Raspberry Pi |
| Talks to Moonraker over | Its local socket | Its WebSocket, at the printer's address |
| Installed with | `install.sh`, as a systemd service | The Docker image |
| Updates | From the update panel in Mainsail or Fluidd | By pulling the image again |
| Spool macros | Installed for you | Copied to the printer by hand, where the printer allows it |
| Best for | Printers you can install software on | Printers you can't, such as the [Snapmaker U1](/docs/snapmaker-u1), and watching several printers from one place |

Moonraker accepts one bridge per printer, so pick one mode for each printer. A second bridge waits until the first one stops.

---

### Requirements {#requirements}

- A printer running Klipper and Moonraker, with Moonraker's job history (`[history]` in `moonraker.conf`). Most installs have it already, and the bridge tells you when it's missing.
- A 3D Print Log account, with the printer added on the [Printers](/printers) page.
- A [personal API key](/docs/api#api-keys) for the bridge to sign in with.
- **Local mode:** Python 3.9 or newer on the printer's host (Raspberry Pi OS Bullseye or later), and a user that can use `sudo` to install the service.
- **Remote mode:** Docker on a computer that is always on. The image is built for `linux/amd64`, `linux/arm64` and `linux/arm/v7`.

#### Signing in {#account}

The bridge signs in with a personal API key, which you create on the [Personal API Keys](/api-keys) page and store on the computer the bridge runs on. Each install page has a **Connect to your account** section with the steps. One-step pairing, where you confirm the printer in 3D Print Log instead of copying a key, is planned.

#### Already using the Moonraker notifier? {#notifier}

If the printer still sends prints through the [Moonraker notifier](/docs/klipper), 3D Print Log logs each print only once, from the bridge, and shows a banner suggesting you remove the notifier. [Switch from the notifier](/docs/switch-from-notifier) has the steps and the exact rule.

---

### Once it runs {#running}

Once the bridge runs, the printer's **Edit Page** lists it under [Connections](/docs/printers#connections) as `printlog-bridge (voron)`, with the name you gave the printer in the bridge's config. It checks in every 5 minutes, and the app shows it as **Stale** after 15 minutes without hearing from it.

### Update {#update}

The bridge tells you when a newer version is out. 3D Print Log answers each check-in with the latest version, so the bridge asks nobody else. When yours is older:

- the printer's [Connections](/docs/printers#connections) say **printlog-bridge 0.2.0 is available** (with the new version);
- the bridge writes `printlog-bridge 0.2.0 is available (this is 0.1.0)` in its log, once for each new version;
- `printlog-bridge status` shows an `Update:` line, and `printlog-bridge doctor` a warning.

To update:

- **In Docker:** in the folder with `docker-compose.yml`, run `docker compose pull`, then `docker compose up -d`. Your config and everything in `/data` stay as they are. See [Run it in Docker](/docs/printlog-bridge-docker#update).
- **On the printer:** update **printlog-bridge** in the update panel of Mainsail or Fluidd, next to Klipper and Moonraker. See [Install it on the printer](/docs/printlog-bridge-install#update).

To stop the notice in the bridge's log, `status` and `doctor`, set `update_check = false` in `[bridge]`. The bridge sends the same check-in either way.
