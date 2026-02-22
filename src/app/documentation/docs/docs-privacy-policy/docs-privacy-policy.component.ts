import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-privacy-policy',
  templateUrl: './docs-privacy-policy.component.html',
  styleUrls: ['./docs-privacy-policy.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsPrivacyPolicyComponent {
  constructor() {}
}
