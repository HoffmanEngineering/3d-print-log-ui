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
          useValue: jasmine.createSpyObj('FilamentService', [
            'getFilamentByTag',
          ]),
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
  />`,
})
class ScanHostComponent {
  readonly control = new FormControl<string[]>([], { nonNullable: true });
  filamentId: string | null = 'this-spool';
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
      'getFilamentByTag',
    ]);
    filaments.getFilamentByTag.and.returnValue(of(null));
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

  function scan(uid: string) {
    scanButton()!.click();
    fixture.detectChanges();
    tags.next({ uid, tech: 'nfca' });
    fixture.detectChanges();
  }

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
    filaments.getFilamentByTag.and.returnValue(
      of({ id: 'other', displayName: 'Old Spool' } as FilamentDetail)
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

  it('this spool holding the tag is not a conflict', () => {
    filaments.getFilamentByTag.and.returnValue(
      of({ id: 'this-spool', displayName: 'Me' } as FilamentDetail)
    );

    scan('04A23F11');

    expect(el.querySelector('[data-testid="tag-uid-conflict"]')).toBeNull();
  });

  it('a failed lookup still adds the tag and forgets the UID', () => {
    filaments.getFilamentByTag.and.returnValue(
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
