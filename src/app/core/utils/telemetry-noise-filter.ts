/** The parts of an Application Insights telemetry item the noise filter reads. */
export interface TelemetryNoiseItem {
  baseType?: string;
  baseData?: Record<string, unknown>;
}

export interface TelemetryNoiseFilterOptions {
  /** The app's own origin, e.g. https://www.3dprintlog.com. */
  appOrigin: string;
  /** The API's base URL (environment.printLogApiUrl). */
  apiUrl: string;
  /** The Auth0 domain from the environment, in case it is a custom domain. */
  authDomain?: string;
}

/**
 * Exception messages that come from third-party scripts or the browser, never from the app:
 * Google's ad and analytics tags, and browser warnings the SDK records as errors. Matched
 * only when no stack frame points at the app's own origin.
 */
const THIRD_PARTY_EXCEPTION_PATTERNS: readonly RegExp[] = [
  // Thrown inside Google's tags (seen as "Uncaught Error: int64").
  /(^|[\s:])int64$/i,
  // AdSense: adsbygoogle.push() errors and its TagError type.
  /adsbygoogle/i,
  /\bTagError\b/,
  // A browser notice, not an error: a ResizeObserver callback resized what it observed.
  /ResizeObserver loop/i,
  // A cross-origin script threw; the browser hides everything but this text.
  /^(Uncaught )?Script error\b/i,
];

/**
 * Builds a predicate for an Application Insights telemetry initializer: true means the item is
 * third-party noise and should be dropped (the initializer returns false).
 *
 * - A dependency (fetch/XHR) is kept only when its host is the API, the app's own origin or
 *   Auth0 (*.auth0.com or the configured domain). Ad blockers make Google's analytics and ad
 *   calls fail by the thousand, and those are neither ours to fix nor cheap to ingest.
 * - An exception is dropped only when it matches a known third-party pattern AND none of its
 *   stack frames comes from the app's origin.
 *
 * Anything the filter cannot read is kept: a missing real error costs more than noise.
 */
export function createTelemetryNoiseFilter(
  options: TelemetryNoiseFilterOptions
): (item: TelemetryNoiseItem) => boolean {
  const appUrl = new URL(options.appOrigin);
  const appOrigin = appUrl.origin.toLowerCase();
  const allowedHosts = new Set<string>(
    [appUrl.hostname, hostnameOf(options.apiUrl), options.authDomain]
      .filter((h): h is string => !!h)
      .map((h) => h.toLowerCase())
  );

  const isAllowedHost = (hostname: string) =>
    allowedHosts.has(hostname) ||
    hostname === 'auth0.com' ||
    hostname.endsWith('.auth0.com');

  const dependencyIsNoise = (data: Record<string, unknown>): boolean => {
    const target = data['target'];
    if (typeof target !== 'string' || target.trim() === '') {
      return false;
    }
    // A correlated target can carry " | cid-v1:…" after the URL.
    const url = target.split(' | ')[0].trim();
    const hostname = dependencyHostname(url, appUrl);
    if (hostname === null) {
      return false;
    }
    return !isAllowedHost(hostname);
  };

  const exceptionIsNoise = (data: Record<string, unknown>): boolean => {
    const exceptions = data['exceptions'];
    if (!Array.isArray(exceptions) || exceptions.length === 0) {
      return false;
    }
    return exceptions.every((ex) => {
      if (!ex || typeof ex !== 'object') {
        return false;
      }
      const details = ex as Record<string, unknown>;
      if (hasAppFrame(details, appOrigin)) {
        return false;
      }
      const typeName = String(details['typeName'] ?? '');
      const message = String(details['message'] ?? '').trim();
      return THIRD_PARTY_EXCEPTION_PATTERNS.some(
        (pattern) => pattern.test(message) || pattern.test(typeName)
      );
    });
  };

  return (item) => {
    const data = item.baseData;
    if (!data) {
      return false;
    }
    switch (item.baseType) {
      case 'RemoteDependencyData':
        return dependencyIsNoise(data);
      case 'ExceptionData':
        return exceptionIsNoise(data);
      default:
        return false;
    }
  };
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * The host a dependency target points at. A target is normally an absolute URL, but the SDK
 * may also hand over a bare host ("api.3dprintlog.com/api/Prints") or a relative path.
 */
function dependencyHostname(target: string, appUrl: URL): string | null {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(target)) {
    return hostnameOf(target)?.toLowerCase() ?? null;
  }
  if (target.startsWith('/')) {
    return hostnameOf(new URL(target, appUrl).href)?.toLowerCase() ?? null;
  }
  return hostnameOf(`https://${target}`)?.toLowerCase() ?? null;
}

function hasAppFrame(
  details: Record<string, unknown>,
  appOrigin: string
): boolean {
  const stack = details['stack'];
  if (typeof stack === 'string' && stack.toLowerCase().includes(appOrigin)) {
    return true;
  }
  const frames = details['parsedStack'];
  if (!Array.isArray(frames)) {
    return false;
  }
  return frames.some((frame) => {
    const fileName = (frame as Record<string, unknown> | null)?.['fileName'];
    return (
      typeof fileName === 'string' && fileName.toLowerCase().includes(appOrigin)
    );
  });
}
