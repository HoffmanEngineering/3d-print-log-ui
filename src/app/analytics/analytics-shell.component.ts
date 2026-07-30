import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { AnalyticsFilterBarComponent } from './filters/analytics-filter-bar.component';
import { AnalyticsFilterStore } from './filters/analytics-filter.store';
import { OverviewTabComponent } from './tabs/overview/overview-tab.component';

/**
 * Owns the single AnalyticsFilterStore instance for the page. The filter bar, the mobile
 * bottom sheet, and every tab inject THIS one, which is what makes a change in the sheet
 * immediately visible to the charts.
 *
 * Phase 1 ships only the Overview tab; later phases add their own.
 */
@Component({
  selector: 'app-analytics-shell',
  imports: [AnalyticsFilterBarComponent, MatTabsModule, OverviewTabComponent],
  providers: [AnalyticsFilterStore],
  templateUrl: './analytics-shell.component.html',
  styleUrls: ['./analytics-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsShellComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(AnalyticsFilterStore);
  private readonly title = inject(Title);

  ngOnInit(): void {
    this.title.setTitle('Analytics - 3D Print Log');
    // The URL is the store's serialization, so a shared or reloaded link restores the view.
    this.store.initFromUrl(this.route.snapshot.queryParams);
  }
}
