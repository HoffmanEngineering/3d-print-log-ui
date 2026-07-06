import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { MetaTagService } from '../core/services/meta-tag.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(
    public auth: AuthService,
    private meta: MetaTagService
  ) {}

  ngOnInit() {
    this.meta.setSeoTags({
      url: 'https://www.3dprintlog.com/',
      title: '3D Print Log | Track 3D Prints, Filament & Settings',
      description:
        'Log and track your 3D prints, filament, and settings. Send prints directly from OrcaSlicer, Bambu Studio, PrusaSlicer, and Cura. Create a free account.',
      imageUrl:
        'https://www.3dprintlog.com/assets/3d-print-log-logo_8b178eb1339b.svg',
    });
  }
}
