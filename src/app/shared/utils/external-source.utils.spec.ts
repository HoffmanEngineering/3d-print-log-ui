import { externalSourceLabel } from './external-source.utils';

describe('externalSourceLabel', () => {
  it('names every printlog-bridge adapter kind the API knows (printlog-bridge#82)', () => {
    expect(externalSourceLabel('moonraker')).toBe('Klipper (Moonraker)');
    expect(externalSourceLabel('octoprint')).toBe('OctoPrint');
    expect(externalSourceLabel('prusalink')).toBe('PrusaLink');
    expect(externalSourceLabel('bambu')).toBe('Bambu Lab (LAN)');
    expect(externalSourceLabel('sdcp')).toBe('Elegoo (SDCP)');
    // The API's PrintSource Duet = 10, FlashForge = 11 and Anycubic = 12.
    expect(externalSourceLabel('duet')).toBe('Duet (RepRapFirmware)');
    expect(externalSourceLabel('flashforge')).toBe('FlashForge');
    expect(externalSourceLabel('anycubic')).toBe('Anycubic (LAN)');
  });

  it('keeps the cloud Bambu integration apart from the LAN adapter', () => {
    expect(externalSourceLabel('bambu-cloud')).toBe('Bambu Cloud');
  });

  it('ignores case and surrounding space', () => {
    expect(externalSourceLabel(' Bambu ')).toBe('Bambu Lab (LAN)');
  });

  it('shows a kind this build does not know as it came', () => {
    expect(externalSourceLabel('creality')).toBe('creality');
  });
});
