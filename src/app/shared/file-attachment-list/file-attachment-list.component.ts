import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface FileAttachmentItem {
  id?: number;
  originalFileName: string;
  sizeBytes: number;
  contentType: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadPercent?: number;
  errorMessage?: string;
}

@Component({
  selector: 'app-file-attachment-list',
  templateUrl: './file-attachment-list.component.html',
  styleUrls: ['./file-attachment-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, MatProgressBarModule],
})
export class FileAttachmentListComponent {
  files = input<FileAttachmentItem[]>([]);
  editable = input(false);
  canDownload = input(false);

  download = output<FileAttachmentItem>();
  delete = output<FileAttachmentItem>();

  onDownload(file: FileAttachmentItem): void {
    this.download.emit(file);
  }

  onDelete(file: FileAttachmentItem): void {
    this.delete.emit(file);
  }

  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'gcode':
        return 'code';
      case 'stl':
      case '3mf':
      case 'obj':
        return 'view_in_ar';
      default:
        return 'insert_drive_file';
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }
}
