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
import { DomSanitizer, SafeUrl, Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
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
  AddProjectDto,
  PutProjectDto,
} from 'src/app/core/services/project.service';
import {
  PrintService,
  PrintSummary,
  PrintStatus,
} from 'src/app/core/services/print.service';
import { PrintCardComponent } from 'src/app/print/print-card/print-card.component';
import { AuthService } from 'src/app/core/services/auth.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ProjectEditFormComponent } from './project-edit-form/project-edit-form.component';
import { ImageCarouselComponent } from 'src/app/shared/image-carousel/image-carousel.component';
import { ImageThumbnailStripComponent } from 'src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    SharedModule,
    ProjectEditFormComponent,
    ImageCarouselComponent,
    ImageThumbnailStripComponent,
    PrintCardComponent,
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
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly resolvedUrls = signal<Map<number, SafeUrl>>(new Map());

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
    const resolved = this.resolvedUrls();
    return [...p.images]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((img) => ({
        id: img.id,
        url: `${environment.printLogApiUrl}/api/Projects/${p.id}/images/${img.id}`,
        resolvedUrl: resolved.get(img.id),
        isDefault: img.isDefault,
        displayOrder: img.displayOrder,
      }));
  });

  readonly ProjectStatus = ProjectStatus;
  readonly ProjectViewStatus = ProjectViewStatus;

  readonly isCreating = computed(() => this.project()?.id === '');

  private emptyProject(): ProjectDetailDto {
    return {
      id: '',
      name: '',
      status: ProjectStatus.InProgress,
      viewStatus: ProjectViewStatus.Private,
      createdDate: new Date(),
      createdByUserId: 0,
      printCount: 0,
      totalPrintTimeInSeconds: 0,
      totalEstimatedPrintTimeInSeconds: 0,
      totalFilamentWeightMg: 0,
      images: [],
    };
  }

  ngOnInit(): void {
    this.authService.userProfile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => this.currentUserId.set(user?.id ?? null));

    const id = this.route.snapshot.params['id'];

    if (id === 'new') {
      this.project.set(this.emptyProject());
      this.titleService.setTitle('New Project | 3D Print Log');
      this.loading.set(false);
      this.isEditing.set(true);
    } else {
      this.projectService
        .getProjectById(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (p) => {
            this.project.set(p);
            this.titleService.setTitle(`${p.name} | 3D Print Log`);
            this.loading.set(false);
            this.loadPrints(id);
            this.preloadImages(
              id,
              p.images.map((i) => i.id)
            );
          },
          error: () => {
            this.loading.set(false);
            this.router.navigate(['/prints']);
          },
        });
    }
  }

  private preloadImages(projectId: string, imageIds: number[]): void {
    const cached = this.resolvedUrls();
    imageIds
      .filter((id) => !cached.has(id))
      .forEach((imageId) => {
        const url = `${environment.printLogApiUrl}/api/Projects/${projectId}/images/${imageId}`;
        this.http
          .get(url, { responseType: 'blob' })
          .pipe(take(1), takeUntilDestroyed(this.destroyRef))
          .subscribe((blob) => {
            const safeUrl = this.sanitizer.bypassSecurityTrustUrl(
              URL.createObjectURL(blob)
            );
            this.resolvedUrls.update((m) => new Map(m).set(imageId, safeUrl));
          });
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

  onPrintDeleted(print: PrintSummary): void {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '350px',
    });
    dialogRef.componentInstance.title = 'Delete?';
    dialogRef.componentInstance.body = `Are you sure you want to delete print "${print.title}"?<br /><br />This action cannot be undone.`;
    dialogRef.componentInstance.yesText = 'Delete';
    dialogRef.componentInstance.yesColor = 'warn';
    dialogRef.componentInstance.noText = 'Cancel';
    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((shouldDelete) => {
        if (shouldDelete) {
          this.printService
            .deletePrint(print.id)
            .pipe(take(1))
            .subscribe(() => {
              this.loadPrints(this.project()!.id);
            });
        }
      });
  }

  onPrintStatusChanged(event: { id: number; status: PrintStatus }): void {
    this.printService
      .updatePrintStatus(event.id, event.status)
      .pipe(take(1))
      .subscribe(() => {
        this.loadPrints(this.project()!.id);
      });
  }

  onEditClick(): void {
    const p = this.project()!;
    const sorted = [...p.images].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    const resolved = this.resolvedUrls();
    this.images.set(
      sorted.map((img) => ({
        id: img.id,
        url: `${environment.printLogApiUrl}/api/Projects/${p.id}/images/${img.id}`,
        resolvedUrl: resolved.get(img.id),
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
    if (this.isCreating()) {
      this.router.navigate(['/prints']);
      return;
    }
    this.isEditing.set(false);
    this.images.set([]);
    this.imageIdsToDelete = [];
    this.loggingService.logEvent('ProjectDetail_EditCancelled');
  }

  onSave(formValue: ProjectEditFormValue): void {
    if (this.isCreating()) {
      this.onCreate(formValue);
    } else {
      this.onUpdate(formValue);
    }
  }

  private onCreate(formValue: ProjectEditFormValue): void {
    const dto: AddProjectDto = {
      name: formValue.name,
      reference: formValue.reference || undefined,
      description: formValue.description || undefined,
      url: formValue.url || undefined,
      status: ProjectStatus.InProgress,
      viewStatus: formValue.viewStatus,
    };

    const stagedImages = [...this.images()].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );

    this.isSaving.set(true);
    let createdId: string;
    let uploadedIds: number[] = [];

    this.projectService
      .createProject(dto)
      .pipe(
        mergeMap((created) => {
          createdId = created.id;
          return stagedImages.length === 0
            ? of([] as ProjectImageDto[])
            : concat(
                ...stagedImages.map((img) =>
                  this.projectService.uploadImage(createdId, img.file!)
                )
              ).pipe(toArray());
        }),
        mergeMap((uploadResults: ProjectImageDto[]) => {
          uploadedIds = uploadResults.map((r) => r.id);
          const defaultImage = stagedImages.find((img) => img.isDefault);
          if (!defaultImage) return of(null);
          const defaultIdx = stagedImages.indexOf(defaultImage);
          const defaultId = uploadedIds[defaultIdx];
          return defaultId
            ? this.projectService.setDefaultImage(createdId, defaultId)
            : of(null);
        }),
        mergeMap(() =>
          uploadedIds.length === 0
            ? of(null)
            : this.projectService.reorderImages(createdId, uploadedIds)
        ),
        mergeMap(() => this.projectService.getProjectById(createdId)),
        take(1)
      )
      .subscribe({
        next: (updated) => {
          this.project.set(updated);
          this.isEditing.set(false);
          this.isSaving.set(false);
          this.images.set([]);
          this.imageIdsToDelete = [];
          this.preloadImages(
            updated.id,
            updated.images.map((i) => i.id)
          );
          this.loggingService.logEvent('ProjectDetail_Created', {
            hasImages: stagedImages.length > 0,
          });
          this.router.navigate(['/projects', updated.id], { replaceUrl: true });
        },
        error: () => {
          this.isSaving.set(false);
        },
      });
  }

  private onUpdate(formValue: ProjectEditFormValue): void {
    const p = this.project()!;
    const dto: PutProjectDto = {
      id: p.id,
      name: formValue.name,
      reference: formValue.reference || undefined,
      description: formValue.description || undefined,
      url: formValue.url || undefined,
      status: p.status,
      viewStatus: formValue.viewStatus,
    };

    const snapshot = this.images();
    const newImages = snapshot
      .filter((img) => !img.id)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const existingImages = snapshot.filter((img) => !!img.id);
    const defaultImage = snapshot.find((img) => img.isDefault);
    const idsToDelete = [...this.imageIdsToDelete];

    this.isSaving.set(true);

    let uploadedIds: number[] = [];

    const upload$ =
      newImages.length === 0
        ? of([] as ProjectImageDto[])
        : concat(
            ...newImages.map((img) =>
              this.projectService.uploadImage(p.id, img.file!)
            )
          ).pipe(toArray());

    this.projectService
      .updateProject(p.id, dto)
      .pipe(
        mergeMap(() => upload$),
        mergeMap((uploadResults: ProjectImageDto[]) => {
          uploadedIds = uploadResults.map((r) => r.id);

          let defaultId: number | null = defaultImage?.id ?? null;
          if (!defaultId) {
            const newDefaultIdx = newImages.findIndex((img) => img.isDefault);
            if (newDefaultIdx >= 0)
              defaultId = uploadedIds[newDefaultIdx] ?? null;
          }
          const defaultChanged =
            defaultId !== null && defaultId !== this.defaultImageIdOnLoad;

          return defaultChanged && defaultId
            ? this.projectService.setDefaultImage(p.id, defaultId)
            : of(null);
        }),
        mergeMap(() =>
          idsToDelete.length === 0
            ? of(null)
            : forkJoin(
                idsToDelete.map((id) =>
                  this.projectService.deleteImage(p.id, id)
                )
              )
        ),
        mergeMap(() => {
          const existingOrdered = existingImages
            .filter((img) => !idsToDelete.includes(img.id!))
            .map((img) => ({ id: img.id!, displayOrder: img.displayOrder }));

          const newOrdered = newImages
            .map((img, i) => ({
              id: uploadedIds[i],
              displayOrder: img.displayOrder,
            }))
            .filter((x) => x.id !== undefined) as {
            id: number;
            displayOrder: number;
          }[];

          const orderedIds = [...existingOrdered, ...newOrdered]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((x) => x.id);

          return orderedIds.length === 0
            ? of(null)
            : this.projectService.reorderImages(p.id, orderedIds);
        }),
        mergeMap(() => this.projectService.getProjectById(p.id)),
        take(1)
      )
      .subscribe({
        next: (updated) => {
          this.project.set(updated);
          this.isEditing.set(false);
          this.isSaving.set(false);
          this.images.set([]);
          this.imageIdsToDelete = [];
          this.preloadImages(
            p.id,
            updated.images.map((i) => i.id)
          );
          this.loggingService.logEvent('ProjectDetail_Saved', {
            hasNewImages: newImages.length > 0,
            deletedImageCount: idsToDelete.length,
            reordered: snapshot.length > 1,
          });
        },
        error: () => {
          this.isSaving.set(false);
        },
      });
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
      resolvedUrl: this.sanitizer.bypassSecurityTrustUrl(url),
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
