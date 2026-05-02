# Open Source Migration — Plan 2: API Code Changes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `3d-print-log-api` repo safe and functional as a public open source project: remove tracked secrets, add example configs, add a Docker Compose dev environment, implement the dev auth bypass, add GitHub Actions CI/CD, and add all contributor-facing files.

**Architecture:** The dev auth bypass registers a `DevAuthenticationHandler` only when `ASPNETCORE_ENVIRONMENT == Development`, setting a `ClaimTypes.Upn` claim of `dev|{id}` so the existing `ClaimsTransformer` user-lookup/upsert logic runs unchanged. All other environments continue to use Auth0 JWT Bearer authentication unmodified.

**Tech Stack:** .NET 6+, ASP.NET Core, Entity Framework Core, Docker Compose, GitHub Actions

**Working directory for all tasks:** `D:/Development/3d-print-log/PrintLogApi`

**Prerequisite:** Plan 1 complete — API repo is on GitHub as a private repo.

---

### Task 1: Gitignore secrets files and add example configs

**Files:**

- Modify: `.gitignore`
- Create: `PrintLogApi/appsettings.Development.example.json`
- Create: `PrintLogApi/appsettings.Staging.example.json`
- Create: `PrintLogApi/3dprintlog.env.example`

- [ ] **Step 1: Add entries to .gitignore**

  Add to the end of `.gitignore` (create it at the repo root if it doesn't already have one — the standard Visual Studio .gitignore is already in place):

  ```
  # Local config files with secrets — copy from *.example and fill in values
  PrintLogApi/appsettings.Development.json
  PrintLogApi/appsettings.Staging.json
  PrintLogApi/3dprintlog.env
  ```

- [ ] **Step 2: Create appsettings.Development.example.json**

  Create `PrintLogApi/appsettings.Development.example.json`:

  ```json
  {
    "Auth0": {
      "Domain": "YOUR_AUTH0_DEV_TENANT.auth0.com",
      "ApiIdentifier": "https://YOUR_AUTH0_DEV_API_IDENTIFIER",
      "SwaggerClientId": "YOUR_SWAGGER_CLIENT_ID"
    },
    "Auth0Management": {
      "Domain": "YOUR_AUTH0_DEV_TENANT.auth0.com",
      "ClientId": "YOUR_AUTH0_MANAGEMENT_CLIENT_ID",
      "ClientSecret": "YOUR_AUTH0_MANAGEMENT_CLIENT_SECRET"
    },
    "Feed": {
      "AllowedUserIds": [1]
    },
    "Logging": {
      "LogLevel": {
        "Default": "Debug",
        "System": "Information",
        "Microsoft": "Information"
      }
    },
    "ConnectionString": {
      "PrintLogDb": "Server=localhost,1433;Database=PrintLogDb;User Id=sa;Password=YOUR_SA_PASSWORD;TrustServerCertificate=True"
    },
    "ApplicationInsights": {
      "InstrumentationKey": ""
    },
    "FeedbackEmailAddress": "your-email@example.com",
    "ExternalProviders": {
      "Smtp": {
        "Host": "smtp.example.com",
        "Port": 587,
        "Username": "",
        "Password": "",
        "SenderEmail": "noreply@example.com",
        "SenderName": "3D Print Log Dev"
      }
    },
    "Stripe": {
      "SecretKey": "",
      "WebhookSecret": "",
      "ProMonthlyPriceId": "",
      "ProAnnualPriceId": ""
    }
  }
  ```

- [ ] **Step 3: Create appsettings.Staging.example.json**

  Create `PrintLogApi/appsettings.Staging.example.json`:

  ```json
  {
    "Auth0": {
      "Domain": "YOUR_AUTH0_STAGING_TENANT.auth0.com",
      "ApiIdentifier": "https://YOUR_AUTH0_STAGING_API_IDENTIFIER"
    },
    "Logging": {
      "LogLevel": {
        "Default": "Debug",
        "System": "Information",
        "Microsoft": "Information"
      }
    },
    "ConnectionString": {
      "PrintLogDb": "Server=YOUR_STAGING_SERVER;Database=PrintLogDb;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True"
    }
  }
  ```

- [ ] **Step 4: Create 3dprintlog.env.example**

  Create `PrintLogApi/3dprintlog.env.example`:

  ```
  AZURE_STORAGE_CONNECTION_STRING=YOUR_AZURE_STORAGE_CONNECTION_STRING
  ```

- [ ] **Step 5: Verify gitignore is working**

  ```bash
  git status
  ```

  Expected: `appsettings.Development.json`, `appsettings.Staging.json`, and `3dprintlog.env` do NOT appear in untracked or modified files. The three new `.example` files should appear as untracked.

- [ ] **Step 6: Commit**

  ```bash
  git add .gitignore PrintLogApi/appsettings.Development.example.json PrintLogApi/appsettings.Staging.example.json PrintLogApi/3dprintlog.env.example
  git commit -m "chore: gitignore secrets files and add example config templates"
  ```

---

### Task 2: Add Docker Compose for local development

**Files:**

- Create: `docker-compose.yml` (at repo root, alongside the `.sln` file)

- [ ] **Step 1: Create docker-compose.yml**

  Create `docker-compose.yml` at the repo root:

  ```yaml
  services:
    sqlserver:
      image: mcr.microsoft.com/mssql/server:2022-latest
      environment:
        ACCEPT_EULA: 'Y'
        SA_PASSWORD: 'YourStrong@Passw0rd'
        MSSQL_PID: 'Developer'
      ports:
        - '1433:1433'
      volumes:
        - sqlserver-data:/var/opt/mssql

    azurite:
      image: mcr.microsoft.com/azure-storage/azurite
      ports:
        - '10000:10000'
        - '10001:10001'
        - '10002:10002'
      volumes:
        - azurite-data:/data
      command: azurite --blobHost 0.0.0.0 --queueHost 0.0.0.0 --tableHost 0.0.0.0

  volumes:
    sqlserver-data:
    azurite-data:
  ```

  The SA password `YourStrong@Passw0rd` matches the connection string in `appsettings.Development.example.json`. This is a local dev password with no security implications.

- [ ] **Step 2: Update the connection string in appsettings.Development.example.json**

  Edit `PrintLogApi/appsettings.Development.example.json` — update the `ConnectionString.PrintLogDb` value to match the Docker Compose SA password:

  ```json
  "ConnectionString": {
    "PrintLogDb": "Server=localhost,1433;Database=PrintLogDb;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True"
  }
  ```

  Note: update your own local `appsettings.Development.json` to use this connection string too.

- [ ] **Step 3: Verify Docker Compose starts**

  ```bash
  docker compose up -d
  ```

  Expected:

  ```
  ✔ Container printlogapi-sqlserver-1  Started
  ✔ Container printlogapi-azurite-1    Started
  ```

  ```bash
  docker compose ps
  ```

  Expected: both containers show status `running`.

- [ ] **Step 4: Verify SQL Server is reachable**

  ```bash
  docker compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -Q "SELECT @@VERSION"
  ```

  Expected: SQL Server version string printed.

- [ ] **Step 5: Stop containers**

  ```bash
  docker compose down
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add docker-compose.yml PrintLogApi/appsettings.Development.example.json
  git commit -m "chore: add docker-compose for local SQL Server and Azurite dev environment"
  ```

---

### Task 3: Implement DevAuthenticationHandler

**Files:**

- Create: `PrintLogApi/Authentication/Handlers/DevAuthenticationHandler.cs`

The `ClaimsTransformer` reads the `ClaimTypes.Upn` claim and uses it to look up/create the database user. The dev handler sets this claim to `dev|{id}` so the existing upsert logic runs unchanged — no seed data needed.

- [ ] **Step 1: Create DevAuthenticationHandler**

  Create `PrintLogApi/Authentication/Handlers/DevAuthenticationHandler.cs`:

  ```csharp
  using System.Security.Claims;
  using System.Text.Encodings.Web;
  using System.Threading.Tasks;
  using Microsoft.AspNetCore.Authentication;
  using Microsoft.Extensions.Logging;
  using Microsoft.Extensions.Options;

  namespace PrintLogApi.Authentication.Handlers
  {
      public class DevAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
      {
          public DevAuthenticationHandler(
              IOptionsMonitor<AuthenticationSchemeOptions> options,
              ILoggerFactory logger,
              UrlEncoder encoder,
              ISystemClock clock)
              : base(options, logger, encoder, clock)
          {
          }

          protected override Task<AuthenticateResult> HandleAuthenticateAsync()
          {
              if (!Request.Headers.TryGetValue("X-Dev-User-Id", out var userIdValues)
                  || string.IsNullOrWhiteSpace(userIdValues))
              {
                  return Task.FromResult(AuthenticateResult.NoResult());
              }

              var userId = userIdValues.ToString().Trim();
              var claims = new[]
              {
                  new Claim(ClaimTypes.Upn, $"dev|{userId}"),
              };

              var identity = new ClaimsIdentity(claims, Scheme.Name);
              var principal = new ClaimsPrincipal(identity);
              var ticket = new AuthenticationTicket(principal, Scheme.Name);

              return Task.FromResult(AuthenticateResult.Success(ticket));
          }
      }
  }
  ```

- [ ] **Step 2: Build to verify no compile errors**

  ```bash
  dotnet build PrintLogApi/PrintLogApi.csproj
  ```

  Expected: `Build succeeded` with 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add PrintLogApi/Authentication/Handlers/DevAuthenticationHandler.cs
  git commit -m "feat: add DevAuthenticationHandler for local development without Auth0"
  ```

---

### Task 4: Register DevAuthenticationHandler in Development

**Files:**

- Modify: `PrintLogApi/Startup.cs` — `ConfigureAuthentication` method (lines ~193–224)

- [ ] **Step 1: Update ConfigureAuthentication to branch on environment**

  In `PrintLogApi/Startup.cs`, replace the `ConfigureAuthentication` private method with:

  ```csharp
  private void ConfigureAuthentication(IServiceCollection services)
  {
      if (Environment.IsDevelopment())
      {
          services.AddAuthentication(options =>
          {
              options.DefaultAuthenticateScheme = "DevAuth";
              options.DefaultChallengeScheme = "DevAuth";
          })
          .AddScheme<AuthenticationSchemeOptions, DevAuthenticationHandler>("DevAuth", null);
      }
      else
      {
          var domain = $"https://{Configuration["Auth0:Domain"]}/";
          services.AddAuthentication(options =>
          {
              options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
              options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
          })
          .AddJwtBearer(jwtOptions =>
          {
              jwtOptions.Authority = domain;
              jwtOptions.Audience = Configuration["Auth0:ApiIdentifier"];
          });

          // Scope-based policy only applies outside Development (dev bypass token has no scopes)
          services.AddAuthorization(options =>
          {
              options.AddPolicy("read:messages", policy =>
                  policy.Requirements.Add(new HasScopeRequirement("read:messages", domain)));
          });
      }

      // These policies use custom requirements (not scope-based) and are needed in all environments
      services.AddAuthorization(options =>
      {
          options.AddPolicy("ViewPrint", policy =>
              policy.Requirements.Add(new PublicOrCreatorRequirement()));

          options.AddPolicy("ViewUserProfile", policy =>
              policy.Requirements.Add(new PublicOrUnlistedUserProfileRequirement()));
      });

      services.AddSingleton<IAuthorizationHandler, PrintViewStatusAuthorizationHandler>();
      services.AddSingleton<IAuthorizationHandler, UserProfileViewStatusAuthorizationHandler>();
  }
  ```

- [ ] **Step 2: Build to verify no compile errors**

  ```bash
  dotnet build PrintLogApi/PrintLogApi.csproj
  ```

  Expected: `Build succeeded` with 0 errors.

- [ ] **Step 3: Smoke-test the dev bypass manually**

  Start the API in Development mode:

  ```bash
  cd PrintLogApi
  dotnet run
  ```

  In another terminal, make a request with the dev header:

  ```bash
  curl -k -H "X-Dev-User-Id: 1" https://localhost:5001/api/prints
  ```

  Expected: a valid JSON response (not a 401). Check the database — a user with auth ID `dev|1` should now exist.

- [ ] **Step 4: Commit**

  ```bash
  git add PrintLogApi/Startup.cs
  git commit -m "feat: use DevAuthenticationHandler in Development environment, bypassing Auth0"
  ```

---

### Task 5: Add LICENSE file

**Files:**

- Create: `LICENSE`

- [ ] **Step 1: Download the AGPL-3.0 license text**

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

### Task 6: Add GitHub Actions CI workflow

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

        - name: Setup .NET
          uses: actions/setup-dotnet@v4
          with:
            dotnet-version: '8.x'

        - name: Restore dependencies
          run: dotnet restore

        - name: Build
          run: dotnet build --no-restore --configuration Release

        - name: Test
          run: dotnet test --no-build --configuration Release --verbosity normal
  ```

  Adjust `dotnet-version` to match the version used in your `.csproj` file (`TargetFramework` property).

- [ ] **Step 3: Commit**

  ```bash
  git add .github/workflows/ci.yml
  git commit -m "ci: add GitHub Actions CI workflow for PRs"
  ```

---

### Task 7: Add GitHub Actions deploy workflow

**Files:**

- Create: `.github/workflows/deploy.yml`

The deploy workflow fires on version tags (`v*`) only. It requires the following GitHub Actions secrets to be configured in the repo settings:

- `AZURE_WEBAPP_NAME` — the Azure App Service name
- `AZURE_WEBAPP_PUBLISH_PROFILE` — the publish profile XML from Azure Portal (App Service → Get publish profile)

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

        - name: Setup .NET
          uses: actions/setup-dotnet@v4
          with:
            dotnet-version: '8.x'

        - name: Restore dependencies
          run: dotnet restore

        - name: Build
          run: dotnet build --no-restore --configuration Release

        - name: Test
          run: dotnet test --no-build --configuration Release --verbosity normal

        - name: Publish
          run: dotnet publish PrintLogApi/PrintLogApi.csproj --configuration Release --output ./publish

        - name: Deploy to Azure App Service
          uses: azure/webapps-deploy@v3
          with:
            app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
            publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
            package: ./publish
  ```

  **Before this workflow will succeed:** configure the two secrets in GitHub → repo Settings → Secrets and variables → Actions.

- [ ] **Step 2: Commit**

  ```bash
  git add .github/workflows/deploy.yml
  git commit -m "ci: add GitHub Actions deploy workflow triggered by version tags"
  ```

---

### Task 8: Add CONTRIBUTING.md

**Files:**

- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create CONTRIBUTING.md**

  Create `CONTRIBUTING.md` at the repo root:

  ````markdown
  # Contributing to 3D Print Log API

  Thank you for your interest in contributing!

  ## Prerequisites

  - [.NET 8 SDK](https://dotnet.microsoft.com/download)
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/)

  ## Local Setup

  1. **Clone the repo**
     ```bash
     git clone https://github.com/HoffmanEngineering/3d-print-log-api.git
     cd 3d-print-log-api
     ```
  ````

  2. **Start the local database and blob storage**

     ```bash
     docker compose up -d
     ```

     This starts SQL Server (port 1433) and Azurite blob storage (port 10000) with persistent volumes.

  3. **Configure local settings**

     ```bash
     cp PrintLogApi/appsettings.Development.example.json PrintLogApi/appsettings.Development.json
     ```

     The default values work out of the box with Docker Compose. You do **not** need an Auth0 account for local development.

  4. **Run database migrations**

     ```bash
     cd PrintLogApi
     dotnet ef database update
     ```

  5. **Start the API**
     ```bash
     dotnet run
     ```
     The API will be available at `https://localhost:5001`. Swagger UI is at `https://localhost:5001/swagger`.

  ## Dev Auth Bypass

  In `Development` mode the API accepts an `X-Dev-User-Id` header instead of a Bearer token. Sending `X-Dev-User-Id: 1` authenticates you as dev user 1 (created automatically on first use). Use different IDs to simulate multiple users.

  No Auth0 account is required for local development. If you need to test the real Auth0 login flow, set `ASPNETCORE_ENVIRONMENT=Staging` and fill in the Auth0 values in `appsettings.Development.json`.

  ## Running Tests

  ```bash
  dotnet test
  ```

  ## Submitting a PR

  - Fork the repo and create a branch from `master`
  - Make your changes with tests
  - Open a pull request — CI runs automatically

  ## Stopping the Local Environment

  ```bash
  docker compose down
  ```

  To wipe all local data and start fresh:

  ```bash
  docker compose down -v
  ```

  ```

  ```

- [ ] **Step 2: Commit**

  ```bash
  git add CONTRIBUTING.md
  git commit -m "docs: add CONTRIBUTING.md with local setup guide"
  ```

---

### Task 9: Add CODEOWNERS

**Files:**

- Create: `.github/CODEOWNERS`

- [ ] **Step 1: Create CODEOWNERS**

  Create `.github/CODEOWNERS`:

  ```
  # Maintainer review required for CI/CD and auth changes
  .github/workflows/   @ChristopherHoffman
  .github/CODEOWNERS   @ChristopherHoffman
  CLAUDE.md            @ChristopherHoffman
  PrintLogApi/Authentication/ @ChristopherHoffman
  PrintLogApi/Startup.cs      @ChristopherHoffman
  ```

  Replace `@ChristopherHoffman` with your actual GitHub username.

- [ ] **Step 2: Commit**

  ```bash
  git add .github/CODEOWNERS
  git commit -m "chore: add CODEOWNERS to protect workflows and auth code"
  ```

---

### Task 10: Add issue templates and PR template

**Files:**

- Create: `.github/ISSUE_TEMPLATE/bug-report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature-request.yml`
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Create bug report template**

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
          1. Call endpoint ...
          2. With payload ...
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
      id: version
      attributes:
        label: Version
        placeholder: e.g. v2.5.0
  ```

- [ ] **Step 2: Create feature request template**

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

- [ ] **Step 3: Create PR template**

  Create `.github/pull_request_template.md`:

  ```markdown
  ## What does this PR do?

  <!-- Brief description of the change -->

  ## How to test

  <!-- Steps to verify this works locally -->

  ## Checklist

  - [ ] Tested locally with `docker compose up` + `dotnet run`
  - [ ] Existing tests pass (`dotnet test`)
  - [ ] New tests added for new behaviour
  - [ ] No secrets or personal config committed
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add .github/ISSUE_TEMPLATE/ .github/pull_request_template.md
  git commit -m "docs: add issue templates and PR template"
  ```

---

### Task 11: Update README.md

**Files:**

- Modify: `README.md` (create it if it doesn't exist at the repo root)

- [ ] **Step 1: Update README.md**

  Replace the contents of `README.md` (or create it) with:

  ```markdown
  # 3D Print Log API

  [![CI](https://github.com/HoffmanEngineering/3d-print-log-api/actions/workflows/ci.yml/badge.svg)](https://github.com/HoffmanEngineering/3d-print-log-api/actions/workflows/ci.yml)
  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

  The backend API powering [3D Print Log](https://3dprintlog.com) — a web application for tracking 3D prints, printers, and filaments.

  ## Getting Started

  See [CONTRIBUTING.md](CONTRIBUTING.md) for local development setup.

  ## Tech Stack

  - ASP.NET Core (.NET 8)
  - Entity Framework Core + SQL Server
  - Auth0 (JWT Bearer authentication)
  - Azure Blob Storage (file storage)
  - Stripe (subscription billing)

  ## License

  [GNU Affero General Public License v3.0](LICENSE)
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add README.md
  git commit -m "docs: update README with project description, badges, and tech stack"
  ```

---

### Task 12: Configure GitHub Actions secrets and test deployment

This task is manual — no code changes.

- [ ] **Step 1: Add secrets in GitHub repo settings**

  Go to `github.com/HoffmanEngineering/3d-print-log-api` → Settings → Secrets and variables → Actions → New repository secret:

  - `AZURE_WEBAPP_NAME` — your Azure App Service name (e.g., `3d-print-log-api`)
  - `AZURE_WEBAPP_PUBLISH_PROFILE` — contents of the publish profile XML file (download from Azure Portal: App Service → Overview → Get publish profile)

- [ ] **Step 2: Create and push a test version tag**

  ```bash
  git tag v0.0.0-deploy-test
  git push origin v0.0.0-deploy-test
  ```

- [ ] **Step 3: Verify the deployment succeeds**

  Go to `github.com/HoffmanEngineering/3d-print-log-api` → Actions → Deploy workflow run. Confirm all steps pass and the API is reachable at its production URL.

- [ ] **Step 4: Delete the test tag**

  ```bash
  git tag -d v0.0.0-deploy-test
  git push origin --delete v0.0.0-deploy-test
  ```
