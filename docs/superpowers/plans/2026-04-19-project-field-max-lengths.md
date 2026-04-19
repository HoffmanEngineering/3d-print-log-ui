# Project Field Max Lengths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce max-length limits on all Project text fields at both the API and Angular UI layers, with consistent user-facing hints and errors matching the existing Print edit form pattern.

**Architecture:** API model annotations (`[MaxLength]`) provide server-side enforcement and drive the EF Core migration. Angular `Validators.maxLength()` + `maxlength` HTML attributes prevent submission and provide instant UI feedback. The description textarea shows a "X characters remaining" countdown hint when within 1,000 chars of the 5,000 limit.

**Tech Stack:** C# / ASP.NET Core data annotations, Entity Framework Core migrations, Angular reactive forms, Angular Material form fields (`mat-hint`, `mat-error`)

---

## File Map

| File                                                                                   | Change                                                |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `PrintLogApi/Models/Project.cs`                                                        | Add `[MaxLength(5000)]` to `Description`              |
| `PrintLogApi/Models/DTOs/Project/AddProjectDto.cs`                                     | Add `[MaxLength(5000)]` to `Description`              |
| `PrintLogApi/Models/DTOs/Project/PutProjectDto.cs`                                     | Add `[MaxLength(5000)]` to `Description`              |
| `PrintLogApi/Migrations/<timestamp>_LimitProjectDescriptionTo5000.cs`                  | New EF migration (generated)                          |
| `src/app/project/project-detail/project-edit-form/project-edit-form.component.ts`      | Add `Validators.maxLength(N)` to all text fields      |
| `src/app/project/project-detail/project-edit-form/project-edit-form.component.html`    | Add `maxlength` attrs, `mat-hint`, `mat-error` blocks |
| `src/app/project/project-detail/project-edit-form/project-edit-form.component.spec.ts` | Add maxlength validation tests                        |

---

### Task 1: Add `[MaxLength(5000)]` to Description in API models

**Files:**

- Modify: `PrintLogApi/PrintLogApi/Models/Project.cs`
- Modify: `PrintLogApi/PrintLogApi/Models/DTOs/Project/AddProjectDto.cs`
- Modify: `PrintLogApi/PrintLogApi/Models/DTOs/Project/PutProjectDto.cs`

- [ ] **Step 1: Update `Project.cs`**

Open `PrintLogApi/PrintLogApi/Models/Project.cs`. Change the `Description` property from:

```csharp
public string Description { get; set; }
```

To:

```csharp
[MaxLength(5000)]
public string Description { get; set; }
```

- [ ] **Step 2: Update `AddProjectDto.cs`**

Open `PrintLogApi/PrintLogApi/Models/DTOs/Project/AddProjectDto.cs`. Change `Description` from:

```csharp
public string Description { get; set; }
```

To:

```csharp
[MaxLength(5000)]
public string Description { get; set; }
```

- [ ] **Step 3: Update `PutProjectDto.cs`**

Open `PrintLogApi/PrintLogApi/Models/DTOs/Project/PutProjectDto.cs`. Change `Description` from:

```csharp
public string Description { get; set; }
```

To:

```csharp
[MaxLength(5000)]
public string Description { get; set; }
```

- [ ] **Step 4: Commit**

```bash
git add PrintLogApi/PrintLogApi/Models/Project.cs \
        PrintLogApi/PrintLogApi/Models/DTOs/Project/AddProjectDto.cs \
        PrintLogApi/PrintLogApi/Models/DTOs/Project/PutProjectDto.cs
git commit -m "feat: add MaxLength(5000) to Project.Description in model and DTOs"
```

---

### Task 2: Create EF Core migration for Description column constraint

**Files:**

- Create: `PrintLogApi/PrintLogApi/Migrations/<timestamp>_LimitProjectDescriptionTo5000.cs` (generated)

- [ ] **Step 1: Generate the migration**

From the `PrintLogApi/PrintLogApi` directory:

```bash
cd D:/Development/3d-print-log/PrintLogApi/PrintLogApi
dotnet ef migrations add LimitProjectDescriptionTo5000
```

Expected output ends with: `Done. To undo this action, use 'ef migrations remove'`

- [ ] **Step 2: Verify the generated migration**

Open the newly created migration file (named `<timestamp>_LimitProjectDescriptionTo5000.cs`). Confirm it contains an `AlterColumn` call that sets `maxLength: 5000` on the `Description` column of `Projects`, with `Up` changing it from `nvarchar(max)` and `Down` reverting it. It should look like:

```csharp
migrationBuilder.AlterColumn<string>(
    name: "Description",
    table: "Projects",
    type: "nvarchar(5000)",
    maxLength: 5000,
    nullable: true,
    oldClrType: typeof(string),
    oldType: "nvarchar(max)",
    oldNullable: true);
```

- [ ] **Step 3: Commit**

```bash
git add PrintLogApi/PrintLogApi/Migrations/
git commit -m "feat: add migration to limit Project.Description to 5000 chars"
```

---

### Task 3: Add maxLength validators to Angular form group

**Files:**

- Modify: `src/app/project/project-detail/project-edit-form/project-edit-form.component.ts`
- Modify: `src/app/project/project-detail/project-edit-form/project-edit-form.component.spec.ts`

- [ ] **Step 1: Write failing tests for maxLength validation**

Open `src/app/project/project-detail/project-edit-form/project-edit-form.component.spec.ts` and add these four tests inside the `describe` block, after the existing tests:

```typescript
it('should not emit saved when name exceeds 100 characters', () => {
  const savedValues: any[] = [];
  component.saved.subscribe((v) => savedValues.push(v));

  component.form.patchValue({ name: 'a'.repeat(101) });
  component.onSubmit();

  expect(savedValues.length).toBe(0);
});

it('should not emit saved when reference exceeds 100 characters', () => {
  const savedValues: any[] = [];
  component.saved.subscribe((v) => savedValues.push(v));

  component.form.patchValue({ reference: 'a'.repeat(101) });
  component.onSubmit();

  expect(savedValues.length).toBe(0);
});

it('should not emit saved when description exceeds 5000 characters', () => {
  const savedValues: any[] = [];
  component.saved.subscribe((v) => savedValues.push(v));

  component.form.patchValue({ description: 'a'.repeat(5001) });
  component.onSubmit();

  expect(savedValues.length).toBe(0);
});

it('should not emit saved when url exceeds 1000 characters', () => {
  const savedValues: any[] = [];
  component.saved.subscribe((v) => savedValues.push(v));

  component.form.patchValue({ url: 'a'.repeat(1001) });
  component.onSubmit();

  expect(savedValues.length).toBe(0);
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd D:/Development/3d-print-log/print-log-ui
npm run test:brief
```

Expected: 4 new tests fail (form is valid when it shouldn't be).

- [ ] **Step 3: Add `Validators.maxLength` to the form group**

Open `src/app/project/project-detail/project-edit-form/project-edit-form.component.ts`. Replace the `ngOnInit` form group definition:

```typescript
ngOnInit(): void {
  const p = this.project();
  this.form = this.fb.nonNullable.group({
    name: [p.name, [Validators.required, Validators.maxLength(100)]],
    reference: [p.reference ?? '', Validators.maxLength(100)],
    description: [p.description ?? '', Validators.maxLength(5000)],
    url: [p.url ?? '', Validators.maxLength(1000)],
    viewStatus: [p.viewStatus],
  });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:brief
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/project/project-detail/project-edit-form/project-edit-form.component.ts \
        src/app/project/project-detail/project-edit-form/project-edit-form.component.spec.ts
git commit -m "feat: add maxLength validators to project edit form"
```

---

### Task 4: Update template with maxlength attributes, hints, and errors

**Files:**

- Modify: `src/app/project/project-detail/project-edit-form/project-edit-form.component.html`

- [ ] **Step 1: Update the Name field**

In `project-edit-form.component.html`, replace the `name` `mat-form-field` block:

```html
<mat-form-field appearance="outline">
  <mat-label>Name</mat-label>
  <input matInput formControlName="name" data-testid="name-input" required maxlength="100" />
  @if (form.controls.name.hasError('required')) {
  <mat-error>Name is required</mat-error>
  } @if (form.controls.name.hasError('maxlength')) {
  <mat-error>Name must be 100 characters or fewer</mat-error>
  }
</mat-form-field>
```

- [ ] **Step 2: Update the Reference field**

Replace the `reference` `mat-form-field` block:

```html
<mat-form-field appearance="outline">
  <mat-label>Reference</mat-label>
  <input matInput formControlName="reference" data-testid="reference-input" maxlength="100" />
  <mat-hint>e.g. "Voron 2.4 R2"</mat-hint>
  @if (form.controls.reference.hasError('maxlength')) {
  <mat-error>Reference must be 100 characters or fewer</mat-error>
  }
</mat-form-field>
```

- [ ] **Step 3: Update the Description field**

Replace the `description` `mat-form-field` block:

```html
<mat-form-field appearance="outline">
  <mat-label>Description</mat-label>
  <textarea matInput formControlName="description" rows="3" maxlength="5000"></textarea>
  @if (5000 - (form.controls.description.value?.length ?? 0) < 1000) {
  <mat-hint align="end">{{ 5000 - (form.controls.description.value?.length ?? 0) }} characters remaining</mat-hint>
  } @if (form.controls.description.hasError('maxlength')) {
  <mat-error>Description must be 5000 characters or fewer</mat-error>
  }
</mat-form-field>
```

- [ ] **Step 4: Update the URL field**

Replace the `url` `mat-form-field` block:

```html
<mat-form-field appearance="outline">
  <mat-label>Model Source URL</mat-label>
  <input matInput formControlName="url" type="url" maxlength="1000" />
  @if (form.controls.url.hasError('maxlength')) {
  <mat-error>URL must be 1000 characters or fewer</mat-error>
  }
</mat-form-field>
```

- [ ] **Step 5: Run the full test suite**

```bash
npm run test:brief
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/project/project-detail/project-edit-form/project-edit-form.component.html
git commit -m "feat: add maxlength hints and errors to project edit form template"
```
