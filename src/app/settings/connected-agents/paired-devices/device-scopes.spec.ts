import { describeDeviceScopes } from './device-scopes';

describe('describeDeviceScopes', () => {
  it('describes the bridge scopes in plain words, in a fixed order', () => {
    expect(
      describeDeviceScopes([
        'connections:write',
        'printers:slots',
        'prints:write',
      ])
    ).toBe('Log prints, update printer slots, send heartbeats');
  });

  it('maps every scope in the API contract', () => {
    expect(
      describeDeviceScopes([
        'connections:write',
        'files:write',
        'filaments:read',
        'printers:create',
        'printers:read',
        'printers:slots',
        'prints:read',
        'prints:write',
      ])
    ).toBe(
      'Log prints, see prints, see printers, add printers, update printer slots, see materials, upload print files, send heartbeats'
    );
  });

  it('keeps an unknown scope as it is, after the known ones', () => {
    expect(describeDeviceScopes(['filaments:usage', 'prints:write'])).toBe(
      'Log prints, filaments:usage'
    );
  });

  it('ignores duplicates', () => {
    expect(describeDeviceScopes(['prints:write', 'prints:write'])).toBe(
      'Log prints'
    );
  });

  it('says so when there are no scopes', () => {
    expect(describeDeviceScopes([])).toBe('No permissions');
  });
});
