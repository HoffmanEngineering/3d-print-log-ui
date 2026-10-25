---
slug: home-assistant
title: 3D Print Log for Home Assistant | 3D Print Log Docs
description: Bring your printers, prints, loaded filament, maintenance and account totals into Home Assistant with the 3D Print Log integration, and build automations on print events.
navLabel: Home Assistant integration
group: integrations
order: 56
mode: how-to
updated: 2026-10-25
related: [home-assistant-spoolman, klipper-spoolman, printlog-bridge, printers, api]
---

## 3D Print Log for Home Assistant

---

The 3D Print Log integration for Home Assistant brings your printers, prints, loaded filament, maintenance and account totals into Home Assistant, so you can build dashboards and automations on them. It's in the default [HACS](https://hacs.xyz) (Home Assistant Community Store) list, so you install it from there. The source is on GitHub: [HoffmanEngineering/3d-print-log-homeassistant](https://github.com/HoffmanEngineering/3d-print-log-homeassistant).

Home Assistant only makes outgoing requests to your 3D Print Log account, so it works on a LAN-only setup with nothing exposed to the internet. Live printer state (temperatures, progress, camera) stays with your printer's own integration, such as Moonraker, OctoPrint, Bambu Lab or PrusaLink. This integration adds the records in 3D Print Log.

### This or the Spoolman integration? {#which}

- **One sensor per spool** (weight, length, location): use the community Spoolman integration, as described in [Home Assistant via Spoolman](/docs/home-assistant-spoolman).
- **Printers, prints, what's loaded in each slot, maintenance, account totals, print events and actions**: use this integration.

This integration creates no per-spool entities, so the two can run side by side without duplicates.

### What you need {#needs}

- Home Assistant 2026.10 or newer.
- A 3D Print Log account.
- [HACS](https://hacs.xyz).
- 3D Print Log API v1.18.0 or later for the extended entities (print time, last maintenance, maintenance due, "not enough filament"). On an older API the integration still works and creates fewer entities. The missing ones appear on their own once the API is updated.

### Install it {#install}

1. In HACS, search for **3D Print Log** and open it. Or [open it in HACS directly](https://my.home-assistant.io/redirect/hacs_repository/?owner=HoffmanEngineering&repository=3d-print-log-homeassistant&category=integration) from your Home Assistant.
2. Click **Download** (bottom right), then **Download** again in the dialog.
3. Restart Home Assistant (**Settings > System**, then the power button at the top right). The integration can be added only after the restart.

If the search doesn't find it (an older HACS, or a list that hasn't refreshed yet), add the repository by hand first:

1. In HACS, open the menu (top right) and choose **Custom repositories**.
2. Enter `https://github.com/HoffmanEngineering/3d-print-log-homeassistant`, choose the type **Integration**, click **Add** and close the dialog. This only adds the repository to HACS. Nothing is installed yet.
3. Continue with the search and download steps above.

### Create an API key {#api-key}

In 3D Print Log, open **Personal API Keys** from your profile picture (top right), click **Create new API Key**, enter the description **Home Assistant** and submit. Copy the key. It is shown only once.

Use a dedicated key. You can revoke it in 3D Print Log at any time without affecting anything else. For more on keys, see the [API](/docs/api) guide.

### Configure it {#configure}

1. In Home Assistant, go to **Settings > Devices & services > Add integration**.
2. Choose **3D Print Log** and paste the key.
3. Leave the API URL at its default unless you run your own API.

If the key is rejected later, Home Assistant starts a reauthentication flow. To change how often it checks for new data, open **Settings > Devices & services > 3D Print Log > Configure**. The update interval is 15 to 300 seconds, 30 by default.

### What you get {#entities}

Each printer is a device, and your account is a separate service device. Slots are numbered from 1, so Slot 1 is the first tool (T0).

| Entity | What it shows |
| --- | --- |
| Connection | Whether the printer's connector reports online |
| Printing | On while a print is in progress |
| Current print | The title of the print in progress, with its source and a link |
| Print started, Print estimated end | Timestamps for the current print |
| Last print result | `success`, `failed`, `canceled` or `partial_success` |
| Slot N filament | The spool loaded in slot N, with material and color |
| Slot N remaining | Grams left on the spool in slot N |
| Slot N not enough filament | On when the running print needs more than the spool has left |
| Maintenance due, Last maintenance | Open maintenance items and the newest completed one |
| Print time | All-time print time on the printer |
| Print | An event entity that fires for each print event |
| Prints this month, Grams this month, Unread notifications | Account totals |

The README lists every attribute: [Entities](https://github.com/HoffmanEngineering/3d-print-log-homeassistant#entities).

### Events {#events}

The integration fires an event when a print starts and when it ends. It detects them by comparing each update with the one before it.

| Status | Event |
| --- | --- |
| Started | `printlog_print_started` |
| Succeeded | `printlog_print_finished` |
| Failed, canceled or partly succeeded | `printlog_print_failed` |

Each event carries the printer, the print's title and status, its start and finish times, and a link to it. This automation sends a notification when a print finishes on one printer:

```angular-html
<pre><code>triggers:
  - trigger: event
    event_type: printlog_print_finished
    event_data:
      printer_id: 101
actions:
  - action: notify.mobile_app_phone
    data:
      message: "&#123;<span>&#123;</span> trigger.event.data.title &#125;&#125; is done"</code></pre>
```

Each printer's **Print** event entity fires at the same time, if you prefer a state trigger. The README has the full payload and an example for it.

Because events come from comparing updates, a print shorter than the update interval may fire only its finish event. If two prints on one printer finish between two updates, only the later one is seen. The README lists all the [limits](https://github.com/HoffmanEngineering/3d-print-log-homeassistant#limits).

### Actions {#actions}

Each action takes an optional `config_entry_id`, needed only if you have more than one 3D Print Log account set up.

- `printlog.adjust_remaining` adds to or removes from a spool's remaining amount, in grams, millimeters or milliliters. Choose the spool by entity, spool id or spool number. It returns the amount before and after.
- `printlog.set_spool_active` marks a spool active or inactive.
- `printlog.log_maintenance` records a completed maintenance entry on a printer.

```yaml
action: printlog.adjust_remaining
data:
  entity_id: sensor.snapmaker_u1_slot_1_remaining
  amount: -12.5
  unit: g
  notes: Purge before the print
```

### Privacy and diagnostics {#privacy}

The API key is sent only in a request header to the API URL you configured. It is never put in a URL, an entity id or a log line.

The diagnostics you can download from the integration's page redact the API key, your display name, and all printer names, print titles, spool names, notes, maintenance text, storage locations and URLs. Printer make and model, materials and time zone stay visible to help with support. The last update error is kept and may include the server's error message.

### Troubleshooting {#troubleshooting}

- **3D Print Log isn't listed under Add integration.** Finding it in HACS doesn't install it. Open 3D Print Log in HACS, click **Download**, then restart Home Assistant. See [Install it](#install).
- **Home Assistant says the key was rejected.** The key was revoked or mistyped. Create a new key as described in [Create an API key](#api-key), then follow the reauthentication prompt.
- **Some entities are missing.** The extended entities need API v1.18.0 or later. If you run your own API, update it and they appear on their own.
- **A print didn't fire an event.** Events come from comparing updates, so very short prints and prints that finish together can be missed. See [Events](#events).
- **An automation on the Print event entity fires when you reload.** Add `not_from: [unavailable, unknown]` to the state trigger, as the README's example does.
- **Something else is wrong.** Download the diagnostics from the integration's page and report the problem at [github.com/HoffmanEngineering/3d-print-log-homeassistant/issues](https://github.com/HoffmanEngineering/3d-print-log-homeassistant/issues). The diagnostics contain no API key, names, titles or notes.
