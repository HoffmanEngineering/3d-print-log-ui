import { MediaMatcher } from '@angular/cdk/layout';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-documentation',
  templateUrl: './documentation.component.html',
  styleUrls: ['./documentation.component.scss'],
})
export class DocumentationComponent
  implements OnInit, OnDestroy, AfterViewInit {
  mobileQuery: MediaQueryList;
  private mobileQueryListener: () => void;

  @ViewChild('snav', { static: true }) snav;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    media: MediaMatcher,
    private title: Title,
    private ngZone: NgZone
  ) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');

    this.mobileQueryListener = () => {
      this.ngZone.run(() => {
        if (!this.mobileQuery.matches) {
          this.snav.open();
        } else {
          this.snav.close();
        }
        this.changeDetectorRef.detectChanges();
      });
    };
    // tslint:disable-next-line: deprecation
    this.mobileQuery.addListener(this.mobileQueryListener);
  }

  ngAfterViewInit() {
    if (!this.mobileQuery.matches) {
      setTimeout(() => {
        this.snav.open();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    // tslint:disable-next-line: deprecation
    this.mobileQuery.removeListener(this.mobileQueryListener);
  }

  ngOnInit() {
    this.title.setTitle('Documentation - 3D Print Log');
  }

  handleSidebarClick() {
    if (this.mobileQuery.matches) {
      this.snav.toggle();
    }
  }
}
