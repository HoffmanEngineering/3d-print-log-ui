import { describe, expect, it } from 'vitest';
import { matchSeoRoute } from '../src/routes';

const GUID = '5b0c8d2e-1f3a-4b5c-9d6e-7f8091a2b3c4';

describe('matchSeoRoute', () => {
  it.each([
    ['/prints/123', 'print', '123', '/api/Prints/123/seo'],
    ['/prints/123/', 'print', '123', '/api/Prints/123/seo'],
    [`/projects/${GUID}`, 'project', GUID, `/api/Projects/${GUID}/seo`],
    [`/projects/${GUID}/`, 'project', GUID, `/api/Projects/${GUID}/seo`],
    [
      `/projects/${GUID.toUpperCase()}`,
      'project',
      GUID.toUpperCase(),
      `/api/Projects/${GUID.toUpperCase()}/seo`,
    ],
    ['/users/7', 'profile', '7', '/api/Users/7/seo'],
    ['/users/7/', 'profile', '7', '/api/Users/7/seo'],
    ['/users/7/achievements', 'profile', '7', '/api/Users/7/seo'],
    ['/users/7/achievements/', 'profile', '7', '/api/Users/7/seo'],
  ])('%s is a %s page', (path, kind, id, seoPath) => {
    expect(matchSeoRoute(path)).toEqual({ kind, id, seoPath });
  });

  it.each([
    '/',
    '/prints',
    '/prints/',
    '/prints/new',
    '/prints/new/cura',
    '/prints/123/edit',
    '/prints/copy/123',
    '/prints/12a',
    '/prints/-1',
    '/prints/1.5',
    '/prints/123//',
    '/prints//123',
    '/prints/%31%32',
    '/prints/123/nope',
    '/PRINTS/123',
    '/projects',
    '/projects/123',
    '/projects/not-a-guid',
    `/projects/${GUID}/edit`,
    `/projects/${GUID}x`,
    '/users',
    '/users/ada',
    '/users/7/achievements/1',
    '/users/7/settings',
    '/users/not-found',
    '/printers/1',
    '/docs/prints',
    // A numeric id with more digits than a 64-bit id can hold is not an id.
    '/prints/99999999999999999999',
  ])('%s passes through', (path) => {
    expect(matchSeoRoute(path)).toBeNull();
  });
});
