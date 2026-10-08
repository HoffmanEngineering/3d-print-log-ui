import {
  ChangeDetectorRef,
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PrintService } from '../../core/services/print.service';

@Component({
  selector: 'app-print-image',
  templateUrl: './print-image.component.html',
  styleUrls: ['./print-image.component.scss'],
  imports: [MatButtonModule, MatIconModule],
})
export class PrintImageComponent implements OnInit, OnChanges {
  readonly printId = input<number>();
  readonly imageId = input<number>();
  readonly imageData = model<string>(null);
  readonly showDeleteOnHover = input(false);
  /** Meaningful alternative text; falls back to a generic description. */
  readonly alt = input<string>();

  readonly delete = output();

  public imageHovered = false;

  protected imageFailed = false;

  private readonly printService = inject(PrintService);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (this.imageData() === null && this.printId() > 0 && this.imageId() > 0) {
      this.printService
        .getPrintImage(this.printId(), this.imageId())
        .subscribe((data) => {
          this.imageData.set(data);
          this.cdr.markForCheck();
        });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Without this a single failure would persist across carousel navigation,
    // showing "Image unavailable" for every subsequent image.
    if (changes['imageId'] || changes['imageData']) {
      this.imageFailed = false;
    }
  }

  protected onImageError(): void {
    this.imageFailed = true;
  }

  handleDeleteClick(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    this.delete.emit();
  }
}
