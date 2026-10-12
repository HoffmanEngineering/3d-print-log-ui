import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MetaTagService } from '../core/services/meta-tag.service';
import { StructuredDataService } from '../core/services/structured-data.service';
import { siteUrl, ogImage } from '../slicer/slicer-configs';
import { BRIDGE_REPO_URL, KLIPPER_LANDING } from './klipper-landing-content';

@Component({
  // standalone is the Angular 21 default; per repo convention do NOT set `standalone: true`.
  selector: 'app-klipper-landing',
  imports: [RouterLink],
  templateUrl: './klipper-landing.component.html',
  styleUrls: ['./klipper-landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KlipperLandingComponent implements OnInit {
  private readonly meta = inject(MetaTagService);
  private readonly structuredData = inject(StructuredDataService);
  readonly page = KLIPPER_LANDING;
  readonly repoUrl = BRIDGE_REPO_URL;

  ngOnInit(): void {
    this.meta.setSeoTags({
      url: siteUrl(this.page.route),
      title: this.page.title,
      description: this.page.metaDescription,
      imageUrl: ogImage,
    });

    this.structuredData.setJsonLd([
      {
        '@type': 'HowTo',
        name: this.page.h1,
        description: this.page.intro,
        step: this.page.steps.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s,
          text: s,
        })),
      },
    ]);
  }
}
