import {
  BRIDGE_SETUPS,
  bridgeConfigSnippet,
  bridgeKindForMake,
} from './bridge-setup';

describe('bridge setup', () => {
  it('offers Klipper, Bambu Lab, PrusaLink, OctoPrint, Elegoo SDCP, Duet, FlashForge and Anycubic', () => {
    expect(BRIDGE_SETUPS.map((s) => s.kind)).toEqual([
      'moonraker',
      'bambu',
      'prusalink',
      'octoprint',
      'sdcp',
      'duet',
      'flashforge',
      'anycubic',
    ]);
  });

  // The Photon P1 Max is a resin printer; every other adapter logs filament printers only.
  it('marks only Anycubic as watching resin printers too', () => {
    expect(BRIDGE_SETUPS.filter((s) => s.resin).map((s) => s.kind)).toEqual([
      'anycubic',
    ]);
  });

  it('links each printer type to its guide', () => {
    expect(BRIDGE_SETUPS.map((s) => s.guide)).toEqual([
      '/docs/printlog-bridge',
      '/docs/printlog-bridge-bambu',
      '/docs/printlog-bridge-prusalink',
      '/docs/printlog-bridge-octoprint',
      '/docs/printlog-bridge-sdcp',
      '/docs/printlog-bridge-duet',
      '/docs/printlog-bridge-flashforge',
      '/docs/printlog-bridge-anycubic',
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

    // A Duet takes a password only when config.g sets one with M551.
    it('writes a Duet section with the password commented out', () => {
      expect(bridgeConfigSnippet('duet', 48)).toBe(
        [
          '[printer duet]',
          'adapter = duet',
          'printer_id = 48',
          'host = 192.168.1.88',
          '# password = only-when-config.g-sets-one-with-M551',
        ].join('\n')
      );
    });

    // The bridge learns the serial from the printer; `serial` is the fallback when it can't.
    it('writes a FlashForge section with the check code, and the serial as a fallback', () => {
      expect(bridgeConfigSnippet('flashforge', 50)).toBe(
        [
          '[printer flashforge]',
          'adapter = flashforge',
          'printer_id = 50',
          'host = 192.168.1.60',
          'check_code = the-code-the-printer-shows',
          '# serial = SN...   only when doctor asks for it',
        ].join('\n')
      );
    });

    // In LAN mode the printer hands the bridge its own login, so there is nothing to add.
    it('writes an Anycubic section with no credential', () => {
      expect(bridgeConfigSnippet('anycubic', 49)).toBe(
        [
          '[printer anycubic]',
          'adapter = anycubic',
          'printer_id = 49',
          'host = 192.168.1.89',
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

    it('picks Duet for a Duet or RepRap printer', () => {
      expect(bridgeKindForMake('Duet3D')).toBe('duet');
      expect(bridgeKindForMake('Duet')).toBe('duet');
      expect(bridgeKindForMake('RepRap')).toBe('duet');
    });

    it('picks FlashForge for a FlashForge printer', () => {
      expect(bridgeKindForMake('FlashForge', 'Adventurer 5M Pro')).toBe(
        'flashforge'
      );
      expect(bridgeKindForMake('Flashforge')).toBe('flashforge');
    });

    it('picks Anycubic for a Kobra S1, Kobra 3 or Photon P1', () => {
      expect(bridgeKindForMake('Anycubic', 'Kobra S1')).toBe('anycubic');
      expect(bridgeKindForMake('Anycubic', 'Kobra S1 Combo')).toBe('anycubic');
      expect(bridgeKindForMake('ANYCUBIC', 'kobra 3 combo')).toBe('anycubic');
      expect(bridgeKindForMake('Anycubic', 'Photon P1 Max')).toBe('anycubic');
      expect(bridgeKindForMake('Anycubic', 'Photon P1')).toBe('anycubic');
    });

    // The Kobra 3 family (a Kobra 3 Max too) speaks LAN mode; other Anycubic printers start on Klipper.
    it('picks Klipper for other Anycubic printers', () => {
      expect(bridgeKindForMake('Anycubic', 'Kobra 2 Max')).toBe('moonraker');
      expect(bridgeKindForMake('Anycubic', 'Kobra S2')).toBe('moonraker');
      expect(bridgeKindForMake('Anycubic', 'Kobra 3 Max')).toBe('anycubic');
      expect(bridgeKindForMake('Anycubic', 'Photon Mono M5s')).toBe(
        'moonraker'
      );
      expect(bridgeKindForMake('Anycubic')).toBe('moonraker');
    });

    it('picks Klipper for anything else, or no make', () => {
      expect(bridgeKindForMake('Voron')).toBe('moonraker');
      expect(bridgeKindForMake(null)).toBe('moonraker');
    });
  });
});
