import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../core/services/auth.service';

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
    private titleService: Title
  ) {}

  ngOnInit() {
    this.titleService.setTitle('3D Print Log');
  }
}
