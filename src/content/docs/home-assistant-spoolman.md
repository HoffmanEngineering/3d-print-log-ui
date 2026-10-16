---
slug: home-assistant-spoolman
title: Home Assistant via Spoolman | 3D Print Log Docs
description: See your 3D Print Log spools in Home Assistant, with remaining weight, color, material and a low-filament sensor, using the community Spoolman integration.
navLabel: Home Assistant
group: integrations
order: 55
mode: how-to
updated: 2026-10-16
related: [klipper-spoolman, materials, printers]
---

## Home Assistant via Spoolman

---

The community [Spoolman integration for Home Assistant](https://github.com/Disane87/spoolman-homeassistant) was written for [Spoolman](https://github.com/Donkie/Spoolman), a spool inventory server. 3D Print Log can stand in for that server, so the same integration shows your 3D Print Log spools in Home Assistant. You need nothing beyond the integration itself, and it uses the same address as [Spoolman for Klipper](/docs/klipper-spoolman).

Each spool becomes a device in Home Assistant, with sensors for its remaining weight and length, how much of it is used, its color, material, vendor and price, and a low-filament sensor. Use them on dashboards, or in automations that warn you before a spool runs out.

The integration only reads your spools. To change one, use 3D Print Log. See [What it can't do](#read-only).

### What you need {#needs}

- A Spoolman connection on one of your printers in 3D Print Log. Free includes one Spoolman printer, and one printer's connection shows your **whole** inventory, so Home Assistant needs no connection of its own. If you already connected a Klipper printer, reuse its address.
- [HACS](https://hacs.xyz), the Home Assistant Community Store, to install the integration.

### Find your server address {#address}

The integration asks for a Spoolman server URL. Yours is the `server` line of the `[spoolman]` section that 3D Print Log gives you:

```
https://printer-<id>:<secret>@api.3dprintlog.com/spoolman
```

with your own printer id and secret in place of `<id>` and `<secret>`.

- **Already using Spoolman for Klipper?** Copy the address after `server:` from the `[spoolman]` section of that printer's `moonraker.conf`.
- **Not connected yet?** Open the printer in [Printers](/printers) and choose **Connect Spoolman**, in the **Spoolman** section. It's offered on FDM printers. Copy the `server` address from the block it shows. The block contains a secret, so it's shown only once. If the printer runs Klipper, paste the block into `moonraker.conf` too, as [Spoolman for Klipper](/docs/klipper-spoolman#setup) describes.

If you've lost the address, choose **Change secret** on the printer's page for a new one. The old address stops working at once, so update `moonraker.conf` as well as Home Assistant. See [After you change the secret](#rotate).

### Set it up {#setup}

1. Install [HACS](https://hacs.xyz/docs/use/) if you don't have it yet.
2. In HACS, search for **Spoolman**, download the integration, then restart Home Assistant.
3. Go to **Settings → Devices & services**, choose **Add integration** and pick **Spoolman**.
4. Paste your [server address](#address) as the URL and finish the setup.

Your spools appear as devices a moment later.

### How often it updates {#polling}

The integration asks 3D Print Log for your spools every 15 minutes by default. You can change the interval in the integration's options. A print or a weigh-in in 3D Print Log shows up in Home Assistant at the next update.

### What it can't do {#read-only}

3D Print Log answers the integration's read requests only.

- **Editing a spool, or changing its location, fails** with an error from the server. Make the change in [Materials](/materials) instead.
- **The "Use filament" action records nothing** unless the printer the address belongs to has a print in progress that its `[notifier 3d_print_log]` section logged. Home Assistant still reports success. To take filament off a spool by hand, add an adjustment to the material in 3D Print Log. See [How Remaining Material is Calculated](/docs/materials#remaining).

### Sensors that behave differently than you might expect {#quirks}

- **Flow rate and Estimated run out** treat any drop in remaining weight since the last update as filament burned. A weigh-in in 3D Print Log that lowers a spool's weight shows up as a burst of flow, and the run-out estimate jumps with it. A real Spoolman server does the same.
- **Low Filament** compares the spool's remaining percentage against the integration's **warning** threshold, which defaults to 75. So a spool with 75% left already reads "Problem". Lower the warning threshold in the integration's options, to 10 or 20 for example, so the sensor turns on when a spool is actually running low.
- **Multi-color spools get no color sensor.** The integration reads only a spool's single color, and a multi-color material in 3D Print Log has several.

### After you change the secret {#rotate}

The server address is part of each device's identity in Home Assistant. After you choose **Change secret**, entering the new address would create every spool's device again and leave the old ones behind, unavailable. Instead:

1. Go to **Settings → Devices & services**, open the **Spoolman** integration and delete it.
2. Add it again with the new address, as in [Set it up](#setup).

Automations and dashboards that used the old entities may need their entities picked again.

### Security {#security}

- **Don't share screenshots of a spool's device page.** The integration sets each device's **Visit** link to the full server address, secret included.
- The same address, secret included, is in Moonraker's `moonraker.log` and in `moonraker.conf` on a Klipper printer. Remove it before you share either one.
- The secret reaches your spools and logs prints for its printer, and nothing else. If it leaks, choose **Change secret** on the printer's page, or revoke it under **Spoolman Connections** in [Settings](/settings). Then update Home Assistant as in [After you change the secret](#rotate).
