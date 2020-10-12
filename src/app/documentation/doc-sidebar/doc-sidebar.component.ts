import { Component, OnInit } from '@angular/core';
import { INavData } from 'src/app/shared/sidebar/types';

@Component({
  selector: 'app-doc-sidebar',
  templateUrl: './doc-sidebar.component.html',
  styleUrls: ['./doc-sidebar.component.scss'],
})
export class DocSidebarComponent implements OnInit {
  public navItems: INavData[] = [
    { name: 'Getting Started', url: '/docs/getting-started' },
    { divider: true },
    { name: 'Printers', url: '/docs/printers' },
    { name: 'Prints', url: '/docs/prints' },
    { name: 'Analytics', url: '/docs/analytics' },
    { divider: true },
    { name: 'Cura Plugin', url: '/docs/cura-plugin' },
    { divider: true },
    { name: 'About', url: '/docs/about' },
  ];

  constructor() {}

  ngOnInit() {}
}
