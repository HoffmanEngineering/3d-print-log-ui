import { TestBed } from '@angular/core/testing';

import { CuraSettingServiceService } from 'src/app/core/services/cura-setting-service.service';
import { LoggingService } from 'src/app/core/services/logging.service';

import { CuraParserV1pt2pt0Service } from './cura-parser-v1-2-0.service';

describe('CuraParserV1pt2pt0Service', () => {
  let service: CuraParserV1pt2pt0Service;

  beforeEach(() => {
    const mockLogger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logTrace',
    ]);
    const mockCuraSettingServiceService = jasmine.createSpyObj<CuraSettingServiceService>(
      'CuraSettingServiceService',
      ['getSettings']
    );
    TestBed.configureTestingModule({
      providers: [
        CuraParserV1pt2pt0Service,
        { provide: LoggingService, useValue: mockLogger },
        {
          provide: CuraSettingServiceService,
          useValue: mockCuraSettingServiceService,
        },
      ],
    });
    service = TestBed.inject(CuraParserV1pt2pt0Service);

    jasmine.clock().mockDate(new Date('2020-09-20 14:00:00'));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
