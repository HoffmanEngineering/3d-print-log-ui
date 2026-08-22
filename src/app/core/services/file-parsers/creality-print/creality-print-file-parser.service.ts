import { Injectable } from '@angular/core';
import parse from 'parse-duration';
import { GcodeNewPrintParser } from '../../gcode-file-parser.service';
import {
  EMPTY_GUID,
  PrintDetail,
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
  PrintStatus,
} from '../../print.service';
import { FilamentSummary } from '../../filament.service';

//
export interface MaterialDensityGramsPerCubicCm {
  PLA: number;
  ABS: number;
  PETG: number;
  Nylon: number;
}

export class MaterialDensities {
  static materials: MaterialDensityGramsPerCubicCm = {
    PLA: 1.24,
    ABS: 1.04,
    PETG: 1.23,
    Nylon: 1.06,
  };
}

@Injectable({
  providedIn: 'root',
})
export class CrealityPrintFileParserService implements GcodeNewPrintParser {
  constructor() {}

  public async parse(gcode: string): Promise<PrintDetail> {
    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

    // Print Times:
    print.estimatedPrintTimeInSeconds = this.parseEstimatedPrintTime(gcode);

    print.estimatedFilamentUsageMg = this.estimateFilamentUsageInMg(gcode);

    print.filamentUsage = this.getFilamentUsage(gcode);

    print.notes = this.parseSettingsIntoNotes(gcode);

    return print;
  }

  getFilamentUsage(gcode: string): PrintFilamentSummaryDto[] {
    const totalFilamentUsedWithUnits = this.parseSettingAsString(
      gcode,
      ';Filament used'
    );

    if (totalFilamentUsedWithUnits === '') {
      return [];
    }

    const filamentUsedWithoutUnits = totalFilamentUsedWithUnits.replace(
      'm',
      ''
    );

    const filamentUsedInMeters = +filamentUsedWithoutUnits;

    return [
      {
        estimatedSource: PrintFilamentSourceMeasurement.Length,
        source: PrintFilamentSourceMeasurement.Weight,
        estimatedLengthInM: filamentUsedInMeters,
        amountMg: 0,
        estimatedAmountMg: 0,
        lengthInM: 0,
        filament: {
          id: EMPTY_GUID,
          displayName: 'Other',
        } as FilamentSummary,
        id: EMPTY_GUID,
      },
    ];
  }

  estimateFilamentUsageInMg(gcode: string): number | undefined {
    // Check to see if the user setup their filament densities, thus we can directly return filament usage.
    const filamentUsedInGrams = this.parseSettingAsNumber(
      gcode,
      ';Filament used:'
    );
    if (filamentUsedInGrams > 0) {
      return filamentUsedInGrams * 1000;
    }

    const filamentType = this.parseSettingAsString(gcode, '; filament_type');
    // Try and grab the first diameter
    const filamentDiameter = +this.parseSettingAsString(
      gcode,
      '; filament_diameter'
    ).split(',')?.[0];
    if (isNaN(filamentDiameter)) {
      return undefined;
    }
    const filamentUsageLengthInMM = +this.parseSettingAsString(
      gcode,
      '; filament used \\[mm\\]'
    );

    if (isNaN(filamentUsageLengthInMM)) {
      return undefined;
    }

    if (filamentType.includes('PLA')) {
      return this.calculateWeightInMg(
        MaterialDensities.materials.PLA,
        filamentUsageLengthInMM,
        filamentDiameter
      );
    } else if (filamentType.includes('ABS')) {
      return this.calculateWeightInMg(
        MaterialDensities.materials.ABS,
        filamentUsageLengthInMM,
        filamentDiameter
      );
    } else if (filamentType.includes('PETG')) {
      return this.calculateWeightInMg(
        MaterialDensities.materials.PETG,
        filamentUsageLengthInMM,
        filamentDiameter
      );
    }

    // No density on file for this material, so usage is unknown rather than zero.
    return undefined;
  }

  private calculateWeightInMg(
    materialDensityGramsPerCubicCm: number,
    lengthInMm: number,
    diameterInMm: number
  ) {
    const radiusInMm = diameterInMm / 2;
    const filamentAreaInMm2 = Math.PI * radiusInMm * radiusInMm;

    const volume = filamentAreaInMm2 * lengthInMm;

    const densityInCubicMm = materialDensityGramsPerCubicCm / 1000;

    const weightInGrams = volume * densityInCubicMm;
    return Math.floor(weightInGrams * 1000);
  }

  parseSettingsIntoNotes(gcode: string): string {
    // Given a multi-line string starting with ";FLAVOR:Marlin" and ending with ";---------------------End of Head--------------------------", write a regex that grabs all the text in between.
    const regex = new RegExp(
      /;FLAVOR:Marlin([\s\S]*);---------------------End of Head--------------------------/im
    );

    const settings = gcode.match(regex);

    let notes = '';

    if (settings?.[1]) {
      notes = settings[1].toString();

      // Remove all the ; from the start of each line
      notes = notes.replace(/(^|\n);/g, '$1');
      notes = notes.trim();

      notes = 'Print Settings:\n' + notes;
    }

    return notes;
  }

  private parseSettingAsString(gcode: string, settingName: string): string {
    let result = '';

    const regEx = new RegExp(settingName + ':(.+)$', 'im');

    const setting = gcode.match(regEx);

    if (setting?.[1]) {
      result = setting[1].toString().trim();
    }

    return result;
  }

  private parseSettingAsNumber(
    gcode: string,
    settingName: string
  ): number | undefined {
    let result: number | undefined;

    const regEx = new RegExp(settingName + ':(.+)$', 'im');

    const setting = gcode.match(regEx);

    if (setting?.[1]) {
      result = +setting[1];
    }

    return result;
  }

  private parseSettingAsBoolean(gcode: string, settingName: string) {
    const setting = this.parseSettingAsNumber(gcode, settingName);

    return setting === 1;
  }

  private parseEstimatedPrintTime(gcode: string) {
    let estPrintTime: number | undefined;
    const printTimeString = this.parseSettingAsString(gcode, ';TIME');
    if (printTimeString !== '') {
      const time = this.parseAsSeconds(printTimeString);
      if (time) {
        estPrintTime = time;
      }
    }

    return estPrintTime;
  }

  private parseAsSeconds(input: string): number | null {
    if (input == null || input.trim() === '') {
      return null;
    }

    return Math.ceil(+input);
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
      fileName: '',
      status: PrintStatus.Pending,
      viewStatus: null,
      images: [],
      allowComments: null,
      createdByUserId: null,
      comments: [],
      filamentUsage: [],
    };

    return print;
  }
}
