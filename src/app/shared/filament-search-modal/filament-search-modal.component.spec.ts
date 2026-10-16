import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, WritableSignal, signal } from '@angular/core';
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
        remove: { imports: [FilamentListComponent] },
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

  describe('handleQrScanned', () => {
    it('keeps the remaining filament values from the scanned material', () => {
      mockFilamentService.getFilamentDetail.and.returnValue(of(buildDetail()));

      component.handleQrScanned({
        success: true,
        filamentId: 'filament-1',
        rawText: 'https://www.3dprintlog.com/materials/filament-1',
      });

      expect(mockDialogRef.close).toHaveBeenCalled();
      const selected = mockDialogRef.close.calls.mostRecent().args[0];
      expect(selected.filamentRemaining).toBe(750000);
      expect(selected.filamentLengthRemainingInM).toBe(248);
      expect(selected.filamentVolumeRemainingInMl).toBe(605);
    });

    it('keeps the remaining values when adding in multi-select mode', () => {
      component.data.multiSelect = true;
      mockFilamentService.getFilamentDetail.and.returnValue(of(buildDetail()));

      component.handleQrScanned({
        success: true,
        filamentId: 'filament-1',
        rawText: 'https://www.3dprintlog.com/materials/filament-1',
      });

      expect(component.selectedFilaments()[0].filamentRemaining).toBe(750000);
    });
  });

  it('shows why a scanned label was rejected', () => {
    component.toggleViewMode();
    fixture.detectChanges();

    component.handleQrScanned({ success: false, rawText: 'hello' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'This QR code is not a 3D Print Log filament label'
    );
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

      component.handleQrScanned({
        success: true,
        filamentId: 'filament-1',
        rawText: 'https://www.3dprintlog.com/materials/filament-1',
      });

      expect(component.selectedIds().has('filament-1')).toBeTrue();
    });

    it('a QR pick survives a later checkbox click on another row', () => {
      mockFilamentService.getFilamentDetail.and.returnValue(of(buildDetail()));
      component.handleQrScanned({
        success: true,
        filamentId: 'filament-1',
        rawText: 'https://www.3dprintlog.com/materials/filament-1',
      });

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
    };
    filaments = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'getCurrentUserFilamentSummaries',
      'getFilamentDetail',
      'getFilamentByTag',
      'addTagToFilament',
    ]);
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

    // The visible text; the UID is set in <code>.
    expect(lastDialogData().body.replace(/<[^>]+>/g, '')).toContain(
      'Add tag 04A23F11 to Test Filament?'
    );
    expect(lastDialogData().yesText).toBe('Add tag and select');
    expect(lastDialogData().noText).toBe('Just select');
    expect(filaments.addTagToFilament).toHaveBeenCalledWith(
      'filament-1',
      '04A23F11'
    );
    expect(dialogRef.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'filament-1' })
    );
    expect(component.pendingTagUid()).toBeNull();
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
        '04A23F11'
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
