import { ogImage, siteUrl } from '../../slicer/slicer-configs';
import { PRO_CURRENCY, PRO_PLANS } from '../pricing/pro-pricing';

/** Stable @id for the brand Organization, referenced by other schema nodes. */
export const ORGANIZATION_ID = `${siteUrl('')}#organization`;

/** Stable @id for the company behind the brand. */
export const PARENT_ORGANIZATION_ID =
  'https://www.hoffman.engineering/#organization';

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.hoffmanengineering.printlog';

export const SUPPORT_EMAIL = 'hello@3dprintlog.com';

/**
 * Profiles that identify 3D Print Log itself: the GitHub organization that
 * publishes its source, and its Play Store listing. Add a Wikidata item here
 * if one is ever created.
 */
export const ORGANIZATION_SAME_AS: readonly string[] = [
  'https://github.com/HoffmanEngineering',
  PLAY_STORE_URL,
];

/**
 * Hoffman Engineering's channels, as linked from /docs/about. These belong to
 * the company, not the product, so they sit on the parent organization.
 * Personal accounts on that page (Twitter, LinkedIn) are left out: they
 * identify a person, not either organization.
 */
export const PARENT_ORGANIZATION_SAME_AS: readonly string[] = [
  'https://www.youtube.com/hoffmanengineering',
  'https://www.facebook.com/Hoffman3DPrinting',
  'https://www.instagram.com/hoffmanengineering/',
  'https://www.patreon.com/HoffmanEngineering',
];

export function buildOrganization(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: '3D Print Log',
    url: siteUrl(''),
    logo: ogImage,
    email: SUPPORT_EMAIL,
    sameAs: [...ORGANIZATION_SAME_AS],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SUPPORT_EMAIL,
      url: siteUrl('docs/contact'),
      availableLanguage: 'English',
    },
    parentOrganization: {
      '@type': 'Organization',
      '@id': PARENT_ORGANIZATION_ID,
      name: 'Hoffman Engineering',
      url: 'https://www.hoffman.engineering/',
      sameAs: [...PARENT_ORGANIZATION_SAME_AS],
    },
  };
}

/**
 * Free, then one Offer per Pro plan. Each paid Offer carries a
 * UnitPriceSpecification so the billing period is machine-readable, not only
 * implied by the name.
 */
export function buildOffers(): Record<string, unknown>[] {
  return [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: PRO_CURRENCY,
      url: siteUrl(''),
    },
    ...PRO_PLANS.map((plan) => ({
      '@type': 'Offer',
      name: `Pro ${plan.label}`,
      price: plan.price,
      priceCurrency: PRO_CURRENCY,
      url: siteUrl('docs/pro-subscription'),
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: plan.price,
        priceCurrency: PRO_CURRENCY,
        billingDuration: plan.billingDuration,
        unitCode: plan.unitCode,
      },
    })),
  ];
}

export function buildSoftwareApplication(
  description: string
): Record<string, unknown> {
  return {
    '@type': 'WebApplication',
    name: '3D Print Log',
    description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript.',
    url: siteUrl(''),
    image: ogImage,
    offers: buildOffers(),
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/**
 * The Android app. Its Play Store listing prices it at 0; that install price
 * is the only one stated here; the Pro plans sit on the WebApplication.
 */
export function buildMobileApplication(
  description: string
): Record<string, unknown> {
  return {
    '@type': 'MobileApplication',
    name: '3D Print Log',
    description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Android',
    url: PLAY_STORE_URL,
    installUrl: PLAY_STORE_URL,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    publisher: { '@id': ORGANIZATION_ID },
  };
}
