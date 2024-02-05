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
    { name: 'Materials', url: '/docs/materials' },
    { name: 'Printers', url: '/docs/printers' },
    { name: 'Analytics', url: '/docs/analytics' },
    { divider: true },
    { name: 'Android App', url: '/docs/android-app' },
    { name: 'Cura Plugin', url: '/docs/cura-plugin' },
    { name: 'Octoprint Webhook', url: '/docs/octoprint-webhook' },
    { name: 'Klipper/Moonraker', url: '/docs/klipper' },
    { divider: true },
    { name: 'Release Notes', url: '/docs/release-notes' },
    { name: 'About', url: '/docs/about' },
    { name: 'Privacy Policy', url: '/docs/privacy-policy' },
    // { name: 'Terms of Service', url: '/docs/terms-of-service' },
  ];
}
