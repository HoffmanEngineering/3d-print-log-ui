import { Component } from '@angular/core';
import { INavData } from 'src/app/shared/sidebar/types';
import { DOC_PAGES } from '../generated/docs-manifest';

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
