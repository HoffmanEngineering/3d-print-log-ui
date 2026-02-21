import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-cura-plugin',
  templateUrl: './docs-cura-plugin.component.html',
  styleUrls: ['./docs-cura-plugin.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsCuraPluginComponent {
  constructor() {}
}
