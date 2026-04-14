# Print Projects — Design Spec

**Date:** 2026-04-13
**Story:** #61
**Status:** Draft

---

## Overview

Users want to group related prints together under a "project" to track total time, filament usage, and cost across a multi-part build. A project is an optional, lightweight container — single one-off prints continue to work exactly as today with no friction added.

---

## Goals

- Allow prints to be grouped into a named project with aggregate stats (time, filament, cost)
- Support both personal organization and public sharing of a complete build
- Minimize friction: project assignment is optional and can be done inline during print creation
- Avoid a separate top-level nav section — projects live within the existing Prints area

## Non-Goals

- No kanban boards, task assignment, or sprint-style project management
- No many-to-many print/project relationships — a print belongs to at most one project
- No automatic status derivation — project status is set explicitly by the user

---

## Data Model

### New: `Project` entity (backend)

```
Project
  Id              Guid (PK)
  Name            string (max 100, required)
  Description     string (nullable)
  Url             string (nullable, max 1000) — model source URL (Printables, MakerWorld, etc.)
  Status          enum: InProgress=1, Complete=2, OnHold=3, Cancelled=4
  ViewStatus      enum: Public=1, Unlisted=2, Private=3
  Images          ICollection<ProjectImage>
  : TimestampEntity (CreatedById, CreatedDate, UpdatedById, UpdatedDate)
```

A GUID primary key is used (rather than a sequential long) to prevent enumeration of project IDs in public-facing URLs.

### New: `ProjectImage` entity

Mirrors the existing `PrintImage` model:

```
ProjectImage
  Id              int (PK, identity)
  ProjectId       Guid (FK → Project)
  IsDefault       bool
  DisplayOrder    int
  Url             string (base64 encoded, nullable)
```

### Modified: `Print` entity

```diff
+ ProjectId       Guid? (nullable FK → Project)
+ Project         Project (nav property)
```

A print with `ProjectId = null` is a standalone print — no behavioral change to existing prints.

---

## API

### New: `ProjectsController`

| Method   | Route                                  | Auth     | Description                                                                                                                                                                             |
| -------- | -------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/Projects`                        | Required | Paged list of the authenticated user's projects. Each item includes: id, name, status, viewStatus, print count, total print time, total filament weight, estimated cost, default image. |
| `GET`    | `/api/Projects/{id}`                   | Optional | Full project detail — metadata, aggregate stats, and print summaries. Public/Unlisted projects are accessible without auth (mirrors print behavior).                                    |
| `POST`   | `/api/Projects`                        | Required | Create a new project. Body: `{ name, status?, description?, url?, viewStatus? }`. Returns the created project including its GUID.                                                       |
| `PUT`    | `/api/Projects/{id}`                   | Required | Update project metadata (name, description, url, status, viewStatus). Owner only.                                                                                                       |
| `DELETE` | `/api/Projects/{id}?deletePrints=bool` | Required | Delete a project. If `deletePrints=true`, also deletes all member prints. If `deletePrints=false` (default), prints are unlinked and become standalone. Owner only.                     |
| `POST`   | `/api/Projects/{id}/images`            | Required | Upload one or more images to a project.                                                                                                                                                 |
| `DELETE` | `/api/Projects/{id}/images/{imageId}`  | Required | Remove a project image.                                                                                                                                                                 |
| `PUT`    | `/api/Projects/{id}/images/reorder`    | Required | Reorder project images. Mirrors existing print image reorder endpoint.                                                                                                                  |

### Modified: `PrintsController` (additional endpoint)

| Method | Route                 | Auth     | Description                                                                                                                                                                                                                                         |
| ------ | --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/Prints/grouped` | Required | Paged, interleaved list of project rows and standalone print rows sorted chronologically. Each item has a discriminator (`type: "project" \| "print"`). Project items include aggregate stats; print items mirror the existing print summary shape. |

### Modified: `PrintsController`

**`GET /api/Prints/summary`**

- New optional query param: `filterByProjectId` (Guid)
- Each result item now includes: `projectId` (Guid?), `projectName` (string?)

**`POST /api/Prints` and `PUT /api/Prints/{id}`**

- Accept either `projectId` (Guid — assign to existing project) or `newProjectName` (string — create a new project inline)
- If `newProjectName` is provided, the backend creates the project first (status: InProgress, viewStatus: Private) then assigns the print to it — all within a single transaction
- If both are provided, `projectId` takes precedence

---

## UI

### Print List — Two Views

A segmented toggle above the print list switches between views. The last-used selection is persisted as a user setting (consistent with how column visibility preferences work today).

#### All Prints (default)

Current behavior, unchanged except:

- Each print card/row that belongs to a project shows a small **project chip** (project name + status color dot)
- Clicking a chip filters the list to that project and shows the **project summary header** above the list
- The filter panel gains a **"Filter by Project"** multi-select, consistent with existing filter-by-printer and filter-by-filament controls

**Project summary header** (shown when filtered to a project):

- Project name, status badge, total print time, total filament used, estimated cost — stats sourced from `GET /api/Projects/{id}`
- Link to the full project detail page

#### Grouped by Project

A separate view using a different backend path — does not share pagination with the flat list.

Calls a new `GET /api/Prints/grouped` endpoint (or similar name) that returns a **single interleaved, chronologically sorted list** of two row types:

- **Project rows** — sorted by project `CreatedDate`
- **Standalone print rows** — prints with no project, sorted by `StartDate`

Both types are merged and paged together so the user sees a single unified timeline. The paginator reads "Page 1 of N items."

Each **project row** shows: project name, status badge, print count, total print time, total filament weight, estimated cost. Expanding it lazy-loads the project's prints via `GET /api/Prints/summary?filterByProjectId=xxx` — no sub-pagination needed (projects are bounded sets).

Each **standalone print row** renders as a standard print card/row, identical to the flat view.

> **Note:** The interleaved query joins two entity types into one sorted page — complexity and performance should be validated during implementation. If the query proves too costly, falling back to two separate sections (projects on top, ungrouped prints below) is a viable alternative.

### Print Add/Edit Form

A **project selector** field is added near the top of the form, alongside the printer selector.

- Rendered as an autocomplete input
- Searching displays matching existing projects by name
- Typing a name that doesn't exist surfaces an inline option: **"Create project: [name]"**
- Selecting "Create project" stores the name as pending state on the form — no API call yet. The new project chip displays with an "In Progress" status badge and a "(new)" indicator.
- On form save, if a `newProjectName` is pending, the backend creates the project (defaulting to status: InProgress, viewStatus: Private) and assigns the print in one transaction (see API section)
- Field is optional — leaving it blank produces a standalone print
- Once a project is selected, a small status badge appears next to the name

**Duplicate print** — inherits the `projectId` of the source print. No additional prompt.

### Project Detail Page

Route: `/projects/:id`

Accessible publicly for Public/Unlisted projects (no auth required), mirroring print detail behavior.

**Header**

- Project name (editable inline for owner)
- Status badge (editable via dropdown for owner)
- Description (editable for owner)
- Source URL — displayed as a link, editable for owner
- Visibility selector (owner only)

**Image gallery**

- Same upload/reorder/delete UX as the print detail image gallery
- Supports multiple images

**Aggregate stats bar**

- Total print time (estimated and actual)
- Total filament used (weight)
- Estimated cost (derived from filament pricing, same logic as individual prints)
- Print count

**Prints list**

- Member prints in start-date order
- Uses the existing print card component
- Owner sees edit/delete actions per print

**Delete project** (owner only)

- Triggered from a menu/button on the project detail page
- Confirmation dialog presents two explicit options:
  - "Remove project only — keep all prints as standalone"
  - "Delete project and all prints"
- Default selection: keep prints

---

## Project Status Values

| Value           | Description                   |
| --------------- | ----------------------------- |
| In Progress (1) | Actively printing parts       |
| Complete (2)    | All parts printed, build done |
| On Hold (3)     | Paused or waiting             |
| Cancelled (4)   | Abandoned                     |

---

## Out of Scope (Future Considerations)

- Duplicating an entire project (with all its prints) — mentioned as a likely user workflow but not in this story
- Project-level comments
- Sharing/collaborating on a project with other users
- Project templates
