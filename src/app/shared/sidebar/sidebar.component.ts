import { Component, Input, OnInit } from '@angular/core';
import { INavData } from './types';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  @Input() navItems: INavData;

  constructor() {}

  ngOnInit() {}
}
