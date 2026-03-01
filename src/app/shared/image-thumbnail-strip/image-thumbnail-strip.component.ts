import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  viewChild,
  ElementRef,
  effect,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

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
  imports: [MatIconModule, MatButtonModule, DragDropModule],
})
export class ImageThumbnailStripComponent {
  images = input.required<ThumbnailImage[]>();
  selectedId = input<number | undefined>();
  editable = input(false);
  maxImages = input(5);

  imageSelected = output<ThumbnailImage>();
  imageDeleted = output<ThumbnailImage>();
  defaultChanged = output<ThumbnailImage>();
  imagesReordered = output<{ previousIndex: number; currentIndex: number }>();
  addClicked = output<void>();

  private readonly thumbnailList =
    viewChild<ElementRef<HTMLUListElement>>('thumbnailList');

  constructor() {
    effect(() => {
      const selectedId = this.selectedId();
      const list = this.thumbnailList()?.nativeElement;
      if (!list || selectedId === undefined) return;

      queueMicrotask(() => {
        const selected = list.querySelector<HTMLLIElement>('li.selected');
        selected?.scrollIntoView({ block: 'nearest', inline: 'center' });
      });
    });
  }

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

    // Emit just the indices - let parent handle the reordering
    this.imagesReordered.emit({
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
    });
  }

  getSelectLabel(image: ThumbnailImage, index: number): string {
    const position = `Image ${index + 1} of ${this.images().length}`;
    return image.isDefault ? `${position}, default` : position;
  }
}
