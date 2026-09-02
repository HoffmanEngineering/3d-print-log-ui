import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { MetaTagService } from '../core/services/meta-tag.service';
import { StructuredDataService } from '../core/services/structured-data.service';
import { LoggingService } from '../core/services/logging.service';
import {
  buildOrganization,
  buildSoftwareApplication,
} from '../core/structured-data/app-schema';
import { AdComponent } from '../shared/ad/ad.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [RouterModule, NgOptimizedImage, AdComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly auth = inject(AuthService);

  private readonly meta = inject(MetaTagService);
  private readonly structuredData = inject(StructuredDataService);
  private readonly logging = inject(LoggingService);

  ngOnInit() {
    this.meta.setSeoTags({
      url: 'https://www.3dprintlog.com/',
      title: '3D Print Log | Track 3D Prints, Filament & Settings',
      description:
        'Log and track your 3D prints, filament, and settings. Send prints directly from OrcaSlicer, Bambu Studio, PrusaSlicer, and Cura. Create a free account.',
      imageUrl:
        'https://www.3dprintlog.com/assets/3d-print-log-logo_8b178eb1339b.svg',
    });

    this.structuredData.setJsonLd([
      buildSoftwareApplication(),
      buildOrganization(),
    ]);
  }

  /**
   * The page's primary conversion action, in both the hero and the closing
   * band. `placement` is what makes the two distinguishable in analytics.
   */
  signUp(event: Event, placement: 'hero' | 'closing') {
    // These are <a href> for keyboard and a11y semantics, but they hand off to
    // Auth0 rather than navigating. Without this the empty href reloads the
    // page — which is what it did to the Karma runner before it was added.
    event.preventDefault();
    this.logging.logEvent('Home_SignupClicked', { placement });
    this.auth.login('/prints', { signup: true });
  }
}
