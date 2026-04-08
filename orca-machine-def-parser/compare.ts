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

(async () => {
  const curaList: { printers: Printer[] } = JSON.parse(
    fs.readFileSync(curaOutputFile, 'utf8')
  );
  const orcaList: { printers: Printer[] } = JSON.parse(
    fs.readFileSync(orcaOutputFile, 'utf8')
  );
  const aliases: Record<string, string> = JSON.parse(
    fs.readFileSync(aliasFile, 'utf8')
  );

  const curaMap = new Map<string, Printer>(
    curaList.printers.map((p) => [printerKey(p, aliases), p])
  );
  const orcaMap = new Map<string, Printer>(
    orcaList.printers.map((p) => [printerKey(p, aliases), p])
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
  const combined = sortPrinters([...curaList.printers, ...onlyInOrca]);

  const coverage = ((matched.length / curaList.printers.length) * 100).toFixed(
    1
  );

  const pad = (n: number) => String(n).padStart(4);

  console.log(`Cura total:  ${pad(curaList.printers.length)}`);
  console.log(`Orca total:  ${pad(orcaList.printers.length)}`);
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
