/**
 * The printer types the printer page offers to connect with printlog-bridge (printlog-bridge#82).
 * Each `kind` is the connection kind the bridge registers for it.
 */
export type BridgeSetupKind =
  | 'moonraker'
  | 'bambu'
  | 'prusalink'
  | 'octoprint'
  | 'sdcp'
  | 'duet'
  | 'flashforge'
  | 'anycubic';

export interface BridgeSetup {
  kind: BridgeSetupKind;
  /** The choice's label in the picker. */
  label: string;
  /** The setup guide for this type. */
  guide: string;
  /** It watches resin printers too (the Photon P1 Max); every other type logs filament only. */
  resin?: true;
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
  {
    kind: 'duet',
    label: 'Duet (RepRapFirmware)',
    guide: '/docs/printlog-bridge-duet',
  },
  {
    kind: 'flashforge',
    label: 'FlashForge',
    guide: '/docs/printlog-bridge-flashforge',
  },
  {
    kind: 'anycubic',
    label: 'Anycubic (LAN mode)',
    guide: '/docs/printlog-bridge-anycubic',
    resin: true,
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
    case 'duet':
      // A password only when config.g sets one with M551.
      return [
        '[printer duet]',
        'adapter = duet',
        `printer_id = ${printerId}`,
        'host = 192.168.1.88',
        '# password = only-when-config.g-sets-one-with-M551',
      ].join('\n');
    case 'flashforge':
      // The bridge asks the printer for its serial; `serial` is the fallback when it can't.
      return [
        '[printer flashforge]',
        'adapter = flashforge',
        `printer_id = ${printerId}`,
        'host = 192.168.1.60',
        'check_code = the-code-the-printer-shows',
        '# serial = SN...   only when doctor asks for it',
      ].join('\n');
    case 'anycubic':
      // In LAN mode the printer hands the bridge its own login: there is no credential to add.
      return [
        '[printer anycubic]',
        'adapter = anycubic',
        `printer_id = ${printerId}`,
        'host = 192.168.1.89',
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
 * Of Anycubic's, the Kobra S1, the Kobra 3 family and the Photon P1 (and P1 Max) speak LAN mode;
 * the others start on Klipper. A Duet or RepRap make starts on Duet, and a FlashForge on
 * FlashForge (the bridge supports the Adventurer 5M series and the AD5X).
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
  if (m.includes('duet') || m.includes('reprap')) {
    return 'duet';
  }
  if (m.includes('flashforge')) {
    return 'flashforge';
  }
  if (
    m.includes('anycubic') &&
    /kobra\s*(s1|3)\b|photon\s*p1\b/i.test(model ?? '')
  ) {
    return 'anycubic';
  }
  return 'moonraker';
}
