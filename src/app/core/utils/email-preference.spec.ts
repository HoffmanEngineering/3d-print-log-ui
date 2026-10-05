import { isEmailPreferenceEnabled } from './email-preference';

describe('isEmailPreferenceEnabled', () => {
  it('treats a missing setting as on', () => {
    expect(isEmailPreferenceEnabled(undefined)).toBeTrue();
    expect(isEmailPreferenceEnabled(null)).toBeTrue();
    expect(isEmailPreferenceEnabled('')).toBeTrue();
  });

  it('is on only for "true" once set', () => {
    expect(isEmailPreferenceEnabled('true')).toBeTrue();
    expect(isEmailPreferenceEnabled('false')).toBeFalse();
    expect(isEmailPreferenceEnabled('nonsense')).toBeFalse();
  });
});
