---
name: 3d-print-log
description: Log and query 3D prints, printers, filament and resin spools, and projects in a user's 3D Print Log account (3dprintlog.com) through its MCP server. Use when the user wants to record a finished or failed print with the material it used, check how much of a spool is left or whether they have enough for a print, correct a spool's remaining amount, see per-printer success rates and print time, find a past print and the settings it used, or file prints under a project. Not for controlling a printer, starting or stopping a job, sending files to a machine, or slicing a model.
metadata:
  author: Hoffman Engineering
  homepage: https://www.3dprintlog.com/docs/mcp
---

# 3D Print Log

[3D Print Log](https://www.3dprintlog.com) keeps a record of a user's 3D printing: prints, printers,
material inventory (filament, resin, powder) and projects. It keeps records only. Nothing here
touches a printer.

## Connect

Use the MCP server. Everything below describes its tools.

- Endpoint: `https://api.3dprintlog.com/mcp` (Streamable HTTP).
- Auth: OAuth 2.0 authorization code with PKCE, through Auth0. Dynamic client registration is not
  supported. Use the public client ID `uzxvtpefYIrWoYbaJteoRzZtIYw4wP7j` with no client secret and a
  loopback redirect `http://localhost:<port>/callback` on a port from 8400 to 8405.
- Claude Code:
  `claude mcp add --transport http printlog https://api.3dprintlog.com/mcp --client-id uzxvtpefYIrWoYbaJteoRzZtIYw4wP7j --callback-port 8400`,
  then `/mcp` to sign in.
- Other clients (Claude, ChatGPT): <https://www.3dprintlog.com/docs/mcp>.
- Scopes: read tools need `read:printdata`, write tools need `write:printdata`. `tools/list` shows only
  the tools the token allows. If `create_print` is missing, the user granted read-only access; tell
  them, don't work around it.

Only when MCP is not available, use the REST API at `https://api.3dprintlog.com/api` with a personal
API key the user creates at <https://www.3dprintlog.com/api-keys>, sent as the `X-Api-Key` header.
It is the website's own API and behaves differently; read [REST is different](#rest-is-different)
first. Reference: <https://www.3dprintlog.com/docs/api> and <https://www.3dprintlog.com/auth.md>.

## Ground rules

- Every tool acts as the signed-in user and sees only that user's own records. Someone else's id,
  even a public print, returns `not_found`, exactly like an id that does not exist.
- Units are fixed: grams, seconds, millimeters, milliliters, UTC. Print and printer ids are integers;
  material and project ids are GUIDs.
- A missing value means "not recorded", never zero. Say it is not recorded.
- Some figures come from the slicer's estimate rather than a measurement. When a result says so
  (`durationIsEstimated`, `materialIsEstimated`, `printsWithEstimatedDuration`), say the figure is an
  estimate. Never present an estimate as measured.
- Lists are paginated (`page`, `pageSize`, default 25, max 100) and report `totalPages`. Read every
  page before telling the user something does not exist.
- Errors carry a code: `not_found`, `invalid_arguments`, `conflict` or `forbidden`. An
  `invalid_arguments` message often lists the accepted values (material categories, printer
  categories); use them rather than guessing again.

## Guardrails

- **Nothing can be deleted.** No tool deletes a print, material, printer or project. To take a spool
  out of the inventory, retire it with `set_material_active`. To retire a printer, call
  `update_printer` with `isActive` false.
- **Logging a print never changes the loaded filament.** `create_print` and `update_print` record
  what a print used. They do not load or unload spools on the printer, and no tool does. If the
  loaded spools are wrong, the user changes them in the app.
- **Edits overwrite.** `update_print`, `update_printer` and `update_project` replace each value you
  pass, and the old value can't be recovered. Passing `materials` to `update_print` replaces the
  print's whole usage list. Change only what the user asked to change.
- **Feedback sends email.** `create_feedback` emails the maintainers and can't be taken back. Use it
  only when the user asks to send feedback, in their own words.
- No photos, comments or files are available through any tool.

## Log a print

1. Find the printer: `list_printers` gives each printer's id.
2. Find the materials. `get_printer` lists the spools loaded on that printer right now, which is
   usually what the print used. Otherwise search with `find_material(material, color)` or
   `get_material_inventory(material, color)`. If more than one spool fits, ask the user which; never
   pick one silently.
3. Check it isn't already logged. The slicer uploaders, the Cura plugin, OctoPrint and Klipper
   integrations log prints on their own. Look for a match with
   `search_prints(query, printerId, from, to)`.
4. Call `create_print(title, printerId, status, idempotencyKey, startedAt, durationSeconds, materials)`.
   - `status` is `Success`, `PartialSuccess` (finished with defects), `Failed`, `Cancelled`,
     `Pending` or `Printing`.
   - Each row of `materials` is `{ materialId, source, amount }` for a measured amount, or
     `{ materialId, estimatedSource, estimatedAmount }` for the slicer's estimate, or both pairs in
     one row. `source` is `Weight` (grams), `Length` (mm) or `Volume` (ml).
   - `idempotencyKey` is required. Make one stable key per physical print and reuse it verbatim on a
     retry: the same key with the same arguments returns the original print (`wasReplayed`), and
     the same key with different arguments is a `conflict`.
   - Optional: `estimatedDurationSeconds`, `notes`, `projectId`, `fileName`, `url`, `viewStatus`
     (`Private`, `Unlisted`, `Public`; defaults to the user's account setting).
5. Report what was logged. The result's `materialRemaining` gives the grams left on each spool used.

**Remaining amounts update by themselves.** A spool's remaining amount is its starting amount minus
everything logged against it. Logging the print already subtracted its usage, so do **not** follow
`create_print` with `adjust_material_remaining` for the same filament: that subtracts it twice.

## Check material before a print

Call `find_material(material, color, requiredGrams)`. Matching is by whole word, so `PLA` also finds
PLA+ and Silk PLA. For each group of matching spools:

- `sufficientOnLargestSpool` means one spool holds enough, so the print can run unattended.
- `meetsRequirementByCombiningSpools` means only several spools together are enough, which needs a
  filament change mid-print. Offer it as a suggestion to confirm, not a guarantee: spools in a group
  can differ in brand and diameter. `combinationForRequirement` names the spools.
- If `candidatesTruncated` is true and the answer is null, the answer is unknown, not no.

## Correct a spool's remaining amount

Use `adjust_material_remaining(materialId, source, delta, notes)` when the user weighs a spool, or
used material that no logged print accounts for.

- `delta` is the signed change, not the new total. If `get_material` reports 700 g remaining and the
  spool now holds 640 g of filament, send `delta` -60 with `source` `Weight`.
- A scale reading includes the empty spool. Subtract `spoolWeightGrams` from `get_material` when it
  is recorded, and ask the user when it isn't.
- The result can't go below zero or above the spool's starting amount; such an adjustment is
  rejected.
- It is not idempotent. A retry applies the delta again, so after an error or timeout, read
  `get_material` before retrying.
- Changing the size of a spool (a new starting amount) is `update_material(materialId, source, initialAmount)`,
  not an adjustment. `remainingGrams` is also 0 for a spool with no tracked capacity: check
  `hasNominalCapacity` before saying a spool is empty.

## Printer statistics and summaries

- `get_printer_stats(from, to, printerId)` gives print counts, successes, failures, success rate and
  total print time per printer. Omit both dates for all time, or pass both: an inclusive UTC range
  of at most 366 days. Only printers with prints in range appear.
- `get_print_summary(from, to, status)` totals prints, material and time across all printers. Its
  all-time figures include prints with no start date, reported under `undated`.
- When the user asks what they "finished", say whether you counted `Success`, `PartialSuccess` or
  both.

## Find a past print

`search_prints(query, status, printerId, materialId, from, to)` matches `query` as a substring of the
print title and of its project's name, newest first. `get_print(id)` returns the details and a
per-material breakdown. Slicer settings are not separate fields: prints imported by a slicer
integration carry a settings summary in `notes`. Quote it when asked. A print logged by hand without
such notes has no settings to report.

## Projects

`list_projects(search)` resolves a project name to its id. `create_project(name, status, viewStatus)`
starts one. File a print under it with `create_print(projectId)` or `update_print(id, projectId)`.

## Add a printer or material

- `create_printer(make, model, name, categoryNickname)` adds a printer, active by default.
- `create_material(displayName, materialType, materialCategoryNickname, densityGramPerCubicCm, source, initialAmount)`
  adds a spool. The category must be one the user already has. A category that tracks diameter
  (filament) needs `diameterMm`.
- On both, pass an `idempotencyKey`. Without one a retried call creates a second record, and nothing
  can delete it.

## REST is different

The REST API serves the website, and its guardrails are not the MCP server's.

- It has DELETE endpoints. Never call one without the user's explicit confirmation.
- Creating a print with `POST /api/Prints` **does** change the printer's loaded filament: it loads the
  print's materials and unloads the rest. Tell the user before you do it.
- It has no idempotency keys, so a retried create makes a duplicate.
