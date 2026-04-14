import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule, DatePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import {
  ProjectService,
  ProjectDetailDto,
  ProjectStatus,
  ProjectViewStatus,
  PutProjectDto,
} from 'src/app/core/services/project.service';
import {
  PrintService,
  PrintSummary,
} from 'src/app/core/services/print.service';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    SharedModule,
  ],
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly printService = inject(PrintService);
  private readonly dialog = inject(MatDialog);
  private readonly titleService = inject(Title);

  project = signal<ProjectDetailDto | null>(null);
  prints = signal<PrintSummary[]>([]);
  loading = signal(true);

  readonly ProjectStatus = ProjectStatus;
  readonly ProjectViewStatus = ProjectViewStatus;

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.projectService.getProjectById(id).subscribe({
      next: (p) => {
        this.project.set(p);
        this.titleService.setTitle(`${p.name} | 3D Print Log`);
        this.loading.set(false);
        this.loadPrints(id);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/prints']);
      },
    });
  }

  loadPrints(projectId: string): void {
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
      .pipe(take(1))
      .subscribe((result) => this.prints.set(result.items));
  }

  onDeleteProject(): void {
    const ref = this.dialog.open(SimpleDialogComponent, {
      data: {
        title: 'Delete Project',
        message: 'What would you like to do with the prints in this project?',
        confirmText: 'Delete project and all prints',
        cancelText: 'Remove project only — keep prints',
      },
    });
    ref.afterClosed().subscribe((deleteAll) => {
      if (deleteAll === undefined) return;
      const projectId = this.project()!.id;
      this.projectService
        .deleteProject(projectId, !!deleteAll)
        .pipe(take(1))
        .subscribe(() => this.router.navigate(['/prints']));
    });
  }

  onStatusChange(status: ProjectStatus): void {
    const p = this.project()!;
    const dto: PutProjectDto = {
      id: p.id,
      name: p.name,
      reference: p.reference,
      description: p.description,
      url: p.url,
      status,
      viewStatus: p.viewStatus,
    };
    this.projectService
      .updateProject(p.id, dto)
      .pipe(take(1))
      .subscribe((updated) => {
        this.project.set(updated);
      });
  }
}
