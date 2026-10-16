import { HttpErrorResponse } from '@angular/common/http';
import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { of, Subject, throwError } from 'rxjs';
import {
  FilamentDetail,
  FilamentService,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { TagReaderService } from 'src/app/core/services/tag-reader.service';
import { NfcStatus, TagRead } from 'src/app/core/types/native-bridge';
import { ScanSpoolSheetComponent } from './scan-spool-sheet.component';

describe('ScanSpoolSheetComponent', () => {
  let fixture: ComponentFixture<ScanSpoolSheetComponent>;
  let el: HTMLElement;
  let tags: Subject<TagRead>;
  let reader: {
    available: WritableSignal<boolean>;
    status: WritableSignal<NfcStatus>;
    listen: jasmine.Spy;
    forget: jasmine.Spy;
    openSettings: jasmine.Spy;
  };
  let filaments: jasmine.SpyObj<FilamentService>;
  let sheetRef: jasmine.SpyObj<MatBottomSheetRef<ScanSpoolSheetComponent>>;
  let logger: jasmine.SpyObj<LoggingService>;

  beforeEach(async () => {
    tags = new Subject<TagRead>();
    reader = {
      available: signal(true),
      status: signal<NfcStatus>('ready'),
      listen: jasmine.createSpy('listen').and.callFake(() => tags),
      forget: jasmine.createSpy('forget'),
      openSettings: jasmine.createSpy('openSettings').and.resolveTo(),
    };
    filaments = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'getFilamentByTag',
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScanSpoolSheetComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  const button = (testId: string) =>
    el.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!;

  function read(uid: string) {
    tags.next({ uid, tech: 'nfca' });
    fixture.detectChanges();
  }

  it('asks for a spool and listens', () => {
    expect(el.textContent).toContain('Hold your phone to a spool');
    expect(reader.listen).toHaveBeenCalledTimes(1);
    expect(tags.observed).toBeTrue();
  });

  it('a known tag dismisses with that spool', () => {
    filaments.getFilamentByTag.and.returnValue(
      of({ id: 'spool-1' } as FilamentDetail)
    );

    read('04A23F11');

    expect(sheetRef.dismiss).toHaveBeenCalledWith({
      kind: 'known',
      id: 'spool-1',
    });
    expect(logger.logEvent).toHaveBeenCalledWith('MaterialsScan_Known');
  });

  it('an unknown tag offers to link it or start a new material', () => {
    filaments.getFilamentByTag.and.returnValue(of(null));

    read('04A23F11');

    expect(el.textContent).toContain(
      "Tag 04A23F11 isn't on any of your spools"
    );
    expect(logger.logEvent).toHaveBeenCalledWith('MaterialsScan_Unknown');

    button('scan-link').click();
    expect(sheetRef.dismiss).toHaveBeenCalledWith({
      kind: 'link',
      uid: '04A23F11',
    });
  });

  it('New material with this tag dismisses with the UID', () => {
    filaments.getFilamentByTag.and.returnValue(of(null));
    read('04A23F11');

    button('scan-new').click();

    expect(sheetRef.dismiss).toHaveBeenCalledWith({
      kind: 'new',
      uid: '04A23F11',
    });
    expect(logger.logEvent).toHaveBeenCalledWith('MaterialsScan_NewChosen');
  });

  it('stops at the first tag', () => {
    filaments.getFilamentByTag.and.returnValue(of(null));
    read('04A23F11');
    read('04A23F12');

    expect(filaments.getFilamentByTag).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('04A23F11');
    // Unsubscribed, so the picker that opens next owns the reader.
    expect(tags.observed).toBeFalse();
  });

  it('a failed lookup says so, forgets the UID and keeps listening', () => {
    filaments.getFilamentByTag.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 0 })),
      of({ id: 'spool-1' } as FilamentDetail)
    );

    read('04A23F11');
    expect(el.textContent).toContain(
      "Couldn't look up that tag. Check your connection."
    );
    expect(reader.forget).toHaveBeenCalledWith('04A23F11');

    read('04A23F11');
    expect(sheetRef.dismiss).toHaveBeenCalledWith({
      kind: 'known',
      id: 'spool-1',
    });
  });

  it('offers Turn on while NFC is off', () => {
    reader.status.set('off');
    fixture.detectChanges();

    expect(el.textContent).toContain('NFC is off');
    button('nfc-turn-on').click();
    expect(reader.openSettings).toHaveBeenCalled();
  });

  it('Cancel dismisses with nothing', () => {
    button('scan-cancel').click();
    expect(sheetRef.dismiss).toHaveBeenCalledWith();
  });
});
