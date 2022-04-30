import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrintDetail } from 'src/app/core/services/print.service';
import { CuraParserV1pt0pt0Service } from './cura/cura-parser-v1-0-0.service';
import { CuraParserV1pt1pt0Service } from './cura/cura-parser-v1-1-0.service';
import { CuraParserV1pt2pt0Service } from './cura/cura-parser-v1-2-0.service';
import { NewPrintParser } from './types';

@Injectable()
export class CuraParserService implements NewPrintParser {
  constructor(
    private readonly parserV1pt0pt0: CuraParserV1pt0pt0Service,
    private readonly parserV1pt1pt0: CuraParserV1pt1pt0Service,
    private readonly parserV1pt2pt0: CuraParserV1pt2pt0Service,
    private readonly loggingService: LoggingService,
    private readonly toastrService: ToastrService
  ) {}

  async parse(params: ParamMap): Promise<PrintDetail> {
    if (!params.has('plugin_version')) {
      // Cura plugin will always have the plugin_version, so
      console.warn('No Cura Plugin Version detected');
      return null;
    }

    this.loggingService.logEvent('PrintSentFromCura', {
      plugin_version: params.get('plugin_version').toString(),
      cura_version: params.get('cura_version').toString(),
    });

    switch (params.get('plugin_version')) {
      case '1.0.0':
        this.displayOutdatedCuraToast();
        return this.parserV1pt0pt0.parse(params);
      case '1.1.0':
        this.displayOutdatedCuraToast();
        return this.parserV1pt1pt0.parse(params);
      case '1.2.0':
        this.displayOutdatedCuraToast();
        return this.parserV1pt2pt0.parse(params);
      case '1.2.1':
        return this.parserV1pt2pt0.parse(params);
      default:
        // By default, attempt to use the highest parser version so newer
        // versions that are backward compatible will still work
        return this.parserV1pt2pt0.parse(params);
    }
  }

  private displayOutdatedCuraToast() {
    this.toastrService.info(
      'An update for the 3D Print Log Cura Plugin is available. Update through the Cura Marketplace.',
      'Update Available'
    );
  }
}
