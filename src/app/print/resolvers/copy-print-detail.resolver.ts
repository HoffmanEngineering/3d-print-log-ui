import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';
import {
  EMPTY_GUID,
  PrintDetail,
  PrintService,
} from '../../core/services/print.service';
import { PrintDetailWithUser } from '../services/print-detail-loader.service';

/** A print prepared to be saved as a new print, images included by value. */
export const copyPrintDetailResolver: ResolveFn<PrintDetailWithUser> = (
  route
) => {
  const printId = +route.paramMap.get('id');

  if (Number.isInteger(printId)) {
    const printService = inject(PrintService);

    return printService.getPrintDetail(printId).pipe(
      mergeMap((print) => {
        if (print.images == null || print.images.length == 0) {
          return of({ print: print, images: [] });
        }

        const images = print.images.map((image) => {
          return printService.getPrintImage(print.id, image.id).pipe(
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
};
