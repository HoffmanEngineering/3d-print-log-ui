import { ogImage, siteUrl } from '../../slicer/slicer-configs';

/** Stable @id for the brand Organization, referenced by other schema nodes. */
export const ORGANIZATION_ID = `${siteUrl('')}#organization`;

export function buildOrganization(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: '3D Print Log',
    url: siteUrl(''),
    logo: ogImage,
  };
}

export function buildSoftwareApplication(): Record<string, unknown> {
  return {
    '@type': 'WebApplication',
    name: '3D Print Log',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web, Android',
    url: siteUrl(''),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': ORGANIZATION_ID },
  };
}
