import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';

import { LoggingService } from '../core/services/logging.service';
import { EmptyStateComponent } from '../shared/empty-state/empty-state.component';

/**
 * Rendered by the `**` route for a path under a known segment that no child
 * route matches (`/prints/1/nope`). Unknown top-level paths never reach the
 * app: Static Web Apps answers them with a real 404 and `404.html`.
 */
@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
})
export class NotFoundComponent {
  private readonly meta = inject(Meta);

  constructor() {
    inject(Title).setTitle('Page not found | 3D Print Log');
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
    inject(DestroyRef).onDestroy(() => this.meta.removeTag('name="robots"'));

    // Path only: a query string or fragment can carry a token.
    const path = inject(Router).url.split(/[?#]/)[0];
    inject(LoggingService).logEvent('NotFound_Viewed', { path });
  }
}
