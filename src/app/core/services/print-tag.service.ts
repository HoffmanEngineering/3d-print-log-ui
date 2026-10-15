import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * One of the user's labels for prints (#7). A print can carry several, unlike a project, which
 * it belongs to at most one of. Tags are private: the API returns them to the print's creator
 * only, so a public print page never has any to show.
 *
 * Not to be confused with a filament's NFC tag, which identifies a physical spool.
 */
export interface PrintTag {
  /** GUID */
  id: string;
  name: string;
  /** A lower-case `#rrggbb` colour, or null for the default. */
  color: string | null;
}

export interface PrintTagInput {
  name: string;
  /** `#rrggbb`; an empty string or null means the default colour. */
  color: string | null;
}

/** A tag with totals over every print that carries it. */
export interface PrintTagStats extends PrintTag {
  printCount: number;
  /** Measured print time where recorded, else the slicer estimate. */
  totalPrintTimeInSeconds: number;
  /** Actual filament weight where recorded, else the estimate. */
  totalFilamentWeightMg: number;
  /** Filament plus electricity cost of the prints that could be costed; null when none could. */
  totalCost: number | null;
  costedPrintCount: number;
}

export interface PrintTagStatsResponse {
  /** The user's currency setting, which every cost is in. */
  currency: string | null;
  /** True when there are too many tagged prints to cost; every `totalCost` is then null. */
  costUnavailable: boolean;
  tags: PrintTagStats[];
}

/** The most tags one print may carry. The API enforces the same limit. */
export const MAX_TAGS_PER_PRINT = 20;

/** The longest tag name the API accepts. */
export const MAX_TAG_NAME_LENGTH = 50;

/** The API's own message for a 400 or 409 (a duplicate name), else a generic one. */
export function printTagErrorMessage(error: unknown): string {
  if (
    error instanceof HttpErrorResponse &&
    (error.status === 400 || error.status === 409) &&
    typeof error.error === 'string' &&
    error.error.trim() !== ''
  ) {
    return error.error;
  }
  return 'Could not save the tag. Please try again.';
}

@Injectable({ providedIn: 'root' })
export class PrintTagService {
  private readonly http = inject(HttpClient);
  private readonly baseApi = environment.printLogApiUrl;

  /** The user's tags, ordered by name. */
  list(): Observable<PrintTag[]> {
    return this.http.get<PrintTag[]>(`${this.baseApi}/api/Tags`);
  }

  stats(): Observable<PrintTagStatsResponse> {
    return this.http.get<PrintTagStatsResponse>(
      `${this.baseApi}/api/Tags/stats`
    );
  }

  create(input: PrintTagInput): Observable<PrintTag> {
    return this.http.post<PrintTag>(`${this.baseApi}/api/Tags`, toBody(input));
  }

  /** A full replace: a null colour clears it. */
  update(id: string, input: PrintTagInput): Observable<PrintTag> {
    return this.http.put<PrintTag>(
      `${this.baseApi}/api/Tags/${id}`,
      toBody(input)
    );
  }

  /** Deletes the tag. Its prints keep everything but the tag. */
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseApi}/api/Tags/${id}`);
  }

  /** Replaces the print's tags with exactly these, returning them as saved. */
  setPrintTags(printId: number, tagIds: string[]): Observable<PrintTag[]> {
    return this.http.put<PrintTag[]>(
      `${this.baseApi}/api/Prints/${printId}/tags`,
      { tagIds }
    );
  }
}

function toBody(input: PrintTagInput): PrintTagInput {
  return { name: input.name, color: input.color ? input.color : null };
}
