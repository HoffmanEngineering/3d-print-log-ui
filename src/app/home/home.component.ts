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
import homeCaptures from '../../content/home-captures.json';

const SITE_ORIGIN = 'https://www.3dprintlog.com';

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
      // Content-hashed and rewritten by capture:home:process, so it must never
      // be typed by hand.
      imageUrl: `${SITE_ORIGIN}${homeCaptures['Homepage_PrinterList'].src}`,
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
  signUp(placement: 'hero' | 'closing') {
    this.logging.logEvent('Home_SignupClicked', { placement });
    this.auth.login('/prints', { signup: true });
  }
}
