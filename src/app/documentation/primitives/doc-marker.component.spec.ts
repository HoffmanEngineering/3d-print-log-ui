import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DOC_CAPTURE_MAP } from './doc-captures.token';
import { DocFigureComponent } from './doc-figure.component';
import { DocMarkerComponent } from './doc-marker.component';

const CAPTURES = {
  'print-list': {
    light: {
      src: '/assets/docs/captures/print-list_a1.webp',
      width: 1700,
      height: 900,
    },
    dark: {
      src: '/assets/docs/captures/print-list_dark_b2.webp',
      width: 1700,
      height: 900,
    },
  },
};

@Component({
  imports: [DocFigureComponent, DocMarkerComponent],
  template: `
    <doc-figure name="print-list" alt="The print list">
      <doc-marker x="7" y="9.7" label="Title"></doc-marker>
      <doc-marker [x]="secondX" y="15.5" label="Printer"></doc-marker>
    </doc-figure>
  `,
})
class AnnotatedHostComponent {
  secondX: number | string = 62.5;
}

@Component({
  imports: [DocFigureComponent],
  template: `<doc-figure name="print-list" alt="The print list"></doc-figure>`,
})
class PlainHostComponent {}

describe('DocMarkerComponent', () => {
  let fixture: ComponentFixture<AnnotatedHostComponent>;

  const render = async (over: Partial<AnnotatedHostComponent> = {}) => {
    fixture = TestBed.createComponent(AnnotatedHostComponent);
    Object.assign(fixture.componentInstance, over);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const markers = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('doc-marker'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnotatedHostComponent],
      providers: [{ provide: DOC_CAPTURE_MAP, useValue: CAPTURES }],
    }).compileComponents();
  });

  it('places each marker as a percentage, never a pixel offset', async () => {
    // The property that makes annotations worth having: a recapture at any
    // size leaves these coordinates valid, so a UI tweak is `capture:docs:all`
    // and nothing else.
    await render();

    expect(markers()[0].style.left).toBe('7%');
    expect(markers()[0].style.top).toBe('9.7%');
    expect(markers()[1].style.left).toBe('62.5%');
  });

  it('names the region in text a screen reader can reach', async () => {
    // The disc shows a bare ordinal, so without this a reader who cannot see
    // the figure gets "1" and no way to know what 1 points at.
    await render();

    expect(
      markers()[0].querySelector('.cdk-visually-hidden')?.textContent?.trim()
    ).toBe('Title');
  });

  it('keeps the numbered disc out of the accessibility tree', async () => {
    // Its digit is a CSS counter, which assistive technology exposes
    // inconsistently; the ordinal is carried by the list instead.
    await render();

    expect(
      markers()[0]
        .querySelector('.doc-marker__pin')
        ?.getAttribute('aria-hidden')
    ).toBe('true');
  });

  it('projects the markers into the figure list, in order', async () => {
    await render();

    const list = fixture.nativeElement.querySelector('.doc-figure__markers');
    expect(list.getAttribute('role')).toBe('list');
    expect(Array.from(list.children)).toEqual(markers());
    expect(markers().map((m) => m.getAttribute('role'))).toEqual([
      'listitem',
      'listitem',
    ]);
  });

  it('positions the overlay against the image and not the column', async () => {
    // A marker at x="50" has to land on the middle of the screenshot, not on
    // the middle of the prose measure the figure is as wide as.
    await render();

    const frame = fixture.nativeElement.querySelector('.doc-figure__frame');
    expect(frame.querySelectorAll('img').length).toBe(2);
    expect(frame.querySelector('.doc-figure__markers')).not.toBeNull();
  });
});

describe('DocFigureComponent, with no markers', () => {
  let fixture: ComponentFixture<PlainHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlainHostComponent],
      providers: [{ provide: DOC_CAPTURE_MAP, useValue: CAPTURES }],
    }).compileComponents();
    fixture = TestBed.createComponent(PlainHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('leaves the marker list empty, so CSS can take it out of the tree', () => {
    // `:empty` is half of how the overlay hides itself, and a stray whitespace
    // text node would defeat it. Angular's preserveWhitespaces default is what
    // keeps the template's indentation from becoming one.
    const list = fixture.nativeElement.querySelector('.doc-figure__markers');

    expect(list.childNodes.length).toBe(0);
  });
});
