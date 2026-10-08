import parse from 'parse-duration';

/**
 * Reads a human or slicer duration ("1d 2h 3m 4s", "90m", "1.5h") as whole seconds.
 * Blank input and text that is not a duration both give null - never 0, which would
 * read as a print that took no time at all.
 */
export function parseDurationAsSeconds(
  input: string | null | undefined
): number | null {
  if (input == null || input.trim() === '') {
    return null;
  }
  const ms = parse(input);
  return ms == null ? null : Math.floor(ms / 1000);
}
