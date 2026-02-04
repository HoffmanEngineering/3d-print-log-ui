import { Injectable } from '@angular/core';
import parse from 'parse-duration';
import { GcodeNewPrintParser } from '../../gcode-file-parser.service';
import {
  PrintDetail,
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
  PrintImage,
  PrintStatus,
} from '../../print.service';
import { EditPrintDetailComponent } from 'src/app/print/edit-print-detail/edit-print-detail.component';

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
export class AnycubicFileParserService implements GcodeNewPrintParser {
  constructor() {}

  public async parse(gcode: string): Promise<PrintDetail> {
    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

    // Print Times:
    print.estimatedPrintTimeInSeconds = this.parseEstimatedPrintTime(gcode);

    //print.estimatedFilamentUsageMg = this.estimateFilamentUsageInMg(gcode);

    print.filamentUsage = this.getFilamentUsage(gcode);

    print.notes = this.parseSettingsIntoNotes(gcode);

    // Images
    print.images = this.parseImages(gcode);

    return print;
  }

  private getFilamentUsage(gcode: string): PrintFilamentSummaryDto[] {
    const filament: PrintFilamentSummaryDto[] = [];

    const filamentUsed = this.parseSettingAsString(
      gcode,
      '; filament used \\[mm\\]'
    );

    const usage = filamentUsed.split(',').map((x) => +x.trim());

    for (let i = 0; i < usage.length; i++) {
      if (usage[i] === 0) {
        continue;
      }

      const filamentUsage: PrintFilamentSummaryDto = {
        estimatedSource: PrintFilamentSourceMeasurement.Length,
        estimatedLengthInM: +(usage[i] / 1000).toFixed(3),
        id: null,
        notes: '',
        source: PrintFilamentSourceMeasurement.Length,
        filament:
          EditPrintDetailComponent.OTHER_FILAMENT_OPTION as unknown as any,
      };

      filament.push(filamentUsage);
    }

    return filament;
  }

  estimateFilamentUsageInMg(gcode: string): number {
    // Check to see if the user setup their filament densities, thus we can directly return filament usage.
    const filamentUsedInGrams = this.parseSettingAsNumber(
      gcode,
      '; filament used \\[g\\]'
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

    const spiralVaseModeEnabled = this.parseSettingAsBoolean(
      gcode,
      '; spiral_mode'
    );

    // Layer Count

    let layerCount = '';

    const layerCountregEx = new RegExp('total layer number: (.+)$', 'im');

    const layerCountsetting = gcode.match(layerCountregEx);

    if (layerCountsetting?.[1]) {
      layerCount = layerCountsetting[1].toString().trim();
    }
    if (layerCount) {
      notes += `Layer Count: ${layerCount}` + `\n`;
    }

    // Layer Height
    const layerHeight = this.parseSettingAsNumber(gcode, '; layer_height');
    if (layerHeight) {
      notes += `Layer Height: ${layerHeight}mm` + `\n`;
    }

    // Top Layers
    const topLayers = this.parseSettingAsNumber(gcode, '; top_shell_layers');
    if (topLayers) {
      notes += `Top Layer Count: ${topLayers}` + `\n`;
    }

    // Bottom Layers
    const bottomLayers = this.parseSettingAsNumber(
      gcode,
      '; bottom_shell_layers'
    );
    if (bottomLayers) {
      notes += `Bottom Layer Count: ${bottomLayers}` + `\n`;
    }

    // Top Layers
    const perimeters = this.parseSettingAsNumber(gcode, '; wall_loops');
    if (perimeters) {
      notes += `Walls: ${perimeters}` + `\n`;
    }

    const infillDensity = this.parseSettingAsString(
      gcode,
      '; sparse_infill_density'
    );
    if (infillDensity !== '') {
      notes += `Infill: ${infillDensity}` + `\n`;

      const infillPattern = this.parseSettingAsString(
        gcode,
        '; sparse_infill_pattern'
      );
      if (infillPattern !== '') {
        notes += `Infill Pattern: ${infillPattern}\n`;
      }
    }

    const supportEnabled = this.parseSettingAsBoolean(
      gcode,
      '; support_filament'
    );
    if (supportEnabled) {
      const buildplateOnly = this.parseSettingAsBoolean(
        gcode,
        '; support_on_build_plate_only'
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

    const draftShieldSetting = this.parseSettingAsString(
      gcode,
      '; draft_shield'
    );

    if (draftShieldSetting === 'enabled') {
      notes += `Draft Shield: Enabled\n`;
    }

    // if (
    //   params.has('ironing_enabled') &&
    //   this.stringToBoolean(params.get('ironing_enabled'))
    // ) {
    //   notes += `Ironing: Enabled\n`;
    // }

    notes = notes.trim();

    if (notes !== '') {
      notes = 'Print Settings:\n' + notes;
    }

    return notes;
  }

  private parseImages(gcode: string): PrintImage[] {
    const images: PrintImage[] = [];

    const imageRegEx = new RegExp(
      'thumbnail begin[\\sa-zA-Z\\d]*([\\S\\s]*?); thumbnail end',
      'im'
    );

    const image = gcode.match(imageRegEx);

    if (image?.[1]) {
      const base64Data = image[1]
        .toString()
        .trim()
        .replace(/;\s/g, '')
        .replace(/[\r\n]/g, '');
      const printImage: PrintImage = {
        url: `data:image/png;base64,${base64Data}`,
        id: null,
        isDefault: true,
        displayOrder: 0,
      };

      images.push(printImage);
    }

    return images;
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
    const printTimeString = gcode.match(/print_time = (.+)$/im);
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
