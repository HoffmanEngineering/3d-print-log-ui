---
slug: printlog-bridge-prusalink
title: Log Prusa Prints with printlog-bridge (PrusaLink) | 3D Print Log Docs
description: Log every print from a Prusa MK4, MK3.5, Core One, MINI or XL to 3D Print Log over PrusaLink with printlog-bridge, with the slicer's estimate per tool.
navLabel: Bridge – Prusa (PrusaLink)
nav: false
group: integrations
order: 46
mode: how-to
updated: 2026-10-30
aliases: [printlog-bridge/prusalink]
related: [printlog-bridge, printlog-bridge-docker, printlog-bridge-troubleshooting, printlog-bridge-privacy]
---

## Prusa Printers (PrusaLink)

---

Part of the [printlog-bridge](/docs/printlog-bridge) guide.

[printlog-bridge](/docs/printlog-bridge) can watch a Prusa printer through PrusaLink, the local web API built into its firmware. It logs each print with its outcome and times, the slicer's estimated filament per tool, the file's thumbnail, the slicer settings and the printer model. It only ever reads from the printer: it never starts, pauses or stops anything, and never uploads or deletes a file. You don't need Klipper or Moonraker, and Prusa Connect can stay on.

A Prusa printer has no computer of its own to run the bridge on, so the bridge runs [in Docker](/docs/printlog-bridge-docker) on another computer on the same network: a NAS, a home server or a Raspberry Pi.

<doc-callout kind="warning" heading="New, and not yet checked on a real printer">
  <p>
    The PrusaLink adapter is built from Prusa's published PrusaLink API and
    firmware sources, and tested against files from PrusaSlicer. It hasn't been
    checked against a real printer yet. If something looks wrong, set
    <code>trace = true</code> and send a report, as
    <a routerLink="/docs/printlog-bridge-troubleshooting">troubleshooting</a>
    explains.
  </p>
  <p>
    It needs a bridge newer than 0.1.1. Until the next release, use the
    <code>edge</code> image (see <a routerLink="/docs/printlog-bridge-docker" fragment="image">the image</a>).
  </p>
</doc-callout>

### Before you start {#before}

- An MK4 or MK4S, MK3.5 or MK3.9, Core One, MINI or MINI+, or XL, on the same network as the computer the bridge runs on.
- Current firmware: 6.x is recommended. The bridge needs PrusaLink's v1 API and says so when the firmware is too old.
- The printer's number in 3D Print Log: the end of its page's address (`45` in `https://www.3dprintlog.com/printers/45`). The printer's Edit Page also shows a ready config section under **Connections**.

### Set it up {#setup}

#### 1. Turn on PrusaLink {#prusalink}

On the printer, open **Settings** > **Network** > **PrusaLink** (the menu can differ a little between models). Turn PrusaLink on if it's off, and note the **user** (`maker`) and the **password** shown there.

Older MINI firmware shows an **API key** instead of a password. Use `api_key = ...` in place of `password` for it.

#### 2. Give the printer a fixed address {#address}

Find the printer's IP address under **Settings** > **Network**, or in your router, and give it a fixed one with a DHCP reservation, so `host` stays right.

#### 3. Add the printer to the config {#config}

Add a section to `printlog-bridge.cfg`:

```
[printer mk4s]
adapter = prusalink
printer_id = 45
host = 192.168.1.60
password = the-password-the-printer-shows
```

`printer_id` is the printer's number in 3D Print Log, `host` its address, and `password` the one from step 1.

**Keep this config where nothing serves it**, never in Klipper's config folder, as for any password. The bridge treats `password` and `api_key` like keys: it never logs, traces or bundles them, and `doctor` warns when they're in a folder Moonraker serves.

#### 4. Check it {#check}

Restart the bridge, then run `doctor`:

```
docker exec printlog-bridge printlog-bridge doctor
```

"Printer mk4s" shows the printer's firmware and state, or why it refused, with where to find the password. Once it works, the printer's Edit Page lists the bridge under [Connections](/docs/printers#connections) as **PrusaLink**, with the firmware and PrusaLink versions.

### What gets logged {#what-it-logs}

- **When a print starts.** Its start time comes from the printer's own print time, so it's right even if the bridge noticed late.
- **When it ends**: completed, canceled (stopped on the printer), or failed (an error, with the printer's message in the print's notes).
- **The slicer's estimated grams per tool**, scaled by how far an unfinished print got. The printer doesn't measure what it feeds, so these are **marked as estimates** in 3D Print Log: the print shows them with a `*`, and the accuracy stats leave them out.
- **The file's thumbnail, the slicer settings and the printer model.**

On an XL, each tool is its own slot: T1 is slot 0, through T5 as slot 4. With an MMU3, each filament is its own slot: filament 1 is slot 0, and so on. Set the printer's slot count in 3D Print Log to match.

#### Which files work best {#files}

The estimates, thumbnail and settings come from the job's file.

- **`.bgcode`** (PrusaSlicer's default for these printers) is best: the bridge reads only its first few hundred kilobytes.
- **A plain `.gcode`** keeps its estimates at the end, so the bridge reads the whole file while it prints, up to 64 MB. A larger one is logged without filament usage.

### Options {#options}

| Option | Default | What it does |
| --- | --- | --- |
| `poll_interval` | `5` | Seconds between status checks while a print is under way |
| `idle_poll_interval` | `30` | Seconds between status checks between prints |
| `files` | `true` | `false` never reads the job's file: prints are logged with outcome and times, but no filament usage, thumbnail or settings |
| `username` | `maker` | PrusaLink's user name |
| `port` | `80` | PrusaLink's port |

### Limits {#limits}

- **A print that starts and ends while the bridge is down is missed.** PrusaLink keeps no job history. One that ends while the bridge is down is logged when it's back, since a finished or stopped print stays on the printer's screen until someone dismisses it.
- **A print canceled at the printer's "wrong filament?" question**, before it prints anything, isn't logged.
- **No camera snapshots.** Prusa's camera is only reachable through Prusa Connect.
- **PrusaLink is plain HTTP on your network.** The password login (HTTP Digest) keeps the password itself off the wire; an API key is sent as it is.
