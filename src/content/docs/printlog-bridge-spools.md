---
slug: printlog-bridge-spools
title: Assign Spools from Klipper with PRINTLOG_SET_SPOOL | 3D Print Log Docs
description: Tell 3D Print Log which spool is in each tool from Klipper's console or a macro, by spool id or RFID/NFC tag, with printlog-bridge's PRINTLOG_SET_SPOOL macros.
navLabel: Bridge – spool macros
nav: false
group: integrations
order: 45
mode: how-to
updated: 2026-10-12
related: [printlog-bridge, printers, materials, snapmaker-u1]
---

## Assign Spools with PRINTLOG_SET_SPOOL

---

Part of the [Log prints from Klipper](/docs/printlog-bridge) guide.

[printlog-bridge](/docs/printlog-bridge) links each tool's filament usage to the material loaded in that tool's slot in 3D Print Log. You can load materials in the app, on the printer's page (see [Material Slots](/docs/printers#slots)), or from the printer itself with two Klipper macros, `PRINTLOG_SET_SPOOL` and `PRINTLOG_CLEAR_SPOOL`.

The bridge reads each printer's loaded spools when it starts, every 5 minutes, and again when each print starts and ends, so a spool you change in the app between prints is on the next print. On a single-tool printer, a print also keeps its spool loaded in 3D Print Log.

### Set up the macros {#setup}

The macros live in `printlog.cfg`, which `printer.cfg` includes:

```
[include printlog.cfg]
```

- **Local mode:** `install.sh` copies `printlog.cfg` next to `printer.cfg` and adds the include above the `SAVE_CONFIG` block, unless you pass `--no-macros`.
- **Remote mode:** copy [klipper/printlog.cfg](https://github.com/HoffmanEngineering/printlog-bridge/blob/main/klipper/printlog.cfg) to the printer's config folder and add the include yourself, where the printer lets you.

Then restart Klipper while the printer is idle, with `FIRMWARE_RESTART` in the console or the restart button in Mainsail or Fluidd. Klipper only reads new macros when it restarts.

### The commands {#commands}

```
PRINTLOG_SET_SPOOL TOOL=2 TAG=04A23F11   ; T2 has the spool with this RFID/NFC tag
PRINTLOG_SET_SPOOL ID=<spool id>         ; the active tool has this spool
PRINTLOG_CLEAR_SPOOL TOOL=1              ; T1 has no spool
```

| Parameter | What it is |
| --- | --- |
| `TOOL` | The tool's number: `0` for T0 or a single-tool printer, `1` for T1, and so on. Without it, the active tool. |
| `ID` | The material's id in 3D Print Log: the end of its page's address, after `/materials/`. |
| `TAG` | A tag UID stored on the material in 3D Print Log, in hex. `04:a2:3f:11`, `04-A2-3F-11` and `04A23F11` are the same tag. Don't put spaces in it. |

`PRINTLOG_SET_SPOOL` takes either `ID` or `TAG`, not both. Run them in the console, or put them in your own macros, such as a filament-load macro.

### What the console shows {#replies}

The macro prints a line for the bridge to read, and the bridge answers on the console within a second or two:

```
// printlog: SET_SPOOL TOOL=2 TAG=04A23F11
// PRINTLOG_SET_SPOOL: sent to printlog-bridge, which answers here
// printlog-bridge: T2 is now Galaxy Black PLA in 3D Print Log
```

Other answers you might see:

| The bridge answers | What it means |
| --- | --- |
| `T1 has no spool in 3D Print Log now` | `PRINTLOG_CLEAR_SPOOL` worked. |
| `no spool in 3D Print Log has tag 04A23F11; nothing changed. Add the tag to the spool in the app, then run it again.` | No material of yours has that tag. Add it on the material's page (see [RFID / NFC Tags](/docs/materials#tags)). |
| `'XYZ' isn't a tag UID; give its bytes in hex, like 04A23F11 or 04:A2:3F:11` | The tag must be whole bytes of hex. |
| `'123' isn't a spool id; copy it from the spool's page in 3D Print Log` | `ID` must be the id from the material's page address. |
| `that spool isn't one of yours in 3D Print Log; nothing changed` | The id belongs to someone else's material. |
| `couldn't reach 3D Print Log (…); nothing changed. Run it again once the bridge is back online.` | The bridge or 3D Print Log is offline. |
| `printer voron isn't linked to a printer in 3D Print Log` | `printer_id` isn't set for this printer in the bridge's config. |

**If no answer comes, the bridge didn't hear the command**, because it was stopped, restarting or offline. Run it again once the bridge is back. The macros only print a line, so they never fail and never stop a print, even with the bridge offline.

The bridge also records each answer in its log and as the **Last event** in `printlog-bridge status`.

### Slots in 3D Print Log {#slots}

Each tool is a slot on the printer in 3D Print Log, labeled T0, T1, T2 and so on. When you assign a spool to a tool beyond the printer's **Material slots**, the bridge raises the printer's slot count to the number of tools Klipper has. Everything else about the printer stays as it was.

A material is in one place at a time, so loading it into a slot takes it out of any other slot it was in.

### When to assign spools {#timing}

Assign spools before a print starts. A print keeps the spools it started with. If a print's spool was wrong, change it on the print in the app, while it prints or after. The bridge keeps your choice.

### Tags {#tags}

`TAG` finds the material by a tag UID you added to it in the app. A tag belongs to one physical spool, so it can be on only one of your materials. See [RFID / NFC Tags](/docs/materials#tags) for how to add one.

On a [Snapmaker U1](/docs/snapmaker-u1#rfid), the printer's own RFID reader does this for you, with no macro.

### Spoolman {#spoolman}

The bridge never touches Moonraker's Spoolman integration, its active spool or what it reports. The macros only change what's loaded in 3D Print Log.
