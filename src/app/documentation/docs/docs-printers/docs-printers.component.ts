import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-printers',
  templateUrl: './docs-printers.component.html',
  styleUrls: ['./docs-printers.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsPrintersComponent {
  constructor() {}
}
