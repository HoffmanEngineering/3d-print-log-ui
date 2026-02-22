import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-about',
  templateUrl: './docs-about.component.html',
  styleUrls: ['./docs-about.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsAboutComponent {
  constructor() {}
}
