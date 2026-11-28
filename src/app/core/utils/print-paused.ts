import { PrintStatus } from '../services/print.service';

/**
 * Whether a print is paused on its printer right now (3d-print-log-api#343). A paused print
 * keeps the Printing status; `pausedSince` says it is paused. A print that has since ended is
 * never shown as paused, even if a stale `pausedSince` came with it.
 */
export function isPaused(print: {
  status?: PrintStatus | null;
  pausedSince?: string | null;
}): boolean {
  return print.status === PrintStatus.Printing && !!print.pausedSince;
}
