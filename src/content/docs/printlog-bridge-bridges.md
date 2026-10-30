---
slug: printlog-bridge-bridges
title: Bridges and printers found on your network | 3D Print Log Docs
description: See every paired printlog-bridge, the printers it found on your network, and connect them to 3D Print Log in the app, with no config file to edit.
navLabel: Bridge – Bridges screen
nav: false
group: integrations
order: 49
mode: how-to
updated: 2026-10-30
related: [printlog-bridge, printlog-bridge-docker, printlog-bridge-bambu, printlog-bridge-prusalink, printlog-bridge-octoprint, printlog-bridge-sdcp, printlog-bridge-duet, printlog-bridge-flashforge, printlog-bridge-anycubic]
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
- **Connected in the app**: the printers you connected to it, each with the 3D Print Log printer its prints go to and whether its credentials are set. With more than one bridge, **Move** hands a printer to [another bridge](#move).
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
- Check it's on: Moonraker's `[zeroconf]` for a Klipper printer that isn't found until a scan, PrusaLink turned on for a Prusa, LAN Only Mode for a Bambu Lab printer, LAN-only mode for a FlashForge, LAN mode for an Anycubic.
- Elegoo, FlashForge and Anycubic printers only answer a scan: tap **Scan now**. A Duet is found only when it announces itself (one on Ethernet does; one on Wi-Fi or behind a Raspberry Pi may not).
- On another network (a printer VLAN), or with a bridge in Docker Desktop, [add it by address](#by-address).
- Check you didn't ignore it: open **Ignored** and choose **Unignore**.

### Connect a printer {#connect}

Choose **Connect** next to a printer under **Found on your network**, then pick which of your 3D Print Log printers its prints go to:

- **One you already have.** Printers no bridge watches are listed first. When the bridge reported the model and you have exactly one free printer of that model, it's already picked.
- **A new one.** **New printer** opens the quick add with the model and name the printer reported filled in, from the printer catalog when it knows the model.

Then choose **Connect**. A printer can be watched by one bridge at a time; if another of your bridges already watches it, the screen says which one and offers **Move it to** this bridge instead (see [Move a printer to another bridge](#move)).

#### A printer it can't find: add it by address {#by-address}

**Add by address** connects a printer the bridge can't find by itself. Enter its type (Klipper, Bambu Lab, PrusaLink, OctoPrint, Elegoo Centauri Carbon, Duet, FlashForge or Anycubic), its IP address or local name (`192.168.1.60`, `mk4.local`), and, for a Bambu Lab printer, its serial number (on its sticker, or in Bambu Studio's device list). A FlashForge printer's serial isn't needed: the bridge asks the printer for it. Leave the port empty for the usual one. The address must be on your local network. Give the printer a fixed address in your router so it stays right.

#### Access codes and passwords {#credentials}

A Bambu Lab printer needs its access code and a PrusaLink printer its password (or an API key), an OctoPrint server its API key, and a Klipper printer whose Moonraker uses `[authorization]` an API key. A FlashForge printer needs the check code its screen shows in LAN-only mode, and a Duet its password only when `config.g` sets one with `M551`. An Elegoo Centauri Carbon needs nothing (SDCP has no authentication), and neither does an Anycubic printer (in LAN mode it hands the bridge its own login). After you connect one that needs a credential, the app asks for it. Later, choose **Access code** (or **Password**, **Check code** or **Credentials**) next to the connected printer to set, replace or clear it. A Duet's password, like a Moonraker API key, is set that way, since the app doesn't ask for it.

**Before you enter the first one, compare the key.** Above the fields, the app shows the [fingerprint](#encryption-key) of the key it encrypts to. Run `printlog-bridge status` on the bridge and check it shows the same fingerprint. If it doesn't, don't enter anything.

**What you type is encrypted in your browser, to that key, before it is sent.** When the fingerprint you compared matches the bridge's, only your bridge can read it: 3D Print Log stores and forwards only the encrypted value and can't. Each value is locked to its bridge, printer and field, so it can't be moved to another printer or another bridge. The app never shows a credential again after you save it: to change one, type the new value.

Next to each field the app shows whether it's set, and what the bridge reported, in plain words:

- **The bridge needs it and has none it can use**: enter it.
- **The printer refused it**: the printer said no. For a Bambu Lab printer, check the access code on its screen; it changes when LAN Only Mode is turned off and on.
- **The bridge couldn't decrypt it**, or **it isn't valid**: enter it again.
- **Encrypted to an old key**: the bridge's key changed since you entered it. Enter it again.
- **Encrypted to a different key than this one**: compare the key with the bridge first, then enter it again.

The bridge picks a new value up within a minute.

##### The config file instead {#credentials-config}

A bridge without an encryption key (a release from before this, or one without its `cryptography` package) can't take credentials from the app. The app then shows a section to add to the bridge's config file, `printlog-bridge.cfg` (in Docker, in the bridge's data folder), with the printer's number:

```
[app_printer 7]
access_code = 12345678
```

Put the printer's real access code in place of the example. A PrusaLink printer takes `password = …` instead (and `username = …` when it isn't `maker`), an OctoPrint server `api_key = …`, and a Klipper printer `moonraker_api_key = …`. Save the file and the bridge starts watching within a few seconds, with no restart.

**A value in the config file wins** over one entered in the app, so you can keep using the file if you prefer. `printlog-bridge status` says which one the bridge uses. The bridge doesn't report a problem with a value from the file, so the app may show a credential as set while the printer uses the file's.

### The bridge's encryption key {#encryption-key}

Each bridge makes its own encryption key and keeps it on the device. Its card on the Bridges screen shows the key's **fingerprint**, the first 16 characters in groups of four, such as `aed0 3e9a 8282 33b2`. The app computes it in your browser from the key it actually encrypts to.

On the bridge, `printlog-bridge status` (in Docker, `docker exec printlog-bridge printlog-bridge status`) shows the same fingerprint, and so does its log. **If they match, what you enter goes to your bridge and nobody else.** If they don't, don't enter anything, and [contact us](/docs/contact).

This browser remembers the last key you confirmed, accepted with **It matches**, or encrypted to, for each bridge. If the bridge's key is ever different without you confirming it here, the card, the credentials and the connect step say **This bridge's key changed without your confirmation in this browser**, and the app won't take credentials until you compare it with `printlog-bridge status` and choose **It matches**. If you confirm a new key and 3D Print Log answers with a different one, the card says **3D Print Log returned a different key than the one you confirmed** instead. In another browser, or after clearing site data, there's nothing to compare yet, so compare the fingerprint again before entering anything.

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

### Running more than one bridge {#several}

One bridge can watch every printer it can reach. A second one helps when it can't: a second house or a workshop, a printer VLAN the first bridge can't see, or a makerspace next to your home setup. Pair each one as usual. Each gets its own card, with its own networks and what it found there, and its own [encryption key](#encryption-key). Name them and give them a location ("Workshop"), so you can tell them apart.

A printer is watched by **one bridge at a time**, so two bridges don't log the same print twice. A printer's page says which bridge watches it under **Connections**.

#### A printer two bridges found {#found-twice}

When two bridges find the same printer (the same serial number, mainboard or network card), it's listed once:

- **If one of your bridges already watches it**, it stays under that bridge, which says **Also found by** the other one. The other bridge's card says the printer is listed elsewhere.
- **Otherwise** it's listed under the bridge best placed to watch it: one that is online, then one with the printer's address on its own network, then the one that saw it last. **Connect** uses that bridge, and **With** another bridge's name connects it through that one instead.

A printer the bridges know only by its address (some Klipper printers) isn't grouped: the same address in two houses is two printers, so each bridge lists what it found.

#### Move a printer to another bridge {#move}

Choose **Move** next to a connected printer, or **Move to another bridge** under **Connections** on the printer's page. Pick the bridge to move it to:

- **If that bridge found the printer**, it watches it at the address it found.
- **If not**, keep the address when both bridges are on the same network, or enter the address the new bridge reaches it at.

**Its access code, password or API key moves with it, in the same step.** What you entered was encrypted to the old bridge's key, which the new bridge can't read, so the move asks for it again and encrypts it in your browser to the **new** bridge's key. Compare that key's fingerprint with `printlog-bridge status` on the new bridge first, as for [any credential](#credentials). A credential you leave empty that the printer doesn't need, such as a PrusaLink user name, isn't moved, and the app says so afterwards; enter it on the new bridge's card if the printer needs it.

The old bridge stops watching the printer within a minute, and the new one starts. Prints already logged keep their source. A printer in a bridge's config file can't be moved from the app: edit the file instead.

The new bridge needs an encryption key you've confirmed to take credentials. If it has none yet, or a new key waiting for you, the move says so: [confirm it](#new-key) or update that bridge first.

#### A print left Printing after a move {#print-left-printing}

A print that was running when you moved the printer is usually finished by the new bridge. If it can't recognize the job (a PrusaLink print that was paused, or a Bambu Lab printer that doesn't report when the job started), the new bridge logs it as a new print and the old one stays **Printing**. Open that print, choose **Edit**, set its **Status** to how it ended, and save. Delete the duplicate if there is one.

#### "Some prints may be logged twice" {#logged-twice}

A bridge's card shows this when, in the last 7 days, it reported prints of a printer another of your bridges watches. Both bridges logged those prints, so some may be duplicates. It usually means the printer is still in that bridge's config file, `printlog-bridge.cfg`, after you connected it on another bridge in the app.

Remove the printer's section from that bridge's config file; the bridge stops watching it within a few seconds. Then check the print list and delete any duplicates. The warning goes away a week after the last such print.
