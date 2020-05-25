import { TestBed } from '@angular/core/testing';

import { MetaTagService } from './meta-tag.service';

describe('MetaTagService', () => {
  let service: MetaTagService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetaTagService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
