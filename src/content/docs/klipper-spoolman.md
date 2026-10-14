---
slug: klipper-spoolman
title: Connect Klipper via Spoolman | 3D Print Log Docs
description: Show your 3D Print Log spools in the Mainsail, Fluidd and KlipperScreen spool pickers with Moonraker's built-in Spoolman support, and nothing to install.
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

Moonraker has built-in support for [Spoolman](https://github.com/Donkie/Spoolman), a spool inventory server. 3D Print Log can stand in for that server, so your 3D Print Log spools show up in the Mainsail, Fluidd and KlipperScreen spool pickers. There is nothing to install: you paste a few lines into `moonraker.conf`.

Free includes one Spoolman printer. [Pro](/docs/pro-subscription) includes unlimited printers, under the fair-use terms in the [Terms of Service](/docs/terms-of-service#spoolman-fair-use).

### Set it up {#setup}

1. Open the printer in [Printers](/printers) and choose **Connect Spoolman**. It's offered on FDM printers.
2. Copy the `[spoolman]` block it shows. It contains a secret, so it's shown only once.
3. In Mainsail or Fluidd, open `moonraker.conf`, paste the block at the bottom, then choose **Save & Restart**.

The block looks like this, with your own printer and token in the address:

```
[spoolman]
server: https://printer-<id>:<token>@api.3dprintlog.com/spoolman
```

Lost the block? Choose **Reconnect** on the printer's page. You get a new block, and the old one stops working.

### Already running your own Spoolman? {#own-spoolman}

Replacing the `server` line points Moonraker at 3D Print Log instead of your own Spoolman server. Your old Spoolman's spools aren't imported, so add them as [materials](/docs/materials) in 3D Print Log first.

Moonraker remembers the active spool by its id, and that id belonged to your old server. Pick a spool again after you switch.

Spool ids in 3D Print Log are your spool numbers: 1, 2, 3 and so on, in the order you added them. They're the numbers the spool pickers show, so `SET_ACTIVE_SPOOL ID=12` selects your spool number 12.

### What works today {#works}

- The spool pickers in Mainsail, Fluidd and KlipperScreen.
- Each spool's remaining weight, colour, material and vendor.
- Setting the active spool, from a picker or with `SET_ACTIVE_SPOOL`.

### What doesn't work yet {#not-yet}

- **Filament usage reported by Moonraker isn't recorded yet.** Keep logging prints with [printlog-bridge](/docs/printlog-bridge) or the [Moonraker notifier](/docs/klipper). They record the filament each print used.
- Editing spools from KlipperScreen.
- Live updates in Fluidd. Reload the page to see a change made elsewhere.

### Printers with more than one tool {#multi-tool}

Moonraker tracks one active spool per printer. On a toolchanger or IDEX printer, either run `SET_ACTIVE_SPOOL` from your tool-change macros, or use [printlog-bridge](/docs/printlog-bridge), which splits usage per tool by itself.

### Security {#security}

- **The `server` line contains a token.** Anyone who can open Mainsail or Fluidd on your printer can read `moonraker.conf`, and the token with it.
- The token only reaches your spools, through this printer's connection. You can revoke it at any time: choose **Disconnect** on the printer's page, or **Revoke** under **Spoolman Connections** in [Settings](/settings), where every connected printer is listed.
- **Moonraker writes the address, token included, into `moonraker.log`.** Remove the token before you share that log, or revoke and reconnect the printer afterwards.

### Troubleshooting {#troubleshooting}

**Mainsail or Fluidd says "Spoolman disconnected".** Check that the connection is still listed on the printer's page and hasn't been revoked. On Free, check that this is your one connected printer. After a move from Pro to Free, only the first printer you connected keeps working, and the others are paused until you upgrade again. They resume with no change on the printer.

**`moonraker.log` shows `401`.** The token was revoked or mistyped. Choose **Reconnect** on the printer's page and paste the new block.

### Compared with the other Klipper integrations {#compare}

Spoolman shows your spools on the printer. [printlog-bridge](/docs/printlog-bridge) logs your prints. You can use both on the same printer. See [Klipper integrations compared](/docs/klipper#compare).
