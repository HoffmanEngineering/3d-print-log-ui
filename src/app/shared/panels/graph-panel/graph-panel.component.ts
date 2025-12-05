import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-graph-panel',
  templateUrl: './graph-panel.component.html',
  styleUrls: ['./graph-panel.component.scss'],
  standalone: false,
})
export class GraphPanelComponent {
  @Input() title: string;
  @Input() data: any;

  constructor() {}
}
