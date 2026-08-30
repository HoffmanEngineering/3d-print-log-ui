import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

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
