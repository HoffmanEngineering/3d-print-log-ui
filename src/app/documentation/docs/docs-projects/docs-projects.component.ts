import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-projects',
  templateUrl: './docs-projects.component.html',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsProjectsComponent {}
