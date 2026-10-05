import { PrintDetail } from '../../print.service';

/**
 * Parses gcode text into a new PrintDetail object.
 */
export interface GcodeNewPrintParser {
  /**
   * @param gcode The contents of a gcode file
   * @param fileName Optional file name of the gcode file
   */
  parse(gcode: string, fileName?: string): Promise<PrintDetail>;
}
