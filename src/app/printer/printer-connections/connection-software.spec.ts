import { connectionSoftware } from './connection-software';

describe('connectionSoftware', () => {
  it('names the firmware and host software a bridge reported (api#282)', () => {
    expect(
      connectionSoftware({
        firmwareName: 'Prusa-Firmware-Buddy',
        firmwareVersion: '6.2.1',
        hostSoftwareName: 'PrusaLink',
        hostSoftwareVersion: '2.1.2',
      })
    ).toEqual(['Prusa-Firmware-Buddy 6.2.1', 'PrusaLink 2.1.2']);
  });

  it('shows only the firmware for a printer with no host software (Bambu)', () => {
    expect(
      connectionSoftware({
        firmwareName: 'Bambu',
        firmwareVersion: '01.08.02.00',
      })
    ).toEqual(['Bambu 01.08.02.00']);
  });

  it('falls back to the Klipper and Moonraker versions an older bridge sends', () => {
    expect(
      connectionSoftware({
        klipperVersion: 'v0.12.0-123',
        moonrakerVersion: 'v0.9.3',
      })
    ).toEqual(['Klipper v0.12.0-123', 'Moonraker v0.9.3']);
  });

  it('prefers the generic fields over the legacy ones', () => {
    expect(
      connectionSoftware({
        firmwareName: 'Klipper',
        firmwareVersion: 'v0.13.0',
        klipperVersion: 'v0.12.0',
        moonrakerVersion: 'v0.9.3',
      })
    ).toEqual(['Klipper v0.13.0', 'Moonraker v0.9.3']);
  });

  it('shows a name without its version, and drops a version without a name', () => {
    expect(
      connectionSoftware({
        firmwareName: 'Bambu',
        hostSoftwareVersion: '2.1.2',
      })
    ).toEqual(['Bambu']);
  });

  it('treats blank values as missing', () => {
    expect(
      connectionSoftware({
        firmwareName: '  ',
        firmwareVersion: '6.2.1',
        klipperVersion: '',
      })
    ).toEqual([]);
  });

  it('is empty for an API from before the health fields', () => {
    expect(connectionSoftware({})).toEqual([]);
  });
});
