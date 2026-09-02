import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DOC_CAPTURE_MAP } from './doc-captures.token';
import { DocFigureComponent } from './doc-figure.component';

@Component({
  imports: [DocFigureComponent],
  template: `
    <doc-figure
      src="./assets/docs/print-screen.png"
      alt="The list of prints shown in the Android App"
      width="1080"
      height="1920"
      [caption]="caption"
    />
  `,
})
class HostComponent {
  caption = '';
}

describe('DocFigureComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  // A fresh fixture per render: re-assigning a host field after the first
  // change-detection pass trips NG0100 rather than testing anything.
  const render = async (over: Partial<HostComponent> = {}) => {
    fixture = TestBed.createComponent(HostComponent);
    Object.assign(fixture.componentInstance, over);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const img = (): HTMLImageElement =>
    fixture.nativeElement.querySelector('img');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it('describes the screenshot for a reader who cannot see it', async () => {
    await render();

    expect(img().getAttribute('alt')).toBe(
      'The list of prints shown in the Android App'
    );
  });

  it('reserves the image box before the file loads', async () => {
    // Without intrinsic dimensions every screenshot on the page reflows the
    // prose under it as it arrives.
    await render();

    expect(img().getAttribute('width')).toBe('1080');
    expect(img().getAttribute('height')).toBe('1920');
  });

  it('defers loading, since a screenshot is rarely above the fold', async () => {
    await render();

    expect(img().getAttribute('loading')).toBe('lazy');
  });

  it('renders a caption only when one is given', async () => {
    await render();
    expect(fixture.nativeElement.querySelector('figcaption')).toBeNull();

    await render({ caption: 'Prints, as the mobile app shows them' });
    expect(
      fixture.nativeElement.querySelector('figcaption')?.textContent?.trim()
    ).toBe('Prints, as the mobile app shows them');
  });
});

@Component({
  imports: [DocFigureComponent],
  template: ` <doc-figure [name]="name" alt="The print list"></doc-figure> `,
})
class NamedHostComponent {
  name = 'print-list';
}

describe('DocFigureComponent, naming a generated capture', () => {
  let fixture: ComponentFixture<NamedHostComponent>;

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

  const render = async (over: Partial<NamedHostComponent> = {}) => {
    fixture = TestBed.createComponent(NamedHostComponent);
    Object.assign(fixture.componentInstance, over);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const images = (): HTMLImageElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('img'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NamedHostComponent],
      providers: [{ provide: DOC_CAPTURE_MAP, useValue: CAPTURES }],
    }).compileComponents();
  });

  it('resolves the src and both intrinsic dimensions from the name', async () => {
    // The point of naming a figure: an author cannot hardcode a size that the
    // next recapture invalidates.
    await render();

    expect(images()[0].getAttribute('src')).toBe(
      '/assets/docs/captures/print-list_a1.webp'
    );
    expect(images()[0].getAttribute('width')).toBe('1700');
    expect(images()[0].getAttribute('height')).toBe('900');
  });

  it('renders both themes, letting CSS pick', async () => {
    // Not `@if (isDark())`: the pre-paint script has already set the class by
    // first paint, while a signal only settles at hydration.
    await render();

    expect(images().length).toBe(2);
    expect(images()[1].getAttribute('src')).toBe(
      '/assets/docs/captures/print-list_dark_b2.webp'
    );
    expect(images()[0].classList).toContain('doc-figure__img--light');
    expect(images()[1].classList).toContain('doc-figure__img--dark');
  });

  it('renders no image at all on an unresolvable name', async () => {
    // validate-docs fails the build on this; a doc page is not the place to
    // discover that a gate upstream was skipped. An <img src=""> would be
    // worse than nothing — the browser re-requests the current page as the
    // image.
    await render({ name: 'not-captured' });

    expect(images().length).toBe(0);
  });
});
