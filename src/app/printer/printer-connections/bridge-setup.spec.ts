import {
  BRIDGE_SETUPS,
  bridgeConfigSnippet,
  bridgeKindForMake,
} from './bridge-setup';

describe('bridge setup', () => {
  it('offers Klipper, Bambu Lab, PrusaLink, OctoPrint and Elegoo SDCP', () => {
    expect(BRIDGE_SETUPS.map((s) => s.kind)).toEqual([
      'moonraker',
      'bambu',
      'prusalink',
      'octoprint',
      'sdcp',
    ]);
  });

  it('links each printer type to its guide', () => {
    expect(BRIDGE_SETUPS.map((s) => s.guide)).toEqual([
      '/docs/printlog-bridge',
      '/docs/printlog-bridge-bambu',
      '/docs/printlog-bridge-prusalink',
      '/docs/printlog-bridge-octoprint',
      '/docs/printlog-bridge-sdcp',
    ]);
  });

  describe('bridgeConfigSnippet', () => {
    it('writes a Bambu section with the printer id filled in', () => {
      expect(bridgeConfigSnippet('bambu', 42)).toBe(
        [
          '[printer bambu]',
          'adapter = bambu',
          'printer_id = 42',
          'host = 192.168.1.50',
          'serial = 01S00C123456789',
          'access_code = 12345678',
        ].join('\n')
      );
    });

    it('writes a PrusaLink section with the printer id filled in', () => {
      expect(bridgeConfigSnippet('prusalink', 7)).toBe(
        [
          '[printer prusa]',
          'adapter = prusalink',
          'printer_id = 7',
          'host = 192.168.1.60',
          'password = the-password-the-printer-shows',
        ].join('\n')
      );
    });

    it('writes an OctoPrint section with its url and API key', () => {
      expect(bridgeConfigSnippet('octoprint', 46)).toBe(
        [
          '[printer octoprint]',
          'adapter = octoprint',
          'printer_id = 46',
          'url = http://octopi.local',
          'api_key = a-key-from-octoprint',
        ].join('\n')
      );
    });

    // SDCP has no authentication, so the section has no credential.
    it('writes an SDCP section with no credential', () => {
      expect(bridgeConfigSnippet('sdcp', 47)).toBe(
        [
          '[printer centauri]',
          'adapter = sdcp',
          'printer_id = 47',
          'host = 192.168.1.77',
        ].join('\n')
      );
    });

    // The Klipper path stays as the Docker guide shows it: no adapter line, Moonraker's url.
    it('writes the Klipper remote-mode section the Docker guide shows', () => {
      expect(bridgeConfigSnippet('moonraker', 41)).toBe(
        [
          '[printer voron]',
          'printer_id = 41',
          'url = http://192.168.1.50:7125',
        ].join('\n')
      );
    });
  });

  describe('bridgeKindForMake', () => {
    it('picks Bambu Lab for a Bambu printer', () => {
      expect(bridgeKindForMake('Bambu Lab')).toBe('bambu');
      expect(bridgeKindForMake('bambulab')).toBe('bambu');
    });

    it('picks PrusaLink for a Prusa printer', () => {
      expect(bridgeKindForMake('Prusa Research')).toBe('prusalink');
      expect(bridgeKindForMake('Prusa')).toBe('prusalink');
    });

    it('picks SDCP for an Elegoo Centauri Carbon', () => {
      expect(bridgeKindForMake('Elegoo', 'Centauri Carbon')).toBe('sdcp');
      expect(bridgeKindForMake('ELEGOO', 'centauri carbon')).toBe('sdcp');
    });

    // The Neptune 4 runs Klipper, and the Centauri Carbon 2 speaks MQTT, not SDCP.
    it('picks Klipper for other Elegoo printers', () => {
      expect(bridgeKindForMake('Elegoo', 'Neptune 4 Pro')).toBe('moonraker');
      expect(bridgeKindForMake('Elegoo', 'Centauri Carbon 2')).toBe(
        'moonraker'
      );
      expect(bridgeKindForMake('Elegoo')).toBe('moonraker');
    });

    it('picks Klipper for anything else, or no make', () => {
      expect(bridgeKindForMake('Voron')).toBe('moonraker');
      expect(bridgeKindForMake(null)).toBe('moonraker');
    });
  });
});
