import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import { PrintDetail, PrintStatus } from 'src/app/core/services/print.service';
import { NewPrintParser } from './types';

import { capitalize, snakeCase } from 'lodash-es';
import { CuraParserV1pt0pt0Service } from './cura/cura-parser-v1-0-0.service';

@Injectable()
export class CuraParserService implements NewPrintParser {
  constructor(private readonly parserV1pt0pt0: CuraParserV1pt0pt0Service) {}
  parse(params: ParamMap): PrintDetail {
    if (!params.has('plugin_version')) {
      // Cura plugin will always have the plugin_version, so
      console.warn('No Cura Plugin Version detected');
      return null;
    }

    switch (params.get('plugin_version')) {
      case '1.0.0':
        return this.parserV1pt0pt0.parse(params);

      case '1.1.0':
        break;
      default:
        return null;
    }
  }
}
