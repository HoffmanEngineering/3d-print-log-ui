# Open Source Migration — Plan 3: UI Code Changes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `3d-print-log-ui` repo safe and functional as a public open source project: gitignore prod environment files, implement the dev auth bypass, add the `npm run start:auth0` script, add GitHub Actions CI/CD, and add all contributor-facing files.

**Architecture:** A `devAuthBypass: true` flag in `environment.ts` (absent from `environment.prod.ts`) gates all bypass behaviour. `AuthGuard` returns `of(true)`, `AuthInterceptorService` sends `X-Dev-User-Id` from the `?devUserId=` query param, and `AuthService` emits a mock user profile — all only when `devAuthBypass` is true. A separate `environment.auth0-dev.ts` with `devAuthBypass: false` enables real Auth0 flow via `npm run start:auth0`.

**Tech Stack:** Angular 20, TypeScript, RxJS, Auth0 SPA SDK, GitHub Actions

**Working directory for all tasks:** `D:/Development/3d-print-log/print-log-ui`

**Prerequisite:** Plan 1 complete — UI repo is on GitHub as a private repo.

---

### Task 1: Gitignore prod/staging environment files and add examples

**Files:**

- Modify: `.gitignore`
- Create: `src/environments/environment.prod.example.ts`
- Create: `src/environments/environment.auth0-dev.example.ts`

- [ ] **Step 1: Add entries to .gitignore**

  Add to the end of `.gitignore`:

  ```
  # Production and staging environment files contain sensitive keys — never commit
  src/environments/environment.prod.ts
  src/environments/environment.staging.ts

  # Auth0 dev environment — requires a real Auth0 tenant, copy from example
  src/environments/environment.auth0-dev.ts
  ```

- [ ] **Step 2: Remove environment.prod.ts and environment.staging.ts from git tracking**

  ```bash
  git rm --cached src/environments/environment.prod.ts src/environments/environment.staging.ts
  ```

  The files remain on disk — they are just no longer tracked by git.

- [ ] **Step 3: Create environment.prod.example.ts**

  Create `src/environments/environment.prod.example.ts`:

  ```typescript
  import packageInfo from '../../package.json';

  export const environment = {
    production: true,
    printLogApiUrl: 'https://YOUR_API_URL',
    version: packageInfo.version,
    devAuthBypass: false,
    authentication: {
      domain: 'YOUR_AUTH0_TENANT.auth0.com',
      client_id: 'YOUR_AUTH0_CLIENT_ID',
      audience: 'https://YOUR_AUTH0_AUDIENCE',
    },
    googleAnalyticsId: 'YOUR_GA_ID',
    appInsights: {
      instrumentationKey: 'YOUR_APPINSIGHTS_KEY',
    },
    features: {
      userProfile: true,
    },
    googleAds: {
      trafficSearchConversion: 'YOUR_GOOGLE_ADS_CONVERSION_ID',
    },
    stripe: {
      proMonthlyPriceId: 'YOUR_STRIPE_MONTHLY_PRICE_ID',
      proAnnualPriceId: 'YOUR_STRIPE_ANNUAL_PRICE_ID',
    },
  };
  ```

- [ ] **Step 4: Create environment.auth0-dev.example.ts**

  Create `src/environments/environment.auth0-dev.example.ts`:

  ```typescript
  import packageInfo from '../../package.json';

  export const environment = {
    production: false,
    printLogApiUrl: 'https://localhost:5001',
    version: packageInfo.version,
    devAuthBypass: false,
    authentication: {
      domain: 'YOUR_AUTH0_DEV_TENANT.auth0.com',
      client_id: 'YOUR_AUTH0_DEV_CLIENT_ID',
      audience: 'https://YOUR_AUTH0_DEV_AUDIENCE',
    },
    googleAnalyticsId: '',
    appInsights: {
      instrumentationKey: '',
    },
    features: {
      userProfile: true,
    },
    googleAds: {
      trafficSearchConversion: '',
    },
    stripe: {
      proMonthlyPriceId: '',
      proAnnualPriceId: '',
    },
  };
  ```

- [ ] **Step 5: Verify gitignore is working**

  ```bash
  git status
  ```

  Expected: `environment.prod.ts` and `environment.staging.ts` show as deleted (untracked after `git rm --cached`). The two new `.example` files show as untracked. `environment.prod.ts` and `environment.staging.ts` should NOT appear in future `git status` output.

- [ ] **Step 6: Commit**

  ```bash
  git add .gitignore src/environments/environment.prod.example.ts src/environments/environment.auth0-dev.example.ts
  git commit -m "chore: gitignore prod/staging env files and add example templates"
  ```

---

### Task 2: Add devAuthBypass flag to environment.ts

**Files:**

- Modify: `src/environments/environment.ts`

- [ ] **Step 1: Add devAuthBypass flag**

  In `src/environments/environment.ts`, add `devAuthBypass: true` to the environment object:

  ```typescript
  import packageInfo from '../../package.json';

  export const environment = {
    production: false,
    printLogApiUrl: 'https://localhost:5001',
    version: packageInfo.version,
    devAuthBypass: true,
    authentication: {
      domain: 'dev-3dprintlog.auth0.com',
      client_id: 'Z08zKCebdjkBK7Ew281y1W2g2LGBp2SZ',
      audience: 'https://dev.3dprintlog.com/api',
    },
    googleAnalyticsId: 'UA-65004387-7',
    appInsights: {
      instrumentationKey: 'aea218c9-705c-4566-89ec-ec01aca375b4',
    },
    features: {
      userProfile: true,
    },
    googleAds: {
      trafficSearchConversion: '',
    },
    stripe: {
      proMonthlyPriceId: 'price_1T5XDzFYDvupkrWux9g8k5Hy',
      proAnnualPriceId: 'price_1T5XDzFYDvupkrWuS7tZCMtW',
    },
  };
  ```

  Also add the `devAuthBypass` property to `environment.unittest.ts` with value `false` so unit tests continue to use real auth paths.

- [ ] **Step 2: Build to verify TypeScript is happy**

  ```bash
  npm run build:dev 2>&1 | tail -5
  ```

  Expected: build succeeds (may have warnings but no errors).

- [ ] **Step 3: Commit**

  ```bash
  git add src/environments/environment.ts src/environments/environment.unittest.ts
  git commit -m "feat: add devAuthBypass flag to environment config"
  ```

---

### Task 3: Update AuthGuard for dev bypass

**Files:**

- Modify: `src/app/core/guards/auth.guard.ts`

- [ ] **Step 1: Write the failing test**

  In `src/app/core/guards/auth.guard.spec.ts`, add a test for bypass mode:

  ```typescript
  it('should return true immediately when devAuthBypass is true', (done) => {
    // Arrange: set bypass flag
    (environment as any).devAuthBypass = true;
    const guard = TestBed.inject(AuthGuard);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/prints' } as RouterStateSnapshot;

    // Act
    const result$ = guard.canActivate(route, state) as Observable<boolean>;

    // Assert
    result$.subscribe((value) => {
      expect(value).toBeTrue();
      done();
    });
  });
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  ```bash
  npm run test:ci -- --include="**/auth.guard.spec.ts" 2>&1 | tail -20
  ```

  Expected: test fails.

- [ ] **Step 3: Update AuthGuard**

  Replace `src/app/core/guards/auth.guard.ts`:

  ```typescript
  import { Injectable } from '@angular/core';
  import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
  import { Observable, of } from 'rxjs';
  import { tap } from 'rxjs/operators';
  import { environment } from 'src/environments/environment';
  import { AuthService } from '../services/auth.service';

  @Injectable({
    providedIn: 'root',
  })
  export class AuthGuard {
    constructor(private auth: AuthService) {}

    canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean | UrlTree> | boolean {
      if (environment.devAuthBypass) {
        return of(true);
      }

      return this.auth.isAuthenticated$.pipe(
        tap((loggedIn) => {
          if (!loggedIn) {
            this.auth.login(state.url);
          }
        })
      );
    }
  }
  ```

- [ ] **Step 4: Run the test to confirm it passes**

  ```bash
  npm run test:ci -- --include="**/auth.guard.spec.ts" 2>&1 | tail -10
  ```

  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/app/core/guards/auth.guard.ts src/app/core/guards/auth.guard.spec.ts
  git commit -m "feat: bypass AuthGuard when devAuthBypass is enabled"
  ```

---

### Task 4: Update AuthInterceptorService for dev bypass

**Files:**

- Modify: `src/app/core/http/auth-interceptor.service.ts`

When `devAuthBypass` is true, the interceptor reads `?devUserId=` from the current URL (defaulting to `1`) and sends `X-Dev-User-Id: {id}` instead of a Bearer token.

- [ ] **Step 1: Write the failing test**

  In `src/app/core/http/auth-interceptor.service.spec.ts`, add:

  ```typescript
  it('should add X-Dev-User-Id header when devAuthBypass is true', (done) => {
    (environment as any).devAuthBypass = true;
    // Simulate ?devUserId=2 in the URL
    spyOnProperty(window, 'location', 'get').and.returnValue({ search: '?devUserId=2' } as Location);

    const interceptor = TestBed.inject(AuthInterceptorService);
    const req = new HttpRequest('GET', 'https://localhost:5001/api/prints');
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        expect(r.headers.get('X-Dev-User-Id')).toBe('2');
        expect(r.headers.get('Authorization')).toBeNull();
        done();
        return of(new HttpResponse({ status: 200 })) as any;
      },
    };

    interceptor.intercept(req, next).subscribe();
  });
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  ```bash
  npm run test:ci -- --include="**/auth-interceptor.service.spec.ts" 2>&1 | tail -20
  ```

  Expected: test fails.

- [ ] **Step 3: Update AuthInterceptorService**

  Replace `src/app/core/http/auth-interceptor.service.ts`:

  ```typescript
  import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
  import { Injectable } from '@angular/core';
  import { Observable, of, throwError } from 'rxjs';
  import { catchError, mergeMap } from 'rxjs/operators';
  import { environment } from 'src/environments/environment';
  import { AuthService } from '../services/auth.service';

  @Injectable({
    providedIn: 'root',
  })
  export class AuthInterceptorService implements HttpInterceptor {
    constructor(private auth: AuthService) {}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
      if (environment.devAuthBypass) {
        const params = new URLSearchParams(window.location.search);
        const userId = params.get('devUserId') ?? '1';
        const devReq = req.clone({
          headers: req.headers.delete('allow-anonymous-request').set('X-Dev-User-Id', userId),
        });
        return next.handle(devReq);
      }

      return this.auth.getTokenSilently$().pipe(
        mergeMap((token) => {
          const tokenReq = req.clone({
            headers: req.headers.delete('allow-anonymous-request').set('Authorization', `Bearer ${token}`),
          });
          return next.handle(tokenReq);
        }),
        catchError((err) => {
          if (req.headers.get('allow-anonymous-request')) {
            const tokenReq = req.clone({
              headers: req.headers.delete('allow-anonymous-request'),
            });
            return next.handle(tokenReq);
          }
          return throwError(err);
        })
      );
    }
  }
  ```

- [ ] **Step 4: Run the test to confirm it passes**

  ```bash
  npm run test:ci -- --include="**/auth-interceptor.service.spec.ts" 2>&1 | tail -10
  ```

  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/app/core/http/auth-interceptor.service.ts src/app/core/http/auth-interceptor.service.spec.ts
  git commit -m "feat: send X-Dev-User-Id header instead of Bearer token when devAuthBypass is enabled"
  ```

---

### Task 5: Update AuthService for dev bypass

**Files:**

- Modify: `src/app/core/services/auth.service.ts`

When `devAuthBypass` is true, `localAuthSetup()` skips Auth0 initialization and emits a mock user profile. `login()` and `logout()` become no-ops.

- [ ] **Step 1: Write the failing test**

  In `src/app/core/services/auth.service.spec.ts`, add:

  ```typescript
  it('should emit mock user profile and set loggedIn=true when devAuthBypass is true', (done) => {
    (environment as any).devAuthBypass = true;
    const service = TestBed.inject(AuthService);

    service.localAuthSetup();

    service.userProfile$
      .pipe(
        filter((profile) => profile !== null),
        take(1)
      )
      .subscribe((profile) => {
        expect(profile).not.toBeNull();
        expect(service.loggedIn).toBeTrue();
        done();
      });
  });
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  ```bash
  npm run test:ci -- --include="**/auth.service.spec.ts" 2>&1 | tail -20
  ```

  Expected: test fails.

- [ ] **Step 3: Add dev bypass to AuthService**

  In `src/app/core/services/auth.service.ts`, update `localAuthSetup()` and add a `devMockProfile` constant:

  ```typescript
  private readonly devMockProfile: UserProfileInfo = {
    id: 0,
    profilePicture: '',
    coverPicture: '',
    displayName: 'Dev User',
    bio: '',
    deactivationDateTime: null,
    viewStatus: ProfileViewStatus.Public,
  };

  localAuthSetup() {
    if (environment.devAuthBypass) {
      this.loggedIn = true;
      this.userProfileSubject$.next(this.devMockProfile);
      return;
    }

    // existing implementation below unchanged
    const checkAuth$ = this.isAuthenticated$.pipe(
      concatMap((loggedIn: boolean) => {
        if (loggedIn) {
          return this.getUser$();
        }
        return of(loggedIn);
      })
    );
    checkAuth$.subscribe((response: { [key: string]: any } | boolean) => {
      this.loggedIn = !!response;
    });
  }

  login(redirectPath: string = '/') {
    if (environment.devAuthBypass) {
      return;
    }
    // existing implementation unchanged
    this.auth0Client$.subscribe((client: Auth0Client) => {
      client.loginWithRedirect({
        appState: { target: redirectPath },
        authorizationParams: {
          redirect_uri: isCordova
            ? cordovaCallbackUri
            : `${window.location.origin}/callback`,
          ...(isCordova && { prompt: 'select_account' }),
        },
      });
    });
  }

  logout() {
    if (environment.devAuthBypass) {
      return;
    }
    // existing implementation unchanged
    this.notificationService.stopPolling();
    this.auth0Client$.subscribe((client: Auth0Client) => {
      client.logout({
        clientId: environment.authentication.client_id,
        logoutParams: { returnTo: `${window.location.origin}` },
      });
    });
  }
  ```

  Add `import { environment } from 'src/environments/environment';` if not already present.

- [ ] **Step 4: Run the test to confirm it passes**

  ```bash
  npm run test:ci -- --include="**/auth.service.spec.ts" 2>&1 | tail -10
  ```

  Expected: all tests pass.

- [ ] **Step 5: Run the full test suite**

  ```bash
  npm run test:brief
  ```

  Expected: all tests pass with no new failures.

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/core/services/auth.service.ts src/app/core/services/auth.service.spec.ts
  git commit -m "feat: skip Auth0 initialization and emit mock user when devAuthBypass is enabled"
  ```

---

### Task 6: Add auth0-dev configuration and npm script

**Files:**

- Modify: `angular.json` — add `auth0-dev` build and serve configurations
- Modify: `package.json` — add `start:auth0` script
- Create: `src/environments/environment.auth0-dev.ts` (local only, gitignored — from example)

- [ ] **Step 1: Add auth0-dev build configuration to angular.json**

  In `angular.json`, inside `projects["print-log-ui"].architect.build.configurations`, add after the `production` entry:

  ```json
  "auth0-dev": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.auth0-dev.ts"
      }
    ]
  }
  ```

- [ ] **Step 2: Add auth0-dev serve configuration to angular.json**

  In `angular.json`, inside `projects["print-log-ui"].architect.serve.configurations`, add:

  ```json
  "auth0-dev": {
    "buildTarget": "print-log-ui:build:auth0-dev"
  }
  ```

- [ ] **Step 3: Add npm script to package.json**

  In `package.json`, add to the `scripts` section:

  ```json
  "start:auth0": "ng serve --ssl --host 0.0.0.0 --configuration=auth0-dev"
  ```

- [ ] **Step 4: Create local environment.auth0-dev.ts from example**

  ```bash
  cp src/environments/environment.auth0-dev.example.ts src/environments/environment.auth0-dev.ts
  ```

  The file is gitignored. Contributors who want real Auth0 flow fill in their tenant values here.

- [ ] **Step 5: Build the auth0-dev configuration to verify no errors**

  ```bash
  npm run build:dev -- --configuration=auth0-dev 2>&1 | tail -5
  ```

  Expected: build succeeds (the placeholder values won't be functional but the build should compile cleanly).

- [ ] **Step 6: Commit**

  ```bash
  git add angular.json package.json src/environments/environment.auth0-dev.example.ts
  git commit -m "feat: add auth0-dev configuration and npm run start:auth0 for real Auth0 testing"
  ```

---

### Task 7: Smoke-test dev bypass end-to-end

- [ ] **Step 1: Start the API with Docker Compose (if not running)**

  In the API repo:

  ```bash
  docker compose up -d
  cd PrintLogApi && dotnet run
  ```

- [ ] **Step 2: Start the UI**

  ```bash
  npm start
  ```

- [ ] **Step 3: Open the app and verify bypass works**

  Navigate to `https://localhost:4200`. You should be taken directly to the app (no Auth0 login redirect). Verify the nav bar shows a user name.

- [ ] **Step 4: Test cross-account bypass**

  Open a second tab at `https://localhost:4200?devUserId=2`. Verify this loads as a different user (different user ID in any user-specific data).

- [ ] **Step 5: Commit (no code changes — this is a verification step)**

  No commit needed if no changes were required.

---

### Task 8: Add LICENSE file

**Files:**

- Create: `LICENSE`

- [ ] **Step 1: Download AGPL-3.0 license text**

  ```bash
  curl -o LICENSE https://www.gnu.org/licenses/agpl-3.0.txt
  ```

  Verify the file starts with `GNU AFFERO GENERAL PUBLIC LICENSE`.

- [ ] **Step 2: Commit**

  ```bash
  git add LICENSE
  git commit -m "chore: add AGPL-3.0 license"
  ```

---

### Task 9: Add GitHub Actions CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create .github/workflows directory**

  ```bash
  mkdir -p .github/workflows
  ```

- [ ] **Step 2: Create ci.yml**

  Create `.github/workflows/ci.yml`:

  ```yaml
  name: CI

  on:
    pull_request:
      branches: [master]

  jobs:
    build-and-test:
      runs-on: ubuntu-latest

      steps:
        - uses: actions/checkout@v4

        - name: Setup Node
          uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'

        - name: Install dependencies
          run: npm ci

        - name: Lint
          run: npm run lint:brief

        - name: Test
          run: npm run test:ci

        - name: Build
          run: npm run build
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add .github/workflows/ci.yml
  git commit -m "ci: add GitHub Actions CI workflow for PRs"
  ```

---

### Task 10: Add GitHub Actions deploy workflow

**Files:**

- Create: `.github/workflows/deploy.yml`

The UI is deployed to Azure Static Web Apps. The deploy workflow fires on version tags (`v*`) only. It requires:

- `AZURE_STATIC_WEB_APPS_API_TOKEN` — from Azure Portal: Static Web App → Overview → Manage deployment token

The production `environment.prod.ts` is gitignored, so the workflow generates it from a GitHub secret:

- `ENVIRONMENT_PROD_TS` — the full contents of your `environment.prod.ts` file (copy-paste the file content as the secret value)

- [ ] **Step 1: Create deploy.yml**

  Create `.github/workflows/deploy.yml`:

  ```yaml
  name: Deploy

  on:
    push:
      tags:
        - 'v*'

  jobs:
    build-and-deploy:
      runs-on: ubuntu-latest

      steps:
        - uses: actions/checkout@v4

        - name: Setup Node
          uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'

        - name: Install dependencies
          run: npm ci

        - name: Write production environment file
          run: echo "${{ secrets.ENVIRONMENT_PROD_TS }}" > src/environments/environment.prod.ts

        - name: Lint
          run: npm run lint:brief

        - name: Test
          run: npm run test:ci

        - name: Build
          run: npm run build

        - name: Deploy to Azure Static Web Apps
          uses: Azure/static-web-apps-deploy@v1
          with:
            azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
            repo_token: ${{ secrets.GITHUB_TOKEN }}
            action: upload
            app_location: /
            output_location: dist/print-log-ui
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add .github/workflows/deploy.yml
  git commit -m "ci: add GitHub Actions deploy workflow triggered by version tags"
  ```

---

### Task 11: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md` — replace Azure DevOps section with GitHub workflow

- [ ] **Step 1: Replace the Azure DevOps section**

  In `CLAUDE.md`, find and replace the entire `## Azure DevOps` section:

  ```markdown
  ## GitHub

  Issues and PRs are managed on GitHub.

  - **Org:** `https://github.com/HoffmanEngineering`
  - **UI repo:** `https://github.com/HoffmanEngineering/3d-print-log-ui`
  - **API repo:** `https://github.com/HoffmanEngineering/3d-print-log-api`

  Use `gh issue list`, `gh pr create`, `gh pr view` for CLI operations.

  When asked to "work on issue #N": fetch the issue with `gh issue view N`, implement the feature, open a PR with `gh pr create`.
  ```

- [ ] **Step 2: Build to verify no issues**

  ```bash
  npm run lint:brief 2>&1 | tail -5
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add CLAUDE.md
  git commit -m "docs: update CLAUDE.md to reflect GitHub as source of truth"
  ```

---

### Task 12: Add CONTRIBUTING.md

**Files:**

- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create CONTRIBUTING.md**

  Create `CONTRIBUTING.md` at the repo root:

  ````markdown
  # Contributing to 3D Print Log UI

  Thank you for your interest in contributing!

  ## Prerequisites

  - [Node.js 20+](https://nodejs.org/)
  - The API running locally — see [3d-print-log-api](https://github.com/HoffmanEngineering/3d-print-log-api) for setup

  ## Local Setup

  1. **Clone the repo**
     ```bash
     git clone https://github.com/HoffmanEngineering/3d-print-log-ui.git
     cd 3d-print-log-ui
     ```
  ````

  2. **Install dependencies**

     ```bash
     npm install
     ```

  3. **Start the dev server**
     ```bash
     npm start
     ```
     The app will be available at `https://localhost:4200`.

  ## Dev Auth Bypass

  By default (`npm start`), Auth0 is bypassed entirely — no account needed. You are automatically signed in as dev user 1. To test as a different user, add `?devUserId=2` to the URL. Open two tabs with different `devUserId` values to test cross-account features.

  To test with real Auth0 authentication:

  1. Copy `src/environments/environment.auth0-dev.example.ts` to `src/environments/environment.auth0-dev.ts`
  2. Fill in your Auth0 tenant values
  3. Run `npm run start:auth0`

  ## Running Tests

  ```bash
  npm run test:ci
  ```

  ## Linting

  ```bash
  npm run lint
  ```

  ## Submitting a PR

  - Fork the repo and create a branch from `master`
  - Make your changes with tests
  - Run `npm run test:ci` and `npm run lint` to verify
  - Open a pull request — CI runs automatically

  ```

  ```

- [ ] **Step 2: Commit**

  ```bash
  git add CONTRIBUTING.md
  git commit -m "docs: add CONTRIBUTING.md with local setup guide"
  ```

---

### Task 13: Add CODEOWNERS, issue templates, and PR template

**Files:**

- Create: `.github/CODEOWNERS`
- Create: `.github/ISSUE_TEMPLATE/bug-report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature-request.yml`
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Create CODEOWNERS**

  Create `.github/CODEOWNERS`:

  ```
  # Maintainer review required for CI/CD, auth, and AI agent config changes
  .github/workflows/          @ChristopherHoffman
  .github/CODEOWNERS          @ChristopherHoffman
  CLAUDE.md                   @ChristopherHoffman
  .claude/                    @ChristopherHoffman
  src/app/core/guards/        @ChristopherHoffman
  src/app/core/http/auth-interceptor.service.ts  @ChristopherHoffman
  src/app/core/services/auth.service.ts          @ChristopherHoffman
  src/environments/           @ChristopherHoffman
  ```

  Replace `@ChristopherHoffman` with your actual GitHub username.

- [ ] **Step 2: Create bug report template**

  Create `.github/ISSUE_TEMPLATE/bug-report.yml`:

  ```yaml
  name: Bug Report
  description: Something isn't working correctly
  labels: ['bug']
  body:
    - type: textarea
      id: description
      attributes:
        label: What happened?
        description: A clear description of the bug
      validations:
        required: true
    - type: textarea
      id: reproduction
      attributes:
        label: Steps to reproduce
        placeholder: |
          1. Navigate to ...
          2. Click ...
          3. See error ...
      validations:
        required: true
    - type: textarea
      id: expected
      attributes:
        label: Expected behavior
      validations:
        required: true
    - type: input
      id: browser
      attributes:
        label: Browser / OS
        placeholder: e.g. Chrome 124 on Windows 11
    - type: input
      id: version
      attributes:
        label: App version
        placeholder: e.g. v2.5.0
  ```

- [ ] **Step 3: Create feature request template**

  Create `.github/ISSUE_TEMPLATE/feature-request.yml`:

  ```yaml
  name: Feature Request
  description: Suggest a new feature or improvement
  labels: ['enhancement']
  body:
    - type: textarea
      id: problem
      attributes:
        label: What problem does this solve?
        description: Describe the use case or problem you're trying to address
      validations:
        required: true
    - type: textarea
      id: solution
      attributes:
        label: Proposed solution
        description: Describe what you'd like to see
      validations:
        required: true
    - type: textarea
      id: alternatives
      attributes:
        label: Alternatives considered
        description: Any other approaches you've thought of
  ```

- [ ] **Step 4: Create PR template**

  Create `.github/pull_request_template.md`:

  ```markdown
  ## What does this PR do?

  <!-- Brief description of the change -->

  ## How to test

  <!-- Steps to verify this works in the browser -->

  ## Checklist

  - [ ] Tested locally with `npm start`
  - [ ] Existing tests pass (`npm run test:ci`)
  - [ ] New tests added for new behaviour
  - [ ] Screenshot included for visual changes
  - [ ] No secrets or personal config committed (check `environment.prod.ts` is NOT staged)
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add .github/
  git commit -m "docs: add CODEOWNERS, issue templates, and PR template"
  ```

---

### Task 14: Update README.md

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Update README.md**

  Replace the contents of `README.md` with:

  ```markdown
  # 3D Print Log

  [![CI](https://github.com/HoffmanEngineering/3d-print-log-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/HoffmanEngineering/3d-print-log-ui/actions/workflows/ci.yml)
  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

  The frontend for [3D Print Log](https://3dprintlog.com) — a web application for tracking 3D prints, printers, and filaments.

  ![3D Print Log screenshot](src/assets/screenshot.png)

  <!-- Add a real screenshot path above, or remove the line if no screenshot is available yet -->

  ## Getting Started

  See [CONTRIBUTING.md](CONTRIBUTING.md) for local development setup.

  ## Tech Stack

  - Angular 20
  - Angular Material
  - Auth0 SPA SDK
  - Azure Static Web Apps

  ## Related Repos

  - [3d-print-log-api](https://github.com/HoffmanEngineering/3d-print-log-api) — the backend API
  - [3d-print-log-cura-plugin](https://github.com/HoffmanEngineering/3d-print-log-cura-plugin) — Cura integration

  ## License

  [GNU Affero General Public License v3.0](LICENSE)
  ```

  Remove the screenshot line if you don't have a screenshot ready.

- [ ] **Step 2: Commit**

  ```bash
  git add README.md
  git commit -m "docs: update README with project description, badges, and related repos"
  ```

---

### Task 15: Configure GitHub Actions secrets and test deployment

This task is manual — no code changes.

- [ ] **Step 1: Add secrets in GitHub repo settings**

  Go to `github.com/HoffmanEngineering/3d-print-log-ui` → Settings → Secrets and variables → Actions → New repository secret:

  - `AZURE_STATIC_WEB_APPS_API_TOKEN` — from Azure Portal: your Static Web App → Overview → Manage deployment token
  - `ENVIRONMENT_PROD_TS` — paste the full contents of your local `src/environments/environment.prod.ts` as the secret value

- [ ] **Step 2: Create and push a test version tag**

  ```bash
  git tag v0.0.0-deploy-test
  git push origin v0.0.0-deploy-test
  ```

- [ ] **Step 3: Verify the deployment succeeds**

  Go to `github.com/HoffmanEngineering/3d-print-log-ui` → Actions → Deploy workflow run. Confirm all steps pass and the app is live at its production URL.

- [ ] **Step 4: Delete the test tag**

  ```bash
  git tag -d v0.0.0-deploy-test
  git push origin --delete v0.0.0-deploy-test
  ```

---

### Task 16: Go public

Once both the API (Plan 2, Task 12) and UI deployment tests pass:

- [ ] **Step 1: Enable branch protection on master (API repo)**

  `github.com/HoffmanEngineering/3d-print-log-api` → Settings → Branches → Add branch protection rule → Branch name: `master` → Require a pull request before merging → Require status checks to pass (select the CI workflow) → Save.

- [ ] **Step 2: Enable branch protection on master (UI repo)**

  Same as above for `github.com/HoffmanEngineering/3d-print-log-ui`.

- [ ] **Step 3: Flip API repo to public**

  `github.com/HoffmanEngineering/3d-print-log-api` → Settings → Danger Zone → Change repository visibility → Public.

- [ ] **Step 4: Flip UI repo to public**

  `github.com/HoffmanEngineering/3d-print-log-ui` → Settings → Danger Zone → Change repository visibility → Public.

- [ ] **Step 5: Update in-app source code links**

  If the app has any links to the Azure DevOps repo (about page, documentation), update them to point to the GitHub repos.
