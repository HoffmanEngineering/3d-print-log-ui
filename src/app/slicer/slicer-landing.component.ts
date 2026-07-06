import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MetaTagService } from '../core/services/meta-tag.service';
import { StructuredDataService } from '../core/services/structured-data.service';
import { buildSlicerHowTo } from '../core/structured-data/slicer-schema';
import { SLICER_CONFIGS, siteUrl, ogImage } from './slicer-configs';

@Component({
  // standalone is the Angular 21 default; per repo convention do NOT set `standalone: true`.
  selector: 'app-slicer-landing',
  imports: [RouterLink],
  templateUrl: './slicer-landing.component.html',
  styleUrls: ['./slicer-landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlicerLandingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly meta = inject(MetaTagService);
  private readonly structuredData = inject(StructuredDataService);
  readonly config =
    SLICER_CONFIGS[this.route.snapshot.data['slicerKey'] as string];

  ngOnInit(): void {
    this.meta.setSeoTags({
      url: siteUrl(this.config.route),
      title: this.config.title,
      description: this.config.metaDescription,
      imageUrl: ogImage,
    });

    this.structuredData.setJsonLd([buildSlicerHowTo(this.config)]);
  }
}
