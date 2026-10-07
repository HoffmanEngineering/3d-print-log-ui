import { Component, input } from '@angular/core';
import { INavData } from './types';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: false,
})
export class SidebarComponent {
  readonly navItems = input<INavData[]>();

  constructor() {}
}
