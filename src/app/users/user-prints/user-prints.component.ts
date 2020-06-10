import { Component, Input, OnInit } from '@angular/core';
import {
  PrintService,
  PrintSummary,
} from 'src/app/core/services/print.service';

@Component({
  selector: 'app-user-prints',
  templateUrl: './user-prints.component.html',
  styleUrls: ['./user-prints.component.scss'],
})
export class UserPrintsComponent implements OnInit {
  @Input() userId: number;
  @Input() userProfilePictureUrl: string;
  @Input() userName: string;

  public prints: PrintSummary[] = [];

  public pageNumber = 1;
  public PAGE_SIZE = 10;

  public showLoadMore = true;

  constructor(private readonly printService: PrintService) {}

  ngOnInit(): void {
    this.printService
      .getPrintSummaries(
        this.pageNumber,
        this.PAGE_SIZE,
        undefined,
        undefined,
        undefined,
        undefined,
        this.userId
      )
      .subscribe((response) => {
        this.pageNumber = response.paging.currentPage;
        this.prints = [...this.prints, ...response.items];

        this.showLoadMore = this.pageNumber < response.paging.totalPages;
      });
  }

  loadNextPage() {
    this.pageNumber++;

    this.printService
      .getPrintSummaries(
        this.pageNumber,
        this.PAGE_SIZE,
        undefined,
        undefined,
        undefined,
        undefined,
        this.userId
      )
      .subscribe((response) => {
        this.pageNumber = response.paging.currentPage;
        this.prints = [...this.prints, ...response.items];

        this.showLoadMore = this.pageNumber < response.paging.totalPages;
      });
  }
}
