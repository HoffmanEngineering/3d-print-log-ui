import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-terms',
  templateUrl: './docs-terms.component.html',
  styleUrls: ['./docs-terms.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsTermsComponent {
  constructor() {}
}
