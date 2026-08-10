import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { MetaTagService } from 'src/app/core/services/meta-tag.service';
import { UserSummaryDto } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';
import { Comment } from 'src/app/core/services/comment.service';
import {
  PrintDetail,
  PrintFilamentSourceMeasurement,
  PrintService,
} from '../../core/services/print.service';
import {
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { FileAttachmentSectionComponent } from 'src/app/shared/file-attachment-section/file-attachment-section.component';
import { PrintCommentsComponent } from '../print-comments/print-comments.component';
import { PrintDetailHeroComponent } from './print-detail-hero/print-detail-hero.component';
import { PrintDetailSummaryComponent } from './print-detail-summary/print-detail-summary.component';
import { PrintImageValue } from './print-image-value.model';

export { PrintImageValue } from './print-image-value.model';

@Component({
  selector: 'app-view-print-detail',
  templateUrl: './view-print-detail.component.html',
  styleUrls: ['./view-print-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    SharedModule,
    FileAttachmentSectionComponent,
    PrintCommentsComponent,
    PrintDetailHeroComponent,
    PrintDetailSummaryComponent,
  ],
})
export class ViewPrintDetailComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly printService = inject(PrintService);
  private readonly authService = inject(AuthService);
  private readonly metaService = inject(MetaTagService);
  private readonly document = inject(DOCUMENT);
  private readonly location = inject(Location);
  private readonly userSettingService = inject(UserSettingService);

  private readonly routeData = toSignal(this.activatedRoute.data, {
    initialValue: null as any,
  });

  private readonly currentUser = toSignal(this.authService.userProfile$, {
    initialValue: null,
  });

  private readonly pageRoot = viewChild<ElementRef<HTMLElement>>('pageRoot');

  readonly print = computed<PrintDetail | null>(
    () => this.routeData()?.print?.print ?? null
  );
  readonly user = computed<UserSummaryDto | null>(
    () => this.routeData()?.print?.user ?? null
  );

  readonly notFound = computed(
    () => this.routeData() !== null && !this.print()
  );

  /*
   * Keyed off createdByUserId, which is on the print payload — not off the
   * separately-resolved user, which is null when getUserSummary fails.
   * Not "is logged in": a signed-in stranger sees what an anonymous visitor sees.
   *
   * Ownership reveals ADDITIVELY. userProfile$ is a BehaviorSubject seeded with
   * null that emits synchronously, so there is no reliable "auth has settled"
   * moment to gate on — any such gate would open instantly and gate nothing.
   * isOwner therefore starts false and can only flip to true.
   *
   * That direction is the safe one: owner-only content is never shown and then
   * retracted, so nothing private leaks. Owner-only regions must reserve no
   * layout space while absent, so the reveal adds content rather than shifting
   * what is already on screen.
   */
  readonly isOwner = computed(() => {
    const id = this.currentUser()?.id;
    const ownerId = this.print()?.createdByUserId;
    return id != null && ownerId != null && id === ownerId;
  });

  readonly printImages = computed<PrintImageValue[]>(() => {
    const print = this.print();
    if (!print?.images?.length) {
      return [];
    }
    return (
      print.images
        .map((image) => ({
          id: image.id,
          url: `${environment.printLogApiUrl}/api/Prints/${print.id}/image/${image.id}`,
          file: null as File | null,
          isDefault: image.isDefault,
          displayOrder: image.displayOrder,
        }))
        // Tiebreak on id so duplicate displayOrder values sort deterministically.
        .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
    );
  });

  /**
   * The image the social preview should use, which is the one the hero shows —
   * the default image, not merely the first by displayOrder. Keeping these two
   * in agreement is the whole point of preferring isDefault.
   */
  private readonly socialImage = computed<PrintImageValue | null>(() => {
    const images = this.printImages();
    return images.find((image) => image.isDefault) ?? images[0] ?? null;
  });

  /**
   * Comments live in a writable signal rather than being pushed onto the array
   * inside resolved route data. This component is OnPush, and the POST response
   * arrives in its own tick with nothing marked dirty, so a mutation there
   * would not repaint. linkedSignal also resets the list when the router reuses
   * this component for a different print.
   */
  readonly comments = linkedSignal<Comment[]>(
    () => this.print()?.comments ?? []
  );

  readonly preferredFilamentUnit = signal<PrintFilamentSourceMeasurement>(
    PrintFilamentSourceMeasurement.AsRecorded
  );

  /**
   * Location.back() sends a visitor who arrived via a shared link off-site
   * entirely, which is the primary way this page is reached.
   *
   * Uses the router's own history rather than document.referrer, which reflects
   * the document load and not SPA navigations.
   *
   * Read at construction, which runs during route activation — i.e. while the
   * navigation TO this page is still in flight. getCurrentNavigation() is that
   * in-flight navigation, and its previousNavigation is the one the user came
   * from, or null on a deep link. Do NOT use router.lastSuccessfulNavigation:
   * it is a Signal<Navigation | null> in Angular 21 (so it must be called), and
   * at construction time it refers to the navigation before this one, which
   * makes `.previousNavigation` off by one.
   */
  private readonly arrivedFromInAppNavigation =
    this.router.getCurrentNavigation()?.previousNavigation != null;

  constructor() {
    this.userSettingService
      .getCurrentUsersSettingByType(
        UserSettingType.Prints_PreferredFilamentDisplayUnit
      )
      .then((setting) => {
        if (setting) {
          this.preferredFilamentUnit.set(
            +setting.value as PrintFilamentSourceMeasurement
          );
        }
      })
      .catch(() => {
        // Public route: a settings failure must not break rendering.
      });

    // Re-runs on every resolved-data change, not just the first. The router
    // reuses this component when navigating between two print ids, so a
    // constructor-only call left the title, canonical URL, description, and
    // preview image describing the previous print.
    effect(() => this.setMetaTags());

    // Move focus to the page container once content is rendered, so keyboard
    // users are not stranded on <body> after a route change.
    afterNextRender(() => this.pageRoot()?.nativeElement?.focus());
  }

  private setMetaTags(): void {
    const print = this.print();
    if (!print) {
      return;
    }
    this.metaService.setTitle(`${print.title} - 3D Print Log`);

    const url = `${this.document.location.origin}/prints/${print.id}`;
    const title = `${print.title} | 3D Print Log`;
    const displayName = this.user()?.displayName ?? 'a 3D Print Log user';
    const date = print.startDate
      ? new Intl.DateTimeFormat(navigator.language, {
          dateStyle: 'long',
        }).format(new Date(print.startDate))
      : null;
    const description = date
      ? `${print.title} printed by ${displayName} on ${date}`
      : `${print.title} printed by ${displayName}`;
    const imageUrl = this.socialImage()?.url ?? '';

    this.metaService.setSocialMediaTags(url, title, description, imageUrl);
  }

  protected routeDataValue(key: string): string | null {
    return this.routeData()?.[key]?.value ?? null;
  }

  handleClose(): void {
    if (this.arrivedFromInAppNavigation) {
      this.location.back();
      return;
    }
    this.router.navigate([this.isOwner() ? '/prints' : '/']);
  }

  addComment(newComment: string): void {
    const print = this.print();
    if (!print) {
      return;
    }
    this.printService
      .addPrintComment(print.id, newComment)
      .subscribe((comment) =>
        this.comments.update((list) => [...list, comment])
      );
  }
}
