import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatLegacySliderModule as MatSliderModule } from '@angular/material/legacy-slider';
import { MatSortModule } from '@angular/material/sort';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { RouterModule } from '@angular/router';
import { AccountDeactivationBannerComponent } from './account-deactivation-banner/account-deactivation-banner.component';
import { CallbackComponent } from './callback/callback.component';
import { CommentComponent } from './comments/comment/comment.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { FilamentListComponent } from './filament-list/filament-list.component';
import { FilamentSearchModalComponent } from './filament-search-modal/filament-search-modal.component';
import { NavbarComponent } from './navbar/navbar.component';
import { DonutChartComponent } from './panels/donut-chart/donut-chart.component';
import { GraphPanelComponent } from './panels/graph-panel/graph-panel.component';
import { StatPanelComponent } from './panels/stat-panel/stat-panel.component';
import { ParserUnavailableDialogComponent } from './parser-unavailable-dialog/parser-unavailable-dialog.component';
import { DurationPipe } from './pipes/duration.pipe';
import { HumanizePipe } from './pipes/humanize.pipe';
import { MaterialNamePipe } from './pipes/material-name.pipe';
import { PrintImageComponent } from './print-image/print-image.component';
import { PrintSummaryCardComponent } from './print-summary-card/print-summary-card.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { SimpleDialogComponent } from './simple-dialog/simple-dialog.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { GcodeViewerModalComponent } from './gcode-viewer-modal/gcode-viewer-modal.component';
import {
  NgxMatDatetimePickerModule,
  NgxMatTimepickerModule,
} from '@angular-material-components/datetime-picker';
import { NgxMatMomentModule } from '@angular-material-components/moment-adapter';
import { AdComponent } from './ad/ad.component';
import { AdsenseModule } from 'ng2-adsense';

@NgModule({
  declarations: [
    NavbarComponent,
    CallbackComponent,
    UserProfileComponent,
    FeedbackComponent,
    SidebarComponent,
    DurationPipe,
    PrintSummaryCardComponent,
    PrintImageComponent,
    StatPanelComponent,
    GraphPanelComponent,
    DonutChartComponent,
    CommentComponent,
    HumanizePipe,
    SimpleDialogComponent,
    ParserUnavailableDialogComponent,
    MaterialNamePipe,
    FilamentListComponent,
    FilamentSearchModalComponent,
    AccountDeactivationBannerComponent,
    GcodeViewerModalComponent,
    AdComponent,
  ],
  imports: [
    CommonModule,
    MatMenuModule,
    MatSliderModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    FlexLayoutModule,
    MatCardModule,
    MatCheckboxModule,
    RouterModule.forChild([]),
    FormsModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatSortModule,
    MatSidenavModule,
    MatListModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MatDialogModule,
    ClipboardModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,
    NgxMatMomentModule,
    AdsenseModule,
  ],
  exports: [
    CommonModule,
    NavbarComponent,
    CallbackComponent,
    UserProfileComponent,
    MatMenuModule,
    MatSliderModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMomentDateModule,
    MatPaginatorModule,
    MatDividerModule,
    FlexLayoutModule,
    MatCardModule,
    MatCheckboxModule,
    FormsModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatSortModule,
    MatSidenavModule,
    MatListModule,
    SidebarComponent,
    MatSliderModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatDialogModule,
    ClipboardModule,
    DurationPipe,
    PrintSummaryCardComponent,
    PrintImageComponent,
    StatPanelComponent,
    GraphPanelComponent,
    DonutChartComponent,
    CommentComponent,
    HumanizePipe,
    MaterialNamePipe,
    FilamentSearchModalComponent,
    AccountDeactivationBannerComponent,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,
    NgxMatMomentModule,
    AdsenseModule,
    AdComponent,
  ],
})
export class SharedModule {}
