---
slug: printlog-bridge-privacy
title: printlog-bridge Privacy & Security | 3D Print Log Docs
description: Exactly what printlog-bridge sends to 3D Print Log, every connection it makes, how it keeps your API key, and what it stores on the printer.
navLabel: Bridge – privacy
nav: false
group: integrations
order: 48
mode: reference
updated: 2026-10-14
related: [printlog-bridge, printlog-bridge-troubleshooting, privacy-policy, api]
---

## printlog-bridge Privacy & Security

---

Part of the [Log prints from Klipper](/docs/printlog-bridge) guide.

This page lists what [printlog-bridge](/docs/printlog-bridge) sends, where it connects, and how it keeps your keys. Each guarantee is what the bridge's code does today, and a test in the bridge's repository fails if that changes. The bridge's own [privacy document](https://github.com/HoffmanEngineering/printlog-bridge/blob/main/docs/privacy.md) names each test.

How 3D Print Log handles what it receives is covered by the [Privacy Policy](/docs/privacy-policy).

### What leaves the printer {#sent}

The bridge makes exactly these calls to 3D Print Log, and no others:

| Call | When | What it carries |
| --- | --- | --- |
| `GET /api/Users/me` | `doctor` | Nothing. Checks the key. |
| `GET /api/Printers/{id}` | `doctor`; at start and every 5 minutes; when a print starts and ends | Nothing. Checks `printer_id`, and reads which spool is loaded in each slot. |
| `GET /api/Users/me/user-settings` | The first print after a start | Nothing. Reads your default visibility and comment settings. |
| `PUT /api/Connections/{instance}` | At start, then every 5 minutes | `kind` (`moonraker`), `displayName` (`printlog-bridge (name)`, with the printer's name from your config), `agentVersion`, `printerId` |
| `POST /api/Prints` | A print starts | `printerId`; `title` (made from the file name); `fileName` (without its folders); `startDate`; `status`; `viewStatus` and `allowComments` (your account's defaults); `externalSource` (`moonraker`); `externalId` and `connectionInstanceId` (a random id the bridge made for the printer, plus Moonraker's job id); the slicer's estimated print time and filament (length and weight, and weight per tool on a multi-tool file), when the file has them; each tool's row linked to the spool loaded in its slot; and `notes` when the printer's RFID reader disagrees with a spool's material or color |
| `GET /api/Prints/{id}` | A print ends | Nothing. Reads what you changed in the app. |
| `POST /api/Prints/{id}/complete` | A print ends | `status` (the outcome), `endedAt`, `printTimeInSeconds`, and per tool (`slot`) the filament length Klipper fed, linked to the spool you chose, split into a row per spool when a tool's spool changed mid-print |
| `PATCH /api/Prints/{id}` | A print fails or is cut short, a spool changed mid-print, or a print was paused for a filament change with no spool assigned | `notes`: a line saying why, with Klipper's error message when there is one; which spools a tool changed between, and where; how to split a filament change's usage |
| `POST /api/Prints/{id}/image` | A print starts, and when it ends | The slicer's thumbnail (at start) and one webcam frame (at the end, unless `snapshots = false`) |
| `GET /api/Filaments/by-tag/{uid}` | `PRINTLOG_SET_SPOOL TAG=…`, or a Snapmaker U1 reads a spool's RFID tag | The tag's UID |
| `GET /api/Filaments/by-number/{n}` | A spool is picked on the printer, with Spoolman pointed at 3D Print Log | The spool number |
| `PUT /api/Printers/{id}/slots/{slot}` | `PRINTLOG_SET_SPOOL`, a U1 tag that matches one of your spools, or a spool picked on the printer (Mainsail, Fluidd, KlipperScreen or `SET_ACTIVE_SPOOL`) when `[spoolman]` points at 3D Print Log | `filamentId` (the spool), `slotLabel` (`T0`, `T1`…) |
| `DELETE /api/Printers/{id}/slots/{slot}` | `PRINTLOG_CLEAR_SPOOL` | Nothing |
| `PUT /api/Printers/{id}` | A spool is assigned to a tool beyond the printer's slot count | The printer as 3D Print Log returned it, with only `slotCount` raised to the printer's tool count |

Every request also carries the API key (`X-Api-Key`) and `User-Agent: printlog-bridge/<version>`.

That is all. In particular:

- **No G-code leaves the printer.** The bridge never reads, downloads or uploads a G-code file. The thumbnail is read from the picture Moonraker extracted from the file, and only from a file named as a picture (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`). A file that isn't a picture is never sent, whatever its name.
- **No folder names or paths.** `fileName` is the file's own name; the folders it sits in on the printer are dropped.
- **No other printer data.** Temperatures, positions, macros, the rest of `printer.cfg` and the rest of Moonraker's history stay on the printer.
- **The webcam is asked only when a print ends**, for one frame, and never when `snapshots = false` is set for the printer.

### Where it connects {#connections}

The bridge only makes outbound connections, to:

1. **Moonraker**: its local socket in local mode, or the `url` you set in remote mode (HTTP and WebSocket, on your network). In remote mode it also downloads the thumbnail from Moonraker's file API. It reads the server address in `[spoolman]` and the active spool, to see whether Spoolman points at 3D Print Log, and it sets the active spool on tool changes and when you load a spool in the app. The `[spoolman]` address contains the Spoolman secret. The bridge keeps only its host name, and never stores or sends the secret.
2. **The webcam's snapshot URL**, as Mainsail or Fluidd have it set in Moonraker (usually the printer itself), when a print ends.
3. **3D Print Log**, at `api_url` (`https://api.3dprintlog.com` by default), **over HTTPS only.** The config refuses a plain `http` address, except to the computer the bridge runs on (`localhost`, `127.0.0.1`, `::1`). With `allow_http_on_lan` set, it also accepts plain `http` to a private-network IP address, for a development API on your own network; the API key then travels unencrypted on that network.

It **never listens on a port**, so nothing can connect to the bridge.

### Your keys and passwords {#keys}

The bridge holds up to three secrets: your 3D Print Log API key, Moonraker's API key (`moonraker_api_key`, remote mode only), and any password or token in a Moonraker or webcam URL.

**The API key is kept out of the folder Moonraker serves.** In local mode, `printlog-bridge.cfg` sits in Klipper's config folder, and Moonraker lets anyone who can open Mainsail or Fluidd read and download every file in it. So:

- `install.sh` stores the key in `~/.local/share/printlog-bridge/api_key`, readable only by you (mode 600), and never writes it into `printlog-bridge.cfg`.
- `printlog-bridge store-key` stores or replaces the key there. On an older install, it moves `api_key` out of `printlog-bridge.cfg`.
- In Docker, `store-key` keeps it in `/data/state/api_key` in the mounted folder, mode 600, owned by the user the container runs as. The image never holds a key. `PRINTLOG_API_KEY` can be set on the container instead, where anyone who can manage the host's containers can read it.
- `doctor` warns when `api_key` is in a config file Moonraker serves, when the key file is in a folder Moonraker serves, and when other users on the computer can read the key file.

**Secrets never reach the log, the status file, `status`, `doctor`, a trace or the support bundle.** URLs are shown with their user, password and secret-looking query values (such as `token` or `key`) replaced by `***`. The support bundle `doctor` writes removes every key, token and password it knows of, and never includes the key file.

### What it keeps on the printer {#stored}

In the state directory (`~/.local/share/printlog-bridge` by default): the key file, which job it logged as which print, the outbox of events and pictures not yet sent, `status.json` and `bridge.log`, and with tracing on, the traces. An event still unsent after 30 days is dropped. `uninstall.sh --purge` removes all of it.

#### Traces {#traces}

Tracing is off unless you turn it on (see [Record a trace](/docs/printlog-bridge-troubleshooting#trace)). **Traces stay on the computer the bridge runs on**: the bridge never sends them anywhere. The only way one leaves is in the support bundle `doctor` writes, which you choose to attach.

A trace holds what Moonraker tells the bridge, and what the bridge asks it:

- the printer's state as it changes: print progress, the active tool, filament used, Klipper's state, and on a U1 its RFID reader's tags;
- Moonraker's job history: file names (with their folders), times, outcomes and the slicer's metadata;
- the printer's list of objects, its webcams (with their URLs scrubbed), and lines printed to the console;
- the bridge's own requests, such as which objects it subscribes to.

It holds no G-code. Every secret the support bundle removes is removed from a trace before it is written.

### Not covered yet {#not-covered}

- **Pairing** will replace the personal API key with a device token that can only log prints. Until then, the bridge uses an API key with your account's full API access, so keep it to yourself, and delete it on the [Personal API Keys](/api-keys) page if it leaks.
- **Traffic on your network is as secure as Moonraker's.** Remote mode talks to Moonraker over the URL you give it, usually plain HTTP on your network, as Mainsail and Fluidd do.
