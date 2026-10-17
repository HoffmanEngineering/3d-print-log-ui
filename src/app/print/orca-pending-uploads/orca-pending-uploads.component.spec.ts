import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject, Subject, throwError } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PendingSlicerUploadDto,
  SlicerUploadService,
} from 'src/app/core/services/slicer-upload.service';
import { environment } from 'src/environments/environment';
import {
  AUTO_OPEN_MAX_AGE_MS,
  OrcaPendingUploadsComponent,
  newPrintQueryParams,
  uploadToAutoOpen,
  uploadVersionLabel,
} from './orca-pending-uploads.component';

const INSTALL_ID = '0123456789abcdef0123456789abcdef';

function upload(
  overrides: Partial<PendingSlicerUploadDto> = {}
): PendingSlicerUploadDto {
  return {
    settingId: 'setting-1',
    createdDate: new Date(Date.now() - 60 * 1000).toISOString(),
    printName: 'Benchy',
    fileName: 'benchy.gcode',
    estimatedPrintTimeSeconds: 5400,
    slicerVersion: '2.3.1',
    pluginVersion: 'orca-plugin/0.1.0',
    claimed: false,
    ...overrides,
  };
}

const hoursAgo = (hours: number): string =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

describe('OrcaPendingUploadsComponent', () => {
  let fixture: ComponentFixture<OrcaPendingUploadsComponent>;
  let serviceSpy: jasmine.SpyObj<SlicerUploadService>;
  let loggingSpy: jasmine.SpyObj<LoggingService>;
  let response$: Subject<PendingSlicerUploadDto[]>;
  let queryParamMap$: BehaviorSubject<ParamMap>;
  let router: Router;
  let navigateSpy: jasmine.Spy;

  const setup = async (device: string | null): Promise<void> => {
    response$ = new Subject<PendingSlicerUploadDto[]>();
    queryParamMap$ = new BehaviorSubject(
      convertToParamMap(device === null ? {} : { device })
    );
    serviceSpy = jasmine.createSpyObj<SlicerUploadService>(
      'SlicerUploadService',
      ['getPendingUploads']
    );
    serviceSpy.getPendingUploads.and.callFake(() => response$);
    loggingSpy = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);

    await TestBed.configureTestingModule({
      imports: [OrcaPendingUploadsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: queryParamMap$ },
        },
        { provide: SlicerUploadService, useValue: serviceSpy },
        { provide: LoggingService, useValue: loggingSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(OrcaPendingUploadsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  /** Responds after the first paint, so an OnPush repaint is what's under test. */
  const respond = async (uploads: PendingSlicerUploadDto[]): Promise<void> => {
    response$.next(uploads);
    response$.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const query = (testId: string) =>
    fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));
  const queryAll = (testId: string) =>
    fixture.debugElement.queryAll(By.css(`[data-testid="${testId}"]`));
  const text = (testId: string): string =>
    (query(testId)?.nativeElement as HTMLElement | undefined)?.textContent
      ?.replace(/\s+/g, ' ')
      .trim() ?? '';

  it('asks for the install id from the link', async () => {
    await setup(INSTALL_ID);

    expect(serviceSpy.getPendingUploads).toHaveBeenCalledOnceWith(INSTALL_ID);
  });

  it('lists the uploads with name, time sliced, estimate and an open link', async () => {
    await setup(INSTALL_ID);
    await respond([
      upload({ settingId: 'a', createdDate: hoursAgo(2) }),
      upload({
        settingId: 'b',
        createdDate: hoursAgo(26),
        printName: null,
        fileName: 'bracket.gcode',
        estimatedPrintTimeSeconds: null,
      }),
    ]);

    const rows = queryAll('orca-upload');
    expect(rows.length).toBe(2);

    const names = queryAll('orca-upload-name').map((d) =>
      (d.nativeElement as HTMLElement).textContent?.trim()
    );
    expect(names).toEqual(['Benchy', 'bracket.gcode']);

    const time = queryAll('orca-upload-relative')[0]
      .nativeElement as HTMLTimeElement;
    expect(time.textContent).toContain('2 hours ago');
    expect(time.getAttribute('datetime')).toBeTruthy();

    // The second has no estimate, so only the first shows one.
    const estimates = queryAll('orca-upload-estimate');
    expect(estimates.length).toBe(1);
    expect((estimates[0].nativeElement as HTMLElement).textContent).toContain(
      '1h 30m'
    );

    const link = queryAll('orca-upload-open')[0]
      .nativeElement as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Log this print');
    const href = new URL(link.href);
    expect(href.pathname).toBe('/prints/new/cura');
    expect(href.searchParams.get('cura_version')).toBe('2.3.1');
    expect(href.searchParams.get('plugin_version')).toBe('orca-plugin/0.1.0');
    expect(href.searchParams.get('settingId')).toBe('a');

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('marks claimed uploads as already opened and still links them', async () => {
    await setup(INSTALL_ID);
    await respond([
      upload({ settingId: 'a', createdDate: hoursAgo(1) }),
      upload({ settingId: 'b', createdDate: hoursAgo(3), claimed: true }),
    ]);

    const rows = queryAll('orca-upload');
    expect(
      rows[0].query(By.css('[data-testid="orca-upload-claimed"]'))
    ).toBeNull();
    const claimed = rows[1].query(
      By.css('[data-testid="orca-upload-claimed"]')
    );
    expect((claimed.nativeElement as HTMLElement).textContent?.trim()).toBe(
      'Already opened'
    );
    const link = rows[1].query(By.css('[data-testid="orca-upload-open"]'))
      .nativeElement as HTMLAnchorElement;
    expect(new URL(link.href).searchParams.get('settingId')).toBe('b');
  });

  it('opens a single fresh, unclaimed upload straight away, replacing the url', async () => {
    await setup(INSTALL_ID);
    await respond([upload({ settingId: 'fresh' })]);

    expect(navigateSpy).toHaveBeenCalledOnceWith(['/prints/new/cura'], {
      queryParams: {
        cura_version: '2.3.1',
        plugin_version: 'orca-plugin/0.1.0',
        settingId: 'fresh',
      },
      replaceUrl: true,
    });
    expect(query('orca-uploads-list')).toBeNull();
    expect(loggingSpy.logEvent).toHaveBeenCalledWith(
      'OrcaPendingUploads_AutoOpened'
    );
  });

  it('lists a single upload instead of opening it when it is claimed', async () => {
    await setup(INSTALL_ID);
    await respond([upload({ claimed: true })]);

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(queryAll('orca-upload').length).toBe(1);
  });

  it('lists a single upload instead of opening it when it is older than 10 minutes', async () => {
    await setup(INSTALL_ID);
    await respond([
      upload({
        createdDate: new Date(
          Date.now() - AUTO_OPEN_MAX_AGE_MS - 1000
        ).toISOString(),
      }),
    ]);

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(queryAll('orca-upload').length).toBe(1);
  });

  it('does not open anything when there are two fresh uploads', async () => {
    await setup(INSTALL_ID);
    await respond([upload({ settingId: 'a' }), upload({ settingId: 'b' })]);

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(queryAll('orca-upload').length).toBe(2);
  });

  for (const [label, device] of [
    ['missing', null],
    ['empty', ''],
    ['too short', '0123456789abcdef'],
    ['uppercase', '0123456789ABCDEF0123456789ABCDEF'],
    ['not hex', 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'],
  ] as const) {
    it(`shows the invalid-link state when the install id is ${label}`, async () => {
      await setup(device);

      expect(serviceSpy.getPendingUploads).not.toHaveBeenCalled();
      expect(text('orca-uploads-invalid')).toContain(
        'This link is missing the OrcaSlicer install id. Open it from the 3D Print Log tab in OrcaSlicer.'
      );
    });
  }

  it('shows the empty state when there are no uploads', async () => {
    await setup(INSTALL_ID);
    expect(query('orca-uploads-empty')).toBeNull();

    await respond([]);

    expect(text('orca-uploads-empty')).toContain(
      'No prints from this OrcaSlicer in the last 7 days. Slice a model and click Log in the 3D Print Log tab.'
    );
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('shows an error with a retry that loads again', async () => {
    await setup(INSTALL_ID);
    response$.error(new Error('boom'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text('orca-uploads-error')).toContain("Couldn't load your prints");
    expect(loggingSpy.logEvent).toHaveBeenCalledWith(
      'OrcaPendingUploads_Error',
      jasmine.anything()
    );

    response$ = new Subject<PendingSlicerUploadDto[]>();
    (query('orca-uploads-retry').nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();
    await respond([upload({ createdDate: hoursAgo(1) })]);

    expect(serviceSpy.getPendingUploads).toHaveBeenCalledTimes(2);
    expect(query('orca-uploads-error')).toBeNull();
    expect(queryAll('orca-upload').length).toBe(1);
  });

  it('shows the error state for an HTTP failure', async () => {
    await setup(INSTALL_ID);
    serviceSpy.getPendingUploads.and.returnValue(
      throwError(() => ({ status: 400 }))
    );
    queryParamMap$.next(
      convertToParamMap({ device: 'fedcba9876543210fedcba9876543210' })
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(query('orca-uploads-error')).toBeTruthy();
    expect(text('orca-uploads-error')).toContain('Check your connection');
  });

  it('says to wait when the API rate-limits the list', async () => {
    await setup(INSTALL_ID);
    response$.error({ status: 429 });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text('orca-uploads-error')).toContain('Wait a minute');
  });

  it('shows the slicer and plugin versions without the stored prefix', async () => {
    await setup(INSTALL_ID);
    await respond([
      upload({ settingId: 'a', slicerVersion: '2.5.0-alpha' }),
      upload({ settingId: 'b' }),
    ]);

    expect(
      (queryAll('orca-upload-version')[0].nativeElement as HTMLElement)
        .textContent
    ).toContain('OrcaSlicer 2.5.0-alpha, plugin 0.1.0');
  });
});

describe('uploadVersionLabel', () => {
  it('keeps a plugin version that has no prefix and skips missing parts', () => {
    expect(
      uploadVersionLabel(
        upload({ slicerVersion: null, pluginVersion: '0.2.0' })
      )
    ).toBe('plugin 0.2.0');
    expect(
      uploadVersionLabel(upload({ slicerVersion: null, pluginVersion: null }))
    ).toBe('');
  });
});

describe('OrcaPendingUploadsComponent with the real service', () => {
  it('renders the first paint and the response without throwing', async () => {
    await TestBed.configureTestingModule({
      imports: [OrcaPendingUploadsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: new BehaviorSubject(
              convertToParamMap({ device: INSTALL_ID })
            ),
          },
        },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(OrcaPendingUploadsComponent);
    expect(() => fixture.detectChanges()).not.toThrow();

    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne(
        `${environment.printLogApiUrl}/api/Slicer/uploads/pending?installId=${INSTALL_ID}`
      )
      .flush([]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('[data-testid="orca-uploads-empty"]'))
    ).toBeTruthy();
    http.verify();
  });
});

describe('uploadToAutoOpen', () => {
  const now = Date.parse('2026-10-17T12:00:00Z');
  const at = (iso: string) => upload({ createdDate: iso });

  it('picks a lone unclaimed upload under 10 minutes old', () => {
    const one = at('2026-10-17T11:51:00Z');
    expect(uploadToAutoOpen([one], now)).toBe(one);
  });

  it('tolerates a server clock slightly ahead of this one', () => {
    const one = at('2026-10-17T12:00:30Z');
    expect(uploadToAutoOpen([one], now)).toBe(one);
  });

  it('skips one exactly 10 minutes old, a claimed one, none, or several', () => {
    expect(uploadToAutoOpen([at('2026-10-17T11:50:00Z')], now)).toBeNull();
    expect(
      uploadToAutoOpen(
        [upload({ createdDate: '2026-10-17T11:59:00Z', claimed: true })],
        now
      )
    ).toBeNull();
    expect(uploadToAutoOpen([], now)).toBeNull();
    expect(
      uploadToAutoOpen(
        [at('2026-10-17T11:59:00Z'), at('2026-10-17T11:58:00Z')],
        now
      )
    ).toBeNull();
    expect(uploadToAutoOpen([at('not a date')], now)).toBeNull();
  });
});

describe('newPrintQueryParams', () => {
  it('sends unknown versions as empty values so new/cura still recognizes the upload', () => {
    expect(
      newPrintQueryParams(
        upload({ settingId: 's', slicerVersion: null, pluginVersion: null })
      )
    ).toEqual({ cura_version: '', plugin_version: '', settingId: 's' });
  });
});
