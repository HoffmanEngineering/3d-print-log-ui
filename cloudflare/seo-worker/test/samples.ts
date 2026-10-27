// /seo responses taken from the API contract (3d-print-log-api #285, SeoMetadataDto).

export const PRINT_SEO = {
  type: 'print',
  title: 'Benchy | 3D Print Log',
  description: 'Printed in two colors with a 0.4 nozzle.',
  canonicalUrl: 'https://www.3dprintlog.com/prints/123',
  image: {
    url: 'https://api.3dprintlog.com/api/Prints/123/social-image?v=3f2a9c1b7d4e',
    width: 1200,
    height: 750,
    alt: 'Benchy',
  },
  author: { name: 'Ada Maker', url: 'https://www.3dprintlog.com/users/7' },
  publishedAt: '2026-10-03T14:05:00+00:00',
  updatedAt: '2026-10-20T09:12:00+00:00',
  facts: [
    { label: 'Printer', value: 'Prusa MK4' },
    { label: 'Material', value: 'Galaxy Black PLA (Black)' },
    { label: 'Print time', value: '1h 30m' },
    { label: 'Status', value: 'Success' },
  ],
};

export const PROJECT_SEO = {
  type: 'project',
  title: 'Desk organizer | 3D Print Log',
  description:
    'Desk organizer, a 3D printing project by Ada Maker with 2 prints',
  canonicalUrl:
    'https://www.3dprintlog.com/projects/5b0c8d2e-1f3a-4b5c-9d6e-7f8091a2b3c4',
  image: {
    url: 'https://api.3dprintlog.com/api/Projects/5b0c8d2e-1f3a-4b5c-9d6e-7f8091a2b3c4/social-image?v=9e1d0a44c2b7',
    width: 800,
    height: 1200,
    alt: 'Desk organizer',
  },
  author: { name: 'Ada Maker', url: 'https://www.3dprintlog.com/users/7' },
  publishedAt: '2026-09-01T12:00:00+00:00',
  updatedAt: '2026-10-20T09:12:00+00:00',
  facts: [
    { label: 'Prints', value: '2' },
    { label: 'Status', value: 'In progress' },
  ],
};

export const PROFILE_SEO = {
  type: 'profile',
  title: 'Ada Maker Profile | 3D Print Log',
  description: "View Ada Maker's 3D prints and projects on 3DPrintLog.com",
  canonicalUrl: 'https://www.3dprintlog.com/users/7',
  image: {
    url: 'https://lh3.googleusercontent.com/a/abc123',
    width: null,
    height: null,
    alt: "Ada Maker's profile picture",
  },
  author: { name: 'Ada Maker', url: 'https://www.3dprintlog.com/users/7' },
  publishedAt: '2025-05-01T00:00:00+00:00',
  updatedAt: null,
  facts: [{ label: 'Public prints', value: '42' }],
};

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
