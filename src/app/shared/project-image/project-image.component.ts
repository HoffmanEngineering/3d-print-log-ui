import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ProjectService } from 'src/app/core/services/project.service';

@Component({
  selector: 'app-project-image',
  templateUrl: './project-image.component.html',
  styleUrls: ['./project-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
})
export class ProjectImageComponent implements OnInit {
  private readonly projectService = inject(ProjectService);

  projectId = input.required<string>();
  imageId = input<number | undefined>(undefined);

  imageData = signal('');

  ngOnInit(): void {
    const id = this.imageId();
    if (id) {
      this.projectService
        .getProjectImage(this.projectId(), id)
        .subscribe((data) => this.imageData.set(data));
    }
  }
}
