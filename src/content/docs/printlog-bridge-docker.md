---
slug: printlog-bridge-docker
title: Run printlog-bridge in Docker | 3D Print Log Docs
description: Run printlog-bridge in Docker on a NAS, home server or Raspberry Pi to log prints from Klipper printers on your network, with Compose and Synology steps.
navLabel: Bridge – Docker (remote mode)
nav: false
group: integrations
order: 44
mode: how-to
updated: 2026-10-15
related: [printlog-bridge, printlog-bridge-install, snapmaker-u1, printlog-bridge-troubleshooting]
---

## Run printlog-bridge in Docker

---

Part of the [Log prints from Klipper](/docs/printlog-bridge) guide.

In remote mode, one [printlog-bridge](/docs/printlog-bridge) container watches every printer in its config over the network, through each printer's Moonraker WebSocket. That suits a NAS, a home server, or a Raspberry Pi that isn't a printer, and it covers printers you can't install software on, such as the [Snapmaker U1](/docs/snapmaker-u1).

The container only connects out, to your printers and to 3D Print Log. It opens no ports, and it runs as a normal user, never root.

### The image {#image}

The image is `ghcr.io/hoffmanengineering/printlog-bridge`, built for `linux/amd64`, `linux/arm64` and `linux/arm/v7` (32-bit Raspberry Pi OS).

| Tag | What it is |
| --- | --- |
| `edge` | The newest commit on the bridge's `main` branch |
| `latest`, `1.2`, `1.2.3` | Releases, from the first release on |

<doc-callout kind="warning" heading="Use the edge tag for now">
  <p>
    There is no release yet, so <code>latest</code> doesn't exist. An image name
    without a tag means <code>latest</code>, so write
    <code>ghcr.io/hoffmanengineering/printlog-bridge:edge</code> until the
    first release.
  </p>
</doc-callout>

### The data folder {#data}

Everything the bridge keeps is in one folder on the host, mounted at `/data`:

| Path | What it is |
| --- | --- |
| `/data/printlog-bridge.cfg` | The config, which you write |
| `/data/state/api_key` | The API key, if you store it with `store-key` |
| `/data/state/outbox.sqlite3`, `/data/state/images/` | Job events and pictures not sent yet |
| `/data/state/printers/`, `/data/state/status.json` | What has been logged, and what `status` shows |
| `/data/state/bridge.log` | The log. `docker logs` shows it too. |
| `/data/state/printlog-bridge-support.zip` | The support bundle `doctor` writes |

The image sets `PRINTLOG_BRIDGE_CONFIG=/data/printlog-bridge.cfg` and `PRINTLOG_BRIDGE_STATE_DIR=/data/state`. Leave `state_dir` out of the config, since it would win over them.

### Set it up {#setup}

#### 1. Make the folder {#setup-folder}

Make a folder for the bridge on the host, such as `/volume1/docker/printlog-bridge` on a Synology NAS or `/mnt/user/appdata/printlog-bridge` on Unraid.

On a Synology NAS, give your own user write access to that folder. In File Station, right-click it, then choose **Properties**, **Permission** and **Create**. Pick your DSM user, allow **Read** and **Write**, apply it to this folder, child folders and child files, and choose **Save**. The `docker` share lets you write through the administrators group, but the container runs with only the user and group you give it in step 4, so without this entry the bridge can't create its `state` folder (`Permission denied: '/data/state'`).

#### 2. Write the config {#setup-config}

Save `printlog-bridge.cfg` in that folder, with a `[printer <name>]` section per printer. `printer_id` is the printer's number in 3D Print Log, the end of its page's address (`42` in `https://www.3dprintlog.com/printers/42`), and `url` is the printer's Moonraker:

```
[printer voron]
printer_id = 41
url = http://192.168.1.50:7125

[printer u1]
printer_id = 42
url = http://192.168.1.51:7125
```

Use the printers' IP addresses, and give each printer a fixed one with a DHCP reservation in your router. Names like `voron.local` usually don't resolve inside a container, and an address that changes leaves the bridge unable to find the printer. The [config reference](/docs/printlog-bridge-install#config) lists every option.

#### 3. Pick the user {#setup-user}

The container should run as the user that owns the folder. Over SSH, `id your-user-name` shows its numbers, such as `uid=1026 ... gid=100(users)`. Without a `user:` line, the container runs as `1000:1000`, and that uid needs to be able to write the folder.

#### 4. Create the container {#setup-compose}

A `docker-compose.yml` for the folder above:

```
services:
  printlog-bridge:
    image: ghcr.io/hoffmanengineering/printlog-bridge:edge
    container_name: printlog-bridge
    restart: unless-stopped
    user: "1026:100"
    environment:
      TZ: America/New_York
    volumes:
      - /volume1/docker/printlog-bridge:/data
```

`restart: unless-stopped` brings the bridge back after a crash and after the host restarts. `TZ` is optional: set it to your own time zone (a [tz database name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones), such as `America/Chicago` or `Europe/London`) so the times in the bridge's log match your clock. Without it they're in UTC. It changes nothing else: `status` and 3D Print Log use UTC either way. Unraid sets it for you.

On a Synology NAS, open **Container Manager**, then **Project**, then **Create**, with the folder as the project's path and this file as its Compose file. If Container Manager isn't installed, install it from **Package Center**. When it asks you to configure the bridge network, keep the default (`172.17.0.1/16`) unless your home network itself uses `172.17.x.x` addresses. The commands below run over SSH, which you turn on in **Control Panel**, then **Terminal & SNMP**.

Without Compose:

```
docker run -d --name printlog-bridge --restart unless-stopped \
  --user 1026:100 -e TZ=America/New_York \
  -v /volume1/docker/printlog-bridge:/data \
  ghcr.io/hoffmanengineering/printlog-bridge:edge
```

#### 5. Connect to your account {#connect}

Until one-step pairing arrives (it's planned), the bridge signs in with a [personal API key](/docs/api#api-keys). Create one on the [Personal API Keys](/api-keys) page, then give it to the bridge in one of two ways:

- **Store it in the folder**, where only the container's user can read it. Over SSH, run this and paste the key when asked:

  ```
  docker run --rm -it --user 1026:100 \
    -v /volume1/docker/printlog-bridge:/data \
    ghcr.io/hoffmanengineering/printlog-bridge:edge store-key
  ```

  The key lands in `/data/state/api_key`. The image itself never holds a key.

- **Or set it on the container**, as `PRINTLOG_API_KEY: your-key` under `environment:`. That's simpler, but anyone who can manage containers on the host can read it in the container's settings.

Then restart the container.

#### 6. Check it {#setup-check}

The container shows as healthy once the bridge runs: its health check is `printlog-bridge status`. To check the setup and see what each printer is doing:

```
docker exec printlog-bridge printlog-bridge doctor
docker exec printlog-bridge printlog-bridge status
```

`doctor` checks the config, the key and every printer, and leaves a support bundle in the folder at `state/printlog-bridge-support.zip`. [Troubleshooting](/docs/printlog-bridge-troubleshooting) explains both commands.

If the config needs fixing (no key, a printer without `printer_id`), the bridge says what to fix in the container's log and exits, and the restart policy tries again every few seconds. After editing `printlog-bridge.cfg`, restart the container.

### Printers with Moonraker authorization {#moonraker-auth}

Moonraker sees the bridge coming from the Docker host's address. If a printer has `[authorization]` turned on in `moonraker.conf`, either add the host to its `trusted_clients`, or set `moonraker_api_key` in that printer's section to Moonraker's API key.

Moonraker accepts one bridge per printer. Don't also install the bridge on a printer the container watches: the second one waits until the first stops.

### Spool macros in remote mode {#macros}

The [spool macros](/docs/printlog-bridge-spools) work in remote mode too, because the bridge reads the printer's console over the network. Where the printer lets you edit its Klipper config, copy [klipper/printlog.cfg](https://github.com/HoffmanEngineering/printlog-bridge/blob/main/klipper/printlog.cfg) to its config folder, add `[include printlog.cfg]` to `printer.cfg`, and restart Klipper.

### Testing against a development API {#allow-http-on-lan}

`api_url` must use `https`. Plain `http` is only allowed to the computer the bridge runs on (which, inside a container, is the container itself). To test against a development API on another computer on your network, set `allow_http_on_lan = true` in `[bridge]`, or `PRINTLOG_ALLOW_HTTP_ON_LAN=1` on the container, and use that computer's private IP address, such as `http://192.168.1.20:5000`. The API key then travels unencrypted on your network. A public address or a host name is refused either way.

### Update {#update}

Pull the image again and recreate the container. With Compose, that's `docker compose pull` and then `docker compose up -d` in the project's folder. The config and everything in `/data` stay as they are.

You don't have to watch for new versions: when one is out, the printer's Connections in 3D Print Log say so, and so do the bridge's log, `status` and `doctor`. See [Update](/docs/printlog-bridge#update).
