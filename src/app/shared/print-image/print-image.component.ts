import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-print-image',
  templateUrl: './print-image.component.html',
  styleUrls: ['./print-image.component.scss'],
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintImageComponent implements OnInit, OnChanges {
  readonly printId = input<number>();
  readonly imageId = input<number>();
  /**
   * The DTO's thumbnail path (relative to the API base), for a small slot. Absent or null
   * (an API older than #281, or a print without an image) fetches the full image.
   */
  readonly thumbnailUrl = input<string | null | undefined>();
  readonly imageData = model<string>(null);
  readonly showDeleteOnHover = input(false);
  /** Meaningful alternative text; falls back to a generic description. */
  readonly alt = input<string>();

  readonly delete = output();

  protected readonly imageHovered = signal(false);

  protected readonly imageFailed = signal(false);

  private readonly printService = inject(PrintService);

  ngOnInit() {
    if (this.imageData() === null && this.printId() > 0 && this.imageId() > 0) {
      const thumbnail = this.thumbnailUrl();
      const request = thumbnail
        ? this.printService.getPrintImage(
            this.printId(),
            this.imageId(),
            thumbnail
          )
        : this.printService.getPrintImage(this.printId(), this.imageId());
      request.subscribe((data) => {
        this.imageData.set(data);
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Without this a single failure would persist across carousel navigation,
    // showing "Image unavailable" for every subsequent image.
    if (changes['imageId'] || changes['imageData']) {
      this.imageFailed.set(false);
    }
  }

  protected onImageError(): void {
    this.imageFailed.set(true);
  }

  handleDeleteClick(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    this.delete.emit();
  }
}
