import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import { PrintDetail, PrintStatus } from 'src/app/core/services/print.service';
import { NewPrintParser } from './types';

import { capitalize, snakeCase } from 'lodash-es';

@Injectable()
export class CuraParserService implements NewPrintParser {
  constructor() {}
  parse(params: ParamMap): PrintDetail {
    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

    if (params.has('estimated_print_time')) {
      print.estimatedPrintTimeInSeconds = +params.get('estimated_print_time');
    }

    if (params.has('print_name')) {
      print.title = (snakeCase(params.get('print_name')) as string)
        .split('_')
        .map((s) => capitalize(s))
        .join(' ');
    }

    print.notes = this.putSettingsIntoNotes(params);

    return print;
  }
  putSettingsIntoNotes(params: ParamMap): string {
    let notes = '';
    if (params.has('layer_height')) {
      notes += `Layer Height: ${params.get('layer_height')}\n`;
    }

    if (params.has('wall_line_count')) {
      notes += `Wall Line Count: ${params.get('wall_line_count')}\n`;
    }

    if (params.has('infill_sparse_density')) {
      notes += `Infill: ${params.get('infill_sparse_density')}\n`;
    }
    if (params.has('infill_pattern')) {
      notes += `Infill Pattern: ${params.get('infill_pattern')}\n`;
    }

    return notes.trim();
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
}
