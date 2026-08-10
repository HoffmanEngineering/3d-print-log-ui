import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
import { UserSettingService } from 'src/app/core/services/user-setting.service';

describe('ViewPrintDetailComponent', () => {
  let fixture: ComponentFixture<ViewPrintDetailComponent>;
  let component: ViewPrintDetailComponent;
  let metaService: jasmine.SpyObj<MetaTagService>;
  let printServiceSpy: jasmine.SpyObj<PrintService>;

  const OWNER_ID = 7;

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

  /**
   * @param viewerId  null = anonymous; OWNER_ID = owner; anything else = a
   *                  signed-in stranger, which must see exactly what anonymous sees.
   */
  const routeDataFor = (print: any) => ({
    print: { print, user: print ? { id: OWNER_ID } : null },
    preferredCurrencySymbolSetting: { value: '$' },
    defaultFilamentPriceSetting: null,
    defaultElectricityKwhRateSetting: { value: 0.12 },
    defaultElectricityWattageSetting: { value: 150 },
  });

  const setup = async (
    viewerId: number | null,
    print: any = basePrint,
    // arrivedInApp must be applied BEFORE createComponent: the component reads
    // getCurrentNavigation() once, in its constructor.
    arrivedInApp = false,
    // Pass a subject to drive more than one resolved-data emission, which is
    // what the router does when it reuses this component for another print.
    routeData$: Observable<any> = of(routeDataFor(print))
  ): Promise<void> => {
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
    const userSettingService = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      ['getCurrentUsersSettingByType']
    );
    userSettingService.getCurrentUsersSettingByType.and.returnValue(
      Promise.resolve(null)
    );

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
        { provide: UserSettingService, useValue: userSettingService },
        {
          provide: AuthService,
          useValue: {
            userProfile$: of(viewerId === null ? null : { id: viewerId }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { data: routeData$ },
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
  };

  it('treats the print owner as the owner', async () => {
    await setup(OWNER_ID);
    expect(component.isOwner()).toBe(true);
  });

  it('treats a signed-in stranger exactly like an anonymous visitor', async () => {
    await setup(999);
    expect(component.isOwner()).toBe(false);
  });

  it('treats an anonymous visitor as a non-owner', async () => {
    await setup(null);
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
      await setup(OWNER_ID, printWithOwnerOnlyData);
      expect(railIsOwner()).toBe(true);
    });

    it('passes isOwner=false to the summary for a signed-in stranger', async () => {
      await setup(999, printWithOwnerOnlyData);
      expect(railIsOwner()).toBe(false);
    });

    it('passes isOwner=false to the summary for an anonymous visitor', async () => {
      await setup(null, printWithOwnerOnlyData);
      expect(railIsOwner()).toBe(false);
    });
  });

  it('renders a not-found state when the print is null', async () => {
    await setup(null, null);
    expect(fixture.nativeElement.querySelector('.not-found')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.hero-band')).toBeNull();
  });

  it('does not throw when the print is null', async () => {
    await expectAsync(setup(null, null)).toBeResolved();
  });

  it('makes the page container programmatically focusable', async () => {
    await setup(null);
    expect(
      fixture.nativeElement.querySelector('.page').getAttribute('tabindex')
    ).toBe('-1');
  });

  it('navigates to an in-app fallback when the visitor deep-linked', async () => {
    await setup(null);
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
    await setup(OWNER_ID);
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    component.handleClose();
    expect(navigate).toHaveBeenCalledWith(['/prints']);
  });

  it('goes back when the visitor arrived via in-app navigation', async () => {
    await setup(null, basePrint, /* arrivedInApp */ true);
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
  it('updates metadata on every resolved-data emission, not just the first', async () => {
    const data$ = new BehaviorSubject<any>(routeDataFor(basePrint));
    await setup(null, basePrint, false, data$);
    expect(metaService.setTitle).toHaveBeenCalledWith(
      'Test Print - 3D Print Log'
    );

    data$.next(routeDataFor({ ...basePrint, id: 2, title: 'Second Print' }));
    fixture.detectChanges();

    expect(metaService.setTitle).toHaveBeenCalledWith(
      'Second Print - 3D Print Log'
    );
  });

  // The hero shows the default image; a social preview showing a different one
  // is a mismatch a reader sees before they ever open the page.
  it('uses the default image for the social preview, not the first', async () => {
    await setup(OWNER_ID, {
      ...basePrint,
      images: [
        { id: 1, isDefault: false, displayOrder: 0 },
        { id: 2, isDefault: true, displayOrder: 1 },
      ],
    });

    const imageUrl = metaService.setSocialMediaTags.calls.mostRecent().args[3];
    expect(imageUrl).toContain('/image/2');
  });

  // This component is OnPush and the POST response lands in its own tick with
  // nothing marked dirty, so pushing onto the resolved array did not repaint.
  it('renders a comment that arrives after the initial render', async () => {
    const posted = new Subject<any>();
    await setup(OWNER_ID);
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
    await setup(OWNER_ID, {
      ...basePrint,
      images: [
        { id: 3, isDefault: false, displayOrder: 1 },
        { id: 1, isDefault: true, displayOrder: 0 },
        { id: 2, isDefault: false, displayOrder: 1 },
      ],
    });
    expect(component.printImages().map((i) => i.id)).toEqual([1, 2, 3]);
  });
});
