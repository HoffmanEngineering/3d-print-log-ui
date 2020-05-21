import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  OnDestroy,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { ToastrService } from 'ngx-toastr';
import parse from 'parse-duration';

import { Title } from '@angular/platform-browser';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';
import { ComponentCanDeactivate } from 'src/app/core/guards/pending-changes.guard';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { UserSummaryDto } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';
import {
  PrintDetail,
  PrintService,
  PrintStatus,
} from '../services/print.service';
import {
  AuthService,
  UserProfileInfo,
} from 'src/app/core/services/auth.service';

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

  public printImages: PrintImageValue[] = null;
  public selectedImage: PrintImageValue = null;

  public printStatusTypes = PrintStatus;

  public isUserProfileFeatureEnabled = environment.features.userProfile;
  userProfileSubscription: Subscription;
  currentUser: UserProfileInfo;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private titleService: Title
  ) {}
  ngOnDestroy(): void {
    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
    }
  }

  ngOnInit() {
    this.titleService.setTitle('Viewing Print - 3D Print Log');

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
    });
  }

  handleClose() {
    this.router.navigate(['/prints']);
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
