/** Worker configuration: `vars` in wrangler.jsonc. */
export interface Env {
  /** Base URL of the API that serves `/api/{Prints,Projects,Users}/{id}/seo`. */
  API_BASE_URL: string;
  /** The canonical site origin, such as `https://www.3dprintlog.com`. */
  SITE_ORIGIN: string;
  /** How long to wait for `/seo`, in milliseconds. Defaults to 1500. */
  SEO_TIMEOUT_MS?: string;
  /**
   * Local development only: fetch the page from this origin instead of the request's own
   * (under `wrangler dev` the request is for localhost, which has no site behind it).
   * Leave unset in production, where `fetch(request)` already reaches Static Web Apps.
   */
  ORIGIN_URL?: string;
}

type SeoWorkerEnv = Env;

declare global {
  namespace Cloudflare {
    // Gives `env` from `cloudflare:test` the same shape.
    interface Env extends SeoWorkerEnv {}
  }
}
