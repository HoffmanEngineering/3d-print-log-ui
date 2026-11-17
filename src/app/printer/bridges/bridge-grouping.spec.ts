import { DiscoveredPrinterState } from 'src/app/core/services/bridges.service';
import { ConnectionStatus } from 'src/app/core/services/connection.service';
import {
  BridgeSnapshot,
  crossBridge,
  onNetwork,
  sharedJobNotice,
  stableIdentity,
} from './bridge-grouping';
import { bridge, bridgePrinter, discovered } from './testing/bridge-fixtures';

describe('bridge-grouping', () => {
  describe('stableIdentity', () => {
    it('matches a serial, mainboard id or MAC whatever the case', () => {
      expect(stableIdentity('bambu:sn:01P00A123')).toBe('bambu:sn:01p00a123');
      expect(stableIdentity('moonraker:mac:AA:BB:7125')).toBe(
        'moonraker:mac:aa:bb:7125'
      );
    });

    it('never matches an address across bridges, or nothing', () => {
      expect(stableIdentity('moonraker:ip:192.168.1.50:7125')).toBeNull();
      expect(stableIdentity(null)).toBeNull();
      expect(stableIdentity(undefined)).toBeNull();
      expect(stableIdentity('')).toBeNull();
    });
  });

  describe('onNetwork', () => {
    it('is true for an IPv4 address inside one of the CIDRs', () => {
      expect(onNetwork('192.168.2.61', ['192.168.2.0/24'])).toBe(true);
      expect(onNetwork('10.0.5.9', ['192.168.1.0/24', '10.0.0.0/16'])).toBe(
        true
      );
      expect(onNetwork('10.0.5.9', ['10.0.5.9/32'])).toBe(true);
    });

    it('is false outside, for host names, IPv6 and bad CIDRs', () => {
      expect(onNetwork('192.168.1.61', ['192.168.2.0/24'])).toBe(false);
      expect(onNetwork('mk4.local', ['192.168.2.0/24'])).toBe(false);
      expect(onNetwork('fd00::5', ['fd00::/64'])).toBe(false);
      expect(onNetwork('192.168.2.61', ['192.168.2.0/40'])).toBe(false);
      expect(onNetwork('192.168.2.61', null)).toBe(false);
      expect(onNetwork('300.1.1.1', ['0.0.0.0/0'])).toBe(false);
    });
  });

  describe('crossBridge', () => {
    const garage = bridge({
      id: 42,
      displayName: 'Garage NAS',
      networks: ['192.168.1.0/24'],
    });
    const attic = bridge({
      id: 9,
      name: 'Attic Pi',
      displayName: 'Attic Pi',
      networks: ['192.168.2.0/24'],
    });

    function snap(
      b: typeof garage,
      parts: Partial<BridgeSnapshot> = {}
    ): BridgeSnapshot {
      return { bridge: b, discovered: [], printers: [], ...parts };
    }

    it('lists a printer two bridges found once, under the bridge on its network', () => {
      const result = crossBridge([
        snap(garage, {
          discovered: [discovered({ id: 1, address: '192.168.2.61' })],
        }),
        snap(attic, {
          discovered: [discovered({ id: 2, address: '192.168.2.61' })],
        }),
      ]);
      expect([...result.get(9)!.alsoFoundBy.keys()]).toEqual([2]);
      const others = result.get(9)!.alsoFoundBy.get(2)!;
      expect(others.map((s) => [s.bridgeId, s.printer.id])).toEqual([[42, 1]]);
      expect(result.get(42)!.listedElsewhere.get(1)).toEqual({
        bridgeId: 9,
        bridgeName: 'Attic Pi',
        watched: false,
      });
      expect(result.get(42)!.alsoFoundBy.size).toBe(0);
      expect(result.get(9)!.listedElsewhere.size).toBe(0);
    });

    it('prefers the bridge that saw it last when both or neither have it on their network', () => {
      const result = crossBridge([
        snap(garage, {
          discovered: [
            discovered({ id: 1, lastSeenAt: '2026-10-27T18:00:00Z' }),
          ],
        }),
        snap(attic, {
          discovered: [
            discovered({ id: 2, lastSeenAt: '2026-10-27T18:05:00Z' }),
          ],
        }),
      ]);
      // 192.168.1.60 is on Garage's network only: the network wins over recency.
      expect(result.get(42)!.alsoFoundBy.has(1)).toBe(true);

      const neither = crossBridge([
        snap(garage, {
          discovered: [
            discovered({
              id: 1,
              address: '10.9.9.9',
              lastSeenAt: '2026-10-27T18:00:00Z',
            }),
          ],
        }),
        snap(attic, {
          discovered: [
            discovered({
              id: 2,
              address: '10.9.9.9',
              lastSeenAt: '2026-10-27T18:05:00Z',
            }),
          ],
        }),
      ]);
      expect(neither.get(9)!.alsoFoundBy.has(2)).toBe(true);
    });

    it('prefers an online bridge over a stale one', () => {
      const result = crossBridge([
        snap(
          { ...garage, status: ConnectionStatus.Stale },
          { discovered: [discovered({ id: 1 })] }
        ),
        snap(attic, { discovered: [discovered({ id: 2 })] }),
      ]);
      expect(result.get(9)!.alsoFoundBy.has(2)).toBe(true);
    });

    it('leaves it under the bridge already watching it, and offers the others on its row', () => {
      const result = crossBridge([
        snap(garage, {
          discovered: [
            discovered({
              id: 1,
              state: DiscoveredPrinterState.Connected,
              printerEntryId: 7,
            }),
          ],
          printers: [bridgePrinter({ id: 7 })],
        }),
        snap(attic, {
          discovered: [discovered({ id: 2, address: '192.168.2.61' })],
        }),
      ]);
      expect(result.get(9)!.listedElsewhere.get(2)).toEqual({
        bridgeId: 42,
        bridgeName: 'Garage NAS',
        watched: true,
      });
      const sightings = result.get(42)!.entrySightings.get(7)!;
      expect(sightings.map((s) => [s.bridgeId, s.printer.id])).toEqual([
        [9, 2],
      ]);
      expect(sightings[0].onOwnNetwork).toBe(true);
    });

    it('counts an app entry without a discovery row, and a config-file printer, as watching', () => {
      const byEntry = crossBridge([
        snap(garage, { printers: [bridgePrinter({ id: 7 })] }),
        snap(attic, { discovered: [discovered({ id: 2 })] }),
      ]);
      expect(byEntry.get(9)!.listedElsewhere.get(2)?.watched).toBe(true);

      const byFile = crossBridge([
        snap(garage, {
          discovered: [
            discovered({ id: 1, state: DiscoveredPrinterState.Configured }),
          ],
        }),
        snap(attic, { discovered: [discovered({ id: 2 })] }),
      ]);
      expect(byFile.get(9)!.listedElsewhere.get(2)?.watched).toBe(true);
    });

    it('keeps printers known only by address on every bridge that found them', () => {
      const ip = 'moonraker:ip:192.168.1.50:7125';
      const result = crossBridge([
        snap(garage, {
          discovered: [
            discovered({ id: 1, kind: 'moonraker', identityKey: ip }),
          ],
        }),
        snap(attic, {
          discovered: [
            discovered({ id: 2, kind: 'moonraker', identityKey: ip }),
          ],
        }),
      ]);
      expect(result.get(42)!.listedElsewhere.size).toBe(0);
      expect(result.get(9)!.listedElsewhere.size).toBe(0);
      expect(result.get(42)!.alsoFoundBy.size).toBe(0);
    });

    it('never groups an ignored sighting, and tolerates a bridge that failed to load', () => {
      const result = crossBridge([
        snap(garage, {
          discovered: [
            discovered({ id: 1, state: DiscoveredPrinterState.Ignored }),
          ],
        }),
        snap(attic, { discovered: [discovered({ id: 2 })] }),
        snap(bridge({ id: 5 }), { discovered: null, printers: null }),
      ]);
      expect(result.get(9)!.alsoFoundBy.size).toBe(0);
      expect(result.get(9)!.listedElsewhere.size).toBe(0);
      expect(result.get(5)!.alsoFoundBy.size).toBe(0);
    });
  });

  describe('sharedJobNotice', () => {
    const now = Date.parse('2026-10-27T18:00:00Z');
    const garage = bridge({ id: 42, displayName: 'Garage NAS' });

    it('names the printer and the bridge that watches it, for a recent job', () => {
      const attic = bridge({
        id: 9,
        displayName: 'Attic Pi',
        sharedJobCount: 3,
        lastSharedJobAt: '2026-10-25T10:00:00Z',
        lastSharedJobPrinterId: 5,
      });
      const notice = sharedJobNotice(
        attic,
        [
          {
            bridge: garage,
            discovered: [],
            printers: [bridgePrinter({ printerId: 5, printerName: 'X1C' })],
          },
          { bridge: attic, discovered: [], printers: [] },
        ],
        now
      );
      expect(notice).toEqual({
        printerId: 5,
        printerName: 'X1C',
        watcherName: 'Garage NAS',
        count: 3,
        lastAt: '2026-10-25T10:00:00Z',
      });
    });

    it('says nothing without a count, without a printer, or after 7 days', () => {
      const base = {
        sharedJobCount: 1,
        lastSharedJobAt: '2026-10-25T10:00:00Z',
        lastSharedJobPrinterId: 5,
      };
      expect(sharedJobNotice(bridge(), [], now)).toBeNull();
      expect(
        sharedJobNotice(bridge({ ...base, sharedJobCount: 0 }), [], now)
      ).toBeNull();
      expect(
        sharedJobNotice(
          bridge({ ...base, lastSharedJobPrinterId: null }),
          [],
          now
        )
      ).toBeNull();
      expect(
        sharedJobNotice(
          bridge({ ...base, lastSharedJobAt: '2026-10-20T17:59:00Z' }),
          [],
          now
        )
      ).toBeNull();
    });

    it('still warns when it can name neither the printer nor its bridge', () => {
      const notice = sharedJobNotice(
        bridge({
          sharedJobCount: 1,
          lastSharedJobAt: '2026-10-27T10:00:00Z',
          lastSharedJobPrinterId: 5,
        }),
        [],
        now
      );
      expect(notice).toEqual(
        expect.objectContaining({
          printerId: 5,
          printerName: null,
          watcherName: null,
        })
      );
    });
  });
});
