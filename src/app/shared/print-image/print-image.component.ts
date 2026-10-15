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
  readonly imageData = model<string>(null);
  readonly showDeleteOnHover = input(false);
  /**
   * Meaningful alternative text; falls back to a generic description when not
   * bound. An empty string is kept, for an image its surroundings already name.
   */
  readonly alt = input<string>();

  /**
   * How the image fills its box. `contain` letterboxes and is right for the
   * carousel, where the whole photo matters; `cover` crops and is right for a
   * fixed-size gallery tile, where a letterboxed portrait reads as a thin strip.
   * An input for the same reason as `SignedImageComponent.fit`: a parent's
   * ::ng-deep rule ties with this component's own `img` rule on specificity.
   */
  readonly fit = input<'contain' | 'cover'>('contain');

  readonly delete = output();

  protected readonly imageHovered = signal(false);

  protected readonly imageFailed = signal(false);

  private readonly printService = inject(PrintService);

  ngOnInit() {
    if (this.imageData() === null && this.printId() > 0 && this.imageId() > 0) {
      this.printService
        .getPrintImage(this.printId(), this.imageId())
        .subscribe((data) => {
          // getPrintImage turns every error into ''. Shown as nothing, that
          // was a blank box; say the image is unavailable instead.
          if (!data) {
            this.imageFailed.set(true);
            return;
          }
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
