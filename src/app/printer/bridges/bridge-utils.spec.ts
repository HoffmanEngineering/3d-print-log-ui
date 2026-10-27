import { HttpErrorResponse } from '@angular/common/http';
import {
  appPrinterSnippet,
  bridgeErrorCode,
  bridgeErrorMessage,
  formatAddress,
  isScanning,
} from './bridge-utils';

describe('bridge-utils', () => {
  function problem(
    status: number,
    code?: string,
    extra: Record<string, unknown> = {}
  ): HttpErrorResponse {
    return new HttpErrorResponse({
      status,
      error: code ? { code, ...extra } : null,
    });
  }
  const nameOf = (id: number) => (id === 9 ? 'Workshop Pi' : null);

  describe('bridgeErrorMessage', () => {
    it('names the other bridge for printer_connected_elsewhere', () => {
      const message = bridgeErrorMessage(
        problem(409, 'printer_connected_elsewhere', { bridgeId: 9 }),
        nameOf
      );
      expect(message).toContain('Workshop Pi');
      expect(message).toContain('already');
    });

    it('falls back to "another bridge" when the bridge is unknown', () => {
      const message = bridgeErrorMessage(
        problem(409, 'printer_connected_elsewhere', { bridgeId: 77 }),
        nameOf
      );
      expect(message).toContain('another of your bridges');
    });

    it('names the bridge whose config file has the printer', () => {
      const message = bridgeErrorMessage(
        problem(409, 'printer_configured_on_bridge', { bridgeId: 9 }),
        nameOf
      );
      expect(message).toContain('Workshop Pi');
      expect(message).toContain('config file');
    });

    for (const code of [
      'printer_already_connected',
      'discovered_printer_already_connected',
      'bridge_printer_limit',
      'ignore_limit',
      'printer_not_found',
      'discovered_printer_not_found',
      'invalid_kind',
      'invalid_host',
      'invalid_port',
      'invalid_serial',
      'serial_required',
      'invalid_request',
    ]) {
      it(`has its own message for ${code}`, () => {
        const message = bridgeErrorMessage(problem(400, code), nameOf);
        expect(message).not.toBe(bridgeErrorMessage(problem(500), nameOf));
        expect(message.length).toBeGreaterThan(10);
      });
    }

    it('says the bridge is gone on a 404', () => {
      expect(bridgeErrorMessage(problem(404), nameOf)).toContain('revoked');
    });

    it('has a generic message for anything else', () => {
      expect(bridgeErrorMessage(new Error('boom'), nameOf)).toContain(
        'try again'
      );
    });
  });

  it('reads the code from a problem body', () => {
    expect(bridgeErrorCode(problem(409, 'ignore_limit'))).toBe('ignore_limit');
    expect(bridgeErrorCode(problem(500))).toBeNull();
    expect(bridgeErrorCode('nope')).toBeNull();
  });

  describe('isScanning', () => {
    it('is scanning while the request is newer than the last sweep', () => {
      expect(
        isScanning({
          scanRequestedAt: '2026-10-27T18:03:00+00:00',
          lastSweepAt: '2026-10-27T17:00:00Z',
        })
      ).toBeTrue();
    });

    it('is scanning when no sweep has happened yet', () => {
      expect(
        isScanning({
          scanRequestedAt: '2026-10-27T18:03:00+00:00',
          lastSweepAt: null,
        })
      ).toBeTrue();
    });

    it('is not scanning once the sweep is done or nothing was asked', () => {
      expect(
        isScanning({
          scanRequestedAt: '2026-10-27T18:03:00+00:00',
          lastSweepAt: '2026-10-27T18:04:11Z',
        })
      ).toBeFalse();
      expect(
        isScanning({ scanRequestedAt: null, lastSweepAt: null })
      ).toBeFalse();
    });
  });

  describe('appPrinterSnippet', () => {
    it('asks for a Bambu Lab access code under the entry id', () => {
      expect(appPrinterSnippet('bambu', 7)).toBe(
        '[app_printer 7]\naccess_code = 12345678'
      );
    });

    it('asks for a PrusaLink password', () => {
      expect(appPrinterSnippet('prusalink', 3)).toContain('[app_printer 3]');
      expect(appPrinterSnippet('prusalink', 3)).toContain('password = ');
    });

    it('needs nothing for Moonraker by default', () => {
      expect(appPrinterSnippet('moonraker', 3)).toBeNull();
    });
  });

  it('formats an address with its port', () => {
    expect(formatAddress('192.168.1.60', 8883)).toBe('192.168.1.60:8883');
    expect(formatAddress('mk4.local', null)).toBe('mk4.local');
    expect(formatAddress('fd00::5', 80)).toBe('[fd00::5]:80');
  });
});
