import {
  Bridge,
  BridgePrinter,
  DiscoveredPrinter,
  DiscoveredPrinterState,
} from 'src/app/core/services/bridges.service';
import { ConnectionStatus } from 'src/app/core/services/connection.service';

/**
 * The contract's test key (3d-print-log-api docs/bridge-credential-sealing.vectors.json,
 * `recipient`): its private key is public, so never use it for anything but tests.
 */
export const TEST_BRIDGE_KEY = {
  publicKey:
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEvzmvDhTjuEWPAzuAqS3zfIP6QeXk2aXjK7BFOitKjtD4GHy/T1GLRiXStoJ7gGOhQAlWoMuHkeYLw0k/VVhsTQ==',
  privateKeyPkcs8Base64:
    'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgc3BwcL9Ry0s6RIp3WCI08qIIOroSxYQIeQ0+EzQ0LWmhRANCAAS/Oa8OFOO4RY8DO4CpLfN8g/pB5eTZpeMrsEU6K0qO0PgYfL9PUYtGJdK2gnuAY6FACVagy4eR5gvDST9VWGxN',
  publicKeyRawHex:
    '04bf39af0e14e3b8458f033b80a92df37c83fa41e5e4d9a5e32bb0453a2b4a8ed0f8187cbf4f518b4625d2b6827b8063a1400956a0cb8791e60bc3493f55586c4d',
  fingerprint:
    'aed03e9a828233b23fcecb8c927642f3f9dda453f3016d8314abfce62e64b38c',
  short: 'aed0 3e9a 8282 33b2',
};

/** A second key (public half only), for a pending key that differs from the current one. */
export const OTHER_BRIDGE_KEY = {
  publicKey:
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBa+dgyOuHYD5WrhH/ckgCN3yPlHghWzFTANVrl+zqdxIC2bwapAPfkZR4dETpbH8sM04VSNp0wOUDa0Jo1kfPw==',
  fingerprint:
    'acf003ff60c7f1713902ed831372557dcc77391f1eb26785bbb1147f504a1d62',
  short: 'acf0 03ff 60c7 f171',
};

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
    publicKey: TEST_BRIDGE_KEY.publicKey,
    publicKeyChangedAt: '2026-10-20T10:00:00Z',
    pendingPublicKey: null,
    pendingPublicKeyAt: null,
    keyChangesThrottled: false,
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
    secretFields: ['access_code'],
    secrets: [],
    credentialIssues: [],
    ...overrides,
  };
}
