# Documentation Analytics

Queries for the monthly documentation review. Run them in the Azure portal against the
3D Print Log Application Insights resource: **Application Insights → Logs**, paste a
`.kql` file, set the time range, run.

## The monthly review — 15 minutes

The point of these queries is a decision, not a dashboard. Once a month, in this order:

1. **`zero-result-searches.kql`** — the single most actionable query. Every row is
   something a real person expected to find and could not. Rows here become documentation
   tasks, and sometimes feature requests.
2. **`negative-feedback.kql`** — pages readers explicitly marked unhelpful, worst ratio
   first. Read the comments; they say what the ratio cannot.
3. **`scroll-completion.kql`** — pages nobody finishes. A low completion rate on a long
   page usually means it should be split, not rewritten.
4. **`page-views.kql`** — top and bottom pages. Bottom pages are candidates for merging or
   deletion; top pages are where visual and structural investment pays back most.
5. **`help-link-clicks.kql`** — once in-app help ships, which app screens send people to
   the docs. This is the closest thing to a direct measure of which parts of the product
   confuse people.

Write the conclusions down somewhere durable — a GitHub issue comment is fine. A query you
run and forget is the same as no query.

## Events

Emitted by `src/app/documentation/docs-telemetry.service.ts` via `LoggingService`.

| Event                                 | Properties                              | Shipped in |
| ------------------------------------- | --------------------------------------- | ---------- |
| `Docs_PageView`                       | `slug`, `referrerKind`                  | Phase 0    |
| `Docs_ScrollDepth`                    | `slug`, `bucket` (25/50/75/100)         | Phase 0    |
| `Docs_Feedback`                       | `slug`, `helpful`, `comment` (optional) | Phase 0    |
| `Docs_Search`                         | `query`, `resultCount`                  | Phase 2b   |
| `Docs_SearchResultClick`              | `query`, `slug`, `rank`                 | Phase 2b   |
| `Docs_HelpLinkClick`                  | `source`, `slug`                        | Phase 4    |
| `Docs_TocClick` / `Docs_RelatedClick` | `slug`, `target`                        | Phase 2a   |

`referrerKind` is one of `direct`, `internal`, `search`, `external`. It describes how the
**first** docs page of a visit was reached — `document.referrer` is frozen at landing for the
life of a single-page app, so every later in-session navigation is reported as `internal`
rather than repeating whatever brought the reader in originally.

`Docs_ScrollDepth` is sampled on arrival as well as on scroll, so a page that fits entirely on
screen reports 100% rather than appearing unread.

Queries for events that have not shipped yet return no rows rather than failing. They are
committed now so the names stay fixed and the queries never need rewriting.

### Not yet available: `group` and `mode`

`Docs_PageView` will also carry the Diátaxis `group` and `mode` once documentation
frontmatter exists (phase 1a). Adding them today would mean a hand-maintained slug→group
map — exactly the kind of parallel list this program is removing. The queries below are
written so those columns can be added without restructuring them.

## Workbook

`workbook-docs-overview.json` is an Azure Workbook containing these queries on one page.

To install it: **Application Insights → Workbooks → New → Advanced Editor** (the `</>`
icon), replace the contents with this file, then **Apply** and **Save**.

It has not been installed yet — that needs portal access to the production resource.
