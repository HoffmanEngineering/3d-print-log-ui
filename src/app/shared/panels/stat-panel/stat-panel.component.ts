import { Component, input } from '@angular/core';

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
  readonly title = input<string>();
  readonly value = input<number | string>();

  readonly invertDisplay = input(false);

  constructor() {}
}
