import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  input,
  output,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import {
  debounceTime,
  distinctUntilChanged,
  startWith,
  switchMap,
} from 'rxjs/operators';
import {
  ProjectService,
  ProjectSummaryDto,
  ProjectStatus,
} from 'src/app/core/services/project.service';

export type ProjectSelection =
  | {
      type: 'existing';
      projectId: string;
      projectName: string;
      projectStatus?: ProjectStatus;
    }
  | { type: 'new'; newProjectName: string };

@Component({
  selector: 'app-project-selector',
  templateUrl: './project-selector.component.html',
  styleUrls: ['./project-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
})
export class ProjectSelectorComponent implements OnInit {
  initialProjectId = input<string | null>(null);
  initialProjectName = input<string | null>(null);

  projectSelected = output<ProjectSelection | null>();

  private readonly projectService = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ProjectStatus = ProjectStatus;

  searchControl = new FormControl<string>('');
  filteredProjects = signal<ProjectSummaryDto[]>([]);
  selectedProject = signal<ProjectSelection | null>(null);
  showNewOption = signal(false);
  isDefaultView = signal(true);

  ngOnInit(): void {
    if (this.initialProjectId() && this.initialProjectName()) {
      this.searchControl.setValue(this.initialProjectName()!, {
        emitEvent: false,
      });
    }

    this.searchControl.valueChanges
      .pipe(
        startWith(this.searchControl.value ?? ''),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((value) => {
          const q = (value ?? '').trim();
          if (q.length === 0) {
            this.isDefaultView.set(true);
            return this.projectService.getProjectSummaries(1, 25, {
              status: ProjectStatus.InProgress,
              sortBy: 'updatedDate',
            });
          }
          this.isDefaultView.set(false);
          return this.projectService.getProjectSummaries(1, 25, { search: q });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        this.filteredProjects.set(result.items);
        const q = (this.searchControl.value ?? '').trim().toLowerCase();
        this.showNewOption.set(
          q.length > 0 && !result.items.some((p) => p.name.toLowerCase() === q)
        );
      });
  }

  selectExistingProject(project: ProjectSummaryDto): void {
    const selection: ProjectSelection = {
      type: 'existing',
      projectId: project.id,
      projectName: project.name,
      projectStatus: project.status,
    };
    this.selectedProject.set(selection);
    this.searchControl.setValue(project.name, { emitEvent: false });
    this.projectSelected.emit(selection);
  }

  selectNewProject(name: string): void {
    const selection: ProjectSelection = {
      type: 'new',
      newProjectName: name.trim(),
    };
    this.selectedProject.set(selection);
    this.projectSelected.emit(selection);
  }

  clearProject(): void {
    this.selectedProject.set(null);
    this.searchControl.setValue('');
    this.projectSelected.emit(null);
  }

  getStatusLabel(status: ProjectStatus): string {
    switch (status) {
      case ProjectStatus.Complete:
        return 'Complete';
      case ProjectStatus.OnHold:
        return 'On Hold';
      case ProjectStatus.Cancelled:
        return 'Cancelled';
      default:
        return '';
    }
  }

  displayFn(name: string): string {
    return name ?? '';
  }
}
