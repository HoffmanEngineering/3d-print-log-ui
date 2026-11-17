---
slug: printlog-bridge-flashforge
title: Log FlashForge Adventurer 5M and AD5X Prints with printlog-bridge | 3D Print Log Docs
description: Log every print from a FlashForge Adventurer 5M, 5M Pro or AD5X to 3D Print Log over its LAN API with printlog-bridge, with the slicer's estimate per IFS slot.
navLabel: Bridge – FlashForge
nav: false
group: integrations
order: 46
mode: how-to
updated: 2026-10-30
aliases: [printlog-bridge/flashforge]
related: [printlog-bridge, printlog-bridge-docker, printlog-bridge-bridges, printlog-bridge-troubleshooting, printlog-bridge-privacy]
---

## FlashForge (Adventurer 5M series, AD5X)

---

Part of the [printlog-bridge](/docs/printlog-bridge) guide.

[printlog-bridge](/docs/printlog-bridge) can watch a FlashForge **Adventurer 5M**, **Adventurer 5M Pro** or **AD5X** over the LAN API FlashForge's own apps use (HTTP, port 8898). It logs each print with its outcome and times, the slicer's estimated filament (split by IFS slot on an AD5X) and the file's thumbnail. It only ever reads from the printer: it never starts, pauses or cancels a print, and never changes a light, a fan, a temperature, the IFS or a file. Nothing goes to FlashForge's cloud.

The printer can't run the bridge itself, so the bridge runs [in Docker](/docs/printlog-bridge-docker) on another computer on the same network: a NAS, a home server or a Raspberry Pi. The bridge's Home Assistant app, or the bridge on any computer, works too.

<doc-callout kind="note" heading="Running Klipper Mod, Forge-X or ZMOD?">
  <p>
    Those firmwares run Klipper and Moonraker on the printer. Use the
    <a routerLink="/docs/printlog-bridge-docker">Klipper setup</a> instead,
    with <code>url = http://&lt;printer&gt;:7125</code>: it logs the filament
    Klipper measured, not an estimate. <code>doctor</code> tells you when a
    printer runs Moonraker.
  </p>
</doc-callout>

<doc-callout kind="warning" heading="New, and not yet checked on a real printer">
  <p>
    The FlashForge adapter is built from community documentation and tested
    against a simulated printer. It hasn't been checked against a real
    printer yet. If you have one, a trace is the most useful thing you can
    send: set <code>trace = true</code>, print something, and attach the trace
    to <a href="https://github.com/HoffmanEngineering/printlog-bridge/issues/88">issue #88</a>,
    as <a routerLink="/docs/printlog-bridge-troubleshooting">troubleshooting</a>
    explains.
  </p>
  <p>
    It needs a bridge newer than 0.1.1. Until the next release, use the
    <code>edge</code> image (see <a routerLink="/docs/printlog-bridge-docker" fragment="image">the image</a>).
  </p>
</doc-callout>

### Which printers {#printers}

| Printer | Supported |
| --- | --- |
| Adventurer 5M, Adventurer 5M Pro (firmware 2.x or newer) | Yes |
| AD5X | Yes, with the filament split by IFS slot |
| Any of these on Klipper Mod, Forge-X or ZMOD | Use the [Klipper setup](/docs/printlog-bridge-docker) |
| Adventurer 3 and 4, Creator 5 series | Not yet: they only speak FlashForge's older protocol |

### Before you start {#before}

- The printer on the same network as the computer the bridge runs on.
- **LAN-only mode on, and the check code.** On the printer's screen, open **Settings > Network** and turn on **LAN-only mode**. The screen then shows the **check code**: the bridge needs it to talk to the printer. In LAN-only mode FlashForge's phone app and cloud can't reach the printer; FlashPrint and Orca-FlashForge on your network still can.
- In Docker, the container uses **host networking** (`network_mode: host`), so it can find the printer.
- The printer's number in 3D Print Log: the end of its page's address (`50` in `https://www.3dprintlog.com/printers/50`). The printer's Edit Page also shows a ready config section under **Connections**.

### Set it up {#setup}

#### 1. Find the printer {#find}

Open [Bridges](/printers/bridges) and select **Scan now** on your bridge, or run `discover`:

```
docker exec printlog-bridge printlog-bridge discover
```

Both find FlashForge printers by asking the network, and show each printer's serial number. A FlashForge printer doesn't announce itself unasked, so it shows up only after a scan. You can also read its IP address from the printer's network settings.

Give the printer a fixed IP address with a DHCP reservation in your router, so the bridge keeps finding it at the same address.

#### 2. Connect it {#connect}

On the [Bridges](/printers/bridges) screen, select **Connect** next to the printer the scan found (or **Add by address**, with **FlashForge** as the type), and pick the 3D Print Log printer to log to. Then enter the **check code** from the printer's screen. See [Bridges and printers found on your network](/docs/printlog-bridge-bridges).

You don't enter the serial number. The bridge learns it: a printer found by a scan reports it, and for one added by address the bridge asks that printer for it and remembers it. If the printer doesn't answer, `status` and `doctor` say so: then add the serial (it starts with `SN`, and `discover` prints it) to the bridge's config, under the number the bridge gives that printer:

```
[app_printer 7]
serial = SNMOMC9900728
```

Or add a section to `printlog-bridge.cfg` instead of connecting it in the app:

```
[printer ad5x]
adapter = flashforge
printer_id = 50
host = 192.168.1.60
check_code = 8f3a2c71
# serial = SN...   only when doctor asks for it
```

`printer_id` is the printer's number in 3D Print Log, `host` its address and `check_code` the code from its screen. Keep the config where nothing serves it: it holds the check code.

#### 3. Check it {#check}

Run `doctor`:

```
docker exec printlog-bridge printlog-bridge doctor
```

It says whether the printer answered, with its model, firmware, state and, on an AD5X, its IFS slots. It also tells you when:

- **The printer refused the check code**, and where to find it.
- **The firmware is too old**: the printer only answers on FlashForge's old port. Update it to 2.x or newer.
- **It runs Moonraker** (Klipper Mod, Forge-X or ZMOD): use the [Klipper setup](/docs/printlog-bridge-docker) instead.

Once it works, the printer's Edit Page lists the bridge under [Connections](/docs/printers#connections) as **FlashForge**.

### What gets logged {#what-it-logs}

- **When a print starts printing.** It stays the same print through pauses and heating. A reprint of the same file is a new print.
- **When it ends**: completed, canceled or failed (with the printer's error code in the print's notes), as the printer says. An error has to last three polls (about 10 seconds) before the print is failed, in case it's a filament runout the printer resumes from.
- **The slicer's estimated filament**, as the printer read it from the file: its grams and length for the whole job. The printer doesn't measure what it feeds, so this is **marked as an estimate** in 3D Print Log: the print shows it with a `*`, and the accuracy stats leave it out. For a print that didn't complete, it's scaled by how far the print got.
- **IFS slots on an AD5X.** The grams are split by IFS slot when the printer's file list says which slots the file uses. That's the slicer's mapping, which can differ from what was picked on the printer's screen; a file whose slots aren't clear stays on one slot. Each slot's material and color is passed on too, so 3D Print Log can note a slot that holds something other than its spool.
- **The file's thumbnail**, from the printer.

### Privacy and safety {#privacy}

- **What the bridge asks for**: the printer's status (every 5 seconds while printing, every 30 seconds otherwise), its file list once per print, and the print's thumbnail. Every request carries the serial and check code, and every one is a read.
- **Why port 8899 isn't used.** FlashForge's older port answers only after a "take control" command, which would push FlashPrint or Orca-FlashForge off the printer. The bridge never sends anything there; `doctor` only checks whether that port is open, to tell you the firmware is too old.
- **The check code** is sent only to the printer, and never written to a log or a trace. The serial isn't secret: `status` and `doctor` show it.
- **What 3D Print Log gets**: the file's name, times, outcome, the slicer's estimate, IFS slot materials and the thumbnail, and the firmware version. Never the printer's address. The bridge's own [privacy document](https://github.com/HoffmanEngineering/printlog-bridge/blob/main/docs/privacy.md) lists every request it makes to the printer.

### Options {#options}

| Option | Default | What it does |
| --- | --- | --- |
| `check_code` | none (required) | The code the printer's screen shows in LAN-only mode |
| `serial` | learned from the printer | The printer's serial number, only when the bridge can't learn it |
| `port` | `8898` | The port of the printer's LAN API |
| `files` | `true` | `false` never reads the file list or the thumbnail: no IFS split, no thumbnail |
| `poll_interval` | `5` | Seconds between reads while printing |
| `idle_poll_interval` | `30` | Seconds between reads otherwise |

### Limits {#limits}

- **A print that starts and ends while the bridge is down is missed.** The printer keeps no job history the bridge can read. One that ends while the bridge is down is logged when it's back: with how it ended while the printer still shows it, otherwise by how far it got (completed at 99% or more), with a note.
- **The usage is an estimate**, and its reading as the job's total is unconfirmed until a real printer is traced.
- **No camera snapshots** yet.
