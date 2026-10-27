import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  WritableSignal,
  input,
  output,
  signal,
} from '@angular/core';
import { By } from '@angular/platform-browser';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
  tick,
} from '@angular/core/testing';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { Observable, Subject, of, throwError } from 'rxjs';
import {
  FilamentDetail,
  FilamentService,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { TagReaderService } from 'src/app/core/services/tag-reader.service';
import { NfcStatus, TagRead } from 'src/app/core/types/native-bridge';
import {
  TagReadResponse,
  TagReading,
  TagSuggestion,
} from 'src/app/core/types/tag-reading';
import { CAMERA_AVAILABLE } from 'src/app/core/utils/camera-available';
import { CameraUnavailableReason } from 'src/app/shared/label-scanner/label-scanner.component';
import {
  LabelScanOutcome,
  ScanLabelPanelComponent,
} from '../scan-label-panel/scan-label-panel.component';
import { ScanSpoolSheetComponent } from './scan-spool-sheet.component';

@Component({ selector: 'app-scan-label-panel', template: '' })
class StubLabelPanelComponent {
  readonly filaments = input<ReadonlyMap<string, FilamentSummary>>(new Map());
  readonly outcome = output<LabelScanOutcome>();
  readonly unavailable = output<CameraUnavailableReason>();
}

const CLASSIC_KEY = 'printlog.tagHint.classicUnsupported';

const SNAPMAKER: TagReading = {
  format: 'snapmaker',
  decoderVersion: 1,
  materialType: 'PLA',
  materialSubtype: 'SnapSpeed',
  netWeightG: 500,
  diameterMm: 1.75,
  colors: ['F72585'],
  alpha: 255,
};

function unknown(
  overrides: Partial<TagReadResponse> = {}
): Observable<TagReadResponse> {
  return of({
    status: 'unknown',
    filament: null,
    reading: SNAPMAKER,
    catalogMatch: null,
    suggestions: [],
    hint: null,
    ...overrides,
  });
}

function summary(id: string, displayName: string): FilamentSummary {
  return {
    id,
    displayName,
    colorHex: 'FF00FF',
    colors: ['FF00FF'],
    colorName: 'Pink',
  } as FilamentSummary;
}

describe('ScanSpoolSheetComponent', () => {
  let fixture: ComponentFixture<ScanSpoolSheetComponent>;
  let el: HTMLElement;
  let tags: Subject<TagRead>;
  let started: Subject<void>;
  let reader: {
    available: WritableSignal<boolean>;
    status: WritableSignal<NfcStatus>;
    listen: jasmine.Spy;
    readingStarted: Subject<void>;
    forget: jasmine.Spy;
    openSettings: jasmine.Spy;
    scan: jasmine.Spy;
    scansOnDemand: WritableSignal<boolean>;
  };
  let filaments: jasmine.SpyObj<FilamentService>;
  let sheetRef: jasmine.SpyObj<MatBottomSheetRef<ScanSpoolSheetComponent>>;
  let logger: jasmine.SpyObj<LoggingService>;

  async function setUp(
    data: { filaments: FilamentSummary[] } | null = null,
    camera = false
  ) {
    tags = new Subject<TagRead>();
    started = new Subject<void>();
    reader = {
      available: signal(true),
      status: signal<NfcStatus>('ready'),
      listen: jasmine.createSpy('listen').and.callFake(() => tags),
      readingStarted: started,
      forget: jasmine.createSpy('forget'),
      openSettings: jasmine.createSpy('openSettings').and.resolveTo(),
      scan: jasmine.createSpy('scan').and.resolveTo(),
      scansOnDemand: signal(false),
    };
    filaments = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'resolveTagRead',
      'addTagToFilament',
      'getFilamentDetail',
    ]);
    sheetRef = jasmine.createSpyObj<MatBottomSheetRef<ScanSpoolSheetComponent>>(
      'MatBottomSheetRef',
      ['dismiss']
    );
    logger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);

    await TestBed.configureTestingModule({
      imports: [ScanSpoolSheetComponent],
      providers: [
        { provide: TagReaderService, useValue: reader },
        { provide: FilamentService, useValue: filaments },
        { provide: MatBottomSheetRef, useValue: sheetRef },
        { provide: LoggingService, useValue: logger },
        { provide: MAT_BOTTOM_SHEET_DATA, useValue: data },
        { provide: CAMERA_AVAILABLE, useValue: camera },
      ],
    })
      .overrideComponent(ScanSpoolSheetComponent, {
        remove: { imports: [ScanLabelPanelComponent] },
        add: { imports: [StubLabelPanelComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ScanSpoolSheetComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.removeItem(CLASSIC_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(CLASSIC_KEY);
    TestBed.resetTestingModule();
  });

  const button = (testId: string) =>
    el.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!;
  const text = (testId: string) =>
    el.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();

  function read(uid: string, extra: Partial<TagRead> = {}) {
    tags.next({ uid, tech: 'nfca', ...extra });
    fixture.detectChanges();
  }

  describe('with a camera', () => {
    const panel = () =>
      fixture.debugElement.query(By.directive(StubLabelPanelComponent))
        ?.componentInstance as StubLabelPanelComponent | undefined;

    it('shows the label scanner beside the NFC prompt', async () => {
      await setUp(null, true);

      expect(panel()).toBeDefined();
      expect(el.textContent).toContain('Hold your phone to a spool');
    });

    it('shows only the label scanner without NFC', async () => {
      await setUp(null, true);
      reader.available.set(false);
      fixture.detectChanges();

      expect(panel()).toBeDefined();
      expect(el.textContent).not.toContain('Hold your phone to a spool');
      expect(el.textContent).toContain("Point the camera at the spool's label");
    });

    it('opens the spool a label scan found', async () => {
      await setUp(null, true);

      panel()!.outcome.emit({ kind: 'known', id: 'f1' });

      expect(sheetRef.dismiss).toHaveBeenCalledWith({
        kind: 'known',
        id: 'f1',
      });
    });

    it('starts a new spool from a label read', async () => {
      await setUp(null, true);
      const read = {
        reading: {
          brand: 'SUNLU',
          materialType: 'PLA+',
          colorName: null,
          netWeightG: 1000,
          diameterMm: 1.75,
          hotendMinC: null,
          hotendMaxC: null,
          bedMinC: null,
          bedMaxC: null,
        },
        catalogMatch: null,
        barcodes: [{ value: '02540924A', format: 'code128' }],
      };

      panel()!.outcome.emit({ kind: 'label-new', read });

      expect(sheetRef.dismiss).toHaveBeenCalledWith({
        kind: 'label-new',
        read,
      });
    });

    it('falls back to NFC when the camera is denied', async () => {
      await setUp(null, true);

      panel()!.unavailable.emit('denied');
      fixture.detectChanges();

      expect(panel()).toBeUndefined();
      expect(el.textContent).toContain('Hold your phone to a spool');
    });

    it('says the camera is unavailable when there is no NFC either', async () => {
      await setUp(null, true);
      reader.available.set(false);
      fixture.detectChanges();

      panel()!.unavailable.emit('denied');
      fixture.detectChanges();

      expect(el.textContent).toContain(
        'Camera unavailable. Search by name instead.'
      );
    });

    it('does not open the phone scan sheet over the camera on iOS', async () => {
      await setUp(null, true);

      expect(reader.scan).not.toHaveBeenCalled();
    });
  });

  it('asks for a spool and listens', async () => {
    await setUp();
    expect(el.textContent).toContain('Hold your phone to a spool');
    expect(reader.listen).toHaveBeenCalledTimes(1);
    expect(tags.observed).toBeTrue();
  });

  it('shows Reading tag once native reports a tag under the phone', async () => {
    await setUp();

    started.next();
    fixture.detectChanges();

    expect(el.textContent).toContain('Reading tag, hold still…');
  });

  describe('when no tag follows Reading tag', () => {
    beforeEach(async () => {
      await setUp();
    });

    function startReading(): void {
      started.next();
      fixture.detectChanges();
    }

    it('goes back to waiting after 4 seconds', fakeAsync(() => {
      startReading();

      tick(3999);
      fixture.detectChanges();
      expect(el.textContent).toContain('Reading tag, hold still…');

      tick(1);
      fixture.detectChanges();
      expect(el.textContent).toContain('Hold your phone to a spool');
      expect(el.querySelector('mat-spinner')).toBeNull();
      flush();
    }));

    it('goes back to the error with Retry when reading started from it', fakeAsync(() => {
      filaments.resolveTagRead.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 0 }))
      );
      read('04A23F11');
      startReading();
      expect(el.textContent).not.toContain("Couldn't look up that tag");

      tick(4000);
      fixture.detectChanges();

      expect(el.textContent).toContain(
        "Couldn't look up that tag. Check your connection."
      );
      expect(button('scan-retry')).toBeTruthy();
      flush();
    }));

    it('restarts the 4 seconds on another readingStarted', fakeAsync(() => {
      startReading();
      tick(3000);
      startReading();

      tick(3000);
      fixture.detectChanges();
      expect(el.textContent).toContain('Reading tag, hold still…');

      tick(1000);
      fixture.detectChanges();
      expect(el.textContent).toContain('Hold your phone to a spool');
      flush();
    }));

    it('does nothing once a tag arrives', fakeAsync(() => {
      filaments.resolveTagRead.and.returnValue(new Subject<TagReadResponse>());
      startReading();
      read('04A23F11');

      tick(4000);
      fixture.detectChanges();

      expect(el.textContent).toContain('Looking up the tag…');
      flush();
    }));

    it('goes back to the hold-still sheet when reading started from it', fakeAsync(() => {
      filaments.resolveTagRead.and.returnValue(
        unknown({ reading: null, hint: 'hold-still' })
      );
      read('805BEC3E');
      startReading();
      expect(el.textContent).toContain('Reading tag, hold still…');

      tick(4000);
      fixture.detectChanges();

      expect(el.textContent).toContain(
        "Hold the phone still and tap again to read the spool's details"
      );
      flush();
    }));
  });

  it('forgets a tap it drops while a lookup is running', async () => {
    await setUp();
    filaments.resolveTagRead.and.returnValue(new Subject<TagReadResponse>());
    read('04A23F11');

    read('04B00000');

    expect(filaments.resolveTagRead).toHaveBeenCalledTimes(1);
    expect(reader.forget).toHaveBeenCalledWith('04B00000');
  });

  it('a linked tag dismisses with that spool', async () => {
    await setUp();
    filaments.resolveTagRead.and.returnValue(
      of({
        status: 'linked',
        filament: { id: 'spool-1' } as FilamentDetail,
        reading: null,
        catalogMatch: null,
        suggestions: [],
        hint: null,
      })
    );

    read('04A23F11');

    expect(sheetRef.dismiss).toHaveBeenCalledWith({
      kind: 'known',
      id: 'spool-1',
    });
    expect(logger.logEvent).toHaveBeenCalledWith('MaterialsScan_Known');
  });

  it('posts the whole read, not just the UID', async () => {
    await setUp();
    filaments.resolveTagRead.and.returnValue(unknown());
    const tag: TagRead = {
      uid: '805BEC3E',
      tech: 'nfca',
      techs: ['NfcA'],
      memory: { kind: 'classic', data: 'AAAA' },
    };

    tags.next(tag);

    expect(filaments.resolveTagRead).toHaveBeenCalledOnceWith(tag);
  });

  describe('an unknown tag', () => {
    it('shows the swatch and the summary line', async () => {
      await setUp();
      filaments.resolveTagRead.and.returnValue(unknown());

      read('805BEC3E');

      expect(el.textContent).toContain(
        "Tag 805BEC3E isn't on any of your spools"
      );
      expect(text('scan-summary-text')).toBe(
        'Snapmaker tag · SnapSpeed PLA · 500 g · 1.75 mm'
      );
      expect(button('scan-swatch')).toBeTruthy();
      expect(
        button('scan-swatch').classList.contains(
          'scan-sheet__swatch--translucent'
        )
      ).toBeFalse();
      expect(logger.logEvent).toHaveBeenCalledWith('MaterialsScan_Unknown');
    });

    it('draws a checkerboard behind a translucent color', async () => {
      await setUp();
      filaments.resolveTagRead.and.returnValue(
        unknown({ reading: { ...SNAPMAKER, alpha: 128 } })
      );

      read('805BEC3E');

      expect(
        button('scan-swatch').classList.contains(
          'scan-sheet__swatch--translucent'
        )
      ).toBeTrue();
    });

    it('leaves out the parts the tag does not carry', async () => {
      await setUp();
      filaments.resolveTagRead.and.returnValue(
        unknown({
          reading: { format: 'openspool', materialType: 'PETG' },
        })
      );

      read('805BEC3E');

      expect(text('scan-summary-text')).toBe('OpenSpool tag · PETG');
    });

    it('lists the suggestions in API order with their reasons', async () => {
      const suggestions: TagSuggestion[] = [
        {
          filamentId: 'b',
          score: 0.9,
          reasons: ['untagged', 'close-color', 'same-brand'],
        },
        {
          filamentId: 'a',
          score: 0.7,
          reasons: ['same-material', 'same-weight'],
        },
      ];
      await setUp({
        filaments: [summary('a', 'Alpha PLA'), summary('b', 'Beta PLA')],
      });
      filaments.resolveTagRead.and.returnValue(unknown({ suggestions }));

      read('805BEC3E');

      const rows = Array.from(
        el.querySelectorAll('[data-testid="scan-suggestion"]')
      );
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('Beta PLA');
      expect(rows[0].textContent).toContain('No tag yet');
      expect(rows[0].textContent).toContain('Close color');
      expect(rows[0].textContent).toContain('Same brand');
      expect(rows[1].textContent).toContain('Alpha PLA');
      expect(rows[1].textContent).toContain('Same material');
      expect(rows[1].textContent).toContain('Same weight');
      // Everything was on the list: nothing to fetch.
      expect(filaments.getFilamentDetail).not.toHaveBeenCalled();
    });

    it('fetches only the suggested spools the list does not have', async () => {
      await setUp({ filaments: [summary('a', 'Alpha PLA')] });
      filaments.getFilamentDetail.and.returnValue(
        of({
          ...summary('b', 'Beta PLA'),
          diameterMm: 1.75,
        } as unknown as FilamentDetail)
      );
      filaments.resolveTagRead.and.returnValue(
        unknown({
          suggestions: [
            { filamentId: 'a', score: 1, reasons: ['untagged'] },
            { filamentId: 'b', score: 0.8, reasons: ['same-brand'] },
          ],
        })
      );

      read('805BEC3E');

      expect(filaments.getFilamentDetail).toHaveBeenCalledOnceWith('b');
      expect(el.textContent).toContain('Beta PLA');
    });

    it('choosing a suggestion links the tag with its reading', async () => {
      await setUp({ filaments: [summary('a', 'Alpha PLA')] });
      filaments.resolveTagRead.and.returnValue(
        unknown({
          suggestions: [{ filamentId: 'a', score: 1, reasons: ['untagged'] }],
        })
      );
      filaments.addTagToFilament.and.returnValue(
        of({ id: 'a' } as FilamentDetail)
      );
      read('805BEC3E');

      button('scan-suggestion').click();

      expect(filaments.addTagToFilament).toHaveBeenCalledOnceWith(
        'a',
        '805BEC3E',
        SNAPMAKER
      );
      expect(sheetRef.dismiss).toHaveBeenCalledWith({
        kind: 'linked',
        id: 'a',
      });
    });

    it('a 409 shows the conflict and stays open', async () => {
      await setUp({ filaments: [summary('a', 'Alpha PLA')] });
      filaments.resolveTagRead.and.returnValue(
        unknown({
          suggestions: [{ filamentId: 'a', score: 1, reasons: ['untagged'] }],
        })
      );
      filaments.addTagToFilament.and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                tagUid: '805BEC3E',
                filamentId: 'z',
                filamentDisplayName: 'Other Spool',
              },
            })
        )
      );
      read('805BEC3E');

      button('scan-suggestion').click();
      fixture.detectChanges();

      expect(el.textContent).toContain(
        "Tag 805BEC3E is already on Other Spool, so it wasn't added here."
      );
      expect(sheetRef.dismiss).not.toHaveBeenCalled();
      expect(button('scan-suggestion').disabled).toBeFalse();
    });

    it('Search all materials dismisses with the tag and reading', async () => {
      await setUp();
      filaments.resolveTagRead.and.returnValue(unknown());
      read('805BEC3E');

      button('scan-link').click();

      expect(sheetRef.dismiss).toHaveBeenCalledWith({
        kind: 'link',
        uid: '805BEC3E',
        reading: SNAPMAKER,
      });
    });

    it('Create dismisses with the tag, reading and catalog match', async () => {
      await setUp();
      const catalogMatch = {
        id: 'cat-1',
        confidence: 0.9,
        spoolWeightG: 140,
        colorName: 'Pink',
        name: 'SnapSpeed PLA',
        manufacturer: 'Snapmaker',
        source: 'SpoolmanDB' as const,
      };
      filaments.resolveTagRead.and.returnValue(unknown({ catalogMatch }));
      read('805BEC3E');

      button('scan-new').click();

      expect(sheetRef.dismiss).toHaveBeenCalledWith({
        kind: 'new',
        uid: '805BEC3E',
        reading: SNAPMAKER,
        catalogMatch,
      });
      expect(logger.logEvent).toHaveBeenCalledWith('MaterialsScan_NewChosen');
    });

    it('the hold-still hint still offers Link and Create', async () => {
      await setUp();
      filaments.resolveTagRead.and.returnValue(
        unknown({ reading: null, hint: 'hold-still' })
      );

      read('805BEC3E');

      expect(el.textContent).toContain(
        "Hold the phone still and tap again to read the spool's details"
      );
      expect(button('scan-link')).toBeTruthy();
      expect(button('scan-new')).toBeTruthy();
    });

    describe('with the hold-still hint', () => {
      const holdStill = () =>
        unknown({
          reading: null,
          hint: 'hold-still',
          suggestions: [],
        });

      it('keeps listening and forgets the UID so the same tag can be read again', async () => {
        await setUp();
        filaments.resolveTagRead.and.returnValue(holdStill());

        read('805BEC3E');

        expect(tags.observed).toBeTrue();
        expect(reader.forget).toHaveBeenCalledWith('805BEC3E');
      });

      it('a second read of the same UID shows what the tag says', async () => {
        await setUp();
        filaments.resolveTagRead.and.returnValues(holdStill(), unknown());
        read('805BEC3E');
        expect(el.querySelector('[data-testid="scan-summary"]')).toBeNull();

        read('805BEC3E', { memory: { kind: 'classic', data: 'AAAA' } });

        expect(filaments.resolveTagRead).toHaveBeenCalledTimes(2);
        expect(text('scan-summary-text')).toBe(
          'Snapmaker tag · SnapSpeed PLA · 500 g · 1.75 mm'
        );
        expect(el.querySelector('[data-testid="scan-hold-still"]')).toBeNull();
        // Decoded: the sheet stops at this tag now.
        expect(tags.observed).toBeFalse();
      });

      it('a read of a different tag is a new scan', async () => {
        await setUp();
        filaments.resolveTagRead.and.returnValues(
          holdStill(),
          of({
            status: 'linked',
            filament: { id: 'spool-2' } as FilamentDetail,
            reading: null,
            catalogMatch: null,
            suggestions: [],
            hint: null,
          })
        );
        read('805BEC3E');

        read('04A23F11');

        expect(filaments.resolveTagRead.calls.argsFor(1)[0].uid).toBe(
          '04A23F11'
        );
        expect(sheetRef.dismiss).toHaveBeenCalledWith({
          kind: 'known',
          id: 'spool-2',
        });
      });
    });

    it('disables Cancel while a suggestion is being linked', async () => {
      await setUp({ filaments: [summary('a', 'Alpha PLA')] });
      filaments.resolveTagRead.and.returnValue(
        unknown({
          suggestions: [{ filamentId: 'a', score: 1, reasons: ['untagged'] }],
        })
      );
      filaments.addTagToFilament.and.returnValue(new Subject<FilamentDetail>());
      read('805BEC3E');

      button('scan-suggestion').click();
      fixture.detectChanges();

      expect(button('scan-cancel').disabled).toBeTrue();
    });

    it('an app without memory (no reading) shows Link and Create and no summary', async () => {
      await setUp({ filaments: [summary('a', 'Alpha PLA')] });
      filaments.resolveTagRead.and.returnValue(
        unknown({
          reading: null,
          suggestions: [{ filamentId: 'a', score: 1, reasons: ['untagged'] }],
        })
      );

      read('04A23F11');

      expect(el.querySelector('[data-testid="scan-summary"]')).toBeNull();
      expect(el.textContent).toContain('Alpha PLA');
      button('scan-new').click();
      expect(sheetRef.dismiss).toHaveBeenCalledWith({
        kind: 'new',
        uid: '04A23F11',
        reading: null,
        catalogMatch: null,
      });
    });

    it('says once that this phone cannot read Snapmaker or Bambu tags', async () => {
      const message =
        "This phone can't read the data on Snapmaker or Bambu tags; the tag can still be linked.";
      await setUp();
      filaments.resolveTagRead.and.returnValue(unknown({ reading: null }));

      read('805BEC3E', { classicUnsupported: true });
      expect(el.textContent).toContain(message);
      expect(localStorage.getItem(CLASSIC_KEY)).not.toBeNull();

      TestBed.resetTestingModule();
      await setUp();
      filaments.resolveTagRead.and.returnValue(unknown({ reading: null }));
      read('805BEC3E', { classicUnsupported: true });
      expect(el.textContent).not.toContain(message);
    });

    it('does not mention it when the phone can read classic tags', async () => {
      await setUp();
      filaments.resolveTagRead.and.returnValue(unknown());

      read('805BEC3E');

      expect(el.textContent).not.toContain("can't read the data");
      expect(localStorage.getItem(CLASSIC_KEY)).toBeNull();
    });

    it('stops at the first unknown tag', async () => {
      await setUp();
      filaments.resolveTagRead.and.returnValue(unknown());
      read('04A23F11');
      read('04A23F12');

      expect(filaments.resolveTagRead).toHaveBeenCalledTimes(1);
      // Unsubscribed, so the picker that opens next owns the reader.
      expect(tags.observed).toBeFalse();
    });
  });

  describe('when the lookup fails', () => {
    const offline = () =>
      throwError(() => new HttpErrorResponse({ status: 0 }));

    it('says so, forgets the UID and offers Retry', async () => {
      await setUp();
      filaments.resolveTagRead.and.returnValue(offline());

      read('04A23F11');

      expect(el.textContent).toContain(
        "Couldn't look up that tag. Check your connection."
      );
      expect(reader.forget).toHaveBeenCalledWith('04A23F11');
      expect(button('scan-retry')).toBeTruthy();
    });

    it('Retry posts the same read again without a new tap', async () => {
      await setUp();
      filaments.resolveTagRead.and.returnValues(
        offline(),
        of({
          status: 'linked',
          filament: { id: 'spool-1' } as FilamentDetail,
          reading: null,
          catalogMatch: null,
          suggestions: [],
          hint: null,
        })
      );
      const tag: TagRead = {
        uid: '805BEC3E',
        tech: 'nfca',
        memory: { kind: 'classic', data: 'AAAA' },
      };
      tags.next(tag);
      fixture.detectChanges();

      button('scan-retry').click();

      expect(filaments.resolveTagRead).toHaveBeenCalledTimes(2);
      expect(filaments.resolveTagRead.calls.argsFor(1)[0]).toEqual({
        uid: '805BEC3E',
        tech: 'nfca',
        memory: { kind: 'classic', data: 'AAAA' },
      });
      expect(sheetRef.dismiss).toHaveBeenCalledWith({
        kind: 'known',
        id: 'spool-1',
      });
    });

    it('a new tap during the error works too', async () => {
      await setUp();
      filaments.resolveTagRead.and.returnValues(
        offline(),
        of({
          status: 'linked',
          filament: { id: 'spool-1' } as FilamentDetail,
          reading: null,
          catalogMatch: null,
          suggestions: [],
          hint: null,
        })
      );
      read('04A23F11');

      read('04A23F11');

      expect(sheetRef.dismiss).toHaveBeenCalledWith({
        kind: 'known',
        id: 'spool-1',
      });
    });
  });

  it('offers Turn on while NFC is off', async () => {
    await setUp();
    reader.status.set('off');
    fixture.detectChanges();

    expect(el.textContent).toContain('NFC is off');
    button('nfc-turn-on').click();
    expect(reader.openSettings).toHaveBeenCalled();
  });

  it('asks for a scan as it opens, which opens the phone sheet on iOS', async () => {
    await setUp();
    expect(reader.scan).toHaveBeenCalledTimes(1);
  });

  it('offers Scan while waiting, and Scan another for an unknown tag, on a shell that reads on demand', async () => {
    await setUp();
    reader.scansOnDemand.set(true);
    fixture.detectChanges();

    expect(el.textContent).not.toContain('Hold your phone to a spool');
    button('scan-on-demand').click();
    expect(reader.scan).toHaveBeenCalledTimes(2);
  });

  it('keeps the hold prompt and no Scan button where tags are read passively', async () => {
    await setUp();
    expect(el.textContent).toContain('Hold your phone to a spool');
    expect(el.querySelector('[data-testid="scan-on-demand"]')).toBeNull();
  });

  it('Cancel dismisses with nothing', async () => {
    await setUp();
    button('scan-cancel').click();
    expect(sheetRef.dismiss).toHaveBeenCalledWith();
  });
});
