import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { ImageCarouselComponent } from 'src/app/shared/image-carousel/image-carousel.component';
import {
  ImageThumbnailStripComponent,
  ThumbnailImage,
} from 'src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component';
import { PrintImageComponent } from 'src/app/shared/print-image/print-image.component';
import { PrintImageValue } from '../print-image-value.model';

@Component({
  selector: 'app-print-detail-hero',
  templateUrl: './print-detail-hero.component.html',
  styleUrls: ['./print-detail-hero.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ImageCarouselComponent,
    ImageThumbnailStripComponent,
    PrintImageComponent,
  ],
})
export class PrintDetailHeroComponent {
  printId = input.required<number>();
  images = input<PrintImageValue[]>([]);
  /** Print title, used to build meaningful alternative text. */
  title = input<string>('');

  readonly selectedIndex = signal(0);

  protected readonly hasImages = computed(() => this.images().length > 0);
  protected readonly showThumbnails = computed(() => this.images().length > 1);
  protected readonly selectedImage = computed(
    () => this.images()[this.selectedIndex()] ?? null
  );

  protected readonly selectedAlt = computed(() => {
    const subject = this.title()?.trim() || 'this print';
    const total = this.images().length;
    return total > 1
      ? `${subject}, image ${this.selectedIndex() + 1} of ${total}`
      : `${subject}`;
  });

  constructor() {
    // Reset selection when the image set changes; prefer the default image.
    effect(() => {
      const images = this.images();
      const defaultIndex = images.findIndex((i) => i.isDefault);
      this.selectedIndex.set(defaultIndex >= 0 ? defaultIndex : 0);
    });
  }

  protected onIndexChange(index: number): void {
    this.selectedIndex.set(index);
  }

  protected onImageSelected(image: ThumbnailImage): void {
    const index = this.images().indexOf(image as PrintImageValue);
    if (index >= 0) {
      this.selectedIndex.set(index);
    }
  }
}
