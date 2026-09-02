import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { neighborsOf } from '../doc-navigation';

/**
 * Previous / next links at the foot of a docs page.
 *
 * The order is the sidebar's, so "next" means the same thing here as moving one
 * step down the nav — the docs read as a sequence, and this is the affordance
 * that says so.
 */
@Component({
  selector: 'app-doc-page-nav',
  templateUrl: './doc-page-nav.component.html',
  styleUrls: ['./doc-page-nav.component.scss'],
  imports: [MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocPageNavComponent {
  /** The docs path of the page on screen, e.g. `docs/printers`. */
  readonly path = input('');

  private readonly neighbors = computed(() => neighborsOf(this.path()));

  readonly previous = computed(() => this.neighbors().previous);
  readonly next = computed(() => this.neighbors().next);
}
