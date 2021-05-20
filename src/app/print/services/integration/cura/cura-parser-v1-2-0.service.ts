import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import { capitalize, snakeCase } from 'lodash-es';
import { CuraSettingServiceService } from 'src/app/core/services/cura-setting-service.service';
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
export class CuraParserV1pt2pt0Service implements NewPrintParser {
  constructor(
    private readonly loggingService: LoggingService,
    private readonly curaSettingService: CuraSettingServiceService
  ) {}

  async parse(params: ParamMap): Promise<PrintDetail> {
    const settingId = params.get('settingId');

    const curaData = await this.curaSettingService
      .getSettings(settingId)
      .toPromise();

    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

    const settings = curaData.settings as any;

    if (settings.estimated_print_time_seconds) {
      const printTime = +settings.estimated_print_time_seconds;
      if (isNaN(printTime)) {
        this.loggingService.logTrace(
          `Cura 1.0.0 - NaN Estimated Print Time Received: ${JSON.stringify(
            settings.estimated_print_time_seconds
          )}`
        );
      } else {
        print.estimatedPrintTimeInSeconds = Math.round(printTime);
      }
    }

    if (settings.print_name) {
      print.title = (snakeCase(settings.print_name) as string)
        .split('_')
        .map((s) => capitalize(s))
        .join(' ');
    }

    if (settings.material_used_mg) {
      const materialUsed = +settings.material_used_mg;

      if (isNaN(materialUsed)) {
        this.loggingService.logTrace(
          `Cura 1.0.0 - NaN Estimated Material Usaged Received: ${JSON.stringify(
            settings.material_used_mg
          )}`
        );
      } else {
        print.estimatedFilamentUsageMg = Math.round(materialUsed);
      }
    }

    // Note should come pre-formatted by the Cura Plugin in this version, so just add the note section if it exists.
    print.notes = settings?.note?.toString?.() ?? '';

    if (settings?.snapshot && settings.snapshot !== '') {
      print.images = [
        {
          id: null,
          isDefault: true,
          url: 'data:image/png;base64,' + settings.snapshot,
        },
      ];
    }

    return print;
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
