import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { formatNumber } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl, Title } from '@angular/platform-browser';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import {
  EMPTY,
  Observable,
  concat,
  defer,
  forkJoin,
  of,
  throwError,
} from 'rxjs';
import { catchError, map, mergeMap, take, tap, toArray } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
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
import { todayUtcCivilDate } from 'src/app/core/utils/civil-date';
import { CivilDatePipe } from 'src/app/shared/pipes/civil-date.pipe';
import { LoggingService } from 'src/app/core/services/logging.service';
import { openSimpleDialog } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { AdComponent } from 'src/app/shared/ad/ad.component';
import { SidebarAdComponent } from 'src/app/shared/ad/sidebar-ad.component';
import { DurationPipe } from 'src/app/shared/pipes/duration.pipe';
import { ProjectEditFormComponent } from './project-edit-form/project-edit-form.component';
import { ImageCarouselComponent } from 'src/app/shared/image-carousel/image-carousel.component';
import { ImageThumbnailStripComponent } from 'src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component';
import { environment } from 'src/environments/environment';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { CAN_PURCHASE_PRO } from 'src/app/core/pricing/pro-purchase';
import { withMilliliters } from 'src/app/shared/utils/filament-display.utils';
import { MetaTagService } from 'src/app/core/services/meta-tag.service';
import {
  SEO_PENDING,
  SeoLookupState,
  SeoService,
} from 'src/app/core/services/seo.service';

/**
 * The message to show for a failed project save.
 *
 * The API returns a plain-text 400 for a project whose resolved finish date lands before its
 * start, which the date pickers let a user produce. That message names the actual problem, so
 * it is shown as-is; anything else gets the generic retry copy.
 */
function readSaveError(err: unknown): string {
  if (err instanceof HttpErrorResponse && err.status === 400) {
    const body = typeof err.error === 'string' ? err.error.trim() : '';
    if (body && body.length <= 200) return body;
  }
  return 'This project could not be saved. Please try again.';
}

/**
 * The cap the API named when it refused an upload for the per-project image limit
 * ("Maximum of 5 images per project allowed"), or null for any other failure. An API from
 * before the cap never sends it, so the page's own check is all that applies there.
 */
export function readImageLimitRefusal(err: unknown): number | null {
  if (!(err instanceof HttpErrorResponse) || err.status !== 400) return null;
  const body = typeof err.error === 'string' ? err.error : '';
  const match = /Maximum of (\d+) images per project/i.exec(body);
  return match ? Number(match[1]) : null;
}

/** New images that reached the API, by the staged image they came from. */
interface UploadOutcome {
  uploaded: Map<ProjectImageValue, number>;
  /** The cap the API refused an upload at, or null when every image was uploaded. */
  refusedAtLimit: number | null;
}

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
    AdComponent,
    SidebarAdComponent,
    DurationPipe,
    ProjectEditFormComponent,
    ImageCarouselComponent,
    ImageThumbnailStripComponent,
    PrintCardComponent,
    CivilDatePipe,
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
  private readonly metaTagService = inject(MetaTagService);
  private readonly seoService = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);
  private readonly loggingService = inject(LoggingService);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toastr = inject(ToastrService);
  private readonly subscriptionService = inject(SubscriptionService);
  /** False in the iOS app, where Pro is never sold (#366). */
  private readonly canPurchasePro = inject(CAN_PURCHASE_PRO);

  /** Images allowed on one project, by subscription tier: the same cap as prints and printers. */
  readonly maxImages = this.subscriptionService.maxImages;

  readonly fileInputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  private readonly resolvedUrls = signal<Map<number, SafeUrl>>(new Map());

  readonly project = signal<ProjectDetailDto | null>(null);
  readonly prints = signal<PrintSummary[]>([]);
  readonly loading = signal(true);
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  /**
   * A failed save, shown above the form. The API rejects a project whose resolved
   * finish date lands before its start, which a user can trigger from the date
   * pickers — so a save failure here is an ordinary outcome, not just a network fault,
   * and swallowing it leaves the form open with no explanation.
   */
  readonly saveErrorMessage = signal('');
  readonly images = signal<ProjectImageValue[]>([]);
  readonly selectedImageIndex = signal(0);

  imageIdsToDelete: number[] = [];
  private defaultImageIdOnLoad: number | null = null;

  private readonly currentUserId = computed(
    () => this.authService.userProfile()?.id ?? null
  );

  /** The API's `/seo` answer for this project; never waited on. */
  private readonly seoLookup = signal<SeoLookupState>(SEO_PENDING);

  /**
   * Flips once, when the project first loads, which is when its own title goes up. The /seo
   * answer is applied again then, so it wins whichever of the two arrives first; later saves
   * (which also set the project) leave the tags alone.
   */
  private readonly projectLoaded = computed(() => !!this.project()?.id);

  constructor() {
    effect(() => {
      const seo = this.seoLookup();
      this.projectLoaded();
      untracked(() => {
        if (seo.kind === 'ok') {
          this.metaTagService.applySeoMetadata(seo.seo);
        } else if (seo.kind === 'not-public') {
          // Private, unlisted or missing: an owner viewing their own private project.
          this.metaTagService.preventIndexing();
        } else {
          this.metaTagService.restoreShellRobots();
        }
      });
    });

    // A public project lifts the shell's noindex; the next page, reached in-app, gets it back.
    this.destroyRef.onDestroy(() => this.metaTagService.restoreShellRobots());
  }

  readonly isOwner = computed(() => {
    const p = this.project();
    const uid = this.currentUserId();
    return p !== null && uid !== null && p.createdByUserId === uid;
  });

  readonly carouselImages = computed<ProjectImageValue[]>(() => {
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

  readonly statusLabel = computed(() => {
    switch (this.project()?.status) {
      case ProjectStatus.InProgress:
        return 'In Progress';
      case ProjectStatus.Complete:
        return 'Complete';
      case ProjectStatus.OnHold:
        return 'On Hold';
      case ProjectStatus.Cancelled:
        return 'Cancelled';
      default:
        return '';
    }
  });

  readonly hiddenPrintCount = computed(() => {
    const p = this.project();
    if (!p) return 0;
    return Math.max(0, p.printCount - this.prints().length);
  });

  /**
   * The project's material: grams, with its resin in mL beside them when it has any, or mL
   * alone when it has no grams (3d-print-log-api#294). See withMilliliters.
   */
  materialUsed(p: ProjectDetailDto): string {
    const grams = p.totalFilamentWeightMg / 1000;
    return withMilliliters(
      `${formatNumber(grams, this.locale, '1.0-1')}g`,
      grams,
      p.totalFilamentVolumeMl
    );
  }

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
      // A project being created has no prints yet, so its start date resolves to today.
      // UTC, not local: the API derives it from the row's UTC CreatedDate, so a local
      // reading would preview a different day than the POST response around UTC midnight.
      startDate: todayUtcCivilDate(),
      finishDate: null,
      startDateOverride: null,
      finishDateOverride: null,
    };
  }

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];

    if (id === 'new') {
      this.project.set(this.emptyProject());
      this.titleService.setTitle('New Project | 3D Print Log');
      this.loading.set(false);
      this.isEditing.set(true);
    } else {
      this.seoService
        .forProject(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((lookup) => this.seoLookup.set(lookup));

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
    const anonHeaders = new HttpHeaders().set(
      'allow-anonymous-request',
      'true'
    );
    imageIds
      .filter((id) => !cached.has(id))
      .forEach((imageId) => {
        const url = `${environment.printLogApiUrl}/api/Projects/${projectId}/images/${imageId}`;
        this.http
          .get(url, { responseType: 'blob', headers: anonHeaders })
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
    const ownerId = this.project()?.createdByUserId;
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
        ownerId,
        projectId
      )
      .pipe(take(1))
      .subscribe((result) => this.prints.set(result.items));
  }

  onPrintDeleted(print: PrintSummary): void {
    const dialogRef = openSimpleDialog(
      this.dialog,
      {
        title: 'Delete?',
        body: `Are you sure you want to delete print "${print.title}"?<br /><br />This action cannot be undone.`,
        yesText: 'Delete',
        yesColor: 'warn',
        noText: 'Cancel',
      },
      { maxWidth: '350px' }
    );
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
      startDateOverride: formValue.startDateOverride,
      finishDateOverride: formValue.finishDateOverride,
    };

    const stagedImages = [...this.images()].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );

    this.saveErrorMessage.set('');
    this.isSaving.set(true);
    let createdId: string;
    let uploadedIds: number[] = [];
    let refusedAtLimit: number | null = null;

    this.projectService
      .createProject(dto)
      .pipe(
        mergeMap((created) => {
          createdId = created.id;
          return this.uploadNewImages(createdId, stagedImages);
        }),
        mergeMap((outcome: UploadOutcome) => {
          refusedAtLimit = outcome.refusedAtLimit;
          uploadedIds = stagedImages
            .map((img) => outcome.uploaded.get(img))
            .filter((id): id is number => id !== undefined);
          const defaultImage = stagedImages.find((img) => img.isDefault);
          const defaultId = defaultImage
            ? outcome.uploaded.get(defaultImage)
            : undefined;
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
          if (refusedAtLimit !== null) {
            this.onUploadRefusedAtLimit(refusedAtLimit);
          }
          this.router.navigate(['/projects', updated.id], { replaceUrl: true });
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.saveErrorMessage.set(readSaveError(err));
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
      startDateOverride: formValue.startDateOverride,
      finishDateOverride: formValue.finishDateOverride,
      viewStatus: formValue.viewStatus,
    };

    const snapshot = this.images();
    const newImages = snapshot
      .filter((img) => !img.id)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const existingImages = snapshot.filter((img) => !!img.id);
    const defaultImage = snapshot.find((img) => img.isDefault);
    const idsToDelete = [...this.imageIdsToDelete];

    this.saveErrorMessage.set('');
    this.isSaving.set(true);

    let uploaded = new Map<ProjectImageValue, number>();
    let refusedAtLimit: number | null = null;

    this.projectService
      .updateProject(p.id, dto)
      .pipe(
        // Deletes go first: the API counts a project's images against the cap, so a project
        // at the cap that swaps one image for another must lose the old one before the new
        // one can be added. Each delete is forgotten as soon as it succeeds, so if a later
        // step fails, Save again does not send it a second time (the API would answer 404).
        mergeMap(() =>
          idsToDelete.length === 0
            ? of(null)
            : forkJoin(
                idsToDelete.map((id) =>
                  this.projectService.deleteImage(p.id, id).pipe(
                    tap(() => {
                      this.imageIdsToDelete = this.imageIdsToDelete.filter(
                        (pending) => pending !== id
                      );
                    })
                  )
                )
              )
        ),
        mergeMap(() => this.uploadNewImages(p.id, newImages)),
        mergeMap((outcome: UploadOutcome) => {
          uploaded = outcome.uploaded;
          refusedAtLimit = outcome.refusedAtLimit;

          let defaultId: number | null = defaultImage?.id ?? null;
          if (!defaultId && defaultImage) {
            defaultId = uploaded.get(defaultImage) ?? null;
          }
          const defaultChanged =
            defaultId !== null && defaultId !== this.defaultImageIdOnLoad;

          return defaultChanged && defaultId
            ? this.projectService.setDefaultImage(p.id, defaultId)
            : of(null);
        }),
        mergeMap(() => {
          const existingOrdered = existingImages
            .filter((img) => !idsToDelete.includes(img.id!))
            .map((img) => ({ id: img.id!, displayOrder: img.displayOrder }));

          const newOrdered = newImages
            .map((img) => ({
              id: uploaded.get(img),
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
          if (refusedAtLimit !== null) {
            this.onUploadRefusedAtLimit(refusedAtLimit);
          }
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.saveErrorMessage.set(readSaveError(err));
        },
      });
  }

  /**
   * Uploads staged images one at a time, in order. A refusal for the per-project image cap
   * stops the run (every later upload would be refused too) and is reported in the outcome
   * rather than as an error, so the project and the images that fit are still saved. Any
   * other failure fails the save as before.
   */
  private uploadNewImages(
    projectId: string,
    staged: ProjectImageValue[]
  ): Observable<UploadOutcome> {
    const uploaded = new Map<ProjectImageValue, number>();
    let refusedAtLimit: number | null = null;
    if (staged.length === 0) return of({ uploaded, refusedAtLimit });

    return concat(
      ...staged.map((img) =>
        defer(() =>
          refusedAtLimit !== null
            ? EMPTY
            : this.projectService.uploadImage(projectId, img.file!).pipe(
                tap((dto: ProjectImageDto) => {
                  uploaded.set(img, dto.id);
                  this.recordUploadedImage(img, dto.id);
                }),
                catchError((err: unknown) => {
                  const limit = readImageLimitRefusal(err);
                  if (limit === null) return throwError(() => err);
                  refusedAtLimit = limit;
                  return EMPTY;
                })
              )
        )
      )
    ).pipe(
      toArray(),
      map(() => ({ uploaded, refusedAtLimit }))
    );
  }

  /**
   * A staged image takes its id as soon as it is uploaded, as print photos do, so when a later
   * step fails, Save again treats it as an existing image instead of uploading it again.
   */
  private recordUploadedImage(staged: ProjectImageValue, id: number): void {
    this.images.update((imgs) =>
      imgs.map((img) =>
        img === staged ? { ...img, id, file: undefined } : img
      )
    );
  }

  /** The API held the project to a lower cap than the page showed, most likely after a plan change. */
  private onUploadRefusedAtLimit(limit: number): void {
    this.subscriptionService.loadSubscription();
    this.showImageLimitReached(limit);
  }

  /** The notice the print page gives at the image cap. */
  private showImageLimitReached(limit: number): void {
    if (this.subscriptionService.isPro()) {
      this.toastr.warning(`Maximum ${limit} images allowed`, 'Limit Reached');
      return;
    }
    const message = `Free accounts allow ${limit} images per project.`;
    this.toastr.info(
      this.canPurchasePro ? `${message} Upgrade to Pro for more.` : message,
      'Image Limit Reached'
    );
    this.loggingService.logEvent('ProjectDetail_ImageLimitUpgradePrompt', {
      currentCount: this.images().length,
      maxImages: limit,
    });
  }

  onAddImageClicked(): void {
    this.fileInputRef().nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    input.value = '';

    // A project already past the cap (from before it, or a lapsed Pro plan) has no room.
    const room = Math.max(0, this.maxImages() - this.images().length);
    const accepted = files.slice(0, room);
    if (accepted.length < files.length) {
      this.showImageLimitReached(this.maxImages());
    }
    if (accepted.length === 0) return;

    this.images.update((imgs) => [
      ...imgs,
      ...accepted.map((file, i): ProjectImageValue => {
        const url = URL.createObjectURL(file);
        return {
          file,
          url,
          resolvedUrl: this.sanitizer.bypassSecurityTrustUrl(url),
          isDefault: imgs.length === 0 && i === 0,
          displayOrder: imgs.length + i,
        };
      }),
    ]);
    this.loggingService.logEvent('ProjectDetail_ImageUploaded', {
      count: accepted.length,
    });
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
      // Carried from the current project, not omitted: this endpoint is a full replace, so
      // leaving these out would silently clear a pinned date every time the status dropdown
      // is used.
      startDateOverride: p.startDateOverride,
      finishDateOverride: p.finishDateOverride,
    };
    this.projectService
      .updateProject(p.id, dto)
      .pipe(take(1))
      .subscribe({
        next: (updated) => this.project.set(updated),
        error: () => this.project.set({ ...p }),
      });
  }

  onDeleteProject(): void {
    const p = this.project()!;
    const confirmRef = openSimpleDialog(
      this.dialog,
      {
        title: 'Delete Project',
        body: `Are you sure you want to delete <strong>${p.name}</strong>? This cannot be undone.`,
        yesText: 'Delete Project',
        yesColor: 'warn',
        noText: 'Cancel',
      },
      { maxWidth: '450px' }
    );

    confirmRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (!confirmed) return;

        const printsRef = openSimpleDialog(
          this.dialog,
          {
            title: 'Delete Prints?',
            body: `Do you also want to delete the prints in this project?`,
            yesText: 'Delete prints too',
            yesColor: 'warn',
            noText: 'Keep prints',
          },
          { maxWidth: '450px' }
        );

        printsRef
          .afterClosed()
          .pipe(take(1))
          .subscribe((deleteAll) => {
            const projectId = p.id;
            this.projectService
              .deleteProject(projectId, deleteAll === true)
              .pipe(take(1))
              .subscribe(() => this.router.navigate(['/prints']));
          });
      });
  }
}
