import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import { PrintDetail } from 'src/app/core/services/print.service';
import { NewPrintParser } from './types';

import { CuraParserV1pt0pt0Service } from './cura/cura-parser-v1-0-0.service';
import { CuraParserV1pt1pt0Service } from './cura/cura-parser-v1-1-0.service';

@Injectable()
export class CuraParserService implements NewPrintParser {
  constructor(
    private readonly parserV1pt0pt0: CuraParserV1pt0pt0Service,
    private readonly parserV1pt1pt0: CuraParserV1pt1pt0Service
  ) {}
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
        return this.parserV1pt1pt0.parse(params);
        break;
      default:
        return null;
    }
  }
}
