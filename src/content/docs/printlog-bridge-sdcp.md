---
slug: printlog-bridge-sdcp
title: Log Elegoo Centauri Carbon Prints with printlog-bridge (SDCP) | 3D Print Log Docs
description: Log every Elegoo Centauri Carbon print to 3D Print Log over SDCP, the printer's local protocol, with printlog-bridge and the slicer's filament estimate.
navLabel: Bridge – Elegoo (SDCP)
nav: false
group: integrations
order: 46
mode: how-to
updated: 2026-10-29
aliases: [printlog-bridge/sdcp]
related: [printlog-bridge, printlog-bridge-docker, printlog-bridge-bridges, printlog-bridge-troubleshooting, printlog-bridge-privacy]
---

## Elegoo Centauri Carbon (SDCP)

---

Part of the [printlog-bridge](/docs/printlog-bridge) guide.

[printlog-bridge](/docs/printlog-bridge) can watch an Elegoo Centauri Carbon over SDCP, the local protocol Elegoo Slicer and the Elegoo app use to talk to the printer on your network. It logs each print with its outcome and times, the slicer's estimated filament, and the file's thumbnail. It only ever reads from the printer: it never starts, pauses or stops a print, never changes a setting, and never sends, lists or deletes a file. Nothing goes to Elegoo's cloud.

The printer can't run the bridge itself, so the bridge runs [in Docker](/docs/printlog-bridge-docker) on another computer on the same network: a NAS, a home server or a Raspberry Pi. The bridge's Home Assistant app, or the bridge on any computer, works too.

<doc-callout kind="warning" heading="New, and not yet checked on a real printer">
  <p>
    The SDCP adapter is built from the published SDCP protocol and other
    people's notes, and tested against a simulated printer. It hasn't been
    checked against a real Centauri Carbon yet. If you have one, a trace is
    the most useful thing you can send: set <code>trace = true</code>, print
    something, and attach the trace to
    <a href="https://github.com/HoffmanEngineering/printlog-bridge/issues/94">issue #94</a>,
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
| Elegoo Centauri Carbon (the original) | Yes |
| Elegoo Centauri Carbon 2 | Not yet: it speaks MQTT, not SDCP |
| Elegoo resin printers (Saturn, Mars, Jupiter) | Not yet: they answer on SDCP, but print through other states, so the bridge leaves them out |
| Elegoo Neptune 4 series | Runs Klipper: use the [Klipper setup](/docs/printlog-bridge-docker) |

### Before you start {#before}

- A Centauri Carbon on the same network as the computer the bridge runs on.
- In Docker, the container uses **host networking** (`network_mode: host`), so it can find the printer.
- The printer's number in 3D Print Log: the end of its page's address (`47` in `https://www.3dprintlog.com/printers/47`). The printer's Edit Page also shows a ready config section under **Connections**.

### Set it up {#setup}

#### 1. Find the printer {#find}

Open [Bridges](/printers/bridges) and select **Scan now** on your bridge, or run `discover`:

```
docker exec printlog-bridge printlog-bridge discover
```

Both find Elegoo printers by asking the network on UDP port 3000. A Centauri Carbon never announces itself unasked, so it shows up only after a scan. You can also read its IP address from the printer's screen, in the network settings.

Give the printer a fixed IP address with a DHCP reservation in your router, so the bridge keeps finding it at the same address.

#### 2. Connect it {#connect}

On the [Bridges](/printers/bridges) screen, select **Connect** next to the printer the scan found (or **Add by address**, with **Elegoo Centauri Carbon** as the type), and pick the 3D Print Log printer to log to. There is no password to enter. See [Bridges and printers found on your network](/docs/printlog-bridge-bridges).

Or add a section to `printlog-bridge.cfg` instead:

```
[printer centauri]
adapter = sdcp
printer_id = 47
host = 192.168.1.77
```

`printer_id` is the printer's number in 3D Print Log and `host` its address.

#### 3. Check it {#check}

Run `doctor`:

```
docker exec printlog-bridge printlog-bridge doctor
```

It says whether the printer answered, with its model and firmware version. Once it works, the printer's Edit Page lists the bridge under [Connections](/docs/printers#connections) as **Elegoo (SDCP)**.

### What gets logged {#what-it-logs}

- **When a print starts printing**, not during homing, heating or leveling. Its start time is the printer's own.
- **When it ends**: completed, canceled (stopped on the printer) or failed, as the printer reports, at the printer's time. A print stays the same print through pauses, however long, and through reconnects.
- **The slicer's estimated filament**, read from the header Elegoo Slicer (and OrcaSlicer) writes at the top of the file. The printer doesn't measure what it feeds, so this is **marked as an estimate** in 3D Print Log: the print shows it with a `*`, and the accuracy stats leave it out. For a print that didn't complete, it's scaled by how far the print got. If the file can't be read, the print is logged without filament.
- **The file's thumbnail.**

### Privacy and safety {#privacy}

- **SDCP has no authentication.** Anything on your network can connect to the printer and control it, with or without the bridge. So there is no password to store, and the bridge only reads.
- **What the bridge asks for**: the printer's status and attributes (name, model, firmware version), and a `ping` now and then, since the printer drops a client that stays silent. It never sends any other command.
- **The file read.** When a print starts, the bridge downloads the first 256 KB of that print's file from the printer's web server (port 80), for the slicer's estimate and the thumbnail. Never the rest of the file, and never twice for one print. Set `files = false` to skip it.
- **What 3D Print Log gets**: the file's name, times, outcome, the slicer's estimate and thumbnail, and the firmware version. Never the printer's address. The bridge's own [privacy document](https://github.com/HoffmanEngineering/printlog-bridge/blob/main/docs/privacy.md#elegoo-centauri-carbon-sdcp) lists every request it makes to the printer.

### Options {#options}

| Option | Default | What it does |
| --- | --- | --- |
| `files` | `true` | `false` never reads the print's file: prints are logged with outcome and times, but no filament usage or thumbnail |
| `http_port` | `80` | The port of the printer's web server, for the file read |
| `port` | `3030` | The printer's SDCP websocket port |

### Limits {#limits}

- **A print that starts and ends while the bridge is down is missed.** The printer keeps no job history the bridge can use. One that ends while the bridge is down is logged when it's back: as the printer says, when it still shows how the print ended, or else by how far it got (completed at 99% or more, canceled below that, with a note).
- **The file read is unconfirmed.** Only one community write-up describes the printer's download endpoint. If it doesn't work on your printer, prints are logged without filament usage.
- **No camera snapshots** yet.
