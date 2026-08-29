---
slug: projects
title: Projects | 3D Print Log Docs
description: Group related prints into projects to track multi-part builds. Learn how to create projects and attach prints in 3D Print Log.
navLabel: Projects
group: features
order: 20
mode: how-to
updated: 2026-08-29
related: [prints]
---

## Projects

---

Projects let you group related prints together. For example, you can track all
the parts of a Voron build, a cosplay prop, or a product prototype. Tracking
total print time, filament usage, and cost across a multi-part build becomes
effortless. Projects are completely optional; single prints work exactly as
before.

### What is a Project?

A project is a named collection of prints. Each print can belong to at most one
project. Projects have a status (In Progress, Complete, On Hold, or Cancelled)
and a visibility setting (Public, Unlisted, or Private).

### Creating a Project

When adding or editing a print, use the **Project** field to assign it to a
project. Start typing to search your existing projects. If no match is found,
select **Create project: "[name]"** to create a new project inline. The project
is created automatically when you save the print.

### Viewing Project Totals

Projects appear on your print list as colored chips. You can:

- Click a project chip to filter the list to that project's prints.
- Switch to **Grouped by Project** view (toggle at the top of the print list) to see all projects and their prints in one collapsible view, interleaved with standalone prints.
- Click **View full project** to open the project detail page, which shows aggregate stats (total prints, total print time, total filament used) and the full prints list.

### Removing a Print from a Project

Open the print for editing and clear the **Project** field (click the ✕ button
next to the project name), then save. The print becomes standalone and the
project's totals are updated.

### Project Status

Each project has a status: **In Progress**, **Complete**, **On Hold**, or
**Cancelled**. The status is shown as a color-coded dot on the project chip and
can be changed from the project detail page.

### Sharing a Project

On the project detail page, set the visibility to **Public** or **Unlisted** to
share your build with others. Public projects appear in community feeds;
Unlisted projects are accessible only via direct link.

### Deleting a Project

From the project detail page, open the menu (⋮) and select **Delete project**.
You will be asked whether to keep the prints (they become standalone) or delete
them along with the project.
