/**
 * Every supported slicer writes its metadata (header, thumbnails, settings
 * block) at the very start and/or very end of the file, with the bulk being
 * toolpath commands in between. Large files are narrowed to those two regions
 * so parse cost is independent of file size.
 */
export const GCODE_WINDOW_SIZE = 2_000_000;

/**
 * Returns the gcode unchanged when it fits in two windows, otherwise the head
 * and tail joined by a newline. Order is preserved so "first match wins"
 * lookups behave the same as on the full file.
 */
export function trimGcodeWindow(gcode: string): string {
  if (gcode.length <= GCODE_WINDOW_SIZE * 2) {
    return gcode;
  }

  return (
    gcode.slice(0, GCODE_WINDOW_SIZE) +
    '\n' +
    gcode.slice(gcode.length - GCODE_WINDOW_SIZE)
  );
}
