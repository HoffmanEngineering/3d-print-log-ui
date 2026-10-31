import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { KlipperLandingComponent } from './klipper-landing.component';
import { KLIPPER_LANDING } from './klipper-landing-content';
import { MetaTagService } from '../core/services/meta-tag.service';

describe('KlipperLandingComponent', () => {
  let fixture: ComponentFixture<KlipperLandingComponent>;
  let meta: MockedObject<MetaTagService>;
  let element: HTMLElement;

  beforeEach(async () => {
    meta = {
      setSeoTags: vi.fn().mockName('MetaTagService.setSeoTags'),
    } as unknown as MockedObject<MetaTagService>;
    await TestBed.configureTestingModule({
      imports: [KlipperLandingComponent, RouterModule.forRoot([])],
      providers: [{ provide: MetaTagService, useValue: meta }],
    }).compileComponents();

    fixture = TestBed.createComponent(KlipperLandingComponent);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    TestBed.inject(DOCUMENT).getElementById('ld-json')?.remove();
  });

  const hrefs = () =>
    Array.from(element.querySelectorAll('a[href]')).map((a) =>
      a.getAttribute('href')
    );
  const text = () => element.textContent ?? '';

  it('renders one h1 naming the integration', () => {
    const headings = element.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain(
      'Automatic print logging for Klipper'
    );
  });

  it('sets the canonical, title, description and social image', () => {
    expect(meta.setSeoTags).toHaveBeenCalledTimes(1);
    expect(meta.setSeoTags).toHaveBeenCalledWith({
      url: 'https://www.3dprintlog.com/klipper',
      title: KLIPPER_LANDING.title,
      description: KLIPPER_LANDING.metaDescription,
      imageUrl: expect.stringMatching(/^https:\/\/www\.3dprintlog\.com\//),
    });
    expect(KLIPPER_LANDING.title).toMatch(/Klipper/);
    // Search engines truncate past roughly 160 characters.
    expect(KLIPPER_LANDING.metaDescription.length).toBeLessThanOrEqual(160);
  });

  it('publishes a HowTo built from the setup steps', () => {
    const script = TestBed.inject(DOCUMENT).getElementById('ld-json');
    const graph = JSON.parse(script?.textContent ?? '{}')['@graph'];
    expect(graph[0]['@type']).toBe('HowTo');
    expect(graph[0].name).toBe(KLIPPER_LANDING.h1);
    expect(graph[0].step.length).toBe(KLIPPER_LANDING.steps.length);
  });

  it('renders every setup step in order', () => {
    const items = Array.from(element.querySelectorAll('.steps li')).map((li) =>
      li.textContent?.trim()
    );
    expect(items).toEqual(KLIPPER_LANDING.steps);
  });

  it('gives every feature an h3 under one section h2', () => {
    const section = element.querySelector('[data-cy="klipper-features"]');
    expect(section?.querySelector('h2')).not.toBeNull();
    expect(section?.querySelectorAll('h3').length).toBe(
      KLIPPER_LANDING.features.length
    );
  });

  it('covers what the bridge logs, spools, the outbox and both modes', () => {
    for (const claim of [
      /start/i,
      /cancel/i,
      /filament per tool/i,
      /thumbnail/i,
      /webcam/i,
      /PRINTLOG_SET_SPOOL/,
      /RFID/,
      /outbox/i,
      /Docker/,
      /several printers/i,
    ]) {
      expect(text()).toMatch(claim);
    }
  });

  it('keeps unreleased features in a separate, labelled list with no dates', () => {
    const planned = element.querySelector('[data-cy="klipper-planned"]');
    expect(planned?.textContent).toContain('Planned');
    expect(planned?.textContent).toMatch(/pairing/i);
    expect(planned?.querySelectorAll('li').length).toBe(
      KLIPPER_LANDING.planned.length
    );
    expect(planned?.textContent).not.toMatch(
      /\b20\d\d\b|\bQ[1-4]\b|January|February|March|April|May|June|July|August|September|October|November|December/
    );
  });

  it('sends readers to the guide for current steps and points the CTA at the docs', () => {
    const status = element.querySelector('[data-cy="klipper-status"]');
    expect(status?.textContent).toMatch(/always has\s+the current steps/i);
    expect(status?.textContent).not.toMatch(/no numbered release|\bedge\b/i);
    const cta = element.querySelector('[data-cy="klipper-cta"]');
    expect(cta?.getAttribute('href')).toBe('/docs/printlog-bridge');
    // No version numbers anywhere: the CTA follows the docs, not a release.
    expect(text()).not.toMatch(/\bv?\d+\.\d+\.\d+\b/);
  });

  it('links to the bridge guides, the source and the legacy notifier', () => {
    for (const href of [
      '/docs/printlog-bridge',
      '/docs/printlog-bridge-install',
      '/docs/printlog-bridge-docker',
      '/docs/printlog-bridge-spools',
      '/docs/snapmaker-u1',
      '/docs/switch-from-notifier',
      '/docs/klipper',
      'https://github.com/HoffmanEngineering/printlog-bridge',
      '/',
    ]) {
      expect(hrefs()).toContain(href);
    }
  });

  it('opens external links safely', () => {
    for (const a of Array.from(
      element.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')
    )) {
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });

  it('says it is free and open source, with no Pro or price claim', () => {
    expect(text()).toContain('Free for every 3D Print Log account');
    expect(text()).toMatch(/open source \(MIT\)/i);
    for (const pattern of [/\bpro\b/i, /\$\d/, /pric/i]) {
      expect(text()).not.toMatch(pattern);
      expect(KLIPPER_LANDING.title).not.toMatch(pattern);
      expect(KLIPPER_LANDING.metaDescription).not.toMatch(pattern);
    }
  });

  it('names no printer the bridge has not been tested on', () => {
    expect(text()).not.toMatch(/\bK2\b|Creality|Bambu|Prusa\b/);
  });
});
