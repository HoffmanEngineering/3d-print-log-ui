import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
  output,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
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
      projectStatus: ProjectStatus;
    }
  | { type: 'new'; newProjectName: string };

@Component({
  selector: 'app-project-selector',
  templateUrl: './project-selector.component.html',
  styleUrls: ['./project-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
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

  searchControl = new FormControl<string>('');
  allProjects = signal<ProjectSummaryDto[]>([]);
  filteredProjects = signal<ProjectSummaryDto[]>([]);
  selectedProject = signal<ProjectSelection | null>(null);
  showNewOption = signal(false);

  ngOnInit(): void {
    this.projectService.getProjectSummaries(1, 100).subscribe((result) => {
      this.allProjects.set(result.items);
    });

    if (this.initialProjectId() && this.initialProjectName()) {
      this.searchControl.setValue(this.initialProjectName()!);
    }

    this.searchControl.valueChanges
      .pipe(startWith(''), debounceTime(150), distinctUntilChanged())
      .subscribe((value) => this.filterProjects(value ?? ''));
  }

  filterProjects(query: string): void {
    const q = query.toLowerCase().trim();
    const filtered = this.allProjects().filter((p) =>
      p.name.toLowerCase().includes(q)
    );
    this.filteredProjects.set(filtered);
    this.showNewOption.set(
      q.length > 0 && !filtered.some((p) => p.name.toLowerCase() === q)
    );
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
    this.searchControl.setValue('', { emitEvent: false });
    this.projectSelected.emit(null);
  }

  displayFn(name: string): string {
    return name ?? '';
  }
}
