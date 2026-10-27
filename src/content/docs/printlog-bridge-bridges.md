---
slug: printlog-bridge-bridges
title: Bridges and printers found on your network | 3D Print Log Docs
description: See every paired printlog-bridge, the printers it found on your network, and connect them to 3D Print Log in the app, with no config file to edit.
navLabel: Bridge – Bridges screen
nav: false
group: integrations
order: 49
mode: how-to
updated: 2026-10-27
related: [printlog-bridge, printlog-bridge-docker, printlog-bridge-bambu, printlog-bridge-prusalink]
---
## Bridges and printers found on your network

---

Part of the [Log prints from Klipper](/docs/printlog-bridge) guide.

A paired printlog-bridge looks for printers on its network and tells 3D Print Log what it found. On the [Bridges](/printers/bridges) screen (**Printers**, then **Bridges**) you pick which ones it logs. You don't edit a config file or restart anything: the bridge starts watching a printer within a minute of you connecting it.

**It never logs a printer you haven't connected.** On a shared network (a dorm, a makerspace, an office) it may find other people's printers too; they stay suggestions until you connect them, and you can ignore them.

### The Bridges screen {#screen}

Each bridge you paired shows up after it first checks in, which it does every few minutes. For each one you see:

- **Its name and location.** The pencil renames it ("Garage NAS") and sets a location ("Workshop"), which helps once you run more than one. Clear the name to go back to the name the bridge gave itself.
- **Online or Stale.** A bridge is stale after 15 minutes without checking in. [Troubleshooting](/docs/printlog-bridge-troubleshooting) helps when it doesn't come back.
- **Its version**, with a link when a newer one is out ([how to update](/docs/printlog-bridge#update)), whether it runs in local mode (on a Klipper printer) or remote mode (in Docker), the computer it runs on, and the networks it can see.
- **Its encryption key**, which [credentials you enter](#credentials) are encrypted to, or a **New encryption key** to [confirm](#new-key).
- **Connected in the app**: the printers you connected to it, each with the 3D Print Log printer its prints go to and whether its credentials are set.
- **Found on your network**: printers it found that you haven't connected or ignored.
- **In its config file**: printers it watches from `printlog-bridge.cfg`.
- **Ignored**: printers you asked not to see again.

To unpair a bridge, revoke it under **Paired devices** in [Settings](/settings). That deletes its list of connected printers too; the prints it logged are kept.

### How it finds printers {#discovery}

All the time, and cheaply, the bridge asks the network every few minutes for Klipper printers that announce themselves (Moonraker's `[zeroconf]`) and for PrusaLink printers, and it listens for Bambu Lab printers' announcements. It reports only printers it recognizes, never any other device on your network.

**Scan now** goes further: the bridge checks every address on its networks for a Klipper printer, the way `printlog-bridge discover` does. A scan looks like a port scan to network security tools, so it only runs when you ask. The bridge picks the request up within a minute; the screen shows **Scanning…** until it reports back.

#### Docker and host networking {#host-network}

Finding printers needs the host's network. Printers announce themselves with multicast and broadcast, which don't reach a container on Docker's default network. Give the container `network_mode: host` (the [Docker guide](/docs/printlog-bridge-docker#setup-compose) does), use Unraid's host networking, or run the Home Assistant app, which is always on the host's network.

**Docker Desktop** (Windows, macOS) can't give a container the host's network this way. The bridge works there, but it can't find printers: add them [by address](#by-address) instead.

#### Not seeing a printer? {#not-found}

- Tap **Scan now**, and wait for it to finish.
- Check it's on: Moonraker's `[zeroconf]` for a Klipper printer that isn't found until a scan, PrusaLink turned on for a Prusa, LAN Only Mode for a Bambu Lab printer.
- On another network (a printer VLAN), or with a bridge in Docker Desktop, [add it by address](#by-address).
- Check you didn't ignore it: open **Ignored** and choose **Unignore**.
- OctoPrint and Elegoo (SDCP) printers aren't found yet: the bridge can't log them yet.

### Connect a printer {#connect}

Choose **Connect** next to a printer under **Found on your network**, then pick which of your 3D Print Log printers its prints go to:

- **One you already have.** Printers no bridge watches are listed first. When the bridge reported the model and you have exactly one free printer of that model, it's already picked.
- **A new one.** **New printer** opens the quick add with the model and name the printer reported filled in, from the printer catalog when it knows the model.

Then choose **Connect**. A printer can be watched by one bridge at a time; if another of your bridges already watches it, the screen says which one.

#### A printer it can't find: add it by address {#by-address}

**Add by address** connects a printer the bridge can't find by itself. Enter its type (Klipper, Bambu Lab or PrusaLink), its IP address or local name (`192.168.1.60`, `mk4.local`), and, for a Bambu Lab printer, its serial number (on its sticker, or in Bambu Studio's device list). Leave the port empty for the usual one. The address must be on your local network. Give the printer a fixed address in your router so it stays right.

#### Access codes and passwords {#credentials}

A Bambu Lab printer needs its access code and a PrusaLink printer its password (or an API key), an OctoPrint server its API key, and a Klipper printer whose Moonraker uses `[authorization]` an API key. After you connect one, the app asks for it. Later, choose **Access code** (or **Password**, or **Credentials**) next to the connected printer to set, replace or clear it.

**What you type is encrypted in your browser, to your bridge's own key, before it is sent.** 3D Print Log stores and forwards only the encrypted value and can't read it; only that bridge can. Each value is locked to its bridge, printer and field, so it can't be moved to another printer or another bridge. The app never shows a credential again after you save it: to change one, type the new value.

Above the fields, the app shows the [fingerprint](#encryption-key) of the key it encrypts to. Next to each field it shows whether it's set, and what the bridge reported, in plain words:

- **The bridge needs it and has none it can use**: enter it.
- **The printer refused it**: the printer said no. For a Bambu Lab printer, check the access code on its screen; it changes when LAN Only Mode is turned off and on.
- **The bridge couldn't decrypt it**, or **it isn't valid**: enter it again.
- **Encrypted to an old key**: the bridge's key changed since you entered it. Enter it again.

The bridge picks a new value up within a minute.

##### The config file instead {#credentials-config}

A bridge without an encryption key (a release from before this, or one without its `cryptography` package) can't take credentials from the app. The app then shows a section to add to the bridge's config file, `printlog-bridge.cfg` (in Docker, in the bridge's data folder), with the printer's number:

```
[app_printer 7]
access_code = 12345678
```

Put the printer's real access code in place of the example. A PrusaLink printer takes `password = …` instead (and `username = …` when it isn't `maker`), and a Klipper printer `moonraker_api_key = …`. Save the file and the bridge starts watching within a few seconds, with no restart.

**A value in the config file wins** over one entered in the app, so you can keep using the file if you prefer. `printlog-bridge status` says which one the bridge uses. The bridge doesn't report a problem with a value from the file, so the app may show a credential as set while the printer uses the file's.

### The bridge's encryption key {#encryption-key}

Each bridge makes its own encryption key and keeps it on the device. Its card on the Bridges screen shows the key's **fingerprint**, the first 16 characters in groups of four, such as `aed0 3e9a 8282 33b2`. The app computes it in your browser from the key it actually encrypts to.

On the bridge, `printlog-bridge status` (in Docker, `docker exec printlog-bridge printlog-bridge status`) shows the same fingerprint, and so does its log. **If they match, what you enter goes to your bridge and nobody else.** If they don't, don't enter anything, and [contact us](/docs/contact).

#### A new key {#new-key}

A bridge you paired before this release reports its key after you update it, and a bridge that lost its data folder, or ran `printlog-bridge rotate-key`, reports a new one. 3D Print Log doesn't use a new key until you confirm it: its card says **New encryption key** with the current and new fingerprints.

1. On the bridge, run `printlog-bridge status`, or look for its encryption key in its log.
2. If it shows the same new fingerprint, choose **The keys match: confirm**.
3. Enter the printers' credentials again. The ones you entered for the old key stop working, because the bridge can't read them.

If you don't recognize the new key, leave it unconfirmed: nothing is sent to it. A key that keeps changing (more than five times in a day) is held, and the card warns you, because a bridge doesn't do that by itself: someone else may have its device token. Check the bridge, and if in doubt, revoke it under **Paired devices** in [Settings](/settings), then pair it again.

### Printers in the config file {#config-file}

Printers you set up in `printlog-bridge.cfg` keep working, and show as **managed by the config file**. The app can't change them: edit the file. If you also connected the same printer in the app, the config file wins, and the screen offers to remove the app's entry. The same goes for an `[app_printer]` section's [credentials](#credentials-config).

### Disconnect or ignore {#disconnect}

**Disconnect** stops the bridge watching a printer within a minute. Its prints, and its connection on the printer's page, are kept, and you can connect it again at any time.

**Ignore** hides a printer you'll never log, such as a neighbor's. **Unignore** brings it back under **Found on your network**.

### More than one bridge {#several}

Each bridge has its own card, with what it found on its own network: a second house, a workshop, or a printer VLAN the first bridge can't reach. A printer's page says which bridge watches it under **Connections**.

A printer can have one bridge at a time, so two bridges never log the same print twice. To move a printer to another bridge, disconnect it from the first, then connect it on the second. A one-step move is planned.
