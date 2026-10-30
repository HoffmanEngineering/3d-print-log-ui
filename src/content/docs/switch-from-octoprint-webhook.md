---
slug: switch-from-octoprint-webhook
title: Switch from the OctoPrint Webhook to printlog-bridge | 3D Print Log Docs
description: Move an OctoPrint printer from the Webhooks plugin to printlog-bridge. Set up the bridge first, then turn off the 3D Print Log hook in OctoPrint.
navLabel: OctoPrint – switch to the bridge
nav: false
group: integrations
order: 41
mode: how-to
updated: 2026-10-29
related: [octoprint-webhook, printlog-bridge-octoprint, printlog-bridge, printlog-bridge-docker, printers]
---

## Switch from the OctoPrint Webhook to printlog-bridge

---

Part of the [Log prints from OctoPrint](/docs/octoprint-webhook) guide.

If your printer logs prints through the [OctoPrint webhook](/docs/octoprint-webhook), you can move it to [printlog-bridge](/docs/printlog-bridge). The bridge watches OctoPrint over its own API and logs each print with its outcome and times, the slicer's estimated filament per tool, the file's thumbnail and, with a webcam set up in OctoPrint, a snapshot when the print ends. It keeps events on disk while 3D Print Log is out of reach. It only ever reads from OctoPrint: it never starts, pauses or cancels a print, never uploads or deletes a file, and never sends G-code.

You don't have to switch in one go. Set up the bridge first, check that it logs a print, then turn off the webhook. Until you do, 3D Print Log logs each print once, from the bridge.

---

### Step 1: Set up the bridge {#install}

The bridge runs [in Docker](/docs/printlog-bridge-docker) on a computer on the same network as OctoPrint: a NAS, a home server or another Raspberry Pi. [OctoPrint](/docs/printlog-bridge-octoprint) has the full setup, including connecting OctoPrint from the Bridges screen instead of the config file, and what the bridge logs.

1. In OctoPrint, open **Settings > Application Keys** and make a key for the bridge (or copy your user's key from **Settings > API Key**). The user it belongs to needs the Status, File List, File Download and Settings Read permissions; an admin has them all.
2. Add a section for the printer to `printlog-bridge.cfg`:

```
[printer ender]
adapter = octoprint
printer_id = 46
url = http://octopi.local
api_key = a-key-from-octoprint
```

- `printer_id` is the printer's number in 3D Print Log, the same number you entered as the webhook's **DEVICE IDENTIFIER**. It's the end of the printer's page address (`46` in `https://www.3dprintlog.com/printers/46`). 3D Print Log matches the webhook and the bridge by that number, so a different one logs each print on two printers.
- `url` is the address you open OctoPrint at, with its port when it isn't 80 (`http://192.168.1.70:5000`) and its path when it's behind a prefix (`http://pi.local/octoprint`). Give the OctoPrint host a fixed address with a DHCP reservation in your router.
- `api_key` is the OctoPrint key from step 1, not your 3D Print Log key.

**Keep this config where nothing serves it**, never in OctoPrint's `uploads` folder. The bridge never logs, traces or bundles `api_key`, and `doctor` warns when the config is in a folder OctoPrint serves.

---

### Step 2: Check that the bridge logs a print {#check}

Restart the bridge, then run `doctor`:

```
docker exec printlog-bridge printlog-bridge doctor
```

It says whether OctoPrint answered, its version, whether it's connected to the printer, and whether the Webhooks plugin still posts to 3D Print Log.

Open the printer's **Edit Page** in 3D Print Log. The bridge is listed under [Connections](/docs/printers#connections) as **Online**. Start a print: it shows up on your [Print List](/prints) as **Printing**, logged by the bridge.

While the webhook is still on, a banner at the top of 3D Print Log says the bridge now logs that printer and the webhook's events are being ignored. It links back to this page. Once you dismiss it, it stays dismissed on every device.

If the bridge isn't listed, or it shows as **Stale**, see [troubleshooting](/docs/printlog-bridge-troubleshooting).

---

### Step 3: Turn off the webhook {#turn-off}

1. On your OctoPrint, navigate to Settings and find the **Webhooks** menu under Plugins.
2. Select the 3D Print Log hook: the one whose URL is `https://api.3dprintlog.com/api/Octoprint`.
3. Turn that hook off, or delete it. Leave any other hooks you have alone.
4. Click **Save**. As when you set it up, the Webhooks plugin sometimes doesn't save the first time: refresh the OctoPrint tab and check that the hook is still off.

You can keep the Webhooks plugin installed if other hooks use it. If the 3D Print Log hook was its only one, you can uninstall it from **Settings > Plugin Manager**.

---

### Step 4: Revoke the old API key {#revoke-key}

The webhook's **API SECRET** is a 3D Print Log personal API key. If you created that key only for the webhook, delete it on the [Personal API Keys](/api-keys) page. It stops working immediately.

Only delete it if nothing else uses it. If a script or another printer signs in with the same key, deleting it stops those too. The bridge doesn't use a personal API key: pairing replaces it.

---

### How the two run side by side {#coexistence}

3D Print Log ignores a webhook event when the same printer has a live printlog-bridge connection to OctoPrint: the event's **DEVICE IDENTIFIER** is the bridge's `printer_id`, the bridge belongs to the same account as the webhook's key, and the bridge checked in during the last 15 minutes. While the bridge is **Stale**, the webhook logs the printer on its own again.

One exception: a print the webhook started before the bridge was watching is still finished by the webhook, so it isn't left as **Printing**.

The bridge doesn't turn the webhook off for you: it only reads OctoPrint's settings. While the Webhooks plugin has a hook posting to 3dprintlog.com, the bridge says so in its log, `status` and `doctor`.

---

### Staying on the webhook {#staying}

The webhook still works, and its [setup](/docs/octoprint-webhook#Setup) is still documented for printers without a bridge.
