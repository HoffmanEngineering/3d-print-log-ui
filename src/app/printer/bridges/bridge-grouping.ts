import {
  Bridge,
  BridgePrinter,
  DiscoveredPrinter,
  DiscoveredPrinterState,
} from 'src/app/core/services/bridges.service';
import { ConnectionStatus } from 'src/app/core/services/connection.service';
import { bridgeLabel } from './bridge-utils';

/** One bridge as the Bridges screen loaded it. Null lists failed to load. */
export interface BridgeSnapshot {
  bridge: Bridge;
  discovered: DiscoveredPrinter[] | null;
  printers: BridgePrinter[] | null;
}

/** A printer one bridge found, seen from another bridge's card. */
export interface Sighting {
  bridgeId: number;
  bridgeName: string;
  printer: DiscoveredPrinter;
  /** Its address is on one of that bridge's own networks. */
  onOwnNetwork: boolean;
}

/** Where a found printer is listed instead of on this card. */
export interface ListedElsewhere {
  bridgeId: number;
  bridgeName: string;
  /** That bridge watches it (connected in the app, or in its config file). */
  watched: boolean;
}

/** What one card needs to know about the other bridges (printlog-bridge#103). */
export interface CrossBridge {
  /** New printers listed on this card that other bridges found too: discovered id to theirs. */
  alsoFoundBy: ReadonlyMap<number, Sighting[]>;
  /** New printers this bridge found that another card lists: discovered id to that bridge. */
  listedElsewhere: ReadonlyMap<number, ListedElsewhere>;
  /** This bridge's app entries that other bridges found too, as New: entry id to theirs. */
  entrySightings: ReadonlyMap<number, Sighting[]>;
}

/**
 * The identity that says two bridges found the same printer: a serial, mainboard id or MAC, as
 * the API matches them (`BridgeRules.IdentityKey`). An address identity (`kind:ip:…`) means
 * nothing across networks (192.168.1.60 in two houses is two printers), so it never matches.
 */
export function stableIdentity(
  identityKey: string | null | undefined
): string | null {
  if (!identityKey || identityKey.includes(':ip:')) {
    return null;
  }
  return identityKey.toLowerCase();
}

/** Whether an IPv4 address is inside one of the CIDRs a bridge reported. */
export function onNetwork(
  address: string,
  networks: readonly string[] | null | undefined
): boolean {
  const ip = ipv4(address);
  if (ip === null) {
    return false;
  }
  return (networks ?? []).some((cidr) => {
    const [base, bitsText] = cidr.split('/');
    const net = ipv4(base);
    const bits = Number(bitsText);
    if (net === null || !/^\d{1,2}$/.test(bitsText ?? '') || bits > 32) {
      return false;
    }
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ip & mask) >>> 0 === (net & mask) >>> 0;
  });
}

function ipv4(text: string | undefined): number | null {
  const parts = (text ?? '').split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) {
    return null;
  }
  const bytes = parts.map(Number);
  if (bytes.some((b) => b > 255)) {
    return null;
  }
  return (
    ((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]
  );
}

/**
 * How the Bridges screen shows a printer that several bridges found (printlog-bridge#103): once.
 *
 * - **Watched already** (an app entry on a bridge, or a bridge's config file): it stays with that
 *   bridge. The other bridges don't list it; the watching bridge's row offers to move it.
 * - **Not watched**: it is listed under one bridge, with the others as alternatives for Connect.
 *   That bridge is the first by: online before stale, has the printer's address on one of its own
 *   networks, saw it most recently, then the order of the list (oldest bridge first).
 *
 * Only a stable identity (serial, mainboard id, MAC) groups sightings: a printer known only by its
 * address stays on every bridge that found it, as the API treats it. Ignored sightings stay where
 * they are.
 */
export function crossBridge(
  snapshots: readonly BridgeSnapshot[]
): ReadonlyMap<number, CrossBridge> {
  const alsoFoundBy = new Map<number, Map<number, Sighting[]>>();
  const listedElsewhere = new Map<number, Map<number, ListedElsewhere>>();
  const entrySightings = new Map<number, Map<number, Sighting[]>>();
  for (const s of snapshots) {
    alsoFoundBy.set(s.bridge.id, new Map());
    listedElsewhere.set(s.bridge.id, new Map());
    entrySightings.set(s.bridge.id, new Map());
  }

  const order = new Map(snapshots.map((s, i) => [s.bridge.id, i]));
  const byId = new Map(snapshots.map((s) => [s.bridge.id, s.bridge]));
  const fresh = new Map<string, Sighting[]>();
  /** Identity to the bridges watching it, and their entries for it. */
  const watchers = new Map<
    string,
    { bridgeId: number; entries: BridgePrinter[] }[]
  >();

  const watch = (
    key: string,
    bridgeId: number,
    entry: BridgePrinter | null
  ) => {
    const list = watchers.get(key) ?? [];
    let item = list.find((w) => w.bridgeId === bridgeId);
    if (!item) {
      item = { bridgeId, entries: [] };
      list.push(item);
    }
    if (entry && !item.entries.includes(entry)) {
      item.entries.push(entry);
    }
    watchers.set(key, list);
  };

  for (const s of snapshots) {
    const entries = s.printers ?? [];
    for (const entry of entries) {
      const key = stableIdentity(entry.identityKey);
      if (key) {
        watch(key, s.bridge.id, entry);
      }
    }
    for (const printer of s.discovered ?? []) {
      const key = stableIdentity(printer.identityKey);
      if (!key) {
        continue;
      }
      if (
        printer.state === DiscoveredPrinterState.Connected ||
        printer.state === DiscoveredPrinterState.Configured
      ) {
        const entry =
          printer.printerEntryId === null
            ? null
            : (entries.find((e) => e.id === printer.printerEntryId) ?? null);
        watch(key, s.bridge.id, entry);
      } else if (printer.state === DiscoveredPrinterState.New) {
        const list = fresh.get(key) ?? [];
        list.push({
          bridgeId: s.bridge.id,
          bridgeName: bridgeLabel(s.bridge),
          printer,
          onOwnNetwork: onNetwork(printer.address, s.bridge.networks),
        });
        fresh.set(key, list);
      }
    }
  }

  for (const [key, sightings] of fresh) {
    const watching = watchers.get(key) ?? [];
    if (watching.length) {
      const owner = watching[0];
      const ownerName = bridgeLabel(byId.get(owner.bridgeId)!);
      const away = sightings.filter(
        (s) => !watching.some((w) => w.bridgeId === s.bridgeId)
      );
      for (const s of away) {
        listedElsewhere.get(s.bridgeId)!.set(s.printer.id, {
          bridgeId: owner.bridgeId,
          bridgeName: ownerName,
          watched: true,
        });
      }
      for (const w of watching) {
        const others = away.filter((s) => s.bridgeId !== w.bridgeId);
        for (const entry of w.entries) {
          if (others.length) {
            entrySightings.get(w.bridgeId)!.set(entry.id, others);
          }
        }
      }
      continue;
    }
    if (new Set(sightings.map((s) => s.bridgeId)).size < 2) {
      continue;
    }
    const ranked = [...sightings].sort(
      (a, b) =>
        Number(isStale(byId.get(a.bridgeId)!)) -
          Number(isStale(byId.get(b.bridgeId)!)) ||
        Number(b.onOwnNetwork) - Number(a.onOwnNetwork) ||
        seen(b) - seen(a) ||
        order.get(a.bridgeId)! - order.get(b.bridgeId)!
    );
    const [chosen, ...others] = ranked;
    alsoFoundBy.get(chosen.bridgeId)!.set(chosen.printer.id, others);
    for (const s of others) {
      listedElsewhere.get(s.bridgeId)!.set(s.printer.id, {
        bridgeId: chosen.bridgeId,
        bridgeName: chosen.bridgeName,
        watched: false,
      });
    }
  }

  const result = new Map<number, CrossBridge>();
  for (const s of snapshots) {
    result.set(s.bridge.id, {
      alsoFoundBy: alsoFoundBy.get(s.bridge.id)!,
      listedElsewhere: listedElsewhere.get(s.bridge.id)!,
      entrySightings: entrySightings.get(s.bridge.id)!,
    });
  }
  return result;
}

function isStale(bridge: Bridge): boolean {
  return bridge.status === ConnectionStatus.Stale;
}

function seen(s: Sighting): number {
  const t = Date.parse(s.printer.lastSeenAt);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * How long after the last job another bridge also reported the warning stays up. The counter is
 * never reset, so the date decides: a week covers a printer that prints a few times a week (each
 * print reports again while the cause is there), and the warning goes away by itself within a week
 * of the config file being fixed.
 */
export const SHARED_JOB_WINDOW_DAYS = 7;

/** The "two bridges report this printer" warning for one bridge's card. */
export interface SharedJobNotice {
  printerId: number;
  /** From an app entry on any bridge; null when none names it. */
  printerName: string | null;
  /** The other bridge with an app entry for the printer, or null when unknown (a config file). */
  watcherName: string | null;
  count: number;
  lastAt: string;
}

/**
 * A warning when this bridge recently reported jobs for a printer another bridge watches
 * (`sharedJobCount`, api#290): both log it, so some prints may be duplicates. Usually this
 * bridge still has the printer in its config file after it was connected elsewhere.
 */
export function sharedJobNotice(
  bridge: Bridge,
  snapshots: readonly BridgeSnapshot[],
  now: number
): SharedJobNotice | null {
  const count = bridge.sharedJobCount ?? 0;
  const printerId = bridge.lastSharedJobPrinterId ?? null;
  const lastAt = bridge.lastSharedJobAt ?? null;
  if (count <= 0 || printerId === null || !lastAt) {
    return null;
  }
  const at = Date.parse(lastAt);
  if (
    Number.isNaN(at) ||
    now - at > SHARED_JOB_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ) {
    return null;
  }
  let printerName: string | null = null;
  let watcherName: string | null = null;
  for (const s of snapshots) {
    const entry = (s.printers ?? []).find((p) => p.printerId === printerId);
    if (!entry) {
      continue;
    }
    printerName ??= entry.printerName;
    if (s.bridge.id !== bridge.id && watcherName === null) {
      watcherName = bridgeLabel(s.bridge);
    }
  }
  return { printerId, printerName, watcherName, count, lastAt };
}
