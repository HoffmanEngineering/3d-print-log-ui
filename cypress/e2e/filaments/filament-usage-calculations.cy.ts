import { apiUrl } from '../../support/api-url';

/**
 * Remaining-material arithmetic across combinations the rest of the suite does not reach:
 * several prints against one spool, several usage rows inside one print, usage recorded in
 * length or volume rather than weight, and materials whose own nominal figure was entered as
 * a length or a volume.
 *
 * Fixtures are seeded through the API rather than driven through the print form. The subject
 * here is what the numbers come out as, and a UI-driven setup would spend most of each test
 * re-testing the form - and could not express a usage row recorded in volume against a resin
 * at all without first walking the whole print editor.
 */
describe('Material usage calculations', () => {
  const DEV_HEADERS = { 'X-Dev-User-Id': '1' };

  // Source enums, numeric on the wire for both entities: Weight = 1, Length = 2, Volume = 3.
  const WEIGHT = 1;
  const LENGTH = 2;
  const VOLUME = 3;

  const PLA_DENSITY = 1.24;
  const DIAMETER = 1.75;

  /** mg for a length of filament, the same formula the API converts with. */
  const mgFromLength = (meters: number, density = PLA_DENSITY, d = DIAMETER) =>
    250 * Math.PI * density * d * d * meters;

  /** mg for a volume of material. */
  const mgFromVolume = (ml: number, density = PLA_DENSITY) =>
    ml * density * 1000;

  const request = (method: string, path: string, body?: Cypress.RequestBody) =>
    cy.request({
      method,
      url: `${apiUrl()}${path}`,
      headers: DEV_HEADERS,
      body,
    });

  /**
   * The card renders Length and Volume through `number: '1.0-1'`, whose minimum is ZERO
   * fraction digits: 806.45 reads "806.5" but 250 reads "250", not "250.0". Expectations are
   * formatted the same way rather than with toFixed(1), which only agrees by luck.
   */
  const oneDecimal = (value: number) =>
    (Math.round(value * 10) / 10).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });

  interface MaterialOptions {
    source?: number;
    density?: number;
    diameterMm?: number | null;
    categoryNickname?: string;
    initialNominalWeightMg?: number | null;
    initialNominalLengthM?: number | null;
    initialNominalVolumeMl?: number | null;
  }

  /**
   * A material owned by this spec. Every test seeds its own so that a figure asserted here can
   * only have come from the usage this test logged.
   */
  const createMaterial = (
    displayName: string,
    options: MaterialOptions = {}
  ): Cypress.Chainable<string> =>
    request('POST', '/api/Filaments/', {
      displayName: `${displayName} ${Date.now()}`,
      brand: 'E2E Usage',
      materialCategoryNickname: options.categoryNickname ?? 'filament',
      materialType: 'PLA',
      materialDensityGramPerCubicCm: options.density ?? PLA_DENSITY,
      colorName: 'Usage Blue',
      colorHex: '0000FF',
      colors: ['0000FF'],
      effects: [],
      diameterMm:
        options.diameterMm === undefined ? DIAMETER : options.diameterMm,
      source: options.source ?? WEIGHT,
      initialNominalWeightMg:
        options.initialNominalWeightMg === undefined
          ? 1000000
          : options.initialNominalWeightMg,
      initialNominalLengthM: options.initialNominalLengthM ?? null,
      initialNominalVolumeMl: options.initialNominalVolumeMl ?? null,
      isActive: true,
      filamentAdjustments: [],
    }).then((response) => response.body.id as string);

  type UsageRow = Record<string, unknown>;

  /**
   * Logs one print carrying the given usage rows. Two calls on purpose: POST creates the print
   * but does not attach a filament to a usage row, PUT is what persists filamentId - the same
   * shape `seedPublicPrintFixture` uses.
   */
  const logPrint = (title: string, usage: UsageRow[]) =>
    request('GET', '/api/printers/summary?PageNumber=1&PageSize=1').then(
      (printerResponse) => {
        const printer = printerResponse.body.items[0];
        expect(printer, 'a printer exists to attach usage to').to.exist;

        return request('POST', '/api/Prints/', {
          title: `${title} ${Date.now()}`,
          status: 3,
          viewStatus: 1,
          printerId: printer.id,
          startDate: '2026-08-01T00:00:00Z',
          allowComments: true,
          filamentUsage: [],
        }).then((createResponse) => {
          const created = createResponse.body;
          return request('PUT', `/api/Prints/${created.id}`, {
            ...created,
            printerId: printer.id,
            filamentUsage: usage,
          });
        });
      }
    );

  const weightRow = (filamentId: string, grams: number): UsageRow => ({
    filamentId,
    amountMg: Math.round(grams * 1000),
    source: WEIGHT,
  });

  const lengthRow = (filamentId: string, meters: number): UsageRow => ({
    filamentId,
    lengthInM: meters,
    source: LENGTH,
  });

  const volumeRow = (filamentId: string, ml: number): UsageRow => ({
    filamentId,
    volumeMl: ml,
    source: VOLUME,
  });

  /** The value beside a label in the remaining card's Length/Volume/Used/Prints list. */
  const stat = (label: string) =>
    cy.contains('app-filament-remaining-card dt', label).next('dd');

  /** Asserts a stat is absent - the card omits the whole row rather than rendering a zero. */
  const noStat = (label: string) =>
    cy
      .get('app-filament-remaining-card')
      .find('dt')
      .should('not.contain.text', label);

  const openMaterial = (id: string) => {
    cy.visit(`/filament/${id}`);
    cy.get('app-filament-remaining-card').should('be.visible');
  };

  beforeEach(() => {
    cy.login();
  });

  it('counts several prints against one spool', () => {
    createMaterial('Multi Print Spool').then((id) => {
      logPrint('Usage Calc A', [weightRow(id, 25)]);
      logPrint('Usage Calc B', [weightRow(id, 25)]);
      logPrint('Usage Calc C', [weightRow(id, 25)]);

      openMaterial(id);

      cy.get('app-filament-remaining-card').should('contain.text', '925 g');
      stat('Used').should('have.text', '75 g');
      stat('Prints').should('have.text', '3');
    });
  });

  it('sums several usage rows inside one print but counts the print once', () => {
    // There is no unique index on (PrintId, FilamentId), so one print can hold two rows for
    // the same spool - a filament change mid-print, or the same spool loaded in two tools.
    // Used counts rows; Prints counts prints.
    createMaterial('Two Rows One Print').then((id) => {
      logPrint('Usage Calc Two Rows', [weightRow(id, 30), weightRow(id, 20)]);

      openMaterial(id);

      cy.get('app-filament-remaining-card').should('contain.text', '950 g');
      stat('Used').should('have.text', '50 g');
      stat('Prints').should('have.text', '1');
    });
  });

  it('converts usage recorded as a length', () => {
    const usedMg = mgFromLength(10);
    const remainingG = Math.round((1000000 - usedMg) / 1000);

    createMaterial('Length Usage Spool').then((id) => {
      logPrint('Usage Calc Length', [lengthRow(id, 10)]);

      openMaterial(id);

      // 10 m of 1.75mm PLA at 1.24 g/cm3 is ~29.8 g, so the spool reads ~970 g.
      cy.get('app-filament-remaining-card').should(
        'contain.text',
        `${remainingG} g`
      );
      stat('Used').should('have.text', `${Math.round(usedMg / 1000)} g`);
    });
  });

  it('converts usage recorded as a volume', () => {
    createMaterial('Volume Usage Spool').then((id) => {
      logPrint('Usage Calc Volume', [volumeRow(id, 20)]);

      // 20 ml at 1.24 g/cm3 is 24.8 g.
      openMaterial(id);

      cy.get('app-filament-remaining-card').should('contain.text', '975 g');
      stat('Used').should('have.text', '25 g');
    });
  });

  it('keeps weight, length and volume in agreement across mixed usage sources', () => {
    // The regression this spec exists for: the three readings used to be accumulated on
    // separate bases, so a spool could report a weight and a volume that described different
    // amounts of material - or a negative volume. They are now one number, converted.
    const usedMg = 25000 + mgFromLength(10) + mgFromVolume(20);
    const remainingMg = 1000000 - usedMg;

    createMaterial('Mixed Source Spool').then((id) => {
      logPrint('Usage Calc Mixed W', [weightRow(id, 25)]);
      logPrint('Usage Calc Mixed L', [lengthRow(id, 10)]);
      logPrint('Usage Calc Mixed V', [volumeRow(id, 20)]);

      openMaterial(id);

      stat('Prints').should('have.text', '3');

      cy.get('app-filament-remaining-card').should(
        'contain.text',
        `${Math.round(remainingMg / 1000)} g`
      );

      const expectedMl = remainingMg / 1000 / PLA_DENSITY;
      const expectedM =
        remainingMg / (250 * Math.PI * PLA_DENSITY * DIAMETER * DIAMETER);

      stat('Volume').should('have.text', `${oneDecimal(expectedMl)} ml`);
      stat('Length').should('have.text', `${oneDecimal(expectedM)} m`);
    });
  });

  it('tracks a material whose nominal figure was entered as a length', () => {
    // Source = Length: the user entered 300 m and the server derived the weight from it.
    // Usage still counts the same, and all three readings stay in step.
    const nominalMg = mgFromLength(300);
    const usedMg = mgFromLength(50);
    const remainingMg = nominalMg - usedMg;

    createMaterial('Length Source Spool', {
      source: LENGTH,
      initialNominalWeightMg: null,
      initialNominalLengthM: 300,
    }).then((id) => {
      logPrint('Usage Calc Length Source', [lengthRow(id, 50)]);

      openMaterial(id);

      cy.get('app-filament-remaining-card').should(
        'contain.text',
        `${Math.round(remainingMg / 1000)} g`
      );
      stat('Length').should('have.text', '250 m');
      stat('Volume').should(
        'have.text',
        `${oneDecimal(remainingMg / 1000 / PLA_DENSITY)} ml`
      );
    });
  });

  it('tracks a resin whose nominal figure was entered as a volume, and shows no length', () => {
    // Resin has no diameter, so it has no length to report. A 0.0 m beside a full bottle
    // reads as an empty one.
    const density = 1.1;
    const nominalMg = mgFromVolume(1000, density);
    const usedMg = mgFromVolume(150, density);
    const remainingMg = nominalMg - usedMg;

    createMaterial('Volume Source Resin', {
      categoryNickname: 'resin',
      source: VOLUME,
      density,
      diameterMm: null,
      initialNominalWeightMg: null,
      initialNominalVolumeMl: 1000,
    }).then((id) => {
      logPrint('Usage Calc Resin', [volumeRow(id, 150)]);

      openMaterial(id);

      cy.get('app-filament-remaining-card').should(
        'contain.text',
        `${Math.round(remainingMg / 1000)} g`
      );
      stat('Volume').should('have.text', '850 ml');
      noStat('Length');
    });
  });

  it('falls back to the estimated amount when a print records no actual usage', () => {
    createMaterial('Estimated Only Spool').then((id) => {
      logPrint('Usage Calc Estimated', [
        {
          filamentId: id,
          estimatedAmountMg: 40000,
          estimatedSource: WEIGHT,
        },
      ]);

      openMaterial(id);

      cy.get('app-filament-remaining-card').should('contain.text', '960 g');
      stat('Used').should('have.text', '40 g');
    });
  });

  it('applies adjustments on top of print usage', () => {
    // Adjustments are ADDED, so a negative one shortens the spool further.
    createMaterial('Adjusted Usage Spool').then((id) => {
      logPrint('Usage Calc Adjusted', [weightRow(id, 100)]);

      request('GET', `/api/Filaments/${id}`).then((response) => {
        const filament = response.body;
        return request('PUT', `/api/Filaments/${id}`, {
          ...filament,
          filamentAdjustments: [
            { amountMg: -50000, source: WEIGHT, notes: 'Purge tower' },
          ],
        });
      });

      openMaterial(id);

      // 1000 - 100 used - 50 adjusted.
      cy.get('app-filament-remaining-card').should('contain.text', '850 g');
      stat('Used').should('have.text', '100 g');
    });
  });

  it('reports the same remaining figure in the materials list and on the detail page', () => {
    // The list and the detail page are two different projections of the same rule. They drifted
    // apart once already, and only a spool with usage can tell them apart.
    createMaterial('List Detail Agreement').then((id) => {
      logPrint('Usage Calc Agreement A', [weightRow(id, 60)]);
      logPrint('Usage Calc Agreement B', [lengthRow(id, 10)]);

      const expectedG = Math.round((1000000 - 60000 - mgFromLength(10)) / 1000);

      openMaterial(id);
      cy.get('app-filament-remaining-card').should(
        'contain.text',
        `${expectedG} g`
      );

      cy.intercept('GET', '/api/Filaments*').as('getFilaments');
      cy.visit('/filament');
      cy.wait('@getFilaments');
      cy.get('#filament-list-search-input')
        .clear()
        .type('List Detail Agreement');
      cy.wait('@getFilaments');
      cy.get('[data-cy-filament-row]')
        .first()
        .within(() => {
          cy.get('.mat-column-filamentRemaining').should(
            'contain.text',
            String(expectedG)
          );
        });
    });
  });

  it('reports an over-used spool rather than hiding it', () => {
    // Logging more than the spool held is a data-entry reality, and the card says so instead
    // of clamping to zero - the number below is what tells the user to check their prints.
    createMaterial('Over Used Spool').then((id) => {
      logPrint('Usage Calc Over A', [weightRow(id, 700)]);
      logPrint('Usage Calc Over B', [weightRow(id, 450)]);

      openMaterial(id);

      cy.get('app-filament-remaining-card').should(
        'contain.text',
        '150 g over-used'
      );
      stat('Used').should('have.text', '1,150 g');
    });
  });
});
