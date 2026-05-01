# Open Source Migration Design

**Date:** 2026-04-30
**Status:** Approved

## Overview

Migrate the 3D Print Log UI and API from private Azure DevOps repos to public GitHub repos under the `HoffmanEngineering` organization, with AGPL-3.0 licensing, credential cleanup, developer local setup support, and GitHub Actions CI/CD. Full end-user self-hosting is explicitly out of scope for this project.

---

## Decisions

| Decision              | Choice                                                                             |
| --------------------- | ---------------------------------------------------------------------------------- |
| License               | AGPL-3.0                                                                           |
| GitHub org            | `HoffmanEngineering`                                                               |
| Repo names            | `3d-print-log-ui`, `3d-print-log-api`                                              |
| Repo structure        | Two separate repos                                                                 |
| CI/CD                 | GitHub Actions, tag-triggered deploys (`v*`)                                       |
| Branching strategy    | PRs only to `main` (no direct pushes); `release/vX.Y.Z` branches for version bumps |
| Dev auth bypass       | API `DevAuthenticationHandler` + UI `devAuthBypass` flag with `?devUserId=` param  |
| Local database        | Docker Compose with SQL Server container                                           |
| Local blob storage    | Docker Compose with Azurite container                                              |
| Self-hosting          | Out of scope for this project                                                      |
| Contributor agreement | None — AGPL-3.0 implies contribution terms                                         |
| History scrub         | `git-filter-repo` locally before first push to GitHub                              |
| Go public order       | API first, then UI                                                                 |

---

## Phases

### Phase 0 — Pre-migration (before touching GitHub)

**Rotate all exposed credentials immediately.** The following are currently committed in the API git history and must be considered compromised:

- `appsettings.Development.json`: Auth0 Management `ClientSecret`, local DB password
- `appsettings.Staging.json`: Staging Azure SQL password

Rotate these in Auth0 and Azure before any other work begins.

---

### Phase 1 — Repository migration

1. `git clone --mirror <azure-devops-url>` for each repo locally
2. Run `git-filter-repo` on the local clone to scrub tracked secrets files (see Phase 2 for file list)
3. Create `HoffmanEngineering` GitHub organization (free tier)
4. Create `3d-print-log-ui` and `3d-print-log-api` as **private** repos in the org
5. `git push --mirror <github-url>` — clean history, no force-push needed
6. Verify history on GitHub looks correct

After both repos are live on GitHub, set the Azure DevOps repos to read-only/archived. Do not delete them until after the first successful deployment from GitHub confirms everything works.

---

### Phase 2 — Credential safety

**API repo — files to remove from git history entirely:**

| File                           | Reason                                           |
| ------------------------------ | ------------------------------------------------ |
| `appsettings.Development.json` | Auth0 Management ClientSecret, local DB password |
| `appsettings.Staging.json`     | Staging Azure SQL password                       |
| `3dprintlog.env`               | Azure Storage connection string reference        |

These are removed via `git-filter-repo --path <file> --invert-paths` before the initial push. After migration, add them to `.gitignore` and check in example templates:

- `appsettings.Development.example.json` — all keys present, values replaced with descriptive placeholders (e.g., `"YOUR_AUTH0_CLIENT_SECRET"`), with comments explaining where to obtain each value
- `appsettings.Staging.example.json` — same pattern (internal use)
- `3dprintlog.env.example` — same pattern

**UI repo — no history scrub needed:**

Environment files contain Auth0 client IDs and public-facing analytics IDs (GA, App Insights, Stripe price IDs) that are low-sensitivity. Restructure going forward:

- Keep `environment.ts` checked in (dev config, localhost API, dev Auth0 tenant IDs — fine for contributors)
- Remove `environment.prod.ts` and `environment.staging.ts` from git tracking; add to `.gitignore`
- Add `environment.prod.example.ts` documenting required keys

**Both repos:** Add `LICENSE` file (AGPL-3.0) at the root.

---

### Phase 3 — Developer local setup

Goal: a contributor can clone, copy example configs, fill in a handful of values, and run the full stack with no Auth0 account required.

#### Docker Compose (API repo)

A `docker-compose.yml` in the API repo starts two containers:

- **SQL Server** — identical behavior to production, cross-platform, no LocalDB dependency
- **Azurite** — Microsoft's local Azure Blob Storage emulator, behaves identically to Azure Storage

Both containers use **persistent named Docker volumes** so data survives container restarts and `docker compose down`. A contributor who needs a clean slate (e.g. to test migrations from scratch) can run `docker compose down -v` to wipe volumes explicitly — this is an intentional opt-in, not the default.

Connection strings for both are pre-configured in `appsettings.Development.example.json`. A contributor runs `docker compose up` then starts the API — no manual database install required.

Note: Azurite is the right choice for developer setup. For future end-user self-hosting, Azurite would be replaced by a local filesystem implementation behind an `IFileStorageService` abstraction — that work is out of scope here.

#### API — dev auth bypass

A `DevAuthenticationHandler` registered **only** when `ASPNETCORE_ENVIRONMENT == Development`:

- Reads the `X-Dev-User-Id` header from the request
- Constructs a `ClaimsPrincipal` where the Auth0 ID claim is set to `dev|{id}` (e.g., `dev|1`)
- Bypasses JWT validation entirely — no Auth0 tenant needed
- The existing user lookup/upsert logic runs unchanged: first request with `dev|1` creates that user, subsequent requests find them. No seed data required.
- In all other environments this handler is never registered — it cannot be accidentally activated in production.

#### UI — dev auth bypass

`environment.ts` gets a `devAuthBypass: true` flag (absent from `environment.prod.ts`). When true:

- `AuthGuard` always passes without checking Auth0
- `AuthInterceptorService` sends `X-Dev-User-Id: {id}` header instead of a Bearer token, where `{id}` is read from the `?devUserId=` URL query param, defaulting to `1`
- `AuthService` returns a minimal hardcoded mock user profile (enough to render the UI)
- No Auth0 SDK calls are made

**Cross-account testing in bypass mode:** Open two browser tabs with different `?devUserId=` values (e.g., `localhost:4200?devUserId=2`). Each tab operates as a distinct user — the API upserts them on first use.

**Real Auth0 flow when needed:** A separate `npm run start:auth0` script uses `environment.auth0-dev.ts` with `devAuthBypass: false`, requiring a real Auth0 dev tenant. Used when testing the actual authentication flow or Auth0-specific behavior. `environment.auth0-dev.ts` is created as part of this phase (not checked in — added to `.gitignore`), with a corresponding `environment.auth0-dev.example.ts` template checked in.

#### Documentation

- `CONTRIBUTING.md` in each repo with step-by-step local setup
- UI: Node version, `npm install`, copy `environment.ts` if needed, `npm start`
- API: .NET version, `docker compose up`, copy `appsettings.Development.example.json` → `appsettings.Development.json`, fill in values, run EF migrations, start the API

---

### Phase 4 — GitHub Actions CI/CD

#### Workflow files per repo

**`ci.yml`** — triggers on every PR (including fork PRs):

- No secrets, no deployment
- UI: `npm ci` → `npm run lint:brief` → `npm run test:ci` → `npm run build`
- API: `dotnet restore` → `dotnet build` → `dotnet test`
- This is what contributors see running on their PRs

**`deploy.yml`** — triggers only on version tags (`v*`):

- Uses Azure deployment secrets stored in GitHub repo settings
- UI: full CI steps + deploy build artifact to Azure
- API: full CI steps + `dotnet publish` + deploy to Azure App Service
- Fork PRs never trigger this workflow

#### Fork PR security

By default, GitHub runs fork PRs with read-only permissions and no access to repo secrets. First-time contributors require manual approval before their workflow runs at all. This is enforced by GitHub — not configurable away by contributors.

#### Branch protection on `main`

Configured once repos go public (free tier requires public repos for branch protection):

- No direct pushes — PRs required
- CI workflow must pass before merge
- `CODEOWNERS` file requiring maintainer review on `.github/workflows/` changes

#### Release workflow

Deploys are **not** triggered by merging to `main`. The release flow:

1. Feature PRs merge to `main` freely as completed (no version bump required)
2. When ready to release: create `release/vX.Y.Z` branch off `main`
3. Bump `package.json` version (UI) and update the release notes Angular component
4. Open PR from `release/vX.Y.Z` → `main`, merge it
5. Tag the merge commit: `git tag vX.Y.Z && git push origin vX.Y.Z`
6. `deploy.yml` fires from the tag

#### Deployment gate

Before going public, complete at least one successful end-to-end deployment from GitHub Actions on the private repos — both UI and API. This confirms Azure credentials are correctly wired and the full pipeline works.

---

### Phase 5 — Contributor polish

**Both repos:**

- `LICENSE` — AGPL-3.0 (added in Phase 2, confirmed here)
- `CONTRIBUTING.md` — local setup steps, how to run tests, PR expectations, link to open issues
- `CODEOWNERS` — maintainer required as reviewer for `.github/workflows/` and auth-related code
- `README.md` updates — project description, CI status badge, license badge, screenshot, link to live app, "how to contribute" section
- Issue templates — bug report and feature request (`.github/ISSUE_TEMPLATE/`)
- PR template — checklist for testing locally, screenshots for UI changes (`.github/pull_request_template.md`)

---

### Phase 6 — Go public

1. Confirm successful deployment from GitHub Actions (Phase 4 gate)
2. Flip **API repo** to public first — UI depends on it, stability matters more
3. Flip **UI repo** to public
4. Enable branch protection on `main` for both repos (now available on free tier)
5. Set Azure DevOps repos to archived/read-only
6. Update any in-app links pointing to source code (about page, documentation)
7. Update `CLAUDE.md` to reflect GitHub as source of truth

**Optional follow-up (not blocking go-public):**

- Transfer `3d-print-log-cura-plugin` and `Slic3rPostProcessingUploader` to `HoffmanEngineering` org
- Create `HoffmanEngineering/.github` org profile README

---

## Out of Scope

The following are explicitly deferred to a future project:

- Full end-user self-hosting support
- `IFileStorageService` abstraction with local filesystem implementation (prerequisite for self-hosting)
- SQLite database support for self-hosters
- Docker Compose setup targeting end-users (vs. developers)
- Alternative authentication providers (non-Auth0)
- Contributor License Agreement (CLA)

---

## Security Notes

- No secrets are ever committed to the repo. All sensitive values are injected at runtime via environment variables / GitHub Actions secrets / Azure Key Vault.
- The dev auth bypass (`DevAuthenticationHandler`) is gated strictly on `IsDevelopment()` and cannot be activated in staging or production environments.
- `environment.prod.ts` is gitignored and never committed — production Auth0 client IDs, analytics keys, and Stripe IDs are not in the public repo.
- Fork PRs have read-only access and no secrets by GitHub platform design.
