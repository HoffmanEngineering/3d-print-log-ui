import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ProjectService } from 'src/app/core/services/project.service';

@Component({
  selector: 'app-project-image',
  templateUrl: './project-image.component.html',
  styleUrls: ['./project-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
})
export class ProjectImageComponent {
  private readonly projectService = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);

  readonly projectId = input.required<string>();
  readonly imageId = input<number | undefined>();
  /** The DTO's thumbnail path; absent or null fetches the full image. */
  readonly thumbnailUrl = input<string | null | undefined>();

  readonly imageData = signal('');

  constructor() {
    effect(() => {
      const id = this.imageId();
      const thumbnail = this.thumbnailUrl();
      if (id) {
        (thumbnail
          ? this.projectService.getProjectImage(this.projectId(), id, thumbnail)
          : this.projectService.getProjectImage(this.projectId(), id)
        )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((data) => this.imageData.set(data));
      } else {
        this.imageData.set('');
      }
    });
  }
}
