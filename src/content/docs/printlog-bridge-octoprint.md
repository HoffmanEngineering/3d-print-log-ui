---
slug: printlog-bridge-octoprint
title: Log OctoPrint Prints with printlog-bridge | 3D Print Log Docs
description: Log every print from an OctoPi or any OctoPrint server to 3D Print Log with printlog-bridge, with the slicer's estimate per tool, thumbnails and webcam snapshots.
navLabel: Bridge – OctoPrint
nav: false
group: integrations
order: 46
mode: how-to
updated: 2026-10-29
aliases: [printlog-bridge/octoprint]
related: [printlog-bridge, switch-from-octoprint-webhook, octoprint-webhook, printlog-bridge-docker, printlog-bridge-bridges, printlog-bridge-troubleshooting, printlog-bridge-privacy]
---

## OctoPrint

---

Part of the [printlog-bridge](/docs/printlog-bridge) guide.

[printlog-bridge](/docs/printlog-bridge) can watch a printer run by [OctoPrint](https://octoprint.org): an OctoPi, or OctoPrint on any computer. It follows OctoPrint over its REST API and its push socket and logs each print with its outcome and times, the slicer's estimated filament per tool, the file's thumbnail, the slicer settings and, with a webcam set up in OctoPrint, a snapshot when the print ends. It keeps events on disk while 3D Print Log is out of reach. It only ever reads from OctoPrint: it never starts, pauses or cancels a print, never uploads or deletes a file, and never sends G-code.

The bridge runs [in Docker](/docs/printlog-bridge-docker) on a computer on the same network as OctoPrint: a NAS, a home server or another Raspberry Pi.

<doc-callout kind="note" heading="Using the OctoPrint webhook today?">
  <p>
    If your printer logs prints through the
    <a routerLink="/docs/octoprint-webhook">OctoPrint webhook</a>, set the bridge
    up as this page describes, then follow
    <a routerLink="/docs/switch-from-octoprint-webhook">Switch from the OctoPrint webhook</a>
    to turn the webhook off. Until you do, 3D Print Log logs each print once,
    from the bridge.
  </p>
</doc-callout>

<doc-callout kind="warning" heading="New">
  <p>
    The OctoPrint adapter is tested against a real OctoPrint 1.11 with its
    virtual printer, not yet against every real printer. If something looks
    wrong, set <code>trace = true</code> and send a report, as
    <a routerLink="/docs/printlog-bridge-troubleshooting">troubleshooting</a>
    explains.
  </p>
  <p>
    It needs a bridge newer than 0.1.1. Until the next release, use the
    <code>edge</code> image (see <a routerLink="/docs/printlog-bridge-docker" fragment="image">the image</a>).
  </p>
</doc-callout>

### Before you start {#before}

- OctoPrint on the same network as the computer the bridge runs on, connected to the printer.
- The printer's number in 3D Print Log: the end of its page's address (`46` in `https://www.3dprintlog.com/printers/46`). The printer's Edit Page also shows a ready config section under **Connections**.

### Set it up {#setup}

#### 1. Make an API key in OctoPrint {#api-key}

In OctoPrint, open **Settings** > **Application Keys** and make a key for the bridge, or copy your user's key from **Settings** > **API Key**. The user it belongs to needs the **Status**, **File List**, **File Download** and **Settings Read** permissions; an admin has them all.

This is OctoPrint's key, not a 3D Print Log key.

#### 2. Give OctoPrint a fixed address {#address}

Give the OctoPrint host a fixed IP address with a DHCP reservation in your router, so the bridge keeps finding it.

#### 3. Connect it {#connect}

A paired bridge lists OctoPrint on the [Bridges](/printers/bridges) screen when it finds it on the network (OctoPrint's discovery plugin announces it). Select **Connect**, pick the 3D Print Log printer to log to, then paste the API key from step 1. It's encrypted in your browser to that bridge's key, so only the bridge can read it. See [Bridges and printers found on your network](/docs/printlog-bridge-bridges). **Add by address**, with **OctoPrint** as the type, works the same way for one it doesn't find.

Or add a section to `printlog-bridge.cfg` instead:

```
[printer ender]
adapter = octoprint
printer_id = 46
url = http://octopi.local
api_key = a-key-from-octoprint
```

- `printer_id` is the printer's number in 3D Print Log. If you used the webhook, it's the same number you entered as its **DEVICE IDENTIFIER**.
- `url` is the address you open OctoPrint at, with its port when it isn't 80 (`http://192.168.1.70:5000`) and its path when it's behind a prefix (`http://pi.local/octoprint`). An OctoPrint behind a path prefix needs the config file: the Bridges screen only takes an address and a port.
- `api_key` is the key from step 1.

**Keep this config where nothing serves it**, never in OctoPrint's `uploads` folder. The bridge treats `api_key` like any key: it never logs, traces or bundles it, and `doctor` warns when the config is in a folder OctoPrint serves.

#### 4. Check it {#check}

Restart the bridge, then run `doctor`:

```
docker exec printlog-bridge printlog-bridge doctor
```

It says whether OctoPrint answered, its version, whether it's connected to the printer, and whether its Webhooks plugin still posts to 3D Print Log. A refused key says which permissions the key's user needs. Once it works, the printer's Edit Page lists the bridge under [Connections](/docs/printers#connections) as **OctoPrint**, with OctoPrint's version.

### What gets logged {#what-it-logs}

- **When OctoPrint starts printing**, with its start time from OctoPrint. A print stays the same print through pauses and reconnects.
- **When it ends**: done, canceled, or failed, with the firmware's error in the print's notes. OctoPrint restarting, or losing its connection to the printer, under a print isn't a failure: that print is ended by how far it got.
- **The slicer's estimated filament per tool**: PrusaSlicer's and OrcaSlicer's grams and millimeters, read from the end of the file, or else the length per tool from OctoPrint's own analysis. For a canceled or failed print it's scaled by how much of the G-code OctoPrint had sent. OctoPrint doesn't measure what the printer feeds, so these are **marked as estimates** in 3D Print Log: the print shows them with a `*`, and the accuracy stats leave them out.
- **The file's thumbnail**, the one the slicer embedded (or the PrusaSlicer Thumbnails plugin's), **the slicer settings and the printer model**.
- **A webcam snapshot** when the print ends, if OctoPrint has a snapshot URL under **Settings** > **Webcam & Timelapse**.

To read the estimates and thumbnail, the bridge reads two parts of each print's file from OctoPrint: its first 256 KB and its last 512 KB, never the toolpaths in between. A print from the printer's own SD card has only OctoPrint's estimates.

### Options {#options}

| Option | Default | What it does |
| --- | --- | --- |
| `files` | `true` | `false` never reads the print's file: prints are logged with OctoPrint's estimates only, with no thumbnail or settings |
| `snapshots` | `true` | `false` never asks the webcam for a snapshot |

### Limits {#limits}

- **A print that starts and ends while the bridge is down is missed.** OctoPrint keeps no job history. One that ends while the bridge is down is logged when it's back: from OctoPrint's print chart when it still has it, or else by how far it had got (completed at 99% or more, canceled below that, with a note).
- **The API key travels over your network as OctoPrint's own web page sends it**: plain HTTP on most home networks. The bridge's own [privacy document](https://github.com/HoffmanEngineering/printlog-bridge/blob/main/docs/privacy.md#octoprint) lists every request it makes to OctoPrint.
- **No timelapse videos** from OctoPrint yet.
