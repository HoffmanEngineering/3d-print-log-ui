---
slug: printlog-bridge-duet
title: Log Duet and RepRapFirmware Prints with printlog-bridge | 3D Print Log Docs
description: Log every print from a Duet 2 or Duet 3 running RepRapFirmware to 3D Print Log with printlog-bridge, with the filament each tool measured, standalone or with a Pi.
navLabel: Bridge – Duet (RepRapFirmware)
nav: false
group: integrations
order: 46
mode: how-to
updated: 2026-10-30
aliases: [printlog-bridge/duet]
related: [printlog-bridge, printlog-bridge-docker, printlog-bridge-bridges, printlog-bridge-troubleshooting, printlog-bridge-privacy]
---

## Duet / RepRapFirmware

---

Part of the [printlog-bridge](/docs/printlog-bridge) guide.

[printlog-bridge](/docs/printlog-bridge) can watch a Duet board running RepRapFirmware 3.x over the HTTP API Duet Web Control uses: a Duet 2 WiFi or Ethernet, or a Duet 3 Mini 5+, 6HC or 6XD, in a Railcore, an E3D ToolChanger, a Jubilee or a custom build. It logs each print with its outcome and times, **the filament each tool measured**, the slicer's estimate and the file's thumbnail. It only ever reads from the board: every request is a read, and it never sends G-code, sets the board's clock or touches a file.

The bridge runs [in Docker](/docs/printlog-bridge-docker) on another computer on the same network: a NAS, a home server or a Raspberry Pi. The bridge's Home Assistant app, or the bridge on any computer, works too.

<doc-callout kind="warning" heading="New, and not yet checked on a real board">
  <p>
    The Duet adapter is built from Duet3D's documentation and tested against a
    simulated board. It hasn't been checked against a real Duet yet. If you
    have one, a trace is the most useful thing you can send: set
    <code>trace = true</code>, print something, and attach the trace to
    <a href="https://github.com/HoffmanEngineering/printlog-bridge/issues/89">issue #89</a>,
    as <a routerLink="/docs/printlog-bridge-troubleshooting">troubleshooting</a>
    explains.
  </p>
  <p>
    It needs a bridge newer than 0.1.1. Until the next release, use the
    <code>edge</code> image (see <a routerLink="/docs/printlog-bridge-docker" fragment="image">the image</a>).
  </p>
</doc-callout>

### Which boards {#boards}

| Setup | Supported |
| --- | --- |
| A Duet 2 or Duet 3 on its own ("standalone"), RepRapFirmware 3.x | Yes |
| A Duet 3 with a Raspberry Pi running DuetSoftwareFramework ("SBC") | Yes |
| A toolchanger (E3D ToolChanger, Jubilee) | Yes: each tool's filament goes to that tool's slot |
| A mixing hotend (one tool, several extruders) | Logged, but its extruders count together, on its tool's one slot |

### Before you start {#before}

- The board on the same network as the computer the bridge runs on.
- The address you open Duet Web Control at: an IP address or a name such as `duet3.local`.
- The board's password, **only if it has one**: when `sys/config.g` sets one with `M551`. Most boards don't.
- The printer's number in 3D Print Log: the end of its page's address (`48` in `https://www.3dprintlog.com/printers/48`). The printer's Edit Page also shows a ready config section under **Connections**.

### Set it up {#setup}

#### 1. Find the board {#find}

Give the board a fixed IP address with a DHCP reservation in your router, so the bridge keeps finding it at the same address.

A paired bridge finds Duets that announce themselves over mDNS and lists them on the [Bridges](/printers/bridges) screen. You can also run `discover`:

```
docker exec printlog-bridge printlog-bridge discover
```

A board on Ethernet announces itself; one on Wi-Fi or behind a Raspberry Pi may not. If yours isn't listed, add it by its address.

#### 2. Connect it {#connect}

On the [Bridges](/printers/bridges) screen, select **Connect** next to the board (or **Add by address**, with **Duet (RepRapFirmware)** as the type), and pick the 3D Print Log printer to log to. If the board has a password, choose **Password** next to the connected printer and enter it; otherwise leave it empty. See [Bridges and printers found on your network](/docs/printlog-bridge-bridges).

Or add a section to `printlog-bridge.cfg` instead:

```
[printer railcore]
adapter = duet
printer_id = 48
host = 192.168.1.88
# password = ...   only when config.g sets one with M551
```

`printer_id` is the printer's number in 3D Print Log and `host` the board's address (or give the whole address as `url = http://192.168.1.88`). Without a `password`, the bridge sends RepRapFirmware's default, which a board without a password accepts.

#### 3. Check it {#check}

Run `doctor`:

```
docker exec printlog-bridge printlog-bridge doctor
```

It says whether the board answered, with its firmware and board (such as `RepRapFirmware 3.5.x on Duet 3 MB6HC`), and `SBC mode (DuetSoftwareFramework …)` when a Raspberry Pi runs it. Once it works, the printer's Edit Page lists the bridge under [Connections](/docs/printers#connections) as **Duet (RepRapFirmware)**.

### What gets logged {#what-it-logs}

- **When a print starts printing.** A simulation (`M37`) isn't a print and isn't logged. A print stays the same print through pauses, tool changes and reconnects.
- **When it ends**: completed, canceled (you canceled it), or failed (RepRapFirmware aborted it, the board halted, or the board restarted under it, as in a power cut).
- **The filament each tool measured.** RepRapFirmware counts what each extruder fed during the print, with the extrusion factor (`M221`) applied, so this is **measured, not an estimate**, like Klipper's. 3D Print Log turns the length into grams with each spool's diameter and density. On a toolchanger, each tool's extruder goes to that tool's slot, so each tool's spool gets its own usage.
- **The slicer's estimate and the thumbnail**, from what the board read of the file. The file itself is never downloaded.

### Privacy and safety {#privacy}

- **What the bridge asks for**: the board's object model (every 5 seconds while printing, every 30 seconds otherwise, and only the parts that changed), the file's information and its thumbnail. Every request is a read.
- **The password**, if you set one, is sent only to the board, once per connection, and never written to a log or a trace.
- **What 3D Print Log gets**: the file's name, times, outcome, measured filament, the slicer's estimate and thumbnail, and the firmware version. Never the board's address. The bridge's own [privacy document](https://github.com/HoffmanEngineering/printlog-bridge/blob/main/docs/privacy.md) lists every request it makes to the board.

### Options {#options}

| Option | Default | What it does |
| --- | --- | --- |
| `password` | none | The board's password, only when `config.g` sets one with `M551` |
| `port` | `80` | The port of Duet Web Control |
| `files` | `true` | `false` never reads the file's information: prints are logged without the slicer's estimate or thumbnail |
| `poll_interval` | `5` | Seconds between reads while printing |
| `idle_poll_interval` | `30` | Seconds between reads otherwise |

### Limits {#limits}

- **A print that starts and ends while the bridge is down is missed.** RepRapFirmware keeps no job history. One that ends while the bridge is down is logged when it's back, with how it ended and what it measured, while the board still shows that print as its last one. After a board restart or another print, it's logged as completed with the slicer's estimate, with a note.
- **A mixing hotend's extruders count together**, on its tool's one slot.
- **No webcam snapshots** yet, and no spools from RepRapFirmware's loaded filament names.
