import { PrintDetail } from '../../print.service';

/**
 * A parsed print plus what the file says beside it. The detected printer names ride here, not on
 * PrintDetail, because PrintDetail is also the save payload.
 */
export interface ParsedNewPrint {
  print: PrintDetail;
  /**
   * The names the file's header gives for the printer it was sliced for, in the order to try
   * them against the catalog. Empty when it names none.
   */
  detectedPrinterNames: string[];
}

/**
 * Parses gcode text into a new PrintDetail object.
 */
export interface GcodeNewPrintParser {
  /**
   * @param gcode The contents of a gcode file
   * @param fileName Optional file name of the gcode file
   */
  parse(gcode: string, fileName?: string): Promise<PrintDetail>;

  /** As parse, plus the printer name the file's header carries. */
  parseWithMeta(gcode: string, fileName?: string): Promise<ParsedNewPrint>;
}
