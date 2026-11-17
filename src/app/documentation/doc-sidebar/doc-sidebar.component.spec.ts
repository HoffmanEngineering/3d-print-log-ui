import { provideRouter } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocManifestPage } from '../generated/docs-manifest';
import { DocSidebarComponent, buildNavItems } from './doc-sidebar.component';

describe('DocSidebarComponent', () => {
  let component: DocSidebarComponent;
  let fixture: ComponentFixture<DocSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])],
      imports: [DocSidebarComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // #273: Integrations had a row per printlog-bridge page plus one for the
  // legacy notifier. Now the overview is the one Klipper row, and its
  // sub-pages are reached from it.
  it('shows one Klipper row, pointing at the printlog-bridge overview', () => {
    const klipper = component.navItems.filter((item) =>
      /klipper|bridge|notifier/i.test(`${item.name} ${item.url}`)
    );
    expect(klipper).toEqual([
      { name: 'Log prints from Klipper', url: '/docs/printlog-bridge' },
    ]);
  });

  it('leaves out the nav: false pages, which stay routed', () => {
    const urls = component.navItems.map((item) => item.url);
    for (const slug of [
      'klipper',
      'printlog-bridge-install',
      'printlog-bridge-docker',
      'printlog-bridge-spools',
      'snapmaker-u1',
      'printlog-bridge-troubleshooting',
      'printlog-bridge-privacy',
      'switch-from-notifier',
      'klipper-spoolman',
    ]) {
      expect(urls).not.toContain(`/docs/${slug}`);
    }
  });
});

describe('buildNavItems', () => {
  const page = (over: Partial<DocManifestPage>): DocManifestPage => ({
    slug: 'prints',
    path: 'docs/prints',
    title: 'Prints',
    description: 'Prints.',
    navLabel: 'Prints',
    group: 'features',
    order: 10,
    mode: 'how-to',
    updated: '2026-10-12',
    related: [],
    aliases: [],
    movedAnchors: {},
    dormant: false,
    nav: true,
    className: 'DocsPrintsComponent',
    selector: 'app-docs-prints',
    ...over,
  });

  it('skips nav: false and dormant pages', () => {
    expect(
      buildNavItems([
        page({}),
        page({ slug: 'install', path: 'docs/install', nav: false }),
        page({ slug: 'terms', path: 'docs/terms', dormant: true }),
      ])
    ).toEqual([{ name: 'Prints', url: '/docs/prints' }]);
  });

  it('adds no divider for a group whose pages are all unlisted', () => {
    expect(
      buildNavItems([
        page({}),
        page({
          slug: 'install',
          path: 'docs/install',
          group: 'integrations',
          nav: false,
        }),
        page({
          slug: 'about',
          path: 'docs/about',
          navLabel: 'About',
          group: 'about',
        }),
      ])
    ).toEqual([
      { name: 'Prints', url: '/docs/prints' },
      { divider: true },
      { name: 'About', url: '/docs/about' },
    ]);
  });
});
