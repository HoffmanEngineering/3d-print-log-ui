/**
 * The printer types the printer page offers to connect with printlog-bridge (printlog-bridge#82).
 * Each `kind` is the connection kind the bridge registers for it.
 */
export type BridgeSetupKind =
  | 'moonraker'
  | 'bambu'
  | 'prusalink'
  | 'octoprint'
  | 'sdcp';

export interface BridgeSetup {
  kind: BridgeSetupKind;
  /** The choice's label in the picker. */
  label: string;
  /** The setup guide for this type. */
  guide: string;
}

export const BRIDGE_SETUPS: readonly BridgeSetup[] = [
  {
    kind: 'moonraker',
    label: 'Klipper / Moonraker',
    guide: '/docs/printlog-bridge',
  },
  { kind: 'bambu', label: 'Bambu Lab', guide: '/docs/printlog-bridge-bambu' },
  {
    kind: 'prusalink',
    label: 'Prusa (PrusaLink)',
    guide: '/docs/printlog-bridge-prusalink',
  },
  {
    kind: 'octoprint',
    label: 'OctoPrint',
    guide: '/docs/printlog-bridge-octoprint',
  },
  {
    kind: 'sdcp',
    label: 'Elegoo Centauri Carbon',
    guide: '/docs/printlog-bridge-sdcp',
  },
];

/**
 * A `[printer]` section for the bridge's config with this printer's id filled in. The other
 * values are the examples the guides use, for the user to replace. The Klipper section is the
 * remote-mode one from the Docker guide, unchanged.
 */
export function bridgeConfigSnippet(
  kind: BridgeSetupKind,
  printerId: number
): string {
  switch (kind) {
    case 'bambu':
      return [
        '[printer bambu]',
        'adapter = bambu',
        `printer_id = ${printerId}`,
        'host = 192.168.1.50',
        'serial = 01S00C123456789',
        'access_code = 12345678',
      ].join('\n');
    case 'prusalink':
      return [
        '[printer prusa]',
        'adapter = prusalink',
        `printer_id = ${printerId}`,
        'host = 192.168.1.60',
        'password = the-password-the-printer-shows',
      ].join('\n');
    case 'octoprint':
      return [
        '[printer octoprint]',
        'adapter = octoprint',
        `printer_id = ${printerId}`,
        'url = http://octopi.local',
        'api_key = a-key-from-octoprint',
      ].join('\n');
    case 'sdcp':
      // SDCP has no authentication: there is no credential to add.
      return [
        '[printer centauri]',
        'adapter = sdcp',
        `printer_id = ${printerId}`,
        'host = 192.168.1.77',
      ].join('\n');
    case 'moonraker':
      return [
        '[printer voron]',
        `printer_id = ${printerId}`,
        'url = http://192.168.1.50:7125',
      ].join('\n');
  }
}

/**
 * The type to show first, from the printer's make and model. The user can pick another. An
 * OctoPrint printer can be any make, so nothing picks it. Of Elegoo's printers only the
 * Centauri Carbon speaks SDCP: the Neptune 4 runs Klipper, and the Centauri Carbon 2 speaks MQTT.
 */
export function bridgeKindForMake(
  make: string | null | undefined,
  model?: string | null
): BridgeSetupKind {
  const m = (make ?? '').toLowerCase();
  if (m.includes('bambu')) {
    return 'bambu';
  }
  if (m.includes('prusa')) {
    return 'prusalink';
  }
  if (m.includes('elegoo') && /centauri\s*carbon(?!\s*2)/i.test(model ?? '')) {
    return 'sdcp';
  }
  return 'moonraker';
}
