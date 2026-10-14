import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { INavData } from './types';
import { MatNavList, MatDivider, MatListItem } from '@angular/material/list';
import { RouterLinkActive, RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatNavList, MatDivider, MatListItem, RouterLinkActive, RouterLink],
})
export class SidebarComponent {
  readonly navItems = input<INavData[]>();
}
