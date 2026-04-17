import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { concat, forkJoin, of } from 'rxjs';
import { mergeMap, take, toArray } from 'rxjs/operators';
import {
  ProjectService,
  ProjectDetailDto,
  ProjectImageDto,
  ProjectImageValue,
  ProjectEditFormValue,
  ProjectStatus,
  ProjectViewStatus,
  PutProjectDto,
} from 'src/app/core/services/project.service';
import {
  PrintService,
  PrintSummary,
} from 'src/app/core/services/print.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ProjectEditFormComponent } from './project-edit-form/project-edit-form.component';
import { environment } from 'src/environments/environment';

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
    ProjectEditFormComponent,
  ],
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly printService = inject(PrintService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly titleService = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loggingService = inject(LoggingService);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  project = signal<ProjectDetailDto | null>(null);
  prints = signal<PrintSummary[]>([]);
  loading = signal(true);
  isEditing = signal(false);
  isSaving = signal(false);
  images = signal<ProjectImageValue[]>([]);
  selectedImageIndex = signal(0);

  imageIdsToDelete: number[] = [];
  private defaultImageIdOnLoad: number | null = null;

  private currentUserId = signal<number | null>(null);

  isOwner = computed(() => {
    const p = this.project();
    const uid = this.currentUserId();
    return p !== null && uid !== null && p.createdByUserId === uid;
  });

  carouselImages = computed<ProjectImageValue[]>(() => {
    const p = this.project();
    if (!p || p.images.length === 0) return [];
    return [...p.images]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((img) => ({
        id: img.id,
        url: `${environment.printLogApiUrl}/api/Projects/${p.id}/images/${img.id}`,
        isDefault: img.isDefault,
        displayOrder: img.displayOrder,
      }));
  });

  readonly ProjectStatus = ProjectStatus;
  readonly ProjectViewStatus = ProjectViewStatus;

  ngOnInit(): void {
    this.authService.userProfile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => this.currentUserId.set(user?.id ?? null));

    const id = this.route.snapshot.params['id'];
    this.projectService
      .getProjectById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

  onEditClick(): void {
    const p = this.project()!;
    const sorted = [...p.images].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    this.images.set(
      sorted.map((img) => ({
        id: img.id,
        url: `${environment.printLogApiUrl}/api/Projects/${p.id}/images/${img.id}`,
        isDefault: img.isDefault,
        displayOrder: img.displayOrder,
      }))
    );
    this.defaultImageIdOnLoad = sorted.find((i) => i.isDefault)?.id ?? null;
    this.imageIdsToDelete = [];
    this.selectedImageIndex.set(0);
    this.isEditing.set(true);
    this.loggingService.logEvent('ProjectDetail_EditStarted');
  }

  onCancelEdit(): void {
    this.isEditing.set(false);
    this.images.set([]);
    this.imageIdsToDelete = [];
    this.loggingService.logEvent('ProjectDetail_EditCancelled');
  }

  onSave(_formValue: ProjectEditFormValue): void {
    // implemented in Task 6
  }

  onAddImageClicked(): void {
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const url = URL.createObjectURL(file);
    const newImage: ProjectImageValue = {
      file,
      url,
      isDefault: this.images().length === 0,
      displayOrder: this.images().length,
    };
    this.images.update((imgs) => [...imgs, newImage]);
    input.value = '';
    this.loggingService.logEvent('ProjectDetail_ImageUploaded');
  }

  onImageSelected(image: { id?: number; url?: string }): void {
    const list = this.isEditing() ? this.images() : this.carouselImages();
    const idx = list.findIndex(
      (i) => (i.id !== undefined && i.id === image.id) || i.url === image.url
    );
    if (idx >= 0) this.selectedImageIndex.set(idx);
  }

  onImageDeleted(image: { id?: number; url?: string }): void {
    const idx = this.images().findIndex(
      (i) => (i.id !== undefined && i.id === image.id) || i.url === image.url
    );
    if (idx === -1) return;
    const deleted = this.images()[idx];
    if (deleted.id) this.imageIdsToDelete.push(deleted.id);
    const wasDefault = deleted.isDefault;
    this.images.update((imgs) => {
      const updated = imgs
        .filter((_, i) => i !== idx)
        .map((img, i) => ({ ...img, displayOrder: i }));
      if (wasDefault && updated.length > 0) {
        updated[0] = { ...updated[0], isDefault: true };
      }
      return updated;
    });
    this.selectedImageIndex.set(0);
    this.loggingService.logEvent('ProjectDetail_ImageDeleted');
  }

  onDefaultChanged(image: { id?: number; url?: string }): void {
    this.images.update((imgs) =>
      imgs.map((img) => ({
        ...img,
        isDefault:
          (img.id !== undefined && img.id === image.id) ||
          img.url === image.url,
      }))
    );
  }

  onImagesReordered(event: {
    previousIndex: number;
    currentIndex: number;
  }): void {
    this.images.update((imgs) => {
      const reordered = [...imgs];
      moveItemInArray(reordered, event.previousIndex, event.currentIndex);
      return reordered.map((img, i) => ({ ...img, displayOrder: i }));
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
      .subscribe((updated) => this.project.set(updated));
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
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((deleteAll) => {
        if (deleteAll === undefined) return;
        const projectId = this.project()!.id;
        this.projectService
          .deleteProject(projectId, !!deleteAll)
          .pipe(take(1))
          .subscribe(() => this.router.navigate(['/prints']));
      });
  }
}
