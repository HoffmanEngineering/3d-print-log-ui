import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MaterialCategoryService } from './material-categories.service';

describe('MaterialCategory', () => {
  let service: MaterialCategoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(MaterialCategoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
