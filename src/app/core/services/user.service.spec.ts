import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ImageResizerService } from './image-resizer.service';
import { UserService } from './user.service';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

describe('UserService', () => {
  beforeEach(() => {
    const mockImageResizer = jasmine.createSpyObj<ImageResizerService>(
      'ImageResizerService',
      ['resizeImage']
    );

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: ImageResizerService, useValue: mockImageResizer },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
  });

  it('should be created', () => {
    const service: UserService = TestBed.inject(UserService);
    expect(service).toBeTruthy();
  });
});
