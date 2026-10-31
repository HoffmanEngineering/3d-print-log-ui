import { isEmailPreferenceEnabled } from './email-preference';

describe('isEmailPreferenceEnabled', () => {
  it('treats a missing setting as on', () => {
    expect(isEmailPreferenceEnabled(undefined)).toBe(true);
    expect(isEmailPreferenceEnabled(null)).toBe(true);
    expect(isEmailPreferenceEnabled('')).toBe(true);
  });

  it('is on only for "true" once set', () => {
    expect(isEmailPreferenceEnabled('true')).toBe(true);
    expect(isEmailPreferenceEnabled('false')).toBe(false);
    expect(isEmailPreferenceEnabled('nonsense')).toBe(false);
  });
});
