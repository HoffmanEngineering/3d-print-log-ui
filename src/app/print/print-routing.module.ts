import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../core/guards/auth.guard';

import { PendingChangesGuard } from '../core/guards/pending-changes.guard';
import { CurrentUserPrinterSummaryResolverService } from '../core/resolvers/current-user-printer-summary-resolver.service';
import { DefaultPrintViewStatusSettingResolverService } from '../core/resolvers/default-print-view-status-setting-resolver.service';
import { EditPrintDetailComponent } from './edit-print-detail/edit-print-detail.component';
import { PrintListComponent } from './print-list/print-list.component';
import { CopyPrintDetailResolverService } from './resolvers/copy-print-detail-resolver.service';
import { LastFilamentMeasureSettingResolverService } from './resolvers/last-filament-measure-setting-resolver.service';
import { LastSelectedPrinterSettingResolverService } from './resolvers/last-selected-printer-setting-resolver.service';
import { PrintDetailResolverService } from './resolvers/print-detail-resolver.service';
import { PrintListResolverService } from './resolvers/print-list-resolver.service';
import { ViewPrintDetailComponent } from './view-print-detail/view-print-detail.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: PrintListComponent,
        resolve: {
          printList: PrintListResolverService,
          printers: CurrentUserPrinterSummaryResolverService,
        },
      },
      {
        path: 'copy/:id',
        component: EditPrintDetailComponent,
        resolve: {
          print: CopyPrintDetailResolverService,
          printers: CurrentUserPrinterSummaryResolverService,
          lastSelectedPrintSetting: LastSelectedPrinterSettingResolverService,
          defaultPrintViewStatusSetting:
            DefaultPrintViewStatusSettingResolverService,
          lastFilamentMeasureSetting: LastFilamentMeasureSettingResolverService,
        },
        canDeactivate: [PendingChangesGuard],
      },
      {
        path: ':id/edit',
        component: EditPrintDetailComponent,
        resolve: {
          print: PrintDetailResolverService,
          printers: CurrentUserPrinterSummaryResolverService,
          lastSelectedPrintSetting: LastSelectedPrinterSettingResolverService,
          defaultPrintViewStatusSetting:
            DefaultPrintViewStatusSettingResolverService,
          lastFilamentMeasureSetting: LastFilamentMeasureSettingResolverService,
        },
        canActivate: [AuthGuard],
        canDeactivate: [PendingChangesGuard],
      },
      {
        path: 'new/cura',

        redirectTo: 'new/edit',
      },
      {
        path: ':id',
        component: ViewPrintDetailComponent,
        resolve: {
          print: PrintDetailResolverService,
        },
      },
    ],
  },
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)],
})
export class PrintRoutingModule {}
