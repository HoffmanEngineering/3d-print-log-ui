import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import { capitalize, snakeCase } from 'lodash-es';
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
}

@Injectable()
export class CuraParserV1pt1pt0Service implements NewPrintParser {
  constructor() {}
  parse(params: ParamMap): PrintDetail {
    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

    // extruder independent settings.
    if (params.has('estimated_print_time_seconds')) {
      print.estimatedPrintTimeInSeconds = +params.get(
        'estimated_print_time_seconds'
      );
    }

    if (params.has('print_name')) {
      print.title = (snakeCase(params.get('print_name')) as string)
        .split('_')
        .map((s) => capitalize(s))
        .join(' ');
    }

    if (params.has('material_used_mg')) {
      print.estimatedFilamentUsageMg = +params.get('material_used_mg');
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
    if (params.has('top_thickness') && !spiralVaseModeEnabled) {
      notes += `Top Thickness: ${params.get('top_thickness')}mm\n`;
    }
    if (params.has('bottom_thickness')) {
      notes += `Bottom Thickness: ${params.get('bottom_thickness')}mm\n`;
    }

    if (params.has('wall_line_count')) {
      notes += `Wall Line Count: ${params.get('wall_line_count')}\n`;
    }

    if (params.has('infill_sparse_density') && !spiralVaseModeEnabled) {
      const infillDensity = params.get('infill_sparse_density');
      notes += `Infill: ${infillDensity}%\n`;

      if (
        params.has('infill_pattern') &&
        !isNaN(Number(infillDensity)) &&
        Number(infillDensity) > 0
      ) {
        notes += `Infill Pattern: ${params.get('infill_pattern')}\n`;
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
          params.get(`${prefix}infill_sparse_density`) ?? 0
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
        wallLineCount: +(params.get(`${prefix}wall_line_count`) ?? 0),
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
      status: PrintStatus.Pending,
      viewStatus: null,
      images: [],
      allowComments: null,
      createdByUserId: null,
      comments: [],
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
