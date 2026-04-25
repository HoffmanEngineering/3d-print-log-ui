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

  projectId = input.required<string>();
  imageId = input<number | undefined>(undefined);

  imageData = signal('');

  constructor() {
    effect(() => {
      const id = this.imageId();
      if (id) {
        this.projectService
          .getProjectImage(this.projectId(), id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((data) => this.imageData.set(data));
      } else {
        this.imageData.set('');
      }
    });
  }
}
