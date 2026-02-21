import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-moonraker',
  templateUrl: './docs-moonraker.component.html',
  styleUrls: ['./docs-moonraker.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsMoonrakerComponent {
  constructor() {}
}
