import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardContent,
} from '@angular/material/card';

@Component({
  selector: 'app-stat-panel',
  templateUrl: './stat-panel.component.html',
  styleUrls: ['./stat-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardContent],
})
/**
 * Used to display a single metric.
 */
export class StatPanelComponent {
  readonly title = input<string>();
  readonly value = input<number | string>();

  readonly invertDisplay = input(false);
}
