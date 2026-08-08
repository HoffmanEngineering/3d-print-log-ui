import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { MetaTagService } from 'src/app/core/services/meta-tag.service';
import { UserSummaryDto } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';
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

    // Meta tags depend on resolved data; run once it is available.
    queueMicrotask(() => this.setMetaTags());

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
    const firstImage = this.printImages()[0];
    const imageUrl = firstImage?.url ?? '';

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
      .subscribe((comment) => print.comments.push(comment));
  }
}
