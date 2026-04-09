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
  return [...list].sort(
    (a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model)
  );
}

function readJsonOrFail<T>(filePath: string, hint: string): T {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing required file: ${filePath}\n  Hint: ${hint}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

(() => {
  const curaList = readJsonOrFail<{ printers: Printer[] }>(
    curaOutputFile,
    'Run: npm run parse-cura'
  );
  const orcaList = readJsonOrFail<{ printers: Printer[] }>(
    orcaOutputFile,
    'Run: npm run parse-orca'
  );
  const aliases = readJsonOrFail<Record<string, string>>(
    aliasFile,
    'File should exist at orca-machine-def-parser/make-aliases.json'
  );

  // Warn on duplicate normalized keys in Cura input (Map would silently drop them)
  const curaKeysSeen = new Set<string>();
  for (const p of curaList.printers) {
    const key = printerKey(p, aliases);
    if (curaKeysSeen.has(key)) {
      console.warn(
        `Duplicate Cura key (will be de-duped): ${p.make} | ${p.model}`
      );
    }
    curaKeysSeen.add(key);
  }

  // Normalize make values using alias map so output is consistent
  const normalizePrinter = (p: Printer): Printer => ({
    ...p,
    make: applyAliases(p.make, aliases),
  });

  const normalizedCura = curaList.printers.map(normalizePrinter);
  const normalizedOrca = orcaList.printers.map(normalizePrinter);

  const curaMap = new Map<string, Printer>(
    normalizedCura.map((p) => [printerKey(p, aliases), p])
  );
  const orcaMap = new Map<string, Printer>(
    normalizedOrca.map((p) => [printerKey(p, aliases), p])
  );

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
  const combined = sortPrinters([...normalizedCura, ...onlyInOrca]);

  const coverage = ((matched.length / normalizedCura.length) * 100).toFixed(1);

  const pad = (n: number) => String(n).padStart(4);

  console.log(`Cura total:  ${pad(normalizedCura.length)}`);
  console.log(`Orca total:  ${pad(normalizedOrca.length)}`);
  console.log('');
  console.log(
    `In Orca, not in Cura:  ${pad(onlyInOrca.length)}  (newer printers Cura lacks)`
  );
  console.log(
    `In Cura, not in Orca:  ${pad(onlyInCura.length)}  (printers Orca lacks)`
  );
  console.log(`Matched:               ${pad(matched.length)}`);
  console.log('');
  console.log(`Coverage: Orca covers ${coverage}% of Cura's list`);

  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, 'only-in-cura.json'),
    JSON.stringify({ printers: sortPrinters(onlyInCura) }, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, 'only-in-orca.json'),
    JSON.stringify({ printers: sortPrinters(onlyInOrca) }, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, 'combined.json'),
    JSON.stringify({ printers: combined }, null, 2)
  );

  console.log('\nFiles written:');
  console.log(
    `  ${outputDir}/only-in-cura.json  (${onlyInCura.length} entries)`
  );
  console.log(
    `  ${outputDir}/only-in-orca.json  (${onlyInOrca.length} entries)`
  );
  console.log(`  ${outputDir}/combined.json  (${combined.length} entries)`);
})();
