import { Component, Input } from '@angular/core';
import { INavData } from './types';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  @Input() navItems: INavData[];

  constructor() {}
}
