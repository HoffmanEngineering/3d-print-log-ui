import { Component } from '@angular/core';
import { INavData } from 'src/app/shared/sidebar/types';

@Component({
  selector: 'app-doc-sidebar',
  templateUrl: './doc-sidebar.component.html',
  styleUrls: ['./doc-sidebar.component.scss'],
})
export class DocSidebarComponent {
  public navItems: INavData[] = [
    { name: 'Getting Started', url: '/docs/getting-started' },
    { divider: true },
    { name: 'Prints', url: '/docs/prints' },
    { name: 'Filaments', url: '/docs/filaments' },
    { name: 'Printers', url: '/docs/printers' },
    { name: 'Analytics', url: '/docs/analytics' },
    { divider: true },
    { name: 'Cura Plugin', url: '/docs/cura-plugin' },
    { name: 'Octoprint Webhook', url: '/docs/octoprint-webhook' },
    { divider: true },
    { name: 'Release Notes', url: '/docs/release-notes' },
    { name: 'About', url: '/docs/about' },
  ];
}
