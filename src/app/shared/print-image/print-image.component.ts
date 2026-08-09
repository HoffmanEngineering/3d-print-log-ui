import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
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
  @Input() printId: number;
  @Input() imageId: number;
  @Input() imageData: string = null;
  @Input() showDeleteOnHover = false;
  /** Meaningful alternative text; falls back to a generic description. */
  @Input() alt: string;

  @Output() imageDataChange = new EventEmitter<string>();
  @Output() delete = new EventEmitter();

  public imageHovered = false;

  protected imageFailed = false;

  private readonly printService = inject(PrintService);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (this.imageData === null && this.printId > 0 && this.imageId > 0) {
      this.printService
        .getPrintImage(this.printId, this.imageId)
        .subscribe((data) => {
          this.imageData = data;
          this.imageDataChange.emit(data);
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
