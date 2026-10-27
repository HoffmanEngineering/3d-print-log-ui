import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// Every test runs inside workerd (the Workers runtime), so HTMLRewriter, the Cache API and
// AbortSignal.timeout behave as they do in production. Outbound fetches (the origin and
// the API) are mocked per test with vi.spyOn(globalThis, 'fetch').
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        // Short timeout so the timeout test does not slow the suite.
        bindings: { SEO_TIMEOUT_MS: '100' },
      },
    }),
  ],
});
