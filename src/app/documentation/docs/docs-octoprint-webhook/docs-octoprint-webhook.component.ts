import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-octoprint-webhook',
  templateUrl: './docs-octoprint-webhook.component.html',
  styleUrls: ['./docs-octoprint-webhook.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsOctoprintWebhookComponent {
  constructor() {}
}
