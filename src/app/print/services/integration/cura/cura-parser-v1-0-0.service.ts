import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import { capitalize, snakeCase } from 'lodash-es';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrintDetail, PrintStatus } from 'src/app/core/services/print.service';
import { NewPrintParser } from '../types';

@Injectable()
export class CuraParserV1pt0pt0Service implements NewPrintParser {
  constructor(private readonly loggingService: LoggingService) {}
  parse(params: ParamMap): PrintDetail {
    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

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

  getDefaultPrintDetail() {
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

  stringToBoolean(str: string) {
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
