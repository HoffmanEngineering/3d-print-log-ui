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

import { Subject, merge, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { PagedList } from 'src/app/core/types/paging';
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
  /** True when the last lookup failed, so the empty list has an explanation. */
  loadFailed = signal(false);

  /**
   * Re-runs the current search on demand. `valueChanges` cannot do this: the retry re-uses
   * the same term, and `distinctUntilChanged` would swallow it.
   */
  private readonly retry$ = new Subject<void>();

  ngOnInit(): void {
    if (this.initialProjectId()) {
      if (this.initialProjectName()) {
        this.applyInitialProject(
          this.initialProjectId()!,
          this.initialProjectName()!
        );
      } else {
        this.projectService
          .getProjectById(this.initialProjectId()!)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (project) => {
              // The print detail payload carries projectId but not projectName, so the name
              // arrives on this round trip — potentially after the user has started typing.
              // Prefilling on top of their keystrokes splices the old name into the new one,
              // which then gets created as a project under that mangled name.
              if (this.searchControl.dirty) return;
              this.applyInitialProject(
                project.id,
                project.name,
                project.status
              );
            },
            // Without this the failure is an unhandled error and the field silently
            // shows no project at all, which reads as "this print has none".
            error: () => this.loadFailed.set(true),
          });
      }
    }

    merge(
      this.searchControl.valueChanges.pipe(
        startWith(this.searchControl.value ?? ''),
        debounceTime(250),
        distinctUntilChanged()
      ),
      this.retry$.pipe(map(() => this.searchControl.value ?? ''))
    )
      .pipe(
        // Clear the previous failure as each new lookup starts, or one bad response
        // leaves the message up for the rest of the dialog's life.
        tap(() => this.loadFailed.set(false)),
        switchMap((value) => {
          const q = (value ?? '').trim();
          const lookup =
            q.length === 0
              ? (this.isDefaultView.set(true),
                this.projectService.getProjectSummaries(1, 25, {
                  status: ProjectStatus.InProgress,
                  sortBy: 'updatedDate',
                }))
              : (this.isDefaultView.set(false),
                this.projectService.getProjectSummaries(1, 25, { search: q }));

          // catchError sits on the INNER observable. On the outer pipe it would
          // terminate the stream and the input would stop searching altogether.
          return lookup.pipe(
            catchError(() => {
              this.loadFailed.set(true);
              return of({
                paging: {
                  currentPage: 1,
                  totalPages: 0,
                  pageSize: 25,
                  totalCount: 0,
                },
                items: [],
              } as PagedList<ProjectSummaryDto>);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        this.filteredProjects.set(result.items);
        const q = (this.searchControl.value ?? '').trim().toLowerCase();
        // "No project matched, so offer to create one" is only true if the lookup
        // actually answered. After a failure the list is empty because the request
        // failed, and offering to create is how you end up with a duplicate of a
        // project that already exists.
        this.showNewOption.set(
          !this.loadFailed() &&
            q.length > 0 &&
            !result.items.some((p) => p.name.toLowerCase() === q)
        );
      });
  }

  private applyInitialProject(
    projectId: string,
    projectName: string,
    projectStatus?: ProjectStatus
  ): void {
    const initial: ProjectSelection = {
      type: 'existing',
      projectId,
      projectName,
      projectStatus,
    };
    this.selectedProject.set(initial);
    this.searchControl.setValue(projectName, { emitEvent: false });
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

  /** Re-runs the lookup that failed, using whatever is currently typed. */
  retry(): void {
    this.retry$.next();
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
