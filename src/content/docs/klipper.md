---
slug: klipper
title: Klipper & Moonraker | 3D Print Log Docs
description: Automatically log prints from Klipper using Moonraker webhooks. Configure your printer to send completed prints to 3D Print Log.
navLabel: Klipper notifier (legacy)
nav: false
group: integrations
order: 50
mode: how-to
updated: 2026-10-14
related: [printlog-bridge, klipper-spoolman, switch-from-notifier, prints]
---

## Klipper/Moonraker Notifier

---

Part of the [Log prints from Klipper](/docs/printlog-bridge) guide.

3D Print Log can receive print information from <a rel="noreferrer noopener"
target="_blank" href="https://www.klipper3d.org/" >Klipper</a >/<a
rel="noreferrer noopener" target="_blank"
href="https://moonraker.readthedocs.io/en/latest/" >Moonraker</a >, and
automatically create a new Print when a print starts, and update the print when
it finishes. It uses Moonraker's built-in **notifier** component, so no
additional plugins are required, just a small configuration change.

<doc-callout kind="note" heading="Legacy: use printlog-bridge for new setups">
  <p>
    The notifier is the older way to log Klipper prints. For a new printer, use
    <a routerLink="/docs/printlog-bridge">printlog-bridge</a> instead: it logs
    the real outcome, filament per tool linked to your spools, the slicer's
    thumbnail and a webcam snapshot. It runs on the printer itself, or in
    Docker on another computer on your network.
  </p>
  <p>
    Already using the notifier? It keeps working, and so does its address,
    <code>/api/Moonraker/notifier</code>. When you're ready,
    <a routerLink="/docs/switch-from-notifier">switch from the notifier</a>:
    install the bridge first and remove the notifier later. The steps below
    stay here for printers that already use it.
  </p>
</doc-callout>

---

### Klipper integrations compared {#compare}

There are three ways to connect a Klipper printer to 3D Print Log. They do different jobs, and you can combine them.

| | Moonraker notifier (this page) | [printlog-bridge](/docs/printlog-bridge) | [Spoolman](/docs/klipper-spoolman) |
| --- | --- | --- | --- |
| What it does | Logs prints | Logs prints | Shows your spools on the printer |
| Install | A section in `moonraker.conf` | A small program, on the printer or in Docker | A section in `moonraker.conf` |
| Print outcome | Success or Failed | The real outcome, with Klipper's message | Not logged |
| Filament used | The job's total | Per tool, linked to your spools | Not recorded yet |
| Pictures | None | Slicer thumbnail and a webcam frame | None |
| Spool pickers in Mainsail, Fluidd and KlipperScreen | No | No | Yes |
| Plan | Free | Free | 1 printer on Free, unlimited on Pro |

For a new printer, use printlog-bridge to log prints, and add Spoolman if you want to pick spools on the printer.

---

### Features:

Using the Klipper integration, when you start a print, it will immediately save
a new Print in 3D Print Log with a status of "Printing", which you can view [on
your Print List](/prints).

When a print finishes, the status inside of 3D Print Log will change to
**Success** and the print will be updated with print times and filament usage.

If a print is canceled, 3D Print Log will change the status to **Failed**. The
Print Time and Filament Usage will be updated.

---

### Limitations:

- Requires Moonraker to be installed with Klipper. See the <a rel="noreferrer noopener" target="_blank" href="https://moonraker.readthedocs.io/en/latest/" >Moonraker documentation</a > for installation instructions.
- Moonraker does not report the estimated print times through the notifier when a print is started, so no end time will be calculated when the print is first started.
- Moonraker does not analyze print settings, so no print settings from the slicer will be automatically recorded in the Notes section.

---

### Setup: {#Setup}

#### Step 1: Generate API Key on 3D Print Log

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <p>
        Moonraker will need an "API Key" to authenticate. This is how 3D Print
        Log knows what user your Moonraker is for.
      </p>
      <ul>
        <li>
          Navigate to the <a routerLink="/api-keys">Personal Api Keys</a> page
          by clicking on your User Profile Picture at the top-right, and
          selecting "Personal Api Keys".
        </li>
        <li>Click <strong>Create new API Key</strong>.</li>
        <li>Enter a new description (such as "Moonraker Key").</li>
        <li>Click <strong>Submit</strong> to generate a new key.</li>
        <li>
          Copy the new 32-character key for use in <strong>Step 3</strong>.
          <ul>
            <li>
              Note: The API Key cannot be retrieved after you leave the page, so
              copy it to a secure location, otherwise you will have to generate
              a new key.
            </li>
          </ul>
        </li>
      </ul>
    </div>
    <div fxFlex>
    </div>
  </div>

#### Step 2: Find your Printer ID Number in 3D Print Log

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <p>
        Moonraker needs to know what Printer to use in 3D Print Log. We'll need
        to find the printer's id number in 3D Print Log.
      </p>
      <ul>
        <li>Navigate to the <a routerLink="/printers">Printers</a> page.</li>
        <li>
          Find the printer you want to use, and <strong>Click</strong> on it to
          enter the Edit Details page.
        </li>
        <li>
          In your browser's URL bar, record the ID of the printer. It is the
          number after https://www.3dprintlog.com/printers/####
        </li>
        <li>Copy that ID number for use in <strong>Step 3</strong>.</li>
      </ul>
    </div>
    <div fxFlex>
    </div>
  </div>

#### Step 3: Update Moonraker Configuration

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <ul>
        <li>
          If your Klipper installation has a UI such as Fluidd or Mainsail, then
          navigate to the configuration page. Otherwise, SSH into your machine
          and navigate to the config directory.
        </li>
        <li>Find <strong>moonraker.conf</strong> and edit it.</li>
        <li>
          At the bottom of your config, paste the following notifier config.
          Replace the <strong>APIKEYGOESHERE</strong> with the API key you
          copied from step 1, and replace the
          <strong>PRINTERIDHERE</strong> with the printer id you copied from
          step 2.
          <pre>
    <code>{{'
[notifier 3d_print_log]
url: jsons://api.3dprintlog.com/api/Moonraker/notifier?+X-Api-Key=APIKEYGOESHERE
events: *
body: 
    {% set payload = {"printerId": PRINTERIDHERE} %}
    {% do payload.update({"event_name": event_name}) %}
    {% do payload.update(event_args[1]) %}
    { payload|tojson }
    '}}
</code>
</pre>
        </li>

        <li>
          The <code>+X-Api-Key=</code> part of the <code>url</code> line makes
          Moonraker send the key in an <code>X-Api-Key</code> header rather
          than in the address. Keep the <code>+</code>.
        </li>

        <li>
          Building your own sender? The request body is described in the
          <a routerLink="/docs/api" fragment="openapi">OpenAPI spec</a>.
        </li>

        <li>Save and restart Moonraker.</li>
      </ul>
    </div>
    <div fxFlex>
    </div>
  </div>

#### Step 4: Happy Printing!

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <p>
        The <strong>Moonraker Integration</strong> should now be configured.
        Happy printing!
      </p>
    </div>

    <div fxFlex>
    </div>
  </div>

---

### Troubleshooting

If the notifier does not seem to be working, you can check the logs in the
moonraker.log file for **NotifyJSON**. That can point you in the right
direction, if your Moonraker is having trouble reaching 3D Print Log.

If you need further help, please contact us through the [Feedback](/feedback)
page and we'll be happy to help.
