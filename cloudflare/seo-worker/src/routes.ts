export type SeoKind = 'print' | 'project' | 'profile';

export interface SeoRoute {
  kind: SeoKind;
  /** The id exactly as it appears in the path. */
  id: string;
  /** The API path of the matching metadata, such as `/api/Prints/123/seo`. */
  seoPath: string;
}

// Print and user ids are 64-bit integers (at most 19 digits); project ids are GUIDs, which
// is what the app's /projects/:id route and the API's Projects/{id:Guid} take.
const DIGITS = '([0-9]{1,19})';
const GUID =
  '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})';

const ROUTES: { pattern: RegExp; kind: SeoKind; api: string }[] = [
  {
    pattern: new RegExp(`^/prints/${DIGITS}/?$`),
    kind: 'print',
    api: 'Prints',
  },
  {
    pattern: new RegExp(`^/projects/${GUID}/?$`),
    kind: 'project',
    api: 'Projects',
  },
  // The achievements tab belongs to the same profile, so it gets the profile's metadata.
  {
    pattern: new RegExp(`^/users/${DIGITS}(?:/achievements)?/?$`),
    kind: 'profile',
    api: 'Users',
  },
];

/**
 * The public page a path is, or null for every other path (new, edit, copy, list pages,
 * non-numeric ids), which the Worker passes straight to the origin. Matches the path only:
 * a query string such as `?utm_source=…` does not change which page it is.
 */
export function matchSeoRoute(pathname: string): SeoRoute | null {
  for (const route of ROUTES) {
    const match = route.pattern.exec(pathname);
    if (match) {
      const id = match[1]!;
      return { kind: route.kind, id, seoPath: `/api/${route.api}/${id}/seo` };
    }
  }
  return null;
}
