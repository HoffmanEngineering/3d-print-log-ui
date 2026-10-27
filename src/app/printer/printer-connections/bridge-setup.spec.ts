import {
  BRIDGE_SETUPS,
  bridgeConfigSnippet,
  bridgeKindForMake,
} from './bridge-setup';

describe('bridge setup', () => {
  it('offers Klipper, Bambu Lab and PrusaLink, and not Elegoo SDCP yet', () => {
    expect(BRIDGE_SETUPS.map((s) => s.kind)).toEqual([
      'moonraker',
      'bambu',
      'prusalink',
    ]);
  });

  it('links each printer type to its guide', () => {
    expect(BRIDGE_SETUPS.map((s) => s.guide)).toEqual([
      '/docs/printlog-bridge',
      '/docs/printlog-bridge-bambu',
      '/docs/printlog-bridge-prusalink',
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

    it('picks Klipper for anything else, or no make', () => {
      expect(bridgeKindForMake('Voron')).toBe('moonraker');
      expect(bridgeKindForMake(null)).toBe('moonraker');
    });
  });
});
