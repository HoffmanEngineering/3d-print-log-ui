import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-image-carousel',
  templateUrl: './image-carousel.component.html',
  styleUrls: ['./image-carousel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
})
export class ImageCarouselComponent {
  imageCount = input.required<number>();
  selectedIndex = input<number>(0);
  label = input<string>('Image gallery');

  indexChange = output<number>();

  private touchStartX = 0;
  private readonly SWIPE_THRESHOLD = 50;

  prev(): void {
    if (this.selectedIndex() > 0) {
      this.indexChange.emit(this.selectedIndex() - 1);
    }
  }

  next(): void {
    if (this.selectedIndex() < this.imageCount() - 1) {
      this.indexChange.emit(this.selectedIndex() + 1);
    }
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    const delta = event.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(delta) >= this.SWIPE_THRESHOLD) {
      delta < 0 ? this.next() : this.prev();
    }
  }
}
