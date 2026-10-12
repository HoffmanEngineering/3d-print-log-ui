import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
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
      providers: [provideRouter([])],
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
