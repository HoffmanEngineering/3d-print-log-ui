import {
  actionUrlFragment,
  actionUrlPath,
  actionUrlQueryParams,
} from './action-url';

describe('action URL parts', () => {
  it('splits path, query and fragment', () => {
    const url = '/achievements?badge=first-print&tier=2#top';
    expect(actionUrlPath(url)).toBe('/achievements');
    expect(actionUrlQueryParams(url)).toEqual({
      badge: 'first-print',
      tier: '2',
    });
    expect(actionUrlFragment(url)).toBe('top');
  });

  it('handles a fragment without a query', () => {
    expect(actionUrlPath('/prints/4#comment-9')).toBe('/prints/4');
    expect(actionUrlQueryParams('/prints/4#comment-9')).toBeNull();
    expect(actionUrlFragment('/prints/4#comment-9')).toBe('comment-9');
  });

  it('handles a bare path and null', () => {
    expect(actionUrlPath('/prints/4')).toBe('/prints/4');
    expect(actionUrlQueryParams('/prints/4')).toBeNull();
    expect(actionUrlFragment('/prints/4')).toBeNull();
    expect(actionUrlPath(null)).toBeNull();
    expect(actionUrlQueryParams(null)).toBeNull();
    expect(actionUrlFragment(null)).toBeNull();
  });
});
