# Open Source Migration — Plan 1: Migration & Repository Setup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rotate compromised credentials, create the HoffmanEngineering GitHub organization, scrub git history, and push both repos to private GitHub repos ready for code changes.

**Architecture:** Mirror-clone both Azure DevOps repos locally, run `git-filter-repo` to remove files with committed secrets before they ever touch GitHub, then push clean history to private GitHub repos. This is the prerequisite for Plans 2 and 3.

**Tech Stack:** git, git-filter-repo (Python), GitHub web UI, Auth0 Dashboard, Azure Portal

---

### Task 1: Rotate compromised credentials

The following credentials are currently in the API git history and must be rotated **before** the repo is pushed anywhere — even to a private GitHub repo.

**Files:**

- No code changes — external service actions only

- [ ] **Step 1: Rotate the Auth0 Management API client secret**

  Log in to the Auth0 Dashboard at `manage.auth0.com`. Navigate to:
  Applications → Applications → Find the Management API application for the `dev-3dprintlog.auth0.com` tenant (the one with ClientId `YuJyGhpy2WmFuDCG21OneUwg8L0ogbAr`) → Credentials tab → Rotate secret.

  Save the new secret somewhere secure (password manager). You will need it when filling in `appsettings.Development.json` on your local machine after Plan 2 is complete.

- [ ] **Step 2: Rotate the staging database password**

  Log in to the Azure Portal. Navigate to the staging SQL Server resource (`3d-print-log-dev.database.windows.net`) → SQL databases → Security → Reset the password for the `PrintLogStaging` login.

  Save the new password somewhere secure. Update your local `appsettings.Staging.json` immediately so you can still connect.

- [ ] **Step 3: Verify local connectivity still works**

  Start the API locally and confirm it can connect to the staging database with the new credentials. This is a sanity check before moving on.

---

### Task 2: Install git-filter-repo

- [ ] **Step 1: Install git-filter-repo**

  ```bash
  pip install git-filter-repo
  ```

  Verify:

  ```bash
  git filter-repo --version
  ```

  Expected output: version number printed (e.g., `2.45.0`)

---

### Task 3: Create the HoffmanEngineering GitHub organization

- [ ] **Step 1: Create the organization**

  Go to `github.com` → Your profile menu (top right) → "Your organizations" → "New organization" → Choose the Free plan → Set organization name to `HoffmanEngineering` → Set contact email → Create.

- [ ] **Step 2: Create the private UI repo**

  In the `HoffmanEngineering` org: Repositories → New repository → Name: `3d-print-log-ui` → Private → **do not** initialize with README/gitignore/license → Create.

- [ ] **Step 3: Create the private API repo**

  In the `HoffmanEngineering` org: Repositories → New repository → Name: `3d-print-log-api` → Private → **do not** initialize with README/gitignore/license → Create.

- [ ] **Step 4: Create a personal access token for pushing**

  GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → Select scopes: `repo` (full control of private repositories) → Generate → Save the token securely.

---

### Task 4: Migrate and scrub the UI repo

The UI repo has no secrets in git history — but we still do a mirror clone and push so the history is clean from the start.

- [ ] **Step 1: Mirror-clone the UI repo from Azure DevOps**

  ```bash
  git clone --mirror https://dev.azure.com/HoffmanEngineering/3D%20Print%20Log/_git/3D%20Print%20Log%20UI ui-mirror.git
  cd ui-mirror.git
  ```

  You will be prompted for your Azure DevOps credentials.

- [ ] **Step 2: Push to GitHub**

  ```bash
  git remote add github https://github.com/HoffmanEngineering/3d-print-log-ui.git
  git push --mirror github
  ```

  Enter your GitHub username and personal access token when prompted.

  Expected: all branches and tags pushed successfully.

- [ ] **Step 3: Verify history on GitHub**

  Browse to `github.com/HoffmanEngineering/3d-print-log-ui` → Commits on `master`. Confirm the commit history matches your Azure DevOps history.

- [ ] **Step 4: Clean up local mirror**

  ```bash
  cd ..
  rm -rf ui-mirror.git
  ```

---

### Task 5: Migrate and scrub the API repo

The API repo has real credentials in history. We scrub them locally before the first push.

**Files with secrets to remove:**

- `PrintLogApi/appsettings.Development.json` — Auth0 Management ClientSecret, local DB password
- `PrintLogApi/appsettings.Staging.json` — staging Azure SQL password
- `PrintLogApi/3dprintlog.env` — Azure Storage connection string

- [ ] **Step 1: Mirror-clone the API repo from Azure DevOps**

  ```bash
  git clone --mirror https://dev.azure.com/HoffmanEngineering/3D%20Print%20Log/_git/PrintLogApi api-mirror.git
  cd api-mirror.git
  ```

- [ ] **Step 2: Remove appsettings.Development.json from all history**

  ```bash
  git filter-repo --path PrintLogApi/appsettings.Development.json --invert-paths
  ```

  Expected: output showing commits rewritten.

- [ ] **Step 3: Remove appsettings.Staging.json from all history**

  ```bash
  git filter-repo --path PrintLogApi/appsettings.Staging.json --invert-paths
  ```

- [ ] **Step 4: Remove 3dprintlog.env from all history**

  ```bash
  git filter-repo --path PrintLogApi/3dprintlog.env --invert-paths
  ```

- [ ] **Step 5: Verify files are gone from history**

  ```bash
  git log --all --full-history -- "PrintLogApi/appsettings.Development.json"
  git log --all --full-history -- "PrintLogApi/appsettings.Staging.json"
  git log --all --full-history -- "PrintLogApi/3dprintlog.env"
  ```

  Expected: no output for any of the three commands (files no longer appear in history).

- [ ] **Step 6: Push clean history to GitHub**

  ```bash
  git remote add github https://github.com/HoffmanEngineering/3d-print-log-api.git
  git push --mirror github
  ```

  Expected: all branches and tags pushed successfully.

- [ ] **Step 7: Verify history on GitHub**

  Browse to `github.com/HoffmanEngineering/3d-print-log-api` → Commits. Confirm history is present and the three scrubbed files do not appear in any commit's file list.

- [ ] **Step 8: Clean up local mirror**

  ```bash
  cd ..
  rm -rf api-mirror.git
  ```

---

### Task 6: Update local remotes and archive Azure DevOps

- [ ] **Step 1: Update the UI repo's remote to GitHub**

  In your local working copy of the UI repo (`D:/Development/3d-print-log/print-log-ui`):

  ```bash
  git remote rename origin azure
  git remote add origin https://github.com/HoffmanEngineering/3d-print-log-ui.git
  git fetch origin
  ```

- [ ] **Step 2: Update the API repo's remote to GitHub**

  In your local working copy of the API repo (`D:/Development/3d-print-log/PrintLogApi`):

  ```bash
  git remote rename origin azure
  git remote add origin https://github.com/HoffmanEngineering/3d-print-log-api.git
  git fetch origin
  ```

- [ ] **Step 3: Archive both Azure DevOps repos**

  In Azure DevOps: Project Settings → Repositories → select each repo → Settings → toggle "Disable Repository" (or set to read-only). Do **not** delete them — keep as reference until the first successful deployment from GitHub.

- [ ] **Step 4: Commit**

  No code to commit — this task is complete when both GitHub repos have clean history and Azure DevOps repos are archived.
