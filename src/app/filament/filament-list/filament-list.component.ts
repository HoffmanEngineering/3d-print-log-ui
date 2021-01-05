import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { debounce } from 'lodash';
import {
  FilamentService,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { PagedList } from 'src/app/core/types/paging';

@Component({
  selector: 'app-filament-list',
  templateUrl: './filament-list.component.html',
  styleUrls: ['./filament-list.component.scss'],
})
export class FilamentListComponent implements OnInit {
  public filaments: FilamentSummary[] = [];

  public pageSize: number;
  public currentPage: number;
  public totalCount: number;

  public displayedColumns: string[] = [
    'colorHex',
    'displayName',
    'brand',
    'colorName',
    'filamentRemaining',
  ];

  public debouncedUpdateFilter;

  constructor(
    private activatedRoute: ActivatedRoute,
    private filamentService: FilamentService,
    private titleService: Title
  ) {
    this.debouncedUpdateFilter = debounce(() => this.updateFilter(), 400);
  }

  ngOnInit() {
    this.titleService.setTitle('My Filament - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      const pagedResponse: PagedList<FilamentSummary> = data.filamentList;
      this.handlePagedList(pagedResponse);
    });
  }

  public pageChange(pageEvent: PageEvent) {
    const newPageNumber = pageEvent.pageIndex + 1;
    const newPageSize = pageEvent.pageSize;

    this.filamentService
      .getCurrentUserFilamentSummaries(newPageNumber, newPageSize)
      .subscribe((response) => {
        this.handlePagedList(response);
      });
  }

  public updateFilter() {
    this.filamentService
      .getCurrentUserFilamentSummaries(this.currentPage, this.pageSize)
      .subscribe((response) => {
        this.handlePagedList(response);
      });
  }

  private handlePagedList(response: PagedList<FilamentSummary>) {
    this.filaments = response.items;

    this.currentPage = response.paging.currentPage;
    this.pageSize = response.paging.pageSize;
    this.totalCount = response.paging.totalCount;
  }
}
