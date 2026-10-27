/**
 * The printer types the printer page offers to connect with printlog-bridge (printlog-bridge#82).
 * Each `kind` is the connection kind the bridge registers for it. Elegoo SDCP (`sdcp`) is left out
 * until the bridge has that adapter.
 */
export type BridgeSetupKind = 'moonraker' | 'bambu' | 'prusalink';

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
    case 'moonraker':
      return [
        '[printer voron]',
        `printer_id = ${printerId}`,
        'url = http://192.168.1.50:7125',
      ].join('\n');
  }
}

/** The type to show first, from the printer's make. The user can pick another. */
export function bridgeKindForMake(
  make: string | null | undefined
): BridgeSetupKind {
  const m = (make ?? '').toLowerCase();
  if (m.includes('bambu')) {
    return 'bambu';
  }
  if (m.includes('prusa')) {
    return 'prusalink';
  }
  return 'moonraker';
}
