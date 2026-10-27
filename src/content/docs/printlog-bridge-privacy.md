---
slug: printlog-bridge-privacy
title: printlog-bridge Privacy & Security | 3D Print Log Docs
description: Exactly what printlog-bridge sends to 3D Print Log, what it reads from a G-code file, every connection it makes, how it keeps your API key, and what it stores.
navLabel: Bridge – privacy
nav: false
group: integrations
order: 48
mode: reference
updated: 2026-10-27
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
| `GET /api/device-grants/pairing` | `pair`, or `run` with no key or device token | Nothing. Reads the sign-in service's address for pairing. |
| `POST /api/device-grants` | Once you approve the bridge while pairing | `deviceId` (a random id made once per install, so pairing again replaces the same entry) and `name` (`printlog-bridge on <host name>`, or the name you chose) |
| `GET /api/Users/me` | `doctor` | Nothing. Checks the key. |
| `GET /api/Printers/{id}` | `doctor`; at start and every 5 minutes; when a print starts and ends | Nothing. Checks `printer_id`, and reads which spool is loaded in each slot. |
| `GET /api/Users/me/user-settings` | The first print after a start | Nothing. Reads your default visibility and comment settings. |
| `PUT /api/Connections/{instance}` | At start, then every 5 minutes | `kind` (`moonraker`), `displayName` (`printlog-bridge (name)`, with the printer's name from your config), `agentVersion`, `printerId`. The answer carries `latestAgentVersion`, the newest bridge version, which is how the bridge hears about an [update](/docs/printlog-bridge#update) |
| `GET /api/Prints/claimable` | A print starts (and when a print ends that the bridge saw no start for), unless `adopt_prints = false` | `printerId` and `createdAfter` (the start time less `adopt_window`). Looks for a print you made yourself, with the Slic3r uploader, the Cura plugin or by hand, to log the job to instead of a new one. The file name is compared on the bridge, not sent. |
| `POST /api/Prints/{id}/claim` | A print starts and one of yours matches it | `externalSource`, `externalId`, `connectionInstanceId`, `startDate` and `fileHash`, as for `POST /api/Prints`. Your print keeps everything else, including a `fileHash` it already has. |
| `POST /api/Prints` | A print starts | `printerId`; `title` (made from the file name); `fileName` (without its folders); `startDate`; `status`; `viewStatus` and `allowComments` (your account's defaults); `externalSource` (`moonraker`); `externalId` and `connectionInstanceId` (a random id the bridge made for the printer, plus Moonraker's job id); `fileHash` (an identity of the file, not of its content: see below); the slicer's estimated print time and filament (length and weight, and weight per tool on a multi-tool file), when the file has them; each tool's row linked to the spool loaded in its slot; and `notes` when the printer's RFID reader disagrees with a spool's material or color |
| `GET /api/Prints/{id}` | A print ends | Nothing. Reads what you changed in the app. |
| `POST /api/Prints/{id}/complete` | A print ends | `status` (the outcome), `endedAt`, `printTimeInSeconds`, and per tool (`slot`) the filament length Klipper fed, linked to the spool you chose, split into a row per spool when a tool's spool changed mid-print |
| `PATCH /api/Prints/{id}` | A print fails or is cut short, a spool changed mid-print, or a print was paused for a filament change with no spool assigned | `notes`: a line saying why, with Klipper's error message when there is one; which spools a tool changed between, and where; how to split a filament change's usage |
| `POST /api/Prints/{id}/image` | A print starts, and when it ends | The slicer's thumbnail (at start) and one webcam frame (at the end, unless `snapshots = false`) |
| `POST /api/Prints/{id}/slicer-settings` | Once per print, after it starts, unless `slicer_settings = false` (and not for a print you made with the Slic3r uploader or the Cura plugin, which has the slicer's own) | `configBlock`: the `; key = value` settings the slicer wrote after the G-code; `header`: the file's first comment lines, through `; HEADER_BLOCK_END` (PrusaSlicer: its first line), which name the slicer and its version; both with hosts and credentials blanked (see below). `metadata`: what Moonraker read from the file: `slicer`, `slicerVersion`, `layerHeightMm`, `firstLayerHeightMm`, `nozzleDiameterMm`, `filamentName`, `filamentType`, `firstLayerNozzleTemperatureC`, `firstLayerBedTemperatureC` |
| `GET /api/Filaments/by-tag/{uid}` | `PRINTLOG_SET_SPOOL TAG=…`, or a Snapmaker U1 reads a spool's RFID tag | The tag's UID |
| `GET /api/Filaments/by-number/{n}` | A spool is picked on the printer, with Spoolman pointed at 3D Print Log | The spool number |
| `PUT /api/Printers/{id}/slots/{slot}` | `PRINTLOG_SET_SPOOL`, a U1 tag that matches one of your spools, or a spool picked on the printer (Mainsail, Fluidd, KlipperScreen or `SET_ACTIVE_SPOOL`) when `[spoolman]` points at 3D Print Log | `filamentId` (the spool), `slotLabel` (`T0`, `T1`…) |
| `DELETE /api/Printers/{id}/slots/{slot}` | `PRINTLOG_CLEAR_SPOOL` | Nothing |
| `PUT /api/Printers/{id}` | A spool is assigned to a tool beyond the printer's slot count | The printer as 3D Print Log returned it, with only `slotCount` raised to the printer's tool count |

Every request also carries `User-Agent: printlog-bridge/<version>` and one credential, never both: the device token (`Authorization: Bearer`) once the bridge is paired, or else the API key (`X-Api-Key`).

That is all. In particular:

- **No toolpaths leave the printer, and only two parts of a G-code file are read: its header and its slicer settings.** The bridge reads only what lies outside the G-code itself, by byte range: the comment lines the file begins with, through `; HEADER_BLOCK_END` (at most the first 64 KB), and the settings block the slicer wrote after the last G-code line (at most the last 512 KB). It never reads a G-code line, and the thumbnails in the header are not sent this way. It reads only `.gcode`, `.g` and `.gco` files, once per print, and skips a file that was replaced since the job started.
- **The G-code file is never uploaded.** Only the two parts above are sent, as text, in the `slicer-settings` call.
- **Hosts and credentials are blanked before the settings leave the printer.** A slicer writes how it reaches your printer into every file. In the header and the settings block, the value of every setting whose name contains `print_host`, `printhost`, `apikey`, `api_key`, `password`, `passwd`, `token`, `secret`, `user`, `cookie`, `credential`, `authorization`, `access_code` or `post_process` is removed; the setting's name stays, with an empty value. 3D Print Log removes the same settings again on its side, and never stores the text it receives: it keeps only what it adds to the print (see [Slicer settings](/docs/printlog-bridge#slicer-settings)).
- **`slicer_settings = false` turns it off**, in `[bridge]` for every printer, or in a printer's section for that one. Then the G-code file is never read, and no slicer settings are sent, not even Moonraker's summary.
- **The thumbnail is read only from a picture.** It is read from the picture Moonraker extracted from the file, and only from a file named as a picture (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`). A file that isn't a picture is never sent, whatever its name.
- **No folder names or paths.** `fileName` is the file's own name; the folders it sits in on the printer are dropped.
- **`fileHash` identifies the file, not what's in it**, so 3D Print Log can count how often you printed it. It is a hash of the file's size and modified time as Moonraker recorded them, the same two things Moonraker checks to tell whether a file changed. Uploading a file always sets a new modified time, so every print of one file gets the same `fileHash`, and a re-sliced file a new one. Only when Moonraker didn't record both is it a hash of the id Moonraker gave the file instead. The file is never read for it, and it is compared only with your own prints. It is also sent when the bridge takes over a print you started yourself, which keeps a `fileHash` it already has.
- **No other printer data.** Temperatures, positions, macros, the rest of `printer.cfg` and the rest of Moonraker's history stay on the printer.
- **The webcam is asked only when a print ends**, for one frame, and never when `snapshots = false` is set for the printer.

### Where it connects {#connections}

The bridge only makes outbound connections, to:

1. **Moonraker**: its local socket in local mode, or the `url` you set in remote mode (HTTP and WebSocket, on your network). In remote mode it also downloads the thumbnail from Moonraker's file API, and the two parts of the G-code file that hold its header and settings (unless `slicer_settings = false`). It reads the server address in `[spoolman]` and the active spool, to see whether Spoolman points at 3D Print Log, and it sets the active spool on tool changes and when you load a spool in the app. The `[spoolman]` address contains the Spoolman secret. The bridge keeps only its host name, and never stores or sends the secret.
2. **The webcam's snapshot URL**, as Mainsail or Fluidd have it set in Moonraker (usually the printer itself), when a print ends.
3. **3D Print Log**, at `api_url` (`https://api.3dprintlog.com` by default), **over HTTPS only.** The config refuses a plain `http` address, except to the computer the bridge runs on (`localhost`, `127.0.0.1`, `::1`). With `allow_http_on_lan` set, it also accepts plain `http` to a private-network IP address, for a development API on your own network; the API key or device token then travels unencrypted on that network.
4. **3D Print Log's sign-in service**, while pairing only, over HTTPS: the bridge asks it for the code it shows you, then waits for your approval. It sends the bridge's app id and the permissions it asks for, never your password, and keeps nothing it gets back except the device token 3D Print Log then issues.

**It never checks for updates anywhere else.** The latest version comes back in the answer to its check-in. 3D Print Log reads it from the bridge's GitHub repository, so the bridge never contacts GitHub. `update_check = false` only stops the bridge from telling you: it sends the same thing either way.

It **never listens on a port**, so nothing can connect to the bridge.

### Your keys and passwords {#keys}

The bridge holds up to three secrets: its 3D Print Log device token or your API key, Moonraker's API key (`moonraker_api_key`, remote mode only), and any password or token in a Moonraker or webcam URL.

**The device token and the API key are kept out of the folder Moonraker serves.** `pair` stores the device token in `device_token` in the state directory (`~/.local/share/printlog-bridge`, or `/data/state` in Docker), readable only by you (mode 600), and never in the config. In local mode, `printlog-bridge.cfg` sits in Klipper's config folder, and Moonraker lets anyone who can open Mainsail or Fluidd read and download every file in it. So:

- `install.sh` stores the key in `~/.local/share/printlog-bridge/api_key`, readable only by you (mode 600), and never writes it into `printlog-bridge.cfg`.
- `printlog-bridge store-key` stores or replaces the key there. On an older install, it moves `api_key` out of `printlog-bridge.cfg`.
- In Docker, `store-key` keeps it in `/data/state/api_key` in the mounted folder, mode 600, owned by the user the container runs as. The image never holds a key. `PRINTLOG_API_KEY` can be set on the container instead, where anyone who can manage the host's containers can read it.
- `doctor` warns when `api_key` is in a config file Moonraker serves, when the key file is in a folder Moonraker serves, and when other users on the computer can read the key file.

**Secrets never reach the log, the status file, `status`, `doctor`, a trace or the support bundle.** URLs are shown with their user, password and secret-looking query values (such as `token` or `key`) replaced by `***`. The support bundle `doctor` writes removes every key, token and password it knows of, and never includes the key file.

### What it keeps on the printer {#stored}

In the state directory (`~/.local/share/printlog-bridge` by default): the device token or key file, which job it logged as which print, the outbox of events, pictures and slicer settings (already scrubbed) not yet sent, kept only until they are sent, `status.json` and `bridge.log`, and with tracing on, the traces. An event still unsent after 30 days is dropped. `uninstall.sh --purge` removes all of it.

#### Traces {#traces}

Tracing is off unless you turn it on (see [Record a trace](/docs/printlog-bridge-troubleshooting#trace)). **Traces stay on the computer the bridge runs on**: the bridge never sends them anywhere. The only way one leaves is in the support bundle `doctor` writes, which you choose to attach.

A trace holds what Moonraker tells the bridge, and what the bridge asks it:

- the printer's state as it changes: print progress, the active tool, filament used, Klipper's state, and on a U1 its RFID reader's tags;
- Moonraker's job history: file names (with their folders), times, outcomes and the slicer's metadata;
- the printer's list of objects, its webcams (with their URLs scrubbed), and lines printed to the console;
- the bridge's own requests, such as which objects it subscribes to.

It holds no G-code, and none of the header or settings read for the slicer settings. The support bundle's copy of the outbox leaves their text out too. Every secret the support bundle removes is removed from a trace before it is written.

### Not covered yet {#not-covered}

- **A personal API key has your account's full API access.** A paired bridge's device token works only for what the bridge does, and you can revoke it under **Paired devices** in [Settings](/settings). If the bridge uses a key instead, keep it to yourself, and delete it on the [Personal API Keys](/api-keys) page if it leaks.
- **Traffic on your network is as secure as Moonraker's.** Remote mode talks to Moonraker over the URL you give it, usually plain HTTP on your network, as Mainsail and Fluidd do.
