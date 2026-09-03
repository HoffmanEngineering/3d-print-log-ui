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

  it('lays the overlay exactly over the image box', async () => {
    // The percentages are meaningless unless the overlay's box IS the image's
    // box. Asserted as geometry rather than as shared parentage: a structural
    // check still passes with `position` or `inset` deleted, and then every
    // marker on every figure silently moves.
    await render();

    const frame = fixture.nativeElement.querySelector('.doc-figure__frame');
    const list = fixture.nativeElement.querySelector('.doc-figure__markers');

    expect(getComputedStyle(frame).position).toBe('relative');
    expect(getComputedStyle(list).position).toBe('absolute');

    const box = frame.getBoundingClientRect();
    const overlay = list.getBoundingClientRect();
    expect(overlay.width).toBeCloseTo(box.width, 0);
    expect(overlay.height).toBeCloseTo(box.height, 0);
    expect(overlay.left).toBeCloseTo(box.left, 0);
    expect(overlay.top).toBeCloseTo(box.top, 0);
  });
});

@Component({
  imports: [DocFigureComponent, DocMarkerComponent],
  // A container far wider than the image, which is what makes the frame's
  // `fit-content` observable: a plain block frame would fill this width.
  template: `
    <div style="width: 800px">
      <doc-figure name="narrow" alt="A narrow figure">
        <doc-marker x="50" y="50" label="The middle"></doc-marker>
      </doc-figure>
    </div>
  `,
})
class WideColumnHostComponent {}

describe('DocFigureComponent, in a column wider than its image', () => {
  let fixture: ComponentFixture<WideColumnHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WideColumnHostComponent],
      providers: [
        {
          provide: DOC_CAPTURE_MAP,
          useValue: {
            narrow: {
              light: { src: '/assets/a.webp', width: 200, height: 120 },
              dark: { src: '/assets/a_dark.webp', width: 200, height: 120 },
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(WideColumnHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('sizes the marker frame to the image, not to the column', () => {
    // Without `width: fit-content` the frame spans the full 800px column, and a
    // marker at x="50" lands 400px in — off the 200px screenshot entirely,
    // which is the bug this figure shape exists to prevent.
    const frame = fixture.nativeElement.querySelector('.doc-figure__frame');
    const image = fixture.nativeElement.querySelector(
      '.doc-figure__img--light'
    );

    expect(frame.getBoundingClientRect().width).toBeCloseTo(
      image.getBoundingClientRect().width,
      1
    );
    expect(frame.getBoundingClientRect().width).toBeLessThan(800);
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

  it('takes the empty marker list out of the accessibility tree', () => {
    // The end the rule exists for, asserted directly: an empty `role="list"`
    // left in the tree announces itself on every unannotated figure in the
    // docs. `display: none` is what keeps it out.
    const list = fixture.nativeElement.querySelector('.doc-figure__markers');

    expect(getComputedStyle(list).display).toBe('none');
  });

  it('leaves no whitespace text node that would defeat the :empty rule', () => {
    // The mechanism behind the assertion above, pinned separately because it is
    // the fragile half: `:empty` matches nothing once the template's
    // indentation reaches the DOM. Angular's preserveWhitespaces default is
    // what strips it, and this fails the day that changes.
    const list = fixture.nativeElement.querySelector('.doc-figure__markers');

    expect(list.childNodes.length).toBe(0);
  });
});
