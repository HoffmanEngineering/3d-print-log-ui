import {
  Bridge,
  BridgePrinter,
  DiscoveredPrinter,
  DiscoveredPrinterState,
} from 'src/app/core/services/bridges.service';
import { ConnectionStatus } from 'src/app/core/services/connection.service';

/** Test and screenshot data for the Bridges screen, shaped like api#288's responses. */
export function bridge(overrides: Partial<Bridge> = {}): Bridge {
  return {
    id: 42,
    name: 'Garage NAS',
    deviceName: 'printlog-bridge on nas',
    displayName: 'Garage NAS',
    location: 'Workshop',
    agentVersion: '0.3.0',
    latestAgentVersion: '0.3.0',
    updateAvailable: false,
    mode: 'remote',
    hostName: 'nas',
    networks: ['192.168.1.0/24'],
    status: ConnectionStatus.Online,
    lastSeenAt: '2026-10-27T18:04:11Z',
    createdAt: '2026-10-20T10:00:00Z',
    scanRequestedAt: null,
    lastSweepAt: null,
    printerCount: 1,
    connectionCount: 2,
    discoveredCount: 4,
    discoveredNotConnectedCount: 1,
    ...overrides,
  };
}

export function discovered(
  overrides: Partial<DiscoveredPrinter> = {}
): DiscoveredPrinter {
  return {
    id: 12,
    kind: 'bambu',
    address: '192.168.1.60',
    port: 8883,
    model: 'X1 Carbon',
    name: 'Workshop X1C',
    serial: '01P00A123456789',
    mainboardId: null,
    macs: [],
    identityKey: 'bambu:sn:01P00A123456789',
    state: DiscoveredPrinterState.New,
    printerEntryId: null,
    firstSeenAt: '2026-10-27T17:00:00Z',
    lastSeenAt: '2026-10-27T18:04:11Z',
    ...overrides,
  };
}

export function bridgePrinter(
  overrides: Partial<BridgePrinter> = {}
): BridgePrinter {
  return {
    id: 7,
    printerId: 5,
    printerName: 'X1C',
    kind: 'bambu',
    host: '192.168.1.60',
    port: 8883,
    serial: '01P00A123456789',
    identityKey: 'bambu:sn:01P00A123456789',
    macs: [],
    createdAt: '2026-10-27T18:02:00Z',
    ...overrides,
  };
}
