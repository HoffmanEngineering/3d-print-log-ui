import type { Mock, MockedObject } from 'vitest';
import { ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, of } from 'rxjs';
import {
  FilamentService,
  FilamentSummary,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { TagReaderService } from 'src/app/core/services/tag-reader.service';
import { FilamentSearchModalComponent } from 'src/app/shared/filament-search-modal/filament-search-modal.component';
import { FilamentListContainerComponent } from './filament-list-container.component';
import { ScanSpoolResult } from './scan-spool-sheet/scan-spool-sheet.component';

/** Where the Materials list's Scan spool sheet sends the user. */
describe('FilamentListContainerComponent Scan spool', () => {
  let component: FilamentListContainerComponent;
  let router: {
    events: typeof EMPTY;
    navigate: Mock;
  };
  let sheet: MockedObject<MatBottomSheet>;
  let dialog: MockedObject<MatDialog>;
  let logger: MockedObject<LoggingService>;
  let available: ReturnType<typeof signal<boolean>>;

  function sheetAnswers(result: ScanSpoolResult | undefined) {
    sheet.open.mockReturnValue({
      afterDismissed: () => of(result),
    } as never);
  }

  function pickerAnswers(result: FilamentSummary | null) {
    dialog.open.mockReturnValue({
      afterClosed: () => of(result),
    } as never);
  }

  beforeEach(() => {
    router = {
      events: EMPTY,
      navigate: vi.fn().mockResolvedValue(true),
    };
    sheet = {
      open: vi.fn().mockName('MatBottomSheet.open'),
    } as unknown as MockedObject<MatBottomSheet>;
    dialog = {
      open: vi.fn().mockName('MatDialog.open'),
    } as unknown as MockedObject<MatDialog>;
    logger = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
    } as unknown as MockedObject<LoggingService>;
    available = signal(true);

    TestBed.configureTestingModule({
      providers: [
        // Built outside a view, so there is none to mark: a no-op stands in.
        {
          provide: ChangeDetectorRef,
          useValue: { markForCheck: () => undefined },
        },
        { provide: ActivatedRoute, useValue: {} },
        { provide: FilamentService, useValue: null },
        { provide: Title, useValue: null },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: dialog },
        { provide: MatBottomSheet, useValue: sheet },
        { provide: ToastrService, useValue: null },
        { provide: LoggingService, useValue: logger },
        {
          provide: TagReaderService,
          useValue: { available, status: signal('ready') },
        },
      ],
    });
    component = TestBed.runInInjectionContext(
      () => new FilamentListContainerComponent()
    );
  });

  it('offers Scan spool only when tags can be read', () => {
    expect(component.canScan()).toBe(true);
    available.set(false);
    expect(component.canScan()).toBe(false);
  });

  it('a known tag opens that spool', () => {
    sheetAnswers({ kind: 'known', id: 'spool-1' });

    component.openScanSpool();

    expect(logger.logEvent).toHaveBeenCalledWith('MaterialsScan_Opened');
    expect(router.navigate).toHaveBeenCalledWith(['/materials', 'spool-1']);
  });

  it('a tag linked in the sheet opens that spool', () => {
    sheetAnswers({ kind: 'linked', id: 'spool-3' });

    component.openScanSpool();

    expect(router.navigate).toHaveBeenCalledWith(['/materials', 'spool-3']);
  });

  it('Search all materials opens the picker with the tag and its reading, then that spool', () => {
    const reading = { format: 'snapmaker', materialType: 'PLA' };
    sheetAnswers({ kind: 'link', uid: '04A23F11', reading });
    pickerAnswers({ id: 'spool-2' } as FilamentSummary);

    component.openScanSpool();

    expect(dialog.open).toHaveBeenCalledWith(
      FilamentSearchModalComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          pendingTagUid: '04A23F11',
          pendingTagReading: reading,
        }),
      })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/materials', 'spool-2']);
  });

  it('closing the picker without a spool stays on the list', () => {
    sheetAnswers({ kind: 'link', uid: '04A23F11', reading: null });
    pickerAnswers(null);

    component.openScanSpool();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('Create starts a material with the tag, its reading and the catalog match', () => {
    const reading = { format: 'snapmaker', materialType: 'PLA' };
    const catalogMatch = {
      id: 'cat-1',
      confidence: 0.9,
      spoolWeightG: 140,
      colorName: 'Pink',
      name: 'SnapSpeed PLA',
      manufacturer: 'Snapmaker',
      source: 'SpoolmanDB' as const,
    };
    sheetAnswers({ kind: 'new', uid: '04A23F11', reading, catalogMatch });

    component.openScanSpool();

    // In navigation state, never the URL: page views must not carry the UID.
    expect(router.navigate).toHaveBeenCalledWith(['/materials', 'new'], {
      state: {
        scannedTagUid: '04A23F11',
        scannedTagRead: { reading, catalogMatch },
      },
    });
  });

  it('Cancel does nothing', () => {
    sheetAnswers(undefined);

    component.openScanSpool();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
  });
});
