import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-filaments',
  templateUrl: './docs-filaments.component.html',
  styleUrls: ['./docs-filaments.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsFilamentsComponent {
  constructor() {}
}
