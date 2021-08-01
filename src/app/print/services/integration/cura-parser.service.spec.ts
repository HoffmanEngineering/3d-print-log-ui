import { TestBed } from '@angular/core/testing';
import { ParamMap } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LoggingService } from 'src/app/core/services/logging.service';

import { CuraParserService } from './cura-parser.service';
import { CuraParserV1pt0pt0Service } from './cura/cura-parser-v1-0-0.service';
import { CuraParserV1pt1pt0Service } from './cura/cura-parser-v1-1-0.service';
import { CuraParserV1pt2pt0Service } from './cura/cura-parser-v1-2-0.service';

describe('CuraParserService', () => {
  let service: CuraParserService;

  const createQueryParams = (queryString: string) => {
    const urlParams = new URLSearchParams(queryString);

    return urlParams as unknown as ParamMap;
  };

  beforeEach(() => {
    const mockv1pt0pt0Parser = jasmine.createSpyObj<CuraParserV1pt0pt0Service>(
      'CuraParserV1pt0pt0Service',
      ['parse']
    );

    const mockv1pt1pt0Parser = jasmine.createSpyObj<CuraParserV1pt1pt0Service>(
      'CuraParserV1pt1pt0Service',
      ['parse']
    );

    const mockv1pt2pt0Parser = jasmine.createSpyObj<CuraParserV1pt2pt0Service>(
      'CuraParserV1pt2pt0Service',
      ['parse']
    );

    const mockToastrService = jasmine.createSpyObj<ToastrService>(
      'ToastrService',
      ['info']
    );

    const mockLoggingService = jasmine.createSpyObj<LoggingService>(
      'LoggingService',
      ['logEvent']
    );

    TestBed.configureTestingModule({
      providers: [
        CuraParserService,
        { provide: CuraParserV1pt0pt0Service, useValue: mockv1pt0pt0Parser },
        { provide: CuraParserV1pt1pt0Service, useValue: mockv1pt1pt0Parser },
        { provide: CuraParserV1pt2pt0Service, useValue: mockv1pt2pt0Parser },
        { provide: ToastrService, useValue: mockToastrService },
        { provide: LoggingService, useValue: mockLoggingService },
      ],
    });
    service = TestBed.inject(CuraParserService);

    jasmine.clock().mockDate(new Date('2020-09-20 14:00:00'));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it(`should parse using the v1.0.0 parser when the param's plugin_version is 1.0.0`, async () => {
    const mockv1pt0pt0Parser = TestBed.inject(
      CuraParserV1pt0pt0Service
    ) as jasmine.SpyObj<CuraParserV1pt0pt0Service>;
    mockv1pt0pt0Parser.parse.and.returnValue(null);

    const testQueryString = 'plugin_version=1.0.0&cura_version=4.5.0';
    const params = createQueryParams(testQueryString);
    await service.parse(params);

    expect(mockv1pt0pt0Parser.parse).toHaveBeenCalled();
  });

  it(`should parse using the v1.1.0 parser when the param's plugin_version is 1.1.0`, async () => {
    const mockv1pt1pt0Parser = TestBed.inject(
      CuraParserV1pt1pt0Service
    ) as jasmine.SpyObj<CuraParserV1pt1pt0Service>;
    mockv1pt1pt0Parser.parse.and.returnValue(null);

    const testQueryString = 'plugin_version=1.1.0&cura_version=4.5.0';
    const params = createQueryParams(testQueryString);
    await service.parse(params);

    expect(mockv1pt1pt0Parser.parse).toHaveBeenCalled();
  });

  it(`should parse using the v1.2.0 parser when the param's plugin_version is 1.2.0`, async () => {
    const mockv1pt2pt0Parser = TestBed.inject(
      CuraParserV1pt2pt0Service
    ) as jasmine.SpyObj<CuraParserV1pt2pt0Service>;
    mockv1pt2pt0Parser.parse.and.returnValue(null);

    const testQueryString = 'plugin_version=1.2.0&cura_version=4.5.0';
    const params = createQueryParams(testQueryString);
    await service.parse(params);

    expect(mockv1pt2pt0Parser.parse).toHaveBeenCalled();
  });

  it(`should return null if the params do not contain a plugin_version key.`, async () => {
    const testQueryString = 'non_version=foo&cura_version=4.5.0';
    const params = createQueryParams(testQueryString);
    const result = await service.parse(params);

    expect(result).toBeNull();
  });
});
