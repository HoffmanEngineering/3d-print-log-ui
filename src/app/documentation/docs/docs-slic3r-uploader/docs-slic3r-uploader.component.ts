import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-docs-slic3r-uploader',
  templateUrl: './docs-slic3r-uploader.component.html',
  styleUrls: ['./docs-slic3r-uploader.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsSlic3rUploaderComponent {
  constructor() {}
}
