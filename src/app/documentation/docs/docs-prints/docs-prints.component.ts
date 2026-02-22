import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-prints',
  templateUrl: './docs-prints.component.html',
  styleUrls: ['./docs-prints.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsPrintsComponent {
  constructor() {}
}
