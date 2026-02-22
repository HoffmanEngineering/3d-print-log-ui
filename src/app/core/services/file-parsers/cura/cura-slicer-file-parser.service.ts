import { Injectable } from '@angular/core';
import { capitalize, flatMap } from 'lodash-es';
import { GcodeNewPrintParser } from '../../gcode-file-parser.service';
import { LoggingService } from '../../logging.service';
import { PrintDetail, PrintStatus } from '../../print.service';

@Injectable({
  providedIn: 'root',
})
export class CuraSlicerFileParserService implements GcodeNewPrintParser {
  constructor(private readonly loggingService: LoggingService) {}

  public async parse(gcode: string, fileName?: string): Promise<PrintDetail> {
    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

    // Print Times:
    print.estimatedPrintTimeInSeconds = this.parseEstimatedPrintTime(gcode);

    const settings = this.parseSetting(gcode);
    print.notes = settings;

    // print.estimatedFilamentUsageMg = this.estimateFilamentUsageInMg(gcode);

    // print.notes = this.parseSettingsIntoNotes(gcode);

    return print;
  }
  parseSetting(gcode: string): string {
    let settings = gcode.match(/;End of Gcode(?<test>(.|\n)*)/g)?.[0];

    if (settings === null || settings === undefined) {
      return '';
    }

    settings = settings.replace(/;End of Gcode\n/gm, '');
    settings = settings.replace(/;SETTING_\d /gm, '');

    settings = settings.replace(/\n/gm, '');

    const globalQuality = settings.match(/"global_quality": ".*?\\n\\n"/g);

    const globalGeneral =
      globalQuality.length > 0
        ? this.parseGeneralSection(globalQuality[0])
        : [];
    const globalValues =
      globalQuality.length > 0 ? this.parseValues(globalQuality[0]) : [];

    const extruderQuality = settings.match(
      /"extruder_quality": \[.*?\\n\\n\"\](,|})/g
    );

    const extruderGeneral =
      extruderQuality.length > 0
        ? this.parseGeneralSection(extruderQuality[0])
        : [];
    const extruderValues =
      extruderQuality.length > 0 ? this.parseValues(extruderQuality[0]) : [];

    if (extruderValues.length === 1) {
      // There is only one extruder
      return this.createNoteForOneExtruder(
        globalGeneral?.[0],
        globalValues?.[0],
        extruderGeneral?.[0],
        extruderValues?.[0]
      );
    } else if (extruderValues.length > 1) {
      // There are multiple extruders.

      return this.createNoteForMultipleExtruders(
        globalGeneral?.[0],
        globalValues?.[0],
        extruderGeneral,
        extruderValues
      );
    } else {
      // There was probably a problem.
      this.loggingService.logTrace('Problem while parsing Cura Code', {
        gcodeLength: gcode.length,
        settingSectionLength: settings.length,
        globalQualityLength: globalQuality.length,
        globalGeneralLength: globalGeneral.length,
        globalValueLength: globalValues.length,
        extruderQualityLength: extruderQuality.length,
        extruderGeneralLength: extruderGeneral.length,
        extruderValuesLength: extruderValues.length,
      });
      return '';
    }
  }
  createNoteForMultipleExtruders(
    globalGeneral: { [key: string]: string },
    globalValues: { [key: string]: string },
    extrudersGeneral: { [key: string]: string }[],
    extrudersValues: { [key: string]: string }[]
  ): string {
    const fixedGlobalGeneral = this.convertKeys(globalGeneral);
    const fixedGlobalValues = this.convertKeys(globalValues);

    const fixedExtrudersGeneral = extrudersGeneral.map((obj) =>
      this.convertKeys(obj)
    );
    const fixedExtrudersValues = extrudersValues.map((obj) =>
      this.convertKeys(obj)
    );

    const uniqueGeneralKeys = new Set([
      ...Object.keys(fixedGlobalGeneral),
      ...flatMap(fixedExtrudersGeneral, (obj) => Object.keys(obj)),
    ]);

    const uniqueValueKeys = new Set([
      ...Object.keys(fixedGlobalValues),
      ...flatMap(fixedExtrudersValues, (obj) => Object.keys(obj)),
    ]);

    // Now format the note:

    let note = '';

    if (uniqueGeneralKeys.size > 0) {
      note = note + 'Profile:\n';
      for (const key of uniqueGeneralKeys) {
        if (key === 'Version') {
          continue;
        }
        const setting = this.formatSetting(
          key,
          fixedGlobalGeneral,
          fixedExtrudersGeneral
        );
        note = note + '  ' + setting + '\n';
      }

      note = note + '\n';
    }

    if (uniqueValueKeys.size > 0) {
      note = note + 'Modified Settings:\n';
      for (const key of uniqueValueKeys) {
        const setting = this.formatSetting(
          key,
          fixedGlobalValues,
          fixedExtrudersValues
        );
        note = note + '  ' + setting + '\n';
      }

      note = note + '\n';
    }

    return note;
  }
  formatSetting(
    key: string,
    fixedGlobalGeneral: { [key: string]: string },
    fixedExtrudersGeneral: { [key: string]: string }[]
  ): string {
    // If all settings are same, just use value;

    const settingsAreSame =
      fixedGlobalGeneral?.[key] !== undefined &&
      fixedExtrudersGeneral.every(
        (obj) => obj?.[key] === fixedGlobalGeneral?.[key]
      );

    if (settingsAreSame) {
      return key + ': ' + fixedGlobalGeneral?.[key];
    }

    // If settings are different, combine them like:
    // Layer Height: 0.5 mm (Ex 1), 0.8mm (Ex 2)

    const global = fixedGlobalGeneral?.[key];

    const areExtrudersTheSame = new Set(
      fixedExtrudersGeneral.map((obj) => obj[key])
    );
    const extruders =
      areExtrudersTheSame.size === 1
        ? areExtrudersTheSame.values().next().value
        : fixedExtrudersGeneral
            .map((obj, index) => {
              if (obj?.[key] === undefined) {
                return '';
              }

              return obj?.[key] + ' (Ex ' + (index + 1) + ')';
            })
            .filter((value) => value !== '')
            .join(', ');

    return (
      key +
      ': ' +
      (extruders !== undefined && extruders !== '' ? extruders : global)
    );

    return '';
  }
  /**
   * Create a note for cases where there is just a single extruder.
   */
  createNoteForOneExtruder(
    globalGeneral: { [key: string]: string },
    globalValues: { [key: string]: string },
    extruderGeneral: { [key: string]: string },
    extruderValues: { [key: string]: string }
  ): string {
    // Combine the general and values sections, making sure the extruder overrides the global:

    const general = {
      ...this.convertKeys(globalGeneral),
      ...this.convertKeys(extruderGeneral),
    };
    const values = {
      ...this.convertKeys(globalValues),
      ...this.convertKeys(extruderValues),
    };

    // Now format the note:

    let note = '';

    if (Object.keys(general).length > 0) {
      note = note + 'Profile:\n';
      for (const [key, value] of Object.entries(general)) {
        if (key === 'Version') {
          continue;
        }
        note = note + '  ' + key + ': ' + value + '\n';
      }

      note = note + '\n';
    }

    if (Object.keys(values).length > 0) {
      note = note + 'Modified Settings:\n';
      for (const [key, value] of Object.entries(values)) {
        note = note + '  ' + key + ': ' + value + '\n';
      }
      note = note + '\n';
    }

    return note;
  }
  convertKeys(obj: { [key: string]: string }): { [key: string]: string } {
    const results = {};
    for (const [key, value] of Object.entries(obj)) {
      const fixedKey = key
        .replace(/ /g, '')
        .split('_')
        .map((s) => capitalize(s))
        .join(' ');
      results[fixedKey.trim()] = value.trim();
    }

    return results;
  }

  private parseGeneralSection(
    values: string
  ): Array<{ [key: string]: string }> {
    const valueRegex = values.match(/\[general\]\\n(.*?)\\n\[/g);

    // console.log('Parse General', valueRegex);

    const result = [];
    for (const value of valueRegex) {
      let valueString = value.replace('[general]\\n', '');
      valueString = valueString.replace('\\n[', '');
      // console.log('General String', valueString);

      const kvp = this.createKeyValuePairs(valueString);
      const keyCount = Object.keys(kvp).length;
      if (keyCount > 0) {
        result.push(kvp);
      }
    }

    return result;
  }

  private parseValues(values: string): Array<{ [key: string]: string }> {
    const valueRegex = values.match(/\[values\]\\n(.*?)\\n\\n\"/g);

    // console.log('Parse Values', valueRegex);

    const result = [];
    for (const value of valueRegex) {
      let valueString = value.replace('[values]\\n', '');
      valueString = valueString.replace('\\n\\n"', '');
      // console.log('Value String', valueString);

      const kvp = this.createKeyValuePairs(valueString);
      const keyCount = Object.keys(kvp).length;
      if (keyCount > 0) {
        result.push(kvp);
      }
    }

    return result;
  }

  /**
   * Splits a string in the form  "key1 = value\nkey2 = value\n..." into an object with they key names and values.
   * @param valueString A string in the form "key = value\nkey3 = value"
   */
  private createKeyValuePairs(valueString: string): { [key: string]: string } {
    const kvpRegex = /(?<key>.*?) = (?<value>.*?)\\n/g;

    let matches: any[];
    const output = {};

    // eslint-disable-next-line
    while ((matches = kvpRegex.exec(valueString)) !== null) {
      // Store the first match as the key, and the second match as the value
      output[matches[1]] = matches[2];
    }

    return output;
  }

  private parseEstimatedPrintTime(gcode: string) {
    let estPrintTime: number | null = null;
    const printTimeString = gcode.match(/TIME:(.+)$/im);
    if (printTimeString?.[1]) {
      estPrintTime = +printTimeString[1];
      if (isNaN(estPrintTime)) {
        estPrintTime = null;
      }
    }

    return estPrintTime;
  }

  private getDefaultPrintDetail() {
    const print: PrintDetail = {
      id: null,
      title: '',
      printerId: null,
      startDate: new Date(),
      estimatedPrintTimeInSeconds: null,
      estimatedFilamentUsageMg: null,
      printTimeInSeconds: null,
      filamentUsageMg: null,
      filamentType: '',
      notes: '',
      url: '',
      status: PrintStatus.Pending,
      viewStatus: null,
      images: [],
      allowComments: null,
      createdByUserId: null,
      comments: [],
      filamentUsage: [],
      fileName: '',
    };

    return print;
  }
}
