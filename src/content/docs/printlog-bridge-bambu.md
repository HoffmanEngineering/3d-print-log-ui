---
slug: printlog-bridge-bambu
title: Log Bambu Lab Prints with printlog-bridge (LAN) | 3D Print Log Docs
description: Log every Bambu Lab X1, P1, A1 and H2 print to 3D Print Log over the printer's LAN connection with printlog-bridge, with the slicer's grams per AMS tray.
navLabel: Bridge – Bambu Lab
nav: false
group: integrations
order: 46
mode: how-to
updated: 2026-10-27
aliases: [printlog-bridge/bambu]
related: [printlog-bridge, printlog-bridge-docker, printlog-bridge-troubleshooting, printlog-bridge-privacy]
---

## Bambu Lab Printers

---

Part of the [printlog-bridge](/docs/printlog-bridge) guide.

[printlog-bridge](/docs/printlog-bridge) can watch a Bambu Lab X1, P1, A1 or H2 the way Bambu Studio does in LAN mode: it reads the printer's status from its own MQTT server and the job's 3MF file from its FTPS server, both on your network. It logs each print with its outcome and times, the slicer's grams per AMS tray, the plate's thumbnail and the slicer settings. It never sends the printer a command and never writes a file to it.

A Bambu printer can't run the bridge itself, so the bridge runs [in Docker](/docs/printlog-bridge-docker) on another computer on the same network: a NAS, a home server or a Raspberry Pi.

<doc-callout kind="warning" heading="New, and not yet checked on a real printer">
  <p>
    The Bambu adapter is built from Bambu's and the community's documentation of
    the printer's LAN protocol. It hasn't been checked against a real printer
    yet, and details have changed between models and firmware versions. If
    something looks wrong, set <code>trace = true</code> and send a report, as
    <a routerLink="/docs/printlog-bridge-troubleshooting">troubleshooting</a>
    explains.
  </p>
  <p>
    It needs a bridge newer than 0.1.1. Until the next release, use the
    <code>edge</code> image (see <a routerLink="/docs/printlog-bridge-docker" fragment="image">the image</a>).
  </p>
</doc-callout>

### Before you start {#before}

- An X1, P1, A1 or H2 on the same network as the computer the bridge runs on.
- **LAN Only Mode turns off Bambu Handy and cloud printing.** Bambu Studio keeps working in LAN mode, and so does printing from the printer's screen or SD card.
- The printer's number in 3D Print Log: the end of its page's address (`42` in `https://www.3dprintlog.com/printers/42`). The printer's Edit Page also shows a ready config section under **Connections**.

### Set it up {#setup}

#### 1. Turn on LAN Only Mode and Developer Mode {#developer-mode}

Since Bambu's "Authorization Control" firmware, other software needs both to read the printer's status and files. On the printer:

| Printer | Where |
| --- | --- |
| X1, H2, P2S | **Settings** > **LAN Only** > **LAN Only Mode**, then **Developer Mode** (read the notice and confirm) |
| P1 | **Settings** > **WLAN** > **LAN Only Mode** > **Yes**, then scroll down to **Developer Mode** > **Enable** |
| A1, A1 mini | **Settings**, on the third page: **LAN Only Mode**, then **Developer Mode** |

Note the **access code** shown on that page.

#### 2. Find the serial and give the printer a fixed address {#serial}

The bridge needs the printer's **serial**. To find it, run `printlog-bridge discover`: it lists each Bambu printer that announces itself on your network, with its address and serial, and prints a `[printer]` section to start from. In Docker:

```
docker exec printlog-bridge printlog-bridge discover
```

The container only hears the announcements with host networking (`network_mode: host` in `docker-compose.yml`). Without it, the serial is also in Bambu Studio's device list and on the printer's sticker.

Give the printer a fixed IP address with a DHCP reservation in your router, so `host` stays right.

#### 3. Add the printer to the config {#config}

Add a section to `printlog-bridge.cfg`:

```
[printer x1c]
adapter = bambu
printer_id = 44
host = 192.168.1.50
serial = 01S00C123456789
access_code = 12345678
```

`printer_id` is the printer's number in 3D Print Log, `host` its address, and `serial` and `access_code` the values from the steps above.

**Keep this config where nothing serves it**, never in Klipper's config folder: the access code lets anyone on your network control the printer. The bridge treats it like a key. It never logs, traces or bundles it, and `doctor` warns when it's in a folder Moonraker serves.

#### 4. Check it {#check}

Restart the bridge, then run `doctor`:

```
docker exec printlog-bridge printlog-bridge doctor
```

It checks the printer's status connection ("Printer x1c") and its files ("Printer x1c files"), and says what to fix: a refused access code, LAN Only Mode or Developer Mode off, or a closed port. Once it works, the printer's Edit Page lists the bridge under [Connections](/docs/printers#connections) as **Bambu Lab (LAN)**, with the printer's firmware version.

### What gets logged {#what-it-logs}

- **When a print starts printing**, after the printer has heated and leveled. Its start time is the printer's, so the preparation counts.
- **When it ends**: completed, cancelled (from the screen or the slicer), or failed, with the printer's error code (such as `0700-8011`) in the print's notes.
- **The slicer's grams per AMS tray**, from the job's 3MF, scaled by how far a cancelled or failed print got. The printer doesn't measure what it feeds, so these are **marked as estimates** in 3D Print Log: the print shows them with a `*`, and the accuracy stats leave them out.
- **The plate's thumbnail and the slicer settings.**
- **AMS RFID tags.** A Bambu spool's tag, material and color are read from the AMS, and a spool with that tag in 3D Print Log is assigned to its tray.

#### Slot numbers {#slots}

Each filament is logged on its tray's slot, numbered as Bambu Studio shows them:

| Slot | Spool |
| --- | --- |
| 0 | The external spool |
| 1–4 | First AMS, trays A1–A4 |
| 5–8 | Second AMS, trays B1–B4 (and so on, up to 16) |
| 17–24 | AMS HT units |
| 25 | The H2D's second external spool |

A printer without an AMS has one slot. Set the printer's slot count in 3D Print Log to match, so you can load a spool in each.

### Options {#options}

| Option | Default | What it does |
| --- | --- | --- |
| `ftps` | `true` | `false` never reads the job's 3MF: prints are logged with outcome and times, but no filament usage, thumbnail or settings. |
| `tls_fingerprint` | | Pin the printer's certificate yourself (see below). |

### Limits {#limits}

- **A print that starts and ends while the bridge is down is missed.** The printer keeps no job history. One that ends while the bridge is down is logged when it's back, from what the printer still shows.
- **Without the 3MF there's no filament usage**: with `ftps = false`, with Developer Mode off, or when the printer no longer has the file.
- **The certificate is trusted the first time.** The printer's certificate is issued by Bambu, not by a public authority. The bridge remembers the one it sees first and refuses a different one; set `tls_fingerprint` to pin it yourself or to accept a new one. The bridge's own [privacy document](https://github.com/HoffmanEngineering/printlog-bridge/blob/main/docs/privacy.md) lists every connection it makes to the printer.
- No camera snapshots or timelapses yet.
