import { Component, PLATFORM_ID, inject, output } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { INavData } from 'src/app/shared/sidebar/types';
import { DOC_PAGES } from '../generated/docs-manifest';
import {
  isApplePlatform,
  shortcutLabel,
} from '../docs-search/keyboard-shortcut';

/**
 * The docs sidebar, derived from the docs manifest: each page's `navLabel`,
 * `group` and `order` frontmatter place it, and a divider is inserted wherever
 * the group changes. Adding a page to the sidebar is no longer a separate
 * registration step.
 */
@Component({
  selector: 'app-doc-sidebar',
  templateUrl: './doc-sidebar.component.html',
  styleUrls: ['./doc-sidebar.component.scss'],
  standalone: false,
})
export class DocSidebarComponent {
  public navItems: INavData[] = buildNavItems();

  /** Asks the shell to open the search palette; it owns the dialog ref. */
  readonly openSearch = output<void>();

  private readonly platformId = inject(PLATFORM_ID);

  /** Guarded: this also runs in Node during prerendering. */
  readonly shortcutHint = shortcutLabel(
    isPlatformBrowser(this.platformId) && isApplePlatform(navigator.platform)
  );
}

function buildNavItems(): INavData[] {
  const items: INavData[] = [];
  let previousGroup: string | null = null;

  for (const page of DOC_PAGES) {
    if (page.dormant) continue;
    if (previousGroup !== null && page.group !== previousGroup) {
      items.push({ divider: true });
    }
    items.push({ name: page.navLabel, url: `/${page.path}` });
    previousGroup = page.group;
  }

  return items;
}
