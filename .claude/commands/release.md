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
<p>[Summary paragraph describing the main changes]</p>
<h4>Full List of Changes:</h4>
<ul>
  <li><strong>[Feature/Fix Name]</strong> - [Description]</li>
  <!-- More list items as needed -->
</ul>
```

Place the new section after the `<hr />` and before the previous version's `<h3>`.

#### 4.3 Update Version Dialog Service

Update `src/app/core/services/version-release-note-dialog.service.ts`:

**For Patch releases:**
Add a redirect entry at the beginning of the `releaseNotes` object:

```typescript
'X.X.Z': {
  redirect: 'X.X.Y',  // Previous minor/major version
},
```

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
2. After the PR is merged into master, create a git tag:
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
- For the dialog body (version-release-note-dialog.service.ts), keep it concise - 1-2 paragraphs max
- The full release notes HTML can be more detailed with bullet lists
