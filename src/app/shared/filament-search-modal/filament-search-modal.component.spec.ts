import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  NO_ERRORS_SCHEMA,
  WritableSignal,
  input,
  output,
  signal,
} from '@angular/core';
import { By } from '@angular/platform-browser';
import { Barcode, LabelReadResponse } from 'src/app/core/types/label-reading';
import { LabelOcrResult } from 'src/app/shared/label-scanner/label-ocr';
import {
  CameraUnavailableReason,
  LabelScannerComponent,
} from 'src/app/shared/label-scanner/label-scanner.component';
import { FilamentListComponent } from '../filament-list/filament-list.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { isObservable, Observable, of, Subject, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { TagReading } from 'src/app/core/types/tag-reading';
import { TagReaderService } from 'src/app/core/services/tag-reader.service';
import { NfcStatus, TagRead } from 'src/app/core/types/native-bridge';
import { filamentDetailToSummary } from 'src/app/core/utils/filament-summary';
import { SimpleDialogData } from '../simple-dialog/simple-dialog.component';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  ColorPatternType,
  FilamentDetail,
  FilamentFinishType,
  FilamentService,
  FilamentSourceMeasurement,
  FilamentSummary,
} from 'src/app/core/services/filament.service';

import {
  DialogData,
  FilamentSearchModalComponent,
} from './filament-search-modal.component';

function buildDetail(): FilamentDetail {
  return {
    id: 'filament-1',
    displayName: 'Test Filament',
    brand: 'Brand',
    materialCategoryNickname: 'PLA',
    materialType: 'PLA',
    materialDensityGramPerCubicCm: 1.24,
    colorName: 'Red',
    colorHex: 'FF0000',
    colorPattern: ColorPatternType.Solid,
    colors: ['FF0000'],
    finishType: FilamentFinishType.Standard,
    effects: [],
    diameterMm: 1.75,
    initialTotalWeightMg: null,
    source: FilamentSourceMeasurement.Weight,
    initialNominalWeightMg: 1000000,
    initialNominalLengthM: 330,
    initialNominalVolumeMl: 800,
    spoolWeightMg: null,
    tempRangeStart: null,
    tempRangeEnd: null,
    recommendedTemp: 210,
    recommendedBedTemp: null,
    isActive: true,
    purchaseDate: null,
    purchaseLocation: '',
    purchasePriceValue: '20.00',
    purchasePriceCurrency: 'USD',
    purchaseNotes: '',
    storageLocation: 'Shelf',
    initialLayerTimeS: null,
    layerTimeS: null,
    meltingTemperature: null,
    inertGas: '',
    materialRefreshRatio: null,
    notes: '',
    isFavorite: false,
    filamentAdjustments: [],
    filamentRemaining: 750000,
    filamentLengthRemainingInM: 248,
    filamentVolumeRemainingInMl: 605,
  };
}

describe('FilamentSearchModalComponent', () => {
  let component: FilamentSearchModalComponent;
  let fixture: ComponentFixture<FilamentSearchModalComponent>;
  let mockFilamentService: jasmine.SpyObj<FilamentService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<FilamentSearchModalComponent>>;

  beforeEach(async () => {
    const mockLogger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);

    mockFilamentService = jasmine.createSpyObj<FilamentService>(
      'FilamentService',
      ['getCurrentUserFilamentSummaries', 'getFilamentDetail']
    );

    mockDialogRef = jasmine.createSpyObj<
      MatDialogRef<FilamentSearchModalComponent>
    >('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [MatDialogModule, FilamentSearchModalComponent],
      providers: [
        { provide: LoggingService, useValue: mockLogger },
        { provide: FilamentService, useValue: mockFilamentService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        {
          provide: ToastrService,
          useValue: jasmine.createSpyObj<ToastrService>('ToastrService', [
            'error',
            'warning',
          ]),
        },
      ],
    })
      .overrideComponent(FilamentSearchModalComponent, {
        remove: { imports: [FilamentListComponent, LabelScannerComponent] },
        add: { schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilamentSearchModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('handleOwnLabel', () => {
    it('keeps the remaining filament values from the scanned material', () => {
      mockFilamentService.getFilamentDetail.and.returnValue(of(buildDetail()));

      component.handleOwnLabel('filament-1');

      expect(mockDialogRef.close).toHaveBeenCalled();
      const selected = mockDialogRef.close.calls.mostRecent().args[0];
      expect(selected.filamentRemaining).toBe(750000);
      expect(selected.filamentLengthRemainingInM).toBe(248);
      expect(selected.filamentVolumeRemainingInMl).toBe(605);
    });

    it('keeps the remaining values when adding in multi-select mode', () => {
      component.data.multiSelect = true;
      mockFilamentService.getFilamentDetail.and.returnValue(of(buildDetail()));

      component.handleOwnLabel('filament-1');

      expect(component.selectedFilaments()[0].filamentRemaining).toBe(750000);
    });
  });

  describe('owning the selection', () => {
    const summary = (id: string) =>
      ({ id, displayName: id }) as unknown as FilamentSummary;
    const list = () =>
      (fixture.nativeElement as HTMLElement).querySelector(
        'app-filament-list'
      ) as HTMLElement | null;

    beforeEach(() => {
      component.data.multiSelect = true;
    });

    it('a QR pick in multi-select is part of the selection the list shows', () => {
      mockFilamentService.getFilamentDetail.and.returnValue(of(buildDetail()));

      component.handleOwnLabel('filament-1');

      expect(component.selectedIds().has('filament-1')).toBeTrue();
    });

    it('a QR pick survives a later checkbox click on another row', () => {
      mockFilamentService.getFilamentDetail.and.returnValue(of(buildDetail()));
      component.handleOwnLabel('filament-1');

      component.toggleFilament(summary('filament-2'));

      expect(component.selectedFilaments().map((f) => f.id)).toEqual([
        'filament-1',
        'filament-2',
      ]);
    });

    it('a second toggle deselects', () => {
      component.toggleFilament(summary('filament-2'));
      component.toggleFilament(summary('filament-2'));

      expect(component.selectedFilaments()).toEqual([]);
    });

    it('keeps the list mounted during a lookup', () => {
      const before = list();
      component.loading.set(true);
      fixture.detectChanges();

      expect(list()).not.toBeNull();
      expect(list()).toBe(before);
    });

    it('keeps the list mounted, hidden, while the QR scanner is open', () => {
      const before = list();
      component.toggleViewMode();
      fixture.detectChanges();

      expect(list()).toBe(before);
      expect(list()!.hidden).toBeTrue();
    });
  });
});

describe('FilamentSearchModalComponent NFC tags', () => {
  let component: FilamentSearchModalComponent;
  let fixture: ComponentFixture<FilamentSearchModalComponent>;
  let filaments: jasmine.SpyObj<FilamentService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<FilamentSearchModalComponent>>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logger: jasmine.SpyObj<LoggingService>;
  let tags: Subject<TagRead>;
  let reader: {
    available: WritableSignal<boolean>;
    status: WritableSignal<NfcStatus>;
    listen: () => Subject<TagRead>;
    forget: jasmine.Spy;
    openSettings: jasmine.Spy;
    scan: jasmine.Spy;
    scansOnDemand: WritableSignal<boolean>;
  };
  /** What the next confirm dialog answers: true = yes, undefined = no, a Subject = still open. */
  let dialogAnswers: (boolean | undefined | Observable<boolean | undefined>)[];

  const spool = (overrides: Partial<FilamentDetail> = {}): FilamentDetail => ({
    ...buildDetail(),
    ...overrides,
  });
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const lastDialogData = () =>
    (dialog.open.calls.mostRecent().args[1] as { data: SimpleDialogData }).data;

  async function setUp(data: Partial<DialogData> = {}): Promise<void> {
    tags = new Subject<TagRead>();
    reader = {
      available: signal(true),
      status: signal<NfcStatus>('ready'),
      listen: () => tags,
      forget: jasmine.createSpy('forget'),
      openSettings: jasmine.createSpy('openSettings').and.resolveTo(),
      scan: jasmine.createSpy('scan').and.resolveTo(),
      scansOnDemand: signal(false),
    };
    filaments = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'getCurrentUserFilamentSummaries',
      'getFilamentDetail',
      'getFilamentByTag',
      'resolveTagRead',
      'addTagToFilament',
    ]);
    // Most specs care only whether a spool has the tag: adapt their getFilamentByTag answers.
    filaments.resolveTagRead.and.callFake((read) =>
      filaments.getFilamentByTag(read.uid).pipe(
        map((detail) => ({
          status: detail ? ('linked' as const) : ('unknown' as const),
          filament: detail,
          reading: null,
          catalogMatch: null,
          suggestions: [],
          hint: null,
        }))
      )
    );
    dialogRef = jasmine.createSpyObj<
      MatDialogRef<FilamentSearchModalComponent>
    >('MatDialogRef', ['close']);
    dialogAnswers = [];
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.callFake(
      () =>
        ({
          afterClosed: () => {
            const answer = dialogAnswers.shift();
            return isObservable(answer) ? answer : of(answer);
          },
        }) as never
    );
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'error',
      'warning',
      'success',
    ]);
    logger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);

    await TestBed.configureTestingModule({
      imports: [FilamentSearchModalComponent],
      providers: [
        { provide: LoggingService, useValue: logger },
        { provide: FilamentService, useValue: filaments },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: TagReaderService, useValue: reader },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            otherFilamentOption: null,
            filterByMaterialCategory: '',
            ...data,
          },
        },
      ],
    })
      .overrideComponent(FilamentSearchModalComponent, {
        remove: { imports: [FilamentListComponent] },
        add: { schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FilamentSearchModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('shows the hint while NFC is ready', async () => {
    await setUp();
    expect(text()).toContain("Or hold your phone to a spool's tag");
  });

  it('offers a Scan button instead of the hold hint on a shell that reads on demand (iOS)', async () => {
    await setUp();
    reader.scansOnDemand.set(true);
    fixture.detectChanges();

    expect(text()).not.toContain('hold your phone');
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="tag-scan-on-demand"]')!
      .click();
    expect(reader.scan).toHaveBeenCalled();
  });

  it('offers no Scan button where tags are read passively', async () => {
    await setUp();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="tag-scan-on-demand"]'
      )
    ).toBeNull();
  });

  it('offers Turn on while NFC is off', async () => {
    await setUp();
    reader.status.set('off');
    fixture.detectChanges();

    expect(text()).toContain('NFC is off');
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="nfc-turn-on"]')!
      .click();
    expect(reader.openSettings).toHaveBeenCalled();
  });

  it('shows no hint when NFC is unsupported or reading is unavailable', async () => {
    await setUp();
    reader.status.set('unsupported');
    fixture.detectChanges();
    expect(text()).not.toContain('hold your phone');

    reader.status.set('ready');
    reader.available.set(false);
    fixture.detectChanges();
    expect(text()).not.toContain('hold your phone');
  });

  it('a known tag closes single-select with the spool', async () => {
    await setUp();
    filaments.getFilamentByTag.and.returnValue(of(spool()));

    tags.next({ uid: '04A23F11', tech: 'nfca' });

    expect(filaments.getFilamentByTag).toHaveBeenCalledWith('04A23F11');
    expect(dialogRef.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'filament-1' })
    );
    expect(logger.logEvent).toHaveBeenCalledWith('TagReader_Lookup', {
      known: true,
    });
  });

  it('a known tag in multi-select is selected and the picker keeps listening', async () => {
    await setUp({ multiSelect: true });
    filaments.getFilamentByTag.and.returnValues(
      of(spool()),
      of(spool({ id: 'filament-2' }))
    );

    tags.next({ uid: '04A23F11', tech: 'nfca' });
    tags.next({ uid: '04A23F12', tech: 'nfca' });

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect([...component.selectedIds()]).toEqual(['filament-1', 'filament-2']);
  });

  it('a known tag already selected in multi-select is not added twice', async () => {
    await setUp({ multiSelect: true });
    filaments.getFilamentByTag.and.returnValue(of(spool()));

    tags.next({ uid: '04A23F11', tech: 'nfca' });
    tags.next({ uid: '04A23F11', tech: 'nfca' });

    expect(component.selectedFilaments().length).toBe(1);
  });

  it('asks before picking a spool in another category', async () => {
    await setUp({ filterByMaterialCategory: 'filament' });
    filaments.getFilamentByTag.and.returnValue(
      of(
        spool({ displayName: 'Tough Resin', materialCategoryNickname: 'resin' })
      )
    );
    dialogAnswers = [true];

    tags.next({ uid: '04A23F11', tech: 'nfca' });

    expect(lastDialogData().body).toContain(
      "That's Tough Resin, a resin. Pick it anyway?"
    );
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('does not pick when the user declines the check', async () => {
    await setUp();
    filaments.getFilamentByTag.and.returnValue(of(spool({ isActive: false })));
    dialogAnswers = [undefined];

    tags.next({ uid: '04A23F11', tech: 'nfca' });

    expect(lastDialogData().body).toContain(
      'Test Filament is marked inactive. Pick it anyway?'
    );
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('puts both checks in one message', async () => {
    await setUp({ filterByMaterialCategory: 'filament' });
    filaments.getFilamentByTag.and.returnValue(
      of(spool({ materialCategoryNickname: 'resin', isActive: false }))
    );
    dialogAnswers = [true];

    tags.next({ uid: '04A23F11', tech: 'nfca' });

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(lastDialogData().body).toContain('resin');
    expect(lastDialogData().body).toContain('marked inactive');
  });

  it('escapes spool names in the check', async () => {
    await setUp();
    filaments.getFilamentByTag.and.returnValue(
      of(spool({ displayName: '<b>Bold</b>', isActive: false }))
    );
    dialogAnswers = [undefined];

    tags.next({ uid: '04A23F11', tech: 'nfca' });

    expect(lastDialogData().body).toContain('&lt;b&gt;Bold&lt;/b&gt;');
  });

  it('an unknown tag shows the banner', async () => {
    await setUp();
    filaments.getFilamentByTag.and.returnValue(of(null));

    tags.next({ uid: '04A23F11', tech: 'nfca' });
    fixture.detectChanges();

    expect(text()).toContain('New tag 04A23F11');
    expect(text()).toContain('Pick the spool it belongs to.');
    expect(logger.logEvent).toHaveBeenCalledWith('TagReader_Lookup', {
      known: false,
    });
  });

  it('unknown then a pick: Add tag and select links it, then selects', async () => {
    await setUp();
    filaments.getFilamentByTag.and.returnValue(of(null));
    filaments.addTagToFilament.and.returnValue(of(spool()));
    tags.next({ uid: '04A23F11', tech: 'nfca' });
    dialogAnswers = [true];

    component.handleFilamentSelected(filamentDetailToSummary(spool()));

    // The visible text, as the dialog renders it; the UID is set in <code>.
    const visible = new DOMParser().parseFromString(
      lastDialogData().body,
      'text/html'
    ).body.textContent;
    expect(visible).toContain('Add tag 04A23F11 to Test Filament?');
    expect(lastDialogData().yesText).toBe('Add tag and select');
    expect(lastDialogData().noText).toBe('Just select');
    expect(filaments.addTagToFilament).toHaveBeenCalledWith(
      'filament-1',
      '04A23F11',
      null
    );
    expect(dialogRef.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'filament-1' })
    );
    expect(component.pendingTagUid()).toBeNull();
  });

  it('a tag read in the modal goes through tag-reads and links with its reading', async () => {
    await setUp();
    const reading: TagReading = { format: 'snapmaker', materialType: 'PLA' };
    filaments.resolveTagRead.and.returnValue(
      of({
        status: 'unknown',
        filament: null,
        reading,
        catalogMatch: null,
        suggestions: [],
        hint: null,
      })
    );
    filaments.addTagToFilament.and.returnValue(of(spool()));
    const read: TagRead = { uid: '04A23F11', tech: 'nfca', techs: ['NfcA'] };
    tags.next(read);
    dialogAnswers = [true];

    component.handleFilamentSelected(filamentDetailToSummary(spool()));

    expect(filaments.resolveTagRead).toHaveBeenCalledWith(read);
    expect(filaments.addTagToFilament).toHaveBeenCalledWith(
      'filament-1',
      '04A23F11',
      reading
    );
  });

  it('a pending reading from the sheet is sent with the link', async () => {
    const reading: TagReading = { format: 'snapmaker' };
    await setUp({ pendingTagUid: '04A23F11', pendingTagReading: reading });
    filaments.addTagToFilament.and.returnValue(of(spool()));
    dialogAnswers = [true];

    component.handleFilamentSelected(filamentDetailToSummary(spool()));

    expect(filaments.addTagToFilament).toHaveBeenCalledWith(
      'filament-1',
      '04A23F11',
      reading
    );
  });

  it('unknown then a pick: Just select selects without linking', async () => {
    await setUp();
    filaments.getFilamentByTag.and.returnValue(of(null));
    tags.next({ uid: '04A23F11', tech: 'nfca' });
    dialogAnswers = [undefined];

    component.handleFilamentSelected(filamentDetailToSummary(spool()));

    expect(filaments.addTagToFilament).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(logger.logEvent).toHaveBeenCalledWith(
      'FilamentSearchModal_TagLinkSkipped'
    );
  });

  it('a link that fails with 409 still selects and names the other spool', async () => {
    await setUp();
    filaments.getFilamentByTag.and.returnValue(of(null));
    filaments.addTagToFilament.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              tagUid: '04A23F11',
              filamentId: 'other',
              filamentDisplayName: 'Old Spool',
            },
          })
      )
    );
    tags.next({ uid: '04A23F11', tech: 'nfca' });
    dialogAnswers = [true];

    component.handleFilamentSelected(filamentDetailToSummary(spool()));

    expect(dialogRef.close).toHaveBeenCalled();
    expect(toastr.warning.calls.mostRecent().args[0]).toContain('Old Spool');
    expect(logger.logEvent).toHaveBeenCalledWith(
      'FilamentSearchModal_TagLinkFailed',
      { status: 409, conflict: true }
    );
  });

  it('multi-select: the confirm opens on an add, and a deselect does nothing', async () => {
    await setUp({ multiSelect: true });
    const other = filamentDetailToSummary(spool({ id: 'filament-2' }));
    component.toggleFilament(other);
    filaments.getFilamentByTag.and.returnValue(of(null));
    tags.next({ uid: '04A23F11', tech: 'nfca' });

    component.toggleFilament(other);
    expect(dialog.open).not.toHaveBeenCalled();
    expect(component.pendingTagUid()).toBe('04A23F11');

    dialogAnswers = [undefined];
    component.toggleFilament(filamentDetailToSummary(spool()));
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect([...component.selectedIds()]).toEqual(['filament-1']);
    expect(component.pendingTagUid()).toBeNull();
  });

  it('dismissing the banner makes picks ordinary', async () => {
    await setUp();
    filaments.getFilamentByTag.and.returnValue(of(null));
    tags.next({ uid: '04A23F11', tech: 'nfca' });
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="tag-banner-dismiss"]')!
      .click();
    component.handleFilamentSelected(filamentDetailToSummary(spool()));

    expect(dialog.open).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('a failed lookup says so and forgets the UID', async () => {
    await setUp();
    filaments.getFilamentByTag.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0 }))
    );

    tags.next({ uid: '04A23F11', tech: 'nfca' });

    expect(toastr.error).toHaveBeenCalledWith(
      "Couldn't look up that tag. Check your connection."
    );
    expect(reader.forget).toHaveBeenCalledWith('04A23F11');
    expect(component.loading()).toBeFalse();
  });

  it('ignores a tag that arrives during a lookup', async () => {
    await setUp();
    const pending = new Subject<FilamentDetail | null>();
    filaments.getFilamentByTag.and.returnValue(pending);

    tags.next({ uid: '04A23F11', tech: 'nfca' });
    tags.next({ uid: '04A23F12', tech: 'nfca' });

    expect(filaments.getFilamentByTag).toHaveBeenCalledTimes(1);
  });

  describe('one tag at a time', () => {
    it('ignores a tag read while the link dialog is open', async () => {
      await setUp({ multiSelect: true });
      filaments.getFilamentByTag.and.returnValue(of(null));
      filaments.addTagToFilament.and.returnValue(of(spool()));
      tags.next({ uid: '04A23F11', tech: 'nfca' });
      const linkAnswer = new Subject<boolean | undefined>();
      dialogAnswers = [linkAnswer];

      component.toggleFilament(filamentDetailToSummary(spool()));
      // The spool is still near the phone, or a second one is tapped.
      tags.next({ uid: '04A23F11', tech: 'nfca' });
      tags.next({ uid: '04B00000', tech: 'nfca' });
      linkAnswer.next(true);
      linkAnswer.complete();

      expect(filaments.getFilamentByTag).toHaveBeenCalledTimes(1);
      expect(filaments.addTagToFilament).toHaveBeenCalledOnceWith(
        'filament-1',
        '04A23F11',
        null
      );
      expect(component.pendingTagUid()).toBeNull();
      expect([...component.selectedIds()]).toEqual(['filament-1']);
    });

    it('ignores a tag read while the link is saving, and keeps the overlay up', async () => {
      await setUp({ multiSelect: true });
      filaments.getFilamentByTag.and.returnValue(of(null));
      const saving = new Subject<FilamentDetail>();
      filaments.addTagToFilament.and.returnValue(saving);
      tags.next({ uid: '04A23F11', tech: 'nfca' });
      dialogAnswers = [true];

      component.toggleFilament(filamentDetailToSummary(spool()));
      tags.next({ uid: '04A23F11', tech: 'nfca' });

      expect(filaments.getFilamentByTag).toHaveBeenCalledTimes(1);
      expect(component.loading()).toBeTrue();
      expect(component.pendingTagUid()).toBeNull();

      saving.next(spool());
      saving.complete();
      expect(component.loading()).toBeFalse();
      expect([...component.selectedIds()]).toEqual(['filament-1']);
    });

    it('ignores a tag read while the pick check is open', async () => {
      await setUp();
      filaments.getFilamentByTag.and.returnValues(
        of(spool({ isActive: false })),
        of(spool({ id: 'filament-2' }))
      );
      const check = new Subject<boolean | undefined>();
      dialogAnswers = [check];

      tags.next({ uid: '04A23F11', tech: 'nfca' });
      tags.next({ uid: '04B00000', tech: 'nfca' });

      expect(dialog.open).toHaveBeenCalledTimes(1);
      expect(filaments.getFilamentByTag).toHaveBeenCalledTimes(1);

      check.next(undefined);
      check.complete();
      tags.next({ uid: '04B00000', tech: 'nfca' });
      expect(dialogRef.close).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ id: 'filament-2' })
      );
    });

    it('a link that finishes after Close does not change the result', async () => {
      await setUp();
      filaments.getFilamentByTag.and.returnValue(of(null));
      const saving = new Subject<FilamentDetail>();
      filaments.addTagToFilament.and.returnValue(saving);
      tags.next({ uid: '04A23F11', tech: 'nfca' });
      dialogAnswers = [true];

      component.handleFilamentSelected(filamentDetailToSummary(spool()));
      component.closeSelected();
      saving.next(spool());
      saving.complete();

      expect(dialogRef.close).toHaveBeenCalledOnceWith(null);
    });

    it('a confirmed link still saves when the picker is closed mid-save', async () => {
      await setUp();
      filaments.getFilamentByTag.and.returnValue(of(null));
      const saving = new Subject<FilamentDetail>();
      filaments.addTagToFilament.and.returnValue(saving);
      tags.next({ uid: '04A23F11', tech: 'nfca' });
      dialogAnswers = [true];

      component.handleFilamentSelected(filamentDetailToSummary(spool()));
      // Back, Escape or the backdrop closes the dialog and destroys the picker.
      fixture.destroy();

      expect(saving.observed).toBeTrue();
      saving.next(spool());
      saving.complete();
      expect(logger.logEvent).toHaveBeenCalledWith(
        'FilamentSearchModal_TagLinked'
      );
    });

    it('a read dropped while busy does not use up the repeat window', async () => {
      await setUp();
      filaments.getFilamentByTag.and.returnValue(
        of(spool({ isActive: false }))
      );
      const check = new Subject<boolean | undefined>();
      dialogAnswers = [check];

      tags.next({ uid: '04A23F11', tech: 'nfca' });
      tags.next({ uid: '04B00000', tech: 'nfca' });

      expect(reader.forget).toHaveBeenCalledWith('04B00000');
    });

    it('cancelling the pick check lets the same spool be tapped again at once', async () => {
      await setUp();
      filaments.getFilamentByTag.and.returnValue(
        of(spool({ isActive: false }))
      );
      dialogAnswers = [undefined];

      tags.next({ uid: '04A23F11', tech: 'nfca' });

      expect(reader.forget).toHaveBeenCalledWith('04A23F11');
    });

    it('Add N waits for a link that is saving', async () => {
      await setUp({ multiSelect: true });
      component.toggleFilament(
        filamentDetailToSummary(spool({ id: 'filament-2' }))
      );
      filaments.getFilamentByTag.and.returnValue(of(null));
      const saving = new Subject<FilamentDetail>();
      filaments.addTagToFilament.and.returnValue(saving);
      tags.next({ uid: '04A23F11', tech: 'nfca' });
      dialogAnswers = [true];
      component.toggleFilament(filamentDetailToSummary(spool()));
      fixture.detectChanges();

      const addButton = () =>
        Array.from(
          (
            fixture.nativeElement as HTMLElement
          ).querySelectorAll<HTMLButtonElement>('mat-dialog-actions button')
        ).find((b) => b.textContent?.includes('Add'))!;
      expect(addButton().disabled).toBeTrue();

      saving.next(spool());
      saving.complete();
      fixture.detectChanges();
      expect(addButton().disabled).toBeFalse();
    });
  });

  it('starts in the unknown-tag state with a pending tag', async () => {
    await setUp({ pendingTagUid: '04A23F11' });
    expect(text()).toContain('New tag 04A23F11');
  });
});

@Component({ selector: 'app-label-scanner', template: '' })
class StubLabelScannerComponent {
  readonly paused = input(false);
  readonly ownLabel = output<string>();
  readonly barcodesChanged = output<Barcode[]>();
  readonly photo = output<{ barcodes: Barcode[]; ocr: LabelOcrResult }>();
  readonly unavailable = output<CameraUnavailableReason>();
}

describe('FilamentSearchModalComponent label scanning', () => {
  let fixture: ComponentFixture<FilamentSearchModalComponent>;
  let component: FilamentSearchModalComponent;
  let service: jasmine.SpyObj<FilamentService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<FilamentSearchModalComponent>>;
  let logger: jasmine.SpyObj<LoggingService>;

  const BARCODE: Barcode = { value: '0849344041764', format: 'ean13' };
  const OCR: LabelOcrResult = {
    text: 'SUNLU PLA+ Silver 1kg',
    fields: { materialType: 'PLA+', weightG: 1000 },
    ms: 700,
    words: 12,
  };
  const response = (
    ownMatches: LabelReadResponse['ownMatches'],
    barcodes: Barcode[] = [BARCODE]
  ): LabelReadResponse => ({
    reading: {
      brand: 'SUNLU',
      materialType: 'PLA+',
      colorName: 'Silver',
      netWeightG: 1000,
      diameterMm: null,
      hotendMinC: null,
      hotendMaxC: null,
      bedMinC: null,
      bedMaxC: null,
    },
    catalogMatch: null,
    ownMatches,
    barcodes,
  });

  beforeEach(async () => {
    logger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    service = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'getFilamentDetail',
      'readLabel',
      'addBarcode',
    ]);
    service.getFilamentDetail.and.callFake((id: string) =>
      of({ ...buildDetail(), id, displayName: `Spool ${id}` })
    );
    dialogRef = jasmine.createSpyObj<
      MatDialogRef<FilamentSearchModalComponent>
    >('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [MatDialogModule, FilamentSearchModalComponent],
      providers: [
        { provide: LoggingService, useValue: logger },
        { provide: FilamentService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        {
          provide: ToastrService,
          useValue: jasmine.createSpyObj<ToastrService>('ToastrService', [
            'error',
            'warning',
          ]),
        },
      ],
    })
      .overrideComponent(FilamentSearchModalComponent, {
        remove: { imports: [FilamentListComponent, LabelScannerComponent] },
        add: {
          imports: [StubLabelScannerComponent],
          schemas: [NO_ERRORS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FilamentSearchModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.toggleViewMode();
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const scanner = () =>
    fixture.debugElement.query(By.directive(StubLabelScannerComponent))
      .componentInstance as StubLabelScannerComponent;
  const click = (testId: string, index = 0) => {
    (
      root().querySelectorAll(`[data-testid="${testId}"]`)[index] as HTMLElement
    ).click();
    fixture.detectChanges();
  };
  const closedWith = () =>
    dialogRef.close.calls.mostRecent().args[0] as FilamentSummary;

  it('selects the spool behind a 3D Print Log QR label', () => {
    scanner().ownLabel.emit('filament-1');

    expect(service.getFilamentDetail).toHaveBeenCalledWith('filament-1');
    expect(closedWith().id).toBe('filament-1');
    expect(closedWith().filamentRemaining).toBe(750000);
  });

  it('looks up the barcodes the camera sees', () => {
    service.readLabel.and.returnValue(of(response([])));

    scanner().barcodesChanged.emit([BARCODE]);

    expect(service.readLabel).toHaveBeenCalledOnceWith({ barcodes: [BARCODE] });
  });

  it('looks up a photo with its text and fields', () => {
    service.readLabel.and.returnValue(of(response([])));

    scanner().photo.emit({ barcodes: [BARCODE], ocr: OCR });

    expect(service.readLabel).toHaveBeenCalledOnceWith({
      barcodes: [BARCODE],
      ocrText: OCR.text,
      fields: OCR.fields,
    });
  });

  it('selects the one spool with that barcode directly', () => {
    service.readLabel.and.returnValue(
      of(response([{ filamentId: 'f1', score: 1, reasons: ['same-barcode'] }]))
    );

    scanner().barcodesChanged.emit([BARCODE]);

    expect(closedWith().id).toBe('f1');
  });

  it('lists several matches with why each one matched', () => {
    service.readLabel.and.returnValue(
      of(
        response([
          {
            filamentId: 'f1',
            score: 0.9,
            reasons: ['same-material', 'same-color-name', 'same-brand'],
          },
          { filamentId: 'f2', score: 0.6, reasons: ['same-weight'] },
        ])
      )
    );

    scanner().photo.emit({ barcodes: [BARCODE], ocr: OCR });
    fixture.detectChanges();

    const rows = root().querySelectorAll('[data-testid="label-match-row"]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Spool f1');
    expect(rows[0].textContent).toContain('Same material');
    expect(rows[0].textContent).toContain('Same color');
    expect(rows[0].textContent).toContain('Same brand');
    expect(rows[1].textContent).toContain('Same weight');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  describe('remembering the barcode', () => {
    beforeEach(() => {
      service.readLabel.and.returnValue(
        of(
          response([
            { filamentId: 'f1', score: 0.9, reasons: ['same-material'] },
            { filamentId: 'f2', score: 0.6, reasons: ['same-brand'] },
          ])
        )
      );
      scanner().photo.emit({ barcodes: [BARCODE], ocr: OCR });
      fixture.detectChanges();
      click('label-match-row', 1);
    });

    const checkbox = () =>
      root().querySelector(
        '[data-testid="label-remember"] input[type="checkbox"]'
      ) as HTMLInputElement;

    it('offers to remember the barcode, checked by default', () => {
      expect(root().textContent).toContain(
        'Remember this barcode for this spool'
      );
      expect(checkbox().checked).toBeTrue();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('saves the barcode, then selects the spool', () => {
      service.addBarcode.and.returnValue(of({ id: 1, ...BARCODE }));

      click('label-remember-confirm');

      expect(service.addBarcode).toHaveBeenCalledOnceWith('f2', BARCODE);
      expect(closedWith().id).toBe('f2');
    });

    it('selects without saving when unchecked', () => {
      checkbox().click();
      fixture.detectChanges();

      click('label-remember-confirm');

      expect(service.addBarcode).not.toHaveBeenCalled();
      expect(closedWith().id).toBe('f2');
    });

    it('still selects the spool when saving the barcode fails', () => {
      service.addBarcode.and.returnValue(throwError(() => new Error('x')));

      click('label-remember-confirm');

      expect(closedWith().id).toBe('f2');
      expect(logger.logEvent).toHaveBeenCalledWith('LabelScan_Error', {
        stage: 'remember',
      });
    });
  });

  it('selects a same-barcode match without asking to remember', () => {
    service.readLabel.and.returnValue(
      of(
        response([
          { filamentId: 'f1', score: 1, reasons: ['same-barcode'] },
          { filamentId: 'f2', score: 1, reasons: ['same-barcode'] },
        ])
      )
    );
    scanner().barcodesChanged.emit([BARCODE]);
    fixture.detectChanges();

    click('label-match-row', 0);

    expect(service.addBarcode).not.toHaveBeenCalled();
    expect(closedWith().id).toBe('f1');
  });

  it('says so when no spool matches the photo, and goes back to search', () => {
    service.readLabel.and.returnValue(of(response([])));

    scanner().photo.emit({ barcodes: [], ocr: OCR });
    fixture.detectChanges();

    expect(root().textContent).toContain('No matching spools');
    click('label-back');
    expect(component.viewMode()).toBe('list');
  });

  it('keeps scanning when no spool has the barcode yet', () => {
    service.readLabel.and.returnValue(of(response([])));

    scanner().barcodesChanged.emit([BARCODE]);
    fixture.detectChanges();

    expect(component.viewMode()).toBe('scanner');
    expect(root().textContent).toContain('Take a photo of the label');
  });

  it('shows an error when the lookup fails', () => {
    service.readLabel.and.returnValue(throwError(() => new Error('offline')));

    scanner().photo.emit({ barcodes: [], ocr: OCR });
    fixture.detectChanges();

    expect(root().textContent).toContain("Couldn't look up that label");
  });
});
