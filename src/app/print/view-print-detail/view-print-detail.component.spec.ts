import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  convertToParamMap,
} from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import currency from 'currency.js';
import { ToastrService } from 'ngx-toastr';
import { AdsenseModule } from 'ng2-adsense';
import { ViewPrintDetailComponent } from './view-print-detail.component';
import { PrintDetailSummaryComponent } from './print-detail-summary/print-detail-summary.component';
import { PrintService, PrintStatus } from 'src/app/core/services/print.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { MetaTagService } from 'src/app/core/services/meta-tag.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';
import {
  PrintDetailLoaderService,
  PrintDetailWithUser,
} from '../services/print-detail-loader.service';
import { PushPermissionPromptService } from 'src/app/core/services/push-permission-prompt.service';
import {
  DEFERRED_SKELETON_DELAY_MS,
  DEFERRED_SKELETON_MIN_VISIBLE_MS,
} from 'src/app/shared/skeleton/deferred-skeleton';

describe('ViewPrintDetailComponent', () => {
  let fixture: ComponentFixture<ViewPrintDetailComponent>;
  let component: ViewPrintDetailComponent;
  let metaService: jasmine.SpyObj<MetaTagService>;
  let printServiceSpy: jasmine.SpyObj<PrintService>;
  let loaderSpy: jasmine.SpyObj<PrintDetailLoaderService>;
  let userSettingServiceSpy: jasmine.SpyObj<UserSettingService>;

  const OWNER_ID = 7;

  let pushPromptSpy: jasmine.SpyObj<PushPermissionPromptService>;

  const basePrint = {
    id: 1,
    title: 'Test Print',
    status: PrintStatus.Success,
    startDate: new Date('2026-03-14T00:00:00Z'),
    createdByUserId: OWNER_ID,
    printer: { make: 'Prusa', model: 'MK3S', name: '' },
    notes: '',
    url: '',
    fileName: '',
    filamentUsage: [],
    images: [],
    comments: [],
    allowComments: true,
  } as any;

  const paramMapFor = (id: string | number): ParamMap =>
    convertToParamMap({ id: `${id}` });

  /**
   * The skeleton is deferred, so "still loading" is no longer observable the
   * instant the component is created — that is the whole point of the change.
   * These waits are real time rather than `tick()` because `setup` awaits
   * `compileComponents`, which cannot run inside `fakeAsync`.
   */
  const waitPastSkeletonDelay = async (): Promise<void> => {
    await new Promise((resolve) =>
      setTimeout(resolve, DEFERRED_SKELETON_DELAY_MS + 30)
    );
    fixture.detectChanges();
  };

  const waitPastSkeletonDwell = async (): Promise<void> => {
    await new Promise((resolve) =>
      setTimeout(resolve, DEFERRED_SKELETON_MIN_VISIBLE_MS + 30)
    );
    fixture.detectChanges();
  };

  interface SetupOptions {
    /** null = anonymous; OWNER_ID = owner; anything else = a signed-in stranger. */
    viewerId: number | null;
    print?: any;
    /**
     * Applied BEFORE createComponent: the component reads getCurrentNavigation()
     * once, in its constructor.
     */
    arrivedInApp?: boolean;
    /** Drive more than one emission to simulate the router reusing the component. */
    paramMap$?: Observable<ParamMap>;
    /** Overrides the default "resolve immediately with `print`" loader. */
    load?: (printId: number) => Observable<PrintDetailWithUser>;
    settings?: (type: UserSettingType) => Promise<UserSetting | null>;
  }

  const setup = async (options: SetupOptions): Promise<void> => {
    const {
      viewerId,
      print = basePrint,
      arrivedInApp = false,
      paramMap$ = of(paramMapFor(print?.id ?? 1)),
      load = () =>
        of({ print, user: print ? ({ id: OWNER_ID } as any) : null }),
      settings = () => Promise.resolve(null),
    } = options;

    TestBed.resetTestingModule();

    // calculatePrintCost is required for the same reason as in the rail's spec:
    // the real FilamentUsageSummaryComponent renders inside the rail and calls
    // it per row on the owner path.
    const printService = jasmine.createSpyObj<PrintService>('PrintService', [
      'addPrintComment',
      'calculateElectricityCost',
      'calculateTotalPrintCost',
      'calculatePrintCost',
    ]);
    printService.calculatePrintCost.and.returnValue({
      valid: true,
      price: currency(0.42),
      formattedPrice: '$0.42',
      symbol: '$',
      usesDefaultPrice: false,
    });
    printService.calculateTotalPrintCost.and.returnValue({
      prices: [],
      total: { valid: false, message: 'Cannot calculate total' },
    });
    printService.calculateElectricityCost.and.returnValue({
      valid: false,
      message: 'No rate configured',
    });
    printServiceSpy = printService;
    metaService = jasmine.createSpyObj<MetaTagService>('MetaTagService', [
      'setTitle',
      'setSocialMediaTags',
    ]);
    userSettingServiceSpy = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      ['getCurrentUsersSettingByType']
    );
    userSettingServiceSpy.getCurrentUsersSettingByType.and.callFake(settings);

    loaderSpy = jasmine.createSpyObj<PrintDetailLoaderService>(
      'PrintDetailLoaderService',
      ['load']
    );
    loaderSpy.load.and.callFake(load);

    pushPromptSpy = jasmine.createSpyObj<PushPermissionPromptService>(
      'PushPermissionPromptService',
      ['promptInContext']
    );
    pushPromptSpy.promptInContext.and.resolveTo('default');

    await TestBed.configureTestingModule({
      // No NO_ERRORS_SCHEMA: every child here is a real standalone component
      // pulled in through ViewPrintDetailComponent's own imports, so the schema
      // would suppress nothing while hiding genuine template typos. The HTTP
      // providers exist because app-file-attachment-section fetches on init.
      imports: [
        ViewPrintDetailComponent,
        RouterTestingModule,
        // app-ad and app-sidebar-ad render for real and need the Adsense config.
        AdsenseModule.forRoot({ adClient: 'ca-pub-test' }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PrintService, useValue: printService },
        { provide: PrintDetailLoaderService, useValue: loaderSpy },
        { provide: PushPermissionPromptService, useValue: pushPromptSpy },
        // The real PrintCommentsComponent renders here (no NO_ERRORS_SCHEMA)
        // and injects ToastrService, which needs its own ToastConfig token.
        {
          provide: ToastrService,
          useValue: jasmine.createSpyObj<ToastrService>('ToastrService', [
            'success',
            'error',
          ]),
        },
        { provide: MetaTagService, useValue: metaService },
        { provide: UserSettingService, useValue: userSettingServiceSpy },
        {
          provide: AuthService,
          useValue: {
            userProfile$: of(viewerId === null ? null : { id: viewerId }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMap$ },
        },
      ],
    }).compileComponents();

    if (arrivedInApp) {
      spyOn(TestBed.inject(Router), 'getCurrentNavigation').and.returnValue({
        previousNavigation: { id: 1 },
      } as any);
    }

    fixture = TestBed.createComponent(ViewPrintDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('treats the print owner as the owner', async () => {
    await setup({ viewerId: OWNER_ID });
    expect(component.isOwner()).toBe(true);
  });

  it('treats a signed-in stranger exactly like an anonymous visitor', async () => {
    await setup({ viewerId: 999 });
    expect(component.isOwner()).toBe(false);
  });

  it('treats an anonymous visitor as a non-owner', async () => {
    await setup({ viewerId: null });
    expect(component.isOwner()).toBe(false);
  });

  // The three cases above prove the computed. These prove the parent actually
  // WIRES it to the rail — a correct isOwner() bound to nothing would still
  // leak, so the boolean assertions alone are not sufficient. Asserted through
  // the child's resolved input rather than rendered text, so this test does not
  // duplicate (and drift from) the rail's own DOM assertions.
  describe('ownership is wired through to the rail', () => {
    const printWithOwnerOnlyData = {
      ...basePrint,
      printerId: 42,
      filamentUsage: [
        {
          filament: { id: 'f1', displayName: 'PLA', colors: [] },
          amountMg: 1000,
        },
      ],
    };

    const railIsOwner = (): boolean =>
      fixture.debugElement
        .query(By.directive(PrintDetailSummaryComponent))
        .componentInstance.isOwner();

    it('passes isOwner=true to the summary for the owner', async () => {
      await setup({ viewerId: OWNER_ID, print: printWithOwnerOnlyData });
      expect(railIsOwner()).toBe(true);
    });

    it('passes isOwner=false to the summary for a signed-in stranger', async () => {
      await setup({ viewerId: 999, print: printWithOwnerOnlyData });
      expect(railIsOwner()).toBe(false);
    });

    it('passes isOwner=false to the summary for an anonymous visitor', async () => {
      await setup({ viewerId: null, print: printWithOwnerOnlyData });
      expect(railIsOwner()).toBe(false);
    });
  });

  describe('loading state', () => {
    // The whole point of dropping the resolver: the route activates immediately
    // and the page paints a placeholder instead of leaving the previous page on
    // screen.
    it('renders the skeleton, not the not-found view, while the print loads', async () => {
      await setup({ viewerId: null, load: () => new Subject<any>() });
      await waitPastSkeletonDelay();

      expect(component.loading()).toBe(true);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="print-detail-skeleton"]'
        )
      ).toBeTruthy();
      // A visitor must never see "Print not found" flash before the fetch lands.
      expect(fixture.nativeElement.querySelector('.not-found')).toBeNull();
    });

    // The flash this whole mechanism exists to remove. On a warm connection the
    // loader settles in tens of milliseconds, and a skeleton that appears and
    // vanishes inside two frames reads as a rendering glitch.
    it('never paints a skeleton when the print arrives inside the delay', async () => {
      await setup({ viewerId: null });

      expect(component.loading()).toBe(false);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="print-detail-skeleton"]'
        )
      ).toBeNull();

      // And it must not appear retroactively once the threshold passes.
      await waitPastSkeletonDelay();
      expect(component.loading()).toBe(false);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="print-detail-skeleton"]'
        )
      ).toBeNull();
    });

    // The blank pre-skeleton window must not be mistaken for "no such print".
    it('shows neither skeleton nor not-found in the window before the delay', async () => {
      await setup({ viewerId: null, load: () => new Subject<any>() });

      expect(component.loading()).toBe(false);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="print-detail-skeleton"]'
        )
      ).toBeNull();
      expect(fixture.nativeElement.querySelector('.not-found')).toBeNull();
    });

    // Without a minimum dwell the flash simply moves: a response landing a few
    // milliseconds past the delay would show the skeleton for those few
    // milliseconds, which is worse than either extreme.
    it('holds the skeleton for its minimum dwell once it has appeared', async () => {
      const arrived = new Subject<PrintDetailWithUser>();
      await setup({ viewerId: null, load: () => arrived.asObservable() });
      await waitPastSkeletonDelay();
      expect(component.loading()).toBe(true);

      arrived.next({ print: basePrint, user: null });
      fixture.detectChanges();

      expect(component.loading()).toBe(true);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="print-detail-skeleton"]'
        )
      ).toBeTruthy();

      await waitPastSkeletonDwell();
      expect(component.loading()).toBe(false);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="print-detail-skeleton"]'
        )
      ).toBeNull();
      expect(component.print()).toEqual(basePrint);
    });

    it('announces the pending state once for the whole region', async () => {
      await setup({ viewerId: null, load: () => new Subject<any>() });
      await waitPastSkeletonDelay();

      const region = fixture.nativeElement.querySelector(
        '[data-testid="print-detail-skeleton"]'
      );
      expect(region.getAttribute('role')).toBe('status');
      expect(region.getAttribute('aria-busy')).toBe('true');
      expect(region.textContent).toContain('Loading print');
      // The grey blocks themselves are decorative.
      expect(
        region.querySelectorAll('app-skeleton:not([aria-hidden="true"])').length
      ).toBe(0);
    });

    it('replaces the skeleton with the print once it arrives', async () => {
      const arrived = new Subject<PrintDetailWithUser>();
      await setup({ viewerId: null, load: () => arrived.asObservable() });

      arrived.next({ print: basePrint, user: null });
      fixture.detectChanges();

      expect(component.loading()).toBe(false);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="print-detail-skeleton"]'
        )
      ).toBeNull();
      expect(fixture.nativeElement.querySelector('.hero-band')).toBeTruthy();
    });

    // The router reuses this component between two print ids. Showing the
    // previous print while the next one loads is worse than a skeleton — but
    // only once the second fetch is slow enough to be worth a skeleton. Below
    // that threshold the outgoing print stays put and is simply replaced, which
    // is what makes a fast id-to-id move look instantaneous instead of blinking.
    it('returns to the skeleton when a slow route change moves to another print', async () => {
      const params$ = new BehaviorSubject<ParamMap>(paramMapFor(1));
      const second = new Subject<PrintDetailWithUser>();
      await setup({
        viewerId: null,
        paramMap$: params$,
        load: (printId) =>
          printId === 1
            ? of({ print: basePrint, user: null })
            : second.asObservable(),
      });
      expect(component.loading()).toBe(false);

      params$.next(paramMapFor(2));
      fixture.detectChanges();

      // Still the outgoing print, deliberately, for the length of the delay.
      expect(component.loading()).toBe(false);
      expect(component.print()).toEqual(basePrint);

      await waitPastSkeletonDelay();

      expect(component.loading()).toBe(true);
      expect(component.print()).toBeNull();
    });

    it('does not refetch when the route emits the same id again', async () => {
      const params$ = new BehaviorSubject<ParamMap>(paramMapFor(1));
      await setup({ viewerId: null, paramMap$: params$ });

      params$.next(paramMapFor(1));
      fixture.detectChanges();

      expect(loaderSpy.load).toHaveBeenCalledTimes(1);
    });
  });

  it('renders a not-found state when the print is null', async () => {
    await setup({ viewerId: null, print: null });
    expect(fixture.nativeElement.querySelector('.not-found')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.hero-band')).toBeNull();
  });

  it('does not throw when the print is null', async () => {
    await expectAsync(setup({ viewerId: null, print: null })).toBeResolved();
  });

  it('makes the page container programmatically focusable', async () => {
    await setup({ viewerId: null });
    expect(
      fixture.nativeElement.querySelector('.page').getAttribute('tabindex')
    ).toBe('-1');
  });

  // The shell — and with it the focus target — must exist before the fetch
  // lands, otherwise a keyboard user is stranded on <body> for the whole wait.
  it('renders the focusable page container while still loading', async () => {
    await setup({ viewerId: null, load: () => new Subject<any>() });
    expect(fixture.nativeElement.querySelector('.page')).toBeTruthy();
  });

  it('navigates to an in-app fallback when the visitor deep-linked', async () => {
    await setup({ viewerId: null });
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate');
    const location = TestBed.inject(Location);
    const back = spyOn(location, 'back');

    // getCurrentNavigation() is null in this harness, matching a deep link.
    component.handleClose();

    expect(back).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('sends the owner to the print list when they deep-linked', async () => {
    await setup({ viewerId: OWNER_ID });
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    component.handleClose();
    expect(navigate).toHaveBeenCalledWith(['/prints']);
  });

  it('goes back when the visitor arrived via in-app navigation', async () => {
    await setup({ viewerId: null, arrivedInApp: true });
    const back = spyOn(TestBed.inject(Location), 'back');
    const navigate = spyOn(TestBed.inject(Router), 'navigate');

    component.handleClose();

    // This is the branch the deep-link tests do NOT cover.
    expect(back).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  // The router reuses this component when navigating from /prints/1 to
  // /prints/2, so metadata computed once in the constructor described the
  // previous print for the whole of the next one.
  it('updates metadata on every print change, not just the first', async () => {
    const params$ = new BehaviorSubject<ParamMap>(paramMapFor(1));
    await setup({
      viewerId: null,
      paramMap$: params$,
      load: (printId) =>
        of({
          print:
            printId === 1
              ? basePrint
              : { ...basePrint, id: 2, title: 'Second Print' },
          user: null,
        }),
    });
    expect(metaService.setTitle).toHaveBeenCalledWith(
      'Test Print - 3D Print Log'
    );

    params$.next(paramMapFor(2));
    fixture.detectChanges();

    expect(metaService.setTitle).toHaveBeenCalledWith(
      'Second Print - 3D Print Log'
    );
  });

  // Reusing the component for a missing print left the previous print's title in
  // the tab while the page said "Print not found".
  it('resets the title when the route moves to a missing print', async () => {
    const params$ = new BehaviorSubject<ParamMap>(paramMapFor(1));
    await setup({
      viewerId: null,
      paramMap$: params$,
      load: (printId) =>
        of({ print: printId === 1 ? basePrint : null, user: null }),
    });
    expect(metaService.setTitle).toHaveBeenCalledWith(
      'Test Print - 3D Print Log'
    );

    params$.next(paramMapFor(2));
    fixture.detectChanges();

    expect(metaService.setTitle).toHaveBeenCalledWith(
      'Print not found - 3D Print Log'
    );
  });

  // Retitling mid-load would flash "not found" in the tab for a print that is
  // about to render perfectly well.
  it('leaves the title alone while the print is still loading', async () => {
    await setup({ viewerId: null, load: () => new Subject<any>() });
    expect(metaService.setTitle).not.toHaveBeenCalled();
  });

  // The hero shows the default image; a social preview showing a different one
  // is a mismatch a reader sees before they ever open the page.
  it('uses the default image for the social preview, not the first', async () => {
    await setup({
      viewerId: OWNER_ID,
      print: {
        ...basePrint,
        images: [
          { id: 1, isDefault: false, displayOrder: 0 },
          { id: 2, isDefault: true, displayOrder: 1 },
        ],
      },
    });

    const imageUrl = metaService.setSocialMediaTags.calls.mostRecent().args[3];
    expect(imageUrl).toContain('/image/2');
  });

  // This component is OnPush and the POST response lands in its own tick with
  // nothing marked dirty, so mutating the fetched array did not repaint.
  it('renders a comment that arrives after the initial render', async () => {
    const posted = new Subject<any>();
    await setup({ viewerId: OWNER_ID });
    printServiceSpy.addPrintComment.and.returnValue(posted.asObservable());

    component.addComment('Nice print');
    posted.next({
      id: 99,
      body: 'Nice print',
      createdBy: { id: OWNER_ID, displayName: 'Owner', profilePicture: '' },
      createdDate: new Date(),
      updatedDate: new Date(),
    });
    fixture.detectChanges();

    expect(component.comments().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Nice print');
  });

  it('sorts images by displayOrder with a stable tiebreak on id', async () => {
    await setup({
      viewerId: OWNER_ID,
      print: {
        ...basePrint,
        images: [
          { id: 3, isDefault: false, displayOrder: 1 },
          { id: 1, isDefault: true, displayOrder: 0 },
          { id: 2, isDefault: false, displayOrder: 1 },
        ],
      },
    });
    expect(component.printImages().map((i) => i.id)).toEqual([1, 2, 3]);
  });

  // These four settings used to be route resolvers. The component now loads
  // them, and every one of them has to survive an anonymous visitor, for whom
  // the settings request never leaves the browser.
  describe('user settings', () => {
    const settingsMap: Partial<Record<UserSettingType, string>> = {
      [UserSettingType.Currency_Symbol]: '£',
      [UserSettingType.Filaments_DefaultPrice]: '19.99',
      [UserSettingType.Electricity_KwhRate]: '0.12',
      [UserSettingType.Electricity_DefaultWattageW]: '150',
    };

    it('feeds the loaded settings to the rail', async () => {
      await setup({
        viewerId: OWNER_ID,
        settings: (type) =>
          Promise.resolve(
            settingsMap[type] ? ({ value: settingsMap[type] } as any) : null
          ),
      });

      expect(component.currencySymbol()).toBe('£');
      expect(component.defaultFilamentPrice()).toBe('19.99');
      expect(component.kwhRate()).toBe('0.12');
      expect(component.defaultWattage()).toBe('150');
    });

    it('falls back to defaults when no settings exist', async () => {
      await setup({ viewerId: null });

      expect(component.currencySymbol()).toBe('$');
      expect(component.defaultFilamentPrice()).toBeNull();
      expect(component.kwhRate()).toBeNull();
      expect(component.defaultWattage()).toBeNull();
    });

    // A settings failure on a PUBLIC route must degrade, never break the page.
    it('still renders the print when every settings lookup rejects', async () => {
      await setup({
        viewerId: null,
        settings: () => Promise.reject(new Error('500')),
      });

      expect(fixture.nativeElement.querySelector('.hero-band')).toBeTruthy();
      expect(component.currencySymbol()).toBe('$');
    });
  });

  /**
   * The only in-context trigger before this was creating an API key, which no existing user
   * hits again — their keys predate push entirely, so Settings was their only route to
   * enabling notifications. A running print is the moment the value needs no explaining,
   * and every active user reaches it.
   */
  describe('notification prompt', () => {
    const runningPrint = { ...basePrint, status: PrintStatus.Printing };

    it('prompts the owner while their print is still running', async () => {
      await setup({ viewerId: OWNER_ID, print: runningPrint });

      expect(pushPromptSpy.promptInContext).toHaveBeenCalled();
    });

    it('does not prompt once the print has finished', async () => {
      await setup({ viewerId: OWNER_ID, print: basePrint });

      expect(pushPromptSpy.promptInContext).not.toHaveBeenCalled();
    });

    /** A stranger cannot be notified about someone else's print, so asking is nonsense. */
    it('does not prompt a signed-in stranger', async () => {
      await setup({ viewerId: 999, print: runningPrint });

      expect(pushPromptSpy.promptInContext).not.toHaveBeenCalled();
    });

    it('does not prompt an anonymous visitor', async () => {
      await setup({ viewerId: null, print: runningPrint });

      expect(pushPromptSpy.promptInContext).not.toHaveBeenCalled();
    });

    /**
     * The effect re-runs on signal changes and the router reuses this component between
     * print ids, so without a latch a single visit could ask more than once.
     */
    it('prompts only once for a given view', async () => {
      await setup({ viewerId: OWNER_ID, print: runningPrint });
      fixture.detectChanges();
      fixture.detectChanges();

      expect(pushPromptSpy.promptInContext).toHaveBeenCalledTimes(1);
    });
  });
});
