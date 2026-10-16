import { HttpErrorResponse } from '@angular/common/http';
import { Component, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import {
  FilamentDetail,
  FilamentService,
} from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { TagReaderService } from 'src/app/core/services/tag-reader.service';
import { NfcStatus, TagRead } from 'src/app/core/types/native-bridge';
import {
  FilamentTagDetail,
  TagReadResponse,
  TagReading,
} from 'src/app/core/types/tag-reading';
import { TagUidConflict } from '../../tag-uid';
import { FilamentTagUidsComponent } from './filament-tag-uids.component';

@Component({
  imports: [FilamentTagUidsComponent, ReactiveFormsModule],
  template: `<app-filament-tag-uids
    [formControl]="control"
    [conflict]="conflict()"
  />`,
})
class HostComponent {
  readonly control = new FormControl<string[]>([], { nonNullable: true });
  readonly conflict = signal<TagUidConflict | null>(null);
}

describe('FilamentTagUidsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([]),
        {
          provide: TagReaderService,
          useValue: {
            available: signal(false),
            status: signal('unsupported'),
            listen: () => new Subject<TagRead>(),
            forget: () => {},
            openSettings: () => Promise.resolve(),
          },
        },
        {
          provide: FilamentService,
          useValue: jasmine.createSpyObj('FilamentService', ['resolveTagRead']),
        },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  const input = () =>
    el.querySelector<HTMLInputElement>('input[data-testid="tag-uid-input"]')!;
  const chipTexts = () =>
    Array.from(el.querySelectorAll('[data-testid="tag-uid-chip"]')).map((c) =>
      c.textContent!.replace('cancel', '').trim()
    );

  function type(value: string) {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function pressEnter(): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });
    input().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  it('shows the tags already on the spool', () => {
    host.control.setValue(['04A23F11', 'DEADBEEF']);
    fixture.detectChanges();

    expect(chipTexts()).toEqual(['04A23F11', 'DEADBEEF']);
  });

  it('adds a typed UID in its normalized form and marks the control dirty', () => {
    type('04:a2:3f:11');
    pressEnter();

    expect(host.control.value).toEqual(['04A23F11']);
    expect(host.control.dirty).toBeTrue();
    expect(chipTexts()).toEqual(['04A23F11']);
    expect(input().value).toBe('');
  });

  it('does not let Enter submit the surrounding form', () => {
    type('04A23F11');

    expect(pressEnter().defaultPrevented).toBeTrue();
  });

  it('adds the pending UID when the field loses focus', () => {
    type('04-A2-3F-11');
    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.control.value).toEqual(['04A23F11']);
  });

  it('refuses an invalid UID and says why', () => {
    type('04A23F1');
    pressEnter();

    expect(host.control.value).toEqual([]);
    expect(
      el.querySelector('[data-testid="tag-uid-error"]')?.textContent
    ).toContain('even number of hex digits');
    expect(input().value).toBe('04A23F1');
  });

  it('keeps the control invalid while a refused UID is in the field', () => {
    type('04A23F1');
    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.control.valid).toBeFalse();
    expect(host.control.errors?.['tagUidDraft']).toContain(
      'even number of hex digits'
    );

    type('');

    expect(host.control.valid).toBeTrue();
  });

  it('merges a UID already on this spool in another format', () => {
    host.control.setValue(['04A23F11']);
    fixture.detectChanges();

    type('04:a2:3f:11');
    pressEnter();

    expect(host.control.value).toEqual(['04A23F11']);
    expect(input().value).toBe('');
  });

  it('removes a tag', () => {
    host.control.setValue(['04A23F11', 'DEADBEEF']);
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>(
      'button[aria-label="Remove tag 04A23F11"]'
    )!.click();
    fixture.detectChanges();

    expect(host.control.value).toEqual(['DEADBEEF']);
    expect(host.control.dirty).toBeTrue();
  });

  it('stops accepting tags at the 16-tag cap', () => {
    host.control.setValue(
      Array.from({ length: 16 }, (_, i) => i.toString(16).padStart(2, '0'))
    );
    fixture.detectChanges();

    expect(input().disabled).toBeTrue();
  });

  it('names and links the spool that already holds a conflicting tag', () => {
    host.control.setValue(['04A23F11']);
    host.conflict.set({
      tagUid: '04A23F11',
      filamentId: 'other-spool',
      filamentDisplayName: 'Blue PLA',
    });
    fixture.detectChanges();

    const message = el.querySelector('[data-testid="tag-uid-conflict"]')!;
    expect(message.textContent).toContain('04A23F11');
    expect(message.textContent).toContain('Blue PLA');
    const link = message.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/filament/other-spool');
  });
});

@Component({
  imports: [FilamentTagUidsComponent, ReactiveFormsModule],
  template: `<app-filament-tag-uids
    [formControl]="control"
    [filamentId]="filamentId"
    (readingsChange)="readings = $event"
  />`,
})
class ScanHostComponent {
  readonly control = new FormControl<string[]>([], { nonNullable: true });
  filamentId: string | null = 'this-spool';
  readings: { uid: string; reading: TagReading }[] = [];
}

const SCANNED_READING: TagReading = {
  format: 'snapmaker',
  decoderVersion: 1,
  materialType: 'PLA',
};

function unknownTag(reading: TagReading | null = null): TagReadResponse {
  return {
    status: 'unknown',
    filament: null,
    reading,
    catalogMatch: null,
    suggestions: [],
    hint: null,
  };
}

function linkedTo(id: string, displayName: string): TagReadResponse {
  return {
    ...unknownTag(),
    status: 'linked',
    filament: { id, displayName } as FilamentDetail,
  };
}

describe('FilamentTagUidsComponent scanning', () => {
  let fixture: ComponentFixture<ScanHostComponent>;
  let host: ScanHostComponent;
  let el: HTMLElement;
  let tags: Subject<TagRead>;
  let reader: {
    available: WritableSignal<boolean>;
    status: WritableSignal<NfcStatus>;
    listen: () => Subject<TagRead>;
    forget: jasmine.Spy;
    openSettings: jasmine.Spy;
  };
  let filaments: jasmine.SpyObj<FilamentService>;
  let logger: jasmine.SpyObj<LoggingService>;

  beforeEach(async () => {
    tags = new Subject<TagRead>();
    reader = {
      available: signal(true),
      status: signal<NfcStatus>('ready'),
      listen: () => tags,
      forget: jasmine.createSpy('forget'),
      openSettings: jasmine.createSpy('openSettings').and.resolveTo(),
    };
    filaments = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'resolveTagRead',
    ]);
    filaments.resolveTagRead.and.returnValue(of(unknownTag()));
    logger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);

    await TestBed.configureTestingModule({
      imports: [ScanHostComponent],
      providers: [
        provideRouter([]),
        { provide: TagReaderService, useValue: reader },
        { provide: FilamentService, useValue: filaments },
        { provide: LoggingService, useValue: logger },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScanHostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  const scanButton = () =>
    el.querySelector<HTMLButtonElement>('[data-testid="tag-scan"]');
  const input = () =>
    el.querySelector<HTMLInputElement>('input[data-testid="tag-uid-input"]')!;
  const chipTexts = () =>
    Array.from(el.querySelectorAll('[data-testid="tag-uid-chip"]')).map((c) =>
      c.textContent!.replace('cancel', '').trim()
    );

  function scan(uid: string, extra: Partial<TagRead> = {}) {
    scanButton()!.click();
    fixture.detectChanges();
    tags.next({ uid, tech: 'nfca', ...extra });
    fixture.detectChanges();
  }

  it('looks the tag up with the whole read, memory included', () => {
    const memory = { kind: 'classic' as const, data: 'AAAA' };

    scan('805BEC3E', { techs: ['NfcA'], memory });

    expect(filaments.resolveTagRead).toHaveBeenCalledOnceWith({
      uid: '805BEC3E',
      tech: 'nfca',
      techs: ['NfcA'],
      memory,
    });
  });

  it('hands the parent what a new tag says, by UID', () => {
    filaments.resolveTagRead.and.returnValue(of(unknownTag(SCANNED_READING)));

    scan('805BEC3E', { memory: { kind: 'classic', data: 'AAAA' } });

    expect(host.readings).toEqual([
      { uid: '805BEC3E', reading: SCANNED_READING },
    ]);
  });

  it('keeps one reading per UID across scans', () => {
    const second: TagReading = { ...SCANNED_READING, materialType: 'PETG' };
    filaments.resolveTagRead.and.returnValues(
      of(unknownTag(SCANNED_READING)),
      of(unknownTag(second))
    );

    scan('805BEC3E');
    scan('04A23F11');

    expect(host.readings).toEqual([
      { uid: '805BEC3E', reading: SCANNED_READING },
      { uid: '04A23F11', reading: second },
    ]);
  });

  it('hands the parent nothing for a tag without a reading', () => {
    scan('04A23F11');

    expect(host.readings).toEqual([]);
    expect(chipTexts()).toEqual(['04A23F11']);
  });

  it('keeps no reading for a tag another spool holds', () => {
    filaments.resolveTagRead.and.returnValue(
      of({ ...linkedTo('other', 'Old Spool'), reading: SCANNED_READING })
    );

    scan('805BEC3E');

    expect(host.readings).toEqual([]);
  });

  it('Scan adds the UID it reads without touching what was being typed', () => {
    input().value = '04:a2';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    scan('04A23F11');

    expect(chipTexts()).toEqual(['04A23F11']);
    expect(host.control.value).toEqual(['04A23F11']);
    expect(input().value).toBe('04:a2');
    expect(logger.logEvent).toHaveBeenCalledWith('FilamentTagUids_Scanned');
  });

  it('says so while it is waiting for a tag', () => {
    scanButton()!.click();
    fixture.detectChanges();

    expect(input().placeholder).toBe('Hold your phone to the tag…');
  });

  it('reads one tag per press', () => {
    scan('04A23F11');
    tags.next({ uid: '04A23F12', tech: 'nfca' });
    fixture.detectChanges();

    expect(chipTexts()).toEqual(['04A23F11']);
  });

  it('pressing Scan again cancels', () => {
    scanButton()!.click();
    fixture.detectChanges();
    scanButton()!.click();
    fixture.detectChanges();
    tags.next({ uid: '04A23F11', tech: 'nfca' });
    fixture.detectChanges();

    expect(chipTexts()).toEqual([]);
    expect(input().placeholder).toBe('04:A2:3F:11');
  });

  it('a tag already on the spool gets a hint, not silence', () => {
    host.control.setValue(['04A23F11']);
    fixture.detectChanges();

    scan('04A23F11');

    expect(chipTexts()).toEqual(['04A23F11']);
    expect(el.textContent).toContain('That tag is already on this spool');
  });

  it('shows a conflict at scan time when another spool holds the tag', () => {
    filaments.resolveTagRead.and.returnValue(
      of(linkedTo('other', 'Old Spool'))
    );

    scan('04A23F11');

    expect(chipTexts()).toEqual(['04A23F11']);
    expect(
      el.querySelector('[data-testid="tag-uid-conflict"]')!.textContent
    ).toContain('Old Spool');
    expect(logger.logEvent).toHaveBeenCalledWith('TagReader_Lookup', {
      known: true,
    });
  });

  it('a conflict that answers after its chip was removed is not shown', () => {
    const lookup = new Subject<TagReadResponse>();
    filaments.resolveTagRead.and.returnValue(lookup);

    scan('04A23F11');
    el.querySelector<HTMLElement>(
      '[data-testid="tag-uid-chip"] button'
    )!.click();
    lookup.next(linkedTo('other', 'Old Spool'));
    fixture.detectChanges();

    expect(chipTexts()).toEqual([]);
    expect(el.querySelector('[data-testid="tag-uid-conflict"]')).toBeNull();
  });

  it('loading another value clears a scan-time conflict', () => {
    filaments.resolveTagRead.and.returnValue(
      of(linkedTo('other', 'Old Spool'))
    );
    scan('04A23F11');

    host.control.setValue([]);
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="tag-uid-conflict"]')).toBeNull();
  });

  it('disabling the control mid-scan stops the scan', () => {
    scanButton()!.click();
    fixture.detectChanges();
    host.control.disable();
    fixture.detectChanges();
    tags.next({ uid: '04A23F11', tech: 'nfca' });
    host.control.enable();
    fixture.detectChanges();

    expect(chipTexts()).toEqual([]);
    expect(input().placeholder).toBe('04:A2:3F:11');
  });

  it('this spool holding the tag is not a conflict', () => {
    filaments.resolveTagRead.and.returnValue(of(linkedTo('this-spool', 'Me')));

    scan('04A23F11');

    expect(el.querySelector('[data-testid="tag-uid-conflict"]')).toBeNull();
  });

  it('a failed lookup still adds the tag and forgets the UID', () => {
    filaments.resolveTagRead.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 503 }))
    );

    scan('04A23F11');

    expect(chipTexts()).toEqual(['04A23F11']);
    expect(reader.forget).toHaveBeenCalledWith('04A23F11');
    expect(logger.logEvent).toHaveBeenCalledWith('TagReader_LookupFailed', {
      status: 503,
    });
  });

  it('hides Scan when tags cannot be read', () => {
    reader.available.set(false);
    fixture.detectChanges();
    expect(scanButton()).toBeNull();
  });

  it('hides Scan while the control is disabled', () => {
    host.control.disable();
    fixture.detectChanges();
    expect(scanButton()).toBeNull();
  });

  it('hides Scan at the cap', () => {
    host.control.setValue(
      Array.from(
        { length: 16 },
        (_, i) => `AA${i.toString(16).padStart(2, '0')}`
      )
    );
    fixture.detectChanges();
    expect(scanButton()).toBeNull();
  });
});

@Component({
  imports: [FilamentTagUidsComponent, ReactiveFormsModule],
  template: `<app-filament-tag-uids
    [formControl]="control"
    [tagDetails]="details()"
    [catalogEntryId]="catalogEntryId()"
  />`,
})
class DetailsHostComponent {
  readonly control = new FormControl<string[]>(['805BEC3E', 'DEADBEEF'], {
    nonNullable: true,
  });
  readonly details = signal<FilamentTagDetail[]>([]);
  readonly catalogEntryId = signal<string | null>(null);
}

describe('FilamentTagUidsComponent tag details', () => {
  let fixture: ComponentFixture<DetailsHostComponent>;
  let host: DetailsHostComponent;
  let el: HTMLElement;

  const snapmaker: FilamentTagDetail = {
    uid: '805BEC3E',
    format: 'snapmaker',
    lastReadAt: null,
    reading: {
      format: 'snapmaker',
      sku: '900001',
      manufacturedOn: '2026-03-12',
      dryTempC: 55,
      dryHours: 6,
      hotendMinC: 190,
      hotendMaxC: 230,
      bedMinC: 60,
      bedMaxC: 60,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsHostComponent],
      providers: [
        provideRouter([]),
        {
          provide: TagReaderService,
          useValue: { available: signal(false), status: signal('unsupported') },
        },
        {
          provide: FilamentService,
          useValue: jasmine.createSpyObj('FilamentService', ['resolveTagRead']),
        },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DetailsHostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
  });

  const details = () =>
    Array.from(el.querySelectorAll('[data-testid="tag-uid-detail"]')).map((d) =>
      d.textContent!.replace(/\s+/g, ' ').trim()
    );

  it('shows what a Snapmaker tag says under its UID', () => {
    host.details.set([snapmaker]);
    fixture.detectChanges();

    const text = details();
    expect(text.length).toBe(1);
    expect(text[0]).toContain('805BEC3E');
    expect(text[0]).toContain('Snapmaker tag');
    expect(text[0]).toContain('SKU 900001');
    expect(text[0]).toContain('Made 2026-03-12');
    expect(text[0]).toContain('Dry at 55 °C for 6 h');
    expect(text[0]).toContain('Tag says 190\u2013230 °C, bed 60 °C');
  });

  it('matches a detail to its row by normalized UID, whatever the order', () => {
    host.control.setValue(['DEADBEEF', '80:5b:ec:3e']);
    host.details.set([snapmaker]);
    fixture.detectChanges();

    expect(details().length).toBe(1);
    expect(details()[0]).toContain('SKU 900001');
  });

  it('leaves out fields the reading does not carry', () => {
    host.details.set([
      {
        uid: '805BEC3E',
        format: 'openspool',
        lastReadAt: null,
        reading: { format: 'openspool', hotendC: 210 },
      },
    ]);
    fixture.detectChanges();

    const text = details()[0];
    expect(text).toContain('OpenSpool tag');
    expect(text).toContain('Tag says 210 °C');
    expect(text).not.toContain('SKU');
    expect(text).not.toContain('Made');
    expect(text).not.toContain('Dry');
    expect(text).not.toContain('bed');
  });

  it('a tag without a reading renders only its UID', () => {
    host.details.set([
      { uid: '805BEC3E', format: null, reading: null, lastReadAt: null },
    ]);
    fixture.detectChanges();

    expect(details()).toEqual([]);
    expect(el.querySelectorAll('[data-testid="tag-uid-chip"]').length).toBe(2);
  });

  it('credits SpoolmanDB once when the material came from the catalog', () => {
    host.details.set([snapmaker]);
    host.catalogEntryId.set('cat-1');
    fixture.detectChanges();

    const links = el.querySelectorAll<HTMLAnchorElement>(
      'a[href="https://github.com/Donkie/SpoolmanDB"]'
    );
    expect(links.length).toBe(1);
    expect(links[0].textContent).toContain('Spool data: SpoolmanDB');
    expect(links[0].target).toBe('_blank');
    expect(links[0].rel).toContain('noopener');
  });

  for (const bad of ['2026-13-45', '2026-02-30', 'not-a-date']) {
    it(`omits the Made line for ${bad} without an error`, () => {
      host.details.set([
        {
          ...snapmaker,
          reading: { ...snapmaker.reading!, manufacturedOn: bad },
        },
      ]);
      fixture.detectChanges();

      expect(details()[0]).toContain('SKU 900001');
      expect(details()[0]).not.toContain('Made');
    });
  }

  it('omits parts the API sent as explicit nulls', () => {
    host.details.set([
      {
        ...snapmaker,
        reading: {
          format: 'snapmaker',
          sku: null,
          dryTempC: 55,
          dryHours: null,
          hotendMinC: 190,
          hotendMaxC: 230,
          bedMinC: null,
        } as unknown as TagReading,
      },
    ]);
    fixture.detectChanges();

    const text = details()[0];
    expect(text).not.toContain('SKU');
    expect(text).toContain('Dry at 55 °C');
    expect(text).not.toContain(' for ');
    expect(text).toContain('Tag says 190–230 °C');
    expect(text).not.toContain('bed');
  });

  it('shows no attribution without a catalog entry', () => {
    fixture.detectChanges();
    expect(el.textContent).not.toContain('SpoolmanDB');
  });
});
