import { isDevAnonymous, resolveDevUserId } from './dev-user';

describe('resolveDevUserId', () => {
  afterEach(() => {
    sessionStorage.removeItem('devUserId');
  });

  it('defaults to user 1 with no param and nothing stored', () => {
    expect(resolveDevUserId('')).toBe('1');
  });

  it('returns and persists the id from the query param', () => {
    expect(resolveDevUserId('?devUserId=10')).toBe('10');
    expect(sessionStorage.getItem('devUserId')).toBe('10');
  });

  it('returns the stored id after the param drops', () => {
    resolveDevUserId('?devUserId=10');
    expect(resolveDevUserId('')).toBe('10');
  });

  it('switches users when a different id is supplied', () => {
    resolveDevUserId('?devUserId=10');
    expect(resolveDevUserId('?devUserId=3')).toBe('3');
    expect(resolveDevUserId('')).toBe('3');
  });

  it('clears the override for an empty param', () => {
    resolveDevUserId('?devUserId=10');
    expect(resolveDevUserId('?devUserId=')).toBe('1');
    expect(resolveDevUserId('')).toBe('1');
  });
});

describe('isDevAnonymous', () => {
  afterEach(() => {
    sessionStorage.removeItem('devUserId');
  });

  it('returns false with no param and nothing stored', () => {
    expect(isDevAnonymous('')).toBeFalse();
  });

  it('returns false for a normal devUserId', () => {
    expect(isDevAnonymous('?devUserId=2')).toBeFalse();
  });

  it('returns true and persists the value when devUserId=anonymous is present', () => {
    expect(isDevAnonymous('?devUserId=anonymous')).toBeTrue();
    expect(sessionStorage.getItem('devUserId')).toBe('anonymous');
  });

  it('returns true from the stored value after the param drops', () => {
    isDevAnonymous('?devUserId=anonymous');
    expect(isDevAnonymous('')).toBeTrue();
  });
});
