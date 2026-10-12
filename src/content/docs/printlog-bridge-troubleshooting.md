---
slug: printlog-bridge-troubleshooting
title: Troubleshooting printlog-bridge | 3D Print Log Docs
description: Fix printlog-bridge problems with its doctor and status commands, find its logs and state, record a trace, and solve common Klipper and Moonraker issues.
navLabel: Bridge – troubleshooting
group: integrations
order: 47
mode: how-to
updated: 2026-10-12
related: [printlog-bridge, printlog-bridge-install, printlog-bridge-docker, printlog-bridge-privacy]
---

## Troubleshooting printlog-bridge

---

[printlog-bridge](/docs/printlog-bridge) has two commands for finding out what's wrong: `doctor` checks the setup, and `status` shows what the running bridge is doing. How you run them depends on where the bridge runs:

| Installed | Run |
| --- | --- |
| On the printer (local mode) | `~/printlog-bridge-env/bin/printlog-bridge doctor` |
| In Docker (remote mode) | `docker exec printlog-bridge printlog-bridge doctor` |

Replace `doctor` with `status` for the other one.

### Check the setup with doctor {#doctor}

`doctor` checks, in order: Python, the config file, the state directory, SQLite, where the API key is kept, signing in to 3D Print Log, the computer's clock, and for each printer, that Moonraker answers and that the printer exists in your 3D Print Log account. Each line says `ok`, `warn` or `FAIL`, with what to fix:

```
printlog-bridge 0.1.0 doctor
  ok    Python: 3.11.2
  ok    Config: /home/pi/printer_data/config/printlog-bridge.cfg (1 printer)
  ok    State directory: /home/pi/.local/share/printlog-bridge
  ok    SQLite: 3.40.1
  ok    API key: in /home/pi/.local/share/printlog-bridge/api_key
  ok    3D Print Log API: https://api.3dprintlog.com, signed in as Chris
  ok    Clock: within 1s of 3D Print Log's
  ok    Printer voron: moonraker, local socket /home/pi/printer_data/comms/moonraker.sock, Moonraker v0.9.3, Klipper ready
  ok    Printer voron in 3D Print Log: printer 42, Voron 2.4
No problems found.
Support bundle: /home/pi/.local/share/printlog-bridge/printlog-bridge-support.zip (API keys and passwords removed)
```

It exits with `1` when any check fails, so scripts can use it.

**The support bundle.** `doctor` also writes `printlog-bridge-support.zip` in the state directory. It holds the doctor report, your config, the bridge's status and state, its recent log and, with tracing on, the latest traces. Every API key, token and password is removed from it, and the key file is never included. Attach it when you ask for help.

### See what it's doing with status {#status}

```
printlog-bridge 0.1.0 status
Bridge: running since 2026-10-10 09:30 UTC (version 0.1.0, pid 812)
Printer voron (printer 42 in 3D Print Log)
  Connection: connected for 3h 12m (moonraker, local socket /home/pi/printer_data/comms/moonraker.sock)
  Printer state: ready
  Pairing: not paired; API key from /home/pi/.local/share/printlog-bridge/api_key
  Last event: job 00002A completed: print 1834 (14m ago)
  Heartbeat: 2m 10s ago
  Outbox: empty
  Warnings: none
```

For each printer, it shows the connection to Moonraker (and why it dropped), the printer's state, the last job event or spool change, the last heartbeat to 3D Print Log, how many jobs are waiting to be sent, and anything you need to fix. A `Trace` line appears while tracing is on. `status` exits with `0` while the bridge runs and `1` when it doesn't; the Docker image uses it as its health check.

### Logs and state {#logs}

The bridge keeps everything in its state directory: `~/.local/share/printlog-bridge` in local mode, and `state/` in the mounted folder (`/data/state` inside the container) in Docker.

| File | What it is |
| --- | --- |
| `bridge.log` | The log. It keeps about 2 MB: itself and one older copy. |
| `status.json` | What `status` shows |
| `outbox.sqlite3`, `images/` | Job events and pictures not sent yet |
| `printers/` | Which job was logged as which print |
| `api_key` | The API key, readable only by its owner |
| `traces/` | Traces, when tracing is on |
| `printlog-bridge-support.zip` | The bundle `doctor` writes |

The log also goes to the service's output: `journalctl -u printlog-bridge` in local mode, and `docker logs printlog-bridge` in Docker.

### Record a trace {#trace}

To report a problem with a printer, record a trace: every message the bridge sends to and receives from the printer's Moonraker, one JSON line each.

1. Turn it on. Set `trace = true` in the `[bridge]` section of `printlog-bridge.cfg`, or in Docker, set the environment variable `PRINTLOG_BRIDGE_TRACE` to `1` on the container.
2. Restart the bridge. `status` shows `Trace: on` while it records.
3. Reproduce the problem, such as a print that was logged wrong.
4. Run `doctor`, and attach the support bundle, which includes the latest 20 MB of traces.
5. Turn it off: set `trace = false` (or remove the line) and restart.

Traces are written to `traces/` in the state directory, as `<printer>-<YYYYMMDD>.jsonl`, and stay on that computer: the bridge never sends them anywhere. Every API key, Moonraker key, token and password is removed before a line is written, and a trace never holds G-code. Each printer's traces are kept under 50 MB, the oldest deleted first, and tracing never slows the bridge down. [Privacy](/docs/printlog-bridge-privacy#traces) lists what a trace holds.

### Common problems {#problems}

#### The printer can't be reached, or its IP address changed {#unreachable}

`status` shows the printer as `disconnected`, with the reason, and `doctor` says `can't reach Moonraker at …`. The bridge keeps trying to reconnect, waiting up to a minute between tries.

- **In remote mode**, the most common cause is the printer getting a new IP address from your router. Give the printer a fixed address with a **DHCP reservation** in your router's settings, set `url` in `printlog-bridge.cfg` to that address, and restart the bridge. Use an IP address rather than a name like `voron.local`, which usually doesn't resolve inside a container.
- **In local mode**, `no Moonraker socket at …` means Moonraker isn't running, or its data folder isn't `~/printer_data`. Set `socket` in the printer's section to the right path.
- If the printer is fine but Moonraker turns the bridge away, see [Printers with Moonraker authorization](/docs/printlog-bridge-docker#moonraker-auth).

#### Another bridge is already connected {#already-connected}

Moonraker accepts one bridge per printer. `another printlog-bridge is already connected to Moonraker` means a second copy is running, perhaps in Docker on another computer as well as on the printer. Stop one, and the other takes over.

#### No prints are logged {#not-logging}

- `3D Print Log API: … rejected the API key`: the key was deleted or mistyped. Create a new one on the [Personal API Keys](/api-keys) page and store it with `store-key`.
- `printer_id isn't set` or `this account has no printer 42`: set `printer_id` to the number at the end of the printer's page in 3D Print Log.
- `Moonraker's job history is off, so no print can be logged`: add a `[history]` section to `moonraker.conf` and restart Moonraker.
- `Bridge: not running`: in local mode, the service stops while its config needs fixing. Fix what `doctor` reports, then restart printlog-bridge from Mainsail or Fluidd, or with `sudo systemctl restart printlog-bridge`.

#### Prints show up late {#outbox}

When 3D Print Log can't be reached, prints wait in the outbox. `status` shows `Outbox: 2 jobs waiting to be logged`, with why the last try failed. The bridge retries with a wait that doubles from 2 seconds up to a minute, so prints arrive within a minute or two of the connection coming back. An event still unsent after 30 days is dropped, with a warning in the log.

#### The printer shows as Stale {#stale}

The bridge checks in every 5 minutes, and the printer's [Connections](/docs/printers#connections) show it as **Stale** after 15 minutes without hearing from it. Check that the bridge is running with `status`. If `doctor` warns that the computer's clock is ahead of or behind 3D Print Log's, turn on network time sync (on Linux, `sudo timedatectl set-ntp true`).

#### A spool tag isn't recognized {#tag-not-found}

`no spool in 3D Print Log has tag 04A23F11` means none of your materials has that tag UID. Add it on the material's page under **RFID / NFC tags** (see [RFID / NFC Tags](/docs/materials#tags)), then run `PRINTLOG_SET_SPOOL` again. Any common format works, as long as it's whole bytes of hex.

On a Snapmaker U1, the bridge looks up each tag the reader sees only once. After adding the tag in the app, restart the bridge so it looks again. See [Spools from RFID tags](/docs/snapmaker-u1#rfid).

If the macro doesn't answer at all, see [What the console shows](/docs/printlog-bridge-spools#replies).

#### The webcam snapshot was skipped {#snapshot}

A picture never holds up logging a print. When the webcam doesn't answer properly, the print is logged without the frame, and the log has a line like:

```
[printer voron] job 00002A's snapshot: http://192.168.1.50/webcam/?action=snapshot answered 502; skipping it
```

A `502` usually means the webcam's stream service isn't running, or the webcam's snapshot URL in Mainsail or Fluidd points at the wrong place. Open that URL in a browser to check it. A picture that takes longer than 10 seconds, or is over 10 MB, is skipped too. To stop asking the webcam, set `snapshots = false` in the printer's section.

A printer whose Moonraker has no webcam set up, such as the [Snapmaker U1](/docs/snapmaker-u1#snapshot), gets no snapshot and no warning.

### Getting help {#help}

Run `doctor`, then open an issue on [GitHub](https://github.com/HoffmanEngineering/printlog-bridge/issues) with the support bundle attached, or send us [feedback](/feedback). Record a [trace](#trace) first if the problem is with how a print was logged.
