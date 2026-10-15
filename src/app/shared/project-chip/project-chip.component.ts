import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { ProjectStatus } from 'src/app/core/services/project.service';

@Component({
  selector: 'app-project-chip',
  templateUrl: './project-chip.component.html',
  styleUrls: ['./project-chip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatChipsModule],
})
export class ProjectChipComponent {
  private readonly router = inject(Router);

  readonly projectName = input.required<string>();
  readonly projectStatus = input.required<ProjectStatus>();
  readonly projectId = input<string | undefined>();
  chipClicked = output<string>();

  readonly ProjectStatus = ProjectStatus;

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    const id = this.projectId();
    if (id) {
      this.router.navigate(['/projects', id]);
    } else {
      this.chipClicked.emit(this.projectName());
    }
  }

  get statusClass(): string {
    switch (this.projectStatus()) {
      case ProjectStatus.InProgress:
        return 'status-in-progress';
      case ProjectStatus.Complete:
        return 'status-complete';
      case ProjectStatus.OnHold:
        return 'status-on-hold';
      case ProjectStatus.Cancelled:
        return 'status-cancelled';
      default:
        return '';
    }
  }
}
