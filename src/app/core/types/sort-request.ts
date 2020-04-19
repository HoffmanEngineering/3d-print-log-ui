export enum SortDirection {
  Asc = 1,
  Desc = 2,
}

export interface SortRequest<T> {
  sortDirection: SortDirection;
  sortColumn: T;
}
