import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-android-app',
  templateUrl: './docs-android-app.component.html',
  styleUrls: ['./docs-android-app.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsAndroidAppComponent {
  constructor() {}
}
