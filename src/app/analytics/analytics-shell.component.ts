import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalyticsFilterBarComponent } from './filters/analytics-filter-bar.component';
import { AnalyticsFilterStore } from './filters/analytics-filter.store';
import { ActivityTabComponent } from './tabs/activity/activity-tab.component';
import { OverviewTabComponent } from './tabs/overview/overview-tab.component';
import { MaterialsTabComponent } from './tabs/materials/materials-tab.component';
import { PrintersTabComponent } from './tabs/printers/printers-tab.component';

/**
 * Owns the single AnalyticsFilterStore instance for the page. The filter bar, the mobile
 * bottom sheet, and every tab inject THIS one, which is what makes a change in the sheet
 * immediately visible to the charts.
 *
 * Phase 1 ships only the Overview tab; later phases add their own.
 */
@Component({
  selector: 'app-analytics-shell',
  imports: [
    ActivityTabComponent,
    AnalyticsFilterBarComponent,
    MaterialsTabComponent,
    MatTabsModule,
    OverviewTabComponent,
    PrintersTabComponent,
  ],
  providers: [AnalyticsFilterStore],
  templateUrl: './analytics-shell.component.html',
  styleUrls: ['./analytics-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsShellComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(AnalyticsFilterStore);
  private readonly title = inject(Title);

  /**
   * Tab order is the URL contract. Slugs rather than the raw index so the link stays
   * meaningful and survives a tab being inserted before another one.
   */
  private static readonly TABS = ['overview', 'activity', 'printers'] as const;

  readonly selectedIndex = signal(0);

  ngOnInit(): void {
    this.title.setTitle('Analytics - 3D Print Log');
    // The URL is the store's serialization, so a shared or reloaded link restores the view.
    this.store.initFromUrl(this.route.snapshot.queryParams);

    const slug = this.route.snapshot.queryParams['tab'];
    const index = AnalyticsShellComponent.TABS.indexOf(slug);
    if (index >= 0) this.selectedIndex.set(index);
  }

  /**
   * The selected tab belongs in the URL for the same reason the filters do: drilling into a
   * print from the Printers tab and pressing back, or simply reloading, otherwise silently
   * returns to Overview and loses where the reader was.
   */
  onTabChange(index: number): void {
    this.selectedIndex.set(index);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: AnalyticsShellComponent.TABS[index] ?? null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
