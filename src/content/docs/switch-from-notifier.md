---
slug: switch-from-notifier
title: Switch from the Moonraker Notifier to printlog-bridge | 3D Print Log Docs
description: Move a Klipper printer from the Moonraker notifier to printlog-bridge. Install the bridge first, then remove the notifier section from moonraker.conf.
navLabel: Bridge – switch from the notifier
group: integrations
order: 49
mode: how-to
updated: 2026-10-12
related: [printlog-bridge, printlog-bridge-install, printlog-bridge-docker, klipper, printers]
---

## Switch from the Moonraker Notifier

---

If your Klipper printer logs prints through the [Moonraker notifier](/docs/klipper), you can move it to [printlog-bridge](/docs/printlog-bridge). The bridge records the real outcome, filament per tool linked to your spools, the slicer's thumbnail and a webcam snapshot, and it keeps events on disk while 3D Print Log is out of reach.

You don't have to switch in one go. Install the bridge first, check that it logs a print, then remove the notifier when it suits you. Until you do, 3D Print Log logs each print once, from the bridge.

---

### Before and after {#before-after}

**Before**, the notifier section in `moonraker.conf` sends every print event to 3D Print Log:

```
[notifier 3d_print_log]
url: jsons://api.3dprintlog.com/api/Moonraker/notifier?+X-Api-Key=APIKEYGOESHERE
events: *
body:
    {% set payload = {"printerId": PRINTERIDHERE} %}
    {% do payload.update({"event_name": event_name}) %}
    {% do payload.update(event_args[1]) %}
    { payload|tojson }
```

**After**, that section is gone, and the bridge has its own config file. In local mode it's `printlog-bridge.cfg`, next to `printer.cfg`:

```
[printer voron]
printer_id = 42
socket = /home/pi/printer_data/comms/moonraker.sock
```

In remote mode (Docker), the section has the printer's Moonraker address instead of the socket:

```
[printer voron]
printer_id = 42
url = http://192.168.1.50:7125
```

The API key isn't in either file. The bridge keeps it in a key file of its own, readable only by the user it runs as.

---

### Step 1: Install the bridge {#install}

Install printlog-bridge the way that suits the printer:

- [Install on the printer (local mode)](/docs/printlog-bridge-install), as a systemd service next to Klipper and Moonraker.
- [Run it in Docker (remote mode)](/docs/printlog-bridge-docker), on a NAS, home server or another Pi.

Set `printer_id` to the same number as `PRINTERIDHERE` in your notifier section. That's the printer's number in 3D Print Log, the end of its page's address (`42` in `https://www.3dprintlog.com/printers/42`). 3D Print Log matches the notifier and the bridge by that number, so a different one logs each print on two printers.

Give the bridge its own [personal API key](/docs/api#api-keys) rather than reusing the notifier's. Then you can retire the old key in [step 4](#revoke-key) without touching the bridge.

---

### Step 2: Check that the bridge logs a print {#check}

Open the printer's **Edit Page** in 3D Print Log. The bridge is listed under [Connections](/docs/printers#connections) as **Online**. Start a print: it shows up on your [Print List](/prints) as **Printing**, logged by the bridge.

While the notifier is still set up, a banner at the top of 3D Print Log says the bridge now logs that printer and the notifier's events are being ignored. It links back to this page. Once you dismiss it, it stays dismissed on every device.

If the bridge isn't listed, or it shows as **Stale**, see [troubleshooting](/docs/printlog-bridge-troubleshooting).

---

### Step 3: Remove the notifier section {#remove}

1. Open `moonraker.conf`, from the configuration page in Mainsail or Fluidd, or over SSH.
2. Delete the whole `[notifier 3d_print_log]` section: the `[notifier 3d_print_log]` line and every line under it, down to the next section or the end of the file. It's the section shown under [Before](#before-after). If you gave it another name, look for the `[notifier ...]` section whose `url` points at `api.3dprintlog.com`.
3. Save the file and restart Moonraker, from the services menu in Mainsail or Fluidd, or with `sudo systemctl restart moonraker`. Moonraker only reads `moonraker.conf` when it starts, so the notifier keeps sending until you restart it.

Leave the rest of `moonraker.conf` alone. The bridge needs `[history]`, and in local mode the installer added an `[update_manager printlog-bridge]` section there.

---

### Step 4: Revoke the old API key {#revoke-key}

The notifier's key sat in `moonraker.conf`, which anyone who can open Mainsail or Fluidd can download. If you created that key only for the notifier, delete it on the [Personal API Keys](/api-keys) page. It stops working immediately.

Only delete it if nothing else uses it. If the bridge, a script or another printer signs in with the same key, deleting it stops those too.

---

### How the two run side by side {#coexistence}

3D Print Log ignores a notifier event when the same printer has a live printlog-bridge connection. Specifically, it drops a notifier `started`, `complete`, `cancelled` or `error` event when all of these are true:

- the event's `printerId` is the printer the bridge is set up for (its `printer_id`);
- the bridge is signed in to the same account as the notifier's API key;
- the bridge checked in during the last 15 minutes.

The bridge checks in every 5 minutes, and the printer's Edit Page shows it as **Stale** after 15 minutes without hearing from it. While it is stale, 3D Print Log no longer ignores the notifier, so the notifier logs the printer on its own. Remove the notifier once the bridge works, so you don't rely on the notifier as a fallback.

The bridge itself doesn't check whether the notifier is set up. Ignoring the notifier's events happens in 3D Print Log, and only for the printer the bridge watches.

---

### Staying on the notifier {#staying}

The notifier still works. Its address, `/api/Moonraker/notifier`, isn't going away, and the [notifier setup](/docs/klipper#Setup) is still documented for printers that already use it.
