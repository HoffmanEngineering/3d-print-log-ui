import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

@Component({
  template: `<app-skeleton
    [width]="'50%'"
    [height]="'2rem'"
    [radius]="'999px'"
  />`,
  imports: [SkeletonComponent],
})
class HostComponent {}

describe('SkeletonComponent', () => {
  it('sizes the host from its inputs', async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const host: HTMLElement =
      fixture.nativeElement.querySelector('app-skeleton');
    expect(host.style.inlineSize).toBe('50%');
    expect(host.style.blockSize).toBe('2rem');
    expect(host.style.borderRadius).toBe('999px');
  });

  // A screen reader must hear the container's single "Loading …", not one
  // announcement per grey box.
  it('is hidden from assistive technology', async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });
});
