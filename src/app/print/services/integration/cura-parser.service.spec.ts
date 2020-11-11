import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ParamMap } from '@angular/router';
import { PrintDetail } from 'src/app/core/services/print.service';

import { CuraParserService } from './cura-parser.service';
import { CuraParserV1pt0pt0Service } from './cura/cura-parser-v1-0-0.service';

describe('CuraParserService', () => {
  let service: CuraParserService;

  const createQueryParams = (queryString: string) => {
    const urlParams = new URLSearchParams(queryString);

    return (urlParams as unknown) as ParamMap;
  };

  beforeEach(() => {
    const mockv1_0_0Parser = jasmine.createSpyObj<CuraParserV1pt0pt0Service>(
      'CuraParserV1pt0pt0Service',
      ['parse']
    );

    TestBed.configureTestingModule({
      providers: [
        CuraParserService,
        { provide: CuraParserV1pt0pt0Service, useValue: mockv1_0_0Parser },
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

  it(`should parse using the v1.0.0 parser when the param's plugin_version is 1.0.0`, () => {
    const mockv1_0_0Parser = TestBed.inject(
      CuraParserV1pt0pt0Service
    ) as jasmine.SpyObj<CuraParserV1pt0pt0Service>;
    mockv1_0_0Parser.parse.and.returnValue(null);

    const testQueryString = 'plugin_version=1.0.0';
    const params = createQueryParams(testQueryString);
    service.parse(params);

    expect(mockv1_0_0Parser.parse).toHaveBeenCalled();
  });

  it(`should return null if the params do not contain a plugin_version key.`, () => {
    const testQueryString = 'non_version=foo';
    const params = createQueryParams(testQueryString);
    const result = service.parse(params);

    expect(result).toBeNull();
  });
});
