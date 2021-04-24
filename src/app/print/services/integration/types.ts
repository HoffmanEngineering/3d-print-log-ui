import { ParamMap } from '@angular/router';
import { PrintDetail } from 'src/app/core/services/print.service';

export interface NewPrintParser {
  parse(params: ParamMap): Promise<PrintDetail>;
}
