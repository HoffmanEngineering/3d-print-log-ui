import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PrintViewStatus } from '../core/services/print.service';
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

  constructor(
    private activatedRoute: ActivatedRoute,
    private userService: UserService,
    private userSettingService: UserSettingService
  ) {}

  ngOnInit(): void {
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
}
