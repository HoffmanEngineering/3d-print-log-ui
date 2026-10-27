import { HttpErrorResponse } from '@angular/common/http';
import {
  appPrinterSnippet,
  bridgeErrorCode,
  bridgeErrorMessage,
  credentialFieldLabel,
  credentialIssueMessage,
  credentialProblemMessage,
  credentialSummary,
  formatAddress,
  isKeyErrorCode,
  isScanning,
  moveCredentialPlan,
  missingMoveCredential,
  problemFields,
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
      expect(message).toContain('Move');
    });

    it('names where the printer went for printer_moved', () => {
      const message = bridgeErrorMessage(
        problem(409, 'printer_moved', { bridgeId: 9 }),
        nameOf
      );
      expect(message).toContain('Workshop Pi');
      expect(
        bridgeErrorMessage(problem(409, 'printer_moved'), nameOf)
      ).toContain('another bridge');
    });

    it('lists the credentials a move needs for secrets_required', () => {
      const message = bridgeErrorMessage(
        problem(400, 'secrets_required', { fields: ['access_code'] }),
        nameOf
      );
      expect(message).toContain('access code');
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
      'invalid_target_bridge',
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

  describe('sealed credential errors', () => {
    const codes = [
      'invalid_secret_field',
      'invalid_sealed_value',
      'invalid_key_fingerprint',
      'bridge_key_missing',
      'bridge_key_unconfirmed',
      'bridge_key_changed',
      'no_pending_key',
      'pending_key_changed',
    ];
    for (const code of codes) {
      it(`has its own sentence for ${code}`, () => {
        const message = bridgeErrorMessage(problem(409, code), nameOf);
        expect(message).not.toBe('Something went wrong. Please try again.');
      });
    }

    it('never repeats a fingerprint the problem carries', () => {
      const message = bridgeErrorMessage(
        problem(409, 'bridge_key_changed', { keyFingerprint: 'ab'.repeat(32) }),
        nameOf
      );
      expect(message).not.toContain('abab');
    });

    it('treats the three key problems as "reload the bridge"', () => {
      expect(isKeyErrorCode('bridge_key_changed')).toBeTrue();
      expect(isKeyErrorCode('bridge_key_unconfirmed')).toBeTrue();
      expect(isKeyErrorCode('bridge_key_missing')).toBeTrue();
      expect(isKeyErrorCode('invalid_sealed_value')).toBeFalse();
      expect(isKeyErrorCode(null)).toBeFalse();
    });
  });

  describe('credential labels and issues', () => {
    it('labels each field', () => {
      expect(credentialFieldLabel('access_code')).toBe('Access code');
      expect(credentialFieldLabel('password')).toBe('Password');
      expect(credentialFieldLabel('username')).toBe('Username');
      expect(credentialFieldLabel('api_key')).toBe('API key');
      expect(credentialFieldLabel('moonraker_api_key')).toBe('API key');
    });

    it('says a refused access code in plain words', () => {
      expect(
        credentialIssueMessage('bambu', 'access_code', 'rejected_by_printer')
      ).toContain('The printer refused this access code');
    });

    it('says PrusaLink takes a password or an API key when missing', () => {
      expect(
        credentialIssueMessage('prusalink', 'password', 'missing')
      ).toContain('or an API key');
    });

    it('asks again for undecryptable and invalid values', () => {
      expect(
        credentialIssueMessage(
          'moonraker',
          'moonraker_api_key',
          'undecryptable'
        )
      ).toContain('Enter it again');
      expect(
        credentialIssueMessage('octoprint', 'api_key', 'invalid_plaintext')
      ).toContain('Enter it again');
    });

    it('still says something for a code it does not know', () => {
      expect(
        credentialIssueMessage('bambu', 'access_code', 'new_code')
      ).toContain('access code');
    });

    it('explains each refused input without repeating it', () => {
      expect(credentialProblemMessage('empty', 'access_code')).toContain(
        'access code'
      );
      expect(credentialProblemMessage('too_long', 'password')).toContain('256');
      expect(
        credentialProblemMessage('control_character', 'password')
      ).toContain('line break');
      expect(credentialProblemMessage('invalid_text', 'password')).toBeTruthy();
    });
  });

  describe('credentialSummary', () => {
    const secret = (field: string, stale = false) => ({
      field,
      keyFingerprint: 'a'.repeat(64),
      updatedAt: '2026-10-27T18:05:00Z',
      stale,
    });

    it('is null for a kind without credentials or an older API', () => {
      expect(credentialSummary({ kind: 'sdcp', secretFields: [] })).toBeNull();
      expect(credentialSummary({ kind: 'bambu' })).toBeNull();
    });

    it('puts an issue first', () => {
      expect(
        credentialSummary({
          kind: 'bambu',
          secretFields: ['access_code'],
          secrets: [secret('access_code')],
          credentialIssues: [
            { field: 'access_code', code: 'rejected_by_printer' },
          ],
        })
      ).toEqual({
        text: jasmine.stringContaining('refused this access code'),
        attention: true,
      });
    });

    it('asks again for a stale value', () => {
      expect(
        credentialSummary({
          kind: 'bambu',
          secretFields: ['access_code'],
          secrets: [secret('access_code', true)],
          credentialIssues: [],
        })!.text
      ).toContain('Enter the access code again');
    });

    it('says what is set, or that nothing is', () => {
      expect(
        credentialSummary({
          kind: 'bambu',
          secretFields: ['access_code'],
          secrets: [],
        })
      ).toEqual({
        text: 'No access code entered in the app.',
        attention: false,
      });
      expect(
        credentialSummary({
          kind: 'prusalink',
          secretFields: ['password', 'username', 'api_key'],
          secrets: [secret('username'), secret('password')],
        })!.text
      ).toBe('Password and username set, encrypted to the bridge.');
    });
  });

  describe('moveCredentialPlan', () => {
    it('asks for each credential that was set, in the kind order, marking what is required', () => {
      const plan = moveCredentialPlan(
        'prusalink',
        ['password', 'username', 'api_key'],
        ['username', 'password']
      );
      expect(plan.fields.map((f) => [f.field, f.required])).toEqual([
        ['password', true],
        ['username', false],
      ]);
      expect(plan.groups).toEqual([['password']]);
    });

    it('needs one of a PrusaLink password or API key when both were set', () => {
      const plan = moveCredentialPlan(
        'prusalink',
        ['password', 'username', 'api_key'],
        ['api_key', 'password']
      );
      expect(plan.fields.map((f) => [f.field, f.required])).toEqual([
        ['password', false],
        ['api_key', false],
      ]);
      expect(plan.groups).toEqual([['password', 'api_key']]);
      expect(missingMoveCredential(plan, new Set())).toBe(
        'Enter the password or the API key: the new bridge needs it to watch the printer.'
      );
      expect(missingMoveCredential(plan, new Set(['api_key']))).toBeNull();
    });

    it('carries a Moonraker API key that was set, and nothing when none was', () => {
      const plan = moveCredentialPlan(
        'moonraker',
        ['moonraker_api_key'],
        ['moonraker_api_key']
      );
      expect(plan.groups).toEqual([['moonraker_api_key']]);
      expect(missingMoveCredential(plan, new Set())).toContain('API key');
      const none = moveCredentialPlan('bambu', ['access_code'], []);
      expect(none.fields).toEqual([]);
      expect(missingMoveCredential(none, new Set())).toBeNull();
    });

    it('adds fields the API asked for that the entry did not list', () => {
      const plan = moveCredentialPlan(
        'bambu',
        ['access_code'],
        [],
        ['access_code']
      );
      expect(plan.fields.map((f) => [f.field, f.required])).toEqual([
        ['access_code', true],
      ]);
    });

    it('reads the fields of a problem', () => {
      expect(
        problemFields(
          problem(400, 'secrets_required', { fields: ['password', 3] })
        )
      ).toEqual(['password']);
      expect(problemFields(problem(400, 'secrets_required'))).toEqual([]);
      expect(problemFields('nope')).toEqual([]);
    });
  });
});
