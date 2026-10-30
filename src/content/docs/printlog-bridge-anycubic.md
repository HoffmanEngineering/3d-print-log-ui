---
slug: printlog-bridge-anycubic
title: Log Anycubic Kobra S1, Kobra 3 and Photon P1 Max Prints with printlog-bridge | 3D Print Log Docs
description: Log every print from an Anycubic Kobra S1, Kobra 3 or Photon P1 Max to 3D Print Log in LAN mode with printlog-bridge, with filament in grams or resin in mL.
navLabel: Bridge – Anycubic
nav: false
group: integrations
order: 46
mode: how-to
updated: 2026-10-30
aliases: [printlog-bridge/anycubic]
related: [printlog-bridge, printlog-bridge-docker, printlog-bridge-bridges, printlog-bridge-troubleshooting, printlog-bridge-privacy]
---

## Anycubic (LAN mode)

---

Part of the [printlog-bridge](/docs/printlog-bridge) guide.

[printlog-bridge](/docs/printlog-bridge) can watch an Anycubic printer in LAN mode, over the printer's own MQTT broker: the **Kobra S1** and **Kobra 3** (filament) and the **Photon P1 Max** (resin). It logs each print with its outcome and times, and the filament or resin the printer reports. It only ever reads from the printer: every message it sends is a read-only query, and it never starts, pauses or stops a print, or changes a setting, a light, a fan or a file. Nothing goes to Anycubic's cloud.

The printer can't run the bridge itself, so the bridge runs [in Docker](/docs/printlog-bridge-docker) on another computer on the same network: a NAS, a home server or a Raspberry Pi. The bridge's Home Assistant app, or the bridge on any computer, works too.

<doc-callout kind="warning" heading="New: checked on an idle printer, not yet through a print">
  <p>
    <strong>Checked on a real printer</strong>: on a Kobra S1 (firmware
    2.5.6.4), the LAN-mode handshake, the connection to its broker and its
    idle reports; on a Photon P1 Max, the handshake.
  </p>
  <p>
    <strong>Not checked yet</strong>: a whole print on any of them, the
    Kobra 3, and the Photon P1 Max's broker, which stayed closed on the
    printer we tried. How prints start and end, and the usage, come from
    community protocol notes. If you have one of these printers, a trace of a
    print is the most useful thing you can send: set <code>trace = true</code>,
    print something, and attach the trace to
    <a href="https://github.com/HoffmanEngineering/printlog-bridge/issues/96">issue #96</a>
    (Kobra) or
    <a href="https://github.com/HoffmanEngineering/printlog-bridge/issues/97">issue #97</a>
    (Photon), as <a routerLink="/docs/printlog-bridge-troubleshooting">troubleshooting</a>
    explains.
  </p>
  <p>
    It needs a bridge newer than 0.1.1. Until the next release, use the
    <code>edge</code> image (see <a routerLink="/docs/printlog-bridge-docker" fragment="image">the image</a>).
  </p>
</doc-callout>

### Which printers {#printers}

| Printer | Kind | Supported |
| --- | --- | --- |
| Kobra S1 | Filament | Yes: checked while idle |
| Kobra 3 | Filament | Yes, not yet checked |
| Photon P1 Max (and P1) | Resin, in mL | Yes, not yet checked through a print |
| Other Anycubic printers | | Not yet. A Kobra running Klipper uses the [Klipper setup](/docs/printlog-bridge-docker) |

### Before you start {#before}

- **LAN mode on.** On the printer's screen, turn on **LAN mode** (on the Kobra S1: **Settings > Network**). LAN mode and Anycubic's cloud don't run together, so the Anycubic app won't reach the printer from outside your network while it's on.
- The printer on the same network as the computer the bridge runs on.
- In Docker, the container uses **host networking** (`network_mode: host`), so it can find the printer.
- The printer's number in 3D Print Log: the end of its page's address (`49` in `https://www.3dprintlog.com/printers/49`). The printer's Edit Page also shows a ready config section under **Connections**.

There is no password or access code to find: in LAN mode the printer hands the bridge a login for its broker itself, a new one each time it connects.

### Set it up {#setup}

#### 1. Find the printer {#find}

Open [Bridges](/printers/bridges) and select **Scan now** on your bridge, or run `discover`:

```
docker exec printlog-bridge printlog-bridge discover
```

Both find Anycubic printers with an SSDP search. You can also read the printer's IP address from its network settings.

Give the printer a fixed IP address with a DHCP reservation in your router, so the bridge keeps finding it at the same address.

#### 2. Connect it {#connect}

On the [Bridges](/printers/bridges) screen, select **Connect** next to the printer the scan found (or **Add by address**, with **Anycubic (LAN mode)** as the type), and pick the 3D Print Log printer to log to. There is nothing to enter. See [Bridges and printers found on your network](/docs/printlog-bridge-bridges).

Or add a section to `printlog-bridge.cfg` instead:

```
[printer kobra]
adapter = anycubic
printer_id = 49
host = 192.168.1.89
```

`printer_id` is the printer's number in 3D Print Log and `host` its address.

#### 3. Check it {#check}

Run `doctor`:

```
docker exec printlog-bridge printlog-bridge doctor
```

It says whether the printer answered, with its model, firmware and state. If the printer refused the connection, check that LAN mode is on: a resin printer opens its broker only in LAN mode. Once it works, the printer's Edit Page lists the bridge under [Connections](/docs/printers#connections) as **Anycubic (LAN)**.

### A Photon takes one client at a time {#photon}

A Photon P1 or P1 Max accepts one LAN client at a time, so the bridge and Photon Workshop (or Anycubic's app in LAN mode) push each other off. **Close Photon Workshop's printer page while the bridge runs.**

When another client takes the connection within 30 seconds of the bridge connecting, the bridge steps aside for 5 minutes before it tries again, so an upload or a print started from Photon Workshop isn't cut off. It says so once in its log, in `status` and in `doctor`. To use Photon Workshop for longer than that, stop the bridge watching that printer: disconnect it on the Bridges screen, or comment out its section in the config.

### What gets logged {#what-it-logs}

- **When a print starts printing**, not while the printer heats up or levels. It stays the same print through pauses, bridge restarts and reconnects.
- **When it ends**: completed, canceled or failed, as the printer says.
- **Kobra: the filament the printer reports**, in millimeters, which 3D Print Log turns into grams with the spool's density. It's **marked as an estimate** (the print shows it with a `*`, and the accuracy stats leave it out) until a recorded print shows whether the printer measures it.
- **Photon: the job's resin in mL**, all of it for a completed print and by layers printed for one that didn't finish. Always **marked as an estimate**.

### Privacy and safety {#privacy}

- **The handshake.** The bridge asks the printer for its LAN-mode login (on port 18910) each time it connects, keeps it in memory only, and connects to the broker at the address you configured, never one the printer names.
- **What the bridge asks for**: the printer's state, its print and (on a Kobra) its multi-color box and peripherals, every 30 seconds, with the printer reporting changes in between. Every query is read-only.
- **The connection is encrypted but not verified.** The printer's broker uses TLS with a certificate the bridge can't check, so the bridge doesn't verify it. Keep the printer on a network you trust.
- **What 3D Print Log gets**: the file's name, times, outcome, usage and the firmware version. Never the printer's address, its serial or its login. The bridge's own [privacy document](https://github.com/HoffmanEngineering/printlog-bridge/blob/main/docs/privacy.md) lists every message it sends to the printer.

### Limits {#limits}

- **A print that starts and ends while the bridge is down is missed.** The printer keeps no job history the bridge can read. One that ends while the bridge is down is logged when it's back: with how it ended when the printer still shows it as its last job, otherwise by how far it got (completed at 99% or more), with a note.
- **No thumbnails or slicer header**: the printer serves no download of the job's file.
- **Not yet**: ACE Pro slots, the webcam, and firmware versions other than 2.5.6.4.
