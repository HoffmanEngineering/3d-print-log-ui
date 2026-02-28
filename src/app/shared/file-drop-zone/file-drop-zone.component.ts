import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-file-drop-zone',
  templateUrl: './file-drop-zone.component.html',
  styleUrls: ['./file-drop-zone.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
})
export class FileDropZoneComponent {
  acceptExtensions = input<string[]>(['.gcode', '.stl', '.3mf', '.obj']);
  disabled = input(false);

  filesSelected = output<File[]>();

  isDragOver = signal(false);

  readonly acceptString = computed(() => this.acceptExtensions().join(','));

  private dragCounter = 0;

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    if (this.disabled()) return;
    this.dragCounter++;
    this.isDragOver.set(true);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled()) {
      this.isDragOver.set(true);
    }
  }

  onDragLeave(): void {
    this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.isDragOver.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter = 0;
    this.isDragOver.set(false);

    if (this.disabled()) return;

    const allFiles = Array.from(event.dataTransfer?.files ?? []);
    const filtered = allFiles.filter((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return this.acceptExtensions().includes(ext);
    });

    if (filtered.length > 0) {
      this.filesSelected.emit(filtered);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      this.filesSelected.emit(files);
    }
    input.value = '';
  }
}
