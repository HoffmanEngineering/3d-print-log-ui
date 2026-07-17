# Release Skill

Create a new release with release notes.

## Steps

### 1. Determine Current Version and Changes

1. Read the current version from `package.json`
2. Find the git tag for the current version (format: `vX.X.X`)
3. Get all commits between the current tag and HEAD using:
   ```bash
   git log v{current_version}..HEAD --oneline
   ```
4. If there's no tag for the current version, look for the most recent tag
5. Get the PR number for each change (needed for the release notes links, see below):
   ```bash
   git log v{current_version}..HEAD --merges --oneline
   ```
   Merge commits read `Merge pull request #N from <branch>`, which maps each PR number to the
   branch (and therefore to the changes) it delivered. Squash-merged PRs instead carry the number
   in the commit subject as `(#N)`. For anything still unmatched, fall back to
   `gh pr list --state merged --limit 20 --json number,title,mergedAt`.

### 2. Ask User for Release Type

Ask the user which type of release this is:

- **Major** - Breaking changes or major new features
- **Minor** - New features, enhancements
- **Patch** - Bug fixes, small improvements

### 3. Calculate New Version

Based on the current version (X.Y.Z):

- **Major**: Increment X, reset Y and Z to 0 (e.g., 1.30.0 -> 2.0.0)
- **Minor**: Increment Y, reset Z to 0 (e.g., 1.30.0 -> 1.31.0)
- **Patch**: Increment Z (e.g., 1.30.0 -> 1.30.1)

### 4. Update Files

#### 4.1 Update `package.json`

Update the `version` field to the new version.

#### 4.2 Update Release Notes HTML

Add a new section at the TOP of the release notes list in `src/app/documentation/docs/docs-release-notes/docs-release-notes.component.html`.

Format for new release notes:

```html
<h3 id="vX.X.X">X.X.X - [Short Title]</h3>
<p>[Summary paragraph for the first major feature. Use parentheses instead of em dashes.]</p>
<p>[Second paragraph for additional major features, if any. Each distinct feature gets its own paragraph.]</p>
<h4>Full List of Changes:</h4>
<ul>
  <li><strong>[Feature/Fix Name]</strong> - [Description] (<a href="https://github.com/HoffmanEngineering/3d-print-log-ui/pull/[N]" rel="noreferrer noopener" target="_blank">PR #[N]</a>)</li>
  <!-- More list items as needed -->
</ul>
```

Place the new section after the `<hr />` and before the previous version's `<h3>`.

**Always link the PR on every bullet where one exists.** Use the PR numbers gathered in step 1.

- Link **every** bullet that has a PR, not just some. Partial coverage reads as though the
  unlinked items are less real, which is worse than linking none.
- One PR can back several bullets (a large feature PR often delivers more than one user-visible
  change). Repeat the same link on each bullet it applies to.
- If a change has no PR (committed straight to `main`), leave that bullet unlinked rather than
  guessing at a number. Never invent or approximate a PR number.
- Link the **UI** repo (`3d-print-log-ui`) by default, since these are the UI release notes. When a
  feature is delivered mainly by the API, link the API PR too
  (`https://github.com/HoffmanEngineering/3d-print-log-api/pull/[N]`) and label it `API PR #[N]` to
  distinguish it.
- Verify each PR is actually **merged** before linking it (`gh pr view [N] --json state`). Linking
  an open or closed PR in shipped notes points users at something that isn't in the release.

#### 4.3 Update Version Dialog Service

Update `src/app/core/services/version-release-note-dialog.service.ts`:

**For Patch releases:**
Add a redirect entry at the beginning of the `releaseNotes` object.

**The `redirect` MUST point to the immediately-preceding published version** (the entry directly below the new one), NOT to an older version that has real notes. Redirects must form an unbroken step-down chain: `1.43.10 -> 1.43.9 -> 1.43.8 -> 1.43.7 -> ...`. Do NOT jump (e.g. `1.43.10 -> 1.43.7`).

```typescript
'X.Y.Z': {
  redirect: 'X.Y.(Z-1)',  // the version directly below this one in the list
},
```

**Why this matters:** `getRedirectedReleaseNotes()` walks the redirect chain and stops (shows no dialog) as soon as a `redirect` value equals the version the user last saw. A sequential chain means a user upgrading from the previous patch sees nothing (correct for a technical release), while a user coming from further back walks down to the most recent real feature note. A chain that jumps over versions breaks this guard and can re-show an old popup to users who already dismissed it. Note the component does no semver math — the version is only used as an object key and with `!==` equality — so multi-digit patches like `1.43.10` are fine as keys.

**For Major or Minor releases:**
Add a new release note entry at the beginning of the `releaseNotes` object:

```typescript
'X.X.0': {
  title: 'X.X.0 - [Short Title]',
  body: `<p>
[Summary paragraph - keep it shorter than the full release notes]
</p>
<p>
  <strong>Support development of 3D Print Log:</strong><br />
  <a href="/subscription">Subscribe to Pro</a> for an ad-free experience and extra cloud storage,
  buy me a coffee by <a
    href="https://paypal.me/hoffmanengineering"
    rel="noreferrer noopener"
    target="_blank"
    >donating via PayPal</a
  >, or by becoming a
  <a
    href="https://www.patreon.com/HoffmanEngineering"
    rel="noreferrer noopener"
    target="_blank"
  >
    Patron of Hoffman Engineering</a
  >
  on Patreon.com
  </p><p>Share <strong>3D Print Log</strong> with a friend, and Happy Printing!
</p>`,
},
```

### 5. User Review

After making the changes, ask the user to review the release notes. Show them what was generated and ask if they want to make any modifications.

### 6. Git Operations

1. Check if currently on master/main branch:

   - If YES: Create a new branch named `release/vX.X.X`
   - If NO: Stay on the current feature branch

2. Stage the changed files:

   - `package.json`
   - `src/app/documentation/docs/docs-release-notes/docs-release-notes.component.html`
   - `src/app/core/services/version-release-note-dialog.service.ts`

3. Commit with message: `feat: bump version to X.X.X`

4. Push the branch to remote

### 7. Final Reminders

Remind the user:

1. Create a merge/pull request for the release branch
2. After the PR is merged into main, create a git tag:
   ```bash
   git tag vX.X.X
   git push origin vX.X.X
   ```

## Guidelines for Writing Release Notes

- Write in clear, user-friendly language
- Focus on what benefits the user gets from the changes
- Group related changes together
- Use bold for feature names
- Include links to relevant documentation pages where applicable
- The full release notes HTML can be more detailed with bullet lists
- **Never use em dashes (—)** in prose; use parentheses instead where a parenthetical is needed

### HTML Release Notes (`docs-release-notes.component.html`)

- Use separate `<p>` paragraphs for each distinct major feature — do not run multiple features together in one paragraph
- The summary paragraph(s) should read as a narrative description, not a changelog list
- The bullet list is where full detail lives; the paragraph(s) above are the "why it matters" summary
- **Every bullet links its PR** where one exists (see 4.2). Keep PR links out of the summary paragraphs and the dialog body; they belong on the bullets only
- Reference a prior **version** (not a PR) when it explains user-visible history, e.g. "an issue introduced in 1.43.9" — that means something to a user in a way a PR number does not
- **Do not run `prettier --write` on this file.** It has pre-existing formatting drift, so a blanket rewrite reformats ~500 unrelated lines and buries the release diff. `prettier --check` also reports it as non-compliant for the same reason; that failure is expected and is not caused by your section. Hand-format your new section to match the surrounding style and confirm with `git diff --stat` that only your lines changed

### Dialog Body (`version-release-note-dialog.service.ts`)

- **Tone**: Match the style of existing entries — enthusiastic and user-focused. Look at prior entries before writing.
- **Lead with the feature name bolded**: e.g. `<strong>Feature Name</strong> is here! Description...` — not `This release adds a <strong>Feature Name</strong> setting...`
- **One feature per sentence or paragraph**: Do not chain multiple features with semicolons. If there are two notable features, give each its own sentence or paragraph.
- **Keep it concise**: 1–2 short paragraphs max (excluding the support/donation paragraph)
- **Title**: If the release has two or more notable features, reflect both in the title, e.g. `X.X.0 - Feature One & Feature Two`
