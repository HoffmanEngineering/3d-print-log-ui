import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import {
  ProjectService,
  ProjectStatus,
  ProjectViewStatus,
} from 'src/app/core/services/project.service';
import {
  ProjectSelection,
  ProjectSelectorComponent,
} from 'src/app/shared/project-selector/project-selector.component';

export type PrintBulkProjectDialogResult =
  | { projectId: string; projectName: string; created: boolean }
  | { remove: true };

/**
 * Picks the project a bulk selection should be filed under.
 *
 * The "type a new name" branch is resolved here rather than on the wire: the dialog creates
 * the project once and closes with its id, so the bulk endpoint only ever receives ids and
 * a chunked batch cannot create one project per chunk.
 */
@Component({
  selector: 'app-print-bulk-project-dialog',
  templateUrl: './print-bulk-project-dialog.component.html',
  styleUrls: ['./print-bulk-project-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, ProjectSelectorComponent],
})
export class PrintBulkProjectDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<PrintBulkProjectDialogComponent>>(MatDialogRef);
  private readonly projectService = inject(ProjectService);

  public readonly data = inject<{ count: number }>(MAT_DIALOG_DATA);

  public readonly selection = signal<ProjectSelection | null>(null);
  public readonly isSaving = signal(false);
  public readonly errorMessage = signal('');

  public onSelection(selection: ProjectSelection | null): void {
    this.selection.set(selection);
    this.errorMessage.set('');
  }

  public async confirm(): Promise<void> {
    const selection = this.selection();
    if (!selection || this.isSaving()) {
      return;
    }

    if (selection.type === 'existing') {
      this.dialogRef.close({
        projectId: selection.projectId,
        projectName: selection.projectName,
        created: false,
      });
      return;
    }

    this.isSaving.set(true);
    try {
      const created = await firstValueFrom(
        this.projectService.createProject({
          name: selection.newProjectName,
          status: ProjectStatus.InProgress,
          viewStatus: ProjectViewStatus.Private,
        })
      );
      this.dialogRef.close({
        projectId: created.id,
        projectName: created.name,
        created: true,
      });
    } catch {
      // Stay open so the name is not lost and the user can retry or pick an existing one.
      this.errorMessage.set(
        `The project "${selection.newProjectName}" could not be created. Nothing was changed.`
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  public removeFromProject(): void {
    this.dialogRef.close({ remove: true });
  }

  public cancel(): void {
    this.dialogRef.close();
  }
}
