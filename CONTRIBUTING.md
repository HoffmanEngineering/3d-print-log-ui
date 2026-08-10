# Contributing to 3D Print Log UI

Thank you for your interest in contributing!

Most feature work spans both this repo and the API — see [3d-print-log-api](https://github.com/HoffmanEngineering/3d-print-log-api) for backend setup.

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- The API running locally — see [3d-print-log-api](https://github.com/HoffmanEngineering/3d-print-log-api) for setup

## Local Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/HoffmanEngineering/3d-print-log-ui.git
   cd 3d-print-log-ui
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the dev server**

   ```bash
   npm start
   ```

   The app will be available at `https://localhost:4200`.

   HTTPS works out of the box — a self-signed localhost certificate is committed to the repo at `ssl/server.crt` and `ssl/server.key`. Chrome trusts it silently; Firefox will show a one-time "Accept the Risk" prompt on first visit.

## Dev Auth Bypass

By default (`npm start`), Auth0 is bypassed entirely — no account needed. You are automatically signed in as dev user 1. To test as a different user, add `?devUserId=2` to the URL. The id is remembered in `sessionStorage` for that tab, so it survives in-app navigation once the query param drops off. Visit with a different `?devUserId=` value to switch users, or `?devUserId=` (empty) to go back to user 1. Because the override is per-tab, you can open two tabs with different `devUserId` values to test cross-account features.

To test with real Auth0 authentication:

1. Copy `src/environments/environment.auth0-dev.example.ts` to `src/environments/environment.auth0-dev.ts`
2. Fill in your Auth0 tenant values
3. Run `npm run start:auth0`

## Running Tests

The project has unit tests (Jasmine/Karma) and E2E tests (Cypress).

```bash
# Run all unit tests once (CI mode, with coverage)
npm run test:ci

# Run unit tests in watch mode (development)
npm test

# Run a specific test file
npm test -- --include='src/app/path/to/file.spec.ts'

# Unit tests for the sitemap generator scripts
npm run test:sitemap

# Open Cypress for E2E tests
npm run e2e
```

## Prerendering

`npm run build` prerenders the marketing/SEO routes to static HTML via `@angular/ssr`. Prerendering runs components in Node, so keep new code SSR-safe: guard any browser global (`window`, `document`, `localStorage`, `navigator`) with `isPlatformBrowser(inject(PLATFORM_ID))`, or the production build fails. CI runs `scripts/verify-prerender.mjs` to gate the prerendered output. The `sitemap.xml` is generated at deploy time (`scripts/generate-sitemap.mjs`), not committed.

## Linting

```bash
npm run lint
```

## Submitting a PR

- Fork the repo and create a branch from `main`
- Make your changes with tests
- Run `npm run test:ci` and `npm run lint` to verify
- Open a pull request — CI runs automatically

If your change requires infrastructure updates (new environment variables, auth configuration, hosting config), call that out explicitly in the PR description. The production environment is manually managed on Azure.
