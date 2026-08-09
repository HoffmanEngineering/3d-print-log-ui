import { Location, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  PLATFORM_ID,
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
import { Observable, of } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';
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
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { PrintCommentsComponent } from '../print-comments/print-comments.component';
import { PrintDetailLoaderService } from '../services/print-detail-loader.service';
import { PrintDetailHeroComponent } from './print-detail-hero/print-detail-hero.component';
import { PrintDetailSummaryComponent } from './print-detail-summary/print-detail-summary.component';
import { PrintImageValue } from './print-image-value.model';

export { PrintImageValue } from './print-image-value.model';

interface PrintDetailState {
  print: PrintDetail | null;
  user: UserSummaryDto | null;
  loading: boolean;
}

const INITIAL_STATE: PrintDetailState = {
  print: null,
  user: null,
  loading: true,
};

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
    SkeletonComponent,
  ],
})
export class ViewPrintDetailComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly printService = inject(PrintService);
  private readonly printDetailLoader = inject(PrintDetailLoaderService);
  private readonly authService = inject(AuthService);
  private readonly metaService = inject(MetaTagService);
  private readonly document = inject(DOCUMENT);
  private readonly location = inject(Location);
  private readonly userSettingService = inject(UserSettingService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * The print is fetched HERE rather than by a route resolver.
   *
   * A resolver holds the previous page fully on screen until it settles, so on a
   * slow connection clicking a print row reads as a dead click. Fetching in the
   * component lets the route activate immediately and paint a skeleton.
   *
   * The route therefore resolves nothing at all, which also removes the #66
   * bounce-to-`/` failure mode from this page by construction: with no resolver
   * there is nothing left that can cancel the navigation. The loader still never
   * errors (see PrintDetailLoaderService), because an error here would leave the
   * page stuck on the skeleton forever.
   *
   * `startWith` is inside the `switchMap` on purpose: the router reuses this
   * component between two print ids, and each new id must go back to the loading
   * state rather than showing the previous print's content.
   */
  private readonly state = toSignal(
    this.activatedRoute.paramMap.pipe(
      map((params) => Number(params.get('id'))),
      distinctUntilChanged(),
      switchMap((printId): Observable<PrintDetailState> => {
        if (!Number.isInteger(printId)) {
          return of({ print: null, user: null, loading: false });
        }
        return this.printDetailLoader.load(printId).pipe(
          map(({ print, user }) => ({ print, user, loading: false })),
          startWith(INITIAL_STATE)
        );
      })
    ),
    { initialValue: INITIAL_STATE }
  );

  private readonly currentUser = toSignal(this.authService.userProfile$, {
    initialValue: null,
  });

  private readonly pageRoot = viewChild<ElementRef<HTMLElement>>('pageRoot');

  readonly print = computed<PrintDetail | null>(() => this.state().print);
  readonly user = computed<UserSummaryDto | null>(() => this.state().user);

  /** True while the print request is in flight — the skeleton is on screen. */
  readonly loading = computed(() => this.state().loading);

  readonly notFound = computed(() => !this.loading() && !this.print());

  /*
   * Keyed off createdByUserId, which is on the print payload — not off the
   * separately-loaded user, which is null when getUserSummary fails.
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
   * Comments live in a writable signal rather than being mutated on the fetched
   * print. This component is OnPush, and the POST response arrives in its own
   * tick with nothing marked dirty, so a mutation there would not repaint.
   * linkedSignal also resets the list when the router reuses this component for
   * a different print.
   */
  readonly comments = linkedSignal<Comment[]>(
    () => this.print()?.comments ?? []
  );

  /**
   * Placeholder rows for the spec rail. Five is roughly what the loaded rail
   * shows above the fold, so the shell is the right height and the real content
   * does not shove the page around when it arrives.
   */
  protected readonly skeletonRailRows = [0, 1, 2, 3, 4];

  readonly preferredFilamentUnit = signal<PrintFilamentSourceMeasurement>(
    PrintFilamentSourceMeasurement.AsRecorded
  );

  /*
   * These four used to be route resolvers. They are loaded here for the same
   * reason as the print: a resolver blocks the route activation the skeleton is
   * meant to replace. UserSettingService caches the whole settings payload
   * behind a single in-flight request, so asking for five settings is still one
   * HTTP call.
   *
   * Every one of them stays null-tolerant. For a logged-out visitor the auth
   * interceptor rejects before any request is dispatched, so `null` is the
   * normal anonymous outcome, not an error path.
   */
  readonly currencySymbol = signal<string>('$');
  readonly defaultFilamentPrice = signal<string | null>(null);
  readonly kwhRate = signal<string | null>(null);
  readonly defaultWattage = signal<string | null>(null);

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
    this.loadSettings();

    // Re-runs on every print change, not just the first. The router reuses this
    // component when navigating between two print ids, so a constructor-only
    // call left the title, canonical URL, description, and preview image
    // describing the previous print.
    effect(() => this.setMetaTags());

    // Move focus to the page container once content is rendered, so keyboard
    // users are not stranded on <body> after a route change. The container is
    // the skeleton shell too, so this no longer waits on the fetch.
    afterNextRender(() => this.pageRoot()?.nativeElement?.focus());
  }

  private loadSettings(): void {
    const read = (type: UserSettingType) =>
      this.userSettingService
        .getCurrentUsersSettingByType(type)
        .catch(() => null);

    read(UserSettingType.Prints_PreferredFilamentDisplayUnit).then(
      (setting) => {
        if (setting) {
          this.preferredFilamentUnit.set(
            +setting.value as PrintFilamentSourceMeasurement
          );
        }
      }
    );
    read(UserSettingType.Currency_Symbol).then((setting) => {
      if (setting?.value) {
        this.currencySymbol.set(setting.value);
      }
    });
    read(UserSettingType.Filaments_DefaultPrice).then((setting) =>
      this.defaultFilamentPrice.set(setting?.value ?? null)
    );
    read(UserSettingType.Electricity_KwhRate).then((setting) =>
      this.kwhRate.set(setting?.value ?? null)
    );
    read(UserSettingType.Electricity_DefaultWattageW).then((setting) =>
      this.defaultWattage.set(setting?.value ?? null)
    );
  }

  private setMetaTags(): void {
    const print = this.print();
    if (!print) {
      // The router reuses this component between print ids, so returning here
      // unconditionally left the PREVIOUS print's title on a page now showing
      // "Print not found". Only the title is reset: the social tags matter to
      // crawlers, which read the initially-served document and never perform
      // the in-app navigation that could make them stale.
      if (this.notFound()) {
        this.metaService.setTitle('Print not found - 3D Print Log');
      }
      return;
    }
    this.metaService.setTitle(`${print.title} - 3D Print Log`);

    // location.origin and Intl's locale lookup are browser-only. This route is
    // client-rendered today, but a component that reads them unguarded crashes
    // the prerender the moment that changes, and that failure only surfaces in
    // the production build.
    if (!this.isBrowser) {
      return;
    }

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
