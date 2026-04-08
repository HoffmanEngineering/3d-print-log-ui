import * as fs from 'fs';
import * as path from 'path';

interface Printer {
  make: string;
  model: string;
}

const orcaProfilesDir =
  'D:/Development/3d-print-log/OrcaSlicer/resources/profiles';
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
