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

By default (`npm start`), Auth0 is bypassed entirely — no account needed. You are automatically signed in as dev user 1. To test as a different user, add `?devUserId=2` to the URL. Open two tabs with different `devUserId` values to test cross-account features.

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

# Open Cypress for E2E tests
npm run e2e
```

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
