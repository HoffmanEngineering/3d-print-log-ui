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
 * Renders a filament image from a pre-signed URL.
 *
 * Much thinner than print-image / project-image: because the URL carries its own
 * credential, there is no service call, no FileReader, and no data-URL round trip.
 */
@Component({
  selector: 'app-filament-image',
  templateUrl: './filament-image.component.html',
  styleUrls: ['./filament-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
})
export class FilamentImageComponent {
  src = input.required<string>();
  alt = input<string>('Filament image');
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
