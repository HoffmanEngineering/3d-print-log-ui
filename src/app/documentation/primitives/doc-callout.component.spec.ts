import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocCalloutComponent, DocCalloutKind } from './doc-callout.component';

@Component({
  imports: [DocCalloutComponent],
  template: `
    <doc-callout [kind]="kind" [heading]="heading">
      <p>Body prose.</p>
    </doc-callout>
  `,
})
class HostComponent {
  kind: DocCalloutKind = 'note';
  heading = '';
}

describe('DocCalloutComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  // A fresh fixture per render: re-assigning a host field after the first
  // change-detection pass trips NG0100 rather than testing anything.
  const render = async (over: Partial<HostComponent> = {}) => {
    fixture = TestBed.createComponent(HostComponent);
    Object.assign(fixture.componentInstance, over);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const callout = (): HTMLElement =>
    fixture.nativeElement.querySelector('doc-callout');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it('projects the authored prose', async () => {
    await render();

    expect(callout().textContent).toContain('Body prose.');
  });

  it('carries a class and an icon for each kind', async () => {
    const kinds: [DocCalloutKind, string][] = [
      ['note', 'info'],
      ['tip', 'lightbulb'],
      ['warning', 'warning'],
      ['danger', 'report'],
    ];

    for (const [kind, icon] of kinds) {
      await render({ kind });

      expect(callout().className).toContain(`doc-callout-${kind}`);
      expect(
        callout().querySelector('.doc-callout__icon')?.textContent?.trim()
      ).toBe(icon);
    }
  });

  it('announces the kind in words, which colour and the icon do not', async () => {
    await render({ kind: 'danger' });

    expect(
      callout().querySelector('.cdk-visually-hidden')?.textContent?.trim()
    ).toBe('Important:');
  });

  it('falls back to a note when the kind is not one it knows', async () => {
    // `kind` is a plain attribute in doc Markdown, so a typo must still render
    // a callout rather than one with no icon at all.
    await render({ kind: 'wraning' as DocCalloutKind });

    expect(
      callout().querySelector('.doc-callout__icon')?.textContent?.trim()
    ).toBe('info');
  });

  it('renders the heading only when one is given', async () => {
    await render();
    expect(callout().querySelector('.doc-callout__heading')).toBeNull();

    await render({ heading: 'Copy the key first' });
    expect(
      callout().querySelector('.doc-callout__heading')?.textContent?.trim()
    ).toBe('Copy the key first');
  });

  it('is a note landmark, so it is reachable as an aside', async () => {
    await render();

    expect(callout().getAttribute('role')).toBe('note');
  });
});
