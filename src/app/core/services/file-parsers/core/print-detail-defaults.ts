import { capitalize, snakeCase } from 'lodash-es';
import { FilamentSummary } from '../../filament.service';
import { EMPTY_GUID, PrintDetail, PrintStatus } from '../../print.service';

/** The "Other" filament placeholder the edit form recognizes by EMPTY_GUID. */
export const OTHER_FILAMENT = {
  id: EMPTY_GUID,
  displayName: 'Other',
} as FilamentSummary;

export function createDefaultPrintDetail(): PrintDetail {
  return {
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
    fileName: '',
    status: PrintStatus.Pending,
    viewStatus: null,
    images: [],
    allowComments: null,
    createdByUserId: null,
    comments: [],
    filamentUsage: [],
  };
}

/** "my_cool-benchy.gcode" -> "My Cool Benchy", capped at 100 characters. */
export function getTitleFromFileName(fileName: string): string {
  return (snakeCase(fileName) as string)
    .split('_')
    .filter((segment) => segment.toLocaleLowerCase() !== 'gcode')
    .map((s) => capitalize(s))
    .join(' ')
    .trim()
    .substring(0, 100);
}
