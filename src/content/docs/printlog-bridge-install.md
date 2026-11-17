---
slug: printlog-bridge-install
title: Install printlog-bridge on a Klipper Printer | 3D Print Log Docs
description: Install printlog-bridge on your Klipper printer's host as a systemd service, connect it to your 3D Print Log account, and check that it works.
navLabel: Bridge – install on the printer
nav: false
group: integrations
order: 43
mode: how-to
updated: 2026-10-30
related: [printlog-bridge, printlog-bridge-docker, printlog-bridge-spools, printlog-bridge-troubleshooting]
---

## Install printlog-bridge on the Printer

---

Part of the [Log prints from Klipper](/docs/printlog-bridge) guide.

In local mode, [printlog-bridge](/docs/printlog-bridge) runs on the printer's own host, next to Klipper and Moonraker: MainsailOS, FluiddPi, or any Klipper install with Moonraker. If you can't install software on the printer, or you want one bridge for several printers, [run it in Docker](/docs/printlog-bridge-docker) instead.

### Before you start {#before}

- **Python 3.9 or newer** on the printer's host. Raspberry Pi OS Bullseye and later have it.
- **SSH access as the user Klipper runs as**, such as `pi`. The installer refuses to run as root, and uses `sudo` to install the service.
- **The printer's number in 3D Print Log.** Open the printer from the [Printers](/printers) page. Its number is the end of the address: `42` in `https://www.3dprintlog.com/printers/42`.
- **Your phone, or a browser signed in to 3D Print Log**, to approve the bridge when you pair it. Or a personal API key from the [Personal API Keys](/api-keys) page. See [Connect to your account](#connect).

### Install {#install}

On the printer's host, run:

```
cd ~ && git clone https://github.com/HoffmanEngineering/printlog-bridge.git
./printlog-bridge/install.sh
```

The installer asks for an API key (what you paste isn't shown) and the printer's number. Press Enter at both to [pair the bridge](#connect) afterwards instead. It then:

- makes a virtualenv in `~/printlog-bridge-env` and installs the bridge into it;
- stores the API key, if you gave one, in `~/.local/share/printlog-bridge/api_key`, readable only by you;
- writes `~/printer_data/config/printlog-bridge.cfg`, next to `printer.cfg`, unless you already have one;
- installs and starts a `printlog-bridge` systemd service;
- adds `printlog-bridge` to `~/printer_data/moonraker.asvc`, so Mainsail and Fluidd can restart it;
- adds an `[update_manager printlog-bridge]` section to `moonraker.conf`, so updates show up in the update panel of Mainsail and Fluidd, and restarts Moonraker to load it;
- copies the spool macros to `~/printer_data/config/printlog.cfg` and adds `[include printlog.cfg]` to `printer.cfg`.

The installer doesn't restart Klipper, since that would end a print. Restart it yourself when the printer is idle (`FIRMWARE_RESTART` in the console) to load the [spool macros](/docs/printlog-bridge-spools).

Running `install.sh` again is safe. Its options:

| Option | What it does |
| --- | --- |
| `--printer-data DIR` | Moonraker's data folder, when it isn't `~/printer_data` |
| `--printer-id N` | The printer's number in 3D Print Log, so it isn't asked for |
| `--venv DIR` | Where to make the virtualenv (default `~/printlog-bridge-env`) |
| `--moonraker-service NAME` | Moonraker's systemd service, when it isn't `moonraker` |
| `--no-macros` | Don't install the spool macros or include them from `printer.cfg` |
| `--yes` | Ask nothing. Fill in the config afterwards. |

`install.sh --help` lists them too. The installer sets up one Klipper instance per host. To move it to another `printer_data` folder, uninstall it first.

### Connect to your account {#connect}

The bridge needs to sign in to your account and to know which printer in 3D Print Log its prints belong to. Pairing does both.

1. Pair it, as yourself rather than with `sudo`:

  ```
  ~/printlog-bridge-env/bin/printlog-bridge pair
  ```

  It shows a QR code, an address and a short code. Scan the QR code with your phone (or open the address and type the code), sign in to 3D Print Log and approve the bridge. The bridge stores its device token in `~/.local/share/printlog-bridge/device_token`, readable only by you.

2. For a printer without a `printer_id` in `printlog-bridge.cfg`, `pair` then lists your printers. Pick one, or create a new one filled in from the printer (its host name, kinematics and extruder count), and `pair` writes its number into the config. `--name` sets the name 3D Print Log shows for the bridge (`printlog-bridge on <host name>` by default).
3. Restart printlog-bridge from the services menu in Mainsail or Fluidd, or run `sudo systemctl restart printlog-bridge`.

The bridge then shows up under **Paired devices** in [Settings](/settings), where you can revoke it. [Signing in](/docs/printlog-bridge#account) says what its token can do and what revoking does. To pair it again, run `pair` again.

#### With an API key instead {#api-key}

For a scripted install, or when `pair` says pairing isn't available, the bridge signs in with a [personal API key](/docs/api#api-keys):

1. Create a key on the [Personal API Keys](/api-keys) page and copy it. Give each bridge its own key, so you can revoke one without stopping the others.
2. If you skipped the key during the install, store it now, and paste it when asked:

  ```
  ~/printlog-bridge-env/bin/printlog-bridge store-key
  ```

  `store-key` keeps the key in `~/.local/share/printlog-bridge/api_key`, readable only by you, and replaces any key already there.

3. If you skipped the printer's number, set `printer_id` in `printlog-bridge.cfg`. Mainsail and Fluidd can edit the file (under **Machine**), or edit it over SSH:

  ```
  [printer voron]
  printer_id = 42
  socket = /home/pi/printer_data/comms/moonraker.sock
  ```

4. Restart printlog-bridge from the services menu in Mainsail or Fluidd, or run `sudo systemctl restart printlog-bridge`.

While its config needs fixing (no device token or key, no `printer_id`), the service stops and waits for you rather than restarting itself.

<doc-callout kind="warning" heading="Keep the key out of printlog-bridge.cfg">
  <p>
    Moonraker lets anyone who can open Mainsail or Fluidd download every file in
    Klipper's config folder, including <code>printlog-bridge.cfg</code>. An
    <code>api_key</code> line there still works, but <code>doctor</code> warns
    about it. Run <code>store-key</code> to move it: it writes the key file and
    empties the line in the config.
  </p>
</doc-callout>

The bridge looks for the key in this order: the `PRINTLOG_API_KEY` environment variable, then the key file, then `api_key` in the `[bridge]` section. Once the bridge is paired, its device token wins over any key: it never sends both.

### Check it {#check}

When both a key and the printer's number were given, the installer checks the setup with `doctor` before it finishes. Run the same check any time:

```
~/printlog-bridge-env/bin/printlog-bridge doctor
~/printlog-bridge-env/bin/printlog-bridge status
```

`doctor` checks the config, the device token or API key, the computer's clock and the printer, and says what to fix. `status` shows what the running bridge is doing. [Troubleshooting](/docs/printlog-bridge-troubleshooting#doctor) explains both.

In 3D Print Log, the printer's **Edit Page** now lists the bridge under [Connections](/docs/printers#connections). Start a print and it shows up on your [Print List](/prints) as **Printing**.

### Config file {#config}

The installer writes `~/printer_data/config/printlog-bridge.cfg`, with one `[printer <name>]` section named after the host. Each printer is a section, so one bridge can watch several. After a change, restart printlog-bridge.

| Section | Option | Default | What it is |
| --- | --- | --- | --- |
| `[bridge]` | `api_url` | `https://api.3dprintlog.com` | 3D Print Log's API. Must be `https`. |
| `[bridge]` | `state_dir` | `~/.local/share/printlog-bridge` | Where the key file, the outbox, the log and the status live. `PRINTLOG_BRIDGE_STATE_DIR` sets it when this doesn't. |
| `[bridge]` | `trace` | `false` | Record every Moonraker message, to [report a problem](/docs/printlog-bridge-troubleshooting#trace). |
| `[bridge]` | `allow_http_on_lan` | `false` | Allow plain `http` to a development API on your network. See [the Docker page](/docs/printlog-bridge-docker#allow-http-on-lan). |
| `[bridge]` | `api_key` | | Works, but use `store-key` instead. |
| `[bridge]` | `slicer_settings` | `true` | `false` never reads the G-code file, so no [slicer settings](/docs/printlog-bridge#slicer-settings) are recorded. Can also go in a printer's section. |
| `[printer <name>]` | `printer_id` | | The printer's number in 3D Print Log. Required. |
| `[printer <name>]` | `socket` | `~/printer_data/comms/moonraker.sock` | Moonraker's socket, in local mode. |
| `[printer <name>]` | `url` | | Moonraker's address, such as `http://192.168.1.50:7125`, in remote mode. Set `url` or `socket`, not both. |
| `[printer <name>]` | `moonraker_api_key` | | Remote mode only, when Moonraker has `[authorization]` on and doesn't trust the bridge's computer. |
| `[printer <name>]` | `snapshots` | `true` | `false` never asks the webcam for anything. |
| `[printer <name>]` | `adapter` | `moonraker` | The kind of printer: `moonraker`, or `bambu`, `prusalink`, `octoprint`, `sdcp`, `duet`, `flashforge` and `anycubic` for the printers in [Bambu Lab printers](/docs/printlog-bridge-bambu), [Prusa printers](/docs/printlog-bridge-prusalink), [OctoPrint](/docs/printlog-bridge-octoprint), [Elegoo Centauri Carbon](/docs/printlog-bridge-sdcp), [Duet](/docs/printlog-bridge-duet), [FlashForge](/docs/printlog-bridge-flashforge) and [Anycubic](/docs/printlog-bridge-anycubic), which have options of their own. |

The bridge looks for its config in this order: `--config` on the command line, the `PRINTLOG_BRIDGE_CONFIG` environment variable, `~/printer_data/config/printlog-bridge.cfg`, then `~/.config/printlog-bridge/printlog-bridge.cfg`. Every option is described in [printlog-bridge.example.cfg](https://github.com/HoffmanEngineering/printlog-bridge/blob/main/printlog-bridge.example.cfg).

### Update {#update}

Updates show up as **printlog-bridge** in the update panel of Mainsail and Fluidd, next to Klipper and Moonraker. When a new version is out, the printer's Connections in 3D Print Log say so too. See [Update](/docs/printlog-bridge#update).

### Uninstall {#uninstall}

```
./printlog-bridge/uninstall.sh
```

It removes the service and the virtualenv, and puts `moonraker.conf`, `moonraker.asvc` and `printer.cfg` back exactly as they were. It removes `printlog.cfg` too, unless you changed it. Your config and the state directory, including any prints not yet logged, are kept for a reinstall. Add `--purge` to remove those as well.
