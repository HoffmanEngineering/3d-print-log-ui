import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-release-notes',
  templateUrl: './docs-release-notes.component.html',
  styleUrls: ['./docs-release-notes.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsReleaseNotesComponent {
  constructor() {}
}
