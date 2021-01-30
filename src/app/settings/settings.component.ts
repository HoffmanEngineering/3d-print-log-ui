import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MetaTagService } from '../core/services/meta-tag.service';
import { PrintService, PrintViewStatus } from '../core/services/print.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from '../core/services/user-setting.service';
import {
  ProfileViewStatus,
  UserDetailDto,
  UserService,
} from '../core/services/user.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  userDetailsOnLoad: UserDetailDto;
  public defaultPrintViewStatusSettingOnLoad: UserSetting | null = null;

  public profileViewStatusTypes = ProfileViewStatus;
  public printViewStatusTypes = PrintViewStatus;

  /**
   * NgModel for Profile View Status
   */
  public profileViewStatus: ProfileViewStatus = null;
  /**
   * NgModel for Print View Status
   */
  public printViewStatus: PrintViewStatus = null;

  public exportInProgress = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private userService: UserService,
    private userSettingService: UserSettingService,
    private readonly printService: PrintService,
    private readonly metaService: MetaTagService,
    private readonly toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.metaService.setTitle('Settings - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      this.userDetailsOnLoad = data.currentUser;

      this.defaultPrintViewStatusSettingOnLoad =
        data.defaultPrintViewStatusSetting;

      // Default all the ngModels
      this.profileViewStatus = this.userDetailsOnLoad.viewStatus;
      this.printViewStatus = this.defaultPrintViewStatusSettingOnLoad
        ? +this.defaultPrintViewStatusSettingOnLoad.value
        : null;
    });
  }

  public saveProfileVisibility(newViewStatus: ProfileViewStatus) {
    const newUserDetail: UserDetailDto = {
      ...this.userDetailsOnLoad,
      viewStatus: newViewStatus,
    };
    this.userService
      .updateCurrentUserDetail(newUserDetail)
      .subscribe((user) => {
        this.userDetailsOnLoad = user;
        this.profileViewStatus = this.userDetailsOnLoad.viewStatus;
      });
  }

  saveDefaultPrintViewStatus(newViewStatus: PrintViewStatus) {
    if (this.defaultPrintViewStatusSettingOnLoad) {
      this.userSettingService
        .updateUserSetting(
          this.defaultPrintViewStatusSettingOnLoad.id,
          newViewStatus.toString()
        )
        .subscribe((setting) => {
          this.defaultPrintViewStatusSettingOnLoad = setting;
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Prints_DefaultPrintViewStatus,
          newViewStatus.toString()
        )
        .subscribe((setting) => {
          this.defaultPrintViewStatusSettingOnLoad = setting;
        });
    }
  }

  cancelDefaultPrintViewStatus() {
    this.printViewStatus = this.defaultPrintViewStatusSettingOnLoad
      ? +this.defaultPrintViewStatusSettingOnLoad.value
      : null;
  }

  public export() {
    if (this.exportInProgress) {
      return; // prevent multiple exports;
    }

    this.exportInProgress = true;
    this.printService.exportAllPrintsAsCsv().subscribe(
      (file) => {
        this.downloadBlob(file);
        this.exportInProgress = false;
      },
      (err) => {
        this.toastrService.error(
          'An error has occurred while exporting data. Please try again in a few seconds.',
          'Error Exporting'
        );
        this.exportInProgress = false;
      }
    );
  }

  private downloadBlob(newBlob: Blob): void {
    // IE doesn't allow using a blob object directly as link href
    // instead it is necessary to use msSaveOrOpenBlob
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(newBlob);
      return;
    }

    // For other browsers:
    // Create a link pointing to the ObjectURL containing the blob.
    const data = window.URL.createObjectURL(newBlob);

    const link = document.createElement('a');
    link.href = data;
    link.download = `PrintReport_${new Date().toISOString()}.csv`;
    // this is necessary as link.click() does not work on the latest firefox
    link.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );

    setTimeout(() => {
      // For Firefox it is necessary to delay revoking the ObjectURL
      window.URL.revokeObjectURL(data);
      link.remove();
    }, 100);
  }
}
