---
slug: klipper-spoolman
title: Connect Klipper via Spoolman | 3D Print Log Docs
description: Show your 3D Print Log spools in the Mainsail, Fluidd and KlipperScreen spool pickers and log every print, using Moonraker's Spoolman support with nothing to install.
navLabel: Spoolman for Klipper
nav: false
group: integrations
order: 43
mode: how-to
updated: 2026-10-14
related: [printlog-bridge, klipper, materials, printers]
---

## Connect Klipper via Spoolman

---

Part of the [Log prints from Klipper](/docs/printlog-bridge) guide.

Moonraker has built-in support for [Spoolman](https://github.com/Donkie/Spoolman), a spool inventory server. 3D Print Log can stand in for that server, so your 3D Print Log spools show up in the Mainsail, Fluidd and KlipperScreen spool pickers. The same block also logs each print on the printer, and charges the filament it used to the spool that was active. There is nothing to install: you paste a few lines into `moonraker.conf`.

Free includes one Spoolman printer. [Pro](/docs/pro-subscription) includes unlimited printers, under the fair-use terms in the [Terms of Service](/docs/terms-of-service#spoolman-fair-use).

### Set it up {#setup}

1. Open the printer in [Printers](/printers) and choose **Connect Spoolman**. It's offered on FDM printers.
2. Copy the block it shows. It contains a secret, so it's shown only once.
3. If your `moonraker.conf` already has a `[notifier 3d_print_log]` section, from the API-key setup in [Klipper notifier](/docs/klipper), delete it first. Two sections with the same name stop Moonraker from loading its config.
4. In Mainsail or Fluidd, open `moonraker.conf`, paste the block at the bottom, then choose **Save & Restart**.

The block has two sections, `[spoolman]` and `[notifier 3d_print_log]`, with your own printer and secret in the addresses:

```
[spoolman]
server: https://printer-<id>:<token>@api.3dprintlog.com/spoolman

[notifier 3d_print_log]
url: ...
```

The `[notifier 3d_print_log]` section logs each print on this printer when it starts, succeeds, fails or is cancelled. It uses the same secret as `[spoolman]`, so you need no API key and no printer id.

If [printlog-bridge](/docs/printlog-bridge) is running for the printer, the bridge logs its prints and the notifier's events are ignored, so nothing is logged twice.

Lost the block? Choose **Reconnect** on the printer's page. You get a new block, and the old one stops working.

### Already running your own Spoolman? {#own-spoolman}

Replacing the `server` line points Moonraker at 3D Print Log instead of your own Spoolman server. Your old Spoolman's spools aren't imported, so add them as [materials](/docs/materials) in 3D Print Log first. printlog-bridge leaves a Spoolman server that isn't 3D Print Log alone: it syncs spools only when `[spoolman]` points at 3D Print Log.

Moonraker remembers the active spool by its id, and that id belonged to your old server. Pick a spool again after you switch.

Spool ids in 3D Print Log are your spool numbers: 1, 2, 3 and so on, in the order you added them. They're the numbers the spool pickers show, so `SET_ACTIVE_SPOOL ID=12` selects your spool number 12.

### What works today {#works}

- The spool pickers in Mainsail, Fluidd and KlipperScreen.
- Each spool's remaining weight, colour, material and vendor.
- Setting the active spool, from a picker or with `SET_ACTIVE_SPOOL`.
- Logging prints with the `[notifier 3d_print_log]` section: each print is logged when it starts and when it succeeds, fails or is cancelled.
- Filament used, charged per spool to the spool that was active in Moonraker while printing, however you picked it (Mainsail, Fluidd, KlipperScreen or `SET_ACTIVE_SPOOL`). On a printer with one tool, that spool is also loaded on the printer in 3D Print Log.
- With [printlog-bridge](/docs/printlog-bridge), spools stay in sync both ways. A spool picked on the printer is loaded into the active tool's slot in 3D Print Log, and a spool loaded in the app, with `PRINTLOG_SET_SPOOL` or by the Snapmaker U1's RFID reader becomes Moonraker's active spool when that tool is active.
- Fluidd's **Manage spools** button, which opens your materials in 3D Print Log. A link to one spool opens that spool's material.

### What doesn't work yet {#not-yet}

- Editing spools from KlipperScreen.
- Live updates in Fluidd. See [Live updates in Fluidd](#live-updates).
- Per-tool filament from the block alone on a printer with several tools. See [Printers with more than one tool](#multi-tool).

### Printers with more than one tool {#multi-tool}

Moonraker tracks one active spool per printer, so a spool you pick on the printer is charged to whichever tool is active when you pick it.

With only the block, a toolchanger or IDEX printer charges every tool's filament to the active spool, unless your tool-change macros run `SET_ACTIVE_SPOOL`.

With [printlog-bridge](/docs/printlog-bridge), the bridge sets Moonraker's active spool on each tool change, from the spool loaded in that tool's slot in 3D Print Log. You need no macros. This covers the [Snapmaker U1](/docs/snapmaker-u1), whose T0 to T3 are built-in commands. It works only when `[spoolman]` points at 3D Print Log.

### Live updates in Fluidd {#live-updates}

Fluidd's Spoolman card may show "Live updates from Spoolman aren't working". That is expected. Fluidd connects to the spool server straight from the browser, without the printer's credential, so it can't receive live updates. Reload the page to see changes. Mainsail doesn't do this.

### Security {#security}

- **The `server` line contains a token.** Anyone who can open Mainsail or Fluidd on your printer can read `moonraker.conf`, and the token with it.
- The token only reaches your spools, through this printer's connection. You can revoke it at any time: choose **Disconnect** on the printer's page, or **Revoke** under **Spoolman Connections** in [Settings](/settings), where every connected printer is listed.
- **Moonraker writes the address, token included, into `moonraker.log`.** Remove the token before you share that log, or revoke and reconnect the printer afterwards.

### Troubleshooting {#troubleshooting}

**Mainsail or Fluidd says "Spoolman disconnected".** Check that the connection is still listed on the printer's page and hasn't been revoked. On Free, check that this is your one connected printer. After a move from Pro to Free, only the first printer you connected keeps working, and the others are paused until you upgrade again. They resume with no change on the printer.

**Moonraker won't load its config after you pasted the block.** Look for a second `[notifier 3d_print_log]` section in `moonraker.conf`. Delete the old one from the API-key setup, keep the one from the new block, then choose **Save & Restart**.

**`moonraker.log` shows `401`.** The token was revoked or mistyped. Choose **Reconnect** on the printer's page and paste the new block.

### Compared with the other Klipper integrations {#compare}

The Spoolman block shows your spools on the printer and logs your prints, with nothing to install. [printlog-bridge](/docs/printlog-bridge) logs more detail (the real outcome, filament per tool, pictures) and keeps spools in sync both ways. You can use both on the same printer. See [Klipper integrations compared](/docs/klipper#compare).
