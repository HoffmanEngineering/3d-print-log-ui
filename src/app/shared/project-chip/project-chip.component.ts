import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { ProjectStatus } from 'src/app/core/services/project.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-project-chip',
  templateUrl: './project-chip.component.html',
  styleUrls: ['./project-chip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatChipsModule, CommonModule],
})
export class ProjectChipComponent {
  projectName = input.required<string>();
  projectStatus = input.required<ProjectStatus>();
  chipClicked = output<string>();

  readonly ProjectStatus = ProjectStatus;

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.chipClicked.emit(this.projectName());
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
