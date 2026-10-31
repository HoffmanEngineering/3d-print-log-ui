import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { DOCS_PAGE_IMPORTS } from '../../docs-page-imports';

@Component({
  selector: 'app-docs-getting-started',
  // Template is compiled from src/content/docs/getting-started.md. The class is
  // hand-written (the `component:` escape hatch) because this page is auth-aware
  // on a public route: it injects AuthService and Router, which frontmatter
  // `constants:` cannot express.
  templateUrl: '../../generated/pages/docs-getting-started.component.html',
  styleUrls: ['./docs-getting-started.component.scss'],
  imports: [DOCS_PAGE_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsGettingStartedComponent {
  authService = inject(AuthService);
  router = inject(Router);
}
