import { Injectable } from '@angular/core';
import parse from 'parse-duration';
import { GcodeNewPrintParser } from '../../gcode-file-parser.service';
import { PrintDetail, PrintStatus } from '../../print.service';

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
export class PrusaSlicerFileParserService implements GcodeNewPrintParser {
  constructor() {}

  public async parse(gcode: string): Promise<PrintDetail> {
    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

    // Print Times:
    print.estimatedPrintTimeInSeconds = this.parseEstimatedPrintTime(gcode);

    print.estimatedFilamentUsageMg = this.estimateFilamentUsageInMg(gcode);

    print.notes = this.parseSettingsIntoNotes(gcode);

    return print;
  }
  estimateFilamentUsageInMg(gcode: string): number | undefined {
    // Check to see if the user setup their filament densities, thus we can directly return filament usage.
    const filamentUsedInGrams = this.parseSettingAsNumber(
      gcode,
      '; total filament used \\[g\\]'
    );
    if (filamentUsedInGrams !== undefined && filamentUsedInGrams > 0) {
      return filamentUsedInGrams * 1000;
    }

    const filamentType = this.parseSettingAsString(gcode, '; filament_type');
    // Try and grab the first diameter
    const filamentDiameter = +this.parseSettingAsString(
      gcode,
      '; filament_diameter'
    ).split(',')?.[0];
    if (!Number.isFinite(filamentDiameter) || filamentDiameter <= 0) {
      return undefined;
    }
    const filamentUsageLengthInMM = +this.parseSettingAsString(
      gcode,
      '; filament used \\[mm\\]'
    );

    if (
      !Number.isFinite(filamentUsageLengthInMM) ||
      filamentUsageLengthInMM <= 0
    ) {
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

    // Only PLA, ABS and PETG are handled above, so anything else is unknown
    // rather than zero. Note MaterialDensities also declares Nylon, which this
    // chain never reaches -- see #100.
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
    let notes = '';
    const spiralVaseModeEnabled = this.parseSettingAsBoolean(
      gcode,
      '; spiral_vase'
    );

    // Layer Height
    const layerHeight = this.parseSettingAsNumber(gcode, '; layer_height');
    if (layerHeight) {
      notes += `Layer Height: ${layerHeight}mm` + `\n`;
    }

    // Top Layers
    const topLayers = this.parseSettingAsNumber(gcode, '; top_solid_layers');
    if (topLayers) {
      notes += `Top Layer Count: ${topLayers}` + `\n`;
    }

    // Bottom Layers
    const bottomLayers = this.parseSettingAsNumber(
      gcode,
      '; bottom_solid_layers'
    );
    if (bottomLayers) {
      notes += `Bottom Layer Count: ${bottomLayers}` + `\n`;
    }

    // Top Layers
    const perimeters = this.parseSettingAsNumber(gcode, '; perimeters');
    if (perimeters) {
      notes += `Perimeters: ${perimeters}` + `\n`;
    }

    const infillDensity = this.parseSettingAsString(gcode, '; fill_density');
    if (infillDensity !== '') {
      notes += `Infill: ${infillDensity}` + `\n`;

      const infillPattern = this.parseSettingAsString(gcode, '; fill_pattern');
      if (infillPattern !== '') {
        notes += `Infill Pattern: ${infillPattern}\n`;
      }
    }

    const supportEnabled = this.parseSettingAsBoolean(
      gcode,
      '; support_material'
    );
    if (supportEnabled) {
      const buildplateOnly = this.parseSettingAsBoolean(
        gcode,
        '; support_material_buildplate_only'
      );

      const supportType = buildplateOnly ? 'Touching Buildplate' : 'Everywhere';
      notes += `Support: Enabled ${supportType}`.trim() + `\n`;
    } else {
      notes += `Support: No Supports\n`;
    }

    // // Special Modes
    // if (
    //   params.has('mold_enabled') &&
    //   this.stringToBoolean(params.get('mold_enabled'))
    // ) {
    //   notes += `Mold Mode: Enabled\n`;
    // }

    if (spiralVaseModeEnabled) {
      notes += `Spiral Vase Mode: Enabled\n`;
    }

    if (this.parseSettingAsBoolean(gcode, '; ooze_prevention')) {
      notes += `Ooze Prevention: Enabled\n`;
    }

    // if (
    //   params.has('wireframe_enabled') &&
    //   this.stringToBoolean(params.get('wireframe_enabled'))
    // ) {
    //   notes += `Wireframe Mode: Enabled\n`;
    // }

    // if (
    //   params.has('magic_fuzzy_skin_enabled') &&
    //   this.stringToBoolean(params.get('magic_fuzzy_skin_enabled'))
    // ) {
    //   notes += `Fuzzy Skin Mode: Enabled\n`;
    // }

    if (this.parseSettingAsBoolean(gcode, '; draft_shield')) {
      notes += `Draft Shield: Enabled\n`;
    }

    // if (
    //   params.has('ironing_enabled') &&
    //   this.stringToBoolean(params.get('ironing_enabled'))
    // ) {
    //   notes += `Ironing: Enabled\n`;
    // }

    const settingId = this.parseSettingAsString(gcode, '; print_settings_id');
    if (settingId !== '') {
      notes += `Print Setting Config: ${settingId}\n`;
    }
    const printerConfigId = this.parseSettingAsString(
      gcode,
      '; printer_settings_id'
    );
    if (printerConfigId !== '') {
      notes += `Printer Config: ${printerConfigId}\n`;
    }

    notes = notes.trim();

    if (notes !== '') {
      notes = 'Print Settings:\n' + notes;
    }

    return notes;
  }

  private parseSettingAsString(gcode: string, settingName: string): string {
    let result = '';

    const regEx = new RegExp(settingName + ' = (.+)$', 'im');

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

    const regEx = new RegExp(settingName + ' = (.+)$', 'im');

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
    const printTimeString = gcode.match(
      /estimated printing time \(normal mode\) = (.+)$/im
    );
    if (printTimeString?.[1]) {
      const time = this.parseAsSeconds(printTimeString[1]);
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
    const durationAsMs = parse(input);
    if (durationAsMs == null) {
      return null;
    }
    const durationAsSeconds = durationAsMs / 1000;
    return Math.floor(durationAsSeconds);
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
