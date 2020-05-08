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
});
