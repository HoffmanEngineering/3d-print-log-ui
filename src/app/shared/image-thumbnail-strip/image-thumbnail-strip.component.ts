import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';

export interface ThumbnailImage {
  id?: number;
  url?: string;
  isDefault: boolean;
  displayOrder: number;
}

@Component({
  selector: 'app-image-thumbnail-strip',
  templateUrl: './image-thumbnail-strip.component.html',
  styleUrls: ['./image-thumbnail-strip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule, DragDropModule],
})
export class ImageThumbnailStripComponent {
  images = input.required<ThumbnailImage[]>();
  selectedId = input<number | undefined>();
  editable = input(false);
  maxImages = input(5);

  imageSelected = output<ThumbnailImage>();
  imageDeleted = output<ThumbnailImage>();
  defaultChanged = output<ThumbnailImage>();
  imagesReordered = output<ThumbnailImage[]>();
  addClicked = output<void>();

  canAddMore = computed(() => this.images().length < this.maxImages());

  onThumbnailClick(image: ThumbnailImage): void {
    this.imageSelected.emit(image);
  }

  onDeleteClick(event: Event, image: ThumbnailImage): void {
    event.stopPropagation();
    this.imageDeleted.emit(image);
  }

  onSetDefaultClick(event: Event, image: ThumbnailImage): void {
    event.stopPropagation();
    this.defaultChanged.emit(image);
  }

  onAddClick(): void {
    this.addClicked.emit();
  }

  onDrop(event: CdkDragDrop<ThumbnailImage[]>): void {
    if (!this.editable()) return;

    const images = [...this.images()];
    moveItemInArray(images, event.previousIndex, event.currentIndex);

    // Update displayOrder based on new positions
    const reordered = images.map((img, index) => ({
      ...img,
      displayOrder: index,
    }));

    this.imagesReordered.emit(reordered);
  }
}
