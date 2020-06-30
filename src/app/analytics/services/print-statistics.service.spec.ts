import { TestBed } from '@angular/core/testing';

import { PrintStatisticsService } from './print-statistics.service';

xdescribe('PrintStatisticsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PrintStatisticsService = TestBed.get(PrintStatisticsService);
    expect(service).toBeTruthy();
  });
});
