import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YouTubePlayer } from '@angular/youtube-player';

import { DocVideoComponent } from './doc-video.component';

@Component({
  imports: [DocVideoComponent],
  template: `
    <doc-video
      videoId="E3kHsxSkBAw"
      title="Setting up the OctoPrint webhook"
    ></doc-video>
  `,
})
class HostComponent {}

describe('DocVideoComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('plays the video it was given', () => {
    const player = fixture.debugElement.query(
      (node) => node.name === 'youtube-player'
    ).componentInstance as YouTubePlayer;

    expect(player.videoId).toBe('E3kHsxSkBAw');
  });

  it('gives the embed an accessible name', () => {
    // A bare <youtube-player> is announced as an unlabelled frame with an
    // unlabelled play button.
    const player = fixture.debugElement.query(
      (node) => node.name === 'youtube-player'
    ).componentInstance as YouTubePlayer;

    expect(player.placeholderButtonLabel).toBe(
      'Play video: Setting up the OctoPrint webhook'
    );
  });

  it('captions the video with what it shows', () => {
    expect(
      fixture.nativeElement.querySelector('figcaption')?.textContent?.trim()
    ).toBe('Setting up the OctoPrint webhook');
  });

  it('sizes the player from a 16:9 box rather than fixed pixels', () => {
    // youtube-player defaults to 640x390, which overflows the measure.
    expect(
      fixture.nativeElement.querySelector('.doc-video__frame')
    ).not.toBeNull();
  });
});
