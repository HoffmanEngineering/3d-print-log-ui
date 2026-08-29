---
slug: octoprint-webhook
title: OctoPrint Webhook | 3D Print Log Docs
description: Connect OctoPrint to 3D Print Log with a webhook so finished prints are logged automatically. Step-by-step configuration guide.
navLabel: Octoprint Webhook
group: integrations
order: 40
mode: how-to
updated: 2026-08-29
related: [prints]
---

## Octoprint Integration via Webhook

---

3D Print Log can retrieve information from Octoprint in order to updating print
status, print time, and filament usage. This is done using the <a
href="https://plugins.octoprint.org/plugins/webhooks/" rel="noreferrer noopener"
target="_blank" >OctoPrint-Webhooks</a > plugin by <a
href="https://plugins.octoprint.org/by_author/#blane-townsend" rel="noreferrer
noopener" target="_blank" >Blane Townsend</a >.

Note: Users have reported the Webhook Plugin settings sometimes do not save
correctly within OctoPrint. Refreshing the OctoPrint tab, re-entering the
settings and saving again might be necessary. If you run into issues with the
integration working, see the **Troubleshooting** steps below.

---

### Features:

Using the OctoPrint Integration, when you start a print in OctoPrint, it should
immediately save a new Print in 3D Print Log with a status of "Printing", which
you can view [on your Print List](/prints). The new print contains estimated
print times and filament usage from OctoPrint.

When a print finishes, the status inside of 3D Print Log will change to
**Success** and the print will be updated with print times, and save a picture
(if you have a webcam configured in OctoPrint). The Print Time and Filament
Usage will be updated.

If a print is canceled in OctoPrint, 3D Print Log will change the status to
"Failed" and save a picture (if you have a webcam configured in OctoPrint). The
Print Time and Filament Usage will be updated.

---

### Limitations:

There are a handful of limitations from using the OctoPrint Webhook plugin. If
you are an OctoPrint Plugin Developer and would like to help creating a custom
3D Print Log Plugin, please [Send a Feedback, we are looking for
help!](/feedback)

- OctoPrint does not keep track of actual filament usage, so we cannot save actual filament usage on completion/failures. 3D Print Log can only record the initial estimated usage.
- The OctoPrint does not analyze print settings, so no print settings from the slicer will be automatically recorded in the Notes section.

---

### Setup: {#Setup}

<youtube-player videoId="E3kHsxSkBAw"></youtube-player>

#### Step 1: Download OctoPrint-Webhook Plugin

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <ul>
        <li>
          On your OctoPrint, navigate to Settings -> Plugin Manager, and click
          the <strong>"Get More.."</strong> button at the bottom.
        </li>
        <li>Search for "OctoPrint-Webhook", and install the plugin.</li>
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

#### Step 2: Generate API Key on 3D Print Log

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <p>
        OctoPrint will need an "API Key" to authenticate. This is how 3D Print
        Log knows what user your OctoPrint is for.
      </p>
      <ul>
        <li>
          Navigate to the <a routerLink="/api-keys">Personal Api Keys</a> page
          by clicking on your User Profile Picture at the top-left, and
          selecting "Personal Api Keys".
        </li>
        <li>Click <strong>Create new API Key</strong>.</li>
        <li>Enter a new description (such a "Octoprint Webhook Key").</li>
        <li>Click <strong>Submit</strong> to generate a new key.</li>
        <li>
          Copy the new 32-character key for use in <strong>Step 5</strong>.
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

#### Step 3: Find your Printer ID Number in 3D Print Log

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <p>
        OctoPrint needs to know what Printer to use in 3D Print Log. We'll need
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
        <li>Copy that ID number for use in <strong>Step 5</strong>.</li>
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

#### Step 4: Add new Webhook in OctoPrint Webhook Plugin

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <ul>
        <li>
          On your OctoPrint, navigate to Settings and find the Webhooks menu
          under Plugins.
        </li>
        <li>Click <strong>New Hook</strong>.</li>
        <li>
          Under URL, enter
          <pre><code>https://api.3dprintlog.com/api/Octoprint</code></pre>
        </li>
        <li>
          Scroll Down and expand the
          <strong>Webhook Parameters</strong> section.
          <ul>
            <li>
              Change <strong>HTTP METHOD</strong> to <strong>POST</strong>.
            </li>
            <li>
              Change <strong>CONTENT TYPE</strong> to
              <strong>x-www-form-urlencoded</strong>.
            </li>
            <li>
              Change <strong>API SECRET</strong> to the
              <strong>Personal Api Key</strong> you created in Step 2.
            </li>
            <li>
              Change <strong>DEVICE IDENTIFIER</strong> to the
              <strong>Printer ID Number</strong> from Step 3.
            </li>
          </ul>
        </li>
        <li>
          Scroll Down and expand the <strong>Advanced</strong> section.
          <ul>
            <li>
              Change <strong>HEADERS</strong> to
              <pre>
    <code>
&#123;
    "Content-Type": "application/json",
    "X-Api-Key": "&#64;apiSecret"
&#125;
</code>
</pre>
            </li>
            <li>
              Change <strong>DATA</strong> to
              <pre>
    <code>
&#123;
    "deviceIdentifier":"&#64;deviceIdentifier",
    "apiSecret":"&#64;apiSecret",
    "topic":"&#64;topic",
    "message":"&#64;message",
    "extra":"&#64;extra",
    "state": "&#64;state",
    "job": "&#64;job",
    "progress": "&#64;progress",
    "currentZ": "&#64;currentZ",
    "offsets": "&#64;offsets",
    "meta": "&#64;meta",
    "currentTime": "&#64;currentTime",
    "snapshot": "&#64;snapshot"
&#125;
</code>
</pre>
            </li>
          </ul>
        </li>
        <li>Click <strong>Save</strong> to save the settings.</li>
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

#### Step 5: Send a Test Message

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <ul>
        <li>
          On your OctoPrint, navigate to Settings and find the Webhooks menu
          under Plugins.
        </li>
        <li>
          With the 3D Print Log webhook selected, scroll to the
          <strong>Testing</strong> section
        </li>
        <li>
          Select the TEST EVENT of <strong>"Print Started"</strong> and click
          the <strong>"Send Test Webhook"</strong> button.
        </li>
        <li>
          If everything is setup successfully, you should see a
          <strong
            >"Response: Webhook Connection to 3D Print Log is Good!"</strong
          >
          message appear, with the correct printer name.
        </li>
        <li>If an error message is returned, see Troubleshooting below.</li>
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
        The <strong>OctoPrint Webhook</strong> plugin should now be configured.
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

These steps can help you resolve issues related to the OctoPrint Webhook Plugin.

#### Error Message: Invalid API Response: Invalid API Key

If you receive a **Invalid API Response: Invalid API Key** when sending a Test
Webhook event, this indicates your API Key is not valid:

1. Refresh OctoPrint in your browser, and check that the OctoPrint Webhook plugin has the correct api key saved under **Webhook Parameters -> API SECRET**.
2. If the WebHook Plugin didn't save the API Secret, enter it and try to save again.
3. Create a new Api Key in 3D Print Log. Follow Setup Step 2 and try a new API Key.

#### Error Message: Invalid API Response: Printer does not belong to current user. Please check DeviceIdentifier.

If you receive a **Invalid API Response: Printer does not belong to current
user. Please check DeviceIdentifier.** when sending a Test Webhook event, this
indicates your DEVICE IDENTIFIER is not correct.

1. Refresh OctoPrint in your browser, and check that the OctoPrint Webhook plugin has the correct Printer ID saved under **Webhook Parameters -> DEVICE IDENTIFIER**.
2. If the WebHook Plugin didn't save the DEVICE IDENTIFIER, enter it and try to save again.
3. The Printer ID should just be a number. Double check that the ID number matches your printer's ID from 3D Print Log. Repeat Setup Step 3 to get the correct Printer ID.

#### Error Message: Invalid API Response: No Printer Id found in webhook's DeviceIdentifier.

If you receive a **Invalid API Response: No Printer Id found in webhook's
DeviceIdentifier.** when sending a Test Webhook event, this indicates your
DEVICE IDENTIFIER is not correct.

1. Refresh OctoPrint in your browser, and check that the OctoPrint Webhook plugin has the correct Printer ID saved under **Webhook Parameters -> DEVICE IDENTIFIER**.
2. If the WebHook Plugin didn't save the DEVICE IDENTIFIER, enter it and try to save again.
3. The Printer ID should just be a number. Double check that the ID number matches your printer's ID from 3D Print Log. Repeat Setup Step 3 to get the correct Printer ID.
