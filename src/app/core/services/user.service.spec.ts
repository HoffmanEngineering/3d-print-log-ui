import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ImageResizerService } from './image-resizer.service';
import { UserService } from './user.service';

describe('UserService', () => {
  beforeEach(() => {
    const mockImageResizer = jasmine.createSpyObj<ImageResizerService>(
      'ImageResizerService',
      ['resizeImage']
    );

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: ImageResizerService, useValue: mockImageResizer }],
    });
  });

  it('should be created', () => {
    const service: UserService = TestBed.get(UserService);
    expect(service).toBeTruthy();
  });
});
