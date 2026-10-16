---
slug: snapmaker-u1
title: Snapmaker U1 Print Logging with printlog-bridge | 3D Print Log Docs
description: Log Snapmaker U1 prints to 3D Print Log automatically with printlog-bridge, with filament per tool on all four tools and spools assigned from their RFID tags.
navLabel: Bridge – Snapmaker U1
nav: false
group: integrations
order: 46
mode: how-to
updated: 2026-10-15
related: [printlog-bridge, printlog-bridge-docker, printlog-bridge-spools, materials]
---

## Snapmaker U1

---

Part of the [Log prints from Klipper](/docs/printlog-bridge) guide.

The Snapmaker U1 runs Snapmaker's own versions of Klipper and Moonraker, and you can't install extra software on it. [printlog-bridge](/docs/printlog-bridge) logs its prints from another computer on your network, in [remote mode](/docs/printlog-bridge-docker).

The bridge's U1 support follows Snapmaker's published firmware, and has been checked against a real U1 (Klipper 2.0.0.205, Moonraker 2.0.0): its job history, its tools, its RFID reader and a two-tool print logged from start to finish. If something looks wrong, please [send a trace](/docs/printlog-bridge-troubleshooting#trace).

### Set it up {#setup}

1. Give the U1 a fixed IP address with a DHCP reservation in your router, so the bridge can always find it.
2. Add the U1 on the [Printers](/printers) page, and set its **Material slots** to 4 (see [Material Slots](/docs/printers#slots)).
3. Set up the bridge in [Docker](/docs/printlog-bridge-docker), with a section for the U1 in `printlog-bridge.cfg`:

  ```
  [printer u1]
  printer_id = 42
  url = http://192.168.1.51:7125
  ```

  `printer_id` is the U1's number in 3D Print Log, the end of its page's address, and `url` is its IP address on port 7125.

On the U1 we tested, Moonraker already trusts the usual home network address ranges, so the bridge doesn't need a `moonraker_api_key`. If yours turns the bridge away, see [Printers with Moonraker authorization](/docs/printlog-bridge-docker#moonraker-auth).

### Filament on four tools {#tools}

The U1's four tools are T0 to T3 (Klipper's `extruder` to `extruder3`), and each tool used gets its own usage row on the print, linked to the spool loaded in that slot. The bridge follows which tool is active while the print runs, and the rows add up to the job's total.

When the file was sliced with Snapmaker Orca, the U1 lists the weight of each filament, so a new print starts with an estimate on each tool's row. A print that ran while the bridge was away is split in those proportions.

### Spools from RFID tags {#rfid}

The U1 reads the RFID tag on a Snapmaker spool when it's loaded. When the bridge sees a tag in a slot, it assigns the material in your 3D Print Log inventory that has that tag UID to the slot, with no macro and nothing to type on the printer.

To have a spool assigned:

1. Find its tag UID. When the reader sees a tag that no material has, the bridge's log has a line like this, with the UID:

  ```
  [printer u1] T0's reader sees tag A05D1C3F, which no spool in 3D Print Log has; add it to the spool in the app to have it assigned
  ```

  Read the log with `docker logs printlog-bridge`, or in `state/bridge.log` in the bridge's folder.

2. Add the UID to the material in the app, under **RFID / NFC tags** (see [RFID / NFC Tags](/docs/materials#tags)).
3. Wait up to 5 minutes. While a tag that no material has stays in its slot, the bridge checks it again every 5 minutes and assigns the spool once it finds the tag. Taking the spool out and putting it back is usually quicker.

From then on, loading that spool into any slot assigns it there.

**Changing a spool mid-print.** When you swap a tagged spool into a slot partway through a print, that tool's filament is split between the two spools: what was printed before goes to the old one, the rest to the new one, and the print gets a note such as `T0: Spool A → Spool B at 63% (layer 112)`. The U1's runout sensors (`e0_filament` to `e3_filament`, one per tool) tell the bridge which tool ran out. When a spool runs out and the new one has no tag the bridge knows, the console asks you to run `PRINTLOG_SET_SPOOL` for that tool. See [Changing spools mid-print](/docs/printlog-bridge-spools#mid-print).

Only Snapmaker's own tags are read. A spool with no tag, or with a tag that isn't Snapmaker's, is left alone: load it in the app, or with the [spool macros](/docs/printlog-bridge-spools) where you can install them.

**A spool check note.** When the tag in a slot isn't on any of your materials, and the material or color the tag reports doesn't match the spool loaded in that slot in 3D Print Log, the print gets a note saying so. It's logged all the same. Check which spool the print actually used, and fix it on the print if needed.

### Spoolman {#spoolman}

The U1 can use [Spoolman for Klipper](/docs/klipper-spoolman), which shows your 3D Print Log spools in its spool pickers and logs prints. It needs Advanced Mode on the U1, because you edit its `moonraker.conf` to add the block.

Turn on Advanced Mode before you edit `moonraker.conf`: on the U1's screen, go to **Settings → Maintenance → Advanced Mode**, check **Agree**, then tap **Open**. Without it, a boot script puts back the stock config when the printer restarts, and the `[spoolman]` block disappears. This was tested on firmware 2.0.0, where the block survives a full reboot with Advanced Mode on, and picking a spool on the printer updates the tool's slot.

The U1's block has only `[spoolman]`. Moonraker logs prints with its notifier, which needs the `apprise` package, and the U1's Moonraker doesn't include it: a `[notifier]` section fails with "failed plugins: notifier". So printlog-bridge logs the U1's prints. With `[spoolman]` alone and no bridge, the U1's spool pickers show your 3D Print Log spools, but prints and filament use aren't logged.

With the bridge running, picking a spool on a tool and the RFID reader stay in sync with Moonraker's active spool. A spool picked on the printer is loaded into the active tool's slot in 3D Print Log, and a spool assigned from an RFID tag or in the app becomes Moonraker's active spool when that tool is active. The bridge also sets the active spool on each tool change, so you need no macros. This works only when `[spoolman]` points at 3D Print Log.

### No webcam snapshot {#snapshot}

The U1's Moonraker has no webcam configured, so the bridge has no frame to add when a print ends. Each print still gets the thumbnail from its file as its picture when it starts.
