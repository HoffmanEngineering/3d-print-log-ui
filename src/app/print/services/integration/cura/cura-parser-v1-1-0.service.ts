import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import { capitalize, snakeCase } from 'lodash-es';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrintDetail, PrintStatus } from 'src/app/core/services/print.service';
import { NewPrintParser } from '../types';

export interface ExtruderSettings {
  defaultMaterialPrintTemp: number;
  gradualInfillSteps: number;
  infillPattern: string;
  infillSparseDensity: number;
  materialPrintTemperature: number;
  materialUsed: number;
  nozzleSize: number;
  retractionEnabled: boolean;
  variant: string;
  wallLineCount: number;
  topThickness: number;
  topLayerCount: number;
  bottomThickness: number;
  bottomLayerCount: number;
}

@Injectable()
export class CuraParserV1pt1pt0Service implements NewPrintParser {
  constructor(private readonly loggingService: LoggingService) {}
  async parse(params: ParamMap): Promise<PrintDetail> {
    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

    // extruder independent settings.
    if (params.has('estimated_print_time_seconds')) {
      const printTime = +params.get('estimated_print_time_seconds');
      if (isNaN(printTime)) {
        this.loggingService.logTrace(
          `Cura 1.0.0 - NaN Estimated Print Time Received: ${JSON.stringify(
            params.get('estimated_print_time_seconds')
          )}`
        );
      } else {
        print.estimatedPrintTimeInSeconds = Math.round(printTime);
      }
    }

    if (params.has('print_name')) {
      print.title = (snakeCase(params.get('print_name')) as string)
        .split('_')
        .map((s) => capitalize(s))
        .join(' ');
    }

    if (params.has('material_used_mg')) {
      const materialUsed = +params.get('material_used_mg');

      if (isNaN(materialUsed)) {
        this.loggingService.logTrace(
          `Cura 1.0.0 - NaN Estimated Material Usaged Received: ${JSON.stringify(
            params.get('material_used_mg')
          )}`
        );
      } else {
        print.estimatedFilamentUsageMg = Math.round(materialUsed);
      }
    }

    print.notes = this.putSettingsIntoNotes(params);

    return print;
  }

  putSettingsIntoNotes(params: ParamMap): string {
    const extruders: ExtruderSettings[] = this.parseExtruders(params);

    let notes = '';
    const spiralVaseModeEnabled =
      params.has('magic_spiralize') &&
      this.stringToBoolean(params.get('magic_spiralize'));

    if (params.has('layer_height')) {
      const isAdaptiveLayerHeightEnabled =
        params.has('adaptive_layer_height_enabled') &&
        this.stringToBoolean(params.get('adaptive_layer_height_enabled'));

      notes +=
        `Layer Height: ${params.get('layer_height')}mm ${
          isAdaptiveLayerHeightEnabled ? '(with Adaptive Layer Height)' : ''
        }`.trim() + `\n`;
    }

    const usedExtruders = this.getExtrudersUsed(extruders);

    if (usedExtruders.length <= 1) {
      const settings = this.GetSingleExtruderSettings(
        params,
        spiralVaseModeEnabled,
        usedExtruders[0]
      );

      if (settings.length > 0) {
        notes += settings.join('\n') + `\n`;
      }
    } else {
      for (let i = 0; i < usedExtruders.length; i++) {
        const settings = this.GetSingleExtruderSettings(
          params,
          spiralVaseModeEnabled,
          usedExtruders[i]
        );

        if (settings.length > 0) {
          notes += `Extruder ${i + 1}:\n`;
          const formattedSetting = settings.map((s) => `- ${s}`);
          notes += formattedSetting.join('\n') + `\n`;
        }
      }
    }

    if (params.has('support_enabled')) {
      const isSupportEnabled = this.stringToBoolean(
        params.get('support_enabled')
      );
      if (isSupportEnabled) {
        let supportType = '';
        if (params.has('support_type')) {
          switch (params.get('support_type')) {
            case 'everywhere':
              supportType = 'Everywhere';
              break;
            case 'buildplate':
              supportType = 'Touching Buildplate';
              break;
          }
        }
        notes += `Support: Enabled ${supportType}`.trim() + `\n`;
      } else {
        notes += `Support: No Supports\n`;
      }
    }

    // Special Modes
    if (
      params.has('mold_enabled') &&
      this.stringToBoolean(params.get('mold_enabled'))
    ) {
      notes += `Mold Mode: Enabled\n`;
    }

    if (spiralVaseModeEnabled) {
      notes += `Spiral Vase Mode: Enabled\n`;
    }

    if (
      params.has('ooze_shield_enabled') &&
      this.stringToBoolean(params.get('ooze_shield_enabled'))
    ) {
      notes += `Ooze Shield: Enabled\n`;
    }

    if (
      params.has('wireframe_enabled') &&
      this.stringToBoolean(params.get('wireframe_enabled'))
    ) {
      notes += `Wireframe Mode: Enabled\n`;
    }

    if (
      params.has('magic_fuzzy_skin_enabled') &&
      this.stringToBoolean(params.get('magic_fuzzy_skin_enabled'))
    ) {
      notes += `Fuzzy Skin Mode: Enabled\n`;
    }

    if (
      params.has('draft_shield_enabled') &&
      this.stringToBoolean(params.get('draft_shield_enabled'))
    ) {
      notes += `Draft Shield: Enabled\n`;
    }

    if (
      params.has('ironing_enabled') &&
      this.stringToBoolean(params.get('ironing_enabled'))
    ) {
      notes += `Ironing: Enabled\n`;
    }

    notes = notes.trim();

    if (notes !== '') {
      notes = 'Print Settings:\n' + notes;
    }

    return notes;
  }

  private getExtrudersUsed(extruders: ExtruderSettings[]) {
    return extruders.filter((e) => e.materialUsed > 0);
  }

  private GetSingleExtruderSettings(
    params: ParamMap,
    spiralVaseModeEnabled: boolean,
    extruder: ExtruderSettings
  ): string[] {
    const notes = [];

    if (
      (params.has('top_thickness') || extruder?.topThickness > -1) &&
      !spiralVaseModeEnabled
    ) {
      notes.push(
        `Top Thickness: ${
          extruder?.topThickness > -1
            ? extruder.topThickness
            : params.get('top_thickness')
        }mm`
      );
    }
    if (params.has('bottom_thickness') || extruder?.bottomThickness > -1) {
      notes.push(
        `Bottom Thickness: ${
          extruder?.bottomThickness > -1
            ? extruder.bottomThickness
            : params.get('bottom_thickness')
        }mm`
      );
    }

    if (params.has('wall_line_count') || extruder?.wallLineCount > -1) {
      notes.push(
        `Wall Line Count: ${
          extruder?.wallLineCount > 0
            ? extruder.wallLineCount
            : params.get('wall_line_count')
        }`
      );
    }

    if (
      (params.has('infill_sparse_density') ||
        extruder?.infillSparseDensity > -1) &&
      !spiralVaseModeEnabled
    ) {
      const infillDensity =
        extruder?.infillSparseDensity > -1
          ? extruder.infillSparseDensity
          : params.get('infill_sparse_density');
      notes.push(`Infill: ${infillDensity}%`);

      if (
        (params.has('infill_pattern') ||
          (extruder && extruder.infillPattern !== '')) &&
        !isNaN(Number(infillDensity)) &&
        Number(infillDensity) > 0
      ) {
        notes.push(
          `Infill Pattern: ${
            extruder && extruder.infillPattern !== ''
              ? extruder.infillPattern
              : params.get('infill_pattern')
          }`
        );
      }
    }
    return notes;
  }

  /**
   * Extruder settings are prefixes with ex#_ to indicate which extruder they are part of, zero-indexed.
   * This parses those ex#_ settings into an array of extruder settings that we can then work with.
   */
  private parseExtruders(params: ParamMap): ExtruderSettings[] {
    const extruders: ExtruderSettings[] = [];

    let extruderIndex = 0;

    while (this.doesExtruderExist(params, extruderIndex)) {
      const prefix = `ex${extruderIndex}_`;
      const parsedExtruder: ExtruderSettings = {
        defaultMaterialPrintTemp: +(
          params.get(`${prefix}default_material_print_temperature`) ?? 0
        ),
        gradualInfillSteps: +(params.get(`${prefix}gradual_infill_steps`) ?? 0),
        infillPattern: params.get(`${prefix}infill_pattern`) ?? '',
        infillSparseDensity: +(
          params.get(`${prefix}infill_sparse_density`) ?? -1
        ),
        materialPrintTemperature: +(
          params.get(`${prefix}material_print_temperature`) ?? 0
        ),
        materialUsed: +(params.get(`${prefix}material_used`) ?? 0),
        nozzleSize: +(params.get(`${prefix}nozzle_size`) ?? 0),
        retractionEnabled: !!(
          params.get(`${prefix}retraction_enable`) ?? false
        ),
        variant: params.get(`${prefix}variant`) ?? '',
        wallLineCount: +(params.get(`${prefix}wall_line_count`) ?? -1),
        topThickness: +(params.get(`${prefix}top_thickness`) ?? -1),
        topLayerCount: +(params.get(`${prefix}top_layers`) ?? -1),
        bottomThickness: +(params.get(`${prefix}bottom_thickness`) ?? -1),
        bottomLayerCount: +(params.get(`${prefix}bottom_layers`) ?? -1),
      };

      extruders.push(parsedExtruder);

      extruderIndex++;
    }

    return extruders;
  }

  private doesExtruderExist(params: ParamMap, index: number): boolean {
    // We look for a key that should always exist, and check that it exists for the requested index;
    return params.has(`ex${index}_nozzle_size`);
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

  private stringToBoolean(str: string) {
    switch (str.toLowerCase().trim()) {
      case 'true':
      case 'yes':
      case '1':
        return true;
      case 'false':
      case 'no':
      case '0':
      case null:
        return false;
      default:
        return Boolean(str);
    }
  }
}
