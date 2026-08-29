---
name: adding-a-docs-page
description: Use when adding a new page under /docs to the 3D Print Log UI (a new documentation or onboarding article), or when a docs page renders but is missing from the sidebar, SEO metadata, sitemap, or prerender output.
---

# Adding a /docs Page

## Overview

A docs page is **one Markdown file**. Everything else — the component, the route, the
sidebar entry, the SEO metadata, `DOC_ROUTES`, the prerender server route, the search
index — is generated from its frontmatter by `scripts/build-docs.mjs`.

There is nothing to register by hand, and no route count to bump anywhere.

## Add the page

Create `src/content/docs/<slug>.md`:

```markdown
---
slug: bed-leveling
title: Bed Leveling | 3D Print Log Docs
description: Record bed leveling runs against a printer so you can see when a bed was last trammed and how often it drifts.
navLabel: Bed Leveling
group: features
order: 40
mode: how-to
updated: 2026-08-29
related: [printers, prints]
---

## Bed Leveling

---

Open the [Printers](/printers) section and pick a printer to record a leveling run.
```

Then:

```bash
npm run docs:generate
```

Generated output lands in `src/app/documentation/generated/` and is **gitignored** — never
edit it and never commit it. Every npm script that needs it (`start`, `start:e2e`, `build`,
`build:dev`, `test`, `test:ci`, `test:brief`, `test:scripts`, `source-map-explorer`) runs
generation first, and `npm start` keeps a watcher running, so editing the `.md` is enough
during development.

## Frontmatter reference

| Field         | Required | Notes                                                                                       |
| ------------- | -------- | ------------------------------------------------------------------------------------------- |
| `slug`        | yes      | Must equal the filename. Becomes `/docs/<slug>`.                                            |
| `title`       | yes      | The `<title>` and OG title. **Globally unique** (pooled with the marketing routes).         |
| `description` | yes      | Meta description. Globally unique, and **50–170 characters** — enforced.                    |
| `navLabel`    | yes      | Short label for the sidebar. Usually shorter than the title.                                |
| `group`       | yes      | One of `start`, `features`, `integrations`, `about`. Sidebar dividers follow group changes. |
| `order`       | yes      | Sort position within the group. Leave gaps (10, 20, 30) so a page can be inserted later.    |
| `mode`        | yes      | Diátaxis mode: `tutorial`, `how-to`, `reference`, `explanation`.                            |
| `updated`     | yes      | `YYYY-MM-DD`.                                                                               |
| `related`     | no       | Slugs of related pages.                                                                     |
| `aliases`     | no       | Old paths that should redirect here, e.g. `aliases: [filaments]` on `materials.md`.         |
| `constants`   | no       | See escape hatches below.                                                                   |
| `component`   | no       | See escape hatches below.                                                                   |

A sibling `src/content/docs/<slug>.scss` is picked up automatically as the page's styles —
no frontmatter field for it.

Aliases generate a redirect route only. They are excluded from `DOC_ROUTES`, the sitemap and
the prerender set, so an old URL keeps working without competing for the same SEO metadata.

## Writing the body

The body is Markdown, but it compiles to an **Angular template**, so two rules differ from
ordinary Markdown:

- **Headings never get a derived id.** Anchor ids are contractual: people have deep links to
  them. To publish an anchor, write it explicitly: `### Prints List {#list}`.
- **Raw HTML passes through byte for byte**, as does a ` ```angular-html ` fence. Use those
  when you need markup Markdown cannot express (`<mat-icon>`, `<youtube-player>`, a `<dl>`).

Link forms:

| Markdown                           | Compiles to                                 |
| ---------------------------------- | ------------------------------------------- |
| `[Prints](/prints)`                | `routerLink="/prints"`                      |
| `[Klipper](https://klipper3d.org)` | `href=…` + `target="_blank" rel="noopener"` |
| `[jump](#list)` / `mailto:`        | a plain `href`                              |

Elements are restricted to an allowlist (`ELEMENT_ALLOWLIST` in `scripts/docs-validate-lib.mjs`),
which covers ordinary prose markup plus `mat-icon`, `youtube-player`, `button`, `article`,
`section`, `figure`, `dl`/`dt`/`dd` and the table elements. Adding an element means adding it
there deliberately.

`src/content/docs/` is in `.prettierignore` on purpose — prettier's Markdown printer re-wraps
lines (breaking raw HTML tags across a line that then reads as a blockquote) and escapes
literal punctuation. Do not remove that entry.

## The two escape hatches

**`constants:`** — the page needs a value in `{{ }}` but no behavior. The generator emits a
`readonly` field per entry. A value containing `${…}` is emitted as a template literal, so
one constant can compose others (see `mcp.md`):

```yaml
constants:
  mcpEndpoint: 'https://api.3dprintlog.com/mcp'
  claudeCodeCommand: 'claude mcp add --transport http printlog ${this.mcpEndpoint}'
```

**`component:`** — the page needs real behavior (injected services, event handlers). The
generator compiles only the template and the manifest entry; you own the class, and you
declare it in `documentation.module.ts` yourself:

```yaml
component:
  className: DocsGettingStartedComponent
  path: ../docs/docs-getting-started/docs-getting-started.component
```

Only `getting-started` uses this today, because it is auth-aware on a **public** route. If
you write one: `standalone: false`, `ChangeDetectionStrategy.OnPush`, and SSR-safe — no
`window`/`document`/`localStorage` during construction or init, since the page prerenders in
Node and must also render logged out (see the public-route notes in AGENTS.md).

## Verify

```bash
npm run test:scripts   # generation, validation, and the Node script tests
npm run test:brief     # includes docs-pages.spec.ts, which covers every manifest page
npm run build && node scripts/verify-prerender.mjs
```

`scripts/validate-docs.mjs` replaces the old manual checklist. It fails on: missing or
mistyped frontmatter, a slug that does not match its filename, a duplicate slug or alias, a
description outside 50–170 characters, a duplicate title or description within docs, a broken
internal doc link or dangling `#anchor` (including the `[routerLink]="['/docs/x']"` form that
raw HTML blocks use), a link to a dormant page, a duplicate `id` within a page, a previously
published anchor that disappeared — including one orphaned by deleting its whole page
(baseline: `src/content/docs-anchors.json`), a disallowed element, and a template referencing
a class member that is not declared.

Drift between the sources and the generated output is a separate gate:
`node scripts/build-docs.mjs --check` exits non-zero on it. `npm run test:scripts` regenerates
before validating, so it never observes drift — run `--check` yourself if you want to confirm
the tree is clean.

The element allowlist is a content-shape gate, not a security boundary: it constrains which
elements may appear, not which attributes or bindings. Doc sources are trusted repo content
and are reviewed as code.

`scripts/verify-prerender.mjs` still owns **global** title/description uniqueness, because
marketing SEO metadata lives in Angular sources a Node prebuild script cannot read.

## Common mistakes

- Editing a file under `src/app/documentation/generated/` — it is regenerated and gitignored.
- Adding a heading and expecting an anchor. Write `{#id}` explicitly.
- Changing or removing a published anchor. `docs-anchors.json` is a contract; validation fails.
- Description under 50 or over 170 characters, or reusing a marketing page's title.
- Reaching for `constants:` when the page needs a service. That is what `component:` is for.
- Forgetting `npm run docs:generate` after adding a page while a plain `ng` command is running.
