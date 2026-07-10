import { isDevAnonymous } from './dev-anonymous';

describe('isDevAnonymous', () => {
  afterEach(() => {
    sessionStorage.removeItem('devAnonymous');
  });

  it('returns false with no param and no stored flag', () => {
    expect(isDevAnonymous('')).toBeFalse();
  });

  it('returns false for a normal devUserId', () => {
    expect(isDevAnonymous('?devUserId=2')).toBeFalse();
  });

  it('returns true and persists the flag when devUserId=anonymous is present', () => {
    expect(isDevAnonymous('?devUserId=anonymous')).toBeTrue();
    expect(sessionStorage.getItem('devAnonymous')).toBe('true');
  });

  it('returns true from the stored flag after the param drops', () => {
    isDevAnonymous('?devUserId=anonymous');
    expect(isDevAnonymous('')).toBeTrue();
  });
});
