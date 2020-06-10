import { DOCUMENT, Location } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import {
  AuthService,
  UserProfileInfo,
} from 'src/app/core/services/auth.service';
import { MetaTagService } from 'src/app/core/services/meta-tag.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { UserSummaryDto } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';
import { PrintDetail, PrintStatus } from '../../core/services/print.service';

export interface PrintImageValue {
  id?: number;
  url?: string;
  file?: File;
  isDefault: boolean;
}

@Component({
  selector: 'app-view-print-detail',
  templateUrl: './view-print-detail.component.html',
  styleUrls: ['./view-print-detail.component.scss'],
})
export class ViewPrintDetailComponent implements OnInit, OnDestroy {
  public printers: PrinterSummary[] = [];

  public printForm: FormGroup;

  public print: PrintDetail;
  public user: UserSummaryDto;

  public printImages: PrintImageValue[] = [];
  public selectedImage: PrintImageValue = null;

  public printStatusTypes = PrintStatus;

  public isUserProfileFeatureEnabled = environment.features.userProfile;
  userProfileSubscription: Subscription;
  currentUser: UserProfileInfo;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private readonly metaService: MetaTagService,
    @Inject(DOCUMENT) private readonly document: Document,
    private location: Location
  ) {}
  ngOnDestroy(): void {
    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
    }
  }

  ngOnInit() {
    this.userProfileSubscription = this.authService.userProfile$.subscribe(
      (currentUser) => {
        this.currentUser = currentUser;
      }
    );

    this.activatedRoute.data.subscribe((data) => {
      this.printers = data.printers;

      this.print = data.print.print;
      this.user = data.print.user;

      if (this.print.images?.length > 0) {
        this.print.images.forEach((image) => {
          const newImage: PrintImageValue = {
            id: image.id,
            url: null,
            file: null,
            isDefault: image.isDefault,
          };

          if (image.isDefault) {
            this.selectedImage = newImage;
          }

          this.printImages.push(newImage);
        });
      }

      this.metaService.setTitle(`${this.print.title} - 3D Print Log`);

      this.setMetaTags();
    });
  }

  setMetaTags() {
    const url = `${this.document.location.origin}/prints/${this.print.id}`;
    const title = `${this.print.title} | 3D Print Log`;
    const description = `${this.print.title} printed by ${
      this.user.displayName
    } on ${moment(this.print.startDate).format('LL')}`;
    const imageUrl = this.selectedImage
      ? `${environment.printLogApiUrl}/api/Prints/${this.print.id}/image/${this.selectedImage.id}`
      : '';

    this.metaService.setSocialMediaTags(url, title, description, imageUrl);
  }

  handleClose() {
    this.location.back();
  }

  getPrinterLabel(printer: PrinterSummary) {
    if (printer.name && printer.name !== '') {
      return `${printer.name} - (${(
        printer.make +
        ' ' +
        printer.model
      ).trim()})`;
    } else {
      return `${(printer.make + ' ' + printer.model).trim()}`;
    }
  }
}
