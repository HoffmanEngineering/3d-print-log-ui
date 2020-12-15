import { TestBed } from '@angular/core/testing';
import { ParamMap } from '@angular/router';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrintDetail } from 'src/app/core/services/print.service';

import { CuraParserV1pt1pt0Service } from './cura-parser-v1-1-0.service';

describe('CuraParserV1pt1pt0Service', () => {
  let service: CuraParserV1pt1pt0Service;

  const createQueryParams = (queryString: string) => {
    const urlParams = new URLSearchParams(queryString);
    return (urlParams as unknown) as ParamMap;
  };

  beforeEach(() => {
    const mockLogger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logTrace',
    ]);
    TestBed.configureTestingModule({
      providers: [
        CuraParserV1pt1pt0Service,
        { provide: LoggingService, useValue: mockLogger },
      ],
    });
    service = TestBed.inject(CuraParserV1pt1pt0Service);

    jasmine.clock().mockDate(new Date('2020-09-20 14:00:00'));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it(`should return a print with the correct estimated print time when given a 'estimated_print_time_seconds' query param`, () => {
    const testQueryString = 'estimated_print_time_seconds=5626';
    const params = createQueryParams(testQueryString);

    const printDetail = service.parse(params);

    const expected: Pick<PrintDetail, 'estimatedPrintTimeInSeconds'> = {
      estimatedPrintTimeInSeconds: 5626,
    };
    expect(printDetail).toEqual(jasmine.objectContaining(expected));
  });

  // tslint:disable-next-line: max-line-length
  it(`should round the estimated print time to the nearest int when given a 'estimated_print_time_seconds' query param with decimals`, () => {
    const testQueryString = 'estimated_print_time_seconds=5626.95';
    const params = createQueryParams(testQueryString);

    const printDetail = service.parse(params);

    const expected: Pick<PrintDetail, 'estimatedPrintTimeInSeconds'> = {
      estimatedPrintTimeInSeconds: 5627,
    };
    expect(printDetail).toEqual(jasmine.objectContaining(expected));
  });

  it(`should return a print with a null estimated print time when given no 'estimated_print_time_seconds' query param`, () => {
    const testQueryString = '';
    const params = createQueryParams(testQueryString);

    const printDetail = service.parse(params);

    const expected: Pick<PrintDetail, 'estimatedPrintTimeInSeconds'> = {
      estimatedPrintTimeInSeconds: null,
    };
    expect(printDetail).toEqual(jasmine.objectContaining(expected));
  });

  it(`should return a print with the correct title when given a 'print_name' query param`, () => {
    const testQueryString = 'print_name=Test';
    const params = createQueryParams(testQueryString);

    const printDetail = service.parse(params);

    const expected: Pick<PrintDetail, 'title'> = {
      title: 'Test',
    };
    expect(printDetail).toEqual(jasmine.objectContaining(expected));
  });

  it(`should normalize the Title by converting dashes/underscores/commas into spaces and capitalizing each work in the 'print_name' query param`, () => {
    const testQueryString =
      'print_name=Test_underscore space-dash.period-camelCase';
    const params = createQueryParams(testQueryString);

    const printDetail = service.parse(params);

    const expected: Pick<PrintDetail, 'title'> = {
      title: 'Test Underscore Space Dash Period Camel Case',
    };
    expect(printDetail).toEqual(jasmine.objectContaining(expected));
  });

  it(`should return a blank title when not give a 'print_name' query param`, () => {
    const testQueryString = '';
    const params = createQueryParams(testQueryString);

    const printDetail = service.parse(params);

    const expected: Pick<PrintDetail, 'title'> = {
      title: '',
    };
    expect(printDetail).toEqual(jasmine.objectContaining(expected));
  });

  it(`should return the Filament Used in Mg when given 'material_used_mg' query param`, () => {
    const testQueryString = 'material_used_mg=1234';
    const params = createQueryParams(testQueryString);

    const printDetail = service.parse(params);

    const expected: Pick<PrintDetail, 'estimatedFilamentUsageMg'> = {
      estimatedFilamentUsageMg: 1234,
    };
    expect(printDetail).toEqual(jasmine.objectContaining(expected));
  });

  it(`should round the estimated filament usage to the nearest int when given 'material_used_mg' query param with decimals`, () => {
    const testQueryString = 'material_used_mg=1234.9';
    const params = createQueryParams(testQueryString);

    const printDetail = service.parse(params);

    const expected: Pick<PrintDetail, 'estimatedFilamentUsageMg'> = {
      estimatedFilamentUsageMg: 1235,
    };
    expect(printDetail).toEqual(jasmine.objectContaining(expected));
  });

  it(`should return a null Filament Used in Mg when not given a 'material_used_mg' query param`, () => {
    const testQueryString = '';
    const params = createQueryParams(testQueryString);

    const printDetail = service.parse(params);

    const expected: Pick<PrintDetail, 'estimatedFilamentUsageMg'> = {
      estimatedFilamentUsageMg: null,
    };
    expect(printDetail).toEqual(jasmine.objectContaining(expected));
  });

  describe('Notes', () => {
    it(`should return notes with the Layer Height when given 'layer_height' query param`, () => {
      const testQueryString = 'layer_height=0.35';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Layer Height: 0.35mm';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which includes (with Adaptive Layer Height) when given 'layer_height' query param and "adaptive_layer_height_enabled" query param`, () => {
      const testQueryString =
        'layer_height=0.35&adaptive_layer_height_enabled=True';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Layer Height: 0.35mm (with Adaptive Layer Height)';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which includes Top Thickness when given 'top_thickness' query param and we aren't in spiral vase mode`, () => {
      const testQueryString = 'top_thickness=0.95&magic_spiralize=False';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Top Thickness: 0.95mm';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which do not include Top Thickness when "magic_spiralize" query param is True and 'top_thickness' query param exists`, () => {
      const testQueryString = 'top_thickness=0.95&magic_spiralize=True';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Top Thickness:';
      expect(printDetail.notes).not.toContain(expected);
    });

    it(`should return notes which includes Bottom Thickness when given 'bottom_thickness' query param`, () => {
      const testQueryString = 'bottom_thickness=0.95';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Bottom Thickness: 0.95mm';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which includes Wall Line Count when given 'bottom_thickness' query param`, () => {
      const testQueryString = 'wall_line_count=3';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Wall Line Count: 3';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which includes Infill Percent when given 'infill_sparse_density' query param`, () => {
      const testQueryString = 'infill_sparse_density=25';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Infill: 25%';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which includes Infill pattern when given a non-zero'infill_sparse_density' query param and "infill_pattern" query param exists`, () => {
      const testQueryString =
        'infill_sparse_density=25&infill_pattern=triangle';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Infill Pattern: triangle';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which do not includes Infill pattern when given a zero 'infill_sparse_density' query param and "infill_pattern" query param exists`, () => {
      const testQueryString = 'infill_sparse_density=0&infill_pattern=triangle';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Infill Pattern:';
      expect(printDetail.notes).not.toContain(expected);
    });

    it(`should return notes which include "Support: Enabled" when given 'support_enabled' query param`, () => {
      const testQueryString = 'support_enabled=true';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Support: Enabled';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which include "Support: Enabled Everywhere" when given 'support_enabled' query param and 'support_type' query param equal 'everywhere' `, () => {
      const testQueryString = 'support_enabled=true&support_type=everywhere';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Support: Enabled Everywhere';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which include "Support: Enabled Touching Buildplate" when given 'support_enabled' query param and 'support_type' query param equal 'buildplate' `, () => {
      const testQueryString = 'support_enabled=true&support_type=buildplate';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Support: Enabled Touching Buildplate';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which include "Support: No Supports" when given 'support_enabled=false' query param  `, () => {
      const testQueryString = 'support_enabled=false';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Support: No Supports';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which include "Mold Mode: Enabled" when given 'mold_enabled=true' query param  `, () => {
      const testQueryString = 'mold_enabled=true';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Mold Mode: Enabled';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which include "Spiral Vase Mode: Enabled" when given 'magic_spiralize=true' query param  `, () => {
      const testQueryString = 'magic_spiralize=true';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Spiral Vase Mode: Enabled';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which include "Ooze Shield: Enabled" when given 'ooze_shield_enabled=true' query param  `, () => {
      const testQueryString = 'ooze_shield_enabled=true';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Ooze Shield: Enabled';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which include "Wireframe Mode: Enabled" when given 'wireframe_enabled=true' query param  `, () => {
      const testQueryString = 'wireframe_enabled=true';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Wireframe Mode: Enabled';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which include "Fuzzy Skin Mode: Enabled" when given 'magic_fuzzy_skin_enabled=true' query param  `, () => {
      const testQueryString = 'magic_fuzzy_skin_enabled=true';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Fuzzy Skin Mode: Enabled';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which include "Draft Shield: Enabled" when given 'draft_shield_enabled=true' query param  `, () => {
      const testQueryString = 'draft_shield_enabled=true';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Draft Shield: Enabled';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which include "Ironing: Enabled" when given 'ironing_enabled=true' query param  `, () => {
      const testQueryString = 'ironing_enabled=true';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Ironing: Enabled';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which include "Ironing: Enabled" when given 'ironing_enabled=true' query param  `, () => {
      const testQueryString = 'ironing_enabled=true';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Ironing: Enabled';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return notes which start with 'Print Settings:' if any of the query params notes are set`, () => {
      const testQueryString = 'ironing_enabled=true';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      const expected = 'Print Settings:';
      expect(printDetail.notes).toContain(expected);
    });

    it(`should return a empty note if no relevant query params are sent`, () => {
      const testQueryString = 'param_which_we_dont_care_about=true';
      const params = createQueryParams(testQueryString);

      const printDetail = service.parse(params);

      expect(printDetail.notes).toEqual('');
    });
  });

  const tests: { queryString: string; expected: PrintDetail }[] = [
    {
      queryString:
        'support_extruder_nr=1&gradual_infill_steps=0&print_name=Low-poly_Rose_Vase.stl&material_used_mg=31944&ironing_enabled=False&support_type=everywhere&magic_spiralize=False&infill_pattern=grid&print_sequence=all_at_once&plugin_version=1.0.0&cura_version=4.7.0&top_thickness=0.8&adhesion_type=skirt&prime_tower_enable=True&adaptive_layer_height_enabled=False&bottom_thickness=0.8&wall_line_count=2&layer_height=0.3&estimated_print_time_seconds=5626&wireframe_enabled=False&retraction_enable=True&machine_name=Geeetech%20A10M&draft_shield_enabled=False&infill_sparse_density=20&mold_enabled=False&magic_fuzzy_skin_enabled=False&cura_build_type=&ooze_shield_enabled=False&time_stamp=1600695741.1860008&support_enabled=True',
      expected: {
        id: null,
        title: 'Low Poly Rose Vase Stl',
        printerId: null,
        startDate: new Date('2020-09-20 14:00:00'),
        estimatedPrintTimeInSeconds: 5626,
        estimatedFilamentUsageMg: 31944,
        printTimeInSeconds: null,
        filamentUsageMg: null,
        filamentType: '',
        notes:
          'Print Settings:\nLayer Height: 0.3mm\nTop Thickness: 0.8mm\nBottom Thickness: 0.8mm\nWall Line Count: 2\nInfill: 20%\nInfill Pattern: grid\nSupport: Enabled Everywhere',
        url: '',
        status: 1,
        viewStatus: null,
        images: [],
        allowComments: null,
        createdByUserId: null,
        comments: [],
      },
    },
    {
      queryString:
        'support_extruder_nr=1&gradual_infill_steps=0&print_name=Low-poly_Rose_Vase.stl&material_used_mg=31944&ironing_enabled=False&support_type=buildplate&magic_spiralize=False&infill_pattern=grid&print_sequence=all_at_once&plugin_version=1.0.0&cura_version=4.7.0&top_thickness=0.8&adhesion_type=skirt&prime_tower_enable=True&adaptive_layer_height_enabled=False&bottom_thickness=0.8&wall_line_count=2&layer_height=0.3&estimated_print_time_seconds=5626&wireframe_enabled=False&retraction_enable=True&machine_name=Geeetech%20A10M&draft_shield_enabled=False&infill_sparse_density=20&mold_enabled=False&magic_fuzzy_skin_enabled=False&cura_build_type=&ooze_shield_enabled=False&time_stamp=1600695791.234008&support_enabled=True',
      expected: {
        id: null,
        title: 'Low Poly Rose Vase Stl',
        printerId: null,
        startDate: new Date('2020-09-20 14:00:00'),
        estimatedPrintTimeInSeconds: 5626,
        estimatedFilamentUsageMg: 31944,
        printTimeInSeconds: null,
        filamentUsageMg: null,
        filamentType: '',
        notes: `Print Settings:
Layer Height: 0.3mm
Top Thickness: 0.8mm
Bottom Thickness: 0.8mm
Wall Line Count: 2
Infill: 20%
Infill Pattern: grid
Support: Enabled Touching Buildplate`,
        url: '',
        status: 1,
        viewStatus: null,
        images: [],
        allowComments: null,
        createdByUserId: null,
        comments: [],
      },
    },
  ];

  for (const test of tests) {
    it('should match expected notes', () => {
      const params = createQueryParams(test.queryString);

      const printDetail = service.parse(params);

      expect(printDetail).toEqual(test.expected);
    });
  }
});
