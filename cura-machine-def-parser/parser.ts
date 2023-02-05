import * as fs from 'fs';
import * as path from 'path';

interface Printer {
  make: string;
  model: string;
  nozzle_diameter?: number;
  filament_diameter?: number;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function mergeDeep(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = mergeDeep(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

// Make an async function that gets executed immediately
(async () => {
  const curaMachineDefFolder =
    'D:/Development/3d-print-log/Cura/resources/definitions';
  const outputFile = './cura-machine-def-parser/out/printers.json';

  const newPrinters: Printer[] = [];

  const getInheritedPrinterDef = (printerDef: any) => {
    if (printerDef?.inherits) {
      const inheritedMachineDefLoc = path.join(
        curaMachineDefFolder,
        `${printerDef.inherits}.def.json`
      );

      const rawFile = fs.readFileSync(inheritedMachineDefLoc);
      const printer = JSON.parse(rawFile.toString());

      return mergeDeep(getInheritedPrinterDef(printer), printer);
    } else {
      return {};
    }
  };

  // Our starting point
  try {
    // Get the files as an array
    const files = await fs.promises.readdir(curaMachineDefFolder);

    // Loop them all with the new for...of
    for (const file of files) {
      // Get the full paths
      const fromPath = path.join(curaMachineDefFolder, file);

      const rawFile = fs.readFileSync(fromPath);
      const parsedPrinter = JSON.parse(rawFile.toString());

      const printer = mergeDeep(
        getInheritedPrinterDef(parsedPrinter),
        parsedPrinter
      );

      if (parsedPrinter.name === 'Anet A2') {
        // console.log(parsedPrinter);
        // console.log(getInheritedPrinterDef(parsedPrinter));

        console.log(printer);
      }

      const model = printer?.name.toString() ?? '';
      const make = printer?.metadata?.manufacturer?.toString() ?? '';

      const cleanedMake = make.replace('B.V.', '').replace('N.V.', '').trim();

      const cleanedModel = model
        .replace(cleanedMake, '')
        .replace('Creality', '')
        .trim();

      const newPrinter: Printer = {
        make: cleanedMake.trim(),
        model: cleanedModel !== '' ? cleanedModel : make,
      };

      /**
       * Remove the base definition files.
       */
      if (
        model !== 'FDM Printer Base Description' &&
        model !== 'Extruder' &&
        model !== 'Creawsome Base Printer' &&
        model !== 'FFF printer' &&
        make !== 'Custom' &&
        !/[Bb]ase/i.test(model)
      ) {
        newPrinters.push(newPrinter);
      }

      // console.log(printer);
    } // End for...of

    const wrapper = { printers: newPrinters };

    console.log(wrapper);

    fs.writeFileSync(outputFile, JSON.stringify(wrapper));
  } catch (e) {
    // Catch anything bad that happens
    console.error(e);
  }
})(); // Wrap in parenthesis and call now
