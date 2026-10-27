import { inject, Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/** `print`, `project` or `profile`: the kinds of public page the API describes. */
export type SeoPageType = 'print' | 'project' | 'profile';

/**
 * The API's `SeoMetadataDto` (`GET /api/{Prints,Projects,Users}/{id}/seo`), after validation.
 * The Cloudflare Worker (`cloudflare/seo-worker`) reads the same endpoint and writes the same
 * tags into the shell for crawlers; `MetaTagService.applySeoMetadata` writes them again after
 * the app boots, so both describe a page the same way.
 */
export interface SeoMetadata {
  type: SeoPageType;
  /** Already ends in ` | 3D Print Log`. */
  title: string;
  description: string;
  canonicalUrl: string;
  image: SeoImage | null;
  author: { name: string; url: string | null } | null;
  publishedAt: string | null;
  updatedAt: string | null;
  facts: { label: string; value: string }[];
}

export interface SeoImage {
  /** Absolute http(s) URL. */
  url: string;
  width: number | null;
  height: number | null;
  alt: string | null;
}

/**
 * - `ok`: the page is Public; here is its metadata.
 * - `not-public`: the API's own 404. The page is private, unlisted or missing (the API does not
 *   say which, even to the owner), so it must not be indexed.
 * - `unavailable`: no answer worth acting on: an API without `/seo` (the API and UI release
 *   separately), a network error, a 5xx, an unexpected body. The page keeps its client-side
 *   metadata and robots tags as they were.
 */
export type SeoLookup =
  | { kind: 'ok'; seo: SeoMetadata }
  | { kind: 'not-public' }
  | { kind: 'unavailable' };

/** The answer before the request has settled. */
export const SEO_PENDING = { kind: 'pending' } as const;
export type SeoLookupState = SeoLookup | typeof SEO_PENDING;

const UNAVAILABLE: SeoLookup = { kind: 'unavailable' };
const PAGE_TYPES: readonly SeoPageType[] = ['print', 'project', 'profile'];

/**
 * The route-not-found 404 of an API that has no `/seo` endpoint carries this detail
 * (`ProblemDetailsStatusCodePages` in the API). SeoController's own 404 has none. The Worker
 * draws the same line (`cloudflare/seo-worker/src/seo.ts`).
 */
const NO_ENDPOINT = 'No endpoint exists at this path';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly http = inject(HttpClient);
  private readonly baseApi = environment.printLogApiUrl;

  forPrint(printId: number): Observable<SeoLookup> {
    return this.lookup(`/api/Prints/${printId}/seo`);
  }

  forProject(projectId: string): Observable<SeoLookup> {
    return this.lookup(`/api/Projects/${encodeURIComponent(projectId)}/seo`);
  }

  forUser(userId: number): Observable<SeoLookup> {
    return this.lookup(`/api/Users/${userId}/seo`);
  }

  /** Never errors: every failure is `unavailable`. */
  private lookup(path: string): Observable<SeoLookup> {
    // Anonymous endpoint. The interceptor still adds a token for a signed-in user, which is
    // harmless; without this header it would reject the request for a logged-out visitor.
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');
    return this.http.get<unknown>(`${this.baseApi}${path}`, { headers }).pipe(
      map((body): SeoLookup => {
        const seo = parseSeo(body);
        return seo ? { kind: 'ok', seo } : UNAVAILABLE;
      }),
      catchError((err: unknown) => of(classifyError(err)))
    );
  }
}

function classifyError(err: unknown): SeoLookup {
  if (!(err instanceof HttpErrorResponse) || err.status !== 404) {
    return UNAVAILABLE;
  }
  const body: unknown = err.error;
  const text =
    typeof body === 'string'
      ? body
      : isObject(body) && typeof body['detail'] === 'string'
        ? body['detail']
        : '';
  return text.includes(NO_ENDPOINT) ? UNAVAILABLE : { kind: 'not-public' };
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function size(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function httpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function parseImage(value: unknown): SeoImage | null {
  if (!isObject(value)) return null;
  const url = httpUrl(value['url']);
  if (!url) return null;
  return {
    url,
    width: size(value['width']),
    height: size(value['height']),
    alt: text(value['alt']),
  };
}

/** The metadata, or null when the body is not something the page can use. */
function parseSeo(body: unknown): SeoMetadata | null {
  if (!isObject(body)) return null;
  const type = body['type'];
  const title = text(body['title']);
  const canonicalUrl = httpUrl(body['canonicalUrl']);
  if (
    typeof type !== 'string' ||
    !PAGE_TYPES.includes(type as SeoPageType) ||
    !title ||
    !canonicalUrl
  ) {
    return null;
  }

  const author = isObject(body['author']) ? body['author'] : null;
  const authorName = author ? text(author['name']) : null;
  const facts = Array.isArray(body['facts']) ? body['facts'] : [];

  return {
    type: type as SeoPageType,
    title,
    description: text(body['description']) ?? '',
    canonicalUrl,
    image: parseImage(body['image']),
    author: authorName
      ? { name: authorName, url: httpUrl(author!['url']) }
      : null,
    publishedAt: text(body['publishedAt']),
    updatedAt: text(body['updatedAt']),
    facts: facts
      .filter(isObject)
      .map((f) => ({ label: text(f['label']), value: text(f['value']) }))
      .filter((f): f is { label: string; value: string } =>
        Boolean(f.label && f.value)
      ),
  };
}
