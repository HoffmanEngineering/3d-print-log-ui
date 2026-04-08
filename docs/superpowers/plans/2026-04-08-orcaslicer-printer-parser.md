# OrcaSlicer Printer List Parser & Comparator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an OrcaSlicer profile parser and a comparison tool to supplement or replace the Cura-generated printer Make/Model autocomplete list.

**Architecture:** A new `orca-machine-def-parser/` directory mirrors the existing `cura-machine-def-parser/` pattern. The parser reads OrcaSlicer's vendor `.json` profile files and outputs `{ make, model }` pairs. The comparator loads both lists, normalizes and fuzzy-matches entries using a hand-editable alias map, and writes diff + combined JSON files.

**Tech Stack:** TypeScript, ts-node, Node.js `fs` module. No additional dependencies needed beyond what the Cura parser already uses.

---

## File Map

| Action | Path                                        | Responsibility                                            |
| ------ | ------------------------------------------- | --------------------------------------------------------- |
| Create | `orca-machine-def-parser/tsconfig.json`     | TypeScript config for ts-node (mirrors Cura parser)       |
| Create | `orca-machine-def-parser/make-aliases.json` | Hand-editable brand name alias map                        |
| Create | `orca-machine-def-parser/parser.ts`         | Parses OrcaSlicer vendor JSONs → `out/printers.json`      |
| Create | `orca-machine-def-parser/compare.ts`        | Compares Cura vs Orca lists → console report + diff files |
| Create | `orca-machine-def-parser/out/.gitkeep`      | Keep the output directory in git                          |
| Modify | `package.json`                              | Add `parse-orca` and `compare-printers` npm scripts       |

---

## Task 1: Scaffold the directory and config files

**Files:**

- Create: `orca-machine-def-parser/tsconfig.json`
- Create: `orca-machine-def-parser/make-aliases.json`
- Create: `orca-machine-def-parser/out/.gitkeep`

- [ ] **Step 1: Create the tsconfig** (mirrors `cura-machine-def-parser/tsconfig.json` exactly)

`orca-machine-def-parser/tsconfig.json`:

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "sourceMap": true,
    "declaration": false,
    "downlevelIteration": true,
    "experimentalDecorators": true,
    "module": "commonjs",
    "moduleResolution": "node",
    "importHelpers": true,
    "target": "es2015",
    "typeRoots": ["node_modules/@types"],
    "lib": ["es2018", "dom"],
    "types": ["node"]
  }
}
```

- [ ] **Step 2: Create the alias map**

`orca-machine-def-parser/make-aliases.json`:

```json
{
  "Creality3D": "Creality",
  "Bambulab": "Bambu Lab",
  "Ultimaker": "UltiMaker"
}
```

- [ ] **Step 3: Create the output directory placeholder**

Create an empty file at `orca-machine-def-parser/out/.gitkeep`.

- [ ] **Step 4: Add npm scripts to `package.json`**

In `package.json`, add after the `"parse-cura"` line:

```json
"parse-orca": "ts-node --project orca-machine-def-parser/tsconfig.json orca-machine-def-parser/parser.ts",
"compare-printers": "ts-node --project orca-machine-def-parser/tsconfig.json orca-machine-def-parser/compare.ts",
```

- [ ] **Step 5: Commit**

```bash
git add orca-machine-def-parser/tsconfig.json orca-machine-def-parser/make-aliases.json orca-machine-def-parser/out/.gitkeep package.json
git commit -m "chore: scaffold orca-machine-def-parser directory and npm scripts"
```

---

## Task 2: Write the OrcaSlicer parser

**Files:**

- Create: `orca-machine-def-parser/parser.ts`

The OrcaSlicer profiles directory (`D:/Development/3d-print-log/OrcaSlicer/resources/profiles/`) contains one `.json` file per vendor (e.g., `Creality.json`, `BBL.json`). Each has:

```json
{
  "name": "Bambulab",
  "machine_model_list": [
    { "name": "Bambu Lab A1", "sub_path": "..." },
    { "name": "Bambu Lab A1 Mini", "sub_path": "..." }
  ]
}
```

The `name` field at the top level is unreliable for brand detection (e.g. `"Bambulab"` vs `"Bambu Lab"` used in model names). Instead, detect the brand prefix from the model names themselves using common leading word tokens.

- [ ] **Step 1: Create `orca-machine-def-parser/parser.ts`**

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface Printer {
  make: string;
  model: string;
}

const orcaProfilesDir = 'D:/Development/3d-print-log/OrcaSlicer/resources/profiles';
const outputFile = './orca-machine-def-parser/out/printers.json';

const SKIP_FILES = new Set(['blacklist.json']);
const SKIP_VENDOR_NAMES = new Set(['Custom']);

/**
 * Find the longest common leading word sequence shared by all model names.
 * Stops before the last word so the model string is never empty.
 *
 * Examples:
 *   ["Bambu Lab A1", "Bambu Lab A1 Mini", "Bambu Lab P1P"] → "Bambu Lab"
 *   ["Creality Ender-3", "Creality CR-10 Max"]              → "Creality"
 *   ["Anet A2", "Anet A8"]                                  → "Anet"
 */
function detectCommonPrefix(names: string[]): string {
  if (names.length === 0) return '';

  const splitNames = names.map((n) => n.split(' '));
  // Never consume the last word — every model must have a non-empty model string
  const maxPrefixLen = Math.min(...splitNames.map((n) => n.length)) - 1;

  const prefixWords: string[] = [];
  for (let i = 0; i < maxPrefixLen; i++) {
    const word = splitNames[0][i];
    if (splitNames.every((n) => n[i] === word)) {
      prefixWords.push(word);
    } else {
      break;
    }
  }

  return prefixWords.join(' ');
}

(async () => {
  const files = await fs.promises.readdir(orcaProfilesDir);
  const printers: Printer[] = [];

  for (const file of files) {
    if (!file.endsWith('.json') || SKIP_FILES.has(file)) continue;

    const filePath = path.join(orcaProfilesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const vendorName: string = (data.name ?? '').toString();
    const modelList: Array<{ name: string }> = data.machine_model_list ?? [];

    if (modelList.length === 0) continue;
    if (SKIP_VENDOR_NAMES.has(vendorName)) continue;

    const modelNames = modelList.map((m) => m.name);
    const prefix = detectCommonPrefix(modelNames);
    const make = prefix || vendorName;

    for (const modelName of modelNames) {
      const model = prefix ? modelName.slice(prefix.length).trim() : modelName;
      if (model) {
        printers.push({ make, model });
      }
    }
  }

  const output = { printers };
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`Written ${printers.length} printers to ${outputFile}`);
})();
```

- [ ] **Step 2: Run the parser and verify output**

```bash
npm run parse-orca
```

Expected: A line like `Written 359 printers to ./orca-machine-def-parser/out/printers.json` (count may vary). No errors.

Then spot-check the output:

```bash
node -e "
const d = require('./orca-machine-def-parser/out/printers.json');
const bambu = d.printers.filter(p => p.make === 'Bambu Lab');
console.log('Bambu Lab count:', bambu.length);
console.log('Sample:', JSON.stringify(bambu.slice(0,3)));
"
```

Expected: `make` is `"Bambu Lab"` (not `"Bambulab"`), `model` is `"A1"` (not `"Bambu Lab A1"`).

- [ ] **Step 3: Commit**

```bash
git add orca-machine-def-parser/parser.ts orca-machine-def-parser/out/printers.json
git commit -m "feat: add OrcaSlicer printer profile parser"
```

---

## Task 3: Write the comparison script

**Files:**

- Create: `orca-machine-def-parser/compare.ts`

The comparator must:

1. Load both printer lists and the alias map
2. Normalize each entry (lowercase, strip punctuation, apply alias map to `make`)
3. Match on normalized `make` + `model`
4. Write three output files and print a console summary

- [ ] **Step 1: Create `orca-machine-def-parser/compare.ts`**

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface Printer {
  make: string;
  model: string;
}

const curaOutputFile = './cura-machine-def-parser/out/printers.json';
const orcaOutputFile = './orca-machine-def-parser/out/printers.json';
const aliasFile = './orca-machine-def-parser/make-aliases.json';
const outputDir = './orca-machine-def-parser/out';

/** Lowercase, strip non-alphanumeric (except spaces), collapse whitespace */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Apply the alias map to a make string.
 * Compares normalized forms so "Creality3D" → "Creality" even if casing differs.
 */
function applyAliases(make: string, aliases: Record<string, string>): string {
  const normalizedInput = normalize(make);
  for (const [key, value] of Object.entries(aliases)) {
    if (normalize(key) === normalizedInput) return value;
  }
  return make;
}

/** Produces a normalized lookup key for a printer entry */
function printerKey(printer: Printer, aliases: Record<string, string>): string {
  const make = applyAliases(printer.make, aliases);
  return `${normalize(make)}|${normalize(printer.model)}`;
}

function sortPrinters(list: Printer[]): Printer[] {
  return [...list].sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));
}

(async () => {
  const curaList: { printers: Printer[] } = JSON.parse(fs.readFileSync(curaOutputFile, 'utf8'));
  const orcaList: { printers: Printer[] } = JSON.parse(fs.readFileSync(orcaOutputFile, 'utf8'));
  const aliases: Record<string, string> = JSON.parse(fs.readFileSync(aliasFile, 'utf8'));

  const curaMap = new Map<string, Printer>(curaList.printers.map((p) => [printerKey(p, aliases), p]));
  const orcaMap = new Map<string, Printer>(orcaList.printers.map((p) => [printerKey(p, aliases), p]));

  const matched: Printer[] = [];
  const onlyInCura: Printer[] = [];
  const onlyInOrca: Printer[] = [];

  for (const [key, printer] of curaMap) {
    if (orcaMap.has(key)) {
      matched.push(printer);
    } else {
      onlyInCura.push(printer);
    }
  }

  for (const [key, printer] of orcaMap) {
    if (!curaMap.has(key)) {
      onlyInOrca.push(printer);
    }
  }

  // Combined = all Cura entries + Orca entries not already in Cura
  const combined = sortPrinters([...curaList.printers, ...onlyInOrca]);

  const coverage = ((matched.length / curaList.printers.length) * 100).toFixed(1);

  const pad = (n: number) => String(n).padStart(4);

  console.log(`Cura total:  ${pad(curaList.printers.length)}`);
  console.log(`Orca total:  ${pad(orcaList.printers.length)}`);
  console.log('');
  console.log(`In Orca, not in Cura:  ${pad(onlyInOrca.length)}  (newer printers Cura lacks)`);
  console.log(`In Cura, not in Orca:  ${pad(onlyInCura.length)}  (printers Orca lacks)`);
  console.log(`Matched:               ${pad(matched.length)}`);
  console.log('');
  console.log(`Coverage: Orca covers ${coverage}% of Cura's list`);

  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'only-in-cura.json'), JSON.stringify({ printers: sortPrinters(onlyInCura) }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'only-in-orca.json'), JSON.stringify({ printers: sortPrinters(onlyInOrca) }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'combined.json'), JSON.stringify({ printers: combined }, null, 2));

  console.log('\nFiles written:');
  console.log(`  ${outputDir}/only-in-cura.json  (${onlyInCura.length} entries)`);
  console.log(`  ${outputDir}/only-in-orca.json  (${onlyInOrca.length} entries)`);
  console.log(`  ${outputDir}/combined.json  (${combined.length} entries)`);
})();
```

- [ ] **Step 2: Ensure the Cura output file exists**

The comparator reads `cura-machine-def-parser/out/printers.json`. Verify it exists:

```bash
ls cura-machine-def-parser/out/printers.json
```

If it doesn't exist, run `npm run parse-cura` first to generate it.

- [ ] **Step 3: Run the comparator and verify output**

```bash
npm run compare-printers
```

Expected: A report like:

```
Cura total:   653
Orca total:   359

In Orca, not in Cura:    XX  (newer printers Cura lacks)
In Cura, not in Orca:   XXX  (printers Orca lacks)
Matched:                XXX

Coverage: Orca covers XX.X% of Cura's list

Files written:
  ./orca-machine-def-parser/out/only-in-cura.json  (XXX entries)
  ./orca-machine-def-parser/out/only-in-orca.json  (XX entries)
  ./orca-machine-def-parser/out/combined.json  (XXX entries)
```

Spot-check the alias handling:

```bash
node -e "
const d = require('./orca-machine-def-parser/out/combined.json');
const creality = d.printers.filter(p => p.make.toLowerCase().includes('creality'));
console.log('Creality variants in combined:', [...new Set(creality.map(p => p.make))]);
"
```

Expected: Only one Creality variant (no `Creality3D` duplicates).

- [ ] **Step 4: Commit**

```bash
git add orca-machine-def-parser/compare.ts orca-machine-def-parser/out/only-in-cura.json orca-machine-def-parser/out/only-in-orca.json orca-machine-def-parser/out/combined.json
git commit -m "feat: add printer list comparison script with fuzzy make matching"
```

---

## Task 4: Add output files to .gitignore (optional)

The generated `out/*.json` files are large and regeneratable. Decide whether to commit them or gitignore them.

- [ ] **Step 1: Check current gitignore**

```bash
cat .gitignore | grep -i orca
```

- [ ] **Step 2: If you want generated outputs ignored, add to `.gitignore`**

Add after the cura-related ignores (or create a new section):

```
# OrcaSlicer parser output (regeneratable)
orca-machine-def-parser/out/printers.json
orca-machine-def-parser/out/only-in-cura.json
orca-machine-def-parser/out/only-in-orca.json
orca-machine-def-parser/out/combined.json
```

Keep `make-aliases.json` committed — it is hand-maintained, not generated.

- [ ] **Step 3: Commit if changed**

```bash
git add .gitignore
git commit -m "chore: optionally gitignore orca parser generated output files"
```
