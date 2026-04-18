import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SafeUrl } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { PagedList } from '../types/paging';
import { PrinterSummary } from './printer.service';
import {
  PrintFilamentSummaryDto,
  PrintStatus,
  PrintSummarySortColumn,
} from './print.service';
import { SortDirection } from '../types/sort-request';

export enum ProjectStatus {
  InProgress = 1,
  Complete = 2,
  OnHold = 3,
  Cancelled = 4,
}

export enum ProjectViewStatus {
  Public = 1,
  Unlisted = 2,
  Private = 3,
}

export interface ProjectImageDto {
  id: number;
  isDefault: boolean;
  displayOrder: number;
  url?: string;
}

export interface ProjectImageValue {
  id?: number;
  url?: string;
  resolvedUrl?: SafeUrl;
  /** Populated only for newly staged (not yet uploaded) images. */
  file?: File;
  isDefault: boolean;
  displayOrder: number;
}

export interface ProjectEditFormValue {
  name: string;
  reference: string;
  description: string;
  url: string;
  viewStatus: ProjectViewStatus;
}

export interface ProjectSummaryDto {
  id: string;
  name: string;
  reference?: string;
  status: ProjectStatus;
  viewStatus: ProjectViewStatus;
  createdDate: Date;
  printCount: number;
  totalPrintTimeInSeconds: number;
  totalEstimatedPrintTimeInSeconds: number;
  totalFilamentWeightMg: number;
  defaultImageId: number;
}

export interface ProjectDetailDto {
  id: string;
  name: string;
  reference?: string;
  description?: string;
  url?: string;
  status: ProjectStatus;
  viewStatus: ProjectViewStatus;
  createdDate: Date;
  createdByUserId: number;
  printCount: number;
  totalPrintTimeInSeconds: number;
  totalEstimatedPrintTimeInSeconds: number;
  totalFilamentWeightMg: number;
  images: ProjectImageDto[];
}

export interface AddProjectDto {
  name: string;
  reference?: string;
  description?: string;
  url?: string;
  status: ProjectStatus;
  viewStatus: ProjectViewStatus;
}

export interface PutProjectDto {
  id: string;
  name: string;
  reference?: string;
  description?: string;
  url?: string;
  status: ProjectStatus;
  viewStatus: ProjectViewStatus;
}

export interface GroupedFeedItemDto {
  type: 'project' | 'print';
  sortDate: Date;
  // project fields
  projectId?: string;
  projectName?: string;
  projectReference?: string;
  projectStatus?: ProjectStatus;
  /** Total prints in this project (unfiltered). */
  printCount?: number;
  /**
   * Prints matching current filters. Null when no filters are active.
   */
  filteredPrintCount?: number | null;
  totalPrintTimeInSeconds?: number;
  totalEstimatedPrintTimeInSeconds?: number;
  totalFilamentWeightMg?: number;
  defaultProjectImageId?: number;
  /** Aggregated filament usage across all project prints, grouped by filament ID. */
  filamentUsage?: PrintFilamentSummaryDto[];
  /** Distinct printers used across all project prints. */
  printers?: PrinterSummary[];
  // print fields
  print?: any; // PrintSummary shape
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly baseApi = environment.printLogApiUrl;

  getProjectSummaries(
    pageNumber = 1,
    pageSize = 10
  ): Observable<PagedList<ProjectSummaryDto>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);
    return this.http.get<PagedList<ProjectSummaryDto>>(
      `${this.baseApi}/api/Projects`,
      { params }
    );
  }

  getProjectById(id: string): Observable<ProjectDetailDto> {
    return this.http.get<ProjectDetailDto>(
      `${this.baseApi}/api/Projects/${id}`
    );
  }

  createProject(dto: AddProjectDto): Observable<ProjectDetailDto> {
    return this.http.post<ProjectDetailDto>(
      `${this.baseApi}/api/Projects`,
      dto
    );
  }

  updateProject(id: string, dto: PutProjectDto): Observable<ProjectDetailDto> {
    return this.http.put<ProjectDetailDto>(
      `${this.baseApi}/api/Projects/${id}`,
      dto
    );
  }

  deleteProject(id: string, deletePrints: boolean): Observable<void> {
    const params = new HttpParams().set('deletePrints', deletePrints);
    return this.http.delete<void>(`${this.baseApi}/api/Projects/${id}`, {
      params,
    });
  }

  uploadImage(projectId: string, file: File): Observable<ProjectImageDto> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ProjectImageDto>(
      `${this.baseApi}/api/Projects/${projectId}/images`,
      form
    );
  }

  deleteImage(projectId: string, imageId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseApi}/api/Projects/${projectId}/images/${imageId}`
    );
  }

  reorderImages(
    projectId: string,
    orderedImageIds: number[]
  ): Observable<void> {
    return this.http.put<void>(
      `${this.baseApi}/api/Projects/${projectId}/images/reorder`,
      orderedImageIds
    );
  }

  setDefaultImage(projectId: string, imageId: number): Observable<void> {
    return this.http.post<void>(
      `${this.baseApi}/api/Projects/${projectId}/images/${imageId}/set-as-default`,
      {}
    );
  }

  getGroupedFeed(
    pageNumber = 1,
    pageSize = 20,
    searchText = '',
    filterByStatus: PrintStatus | null = null,
    filterByPrinterIds: number[] = [],
    filterByFilamentIds: string[] = [],
    sortColumn: PrintSummarySortColumn = PrintSummarySortColumn.StartDate,
    sortDirection: SortDirection = SortDirection.Desc
  ): Observable<PagedList<GroupedFeedItemDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize)
      .set('sortRequest.SortColumn', sortColumn)
      .set('sortRequest.SortDirection', sortDirection);

    if (searchText) {
      params = params.set('searchText', searchText);
    }
    if (filterByStatus !== null && filterByStatus >= 0) {
      params = params.set('filterByStatus', filterByStatus.toString());
    }
    for (const id of filterByPrinterIds) {
      params = params.append('filterByPrinterIds', id.toString());
    }
    for (const id of filterByFilamentIds) {
      params = params.append('filterByFilamentIds', id);
    }

    return this.http.get<PagedList<GroupedFeedItemDto>>(
      `${this.baseApi}/api/Prints/grouped`,
      { params }
    );
  }
}
