import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-docs-getting-started',
  // Template is compiled from src/content/docs/getting-started.md. The class is
  // hand-written (the `component:` escape hatch) because this page is auth-aware
  // on a public route: it injects AuthService and Router, which frontmatter
  // `constants:` cannot express.
  templateUrl: '../../generated/pages/docs-getting-started.component.html',
  styleUrls: ['./docs-getting-started.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsGettingStartedComponent {
  constructor(
    public authService: AuthService,
    public router: Router
  ) {}
}
