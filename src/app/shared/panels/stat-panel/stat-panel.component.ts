import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-panel',
  templateUrl: './stat-panel.component.html',
  styleUrls: ['./stat-panel.component.scss'],
  standalone: false,
})
/**
 * Used to display a single metric.
 */
export class StatPanelComponent {
  @Input() title: string;
  @Input() value: number | string;

  @Input() invertDisplay = false;

  constructor() {}
}
