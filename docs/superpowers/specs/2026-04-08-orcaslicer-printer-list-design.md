# OrcaSlicer Printer List Parser & Comparator

**Date:** 2026-04-08  
**Status:** Approved

## Overview

The printer Make/Model autocomplete in `PrinterDetailComponent` is currently powered by a list generated from Cura's machine definitions (`cura-exported-printers.ts`). Cura's list (653 entries) doesn't cover all modern printers. This feature adds an OrcaSlicer-based parser and a comparison tool to evaluate whether to supplement or replace the Cura list.

## Goals

1. Parse OrcaSlicer's vendor profile JSONs into the same `{ make, model }` format as the Cura list
2. Compare the two lists with fuzzy/normalized matching and a hand-editable brand alias map
3. Output diff files (`only-in-cura.json`, `only-in-orca.json`, `combined.json`) to inform the decision to merge or replace

## Architecture

Three new artifacts, mirroring the existing `cura-machine-def-parser/` pattern:

```
orca-machine-def-parser/
  parser.ts           — parses OrcaSlicer profiles → out/printers.json
  compare.ts          — compares Cura vs Orca lists → out/diff files + console report
  make-aliases.json   — hand-editable brand name alias map
  tsconfig.json       — mirrors cura-machine-def-parser/tsconfig.json
  out/
    printers.json     — generated output
    only-in-cura.json
    only-in-orca.json
    combined.json
```

Two new npm scripts in `package.json`:

- `"parse-orca"` — runs `ts-node` on `orca-machine-def-parser/parser.ts`
- `"compare-printers"` — runs `ts-node` on `orca-machine-def-parser/compare.ts`

## Section 1: OrcaSlicer Parser (`parser.ts`)

**Input:** `D:/Development/3d-print-log/OrcaSlicer/resources/profiles/*.json`  
Skips `blacklist.json` and non-JSON files.

**Parsing logic:**

1. For each vendor `.json`, read the top-level `name` and `machine_model_list`
2. Detect the actual brand prefix by finding the longest common leading token(s) shared across all model names in that vendor (e.g., models all start with `"Bambu Lab"` → `make = "Bambu Lab"`, not the JSON `name` field `"Bambulab"`)
3. Strip the detected prefix from each model name to produce `model`
4. Filter out vendors with no models and skip "Custom"/generic base entries

**Fallback:** If a vendor's models share no common prefix, use the JSON `name` as `make` and the full model string as `model`.

**Output:** `orca-machine-def-parser/out/printers.json`

```json
{ "printers": [{ "make": "Bambu Lab", "model": "A1" }, ...] }
```

## Section 2: Make Alias Map (`make-aliases.json`)

Maps variant brand name strings to a canonical name. Used by `compare.ts` to normalize makes before matching. Keys and values are additionally normalized at runtime (lowercased, punctuation stripped), so the file only needs entries for genuinely different strings — not case or punctuation variants.

**Initial entries (to be grown over time):**

```json
{
  "Creality3D": "Creality",
  "Bambulab": "Bambu Lab",
  "Ultimaker": "UltiMaker"
}
```

## Section 3: Comparison Script (`compare.ts`)

**Inputs:**

- `cura-machine-def-parser/out/printers.json`
- `orca-machine-def-parser/out/printers.json`
- `orca-machine-def-parser/make-aliases.json`

**Matching logic:**

1. Normalize each entry: lowercase make + model, strip punctuation/extra whitespace, apply alias map to make
2. Match on normalized make + model (both must match)
3. Entries with matching make but no matching model are flagged separately as near-misses to aid manual review

**Console output example:**

```
Cura total:  653
Orca total:  359

In Orca, not in Cura:   47  (newer printers Cura lacks)
In Cura, not in Orca:  341  (printers Orca lacks)
Matched:               312

Coverage: Orca covers 47.8% of Cura's list
```

**File output** (written to `orca-machine-def-parser/out/`):

- `only-in-cura.json` — printers present in Cura but missing from Orca
- `only-in-orca.json` — printers present in Orca but missing from Cura
- `combined.json` — union of both lists, deduplicated, sorted by make then model; ready to copy into `cura-exported-printers.ts` if merging

## Decision Point

After running both scripts, review the coverage percentage and diff files. Given that Orca currently has ~359 models vs Cura's 653, Orca is unlikely to fully cover Cura's list — merging (`combined.json`) is the expected outcome. However, if Orca's list has grown substantially and the `only-in-cura.json` entries are mostly obscure/discontinued printers, switching fully to Orca and selectively adding entries from `only-in-cura.json` is also viable.
