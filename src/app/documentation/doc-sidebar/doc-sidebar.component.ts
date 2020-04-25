import { Component, OnInit } from '@angular/core';

export interface INavData {
  name?: string;
  url?: string;
  divider?: boolean;
}

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
  ];

  constructor() {}

  ngOnInit() {}
}
