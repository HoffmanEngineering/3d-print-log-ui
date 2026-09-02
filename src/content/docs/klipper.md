---
slug: klipper
title: Klipper & Moonraker | 3D Print Log Docs
description: Automatically log prints from Klipper using Moonraker webhooks. Configure your printer to send completed prints to 3D Print Log.
navLabel: Log prints from Klipper
group: integrations
order: 50
mode: how-to
updated: 2026-09-02
related: [prints]
---

## Klipper/Moonraker Notifier

---

3D Print Log can receive print information from <a rel="noreferrer noopener"
target="_blank" href="https://www.klipper3d.org/" >Klipper</a >/<a
rel="noreferrer noopener" target="_blank"
href="https://moonraker.readthedocs.io/en/latest/" >Moonraker</a >, and
automatically create a new Print when a print starts, and update the print when
it finishes. It uses moonraker's built in **notifier** component, so no
additional plugins are required, just a small configuration change.

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

- Requires Moonraker to be installed with Klipper. See the <a rel="noreferrer noopener" target="_blank" href="https://moonraker.readthedocs.io/en/latest/" >Moonraker documention</a > for installation instructions.
- Moonraker does not report the estimated print times using the notifier plugin when a print is started, so no end time will be calculated when the print is first started.
- The Moonraker does not analyze print settings, so no print settings from the slicer will be automatically recorded in the Notes section.

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
          by clicking on your User Profile Picture at the top-left, and
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
      <!-- <img
          class="fade-in"
          [ngStyle.lt-md]="{
            display: 'block',
            'max-width': '90%',
            'margin-left': 'auto',
            'margin-right': 'auto'
          }"
          alt="Example of Filament Adjustments on the Filament Edit Screen"
          src="./assets/docs-filaments-adjustment-example_f4b56af8f6a098.png"
        /> -->
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
      <!-- <img
          class="fade-in"
          [ngStyle.lt-md]="{
            display: 'block',
            'max-width': '90%',
            'margin-left': 'auto',
            'margin-right': 'auto'
          }"
          alt="Example of Filament Adjustments on the Filament Edit Screen"
          src="./assets/docs-filaments-adjustment-example_f4b56af8f6a098.png"
        /> -->
    </div>
  </div>

#### Step 3: Update Moonraker Configuration

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <ul>
        <li>
          If your Klipper installation has a UI such a Fluidd or Mainsail, then
          navigate to the configuration page. Otherwise, SSH into your machine
          and navigate to the config directory.
        </li>
        <li>>Find <strong>moonraker.conf</strong> and edit it.</li>
        <li>
          At the bottom of your config, paste the following notifier config.
          Replace the <strong>APIKEYGOESHERE</strong> with the api key you
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

        <li>Save and restart moonraker.</li>
      </ul>
    </div>
    <div fxFlex>
      <!-- <img
        class="fade-in"
        [ngStyle.lt-md]="{
          display: 'block',
          'max-width': '90%',
          'margin-left': 'auto',
          'margin-right': 'auto'
        }"
        alt="Example of Filament Adjustments on the Filament Edit Screen"
        src="./assets/docs-filaments-adjustment-example_f4b56af8f6a098.png"
      /> -->
    </div>
  </div>

#### Step 6: Happy Printing!

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <p>
        The <strong>Moonraker Integration</strong> should now be configured.
        Happy printing!
      </p>
    </div>

    <div fxFlex>
      <!-- <img
          class="fade-in"
          [ngStyle.lt-md]="{
            display: 'block',
            'max-width': '90%',
            'margin-left': 'auto',
            'margin-right': 'auto'
          }"
          alt="Example of Filament Adjustments on the Filament Edit Screen"
          src="./assets/docs-filaments-adjustment-example_f4b56af8f6a098.png"
        /> -->
    </div>
  </div>

---

### Troubleshooting

If the notifier does not seem to be working, you can check the logs in the
moonraker.log file for **NotifyJSON**. That can point you in the right
direction, if your moonraker is having trouble reaching 3D Print log.

If you need further help, please contact us through the [Feedback](/feedback)
and we'll be happy to help.
