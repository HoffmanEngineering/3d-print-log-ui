import { TestBed } from '@angular/core/testing';

import { ImageResizerService } from './image-resizer.service';

describe('ImageResizerService', () => {
  let service: ImageResizerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageResizerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // A TIFF, a HEIC in Chrome or a truncated JPEG passes the image/* check but never decodes.
  // Without an error handler the promise never settled and the print form's Save spun forever.
  it('rejects an image the browser cannot decode', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4, 5])], 'scan.tiff', {
      type: 'image/tiff',
    });

    await expect(service.resizeImage({ file, maxSize: 100 })).rejects.toThrow(
      'could not be read'
    );
  }, 5000);

  it('resizes an image the browser can decode', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 20;
    const png = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    );
    const file = new File([png], 'photo.png', { type: 'image/png' });

    const blob = await service.resizeImage({ file, maxSize: 10 });

    expect(blob.type).toBe('image/jpeg');
  });
});
