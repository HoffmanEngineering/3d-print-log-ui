import {
  ORGANIZATION_ID,
  PLAY_STORE_URL,
  buildMobileApplication,
  buildOffers,
  buildOrganization,
  buildSoftwareApplication,
} from './app-schema';
import { PRO_PLANS } from '../pricing/pro-pricing';

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

  it('buildOrganization links the brand to its official profiles', () => {
    const sameAs = buildOrganization()['sameAs'] as string[];
    expect(sameAs).toContain('https://github.com/HoffmanEngineering');
    expect(sameAs).toContain(PLAY_STORE_URL);
    for (const url of sameAs) {
      expect(new URL(url).protocol).toBe('https:');
    }
  });

  it('buildOrganization has a support contactPoint and no address', () => {
    const org = buildOrganization();
    expect(org['contactPoint']).toEqual(
      jasmine.objectContaining({
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'hello@3dprintlog.com',
      })
    );
    // Deliberately unpublished (#212, #217): it would be a home address.
    expect(org['address']).toBeUndefined();
  });

  it('buildOrganization names Hoffman Engineering as the parent organization', () => {
    const parent = buildOrganization()['parentOrganization'] as Record<
      string,
      unknown
    >;
    expect(parent['@type']).toBe('Organization');
    expect(parent['name']).toBe('Hoffman Engineering');
    expect((parent['sameAs'] as string[]).length).toBeGreaterThan(0);
  });

  it('buildOffers lists Free, then every Pro plan with its billing period', () => {
    const offers = buildOffers();
    expect(offers.length).toBe(1 + PRO_PLANS.length);
    expect(offers[0]).toEqual(
      jasmine.objectContaining({
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
      })
    );
    PRO_PLANS.forEach((plan, i) => {
      const offer = offers[i + 1];
      expect(offer['@type']).toBe('Offer');
      expect(offer['price']).toBe(plan.price);
      expect(offer['priceCurrency']).toBe('USD');
      expect(offer['priceSpecification']).toEqual({
        '@type': 'UnitPriceSpecification',
        price: plan.price,
        priceCurrency: 'USD',
        billingDuration: plan.billingDuration,
        unitCode: plan.unitCode,
      });
    });
  });

  it('buildSoftwareApplication returns a described WebApplication linked to the org', () => {
    const app = buildSoftwareApplication('A description.');
    expect(app['@type']).toBe('WebApplication');
    expect(app['name']).toBe('3D Print Log');
    expect(app['description']).toBe('A description.');
    expect(app['applicationCategory']).toBe('UtilitiesApplication');
    expect(app['offers']).toEqual(buildOffers());
    expect(app['publisher']).toEqual({ '@id': ORGANIZATION_ID });
    expect(app['aggregateRating']).toBeUndefined();
  });

  it('buildMobileApplication describes the free Android app', () => {
    const app = buildMobileApplication('A description.');
    expect(app['@type']).toBe('MobileApplication');
    expect(app['operatingSystem']).toBe('Android');
    expect(app['url']).toBe(PLAY_STORE_URL);
    expect(app['description']).toBe('A description.');
    expect(app['offers']).toEqual({
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    });
    expect(app['publisher']).toEqual({ '@id': ORGANIZATION_ID });
    expect(app['aggregateRating']).toBeUndefined();
  });
});
