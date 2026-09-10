import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Renders an image from a pre-signed URL.
 *
 * Much thinner than print-image / project-image: because the URL carries its own
 * credential, there is no service call, no FileReader, and no data-URL round trip.
 */
@Component({
  selector: 'app-signed-image',
  templateUrl: './signed-image.component.html',
  styleUrls: ['./signed-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
})
export class SignedImageComponent {
  src = input.required<string>();

  /**
   * Required, not defaulted: this is the only place the subject reaches the accessibility
   * tree, and a shared default would label every image on the page identically.
   */
  alt = input.required<string>();

  showDeleteOnHover = input(false);

  delete = output<void>();

  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      // Reading src registers the dependency; a new URL deserves a fresh attempt.
      this.src();
      this.failed.set(false);
    });
  }

  protected onError(): void {
    this.failed.set(true);
  }

  protected onDeleteClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.delete.emit();
  }
}
