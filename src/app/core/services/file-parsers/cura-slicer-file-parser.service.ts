import { Injectable } from '@angular/core';
import { forEach, min } from 'lodash';
import { GcodeNewPrintParser } from '../gcode-file-parser.service';
import { PrintDetail, PrintStatus } from '../print.service';

@Injectable({
  providedIn: 'root',
})
export class CuraSlicerFileParserService implements GcodeNewPrintParser {
  constructor() {}

  parse(gcode: string): PrintDetail {
    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

    // Print Times:
    print.estimatedPrintTimeInSeconds = this.parseEstimatedPrintTime(gcode);

    const settings = this.parseSetting(gcode);

    // print.estimatedFilamentUsageMg = this.estimateFilamentUsageInMg(gcode);

    // print.notes = this.parseSettingsIntoNotes(gcode);

    return print;
  }
  parseSetting(gcode: string) {
    let settings = gcode.match(/;End of Gcode(?<test>(.|\n)*)/g)?.[0];

    if (settings === null || settings === undefined) {
      return;
    }

    console.log('Before Cleanup', settings);

    settings = settings.replace(/;End of Gcode\n/gm, '');
    settings = settings.replace(/;SETTING_\d /gm, '');
    console.log('After Setting Wipe', settings);
    settings = settings.replace(/\n/gm, '');
    console.log(settings);

    const globalQuality = settings.match(/"global_quality": ".*?\\n\\n"/g);
    console.log('global', globalQuality);

    const globalGeneral =
      globalQuality.length > 0
        ? this.parseGeneralSection(globalQuality[0])
        : null;
    const globalValues =
      globalQuality.length > 0 ? this.parseValues(globalQuality[0]) : null;

    const extruderQuality = settings.match(
      /"extruder_quality": \[.*?\\n\\n\"\],/g
    );
    console.log('extruder', extruderQuality);

    const extruderGeneral =
      extruderQuality.length > 0
        ? this.parseGeneralSection(extruderQuality[0])
        : null;
    const extruderValues =
      extruderQuality.length > 0 ? this.parseValues(extruderQuality[0]) : null;
  }

  private parseGeneralSection(
    values: string
  ): Array<{ [key: string]: string }> {
    const valueRegex = values.match(/\[general\]\\n(.*?)\\n\[/g);

    console.log('Parse General', valueRegex);

    const result = [];
    for (const value of valueRegex) {
      let valueString = value.replace('[general]\\n', '');
      valueString = valueString.replace('\\n[', '');
      console.log('General String', valueString);

      this.createKeyValuePairs(valueString);
    }

    return result;
  }

  private parseValues(values: string): Array<{ [key: string]: string }> {
    const valueRegex = values.match(/\[values\]\\n(.*?)\\n\\n\"/g);

    console.log('Parse Values', valueRegex);

    const result = [];
    for (const value of valueRegex) {
      let valueString = value.replace('[values]\\n', '');
      valueString = valueString.replace('\\n\\n"', '');
      console.log('Value String', valueString);

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
