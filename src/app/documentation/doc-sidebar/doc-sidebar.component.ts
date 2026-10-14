import {
  Component,
  PLATFORM_ID,
  inject,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { INavData } from 'src/app/shared/sidebar/types';
import { DOC_PAGES, DocManifestPage } from '../generated/docs-manifest';
import {
  isApplePlatform,
  shortcutLabel,
} from '../docs-search/keyboard-shortcut';

/**
 * The docs sidebar, derived from the docs manifest: each page's `navLabel`,
 * `group` and `order` frontmatter place it, and a divider is inserted wherever
 * the group changes. Adding a page to the sidebar is no longer a separate
 * registration step. A page with `nav: false` is published but left out: it is
 * reached from a page that is listed (validate-docs enforces that link).
 */
@Component({
  selector: 'app-doc-sidebar',
  templateUrl: './doc-sidebar.component.html',
  styleUrls: ['./doc-sidebar.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
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

export function buildNavItems(
  pages: readonly DocManifestPage[] = DOC_PAGES
): INavData[] {
  const items: INavData[] = [];
  let previousGroup: string | null = null;

  for (const page of pages) {
    if (page.dormant || !page.nav) continue;
    if (previousGroup !== null && page.group !== previousGroup) {
      items.push({ divider: true });
    }
    items.push({ name: page.navLabel, url: `/${page.path}` });
    previousGroup = page.group;
  }

  return items;
}
