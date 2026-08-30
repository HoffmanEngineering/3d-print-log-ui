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

#### 4.2 Write the Release Note

Create **one new file**, `src/content/release-notes/X.Y.Z.md`. Nothing else needs editing: the docs
generator picks it up, renders it into `/docs/release-notes`, and adds it to `docs-manifest.json`.
There is no shared changelog to edit and no merge conflict to resolve.

> **This file is also the single source of truth for the GitHub Release body.**
>
> `.github/workflows/deploy.yml` runs `scripts/extract-release-notes.mjs` against the pushed tag and
> publishes the result as that version's GitHub Release. Nothing is written by hand on github.com,
> and `generate_release_notes` is deliberately NOT used — the prose written here is better than a
> dump of PR titles, which is the whole reason for the extraction.
>
> Four consequences that change how you write this file:
>
> - **A tag with no matching file fails the deploy.** That check is the first step of the build
>   job, so it fails in seconds rather than after the build and test run — but it does mean the
>   file must exist _before_ the tag is pushed. (`v1.32.1` predates this and is the one known gap.)
> - **The filename is a contract.** `1.49.1.md` must declare `version: 1.49.1`, and the page anchor
>   is generated from that field as `#v1.49.1`. It is never derived from the heading text, because a
>   slugger would mangle the dots. `validate-docs.mjs` fails if a previously published anchor stops
>   being emitted. Two-part versions like `1.6` are normalized to `1.6.0` when a tag is matched, but
>   new releases should always be three-part.
> - **Do not write the heading yourself.** The generator emits
>   `<h3 id="v1.49.1">1.49.1 - Push Notification Fixes</h3>` from `version` and `title`. A heading in
>   the body would sit underneath it as a duplicate.
> - **The body is converted to Markdown for GitHub, so only certain shapes survive.** The converter
>   handles paragraphs, `####` headings, lists (including nesting), `**bold**`, `_italic_`, `` `code` ``
>   and links. Anything else — a `<span>`, a table — would leak into the release body as raw tags. A
>   test in `scripts/release-notes-lib.test.mjs` runs the whole corpus and fails if any release
>   produces unrendered tags, so this is caught by `npm run test:scripts` rather than discovered on
>   the Releases page.
>
> Related: site-relative links (`[Settings](/settings)`) become `routerLink`s on the page and are
> rewritten to absolute `https://www.3dprintlog.com` URLs for GitHub, because a relative link is
> dead once the body is rendered on github.com. `&lt;` and `&gt;` are deliberately left escaped —
> GitHub renders raw HTML inside Markdown, so decoding them would make a deliberately shown tag
> vanish.

Format for a new release note:

```markdown
---
version: X.Y.Z
date: YYYY-MM-DD
title: '[Short Title]'
---

[Summary paragraph for the first major feature. Use parentheses instead of em dashes.]

[Second paragraph for additional major features, if any. Each distinct feature gets its own paragraph.]

#### Full List of Changes:

- **[Feature/Fix Name]** - [Description] ([PR #N](https://github.com/HoffmanEngineering/3d-print-log-ui/pull/N))
```

Frontmatter fields:

- `version` — must equal the filename. Drives the `#vX.Y.Z` anchor.
- `date` — the release date, `YYYY-MM-DD`.
- `title` — the short title, without the version number. May be empty for a release with no title.
- `highlights` — optional list of tags (`highlights: [labels, analytics]`) for later what's-new
  work. Leave it out when there is nothing meaningful to tag; do not invent tags.

**Record the anchor.** Add `"vX.Y.Z"` to the top of the `docs/release-notes` list in
`src/content/docs-anchors.json`. That file is the record of what the outside world may have
bookmarked, and `validate-docs.mjs` fails if an anchor listed there stops being emitted.

**Pagination:** `/docs/release-notes` renders only the ten most recent releases; everything older
loads from a separate chunk behind a "Show N older releases" button. Adding a release therefore
pushes one into the archive on its own. Nothing needs doing about that, and every published anchor
keeps resolving either way.

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

#### 4.4 Preview the GitHub Release body

Before tagging, render what the GitHub Release will actually say:

```bash
node scripts/extract-release-notes.mjs vX.Y.Z
node scripts/extract-release-notes.mjs vX.Y.Z --title
```

This is the exact command the deploy workflow runs, so it catches a missing section, a mistyped
`id`, or an HTML shape the converter does not handle — locally, in under a second, instead of on a
tag push. Check the output for stray `<` or `>` tags and confirm every PR link resolved.

### 5. User Review

After making the changes, ask the user to review the release notes. Show them what was generated and ask if they want to make any modifications.

### 6. Git Operations

1. Check if currently on master/main branch:

   - If YES: Create a new branch named `release/vX.X.X`
   - If NO: Stay on the current feature branch

2. Stage the changed files:

   - `package.json`
   - `src/content/release-notes/X.Y.Z.md`
   - `src/content/docs-anchors.json`
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
3. Pushing the tag now does three things, in order: it builds and tests, then **waits for your
   approval** on the `production` environment, then deploys and **publishes the GitHub Release**
   automatically from the notes written in step 4.2. There is no separate step to write a release
   on github.com, and the Release will not appear until the deploy is approved and succeeds.

## Guidelines for Writing Release Notes

- Write in clear, user-friendly language
- Focus on what benefits the user gets from the changes
- Group related changes together
- Use bold for feature names
- Include links to relevant documentation pages where applicable
- The full release notes HTML can be more detailed with bullet lists
- **Never use em dashes (—)** in prose; use parentheses instead where a parenthetical is needed

### Release Note File (`src/content/release-notes/X.Y.Z.md`)

- Use separate paragraphs for each distinct major feature — do not run multiple features together in one paragraph
- The summary paragraph(s) should read as a narrative description, not a changelog list
- The bullet list is where full detail lives; the paragraph(s) above are the "why it matters" summary
- **Every bullet links its PR** where one exists (see 4.2). Keep PR links out of the summary paragraphs and the dialog body; they belong on the bullets only
- Reference a prior **version** (not a PR) when it explains user-visible history, e.g. "an issue introduced in 1.43.9" — that means something to a user in a way a PR number does not
- The file is yours alone, so `prettier --write` on it is safe and reformats nothing else. That is the point of one file per release: the diff for a release is a single added file

### Dialog Body (`version-release-note-dialog.service.ts`)

- **Tone**: Match the style of existing entries — enthusiastic and user-focused. Look at prior entries before writing.
- **Lead with the feature name bolded**: e.g. `<strong>Feature Name</strong> is here! Description...` — not `This release adds a <strong>Feature Name</strong> setting...`
- **One feature per sentence or paragraph**: Do not chain multiple features with semicolons. If there are two notable features, give each its own sentence or paragraph.
- **Keep it concise**: 1–2 short paragraphs max (excluding the support/donation paragraph)
- **Title**: If the release has two or more notable features, reflect both in the title, e.g. `X.X.0 - Feature One & Feature Two`
