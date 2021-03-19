import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
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
  ],
})
export class SharedModule {}
