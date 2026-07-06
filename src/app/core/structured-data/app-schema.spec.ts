import {
  ORGANIZATION_ID,
  buildOrganization,
  buildSoftwareApplication,
} from './app-schema';

describe('app-schema', () => {
  it('ORGANIZATION_ID is the homepage url with an #organization fragment', () => {
    expect(ORGANIZATION_ID).toBe('https://www.3dprintlog.com/#organization');
  });

  it('buildOrganization returns an Organization with @id, name, url, logo', () => {
    const org = buildOrganization();
    expect(org['@type']).toBe('Organization');
    expect(org['@id']).toBe(ORGANIZATION_ID);
    expect(org['name']).toBe('3D Print Log');
    expect(org['url']).toBe('https://www.3dprintlog.com/');
    expect(typeof org['logo']).toBe('string');
  });

  it('buildSoftwareApplication returns a free WebApplication linked to the org', () => {
    const app = buildSoftwareApplication();
    expect(app['@type']).toBe('WebApplication');
    expect(app['name']).toBe('3D Print Log');
    expect(app['applicationCategory']).toBe('UtilitiesApplication');
    expect(app['offers']).toEqual({
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    });
    expect(app['publisher']).toEqual({ '@id': ORGANIZATION_ID });
    expect(app['aggregateRating']).toBeUndefined();
  });
});
