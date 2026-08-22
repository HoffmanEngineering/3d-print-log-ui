import { Injectable } from '@angular/core';

export interface IResizeImageOptions {
  /**
   * Max Size (preserve aspect ratio)
   */
  maxSize?: number;

  /**
   * Forces a max height;
   */
  maxHeight?: number;

  imageQuality?: number;
  file: File;
}

@Injectable({
  providedIn: 'root',
})
export class ImageResizerService {
  private readonly DEFAULT_IMAGE_QUALITY = 0.9;
  constructor() {}

  public resizeImage(settings: IResizeImageOptions): Promise<Blob> {
    const file = settings.file;
    const maxSize = settings.maxSize;
    const maxHeight = settings.maxHeight;
    const reader = new FileReader();
    const image = new Image();
    const canvas = document.createElement('canvas');
    const dataURItoBlob = (dataURI: string) => {
      const bytes =
        dataURI.split(',')[0].indexOf('base64') >= 0
          ? atob(dataURI.split(',')[1])
          : unescape(dataURI.split(',')[1]);
      const mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
      const max = bytes.length;
      const ia = new Uint8Array(max);
      for (let i = 0; i < max; i++) {
        ia[i] = bytes.charCodeAt(i);
      }
      return new Blob([ia], { type: mime });
    };
    const resize = () => {
      let width = image.width;
      let height = image.height;

      if (maxSize) {
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
      }
      if (maxHeight) {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
      const dataUrl = canvas.toDataURL(
        'image/jpeg',
        settings.imageQuality || this.DEFAULT_IMAGE_QUALITY
      );
      return dataURItoBlob(dataUrl);
    };

    return new Promise((ok, no) => {
      if (!file.type.match(/image.*/)) {
        no(new Error('Not an image'));
        return;
      }

      reader.onload = (readerEvent: any) => {
        image.onload = () => ok(resize());
        image.src = readerEvent.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
}
