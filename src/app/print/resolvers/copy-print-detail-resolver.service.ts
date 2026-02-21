import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import { map, mergeMap, take } from 'rxjs/operators';
import {
  EMPTY_GUID,
  PrintDetail,
  PrintService,
} from '../../core/services/print.service';
import { PrintDetailWithUser } from './print-detail-resolver.service';

@Injectable()
export class CopyPrintDetailResolverService {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const printId = +route.paramMap.get('id');

    if (Number.isInteger(printId)) {
      return this.printService.getPrintDetail(printId).pipe(
        mergeMap((print) => {
          if (print.images == null || print.images.length == 0) {
            return of({ print: print, images: [] });
          }

          const images = print.images.map((image) => {
            return this.printService.getPrintImage(print.id, image.id).pipe(
              map((url) => {
                return {
                  url,
                  isDefault: image.isDefault,
                };
              })
            );
          });

          return forkJoin(images).pipe(
            take(1),
            map((images) => {
              return { print, images };
            })
          );
        }),
        map(({ print, images }) => {
          const cleanedFilamentUsage = print.filamentUsage.map(
            (printFilament) => {
              return { ...printFilament, id: EMPTY_GUID };
            }
          );

          const cleanedPrint: PrintDetail = {
            ...print,
            id: null,
            images: images.map((image, i) => {
              return {
                id: null,
                isDefault: image.isDefault,
                url: image.url,
                displayOrder: i,
              };
            }),
            filamentUsage: cleanedFilamentUsage,
          };

          const newDetails: PrintDetailWithUser = {
            print: cleanedPrint,
            user: null,
          };

          return newDetails;
        })
      );
    }

    const emptyDetail: PrintDetailWithUser = {
      print: null,
      user: null,
    };
    return emptyDetail;
  }

  constructor(private printService: PrintService) {}
}
