import { environment } from 'src/environments/environment';

/**
 * An absolute URL for a path the API returns relative to its own base, such as the
 * `thumbnailUrl` fields on print and project DTOs (`/api/Prints/1/image/2/thumbnail`).
 * Undefined when the API sent none, which an API older than those fields always does: callers
 * fall back to the full image URL they build from the image id.
 */
export function apiUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${environment.printLogApiUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}
