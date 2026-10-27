import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import {
  FilamentService,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { filamentDetailToSummary } from 'src/app/core/utils/filament-summary';

/** A spool a scan may be, with why. */
export interface SuggestionRow {
  filamentId: string;
  /** Null when the spool could not be loaded; the row still works. */
  filament: FilamentSummary | null;
  reasons: string[];
}

/**
 * The suggested spools with what their rows show. The list's own spools cover most; the rest
 * (another page, inactive) are fetched. Unknown reasons show as they came.
 */
export function suggestionRows(
  suggestions: { filamentId: string; reasons?: string[] | null }[],
  known: ReadonlyMap<string, FilamentSummary>,
  filamentService: FilamentService,
  labels: Record<string, string>
): Observable<SuggestionRow[]> {
  if (suggestions.length === 0) {
    return of([]);
  }
  return forkJoin(
    suggestions.map((s) => {
      const listed = known.get(s.filamentId);
      const filament$: Observable<FilamentSummary | null> = listed
        ? of(listed)
        : filamentService.getFilamentDetail(s.filamentId).pipe(
            map(filamentDetailToSummary),
            catchError(() => of(null))
          );
      return filament$.pipe(
        map(
          (filament): SuggestionRow => ({
            filamentId: s.filamentId,
            filament,
            reasons: (s.reasons ?? []).map((r) => labels[r] ?? String(r)),
          })
        )
      );
    })
  );
}

/** What each label-match reason reads as on a row's chip. */
export const LABEL_REASON_LABELS: Record<string, string> = {
  'same-barcode': 'Same barcode',
  'same-color-name': 'Same color',
  'same-brand': 'Same brand',
  'same-material': 'Same material',
  'same-weight': 'Same weight',
};
