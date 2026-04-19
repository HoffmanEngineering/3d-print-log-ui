# Project Field Max Lengths

**Date:** 2026-04-19

## Problem

The Project edit form has no max-length enforcement on any of its text fields. The API model already defines `[MaxLength]` on `Name`, `Reference`, and `Url`, but these are not mirrored in the Angular form validators or HTML attributes. `Description` has no limit anywhere — the database column is `nvarchar(max)`.

## Goal

- Prevent unbounded input at both the API and UI layers
- Show consistent, unobtrusive feedback matching the existing Print edit form pattern

## Field Limits

| Field       | Max Length | Source                  |
| ----------- | ---------- | ----------------------- |
| Name        | 100        | Existing API constraint |
| Reference   | 100        | Existing API constraint |
| Description | 5000       | New — agreed in design  |
| Url         | 1000       | Existing API constraint |

## API Changes

Three C# files need `[MaxLength(5000)]` added to `Description`:

- `PrintLogApi/Models/Project.cs`
- `PrintLogApi/Models/DTOs/Project/AddProjectDto.cs`
- `PrintLogApi/Models/DTOs/Project/PutProjectDto.cs`

A new EF Core migration is required to apply the column constraint to the database.

## Angular Form Changes (`project-edit-form.component.ts`)

Add `Validators.maxLength(N)` to each field in the `nonNullable.group` call:

- `name`: `Validators.maxLength(100)`
- `reference`: `Validators.maxLength(100)`
- `description`: `Validators.maxLength(5000)`
- `url`: `Validators.maxLength(1000)`

## Angular Template Changes (`project-edit-form.component.html`)

**Pattern (matching Print edit form):**

- Add `maxlength="N"` attribute to each input/textarea
- Add `mat-error` block: `@if (form.controls.X.hasError('maxlength'))` with a message like "Name must be 100 characters or fewer"
- For `description` textarea only: add a `mat-hint align="end"` that shows "X characters remaining" when the user is within 1,000 characters of the 5,000 limit

**Per field:**

- `name`: `maxlength="100"` + maxlength error
- `reference`: `maxlength="100"` + maxlength error (keep existing placeholder hint)
- `description`: `maxlength="5000"` + characters-remaining hint (within 1,000 of limit) + maxlength error
- `url`: `maxlength="1000"` + maxlength error

## Out of Scope

- No changes to the project list/create form (create uses the same edit form component, so it's covered)
- No changes to other entities (Printer, Filament, Print) — those are separate stories
