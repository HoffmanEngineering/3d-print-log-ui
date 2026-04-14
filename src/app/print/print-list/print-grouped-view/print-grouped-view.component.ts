import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import {
  ProjectService,
  GroupedFeedItemDto,
} from 'src/app/core/services/project.service';
import { PagedList } from 'src/app/core/types/paging';
import { MatExpansionModule } from '@angular/material/expansion';
import { ProjectChipComponent } from 'src/app/shared/project-chip/project-chip.component';
import {
  PrintService,
  PrintSummary,
} from 'src/app/core/services/print.service';
import { RouterLink } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  selector: 'app-print-grouped-view',
  templateUrl: './print-grouped-view.component.html',
  styleUrls: ['./print-grouped-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SharedModule, MatExpansionModule, ProjectChipComponent, RouterLink],
})
export class PrintGroupedViewComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly printService = inject(PrintService);

  feed = signal<PagedList<GroupedFeedItemDto> | null>(null);
  loading = signal(true);
  pageNumber = signal(1);
  readonly pageSize = 20;

  expandedProjectPrints = signal<Map<string, PrintSummary[]>>(new Map());
  loadingProjectId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadFeed();
  }

  loadFeed(): void {
    this.loading.set(true);
    this.projectService
      .getGroupedFeed(this.pageNumber(), this.pageSize)
      .subscribe({
        next: (result) => {
          this.feed.set(result);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageNumber.set(event.pageIndex + 1);
    this.loadFeed();
  }

  onProjectExpand(projectId: string): void {
    if (this.expandedProjectPrints().has(projectId)) return;
    this.loadingProjectId.set(projectId);
    this.printService
      .getPrintSummaries(
        1,
        100,
        '',
        null,
        [],
        [],
        undefined,
        undefined,
        undefined,
        projectId
      )
      .subscribe((result) => {
        const map = new Map(this.expandedProjectPrints());
        map.set(projectId, result.items);
        this.expandedProjectPrints.set(map);
        this.loadingProjectId.set(null);
      });
  }
}
