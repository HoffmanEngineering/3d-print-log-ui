import { Injectable } from '@angular/core';
import parse from 'parse-duration';
import { GcodeNewPrintParser } from '../gcode-file-parser.service';
import { PrintDetail, PrintStatus } from '../print.service';

@Injectable({
  providedIn: 'root',
})
export class PrusaSlicerFileParserService implements GcodeNewPrintParser {
  constructor() {}

  parse(gcode: string): PrintDetail {
    const print: PrintDetail = {
      ...this.getDefaultPrintDetail(),
    };

    // Print Times:
    print.estimatedPrintTimeInSeconds = this.parseEstimatedPrintTime(gcode);

    console.log('PrusaSlicerPrint', print);

    return print;
  }

  private parseEstimatedPrintTime(gcode: string) {
    let estPrintTime: number | undefined;
    const printTimeString = gcode.match(
      /estimated printing time \(normal mode\) = (.+)$/im
    );
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
