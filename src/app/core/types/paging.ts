export interface PageInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
}

export interface PagedList<T> {
  paging: PageInfo;
  items: T[];
}
